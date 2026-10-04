import { useVideoConfig } from "remotion";
import { LOOK, Tone } from "../config";

export type Layout = { W: number; H: number; u: number };

/** "#rrggbb" + alpha → rgba() */
export const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return {
    W: width,
    H: height,
    // 1 unit = 1px at 1080 on the short side
    u: Math.min(width, height) / 1080,
  };
};

export type Region = { x: number; y: number; w: number; h: number; mask?: string };

export const regionFor = (framing: "panel" | "full", L: Layout): Region => {
  const { W, H } = L;
  if (framing === "full") return { x: 0, y: 0, w: W, h: H };
  return {
    x: W * 0.24,
    y: 0,
    w: W * 0.76,
    h: H,
    mask: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 18%, #000 40%)",
  };
};

export const gradeFilter = (tone: Tone) => {
  const g = LOOK.grade[tone];
  return [
    `grayscale(${g.grayscale})`,
    `sepia(${g.sepia})`,
    g.hue ? `hue-rotate(${g.hue}deg)` : "",
    `contrast(${g.contrast})`,
    `brightness(${g.brightness})`,
  ]
    .filter(Boolean)
    .join(" ");
};
