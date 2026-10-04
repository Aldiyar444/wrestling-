import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { AUDIO, FPS, SCENES } from "../config";
import { useAssets } from "../lib/assets";
import { at, keyframes, TOTAL_FRAMES, volumeKeys } from "../lib/timeline";

/**
 * Layered sound bed; each layer's loudness follows the scene-relative keys in config.
 * Loops are laid out as back-to-back copies (rather than <Audio loop>) so the volume
 * curve stays on the film's timeline instead of restarting with every repeat.
 */
export const Soundtrack: React.FC = () => {
  const { audio } = useAssets();
  return (
    <>
      {AUDIO.layers
        .filter((layer) => audio[layer.file])
        .flatMap((layer) => {
          const keys = volumeKeys(layer.volume);
          const start = layer.start ? at(layer.start[0], layer.start[1]) : 0;
          const length = Math.max(1, Math.floor(audio[layer.file] * FPS));
          const copies = layer.loop ? Math.ceil((TOTAL_FRAMES - start) / length) : 1;
          return Array.from({ length: copies }, (_, k) => {
            const from = start + k * length;
            return (
              <Sequence
                key={`${layer.id}-${k}`}
                from={from}
                durationInFrames={Math.min(length, TOTAL_FRAMES - from)}
                name={`♪ ${layer.id}`}
                layout="none"
              >
                <Audio
                  src={staticFile(`assets/audio/${layer.file}`)}
                  volume={(f) => Math.max(0, Math.min(1, keyframes(f + from, keys)))}
                />
              </Sequence>
            );
          });
        })}
      <SubtitleSfx />
      {AUDIO.voiceover && audio[AUDIO.voiceover] ? (
        <Audio src={staticFile(`assets/audio/${AUDIO.voiceover}`)} />
      ) : null}
    </>
  );
};

/** A soft cue each time a subtitle line appears (the final title has the mat slap instead). */
const SubtitleSfx: React.FC = () => {
  const { audio } = useAssets();
  const lineSounds = AUDIO.sfx.line.filter((f) => audio[f]);
  let n = 0;
  return (
    <>
      {SCENES.flatMap((scene) =>
        scene.text.flatMap((group) =>
          group.lines
            .filter((line) => !line.impact && !line.silent)
            .map((line) => {
              const file = line.style === "display" && audio[AUDIO.sfx.display] ? AUDIO.sfx.display : lineSounds[n++ % Math.max(1, lineSounds.length)];
              if (!file) return null;
              const from = at(scene.id, line.at);
              return (
                <Sequence
                  key={`sfx-${scene.id}-${line.at}`}
                  from={from}
                  durationInFrames={Math.max(1, Math.floor(audio[file] * FPS))}
                  name="♪ sfx"
                  layout="none"
                >
                  <Audio src={staticFile(`assets/audio/${file}`)} volume={AUDIO.sfx.volume} />
                </Sequence>
              );
            }),
        ),
      )}
    </>
  );
};
