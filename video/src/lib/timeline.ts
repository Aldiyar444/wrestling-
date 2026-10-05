import { Easing, interpolate } from "remotion";
import { AUDIO, FPS, SceneId, SCENES, VolumeKey } from "../config";

/** Seconds → frames. */
export const sec = (s: number) => Math.round(s * FPS);

export const sceneLength = SCENES.map((s) => sec(s.duration));
export const sceneStart = {} as Record<SceneId, number>;
{
  let acc = 0;
  SCENES.forEach((s, i) => {
    sceneStart[s.id] = acc;
    acc += sceneLength[i];
  });
}
export const TOTAL_FRAMES = sceneLength.reduce((a, b) => a + b, 0);

/** Absolute frame of a moment inside a scene. */
export const at = (scene: SceneId, s: number) => sceneStart[scene] + sec(s);

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  camera: Easing.bezier(0.37, 0, 0.63, 1),
  /** Fast start, long glide — for whips and slams. */
  expoOut: Easing.bezier(0.19, 1, 0.22, 1),
  expoIn: Easing.bezier(0.95, 0.05, 0.8, 0.04),
};

/** 0→1 progress of `frame` over [start, start + length] seconds-in-frames. */
export const prog = (frame: number, start: number, length: number, easing: (t: number) => number = (t) => t) =>
  length <= 0 ? (frame >= start ? 1 : 0) : interpolate(frame, [start, start + length], [0, 1], { ...clamp, easing });

/** Same as prog, but start/length in seconds. */
export const progS = (frame: number, startS: number, lengthS: number, easing?: (t: number) => number) =>
  prog(frame, sec(startS), sec(lengthS), easing);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Piecewise-linear value from [frame, value] keys. */
export const keyframes = (frame: number, keys: [number, number][]) => {
  if (keys.length === 0) return 0;
  const k = [...keys].sort((a, b) => a[0] - b[0]);
  if (frame <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (frame <= k[i][0]) {
      const [f0, v0] = k[i - 1];
      const [f1, v1] = k[i];
      return f1 === f0 ? v1 : v0 + ((v1 - v0) * (frame - f0)) / (f1 - f0);
    }
  }
  return k[k.length - 1][1];
};

export const volumeKeys = (keys: VolumeKey[]): [number, number][] =>
  keys.map(([scene, s, v]) => [at(scene, s), v * AUDIO.music]);

/** Deterministic smooth shake. */
export const shakeAt = (frame: number, amount: number) => ({
  x: amount * (Math.sin(frame * 1.7) * 9 + Math.sin(frame * 3.1 + 1.3) * 5),
  y: amount * (Math.cos(frame * 2.3 + 0.4) * 7 + Math.sin(frame * 4.7) * 3),
  r: amount * Math.sin(frame * 1.9 + 2.1) * 0.35,
});
