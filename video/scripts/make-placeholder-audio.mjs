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

// 1. Quiet ambient drone (A minor add9), loops every 40 s.
{
  const len = 40;
  const r = rng(1);
  const notes = [55, 82.4, 110, 130.8, 164.8, 246.9];
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

// 2. Breathing, one shot (~11 s).
{
  const r = rng(2);
  const x = buf(11);
  const breaths = [
    [0.4, 1.7, 1050], [2.3, 2.1, 520], [5.0, 1.6, 1050], [6.9, 2.2, 520], [9.4, 1.5, 1000],
  ];
  for (const [start, dur, f] of breaths) {
    const n = Math.round(dur * SR);
    const b = biquad(biquad(noise(n, r), "bp", f, 0.8), "lp", 2600);
    const shaped = mul(b, (t) => Math.sin((Math.PI * t) / dur) ** 2);
    add(x, shaped, 1, Math.round(start * SR));
  }
  write("breath", normalize(reverb(x, { room: 0.6, wet: 0.12 }), 0.45));
}

// 3. Wrestling hall: room tone, distant voices, steps, bodies on the mat, a far whistle. Loops every 30 s.
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

// 4. Restrained sports pulse, 75 bpm, 8 bars (loops; 25.6 s = whole frames at 30 fps).
{
  const r = rng(4);
  const beat = 60 / 75;
  const beats = 32;
  const n = Math.round(beats * beat * SR);
  const dry = new Float32Array(n);
  const roots = [55, 43.65, 65.41, 49];

  for (let k = 0; k < beats; k++) {
    const start = Math.round(k * beat * SR);
    const accent = k % 4 === 0 || k % 4 === 2 ? 1 : 0.62;
    // kick
    const m = Math.round(0.5 * SR);
    const kick = new Float32Array(m);
    let ph = 0;
    for (let i = 0; i < m; i++) {
      const t = i / SR;
      ph += (2 * Math.PI * (46 + 70 * Math.exp(-t / 0.035))) / SR;
      kick[i] = Math.sin(ph) * Math.exp(-t / 0.22);
    }
    add(dry, kick, 0.75 * accent, start, true);
    // soft off-beat tick
    const tick = biquad(mul(noise(Math.round(0.05 * SR), r), (t) => Math.exp(-t / 0.012)), "hp", 5200);
    add(dry, tick, 0.07, start + Math.round((beat / 2) * SR), true);
    // low tom every second bar
    if (k % 8 === 7) {
      const tom = new Float32Array(m);
      let p2 = 0;
      for (let i = 0; i < m; i++) {
        const t = i / SR;
        p2 += (2 * Math.PI * (95 + 50 * Math.exp(-t / 0.05))) / SR;
        tom[i] = Math.sin(p2) * Math.exp(-t / 0.2);
      }
      add(dry, tom, 0.3, start + Math.round(beat * 0.5 * SR), true);
    }
  }
  // bass, ducked by the kick
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const bar = Math.floor(t / (beat * 4)) % 4;
    const f = roots[bar];
    const inBeat = (t % beat) / beat;
    const duck = 0.35 + 0.65 * Math.min(1, inBeat * 3);
    dry[i] += (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * 0.2 * duck;
  }
  write("pulse_rhythm", normalize(periodic(dry, (y) => reverb(y, { room: 0.7, wet: 0.14 })), 0.7));
}

// 5. Emotional pad: Am(add9) – Fmaj7 – C – G6, 6 s per chord (loops).
{
  const per = 6;
  const chords = [
    [110, 130.81, 164.81, 246.94, 329.63],
    [87.31, 110, 130.81, 164.81, 220],
    [130.81, 164.81, 196, 261.63, 293.66],
    [98, 123.47, 146.83, 164.81, 246.94],
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

// 6. Arena crowd: roar, chatter, swells of cheering and applause (loops every 30 s).
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

// 7. A palm slapping the wrestling mat, in a big quiet hall.
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

rmSync(TMP, { recursive: true, force: true });
