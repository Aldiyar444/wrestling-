import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { PALETTE, PhotoKey, TEXT } from "../config";
import { usePhoto } from "../lib/assets";
import { clamp, ease, lerp, prog } from "../lib/timeline";
import { Flash, Sfx } from "../motion/Graphics";
import { Photo } from "../motion/Photo";
import { shadow, Slot, type } from "../motion/Text";
import { s, Shade, useScene, useShake } from "./common";

const T = {
  here: 0.25,
  learned: 0.6,
  win: 0.9,
  lose: 3.1,
  knew: 5.55,
  fight: 6.1,
  and: 8.6,
  had: 8.75,
  idols: 9.35,
  textOut: 10.8,
  grow: 10.9,
  flip: 11.55,
};

const PERSPECTIVE = 1000;
const GAP = 2000;
/** Main cards: one per phrase, in order. */
const CARDS: { photo: PhotoKey; x: number; hold: [number, number] }[] = [
  { photo: "competition", x: 300, hold: [0.45, 2.85] },
  { photo: "youth", x: 420, hold: [3.15, 5.3] },
  { photo: "medal", x: 330, hold: [5.6, 8.25] },
  { photo: "idols", x: 400, hold: [8.55, 10.9] },
];
/** Earlier memories drifting past at the sides. */
const DECOR: { photo: PhotoKey; x: number; y: number; z: number; rot: number }[] = [
  { photo: "age12", x: -1250, y: -260, z: 1.5, rot: 30 },
  { photo: "training1", x: 1500, y: 300, z: 2.4, rot: -32 },
  { photo: "training2", x: -1350, y: 320, z: 3.3, rot: 28 },
  { photo: "age12", x: 1450, y: -300, z: 4.4, rot: -30 },
];
const HOLD_Z = -260;
const CARD_H = 600;

const Card: React.FC<{ photo: PhotoKey; h: number; style: React.CSSProperties }> = ({ photo, h, style }) => {
  const info = usePhoto(photo);
  const aspect = info ? Math.min(1.45, info.w / info.h) : 0.75;
  const w = Math.round(h * aspect);
  return (
    <div
      style={{
        position: "absolute",
        left: -w / 2,
        top: -h / 2,
        width: w,
        height: h,
        border: "12px solid #f7f3ea",
        background: "#f7f3ea",
        boxShadow: "0 40px 90px rgba(0,0,0,0.55)",
        ...style,
      }}
    >
      <div style={{ position: "relative", width: w - 24, height: h - 24, overflow: "hidden" }}>
        <Photo photo={photo} w={w - 24} h={h - 24} />
      </div>
    </div>
  );
};

export const S3Path: React.FC = () => {
  const { frame, W, H } = useScene();

  // camera travel along the corridor: glide between cards, slow drift while holding one
  const keys: [number, number][] = [[0, 0]];
  const xKeys: [number, number][] = [[0, CARDS[0].x * 0.6]];
  CARDS.forEach((c, i) => {
    const zHold = (i + 1) * GAP + HOLD_Z;
    keys.push([s(c.hold[0]), zHold], [s(c.hold[1]), zHold + 70]);
    xKeys.push([s(c.hold[0]), c.x], [s(c.hold[1]), c.x]);
  });
  const travel = interpolate(
    frame,
    keys.map((k) => k[0]),
    keys.map((k) => k[1]),
    { ...clamp, easing: ease.inOut },
  );
  const camX = interpolate(
    frame,
    xKeys.map((k) => k[0]),
    xKeys.map((k) => k[1]),
    { ...clamp, easing: ease.inOut },
  );

  const shake = useShake([
    [s(T.fight), 1.3],
    [s(T.here), 0.4],
  ]);

  const grow = prog(frame, s(T.grow), s(0.6), ease.expoOut);
  const flip = prog(frame, s(T.flip), s(0.75), ease.inOut);
  const textOut = s(T.textOut);

  // the final card grows from its spot in the corridor to full screen, then flips to "today"
  const last = CARDS[CARDS.length - 1];
  const lastInfo = usePhoto(last.photo);
  const lastAspect = lastInfo ? Math.min(1.45, lastInfo.w / lastInfo.h) : 1.33;
  const k = PERSPECTIVE / (PERSPECTIVE - (HOLD_Z - 70));
  const cardW = lerp(CARD_H * lastAspect * k, W, grow);
  const cardH = lerp(CARD_H * k, H, grow);
  const cardX = lerp(W / 2 + (last.x - camX) * k, W / 2, grow);
  const cardY = H / 2;

  return (
    <AbsoluteFill style={{ background: PALETTE.ink, overflow: "hidden" }}>
      {/* the corridor */}
      {frame < s(T.grow) ? (
        <AbsoluteFill style={{ perspective: PERSPECTIVE, transform: shake }}>
          <div style={{ position: "absolute", left: W / 2, top: H / 2, transformStyle: "preserve-3d" }}>
            {DECOR.map((d, i) => {
              const z = -d.z * GAP + travel;
              if (z > PERSPECTIVE * 0.8 || z < -GAP * 3) return null;
              return (
                <Card
                  key={`d${i}`}
                  photo={d.photo}
                  h={420}
                  style={{
                    transform: `translate3d(${d.x - camX}px, ${d.y}px, ${z}px) rotateY(${d.rot}deg)`,
                    opacity: 0.5 * prog(z, -GAP * 3, GAP),
                    filter: "brightness(0.7)",
                  }}
                />
              );
            })}
            {CARDS.map((c, i) => {
              const z = -(i + 1) * GAP + travel;
              if (z > PERSPECTIVE * 0.85 || z < -GAP * 3.2) return null;
              const facing = Math.min(1, Math.max(0, 1 - Math.abs(z - HOLD_Z) / 900));
              return (
                <Card
                  key={i}
                  photo={c.photo}
                  h={CARD_H}
                  style={{
                    transform: `translate3d(${c.x - camX}px, 0px, ${z}px) rotateY(${(1 - facing) * (i % 2 ? 24 : -24)}deg)`,
                    opacity: prog(z, -GAP * 3.2, GAP * 1.2),
                  }}
                />
              );
            })}
          </div>
        </AbsoluteFill>
      ) : null}

      {/* final card → full screen → flip to the present */}
      {frame >= s(T.grow) ? (
        <AbsoluteFill style={{ perspective: 1600 }}>
          <div
            style={{
              position: "absolute",
              left: cardX - cardW / 2,
              top: cardY - cardH / 2,
              width: cardW,
              height: cardH,
              transformStyle: "preserve-3d",
              transform: `rotateY(${flip * 180}deg) scale(${1 - Math.sin(flip * Math.PI) * 0.18})`,
            }}
          >
            <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", border: `${12 * (1 - grow)}px solid #f7f3ea`, overflow: "hidden" }}>
              <Photo photo={last.photo} w={cardW - 24 * (1 - grow)} h={cardH - 24 * (1 - grow)} />
            </div>
            <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", overflow: "hidden" }}>
              <Photo photo="age24" w={cardW} h={cardH} />
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      <Shade side="left" strength={0.85} opacity={1 - prog(frame, textOut, 12)} />

      {/* anaphora: «ЗДЕСЬ» stays, the rest changes */}
      <AbsoluteFill style={{ color: PALETTE.white, textShadow: shadow }}>
        {frame >= s(T.here) && frame < textOut + 14 ? (
          <div style={{ position: "absolute", left: 110, top: 190, opacity: 1 - prog(frame, textOut, 12) }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                ...type.hero,
                fontSize: 250,
                color: PALETTE.yellow,
                opacity: prog(frame, s(T.and), s(0.3)),
                transform: `translateX(${(1 - prog(frame, s(T.and), s(0.5), ease.expoOut)) * -200}px)`,
              }}
            >
              {TEXT.path.and}
            </div>
            <div
              style={{
                ...type.hero,
                fontSize: 250,
                color: "transparent",
                WebkitTextStroke: `${5 * (1 - prog(frame, s(T.here + 0.6), s(0.2)))}px #fff`,
                transform: `translateX(${prog(frame, s(T.and), s(0.5), ease.expoOut) * 175}px) scale(${1.4 - 0.4 * prog(frame, s(T.here), s(0.45), ease.expoOut)})`,
                transformOrigin: "left center",
                opacity: prog(frame, s(T.here), s(0.15)),
                position: "relative",
              }}
            >
              {TEXT.path.here}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  color: PALETTE.white,
                  WebkitTextStroke: "0px",
                  clipPath: `inset(${(1 - prog(frame, s(T.here + 0.15), s(0.5), ease.out)) * 100}% 0 0 0)`,
                }}
              >
                {TEXT.path.here}
              </div>
            </div>
          </div>
        ) : null}
        <div style={{ position: "absolute", left: 120, top: 470 }}>
          <Slot
            items={[TEXT.path.learned, TEXT.path.knew, TEXT.path.had]}
            times={[s(T.learned), s(T.knew), s(T.had)]}
            out={textOut}
            style={{ ...type.light, fontSize: 82, width: 1200 }}
          />
        </div>
        <div style={{ position: "absolute", left: 114, top: 575 }}>
          <Slot
            items={[TEXT.path.win, TEXT.path.lose, TEXT.path.fight, TEXT.path.idols]}
            times={[s(T.win), s(T.lose), s(T.fight), s(T.idols)]}
            out={textOut}
            lineHeight={1.08}
            style={{ ...type.hero, fontSize: 170, width: 1800 }}
            itemStyle={(i) => ({ color: i === 2 || i === 3 ? PALETTE.yellow : PALETTE.white })}
          />
        </div>
      </AbsoluteFill>

      <Flash at={s(T.fight)} strength={0.45} />
      <Flash at={s(T.idols)} strength={0.3} color={PALETTE.yellow} />

      <Sfx at={s(T.here)} name="hit" />
      <Sfx at={s(T.learned)} name="pop" volume={0.6} />
      <Sfx at={s(T.win)} name="pop3" />
      {CARDS.slice(1).map((c, i) => (
        <Sfx key={i} at={s(CARDS[i].hold[1])} name="whoosh" volume={0.8} />
      ))}
      <Sfx at={s(T.lose)} name="pop2" />
      <Sfx at={s(T.knew)} name="pop" volume={0.6} />
      <Sfx at={s(T.fight)} name="boom" />
      <Sfx at={s(T.and)} name="hit" volume={0.6} />
      <Sfx at={s(T.idols)} name="sparkle" />
      <Sfx at={s(T.grow)} name="whooshFast" />
      <Sfx at={s(T.flip)} name="flip" />
    </AbsoluteFill>
  );
};
