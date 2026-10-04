import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { LOOK, Scene } from "../config";
import { easeInOut, keyframes, progress, sec, shakeOffset } from "../lib/timeline";
import { ShotLayer } from "./ShotLayer";
import { TextGroupView } from "./TextGroupView";

/** Generic scene: photo layer → dim → text, all driven by the config entry. */
export const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const length = sec(scene.duration);

  const shots = scene.shots.map((shot, i) => {
    const from = sec(shot.at);
    const next = scene.shots[i + 1];
    const nextReveal = next ? sec(next.revealDuration ?? LOOK.transitions[next.reveal ?? "fade"]) : 0;
    const to = next ? sec(next.at) + nextReveal : length;
    return { shot, from, to };
  });

  let shake = { x: 0, y: 0, r: 0 };
  for (const s of scene.shakes ?? []) {
    const start = sec(s.at);
    const len = sec(s.duration);
    if (frame >= start && frame < start + len) {
      const decay = 1 - (frame - start) / len;
      shake = shakeOffset(frame, s.amount * decay * decay);
    }
  }

  const dim = scene.dim ? keyframes(frame, scene.dim.map(([t, v]) => [sec(t), v])) : 0;
  const fadeOut = scene.fadeOut
    ? progress(frame, length - sec(LOOK.transitions.sceneFadeOut), sec(LOOK.transitions.sceneFadeOut), easeInOut)
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: LOOK.colors.background }}>
      <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px) rotate(${shake.r}deg) scale(1.01)` }}>
        {shots.map(({ shot, from, to }, i) =>
          frame >= from && frame < to ? (
            <ShotLayer key={i} id={`${scene.id}-${i}`} shot={shot} from={from} to={to} unblur={scene.unblur} />
          ) : null,
        )}
      </AbsoluteFill>
      {dim > 0 ? <AbsoluteFill style={{ backgroundColor: LOOK.colors.background, opacity: dim }} /> : null}
      <AbsoluteFill style={{ transform: `translate(${shake.x * 0.35}px, ${shake.y * 0.35}px)` }}>
        {scene.text.map((group, i) => (
          <TextGroupView key={i} group={group} />
        ))}
      </AbsoluteFill>
      {fadeOut > 0 ? <AbsoluteFill style={{ backgroundColor: LOOK.colors.background, opacity: fadeOut }} /> : null}
    </AbsoluteFill>
  );
};
