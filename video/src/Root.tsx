import { CalculateMetadataFunction, Composition } from "remotion";
import { FORMATS, FPS } from "./config";
import { Film, FilmProps } from "./Film";
import { probeAssets } from "./lib/assets";
import { TOTAL_FRAMES } from "./lib/timeline";

const calculateMetadata: CalculateMetadataFunction<FilmProps> = async ({ props }) => ({
  durationInFrames: TOTAL_FRAMES,
  props: { ...props, assets: await probeAssets() },
});

const defaultProps: FilmProps = { assets: { photos: {}, audio: {} } };

export const RemotionRoot: React.FC = () => (
  <>
    {/* 16:9 — основной, кинематографичный */}
    <Composition
      id="KoverPomnit"
      component={Film}
      fps={FPS}
      durationInFrames={TOTAL_FRAMES}
      {...FORMATS.landscape}
      defaultProps={defaultProps}
      calculateMetadata={calculateMetadata}
    />
    {/* 9:16 — для телефона (Reels / Shorts / TikTok) */}
    <Composition
      id="KoverPomnit-Vertical"
      component={Film}
      fps={FPS}
      durationInFrames={TOTAL_FRAMES}
      {...FORMATS.vertical}
      defaultProps={defaultProps}
      calculateMetadata={calculateMetadata}
    />
  </>
);
