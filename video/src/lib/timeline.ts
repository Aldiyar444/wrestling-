import { Easing, interpolate } from "remotion";
import { AUDIO, FPS, LOOK, SCENES, VolumeKey } from "../config";

/** Seconds → frames, with the global time scale applied. */
export const sec = (s: number) => Math.round(s * LOOK.timeScale * FPS);

export const sceneLength = SCENES.map((s) => sec(s.duration));

export const sceneStart: Record<string, number> = {};
{
  let acc = 0;
  SCENES.forEach((s, i) => {
    sceneStart[s.id] = acc;
    acc += sceneLength[i];
  });
}

export const TOTAL_FRAMES = sceneLength.reduce((a, b) => a + b, 0);

/** Absolute frame of a moment inside a scene. */
export const at = (sceneId: string, s: number) => {
  if (!(sceneId in sceneStart)) {
    throw new Error(`Unknown scene id "${sceneId}" in config`);
  }
  return sceneStart[sceneId] + sec(s);
};

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Gentle camera-move easing. */
export const easeCamera = Easing.bezier(0.37, 0, 0.63, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** 0→1 progress of `frame` over [start, start + length]. */
export const progress = (
  frame: number,
  start: number,
  length: number,
  easing: (t: number) => number = (t) => t,
) => {
  if (length <= 0) return frame >= start ? 1 : 0;
  return interpolate(frame, [start, start + length], [0, 1], { ...clamp, easing });
};

/** Piecewise-linear value from [frame, value] keys (keys need not be sorted). */
export const keyframes = (frame: number, keys: [number, number][]) => {
  if (keys.length === 0) return 0;
  const sorted = [...keys].sort((a, b) => a[0] - b[0]);
  if (frame <= sorted[0][0]) return sorted[0][1];
  for (let i = 1; i < sorted.length; i++) {
    const [f1, v1] = sorted[i];
    const [f0, v0] = sorted[i - 1];
    if (frame <= f1) {
      return f1 === f0 ? v1 : v0 + ((v1 - v0) * (frame - f0)) / (f1 - f0);
    }
  }
  return sorted[sorted.length - 1][1];
};

export const volumeKeys = (keys: VolumeKey[]): [number, number][] =>
  keys.map(([scene, s, v]) => [at(scene, s), v * AUDIO.master]);

/** Deterministic, smooth pseudo-random shake. */
export const shakeOffset = (frame: number, amount: number) => {
  const a = amount * LOOK.shake;
  return {
    x: a * (Math.sin(frame * 1.7) * 5 + Math.sin(frame * 3.1 + 1.3) * 3),
    y: a * (Math.cos(frame * 2.3 + 0.4) * 4 + Math.sin(frame * 4.7) * 2),
    r: a * Math.sin(frame * 1.9 + 2.1) * 0.18,
  };
};
