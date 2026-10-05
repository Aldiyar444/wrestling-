import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { AUDIO, FPS, PALETTE, SCENES } from "./config";
import { Assets, AssetsContext, useAssets } from "./lib/assets";
import { loadFonts } from "./lib/fonts";
import { at, keyframes, sceneLength, sceneStart, TOTAL_FRAMES, volumeKeys } from "./lib/timeline";
import { Finish } from "./motion/Graphics";
import { S1Mystery } from "./scenes/S1Mystery";
import { S2Age12 } from "./scenes/S2Age12";
import { S3Path } from "./scenes/S3Path";
import { S4Today } from "./scenes/S4Today";
import { S5Reveal } from "./scenes/S5Reveal";
import { S6Worlds } from "./scenes/S6Worlds";
import { S7Finale } from "./scenes/S7Finale";

loadFonts();

const SCENE_COMPONENTS: Record<(typeof SCENES)[number]["id"], React.FC> = {
  mystery: S1Mystery,
  age12: S2Age12,
  path: S3Path,
  today: S4Today,
  reveal: S5Reveal,
  worlds: S6Worlds,
  finale: S7Finale,
};

/**
 * Music and atmosphere beds. Loops are laid out as back-to-back copies (not <Audio loop>)
 * so each volume curve stays on the film's timeline.
 */
const Music: React.FC = () => {
  const { audio } = useAssets();
  return (
    <>
      {AUDIO.layers
        .filter((layer) => audio[layer.file])
        .flatMap((layer) => {
          const keys = volumeKeys(layer.volume);
          const start = layer.start ? at(layer.start[0], layer.start[1]) : 0;
          const length = Math.max(1, Math.floor(audio[layer.file] * FPS));
          const copies = Math.ceil((TOTAL_FRAMES - start) / length);
          return Array.from({ length: copies }, (_, k) => {
            const from = start + k * length;
            return (
              <Sequence key={`${layer.id}-${k}`} from={from} durationInFrames={Math.min(length, TOTAL_FRAMES - from)} name={`♪ ${layer.id}`} layout="none">
                <Audio src={staticFile(`assets/audio/${layer.file}`)} volume={(fr) => Math.max(0, Math.min(1, keyframes(fr + from, keys)))} />
              </Sequence>
            );
          });
        })}
      {AUDIO.voiceover && audio[AUDIO.voiceover] ? <Audio src={staticFile(`assets/audio/${AUDIO.voiceover}`)} /> : null}
    </>
  );
};

export type FilmProps = { assets: Assets };

export const Film: React.FC<FilmProps> = ({ assets }) => (
  <AssetsContext.Provider value={assets}>
    <AbsoluteFill style={{ backgroundColor: PALETTE.ink }}>
      {SCENES.map((scene, i) => {
        const Scene = SCENE_COMPONENTS[scene.id];
        return (
          <Sequence key={scene.id} from={sceneStart[scene.id]} durationInFrames={sceneLength[i]} name={scene.title}>
            <Scene />
          </Sequence>
        );
      })}
      <Finish />
      <Music />
    </AbsoluteFill>
  </AssetsContext.Provider>
);
