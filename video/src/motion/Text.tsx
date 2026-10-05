import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS, PALETTE } from "../config";
import { ease, prog } from "../lib/timeline";

/** Text styles. Sizes are px at 1080p. */
export const type = {
  hero: { fontFamily: FONTS.display, fontWeight: 700, lineHeight: 0.92, letterSpacing: "0.005em", textTransform: "uppercase" },
  display: { fontFamily: FONTS.display, fontWeight: 600, lineHeight: 1, letterSpacing: "0.01em", textTransform: "uppercase" },
  light: { fontFamily: FONTS.display, fontWeight: 300, lineHeight: 1.05, letterSpacing: "0.01em" },
  body: { fontFamily: FONTS.text, fontWeight: 500, lineHeight: 1.18 },
  label: { fontFamily: FONTS.display, fontWeight: 500, letterSpacing: "0.32em", textTransform: "uppercase" },
} satisfies Record<string, React.CSSProperties>;

export const shadow = "0 2px 4px rgba(0,0,0,0.35), 0 6px 40px rgba(0,0,0,0.45)";

type Word = { w: string; hl: boolean };
/** Splits "a *b c* d" into words, marking the *highlighted* ones. */
export const toWords = (s: string): Word[] =>
  s
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .flatMap((part) => {
      const hl = part.startsWith("*");
      return (hl ? part.slice(1, -1) : part)
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => ({ w, hl }));
    });

const useSpring = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (start: number, config: Partial<{ damping: number; stiffness: number; mass: number }> = {}) =>
    spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 170, mass: 0.7, ...config } });
};

/**
 * Words that appear one after another.
 *  rise  — each word slides up from under an invisible line
 *  blur  — each word sharpens out of a soft blur
 *  pop   — each word springs up from small
 * `out` (frame) — words leave upward one by one.
 * Highlighted words get the accent colour, or a yellow marker bar with `marker`.
 */
export const Words: React.FC<{
  text: string;
  start: number;
  stagger?: number;
  mode?: "rise" | "blur" | "pop";
  out?: number;
  marker?: boolean;
  hlColor?: string;
  style?: React.CSSProperties;
}> = ({ text, start, stagger = 3, mode = "rise", out, marker = false, hlColor = PALETTE.yellow, style }) => {
  const frame = useCurrentFrame();
  const sp = useSpring();
  const words = toWords(text);
  if (frame < start - 1) return null;
  return (
    <div style={{ ...style }}>
      {words.map((wd, i) => {
        const p = sp(start + i * stagger);
        const q = out !== undefined ? prog(frame, out + i * 1.5, 9, ease.in) : 0;
        const last = i === words.length - 1;
        const markerP = marker && wd.hl ? prog(frame, start + i * stagger + 5, 9, ease.out) : 0;
        const color = wd.hl ? (marker ? (markerP > 0.5 ? PALETTE.ink : undefined) : hlColor) : undefined;
        let inner: React.CSSProperties;
        if (mode === "rise") {
          inner = { transform: `translateY(${(1 - p) * 140 - q * 140}%)` };
        } else if (mode === "blur") {
          const e = Math.min(1, p);
          inner = { opacity: e * (1 - q), filter: `blur(${(1 - e) * 14 + q * 10}px)`, transform: `scale(${1.08 - 0.08 * e})` };
        } else {
          inner = { transform: `translateY(${(1 - p) * 40}%) scale(${0.4 + 0.6 * p})`, opacity: Math.min(1, p * 2) * (1 - q) };
        }
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              position: "relative",
              overflow: mode === "rise" ? "hidden" : "visible",
              verticalAlign: "top",
              padding: "0.22em 0.04em 0.14em",
              margin: `-0.22em ${last ? "-0.04em" : "0.2em"} -0.14em -0.04em`,
            }}
          >
            {marker && wd.hl ? (
              <span
                style={{
                  position: "absolute",
                  left: "-0.08em",
                  right: last ? "-0.08em" : "-0.3em",
                  top: "0.28em",
                  bottom: "0.08em",
                  background: PALETTE.yellow,
                  transform: `scaleX(${markerP})`,
                  transformOrigin: "left",
                  opacity: 1 - q,
                }}
              />
            ) : null}
            <span style={{ display: "inline-block", position: "relative", color, ...inner }}>{wd.w}</span>
          </span>
        );
      })}
    </div>
  );
};

/** Letters that spring in one by one with a little bounce and tilt. */
export const Letters: React.FC<{
  text: string;
  start: number;
  stagger?: number;
  out?: number;
  style?: React.CSSProperties;
}> = ({ text, start, stagger = 1.6, out, style }) => {
  const frame = useCurrentFrame();
  const sp = useSpring();
  if (frame < start - 1) return null;
  const q = out !== undefined ? prog(frame, out, 10, ease.in) : 0;
  return (
    <div style={{ whiteSpace: "nowrap", opacity: 1 - q, filter: q ? `blur(${q * 12}px)` : undefined, ...style }}>
      {[...text].map((ch, i) => {
        const p = sp(start + i * stagger, { damping: 9, stiffness: 190, mass: 0.6 });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity: Math.min(1, p * 2.5),
              transform: `translateY(${(1 - p) * 0.55}em) scale(${0.25 + 0.75 * p}) rotate(${(1 - p) * (i % 2 ? 14 : -14)}deg)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/** A word that lands hard: big → normal with an overshoot and a blur. */
export const Slam: React.FC<{
  start: number;
  from?: number;
  out?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ start, from = 2.4, out, style, children }) => {
  const frame = useCurrentFrame();
  const sp = useSpring();
  if (frame < start) return null;
  const p = sp(start, { damping: 12, stiffness: 240, mass: 0.8 });
  const q = out !== undefined ? prog(frame, out, 9, ease.in) : 0;
  const e = Math.min(1, p);
  return (
    <div
      style={{
        transform: `scale(${from + (1 - from) * p + q * 0.25})`,
        opacity: Math.min(1, p * 3) * (1 - q),
        filter: e < 0.98 || q > 0 ? `blur(${(1 - e) * 22 + q * 14}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Characters typed one by one, with a blinking cursor. */
export const Typewriter: React.FC<{ text: string; start: number; cps?: number; style?: React.CSSProperties; out?: number }> = ({
  text,
  start,
  cps = 16,
  style,
  out,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start) return null;
  const n = Math.floor(((frame - start) / fps) * cps);
  const q = out !== undefined ? prog(frame, out, 10, ease.in) : 0;
  const typing = n < text.length;
  return (
    <div style={{ opacity: 1 - q, ...style }}>
      {[...text].map((ch, i) => (
        <span key={i} style={{ opacity: i < n ? 1 : 0, whiteSpace: "pre" }}>
          {ch}
        </span>
      ))}
      <span
        style={{
          display: "inline-block",
          width: "0.06em",
          height: "0.9em",
          marginLeft: "0.06em",
          verticalAlign: "-0.1em",
          background: PALETTE.yellow,
          opacity: typing || Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
        }}
      />
    </div>
  );
};

/** Rolling counter digits from `from` to `to`, with carry like a real odometer. */
export const Odometer: React.FC<{
  from: number;
  to: number;
  start: number;
  duration: number;
  digits?: number;
  easing?: (t: number) => number;
  style?: React.CSSProperties;
}> = ({ from, to, start, duration, digits = 2, easing = ease.inOut, style }) => {
  const frame = useCurrentFrame();
  const v = from + (to - from) * prog(frame, start, duration, easing);
  const vNext = from + (to - from) * prog(frame + 1, start, duration, easing);
  const speed = Math.abs(vNext - v);
  const places = Array.from({ length: digits }, (_, k) => digits - 1 - k).map((k) => {
    const p = 10 ** k;
    if (k === 0) return v;
    return Math.floor(v / p) + Math.min(1, Math.max(0, (v % p) - (p - 1)));
  });
  return (
    <div style={{ display: "flex", lineHeight: 1, ...style }}>
      {places.map((pos, i) => (
        <div key={i} style={{ height: "1em", overflow: "hidden", width: "0.58em", textAlign: "center" }}>
          <div
            style={{
              transform: `translateY(${-(((pos % 10) + 10) % 10)}em)`,
              filter: speed > 0.02 ? `blur(${Math.min(10, speed * 30)}px)` : undefined,
            }}
          >
            {Array.from({ length: 11 }, (_, d) => (
              <div key={d} style={{ height: "1em" }}>
                {d % 10}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Items that replace one another in place, or stack upward like a feed (`stack`).
 * times[i] — frame when item i arrives.
 */
export const Slot: React.FC<{
  items: string[];
  times: number[];
  out?: number;
  stack?: boolean;
  lineHeight?: number;
  style?: React.CSSProperties;
  itemStyle?: (i: number, active: boolean) => React.CSSProperties;
}> = ({ items, times, out, stack = false, lineHeight = 1.15, style, itemStyle }) => {
  const frame = useCurrentFrame();
  const sp = useSpring();
  if (frame < times[0]) return null;
  const q = out !== undefined ? prog(frame, out, 10, ease.in) : 0;
  return (
    <div style={{ position: "relative", height: `${lineHeight}em`, overflow: stack ? "visible" : "hidden", ...style }}>
      {items.map((item, i) => {
        if (frame < times[i]) return null;
        const p = sp(times[i], { damping: 14, stiffness: 200 });
        // how many items arrived after this one (springs, so the stack glides)
        let after = 0;
        for (let j = i + 1; j < items.length; j++) if (frame >= times[j]) after += Math.min(1, sp(times[j], { damping: 14, stiffness: 200 }));
        const active = after < 0.5;
        const y = (1 - p) * 100 - after * 100;
        const opacity = stack ? Math.min(1, p * 2) * Math.max(0.22, 1 - after * 0.3) : Math.min(1, p * 2) * (1 - Math.min(1, after));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              whiteSpace: "nowrap",
              transform: `translateY(${y - q * 60}%)`,
              opacity: opacity * (1 - q),
              ...(itemStyle ? itemStyle(i, active) : {}),
            }}
          >
            {item.replace(/\*/g, "")}
          </div>
        );
      })}
    </div>
  );
};
