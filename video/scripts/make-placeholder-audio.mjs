// Generates the placeholder sound stems in public/assets/audio/.
// Pure synthesis, no samples: replace any file with a real recording of the same name.
//   node scripts/make-placeholder-audio.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SR = 44100;
const OUT = new URL("../public/assets/audio/", import.meta.url).pathname;
const TMP = join(tmpdir(), "kover-audio");
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

// ── basics ──────────────────────────────────────────────────────────────────
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const buf = (s) => new Float32Array(Math.round(s * SR));
const noise = (n, r) => Float32Array.from({ length: n }, () => r() * 2 - 1);
const concat = (a, b) => {
  const o = new Float32Array(a.length + b.length);
  o.set(a);
  o.set(b, a.length);
  return o;
};
const add = (dst, src, gain = 1, offset = 0, wrap = false) => {
  for (let i = 0; i < src.length; i++) {
    let j = offset + i;
    if (wrap) j %= dst.length;
    else if (j >= dst.length) break;
    dst[j] += src[i] * gain;
  }
  return dst;
};
const mul = (x, f) => x.map((v, i) => v * f(i / SR, i));
const peak = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const normalize = (chs, target) => {
  const p = Math.max(...chs.map(peak)) || 1;
  return chs.map((c) => c.map((v) => (v / p) * target));
};

// RBJ biquad
const biquad = (x, type, f, q = 0.707) => {
  const w = (2 * Math.PI * f) / SR;
  const cs = Math.cos(w);
  const a = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === "lp") [b0, b1, b2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
  else if (type === "hp") [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
  else [b0, b1, b2] = [a, 0, -a]; // band-pass
  const a0 = 1 + a;
  const a1 = -2 * cs;
  const a2 = 1 - a;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
};

// Freeverb-style stereo reverb
const reverb = (x, { room = 0.84, damp = 0.3, wet = 0.3, predelay = 0 } = {}) => {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const aps = [556, 441, 341, 225];
  const pd = Math.round(predelay * SR);
  const run = (spread) => {
    const cb = combs.map((d) => ({ b: new Float32Array(d + spread), i: 0, s: 0 }));
    const ab = aps.map((d) => ({ b: new Float32Array(d + spread), i: 0 }));
    const y = new Float32Array(x.length);
    for (let n = 0; n < x.length; n++) {
      const inp = (n >= pd ? x[n - pd] : 0) * 0.015;
      let out = 0;
      for (const c of cb) {
        const o = c.b[c.i];
        c.s = o * (1 - damp) + c.s * damp;
        c.b[c.i] = inp + c.s * room;
        c.i = (c.i + 1) % c.b.length;
        out += o;
      }
      for (const a of ab) {
        const o = a.b[a.i];
        a.b[a.i] = out + o * 0.5;
        a.i = (a.i + 1) % a.b.length;
        out = o - out;
      }
      y[n] = out;
    }
    return y;
  };
  const L = run(0);
  const R = run(23);
  return [x.map((v, i) => v * (1 - wet) + L[i] * wet * 3), x.map((v, i) => v * (1 - wet) + R[i] * wet * 3)];
};

/** Process a loop as two periods and keep the second → filter and reverb tails wrap seamlessly. */
const periodic = (x, fn) => {
  const y = fn(concat(x, x));
  const cut = (c) => c.slice(x.length);
  return Array.isArray(y) ? y.map(cut) : cut(y);
};

/** Smooth random 0..1 envelope that loops exactly over `len` seconds. */
const lfo = (len, r, fmin, fmax, parts = 4) => {
  const comps = Array.from({ length: parts }, () => ({
    f: Math.max(1, Math.round((fmin + r() * (fmax - fmin)) * len)) / len,
    p: r() * Math.PI * 2,
  }));
  return (t) => 0.5 + comps.reduce((s, c) => s + Math.sin(2 * Math.PI * c.f * t + c.p), 0) / (2 * parts);
};

const write = (name, chs) => {
  const [L, R = L] = chs;
  const n = L.length;
  const data = Buffer.alloc(44 + n * 4);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  const wav = join(TMP, `${name}.wav`);
  writeFileSync(wav, data);
  execFileSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libmp3lame", "-b:a", "160k", join(OUT, `${name}.mp3`)], { stdio: "inherit" });
  console.log(`✓ ${name}.mp3 (${(n / SR).toFixed(1)} s)`);
};

// ── stems ───────────────────────────────────────────────────────────────────

// 1. Quiet warm drone (C major add9), loops every 40 s.
{
  const len = 40;
  const r = rng(1);
  const notes = [65.41, 98, 130.81, 164.81, 196, 293.66];
  const gains = [1, 0.7, 0.55, 0.38, 0.3, 0.12];
  const chs = [-1, 1].map((side) => {
    const x = buf(len);
    notes.forEach((f0, k) => {
      const f = Math.round((f0 + side * 0.075) * len) / len;
      const am = lfo(len, r, 0.025, 0.15, 3);
      [1, 0.35, 0.14, 0.05].forEach((h, n) => {
        const fh = f * (n + 1);
        for (let i = 0; i < x.length; i++) {
          const t = i / SR;
          x[i] += Math.sin(2 * Math.PI * fh * t) * h * gains[k] * (0.45 + 0.55 * am(t));
        }
      });
    });
    const air = periodic(noise(x.length, r), (y) => biquad(biquad(y, "lp", 380), "lp", 380));
    return add(x, air, 0.9);
  });
  write("ambient_drone", normalize(chs, 0.5));
}

// 2. Wrestling hall: room tone, distant voices, steps, bodies on the mat, a far whistle. Loops every 30 s.
{
  const len = 30;
  const r = rng(3);
  const n = len * SR;
  const dry = new Float32Array(n);

  // room tone (brown-ish)
  let b = 0;
  const brown = noise(n, r).map((v) => (b = b * 0.995 + v * 0.05));
  add(dry, periodic(brown, (y) => biquad(y, "lp", 240)), 0.9);

  // distant murmured voices
  for (const [centre, seed] of [[360, 31], [520, 32], [680, 33]]) {
    const vr = rng(seed);
    const syll = lfo(len, vr, 3, 6.5, 5);
    const phrase = lfo(len, vr, 0.08, 0.35, 3);
    const v = periodic(noise(n, vr), (y) => biquad(biquad(y, "bp", centre, 2.2), "lp", 1100));
    add(dry, mul(v, (t) => Math.max(0, syll(t) - 0.35) * Math.max(0, phrase(t) - 0.42) * 6), 0.22);
  }

  // bodies hitting the mat
  for (let t = 1.2; t < len; t += 1.6 + r() * 2.8) {
    const m = Math.round(0.6 * SR);
    const thump = new Float32Array(m);
    let ph = 0;
    for (let i = 0; i < m; i++) {
      const tt = i / SR;
      ph += (2 * Math.PI * (45 + 30 * Math.exp(-tt / 0.05))) / SR;
      thump[i] = Math.sin(ph) * Math.exp(-tt / 0.16);
    }
    add(thump, biquad(mul(noise(m, r), (tt) => Math.exp(-tt / 0.03)), "lp", 420), 0.6);
    add(dry, thump, 0.5 + r() * 0.5, Math.round(t * SR), true);
  }

  // steps
  for (let t = 0.6; t < len; t += 2 + r() * 3) {
    const steps = 2 + Math.floor(r() * 3);
    for (let s = 0; s < steps; s++) {
      const m = Math.round(0.06 * SR);
      const tap = biquad(biquad(mul(noise(m, r), (tt) => Math.exp(-tt / 0.012)), "hp", 900), "lp", 3500);
      add(dry, tap, 0.09, Math.round((t + s * 0.52) * SR), true);
    }
  }

  // far coach's whistle
  {
    const m = Math.round(0.7 * SR);
    const w = new Float32Array(m);
    let ph = 0;
    for (let i = 0; i < m; i++) {
      const tt = i / SR;
      ph += (2 * Math.PI * (2850 + 60 * Math.sin(2 * Math.PI * 28 * tt))) / SR;
      w[i] = Math.sin(ph) * Math.min(1, tt / 0.02) * Math.min(1, (0.7 - tt) / 0.08);
    }
    add(dry, w, 0.035, Math.round(13.5 * SR), true);
  }

  write("gym_room", normalize(periodic(dry, (y) => reverb(y, { room: 0.88, damp: 0.4, wet: 0.42 })), 0.55));
}

// 3. Warm hopeful pad: C(add9) – G – Am7 – Fmaj7, 6 s per chord (loops).
{
  const per = 6;
  const chords = [
    [130.81, 164.81, 196, 261.63, 293.66],
    [98, 123.47, 146.83, 196, 246.94],
    [110, 130.81, 164.81, 196, 261.63],
    [87.31, 110, 130.81, 164.81, 220],
  ];
  const len = per * chords.length;
  const chs = [-1, 1].map((side) => {
    const x = buf(len);
    chords.forEach((chord, c) => {
      for (const f0 of chord) {
        for (const det of [-0.0016, 0.0016]) {
          const f = f0 * (1 + det * side);
          for (let h = 1; h <= 9; h++) {
            const amp = (1 / h) * Math.exp(-h * 0.32);
            for (let i = 0; i < x.length; i++) {
              const t = i / SR;
              // crossfaded chord window, wrapping around the loop
              let d = t - c * per;
              if (d < -per) d += len;
              if (d > len - per) d -= len;
              const w = Math.min(1, Math.max(0, (d + 1.5) / 3)) * Math.min(1, Math.max(0, (per + 1.5 - d) / 3));
              if (w > 0) x[i] += Math.sin(2 * Math.PI * f * h * t) * amp * w;
            }
          }
        }
        // octave "strings"
        for (let i = 0; i < x.length; i++) {
          const t = i / SR;
          let d = t - c * per;
          if (d < -per) d += len;
          if (d > len - per) d -= len;
          const w = Math.min(1, Math.max(0, (d + 1.5) / 3)) * Math.min(1, Math.max(0, (per + 1.5 - d) / 3));
          if (w > 0) x[i] += Math.sin(2 * Math.PI * f0 * 2 * t + side) * 0.06 * w;
        }
      }
    });
    return x;
  });
  const mono = chs[0].map((v, i) => (v + chs[1][i]) / 2);
  const wet = periodic(mono, (y) => reverb(y, { room: 0.92, damp: 0.5, wet: 0.5 }));
  write("swell_pad", normalize([add(chs[0], wet[0], 0.6), add(chs[1], wet[1], 0.6)], 0.6));
}

// 4. Arena crowd: roar, chatter, swells of cheering and applause (loops every 30 s).
{
  const len = 30;
  const n = len * SR;
  const chs = [11, 12].map((seed) => {
    const r = rng(seed);
    const x = new Float32Array(n);
    const swell = lfo(len, r, 0.06, 0.22, 3);
    const roar = periodic(noise(n, r), (y) => biquad(biquad(y, "bp", 700, 0.45), "lp", 2600));
    add(x, mul(roar, (t) => 0.55 + 0.6 * swell(t) ** 2), 1);
    for (let v = 0; v < 14; v++) {
      const syll = lfo(len, r, 2.5, 6, 4);
      const voice = periodic(noise(n, r), (y) => biquad(y, "bp", 280 + r() * 700, 2.5));
      add(x, mul(voice, (t) => Math.max(0, syll(t) - 0.4) * 2.2), 0.35);
    }
    for (let t = 0; t < len; t += 0.012 + r() * 0.03) {
      const dens = swell(t);
      if (r() > dens) continue;
      const clap = biquad(mul(noise(Math.round(0.02 * SR), r), (tt) => Math.exp(-tt / 0.004)), "bp", 1500 + r() * 1500, 1.2);
      add(x, clap, 0.9 * dens, Math.round(t * SR), true);
    }
    return x;
  });
  const mono = chs[0].map((v, i) => (v + chs[1][i]) / 2);
  const wet = periodic(mono, (y) => reverb(y, { room: 0.9, damp: 0.45, wet: 0.5 }));
  write("arena_crowd", normalize([add(chs[0], wet[0], 0.5), add(chs[1], wet[1], 0.5)], 0.6));
}

// 5. A palm slapping the wrestling mat, in a big quiet hall.
{
  const r = rng(7);
  const x = buf(3.2);
  const m = Math.round(0.4 * SR);
  add(x, biquad(mul(noise(m, r), (t) => Math.exp(-t / 0.006)), "bp", 2200, 0.8), 1.4);
  add(x, biquad(mul(noise(m, r), (t) => Math.exp(-t / 0.025)), "bp", 900, 1.0), 1.0);
  const thud = new Float32Array(m);
  let ph = 0;
  for (let i = 0; i < m; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (55 + 35 * Math.exp(-t / 0.03))) / SR;
    thud[i] = Math.sin(ph) * Math.min(1, t / 0.002) * Math.exp(-t / 0.09);
  }
  add(x, thud, 0.9);
  write("mat_slap", normalize(reverb(x, { room: 0.9, damp: 0.35, wet: 0.32, predelay: 0.015 }), 0.9));
}

// 6. Light, joyful groove for the finale: 100 bpm, C – G – Am – F, 8 bars (19.2 s, loops).
{
  const r = rng(8);
  const beat = 0.6;
  const beats = 32;
  const n = Math.round(beats * beat * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const put = (src, gain, t, pan = 0) => {
    const off = Math.round(t * SR);
    add(L, src, gain * Math.min(1, 1 - pan), off, true);
    add(R, src, gain * Math.min(1, 1 + pan), off, true);
  };
  const sweep = (f1, f0, tau, decay, dur) => {
    const m = Math.round(dur * SR);
    const y = new Float32Array(m);
    let ph = 0;
    for (let i = 0; i < m; i++) {
      const t = i / SR;
      ph += (2 * Math.PI * (f0 + (f1 - f0) * Math.exp(-t / tau))) / SR;
      y[i] = Math.sin(ph) * Math.exp(-t / decay);
    }
    return y;
  };
  const pluck = (f, dur) => {
    const N = Math.round(SR / f);
    const ring = biquad(noise(N, r), "lp", 5000);
    const y = new Float32Array(Math.round(dur * SR));
    let idx = 0;
    for (let i = 0; i < y.length; i++) {
      const a = ring[idx];
      ring[idx] = 0.5 * (a + ring[(idx + 1) % N]) * 0.997;
      y[i] = a;
      idx = (idx + 1) % N;
    }
    return y;
  };
  const chords = [
    { root: 65.41, arp: [261.63, 329.63, 392, 523.25], pad: [130.81, 164.81, 196] },
    { root: 49, arp: [196, 246.94, 293.66, 392], pad: [98, 123.47, 146.83] },
    { root: 55, arp: [220, 261.63, 329.63, 440], pad: [110, 130.81, 164.81] },
    { root: 43.65, arp: [174.61, 220, 261.63, 349.23], pad: [87.31, 110, 130.81] },
  ];
  const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
  const kick = sweep(110, 48, 0.03, 0.2, 0.45);
  for (let bar = 0; bar < 8; bar++) {
    const c = chords[Math.floor(bar / 2)];
    const t0 = bar * 4 * beat;
    for (const [b, g] of [[0, 0.9], [1.5, 0.45], [2, 0.8]]) put(kick, g, t0 + b * beat);
    for (const b of [1, 3]) {
      for (const d of [0, 0.009, 0.019]) {
        const clap = biquad(mul(noise(Math.round(0.12 * SR), r), (t) => Math.exp(-t / (d > 0.015 ? 0.05 : 0.008))), "bp", 1300, 0.9);
        put(clap, 0.32, t0 + b * beat + d, 0.1);
      }
    }
    for (let e = 0; e < 8; e++) {
      const shaker = biquad(mul(noise(Math.round(0.08 * SR), r), (t) => Math.min(1, t / 0.008) * Math.exp(-t / 0.03)), "hp", 6500);
      put(shaker, e % 2 ? 0.07 : 0.11, t0 + e * (beat / 2), 0.35);
      const bass = new Float32Array(Math.round(0.28 * SR)).map((_, i) => {
        const t = i / SR;
        return (Math.sin(2 * Math.PI * c.root * t) + 0.35 * Math.sin(4 * Math.PI * c.root * t)) * Math.min(1, t / 0.005) * Math.exp(-t / 0.16);
      });
      put(bass, 0.42, t0 + e * (beat / 2));
      put(pluck(c.arp[pattern[e]], 0.9), 0.32, t0 + e * (beat / 2), e % 2 ? -0.35 : 0.35);
    }
    const padLen = 4 * beat;
    const pad = new Float32Array(Math.round(padLen * SR)).map((_, i) => {
      const t = i / SR;
      const w = Math.min(1, t / 0.3) * Math.min(1, (padLen - t) / 0.3);
      return c.pad.reduce((acc, f) => acc + Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(4 * Math.PI * f * t), 0) * w;
    });
    put(pad, 0.05, t0);
  }
  const mono = L.map((v, i) => (v + R[i]) / 2);
  const wet = periodic(mono, (y) => reverb(y, { room: 0.78, damp: 0.4, wet: 0.5 }));
  write("joy_groove", normalize([add(L, wet[0], 0.35), add(R, wet[1], 0.35)], 0.7));
}

// 7. Subtitle cues: an airy swish with a small bright "tink" (three pitches, used in turn).
[1568, 1760, 2093].forEach((f, k) => {
  const r = rng(90 + k);
  const x = buf(0.8);
  const m = Math.round(0.5 * SR);
  add(x, biquad(mul(noise(m, r), (t) => Math.min(1, t / 0.04) * Math.exp(-t / 0.11)), "bp", 3200, 0.7), 0.35);
  const tink = new Float32Array(m).map((_, i) => {
    const t = i / SR;
    return (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t)) * Math.min(1, t / 0.003) * Math.exp(-t / 0.09);
  });
  add(x, tink, 0.5, Math.round(0.02 * SR));
  const pop = new Float32Array(Math.round(0.15 * SR)).map((_, i) => {
    const t = i / SR;
    return Math.sin(2 * Math.PI * (180 + 120 * Math.exp(-t / 0.02)) * t) * Math.exp(-t / 0.03);
  });
  add(x, pop, 0.25);
  write(`sfx_text_${k + 1}`, normalize(reverb(x, { room: 0.7, wet: 0.2 }), 0.6));
});

// 8. Heartbeat, 66.7 bpm (16 beats = 14.4 s, loops).
{
  const beat = 0.9;
  const beats = 16;
  const x = new Float32Array(Math.round(beats * beat * SR));
  const thump = (f0, decay) =>
    new Float32Array(Math.round(0.45 * SR)).map((_, i) => {
      const t = i / SR;
      return Math.sin(2 * Math.PI * (f0 + 28 * Math.exp(-t / 0.02)) * t) * Math.min(1, t / 0.004) * Math.exp(-t / decay);
    });
  for (let k = 0; k < beats; k++) {
    add(x, thump(48, 0.09), 1, Math.round(k * beat * SR), true);
    add(x, thump(42, 0.11), 0.7, Math.round((k * beat + 0.24) * SR), true);
  }
  write("heartbeat", normalize(periodic(biquad(x, "lp", 180), (y) => reverb(y, { room: 0.6, wet: 0.12 })), 0.8));
}

// 9. Driving percussion for "the path": 100 bpm, kick, toms, claps, hats, bass (8 bars = 19.2 s, loops).
{
  const r = rng(12);
  const beat = 0.6;
  const bars = 8;
  const n = Math.round(bars * 4 * beat * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const put = (src, g, t, pan = 0) => {
    const off = Math.round(t * SR);
    add(L, src, g * Math.min(1, 1 - pan), off, true);
    add(R, src, g * Math.min(1, 1 + pan), off, true);
  };
  const drum = (f1, f0, tau, decay, dur, noiseAmt = 0) => {
    const m = Math.round(dur * SR);
    const y = new Float32Array(m);
    let ph = 0;
    for (let i = 0; i < m; i++) {
      const t = i / SR;
      ph += (2 * Math.PI * (f0 + (f1 - f0) * Math.exp(-t / tau))) / SR;
      y[i] = Math.sin(ph) * Math.exp(-t / decay);
    }
    if (noiseAmt) add(y, biquad(mul(noise(m, r), (t) => Math.exp(-t / 0.02)), "lp", 2500), noiseAmt);
    return y;
  };
  const kick = drum(120, 46, 0.03, 0.22, 0.5);
  const tomLo = drum(130, 70, 0.05, 0.3, 0.7, 0.3);
  const tomHi = drum(190, 110, 0.04, 0.22, 0.5, 0.3);
  const roots = [65.41, 49, 55, 43.65];
  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * 4 * beat;
    const root = roots[Math.floor(bar / 2)];
    for (let b = 0; b < 4; b++) put(kick, 0.85, t0 + b * beat);
    for (const b of [1, 3]) {
      for (const d of [0, 0.01, 0.02]) {
        put(biquad(mul(noise(Math.round(0.12 * SR), r), (t) => Math.exp(-t / (d > 0.015 ? 0.06 : 0.008))), "bp", 1200, 0.9), 0.35, t0 + b * beat + d, -0.1);
      }
    }
    put(tomLo, 0.55, t0 + 0.5 * beat, -0.3);
    put(tomHi, 0.45, t0 + 2.5 * beat, 0.3);
    put(tomHi, 0.4, t0 + 2.75 * beat, 0.3);
    if (bar % 2 === 1) {
      put(tomLo, 0.6, t0 + 3.5 * beat, -0.3);
      put(tomLo, 0.5, t0 + 3.75 * beat, -0.3);
    }
    for (let e = 0; e < 16; e++) {
      put(biquad(mul(noise(Math.round(0.05 * SR), r), (t) => Math.exp(-t / (e % 4 === 2 ? 0.03 : 0.012))), "hp", 7000), e % 2 ? 0.06 : 0.1, t0 + (e * beat) / 4, 0.4);
    }
    for (let e = 0; e < 8; e++) {
      const bass = new Float32Array(Math.round(0.25 * SR)).map((_, i) => {
        const t = i / SR;
        return (Math.sin(2 * Math.PI * root * t) + 0.5 * Math.sin(4 * Math.PI * root * t) + 0.25 * Math.sin(6 * Math.PI * root * t)) * Math.min(1, t / 0.004) * Math.exp(-t / 0.12);
      });
      put(bass, 0.4, t0 + (e * beat) / 2);
    }
  }
  const mono = L.map((v, i) => (v + R[i]) / 2);
  const wet = periodic(mono, (y) => reverb(y, { room: 0.75, damp: 0.4, wet: 0.5 }));
  write("drive_rhythm", normalize([add(L, wet[0], 0.3), add(R, wet[1], 0.3)], 0.75));
}

// ── motion-design SFX ───────────────────────────────────────────────────────

/** Band-pass whose centre glides from f0 to f1 (exponentially) over the buffer. */
const sweepBP = (x, f0, f1, q) => {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let s0 = 0; s0 < x.length; s0 += 64) {
    const f = f0 * Math.pow(f1 / f0, s0 / x.length);
    const w = (2 * Math.PI * f) / SR;
    const cs = Math.cos(w);
    const a = Math.sin(w) / (2 * q);
    for (let i = s0; i < Math.min(x.length, s0 + 64); i++) {
      const v = (a * x[i] - a * x2 + 2 * cs * y1 - (1 - a) * y2) / (1 + a);
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    }
  }
  return y;
};
const stereoWithRoom = (mono, wet, pan = (u) => 0.5, room = 0.75) => {
  const [rl, rr] = reverb(mono, { room, wet: 1 });
  const n = mono.length;
  return [mono.map((v, i) => v * (1 - pan(i / n)) * 1.4 + rl[i] * wet), mono.map((v, i) => v * pan(i / n) * 1.4 + rr[i] * wet)];
};

// whooshes: air sweeping past, panning left → right
for (const [name, dur, f0, f1, peak, seed] of [
  ["sfx_whoosh", 0.9, 300, 3500, 0.5, 21],
  ["sfx_whoosh_fast", 0.5, 600, 6000, 0.55, 22],
]) {
  const r = rng(seed);
  const n = Math.round((dur + 0.4) * SR);
  const y = mul(sweepBP(noise(n, r), f0, f1, 0.8), (t) => {
    const u = t / dur;
    return u < peak ? (u / peak) ** 2 : Math.exp(-(u - peak) / 0.12);
  });
  write(name, normalize(stereoWithRoom(y, 0.25, (u) => 0.2 + 0.6 * Math.min(1, u * 1.3)), 0.75));
}

// hit: a tight punch
{
  const r = rng(23);
  const x = buf(1.4);
  const m = Math.round(0.6 * SR);
  add(x, new Float32Array(m).map((_, i) => { const t = i / SR; return Math.sin(2 * Math.PI * (55 + 60 * Math.exp(-t / 0.025)) * t) * Math.exp(-t / 0.22); }), 1);
  add(x, new Float32Array(m).map((_, i) => { const t = i / SR; return Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t / 0.05); }), 0.35);
  add(x, biquad(mul(noise(m, r), (t) => Math.exp(-t / 0.012)), "bp", 2400, 0.7), 0.7);
  write("sfx_hit", normalize(stereoWithRoom(x, 0.25), 0.9));
}

// boom: hit + sub drop + rumble tail
{
  const r = rng(24);
  const x = buf(2.6);
  const m = Math.round(2.4 * SR);
  let ph = 0;
  const sub = new Float32Array(m);
  for (let i = 0; i < m; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (34 + 50 * Math.exp(-t / 0.25))) / SR;
    sub[i] = Math.sin(ph) * Math.min(1, t / 0.005) * Math.exp(-t / 0.7);
  }
  add(x, sub, 1);
  add(x, biquad(mul(noise(m, r), (t) => Math.exp(-t / 0.5)), "lp", 220), 0.6);
  add(x, biquad(mul(noise(Math.round(0.2 * SR), r), (t) => Math.exp(-t / 0.015)), "bp", 1800, 0.7), 0.5);
  write("sfx_boom", normalize(stereoWithRoom(x, 0.3, () => 0.5, 0.85), 0.9));
}

// riser: noise and tone climbing, cut off at the top
{
  const r = rng(25);
  const dur = 1.6;
  const n = Math.round(dur * SR);
  const y = mul(sweepBP(noise(n, r), 300, 7000, 1.2), (t) => (t / dur) ** 2.2);
  let ph = 0;
  const tone = new Float32Array(n).map((_, i) => {
    const t = i / SR;
    ph += (2 * Math.PI * (180 * Math.pow(5, t / dur))) / SR;
    return Math.sin(ph) * (t / dur) ** 3 * 0.25;
  });
  add(y, tone, 1);
  const out = concat(y, new Float32Array(Math.round(0.6 * SR)));
  write("sfx_riser", normalize(stereoWithRoom(out, 0.3), 0.7));
}

// tick: a small mechanical click (odometer)
{
  const r = rng(26);
  const x = buf(0.12);
  add(x, biquad(mul(noise(Math.round(0.01 * SR), r), (t) => Math.exp(-t / 0.0015)), "hp", 2500), 1);
  add(x, new Float32Array(Math.round(0.05 * SR)).map((_, i) => { const t = i / SR; return Math.sin(2 * Math.PI * 2600 * t) * Math.exp(-t / 0.008); }), 0.4);
  write("sfx_tick", normalize([x, x], 0.6));
}

// rewind: tape squeal — falling chirps over a fast whirr
{
  const r = rng(27);
  const dur = 1.3;
  const n = Math.round(dur * SR);
  const x = new Float32Array(n);
  for (let t = 0; t < dur - 0.15; t += 0.045 + r() * 0.03) {
    const m = Math.round((0.06 + r() * 0.05) * SR);
    const fTop = 900 + r() * 1400;
    let ph = 0;
    const chirp = new Float32Array(m).map((_, i) => {
      const u = i / m;
      ph += (2 * Math.PI * fTop * (1 - 0.6 * u)) / SR;
      return Math.sign(Math.sin(ph)) * 0.3 * Math.sin(Math.PI * u);
    });
    add(x, biquad(chirp, "lp", 3500), 0.5, Math.round(t * SR));
  }
  add(x, mul(biquad(noise(n, r), "bp", 2800, 1.5), (t) => 0.6 + 0.4 * Math.sin(2 * Math.PI * 32 * t)), 0.6);
  const env = mul(x, (t) => Math.min(1, t / 0.08) * Math.min(1, (dur - t) / 0.1));
  write("sfx_rewind", normalize(stereoWithRoom(env, 0.15), 0.7));
}

// flip: a card turning over
{
  const r = rng(28);
  const x = buf(0.9);
  const m = Math.round(0.6 * SR);
  add(x, mul(sweepBP(noise(m, r), 2500, 700, 0.9), (t) => Math.exp(-(((t - 0.14) / 0.06) ** 2)) + 0.8 * Math.exp(-(((t - 0.3) / 0.05) ** 2))), 1);
  add(x, biquad(mul(noise(Math.round(0.05 * SR), r), (t) => Math.exp(-t / 0.006)), "bp", 900, 0.8), 0.6, Math.round(0.36 * SR));
  write("sfx_flip", normalize(stereoWithRoom(x, 0.2, (u) => 0.3 + 0.4 * u), 0.7));
}

// shutter: two quick mechanical clicks
{
  const r = rng(29);
  const x = buf(0.35);
  for (const [t, g] of [[0, 1], [0.07, 0.7]]) {
    add(x, biquad(mul(noise(Math.round(0.02 * SR), r), (u) => Math.exp(-u / 0.004)), "hp", 1500), g, Math.round(t * SR));
    add(x, new Float32Array(Math.round(0.04 * SR)).map((_, i) => { const u = i / SR; return Math.sin(2 * Math.PI * 320 * u) * Math.exp(-u / 0.012); }), g * 0.5, Math.round(t * SR));
  }
  write("sfx_shutter", normalize(stereoWithRoom(x, 0.1), 0.6));
}

// sparkle: a bright bell arpeggio with shimmer
{
  const r = rng(30);
  const x = buf(2.2);
  [1046.5, 1318.5, 1568, 2093].forEach((f, k) => {
    add(x, new Float32Array(Math.round(1.6 * SR)).map((_, i) => {
      const t = i / SR;
      return (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2.76 * t)) * Math.min(1, t / 0.003) * Math.exp(-t / 0.5);
    }), 0.4, Math.round(k * 0.055 * SR));
  });
  add(x, biquad(mul(noise(Math.round(1.2 * SR), r), (t) => Math.min(1, t / 0.05) * Math.exp(-t / 0.35)), "hp", 6500), 0.25);
  write("sfx_sparkle", normalize(stereoWithRoom(x, 0.35, (u) => 0.3 + 0.4 * u, 0.85), 0.6));
}

// draw: a marker stroke
{
  const r = rng(31);
  const dur = 0.6;
  const x = mul(biquad(biquad(noise(Math.round(dur * SR), r), "bp", 3200, 1.8), "lp", 6000), (t) => Math.sin((Math.PI * t) / dur) ** 1.5 * (0.75 + 0.25 * Math.sin(2 * Math.PI * 38 * t)));
  write("sfx_draw", normalize(stereoWithRoom(x, 0.1), 0.45));
}

rmSync(TMP, { recursive: true, force: true });
