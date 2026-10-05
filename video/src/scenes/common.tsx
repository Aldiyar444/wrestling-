import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { LOOK, PALETTE, SfxName } from "../config";
import { Sfx } from "../motion/Graphics";
import { hexA } from "../motion/Photo";
import { ease, prog, sec, shakeAt } from "../lib/timeline";

export const useScene = () => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  return { frame, W, H };
};

/** Seconds → frames inside a scene. */
export const s = sec;

/** Soft dark gradient that keeps text readable over photos. */
export const Shade: React.FC<{ side: "left" | "bottom" | "top" | "full"; strength?: number; opacity?: number }> = ({
  side,
  strength = 0.75,
  opacity = 1,
}) => {
  const c = (a: number) => hexA(PALETTE.ink, a * strength);
  const bg =
    side === "left"
      ? `linear-gradient(to right, ${c(1)} 0%, ${c(0.75)} 30%, ${c(0)} 62%)`
      : side === "bottom"
        ? `linear-gradient(to top, ${c(1)} 0%, ${c(0.6)} 32%, ${c(0)} 62%)`
        : side === "top"
          ? `linear-gradient(to bottom, ${c(1)} 0%, ${c(0.5)} 30%, ${c(0)} 55%)`
          : c(0.6);
  return <AbsoluteFill style={{ background: bg, opacity }} />;
};

/** Camera shake: sum of decaying shakes starting at the given frames. */
export const useShake = (hits: [frame: number, amount: number][], length = 14) => {
  const frame = useCurrentFrame();
  let out = { x: 0, y: 0, r: 0 };
  for (const [start, amount] of hits) {
    if (frame >= start && frame < start + length) {
      const d = 1 - (frame - start) / length;
      const sh = shakeAt(frame, amount * d * d * LOOK.shake);
      out = { x: out.x + sh.x, y: out.y + sh.y, r: out.r + sh.r };
    }
  }
  return `translate(${out.x}px, ${out.y}px) rotate(${out.r}deg)`;
};

/** A tick each time an odometer passes a whole number (at most `max` ticks). */
export const OdometerTicks: React.FC<{
  from: number;
  to: number;
  start: number;
  duration: number;
  easing?: (t: number) => number;
  name?: SfxName;
  max?: number;
  volume?: number;
}> = ({ from, to, start, duration, easing = ease.inOut, name = "tick", max = 14, volume = 0.6 }) => {
  const frames: number[] = [];
  let last = Math.round(from);
  for (let i = 1; i <= duration; i++) {
    const v = from + (to - from) * prog(start + i, start, duration, easing);
    const n = to > from ? Math.floor(v) : Math.ceil(v);
    if (n !== last) {
      frames.push(start + i);
      last = n;
    }
  }
  const step = Math.max(1, Math.ceil(frames.length / max));
  return (
    <>
      {frames
        .filter((_, i) => i % step === 0)
        .map((fr) => (
          <Sfx key={fr} at={fr} name={name} volume={volume} />
        ))}
    </>
  );
};
