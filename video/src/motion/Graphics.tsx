import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AUDIO, LOOK, PALETTE, SFX, SfxName } from "../config";
import { useAssets } from "../lib/assets";
import { ease, prog, sec } from "../lib/timeline";
import { hexA } from "./Photo";

/** A sound effect at a frame of the current scene. */
export const Sfx: React.FC<{ at: number; name: SfxName; volume?: number }> = ({ at, name, volume = 1 }) => {
  const { audio } = useAssets();
  const file = SFX[name];
  if (!audio[file]) return null;
  return (
    <Sequence from={at} durationInFrames={Math.max(1, Math.ceil(audio[file] * 30))} layout="none" name={`♪ ${name}`}>
      <Audio src={staticFile(`assets/audio/${file}`)} volume={volume * AUDIO.sfx} />
    </Sequence>
  );
};

/** Hand-drawn marker circle around a point, drawn on over `duration` frames. */
export const Annotation: React.FC<{
  cx: number;
  cy: number;
  r: number;
  start: number;
  duration?: number;
  color?: string;
  width?: number;
  dashed?: boolean;
  out?: number;
}> = ({ cx, cy, r, start, duration = 16, color = PALETTE.yellow, width = 7, dashed = false, out }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (frame < start) return null;
  const p = prog(frame, start, duration, ease.out);
  const q = out !== undefined ? prog(frame, out, 10, ease.in) : 0;
  const pts: string[] = [];
  const turns = 1.12;
  for (let i = 0; i <= 90; i++) {
    const a = -Math.PI * 0.6 + (i / 90) * Math.PI * 2 * turns;
    const k = 1 + 0.05 * Math.sin(a * 3 + 1) + 0.03 * (i / 90);
    pts.push(`${(cx + Math.cos(a) * r * k).toFixed(1)},${(cy + Math.sin(a) * r * 0.92 * k).toFixed(1)}`);
  }
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 1 - q }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={dashed ? "0.025 0.02" : "1 1"}
        strokeDashoffset={dashed ? -frame * 0.002 : 1 - p}
        opacity={dashed ? p : 1}
      />
    </svg>
  );
};

/**
 * The wrestling mat seen from above: blue field, red ring, yellow centre, centre circle.
 * draw 0→1 strokes the rings on; fill 0→1 floods the colours in.
 */
export const Mat: React.FC<{
  cx: number;
  cy: number;
  R: number;
  draw: number;
  fill: number;
  field?: boolean;
  lineColor?: string;
  style?: React.CSSProperties;
}> = ({ cx, cy, R, draw, fill, field = true, lineColor = "#ffffff", style }) => {
  const { width: W, height: H } = useVideoConfig();
  const ring = R * 0.13;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, ...style }}>
      {field ? <rect width={W} height={H} fill={PALETTE.blue} opacity={fill} /> : null}
      <circle cx={cx} cy={cy} r={R - ring / 2} fill="none" stroke={PALETTE.red} strokeWidth={ring} opacity={fill} />
      <circle cx={cx} cy={cy} r={(R - ring) * fill} fill={PALETTE.yellow} opacity={Math.min(1, fill * 1.5)} />
      {[R, R - ring, R * 0.14].map((r, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={lineColor}
          strokeWidth={Math.max(2, R * 0.008)}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - Math.min(1, Math.max(0, draw * 1.4 - i * 0.2))}
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={0.9 * (1 - fill * 0.6)}
        />
      ))}
    </svg>
  );
};

/** Expanding ring from an impact point. */
export const Shockwave: React.FC<{ cx: number; cy: number; start: number; maxR: number; color?: string; width?: number; duration?: number }> = ({
  cx,
  cy,
  start,
  maxR,
  color = PALETTE.yellow,
  width = 26,
  duration = 26,
}) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (frame < start || frame > start + duration) return null;
  const p = prog(frame, start, duration, ease.out);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <circle cx={cx} cy={cy} r={p * maxR} fill="none" stroke={color} strokeWidth={width * (1 - p) + 1} opacity={1 - p} />
    </svg>
  );
};

/**
 * Reveals children through a growing circle (or hides them through a shrinking one),
 * the edge trimmed with the mat's yellow / red / blue rings.
 */
export const Iris: React.FC<{
  start: number;
  duration: number;
  cx: number;
  cy: number;
  mode: "open" | "close";
  rings?: boolean;
  children: React.ReactNode;
}> = ({ start, duration, cx, cy, mode, rings = true, children }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 160;
  const p = prog(frame, start, duration, mode === "open" ? ease.expoOut : ease.expoIn);
  const r = mode === "open" ? p * maxR : (1 - p) * maxR;
  const done = mode === "open" ? p >= 1 : false;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: done ? undefined : `circle(${Math.max(0, r)}px at ${cx}px ${cy}px)` }}>{children}</AbsoluteFill>
      {rings && !done && r > 0.5 ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <circle cx={cx} cy={cy} r={r + 9} fill="none" stroke={PALETTE.yellow} strokeWidth={18} />
          <circle cx={cx} cy={cy} r={r + 38} fill="none" stroke={PALETTE.red} strokeWidth={40} />
          <circle cx={cx} cy={cy} r={r + 88} fill="none" stroke={PALETTE.blue} strokeWidth={60} />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Three slanted panels in mat colours.
 * phase "cover": they sweep in from the right until the screen is covered.
 * phase "uncover": they sweep out to the left, revealing what is underneath.
 */
export const Panels: React.FC<{ start: number; phase: "cover" | "uncover"; colors?: string[]; duration?: number }> = ({
  start,
  phase,
  colors = [PALETTE.blue, PALETTE.red, PALETTE.yellow],
  duration = 11,
}) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (phase === "cover" && frame < start) return null;
  if (phase === "uncover" && frame > start + duration + colors.length * 3) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {colors.map((c, i) => {
        const delay = phase === "cover" ? i * 3 : (colors.length - 1 - i) * 3;
        const p = prog(frame, start + delay, duration, phase === "cover" ? ease.expoOut : ease.expoIn);
        const x = phase === "cover" ? (1 - p) * W * 1.6 : -p * W * 1.6;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: -W * 0.3,
              top: -H * 0.2,
              width: W * 1.6,
              height: H * 1.4,
              background: c,
              transform: `translateX(${x}px) skewX(-16deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Content revealed in vertical strips that slide in from alternating sides. */
export const Strips: React.FC<{ start: number; n?: number; stagger?: number; duration?: number; children: React.ReactNode }> = ({
  start,
  n = 6,
  stagger = 2,
  duration = 14,
  children,
}) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (frame < start) return null;
  const all = frame >= start + (n - 1) * stagger + duration;
  if (all) return <AbsoluteFill>{children}</AbsoluteFill>;
  const sw = W / n;
  return (
    <AbsoluteFill>
      {Array.from({ length: n }, (_, i) => {
        const p = prog(frame, start + i * stagger, duration, ease.expoOut);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: Math.floor(i * sw),
              top: 0,
              width: Math.ceil(sw) + 1,
              height: H,
              overflow: "hidden",
              transform: `translateY(${(1 - p) * (i % 2 ? -1 : 1) * H}px)`,
            }}
          >
            <div style={{ position: "absolute", left: -Math.floor(i * sw), top: 0, width: W, height: H }}>{children}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** A diagonal band of light that sweeps across. */
export const LightSweep: React.FC<{ start: number; duration?: number; strength?: number }> = ({ start, duration = 36, strength = 0.55 }) => {
  const frame = useCurrentFrame();
  if (frame < start || frame > start + duration) return null;
  const p = prog(frame, start, duration, ease.inOut);
  const x = -40 + p * 180;
  return (
    <AbsoluteFill
      style={{
        mixBlendMode: "screen",
        background: `linear-gradient(105deg, transparent ${x - 22}%, rgba(255,236,190,${strength}) ${x}%, transparent ${x + 22}%)`,
      }}
    />
  );
};

/** Quick white flash. */
export const Flash: React.FC<{ at: number; duration?: number; strength?: number; color?: string }> = ({ at, duration = 8, strength = 0.85, color = "#fff" }) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > at + duration) return null;
  return <AbsoluteFill style={{ background: color, opacity: strength * (1 - prog(frame, at, duration, ease.out)) }} />;
};

/** Film grain + vignette over the whole film. */
export const Finish: React.FC = () => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const gw = Math.round(W / 2);
  const gh = Math.round(H / 2);
  return (
    <>
      <AbsoluteFill
        style={{ background: `radial-gradient(ellipse 85% 85% at 50% 50%, transparent 58%, ${hexA(PALETTE.ink, LOOK.vignette)} 100%)` }}
      />
      {LOOK.grain > 0 ? (
        <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: LOOK.grain * 2.4 }}>
          <svg width={gw} height={gh} viewBox={`0 0 ${gw} ${gh}`} style={{ width: W, height: H }} preserveAspectRatio="none">
            <filter id="grain" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 48} stitchTiles="stitch" />
              <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
            </filter>
            <rect width={gw} height={gh} filter="url(#grain)" />
          </svg>
        </AbsoluteFill>
      ) : null}
    </>
  );
};

/** Frames → seconds helper for scene files. */
export const f = sec;
