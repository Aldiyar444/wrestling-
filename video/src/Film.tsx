import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { LOOK, SCENES } from "./config";
import { Finish } from "./components/Finish";
import { SceneView } from "./components/SceneView";
import { Soundtrack } from "./components/Soundtrack";
import { Assets, AssetsContext } from "./lib/assets";
import { loadFonts } from "./lib/fonts";
import { sceneLength, sceneStart } from "./lib/timeline";

loadFonts();

export type FilmProps = { assets: Assets };

export const Film: React.FC<FilmProps> = ({ assets }) => (
  <AssetsContext.Provider value={assets}>
    <AbsoluteFill style={{ backgroundColor: LOOK.colors.light }}>
      {SCENES.map((scene, i) => (
        <Sequence key={scene.id} from={sceneStart[scene.id]} durationInFrames={sceneLength[i]} name={scene.title}>
          <SceneView scene={scene} />
        </Sequence>
      ))}
      <Finish />
      <Soundtrack />
    </AbsoluteFill>
  </AssetsContext.Provider>
);
