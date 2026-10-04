import { CalculateMetadataFunction, Composition } from "remotion";
import { FORMAT, FPS } from "./config";
import { Film, FilmProps } from "./Film";
import { probeAssets } from "./lib/assets";
import { TOTAL_FRAMES } from "./lib/timeline";

const calculateMetadata: CalculateMetadataFunction<FilmProps> = async ({ props }) => ({
  durationInFrames: TOTAL_FRAMES,
  props: { ...props, assets: await probeAssets() },
});

const defaultProps: FilmProps = { assets: { photos: {}, audio: {} } };

export const RemotionRoot: React.FC = () => (
  <Composition
    id="KoverPomnit"
    component={Film}
    fps={FPS}
    durationInFrames={TOTAL_FRAMES}
    {...FORMAT}
    defaultProps={defaultProps}
    calculateMetadata={calculateMetadata}
  />
);
