import React from "react";
import { AbsoluteFill, Img } from "remotion";
import { PALETTE, PHOTOS, TEXT } from "../config";
import { usePhoto } from "../lib/assets";
import { ease, lerp, prog } from "../lib/timeline";
import { Sfx, Shockwave, Strips } from "../motion/Graphics";
import { cover, Photo, photoGrade } from "../motion/Photo";
import { shadow, Slam, type, Words } from "../motion/Text";
import { BIG_AGE } from "./S1Mystery";
import { s, Shade, useScene, useShake } from "./common";

const T = {
  fill: 0.05,
  zoom: 0.75,
  tag: 1.55,
  firstTime: [1.9, 2.5],
  firstOut: 4.0,
  strips1: 4.2,
  didntKnow: 4.6,
  matBecame: 5.3,
  midOut: 6.5,
  strips2: 6.6,
  parts: [6.9, 7.5],
  myself: 8.2,
  out: 9.5,
  swing: 9.6,
};

/** Two digits laid out exactly like the odometer, so the hand-off from scene 1 is seamless. */
const Digits: React.FC<{ text: string; style: React.CSSProperties }> = ({ text, style }) => (
  <div style={{ display: "flex", lineHeight: 1, ...style }}>
    {[...text].map((d, i) => (
      <div key={i} style={{ height: "1em", width: "0.58em", textAlign: "center" }}>
        {d}
      </div>
    ))}
  </div>
);

/** The photo seen through the digits; `zoom` scales the digits while the photo stays put. */
const Knockout: React.FC<{ zoom: number; ox: number; oy: number }> = ({ zoom, ox, oy }) => {
  const { W, H } = useScene();
  const info = usePhoto("age12");
  if (!info) return null;
  const c = cover(info, W, H, PHOTOS.age12.focus);
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: `${ox}px ${oy}px`,
        // background-clip:text needs a CSS background; the hidden <Img> below makes Remotion wait for it
        // eslint-disable-next-line @remotion/no-background-image
        backgroundImage: `url(${info.src})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${c.bw / zoom}px ${c.bh / zoom}px`,
        backgroundPosition: `${(c.left - ox) / zoom + ox}px ${(c.top - oy) / zoom + oy}px`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        alignItems: "center",
        justifyContent: "center",
        filter: photoGrade(),
      }}
    >
      <Img src={info.src} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
      <Digits text={String(TEXT.age12.age)} style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: BIG_AGE }} />
    </AbsoluteFill>
  );
};

export const S2Age12: React.FC = () => {
  const { frame, W, H } = useScene();

  const fillP = prog(frame, s(T.fill), s(0.65), ease.inOut);
  const zoomP = prog(frame, s(T.zoom), s(0.75), ease.expoIn);
  const zoom = 1 + zoomP * zoomP * 70;
  // centre of the "1" stem
  const ox = W / 2 - 0.29 * BIG_AGE + 6;
  const oy = H / 2 + 0.04 * BIG_AGE;
  const photoIn = prog(frame, s(T.zoom + 0.45), s(0.3));

  const swing = prog(frame, s(T.swing), s(1.0), ease.expoIn);
  const shake = useShake([[s(T.myself), 1.0]]);

  const kb = (start: number, end: number, a: number, b: number) => lerp(a, b, prog(frame, s(start), s(end - start), ease.camera));

  return (
    <AbsoluteFill style={{ background: PALETTE.ink, perspective: 1400, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transformOrigin: "left center",
          transform: `${shake} rotateY(${swing * 82}deg) translateZ(${-swing * 300}px)`,
          opacity: 1 - prog(frame, s(T.swing + 0.7), s(0.3)),
        }}
      >
        {/* the hall at 12 */}
        <AbsoluteFill style={{ opacity: photoIn }}>
          <Photo photo="age12" w={W} h={H} scale={kb(T.zoom, T.strips1 + 0.6, 1.0, 1.1)} />
          <Shade side="left" strength={0.85} />
        </AbsoluteFill>

        {/* training, revealed in strips */}
        <Strips start={s(T.strips1)} n={6}>
          <Photo photo="training1" w={W} h={H} scale={kb(T.strips1, T.strips2 + 0.6, 1.12, 1.0)} />
          <Shade side="bottom" strength={0.85} />
        </Strips>
        <Strips start={s(T.strips2)} n={8} stagger={1.5}>
          <Photo photo="training2" w={W} h={H} scale={kb(T.strips2, T.swing + 1, 1.0, 1.1)} />
          <Shade side="full" strength={0.6} />
        </Strips>

        {/* «Мне 12.» tag */}
        {frame >= s(T.tag) && frame < s(T.strips1) ? (
          <div
            style={{
              position: "absolute",
              left: 110,
              top: 90,
              display: "flex",
              alignItems: "center",
              gap: 18,
              color: PALETTE.white,
              transform: `translateX(${(1 - prog(frame, s(T.tag), s(0.5), ease.expoOut)) * -300}px)`,
            }}
          >
            <div style={{ width: 10, height: 74, background: PALETTE.yellow }} />
            <span style={{ ...type.display, fontSize: 64 }}>{TEXT.age12.agePrefix}</span>
            <span style={{ ...type.hero, fontSize: 84, color: PALETTE.yellow }}>{TEXT.age12.age}</span>
          </div>
        ) : null}

        <div style={{ position: "absolute", left: 110, bottom: 140, width: 1100, color: PALETTE.white, textShadow: shadow }}>
          <Words text={TEXT.age12.firstTime[0]} start={s(T.firstTime[0])} out={s(T.firstOut)} style={{ ...type.light, fontSize: 84 }} />
          <Words text={TEXT.age12.firstTime[1]} start={s(T.firstTime[1])} out={s(T.firstOut)} marker style={{ ...type.display, fontSize: 104 }} />
        </div>

        <div style={{ position: "absolute", left: 110, bottom: 140, width: 1400, color: PALETTE.white, textShadow: shadow }}>
          <Words text={TEXT.age12.didntKnow} start={s(T.didntKnow)} out={s(T.midOut)} style={{ ...type.light, fontSize: 80 }} />
          <Words text={TEXT.age12.matBecame} start={s(T.matBecame)} out={s(T.midOut)} marker style={{ ...type.display, fontSize: 96 }} />
        </div>

        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: PALETTE.white, textShadow: shadow, textAlign: "center" }}>
          <Words text={TEXT.age12.parts[0]} start={s(T.parts[0])} mode="pop" out={s(T.out)} style={{ ...type.light, fontSize: 92 }} />
          <Words text={TEXT.age12.parts[1]} start={s(T.parts[1])} mode="pop" out={s(T.out)} style={{ ...type.light, fontSize: 92 }} />
          <Slam start={s(T.myself)} out={s(T.out)} style={{ ...type.hero, fontSize: 200, color: PALETTE.yellow, marginTop: 10 }}>
            {TEXT.age12.myself}
          </Slam>
        </AbsoluteFill>
        <Shockwave cx={W / 2} cy={H / 2 + 150} start={s(T.myself)} maxR={1100} />
      </AbsoluteFill>

      {/* the 12 from scene 1: solid yellow, then filled with the photo, then we fly through it */}
      {zoomP < 1 ? (
        <AbsoluteFill style={{ opacity: 1 - photoIn }}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: PALETTE.yellow, opacity: 1 - fillP }}>
            <Digits text={String(TEXT.age12.age)} style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: BIG_AGE }} />
          </AbsoluteFill>
          <AbsoluteFill style={{ clipPath: `inset(${(1 - fillP) * 100}% 0 0 0)` }}>
            <Knockout zoom={zoom} ox={ox} oy={oy} />
          </AbsoluteFill>
        </AbsoluteFill>
      ) : null}

      <Sfx at={s(T.fill)} name="riser" volume={0.5} />
      <Sfx at={s(T.zoom + 0.3)} name="whooshFast" />
      <Sfx at={s(T.tag)} name="pop" />
      <Sfx at={s(T.firstTime[0])} name="pop2" volume={0.6} />
      <Sfx at={s(T.firstTime[1])} name="pop3" volume={0.6} />
      <Sfx at={s(T.strips1)} name="whoosh" />
      <Sfx at={s(T.didntKnow)} name="pop" volume={0.6} />
      <Sfx at={s(T.matBecame)} name="pop2" volume={0.6} />
      <Sfx at={s(T.strips2)} name="whoosh" />
      <Sfx at={s(T.parts[0])} name="pop3" volume={0.7} />
      <Sfx at={s(T.parts[1])} name="pop" volume={0.7} />
      <Sfx at={s(T.myself)} name="boom" />
      <Sfx at={s(T.swing)} name="whoosh" />
    </AbsoluteFill>
  );
};
