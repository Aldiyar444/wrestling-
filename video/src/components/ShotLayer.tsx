import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { LOOK, PhotoDef, PHOTOS, Scene, Shot } from "../config";
import { usePhoto } from "../lib/assets";
import { gradeFilter, regionFor, useLayout } from "../lib/layout";
import { easeCamera, easeInOut, easeOut, progress, sec } from "../lib/timeline";
import { Placeholder } from "./Placeholder";

const between = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const WIPE_DIR = { right: "to right", left: "to left", up: "to top", down: "to bottom" } as const;

/**
 * One photo on screen: framed, graded, slowly moving (zoom / pan / push-in),
 * with its own entrance and — for the Fadzaev photo — the selective blur.
 * `from`/`to` are frames relative to the scene.
 */
export const ShotLayer: React.FC<{
  shot: Shot;
  from: number;
  to: number;
  unblur?: Scene["unblur"];
  id: string;
}> = ({ shot, from, to, unblur, id }) => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const info = usePhoto(shot.photo);
  const def: PhotoDef = PHOTOS[shot.photo];

  const framing = shot.framing ?? "full";
  const region = regionFor(framing, L);
  const tone = shot.tone ?? "neutral";

  // Camera move over the whole life of the shot.
  const p = progress(frame, from, Math.max(1, to - from), easeCamera);

  // Entrance.
  const type = shot.reveal ?? "fade";
  const revealLen = sec(shot.revealDuration ?? LOOK.transitions[type]);
  const r = progress(frame, from, revealLen);

  // Cover-fit box, positioned so the focus point sits as central as the crop allows.
  const iw = info?.w ?? region.w;
  const ih = info?.h ?? region.h;
  const s0 = Math.max(region.w / iw, region.h / ih);
  const bw = iw * s0;
  const bh = ih * s0;
  const [fx, fy] = shot.focus ?? [0.5, 0.5];
  const left = between(region.w / 2 - fx * bw, region.w - bw, 0);
  const top = between(region.h / 2 - fy * bh, region.h - bh, 0);

  const [z0, z1] = shot.zoom ?? [1.02, 1.08];
  let scale = z0 + (z1 - z0) * p;
  const [px, py] = shot.pan ?? [0, 0];
  let tx = (px / 100) * region.w * p;
  const ty = (py / 100) * region.h * p;

  let opacity = 1;
  let blur = 0;
  let brightness = 1;
  let displace = 0;
  let streak = 0;
  let wipeMask: string | undefined;

  if (type === "fade") {
    opacity = easeInOut(r);
    blur = (1 - easeOut(r)) * LOOK.blur.focusIn * L.u;
  } else if (type === "snap") {
    const e = easeOut(r);
    scale *= LOOK.zoom.snapFrom + (1 - LOOK.zoom.snapFrom) * e;
    blur = (1 - e) * LOOK.blur.focusIn * 1.2 * L.u;
    brightness = 1 + 0.55 * (1 - e) ** 2;
    displace = (1 - e) * 36 * L.u;
  } else if (type === "wipe") {
    const e = easeInOut(r);
    const soft = 16;
    const pos = e * (100 + soft);
    if (r < 1) {
      wipeMask = `linear-gradient(${WIPE_DIR[shot.direction ?? "right"]}, #000 ${pos - soft}%, transparent ${pos}%)`;
    }
    scale *= 1 + 0.05 * (1 - easeOut(r));
  } else if (type === "whip") {
    const travel = L.W * 0.35 * (shot.direction === "right" ? -1 : 1);
    const e = easeOut(r);
    const eNext = easeOut(progress(frame + 1, from, revealLen));
    tx += (1 - e) * travel;
    streak = Math.abs(eNext - e) * Math.abs(travel) * 0.45;
    opacity = Math.min(1, r * 5);
  }

  // Selective blur on the person next to me (until the reveal).
  let mystery: React.ReactNode = null;
  if (shot.mystery && def.mystery && info) {
    let amount = 1;
    let dark = LOOK.blur.mysteryDarken;
    if (unblur) {
      const a = progress(frame, sec(unblur.start), sec(unblur.face - unblur.start), easeInOut);
      const b = progress(frame, sec(unblur.face), sec(unblur.end - unblur.face), easeInOut);
      // silhouette appears, then the face sharpens, then fully revealed
      amount = (1 - 0.45 * a) * (1 - b);
      dark = LOOK.blur.mysteryDarken + (0.88 - LOOK.blur.mysteryDarken) * a + 0.12 * b;
    }
    if (amount > 0.005 || dark < 0.995) {
      const m = `linear-gradient(to right, #000 ${def.mystery.from * 100}%, transparent ${def.mystery.to * 100}%)`;
      mystery = (
        <Img
          src={info.src}
          style={{
            position: "absolute",
            inset: 0,
            width: bw,
            height: bh,
            filter: `blur(${LOOK.blur.mystery * L.u * amount}px) brightness(${dark})`,
            maskImage: m,
            WebkitMaskImage: m,
          }}
        />
      );
    }
  }

  const fxId = `fx-${id}`;
  const useSvg = displace > 0.3 || streak > 0.3;
  const filter = [
    useSvg ? `url(#${fxId})` : "",
    gradeFilter(tone),
    blur > 0.05 ? `blur(${blur}px)` : "",
    brightness !== 1 ? `brightness(${brightness})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AbsoluteFill style={{ opacity }}>
      {useSvg ? (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <defs>
            <filter id={fxId} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.006 0.02" numOctaves={2} seed={7} result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale={displace} xChannelSelector="R" yChannelSelector="G" result="d" />
              <feGaussianBlur in="d" stdDeviation={`${streak} 0`} />
            </filter>
          </defs>
        </svg>
      ) : null}

      {shot.parallax && info ? (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Img
            src={info.src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `translateX(${-tx * 0.35}px) scale(${LOOK.zoom.parallaxBackground + 0.03 * p})`,
              filter: `${gradeFilter(tone)} blur(${44 * L.u}px) brightness(0.32)`,
            }}
          />
        </AbsoluteFill>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: region.x,
          top: region.y,
          width: region.w,
          height: region.h,
          maskImage: region.mask,
          WebkitMaskImage: region.mask,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            maskImage: wipeMask,
            WebkitMaskImage: wipeMask,
          }}
        >
          <div
            style={{
              position: "absolute",
              left,
              top,
              width: bw,
              height: bh,
              transformOrigin: `${fx * bw}px ${fy * bh}px`,
              transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
              filter,
            }}
          >
            {info ? (
              <Img src={info.src} style={{ display: "block", width: bw, height: bh }} />
            ) : (
              <Placeholder photo={shot.photo} w={bw} h={bh} u={L.u} />
            )}
            {mystery}
          </div>
        </div>
      </div>

      {framing === "full" ? (
        <AbsoluteFill
          style={{
            background: L.portrait
              ? "linear-gradient(to bottom, transparent 38%, rgba(0,0,0,0.86) 100%)"
              : "linear-gradient(to bottom, transparent 42%, rgba(0,0,0,0.74) 100%), linear-gradient(to right, rgba(0,0,0,0.35) 0%, transparent 55%)",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
