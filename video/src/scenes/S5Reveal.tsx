import React from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE, PHOTOS, TEXT } from "../config";
import { usePhoto } from "../lib/assets";
import { ease, lerp, prog } from "../lib/timeline";
import { Annotation, Flash, Iris, LightSweep, Panels, Sfx } from "../motion/Graphics";
import { cover, MysteryLayer, Photo } from "../motion/Photo";
import { Letters, shadow, type, Words } from "../motion/Text";
import { s, Shade, useScene } from "./common";

const T = {
  open: 0.0,
  dashed: 0.9,
  lines: [1.0, 1.65],
  riser: 1.2,
  happiest: 2.45,
  unblur: [2.7, 4.2, 5.9],
  sweep: 3.4,
  end: 3.2,
  textOut: 5.5,
  circle: 6.1,
  bars: 6.7,
  name: 6.95,
  title: 7.45,
  nameOut: 9.9,
  cover: 10.3,
};

export const S5Reveal: React.FC = () => {
  const { frame, W, H } = useScene();
  const info = usePhoto("fadzaev");
  const m = PHOTOS.fadzaev.mystery;

  const scale = lerp(1.06, 1.16, prog(frame, 0, s(10.8), ease.camera));
  const focus: [number, number] = [0.53, 0.37];
  const c = cover(info, W, H, focus, scale);
  const [hx, hy] = c.map(m.face[0], m.face[1]);

  // silhouette → face → fully revealed
  const a = prog(frame, s(T.unblur[0]), s(T.unblur[1] - T.unblur[0]), ease.inOut);
  const b = prog(frame, s(T.unblur[1]), s(T.unblur[2] - T.unblur[1]), ease.inOut);
  const amount = (1 - 0.5 * a) * (1 - b);
  const darken = 0.78 + 0.12 * a + 0.1 * b;

  const bars = prog(frame, s(T.bars), s(0.5), ease.expoOut);
  const barsOut = prog(frame, s(T.nameOut), s(0.35), ease.expoIn);

  return (
    <AbsoluteFill style={{ background: PALETTE.ink }}>
      <Iris start={s(T.open)} duration={s(0.9)} cx={W / 2} cy={H / 2} mode="open">
        <Photo photo="fadzaev" w={W} h={H} scale={scale} focus={focus}>
          {(cc, inf) => <MysteryLayer c={cc} info={inf} amount={amount} darken={darken} />}
        </Photo>
        <LightSweep start={s(T.sweep)} duration={s(1.4)} strength={0.6} />
        <Shade side="bottom" strength={0.9} opacity={1 - prog(frame, s(T.textOut), s(0.6)) * 0.6} />
      </Iris>

      <Annotation cx={hx} cy={hy} r={150 * scale} start={s(T.dashed)} dashed color="#ffffff" width={5} out={s(T.unblur[0])} />
      <Annotation cx={hx} cy={hy} r={150 * scale} start={s(T.circle)} duration={18} width={8} out={s(T.nameOut)} />

      <div style={{ position: "absolute", left: 110, bottom: 120, color: PALETTE.white, textShadow: shadow }}>
        <Words text={TEXT.reveal.lines[0]} start={s(T.lines[0])} out={s(T.textOut)} style={{ ...type.light, fontSize: 76 }} />
        <Words text={TEXT.reveal.lines[1]} start={s(T.lines[1])} out={s(T.textOut)} style={{ ...type.light, fontSize: 76 }} />
        <Letters
          text={TEXT.reveal.happiest}
          start={s(T.happiest)}
          out={s(T.textOut)}
          style={{ ...type.hero, fontSize: 210, color: PALETTE.yellow, textShadow: `0 0 60px rgba(255,198,26,0.45), ${shadow}`, margin: "4px 0" }}
        />
        <Words text={TEXT.reveal.end} start={s(T.end)} out={s(T.textOut)} style={{ ...type.light, fontSize: 76 }} />
      </div>

      {/* name card */}
      {frame >= s(T.bars) ? (
        <div style={{ position: "absolute", left: 0, top: H - 340, transform: `translateX(${-barsOut * 1200}px)` }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 980 * bars, height: 118, background: PALETTE.red }} />
          <div style={{ position: "absolute", left: 0, top: 118, width: 860 * prog(frame, s(T.bars + 0.12), s(0.5), ease.expoOut), height: 66, background: PALETTE.blue }} />
          <div style={{ position: "absolute", left: 110, top: 8, color: PALETTE.white }}>
            <Letters text={TEXT.reveal.name} start={s(T.name)} stagger={1.2} style={{ ...type.hero, fontSize: 100 }} />
          </div>
          <div style={{ position: "absolute", left: 112, top: 126, width: 900, color: PALETTE.white }}>
            <Words text={TEXT.reveal.title} start={s(T.title)} stagger={2} style={{ ...type.body, fontSize: 44, whiteSpace: "nowrap" }} />
          </div>
        </div>
      ) : null}

      <Flash at={s(T.happiest)} strength={0.35} color={PALETTE.yellow} />
      <Panels start={s(T.cover)} phase="cover" />

      <Sfx at={s(T.open)} name="whoosh" />
      <Sfx at={s(T.dashed)} name="draw" volume={0.4} />
      <Sfx at={s(T.lines[0])} name="pop" volume={0.6} />
      <Sfx at={s(T.lines[1])} name="pop2" volume={0.6} />
      <Sfx at={s(T.riser)} name="riser" volume={0.8} />
      <Sfx at={s(T.happiest)} name="sparkle" />
      <Sfx at={s(T.end)} name="pop3" volume={0.6} />
      <Sfx at={s(T.circle)} name="draw" />
      <Sfx at={s(T.bars)} name="whoosh" volume={0.7} />
      <Sfx at={s(T.title)} name="pop" volume={0.6} />
      <Sfx at={s(T.cover)} name="whooshFast" />
    </AbsoluteFill>
  );
};
