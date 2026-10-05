import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { PALETTE, PHOTOS, PhotoKey, TEXT } from "../config";
import { usePhoto } from "../lib/assets";
import { clamp, ease, lerp, prog } from "../lib/timeline";
import { Annotation, Mat, Sfx } from "../motion/Graphics";
import { cover, MysteryLayer, Photo } from "../motion/Photo";
import { Odometer, shadow, Slam, type, Words } from "../motion/Text";
import { OdometerTicks, s, Shade, useScene, useShake } from "./common";

/** Size of the big age numeral shared by the end of this scene and the start of the next. */
export const BIG_AGE = 470;

// Choreography, seconds from the start of the scene.
const T = {
  line: 0.15,
  open: 0.8,
  me: 1.9,
  circle: 2.2,
  age: 2.9,
  meOut: 4.1,
  pan: 4.2,
  nextTo: 4.5,
  question: 4.9,
  split: 5.9,
  who: 6.2,
  seven: 6.7,
  noLosses: 7.2,
  five: 8.4,
  noPoints: 8.9,
  official: 9.6,
  statsOut: 10.9,
  print: 11.0,
  understand: [11.5, 12.0, 12.6],
  understandOut: 13.5,
  goBack: [13.7, 14.1],
  rewind: 14.5,
  roll: 14.7,
};

const REWIND_FLASHES: PhotoKey[] = ["idols", "medal", "youth", "competition", "training2", "training1", "age12"];

export const S1Mystery: React.FC = () => {
  const { frame, W, H } = useScene();
  const info = usePhoto("fadzaev");
  const m = PHOTOS.fadzaev.mystery;

  // ── camera on the photo: push-in, pan to the stranger, then make room for the stats
  const scale = interpolate(frame, [s(T.open), s(T.pan), s(T.pan + 1.0), s(T.split + 0.6)], [1.04, 1.1, 1.24, 1.26], {
    ...clamp,
    easing: ease.inOut,
  });
  const base = cover(info, W, H, PHOTOS.fadzaev.focus, scale);
  const [manX] = base.map(m.face[0], m.face[1]);
  const toCentre = W * 0.5 - manX;
  const toLeft = W * 0.24 - manX;
  const dx =
    lerp(0, toCentre, prog(frame, s(T.pan), s(1.0), ease.inOut)) + (toLeft - toCentre) * prog(frame, s(T.split), s(0.6), ease.inOut);
  const c = cover(info, W, H, PHOTOS.fadzaev.focus, scale, dx);
  const [meX, meY] = c.map(m.me[0], m.me[1]);
  const [hisX, hisY] = c.map(m.face[0], m.face[1]);

  const open = prog(frame, s(T.open), s(0.8), ease.expoOut);
  const lineP = prog(frame, s(T.line), s(0.6), ease.expoOut);
  const cropRight = prog(frame, s(T.split), s(0.6), ease.expoOut) * 0.52;
  const photoGone = prog(frame, s(T.print), s(0.25), ease.in);

  // ── the photo becomes a print on the table
  const printIn = prog(frame, s(T.print + 0.05), s(0.5), ease.expoOut);
  const rewindP = prog(frame, s(T.rewind), s(0.9), ease.in);
  const printW = 640;
  const printH = printW / 0.75;
  const printX = lerp(W * 0.86, 250, printIn) + (W / 2 - printW / 2 - 250) * rewindP;
  const printY = lerp(H * 1.05, (H - printH) / 2, printIn) + 0;
  const printRot = lerp(28, -4, printIn) - rewindP * 700;
  const printScale = 1 - rewindP * 0.85;

  const shake = useShake([
    [s(T.me), 0.6],
    [s(T.seven), 0.8],
    [s(T.five), 0.8],
  ]);

  const panelX = interpolate(frame, [s(T.split), s(T.split + 0.55), s(T.statsOut), s(T.statsOut + 0.35)], [W, W * 0.48, W * 0.48, W], {
    ...clamp,
    easing: ease.expoOut,
  });

  const rewinding = frame >= s(T.rewind);
  const flashIdx = Math.floor((frame - s(T.rewind + 0.15)) / 3);

  return (
    <AbsoluteFill style={{ background: PALETTE.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: shake }}>
        {/* the photo, opening from a single line */}
        {photoGone < 1 ? (
          <AbsoluteFill
            style={{
              clipPath: `inset(${(1 - open) * 50}% ${cropRight * 100}% ${(1 - open) * 50}% 0)`,
              opacity: 1 - photoGone,
              filter: photoGone ? `blur(${photoGone * 20}px)` : undefined,
            }}
          >
            <Photo photo="fadzaev" w={W} h={H} scale={scale} dx={dx}>
              {(cc, inf) => <MysteryLayer c={cc} info={inf} amount={1} darken={0.86} />}
            </Photo>
            <Shade side="left" strength={0.7} opacity={1 - prog(frame, s(T.split), s(0.4))} />
            <Annotation cx={meX} cy={meY} r={175 * (scale / 1.1)} start={s(T.circle)} out={s(T.meOut)} />
            <Annotation cx={hisX} cy={hisY} r={180 * (scale / 1.1)} start={s(T.question)} dashed color="#ffffff" width={5} out={s(T.statsOut)} />
          </AbsoluteFill>
        ) : null}

        {/* opening line */}
        {open < 1 ? (
          <>
            {[-1, 1].map((d) => (
              <div
                key={d}
                style={{
                  position: "absolute",
                  left: W / 2 - (W / 2) * lineP,
                  width: W * lineP,
                  top: H / 2 + d * open * (H / 2) - 2,
                  height: 4,
                  background: PALETTE.yellow,
                  opacity: 1 - open,
                }}
              />
            ))}
          </>
        ) : null}

        {/* «ЭТО Я.  Мне 17 лет.» */}
        <div style={{ position: "absolute", left: 110, top: 250, color: PALETTE.white, textShadow: shadow }}>
          <Slam start={s(T.me)} out={s(T.meOut)} style={{ ...type.hero, fontSize: 220, transformOrigin: "left center" }}>
            {TEXT.mystery.me}
          </Slam>
          {frame >= s(T.age) && frame < s(T.meOut + 0.4) ? (
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 26,
                marginTop: 18,
                opacity: 1 - prog(frame, s(T.meOut), s(0.3)),
                transform: `translateY(${(1 - prog(frame, s(T.age), s(0.4), ease.expoOut)) * 60}px)`,
              }}
            >
              <span style={{ ...type.light, fontSize: 96 }}>{TEXT.mystery.agePrefix}</span>
              <Odometer from={0} to={TEXT.mystery.age} start={s(T.age)} duration={s(0.9)} easing={ease.out} style={{ ...type.hero, fontSize: 200, color: PALETTE.yellow }} />
              <span style={{ ...type.light, fontSize: 96 }}>{TEXT.mystery.ageSuffix}</span>
            </div>
          ) : null}
        </div>

        {/* «А рядом со мной —» */}
        <div style={{ position: "absolute", left: 110, bottom: 130, color: PALETTE.white, textShadow: shadow }}>
          <Words text={TEXT.mystery.nextTo} start={s(T.nextTo)} out={s(T.split)} style={{ ...type.display, fontSize: 92 }} />
        </div>

        {/* the stats panel */}
        {frame >= s(T.split) && frame < s(T.statsOut + 0.4) ? (
          <div
            style={{
              position: "absolute",
              left: panelX,
              top: 0,
              width: W * 0.6,
              height: H,
              background: PALETTE.blue,
              overflow: "hidden",
              boxShadow: "-30px 0 60px rgba(0,0,0,0.35)",
            }}
          >
            {/* ghost numerals */}
            {[
              ["7", T.seven],
              ["5", T.five],
            ].map(([n, t], i) => {
              const p = prog(frame, s(t as number), s(0.5), ease.expoOut);
              const gone = i === 0 ? prog(frame, s(T.five), s(0.3)) : 0;
              return (
                <div
                  key={n as string}
                  style={{
                    position: "absolute",
                    right: -40,
                    top: -120,
                    ...type.hero,
                    fontSize: 1250,
                    color: "transparent",
                    WebkitTextStroke: "4px rgba(255,255,255,0.16)",
                    opacity: p * (1 - gone),
                    transform: `scale(${1.25 - 0.25 * p})`,
                  }}
                >
                  {n}
                </div>
              );
            })}
            <div style={{ position: "absolute", left: 90, top: 170, width: W * 0.6 - 160, color: PALETTE.white }}>
              <Words text={TEXT.mystery.who} start={s(T.who)} style={{ ...type.light, fontSize: 62 }} />
              <Slam start={s(T.seven)} from={2.8} style={{ ...type.hero, fontSize: 168, color: PALETTE.yellow, transformOrigin: "left center", marginTop: 6 }}>
                {TEXT.mystery.sevenYears}
              </Slam>
              <Words text={TEXT.mystery.noLosses} start={s(T.noLosses)} stagger={2} style={{ ...type.body, fontSize: 56 }} />
              <Slam start={s(T.five)} from={2.8} style={{ ...type.hero, fontSize: 168, color: PALETTE.yellow, transformOrigin: "left center", marginTop: 40 }}>
                <span style={{ color: PALETTE.white, ...type.light, fontSize: 120 }}>и </span>
                {TEXT.mystery.fiveYears.replace(/^и\s+/, "")}
              </Slam>
              <Words text={TEXT.mystery.noPoints} start={s(T.noPoints)} stagger={2} style={{ ...type.body, fontSize: 56 }} />
              <Words text={TEXT.mystery.official} start={s(T.official)} stagger={2} style={{ ...type.body, fontSize: 44, opacity: 0.8, marginTop: 10 }} />
            </div>
          </div>
        ) : null}
      </AbsoluteFill>

      {/* the print */}
      {frame >= s(T.print) ? (
        <>
          <Mat cx={W * 0.72} cy={H * 0.5} R={620} draw={prog(frame, s(T.print), s(1.4), ease.out)} fill={0} field={false} lineColor="rgba(255,255,255,0.22)" style={{ opacity: 1 - rewindP }} />
          {printScale > 0.16 ? (
            <div
              style={{
                position: "absolute",
                left: printX,
                top: printY,
                width: printW,
                height: printH,
                transform: `rotate(${printRot}deg) scale(${printScale})`,
                border: "16px solid #f7f3ea",
                boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
                background: "#f7f3ea",
                opacity: 1 - prog(frame, s(T.rewind + 0.5), s(0.3)),
              }}
            >
              <div style={{ position: "relative", width: printW - 32, height: printH - 32, overflow: "hidden" }}>
                <Photo photo="fadzaev" w={printW - 32} h={printH - 32} focus={[0.5, 0.5]}>
                  {(cc, inf) => <MysteryLayer c={cc} info={inf} amount={3} darken={0.86} />}
                </Photo>
              </div>
            </div>
          ) : null}
          <div style={{ position: "absolute", left: 1010, top: 330, width: 820, color: PALETTE.white }}>
            {TEXT.mystery.toUnderstand.map((line, i) => (
              <Words
                key={i}
                text={line}
                start={s(T.understand[i])}
                out={s(T.understandOut)}
                marker
                style={{ ...type.display, fontSize: 70, marginBottom: 14 }}
              />
            ))}
          </div>
          <div style={{ position: "absolute", left: 1010, top: 420, width: 860, color: PALETTE.white, opacity: 1 - rewindP }}>
            <Words text={TEXT.mystery.goBack[0]} start={s(T.goBack[0])} style={{ ...type.light, fontSize: 90 }} />
            <Words text={TEXT.mystery.goBack[1]} start={s(T.goBack[1])} style={{ ...type.hero, fontSize: 130 }} />
          </div>
        </>
      ) : null}

      {/* rewind: flashes of the years in reverse, the age rolls back 17 → 12 */}
      {rewinding ? (
        <AbsoluteFill>
          {flashIdx >= 0 && flashIdx < REWIND_FLASHES.length ? (
            <AbsoluteFill style={{ opacity: 0.55, transform: `translateX(${(flashIdx % 2 ? -1 : 1) * 30}px)`, filter: "contrast(1.3) saturate(0.6)" }}>
              <Photo photo={REWIND_FLASHES[flashIdx]} w={W} h={H} />
            </AbsoluteFill>
          ) : null}
          <AbsoluteFill
            style={{
              background: `repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 2px, transparent 2px, transparent 5px)`,
              opacity: 1 - prog(frame, s(T.roll + 0.6), s(0.3)),
            }}
          />
          <AbsoluteFill style={{ background: PALETTE.ink, opacity: prog(frame, s(T.roll + 0.5), s(0.35)) }} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: PALETTE.yellow }}>
            <div
              style={{
                opacity: prog(frame, s(T.rewind), s(0.2)),
                transform: `translateX(${Math.sin(frame * 2.1) * 6 * (1 - prog(frame, s(T.roll + 0.7), s(0.2)))}px)`,
              }}
            >
              <Odometer from={TEXT.mystery.age} to={12} start={s(T.roll)} duration={s(0.7)} style={{ ...type.hero, fontSize: BIG_AGE }} />
            </div>
          </AbsoluteFill>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 150,
              textAlign: "center",
              ...type.label,
              fontSize: 54,
              color: PALETTE.white,
              opacity: Math.floor(frame / 4) % 2 ? 0.9 : 0.35,
            }}
          >
            ◀◀
          </div>
        </AbsoluteFill>
      ) : null}

      {/* sound */}
      <Sfx at={s(T.line)} name="draw" volume={0.5} />
      <Sfx at={s(T.open)} name="whoosh" volume={0.7} />
      <Sfx at={s(T.me)} name="hit" />
      <Sfx at={s(T.circle)} name="draw" />
      <OdometerTicks from={0} to={TEXT.mystery.age} start={s(T.age)} duration={s(0.9)} easing={ease.out} max={10} />
      <Sfx at={s(T.pan)} name="whoosh" volume={0.5} />
      <Sfx at={s(T.nextTo)} name="pop" />
      <Sfx at={s(T.split)} name="whooshFast" />
      <Sfx at={s(T.who)} name="pop2" volume={0.6} />
      <Sfx at={s(T.seven)} name="boom" />
      <Sfx at={s(T.noLosses)} name="pop3" volume={0.6} />
      <Sfx at={s(T.five)} name="boom" />
      <Sfx at={s(T.noPoints)} name="pop" volume={0.6} />
      <Sfx at={s(T.statsOut)} name="whoosh" />
      <Sfx at={s(T.print + 0.45)} name="shutter" />
      {T.understand.map((t, i) => (
        <Sfx key={i} at={s(t)} name={i % 2 ? "pop2" : "pop"} volume={0.6} />
      ))}
      <Sfx at={s(T.goBack[0])} name="pop3" volume={0.6} />
      <Sfx at={s(T.goBack[1])} name="hit" volume={0.7} />
      <Sfx at={s(T.rewind)} name="rewind" />
    </AbsoluteFill>
  );
};
