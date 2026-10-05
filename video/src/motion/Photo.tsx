import React from "react";
import { Img } from "remotion";
import { FONTS, LOOK, PALETTE, PhotoKey, PHOTOS } from "../config";
import { PhotoInfo, usePhoto } from "../lib/assets";

export const photoGrade = (extra = "") =>
  `saturate(${LOOK.photo.saturate}) contrast(${LOOK.photo.contrast}) brightness(${LOOK.photo.brightness}) ${extra}`;

/** "#rrggbb" + alpha → rgba() */
export const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

export type Cover = {
  left: number;
  top: number;
  bw: number;
  bh: number;
  fx: number;
  fy: number;
  scale: number;
  dx: number;
  dy: number;
  /** Image point (0…1) → container pixels, with zoom and pan applied. */
  map: (px: number, py: number) => [number, number];
};

/** Cover-fit an image into a w×h box, centred on `focus`, zoomed by `scale` around it. */
export const cover = (
  info: PhotoInfo,
  w: number,
  h: number,
  focus: [number, number],
  scale = 1,
  dx = 0,
  dy = 0,
): Cover => {
  const iw = info?.w ?? w;
  const ih = info?.h ?? h;
  const s0 = Math.max(w / iw, h / ih);
  const bw = iw * s0;
  const bh = ih * s0;
  const [fx, fy] = focus;
  const left = Math.min(0, Math.max(w - bw, w / 2 - fx * bw));
  const top = Math.min(0, Math.max(h - bh, h / 2 - fy * bh));
  return {
    left,
    top,
    bw,
    bh,
    fx,
    fy,
    scale,
    dx,
    dy,
    map: (px, py) => [left + dx + fx * bw + scale * (px - fx) * bw, top + dy + fy * bh + scale * (py - fy) * bh],
  };
};

const Placeholder: React.FC<{ photo: PhotoKey; w: number; h: number }> = ({ photo, w, h }) => {
  const u = Math.min(w, h) / 1080;
  return (
    <div
      style={{
        width: w,
        height: h,
        position: "relative",
        overflow: "hidden",
        background: `radial-gradient(ellipse 80% 70% at 50% 45%, ${PALETTE.blue} 0%, #12306a 70%, ${PALETTE.ink} 100%)`,
      }}
    >
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.36} fill="none" stroke={hexA(PALETTE.red, 0.55)} strokeWidth={Math.min(w, h) * 0.05} />
        <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.3} fill={hexA(PALETTE.yellow, 0.18)} />
      </svg>
      {LOOK.showPlaceholderLabels ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: h / 2 - 40 * u,
            textAlign: "center",
            fontFamily: FONTS.display,
            color: "rgba(255,255,255,0.85)",
            fontSize: Math.max(18, 30 * u),
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            lineHeight: 1.5,
          }}
        >
          <div>{PHOTOS[photo].label}</div>
          <div style={{ fontFamily: FONTS.text, letterSpacing: "0.03em", textTransform: "none", opacity: 0.7, fontSize: "0.75em" }}>
            assets/photos/{PHOTOS[photo].file}.jpg
          </div>
        </div>
      ) : null}
    </div>
  );
};

/**
 * A photo filling a w×h box (cover), zoomed around its focus point.
 * `children` render inside the image box (same transform) — e.g. a blurred overlay.
 */
export const Photo: React.FC<{
  photo: PhotoKey;
  w: number;
  h: number;
  scale?: number;
  focus?: [number, number];
  dx?: number;
  dy?: number;
  filter?: string;
  style?: React.CSSProperties;
  children?: (c: Cover, info: PhotoInfo) => React.ReactNode;
}> = ({ photo, w, h, scale = 1, focus, dx = 0, dy = 0, filter, style, children }) => {
  const info = usePhoto(photo);
  const c = cover(info, w, h, focus ?? PHOTOS[photo].focus, scale, dx, dy);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, overflow: "hidden", ...style }}>
      <div
        style={{
          position: "absolute",
          left: c.left,
          top: c.top,
          width: c.bw,
          height: c.bh,
          transformOrigin: `${c.fx * c.bw}px ${c.fy * c.bh}px`,
          transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
          filter: info ? photoGrade(filter) : filter,
        }}
      >
        {info ? (
          <Img src={info.src} style={{ display: "block", width: c.bw, height: c.bh }} />
        ) : (
          <Placeholder photo={photo} w={c.bw} h={c.bh} />
        )}
        {children ? children(c, info) : null}
      </div>
    </div>
  );
};

/** The Fadzaev photo with the man next to me blurred by `amount` (1 = fully hidden, 0 = sharp). */
export const MysteryLayer: React.FC<{ c: Cover; info: PhotoInfo; amount: number; darken?: number }> = ({ c, info, amount, darken = 1 }) => {
  const m = PHOTOS.fadzaev.mystery;
  if (!info || (amount < 0.01 && darken > 0.995)) return null;
  const mask = `linear-gradient(to right, #000 ${m.from * 100}%, transparent ${m.to * 100}%)`;
  return (
    <Img
      src={info.src}
      style={{
        position: "absolute",
        inset: 0,
        width: c.bw,
        height: c.bh,
        filter: `blur(${(LOOK.mysteryBlur * amount * c.bw) / 1920}px) brightness(${darken})`,
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
};
