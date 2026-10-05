import React from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE, PhotoKey, TEXT } from "../config";
import { ease, lerp, prog } from "../lib/timeline";
import { Panels, Sfx } from "../motion/Graphics";
import { Photo } from "../motion/Photo";
import { Odometer, shadow, Slam, type, Words } from "../motion/Text";
import { s, Shade, useScene, useShake } from "./common";

const T = {
  uncover: 0,
  so: 0.5,
  worlds: 0.75,
  year: 1.2,
  yearWord: 2.05,
  where: 2.4,
  out1: 3.9,
  expand: 3.95,
  more: [4.45, 4.75, 5.35],
  tournament: 5.85,
  out2: 7.15,
  cover: 7.3,
};

const COLUMNS: PhotoKey[] = ["astana", "arena", "crowd"];

export const S6Worlds: React.FC = () => {
  const { frame, W, H } = useScene();
  const e = prog(frame, s(T.expand), s(0.6), ease.expoOut);
  const grow = lerp(1, 1.35, prog(frame, s(T.more[1]), s(2.2), ease.out));
  const shake = useShake([
    [s(T.where), 0.7],
    [s(T.more[1]), 0.6],
  ]);

  const third = W / 3;
  const cols = [
    { x: -e * third, w: third },
    { x: third * (1 - e), w: third + 2 * third * e },
    { x: 2 * third + e * third, w: third },
  ];

  return (
    <AbsoluteFill style={{ background: PALETTE.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: shake }}>
        {COLUMNS.map((photo, i) => {
          const inP = prog(frame, s(0.05 + i * 0.08), s(0.7), ease.expoOut);
          const col = cols[i];
          if (col.w < 1 || col.x > W) return null;
          return (
            <div
              key={photo}
              style={{
                position: "absolute",
                left: col.x,
                top: 0,
                width: col.w,
                height: H,
                overflow: "hidden",
                transform: `translateY(${(1 - inP) * (i % 2 ? 1 : -1) * H}px)`,
                borderRight: i < 2 && e < 1 ? `6px solid ${PALETTE.ink}` : undefined,
              }}
            >
              <Photo photo={photo} w={col.w} h={H} scale={lerp(1.12, 1.02, prog(frame, 0, s(7.8), ease.camera))} />
            </div>
          );
        })}
        <Shade side="full" strength={0.95} />

        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: PALETTE.white, textShadow: shadow, textAlign: "center" }}>
          {frame < s(T.out1 + 0.4) ? (
            <div style={{ opacity: 1 - prog(frame, s(T.out1), s(0.3)), transform: `scale(${1 + prog(frame, s(T.out1), s(0.3), ease.in) * 0.15})` }}>
              <Words text={TEXT.worlds.so} start={s(T.so)} style={{ ...type.light, fontSize: 70 }} />
              <Words text={TEXT.worlds.worlds} start={s(T.worlds)} style={{ ...type.display, fontSize: 124 }} />
              {frame >= s(T.year) ? (
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 30 }}>
                  <Odometer from={0} to={TEXT.worlds.year} start={s(T.year)} duration={s(0.85)} digits={4} easing={ease.out} style={{ ...type.hero, fontSize: 250, color: PALETTE.yellow }} />
                  <Words text={TEXT.worlds.yearWord} start={s(T.yearWord)} style={{ ...type.light, fontSize: 92 }} />
                </div>
              ) : (
                <div style={{ height: 250 }} />
              )}
              <Slam start={s(T.where)} from={2} style={{ ...type.display, fontSize: 124 }}>
                {TEXT.worlds.where.split(/(КАЗАХСТАНЕ)/).map((p, i) => (
                  <span key={i} style={{ color: p === "КАЗАХСТАНЕ" ? PALETTE.yellow : undefined }}>
                    {p}
                  </span>
                ))}
              </Slam>
            </div>
          ) : null}
        </AbsoluteFill>

        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: PALETTE.white, textShadow: shadow, textAlign: "center" }}>
          <Words text={TEXT.worlds.more[0]} start={s(T.more[0])} out={s(T.out2)} style={{ ...type.light, fontSize: 90 }} />
          <div style={{ transform: `scale(${grow})` }}>
            <Slam start={s(T.more[1])} out={s(T.out2)} style={{ ...type.hero, fontSize: 210, color: PALETTE.yellow }}>
              {TEXT.worlds.more[1]}
            </Slam>
          </div>
          <Words text={TEXT.worlds.more[2]} start={s(T.more[2])} out={s(T.out2)} style={{ ...type.light, fontSize: 90 }} />
          <Words text={TEXT.worlds.tournament} start={s(T.tournament)} out={s(T.out2)} style={{ ...type.display, fontSize: 100, marginTop: 8 }} />
        </AbsoluteFill>
      </AbsoluteFill>

      <Panels start={s(T.uncover)} phase="uncover" />
      <Panels start={s(T.cover)} phase="cover" colors={[PALETTE.yellow, PALETTE.red, PALETTE.ink]} duration={9} />

      <Sfx at={s(T.so)} name="pop" volume={0.6} />
      <Sfx at={s(T.worlds)} name="pop2" volume={0.7} />
      <Sfx at={s(T.year)} name="whooshFast" volume={0.7} />
      <Sfx at={s(T.year + 0.8)} name="hit" volume={0.7} />
      <Sfx at={s(T.where)} name="boom" />
      <Sfx at={s(T.expand)} name="whoosh" />
      <Sfx at={s(T.more[1])} name="hit" />
      <Sfx at={s(T.more[2])} name="pop" volume={0.6} />
      <Sfx at={s(T.tournament)} name="pop3" volume={0.7} />
      <Sfx at={s(T.cover)} name="whooshFast" />
    </AbsoluteFill>
  );
};
