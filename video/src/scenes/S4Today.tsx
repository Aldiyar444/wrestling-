import React from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE, TEXT } from "../config";
import { ease, lerp, prog } from "../lib/timeline";
import { Iris, Mat, Sfx } from "../motion/Graphics";
import { Photo } from "../motion/Photo";
import { Odometer, shadow, Slot, type, Words } from "../motion/Text";
import { OdometerTicks, s, Shade, useScene } from "./common";

const T = {
  prefix: 0.35,
  age: 0.65,
  list: [2.2, 2.75, 3.3, 3.85, 4.45],
  listOut: 5.6,
  away: 5.6,
  noMore: 6.3,
  forget: [8.5, 9.2, 9.85],
  out: 11.2,
  close: 11.55,
};

export const S4Today: React.FC = () => {
  const { frame, W, H } = useScene();

  const away = prog(frame, s(T.away), s(1.2), ease.inOut);
  const matDraw = prog(frame, s(T.away + 0.3), s(1.4), ease.out);
  const recede = prog(frame, s(T.noMore + 0.4), s(2.4), ease.inOut);
  const beat = Math.max(0, Math.sin((frame - s(T.forget[0])) * 0.22)) ** 6 * prog(frame, s(T.forget[0]), s(0.5));
  const ff = frame >= s(T.age) && frame < s(T.age + 1.1);

  return (
    <AbsoluteFill style={{ background: PALETTE.ink }}>
      <Iris start={s(T.close)} duration={s(1.0)} cx={W / 2} cy={H / 2} mode="close">
        <AbsoluteFill style={{ background: PALETTE.ink }}>
          {/* the present day; it pulls back and fades as the mat appears */}
          <AbsoluteFill
            style={{
              transform: `scale(${lerp(1, 0.8, away)})`,
              opacity: 1 - away * 0.85,
              filter: `saturate(${1 - away * 0.8}) blur(${away * 6}px)`,
            }}
          >
            <Photo photo="age24" w={W} h={H} scale={lerp(1.0, 1.07, prog(frame, 0, s(T.away), ease.camera))} />
            <Shade side="left" strength={0.9} />
          </AbsoluteFill>

          <Mat
            cx={W / 2}
            cy={H / 2 + lerp(0, -40, recede)}
            R={lerp(760, 420, recede) * (1 + beat * 0.04)}
            draw={matDraw}
            fill={0}
            field={false}
            lineColor={`rgba(255,198,26,${0.3 + beat * 0.4})`}
          />

          <AbsoluteFill style={{ color: PALETTE.white, textShadow: shadow }}>
            <div style={{ position: "absolute", left: 110, top: 80 }}>
              <Words text={TEXT.today.prefix} start={s(T.prefix)} out={s(T.listOut)} style={{ ...type.light, fontSize: 80 }} />
              {frame >= s(T.age) ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 30,
                    opacity: 1 - prog(frame, s(T.listOut), s(0.3)),
                    transform: `translateY(${(1 - prog(frame, s(T.age), s(0.4), ease.expoOut)) * 80}px)`,
                  }}
                >
                  <Odometer from={12} to={TEXT.today.age} start={s(T.age)} duration={s(1.0)} style={{ ...type.hero, fontSize: 210, color: PALETTE.yellow }} />
                  <div style={{ ...type.label, fontSize: 50, opacity: ff ? (Math.floor(frame / 4) % 2 ? 1 : 0.4) : 0 }}>▶▶</div>
                </div>
              ) : null}
            </div>
            <div style={{ position: "absolute", left: 114, top: 880 }}>
              <Slot
                items={TEXT.today.list}
                times={T.list.map(s)}
                stack
                out={s(T.listOut)}
                lineHeight={1.12}
                style={{ ...type.display, fontSize: 86 }}
                itemStyle={(i) => ({ color: i === TEXT.today.list.length - 1 ? PALETTE.yellow : PALETTE.white })}
              />
            </div>

            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <Words text={TEXT.today.noMore} start={s(T.noMore)} mode="blur" stagger={4} out={s(T.forget[0] - 0.3)} style={{ ...type.light, fontSize: 96 }} />
            </AbsoluteFill>
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <Words text={TEXT.today.forget[0]} start={s(T.forget[0])} mode="blur" out={s(T.out)} style={{ ...type.light, fontSize: 84 }} />
              <Words text={TEXT.today.forget[1]} start={s(T.forget[1])} mode="blur" out={s(T.out)} style={{ ...type.light, fontSize: 84 }} />
              <Words text={TEXT.today.forget[2]} start={s(T.forget[2])} mode="pop" out={s(T.out)} style={{ ...type.hero, fontSize: 150, marginTop: 10 }} />
            </AbsoluteFill>
          </AbsoluteFill>
        </AbsoluteFill>
      </Iris>

      <Sfx at={s(T.prefix)} name="pop" volume={0.6} />
      <OdometerTicks from={12} to={TEXT.today.age} start={s(T.age)} duration={s(1.0)} />
      {T.list.map((t, i) => (
        <Sfx key={i} at={s(t)} name={i === T.list.length - 1 ? "hit" : (["pop", "pop2", "pop3"] as const)[i % 3]} volume={0.7} />
      ))}
      <Sfx at={s(T.away)} name="whoosh" volume={0.6} />
      <Sfx at={s(T.away + 0.3)} name="draw" volume={0.5} />
      <Sfx at={s(T.forget[2])} name="hit" volume={0.5} />
      <Sfx at={s(T.close)} name="whooshFast" volume={0.7} />
    </AbsoluteFill>
  );
};
