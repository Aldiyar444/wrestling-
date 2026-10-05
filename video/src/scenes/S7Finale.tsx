import React from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE, PhotoKey, TEXT } from "../config";
import { ease, lerp, prog } from "../lib/timeline";
import { Mat, Panels, Sfx, Shockwave } from "../motion/Graphics";
import { Photo } from "../motion/Photo";
import { Letters, shadow, Slam, type, Typewriter, Words } from "../motion/Text";
import { s, Shade, useScene, useShake } from "./common";

const T = {
  uncover: 0,
  forSome1: 0.35,
  competition: 0.9,
  right: 2.25,
  forSome2: 2.5,
  idols: 3.0,
  splitOut: 4.75,
  forMe: 5.45,
  forMeOut: 7.0,
  wall: 7.15,
  again: 7.45,
  dolly: 8.4,
  twelve: 8.5,
  firstMat: 9.65,
  textOut: 10.8,
  mat: 10.85,
  title: 11.9,
  tag: 12.75,
  fade: 14.85,
};

/** 4×3 wall of memories; the 12-year-old sits at column 1, row 1. */
const WALL: PhotoKey[] = ["training1", "competition", "youth", "medal", "idols", "age12", "training2", "arena", "fadzaev", "age24", "crowd", "mat"];
const COLS = 4;
const TILE_W = 440;
const TILE_H = 248;
const GAP = 20;
const FOCUS_TILE = 5;

export const S7Finale: React.FC = () => {
  const { frame, W, H } = useScene();

  const rightIn = prog(frame, s(T.right), s(0.55), ease.expoOut);
  const splitOut = prog(frame, s(T.splitOut), s(0.5), ease.expoIn);

  // wall + dolly into the 12-year-old
  const gridW = COLS * TILE_W + (COLS - 1) * GAP;
  const gridH = 3 * TILE_H + 2 * GAP;
  const x0 = (W - gridW) / 2;
  const y0 = (H - gridH) / 2;
  const fc = FOCUS_TILE % COLS;
  const fr = Math.floor(FOCUS_TILE / COLS);
  const cx = x0 + fc * (TILE_W + GAP) + TILE_W / 2;
  const cy = y0 + fr * (TILE_H + GAP) + TILE_H / 2;
  const d = prog(frame, s(T.dolly), s(1.0), ease.inOut);
  const S = Math.exp(lerp(0, Math.log(W / TILE_W), d));
  const camX = lerp(cx, W / 2, d) - S * cx;
  const camY = lerp(cy, H / 2, d) - S * cy;
  const full = d >= 1;

  // the mat forms
  const R = 520;
  const ring = R * 0.13;
  const shrink = prog(frame, s(T.mat), s(0.45), ease.inOut);
  const photoR = lerp(Math.hypot(W, H) / 2 + 40, R - ring, shrink);
  const photoFade = prog(frame, s(T.mat + 0.45), s(0.3));
  const matDraw = prog(frame, s(T.mat), s(0.45), ease.out);
  const matFill = prog(frame, s(T.mat + 0.2), s(0.4), ease.inOut);
  const titleIn = frame >= s(T.title);
  const push = lerp(1, 1.05, prog(frame, s(T.title), s(3.7), ease.out));

  const shake = useShake(
    [
      [s(T.title), 1.6],
      [s(T.competition), 0.3],
    ],
    18,
  );

  return (
    <AbsoluteFill style={{ background: PALETTE.ink, overflow: "hidden" }}>
      {/* split screen: competitions | idols */}
      {splitOut < 1 ? (
        <>
          <div style={{ position: "absolute", left: 0, top: 0, width: W / 2, height: H, overflow: "hidden", transform: `translateY(${-splitOut * H}px)` }}>
            <Photo photo="competition" w={W / 2} h={H} scale={lerp(1.15, 1.04, prog(frame, 0, s(T.splitOut), ease.camera))} />
            <Shade side="bottom" strength={0.9} />
            <div style={{ position: "absolute", left: 80, bottom: 120, width: W / 2 - 140, color: PALETTE.white, textShadow: shadow }}>
              <Words text={TEXT.finale.forSome} start={s(T.forSome1)} style={{ ...type.light, fontSize: 80 }} />
              <Words text={TEXT.finale.competition} start={s(T.competition)} style={{ ...type.display, fontSize: 92 }} />
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: W / 2,
              top: 0,
              width: W / 2,
              height: H,
              overflow: "hidden",
              transform: `translateY(${(1 - rightIn) * H + splitOut * H}px)`,
              borderLeft: `8px solid ${PALETTE.yellow}`,
            }}
          >
            <Photo photo="fadzaev" w={W / 2} h={H} focus={[0.45, 0.38]} scale={lerp(1.1, 1.02, prog(frame, s(T.right), s(3), ease.camera))} />
            <Shade side="bottom" strength={0.9} />
            <div style={{ position: "absolute", left: 80, bottom: 120, width: W / 2 - 140, color: PALETTE.white, textShadow: shadow }}>
              <Words text={TEXT.finale.forSome} start={s(T.forSome2)} style={{ ...type.light, fontSize: 80 }} />
              <Words text={TEXT.finale.idols} start={s(T.idols)} stagger={2} style={{ ...type.display, fontSize: 76 }} />
            </div>
          </div>
        </>
      ) : null}

      {/* «А для таких, как я...» */}
      {frame >= s(T.forMe) && frame < s(T.forMeOut + 0.4) ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: PALETTE.white }}>
          <Typewriter text={TEXT.finale.forMe} start={s(T.forMe)} cps={15} out={s(T.forMeOut)} style={{ ...type.light, fontSize: 92 }} />
        </AbsoluteFill>
      ) : null}

      {/* the wall of memories, and the dolly into the 12-year-old */}
      {frame >= s(T.wall) && frame <= s(T.mat) ? (
        <AbsoluteFill>
          {!full ? (
            <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${camX}px, ${camY}px) scale(${S})` }}>
              <AbsoluteFill style={{ perspective: 1300 }}>
                {WALL.map((photo, i) => {
                  const c = i % COLS;
                  const r = Math.floor(i / COLS);
                  const order = [5, 2, 9, 0, 7, 4, 11, 1, 6, 10, 3, 8][i];
                  const p = prog(frame, s(T.wall) + order * 2.2, s(0.55), ease.expoOut);
                  const rx = ((i * 37) % 50) - 25;
                  const ry = ((i * 53) % 60) - 30;
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: x0 + c * (TILE_W + GAP),
                        top: y0 + r * (TILE_H + GAP),
                        width: TILE_W,
                        height: TILE_H,
                        overflow: "hidden",
                        opacity: Math.min(1, p * 2) * (i === FOCUS_TILE ? 1 : 1 - d * 0.6),
                        transform: p < 1 ? `translateZ(${(1 - p) * -1600}px) rotateX(${(1 - p) * rx}deg) rotateY(${(1 - p) * ry}deg)` : undefined,
                      }}
                    >
                      <Photo photo={photo} w={TILE_W} h={TILE_H} />
                    </div>
                  );
                })}
              </AbsoluteFill>
            </AbsoluteFill>
          ) : (
            <Photo photo="age12" w={W} h={H} scale={lerp(1, 1.06, prog(frame, s(T.dolly + 1), s(1.5), ease.camera))} />
          )}
          <Shade side="full" strength={0.8} opacity={1 - prog(frame, s(T.textOut), s(0.4))} />
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: PALETTE.white, textShadow: shadow, textAlign: "center" }}>
        <Words text={TEXT.finale.again} start={s(T.again)} out={s(T.textOut)} style={{ ...type.light, fontSize: 76, marginBottom: 6 }} />
        <Words text={TEXT.finale.boy[0]} start={s(T.twelve)} out={s(T.textOut)} style={{ ...type.light, fontSize: 76 }} />
        <Letters text={TEXT.finale.twelve} start={s(T.twelve + 0.15)} stagger={1.3} out={s(T.textOut)} style={{ ...type.hero, fontSize: 170, color: PALETTE.yellow }} />
        <Words text={TEXT.finale.boy[1]} start={s(T.twelve + 0.6)} out={s(T.textOut)} style={{ ...type.light, fontSize: 76 }} />
        <Words text={TEXT.finale.firstMat} start={s(T.firstMat)} out={s(T.textOut)} style={{ ...type.display, fontSize: 84, marginTop: 14 }} />
      </AbsoluteFill>

      {/* the mat, and the last words */}
      {frame >= s(T.mat) ? (
        <AbsoluteFill style={{ transform: `${shake} scale(${push})` }}>
          <Mat cx={W / 2} cy={H / 2} R={R} draw={matDraw} fill={matFill} />
          {titleIn ? (
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: PALETTE.ink, textAlign: "center" }}>
              <Slam start={s(T.title)} from={1.9} style={{ ...type.hero, fontSize: 236, lineHeight: 0.9, marginTop: -40 }}>
                {TEXT.finale.title.split(" ").map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </Slam>
              <div
                style={{
                  ...type.label,
                  fontSize: 38,
                  marginTop: 34,
                  opacity: prog(frame, s(T.tag), s(0.6)),
                  letterSpacing: `${lerp(1.4, 0.45, prog(frame, s(T.tag), s(1.2), ease.out))}em`,
                  paddingLeft: "0.45em",
                }}
              >
                {TEXT.finale.tag}
              </div>
            </AbsoluteFill>
          ) : null}
          <Shockwave cx={W / 2} cy={H / 2} start={s(T.title)} maxR={1300} color="#ffffff" width={34} duration={28} />
          <Shockwave cx={W / 2} cy={H / 2} start={s(T.title) + 5} maxR={1100} color={PALETTE.yellow} width={20} duration={30} />
        </AbsoluteFill>
      ) : null}
      {/* the photo circle sits on the mat while it forms */}
      {frame >= s(T.mat) && photoFade < 1 && frame < s(T.title) ? (
        <AbsoluteFill style={{ clipPath: `circle(${photoR}px at ${W / 2}px ${H / 2}px)`, opacity: 1 - photoFade }}>
          <Photo photo="age12" w={W} h={H} scale={1.06} />
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill style={{ background: PALETTE.ink, opacity: prog(frame, s(T.fade), s(0.75), ease.inOut) }} />
      <Panels start={s(T.uncover)} phase="uncover" colors={[PALETTE.yellow, PALETTE.red, PALETTE.ink]} duration={9} />

      <Sfx at={s(T.uncover)} name="whoosh" />
      <Sfx at={s(T.forSome1)} name="pop" volume={0.6} />
      <Sfx at={s(T.competition)} name="hit" volume={0.6} />
      <Sfx at={s(T.right)} name="whoosh" />
      <Sfx at={s(T.forSome2)} name="pop2" volume={0.6} />
      <Sfx at={s(T.idols)} name="pop3" volume={0.7} />
      <Sfx at={s(T.splitOut)} name="whooshFast" />
      {Array.from({ length: 7 }, (_, i) => (
        <Sfx key={`t${i}`} at={s(T.forMe) + i * 6} name="tick" volume={0.25} />
      ))}
      {[0, 2, 4, 6, 8, 10].map((i) => (
        <Sfx key={`sh${i}`} at={s(T.wall) + i * 2.2} name="shutter" volume={0.5} />
      ))}
      <Sfx at={s(T.again)} name="pop" volume={0.6} />
      <Sfx at={s(T.dolly)} name="whooshFast" volume={0.8} />
      <Sfx at={s(T.twelve + 0.15)} name="sparkle" />
      <Sfx at={s(T.firstMat)} name="pop2" volume={0.7} />
      <Sfx at={s(T.mat)} name="draw" />
      <Sfx at={s(T.title)} name="slap" volume={1.3} />
      <Sfx at={s(T.title)} name="boom" volume={0.8} />
      <Sfx at={s(T.tag)} name="pop" volume={0.5} />
    </AbsoluteFill>
  );
};
