import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { LOOK } from "../config";
import { useLayout } from "../lib/layout";

/** Film grain + vignette over the whole film. */
export const Finish: React.FC = () => {
  const frame = useCurrentFrame();
  const { W, H } = useLayout();
  const gw = Math.round(W / 2);
  const gh = Math.round(H / 2);

  return (
    <>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 78% 78% at 50% 48%, transparent 52%, rgba(0,0,0,${LOOK.vignette}) 100%)`,
        }}
      />
      {LOOK.grain > 0 ? (
        <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: LOOK.grain * 2.2 }}>
          <svg width={gw} height={gh} viewBox={`0 0 ${gw} ${gh}`} style={{ width: W, height: H }} preserveAspectRatio="none">
            <filter id="grain" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves={2} seed={frame % 48} stitchTiles="stitch" />
              <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
            </filter>
            <rect width={gw} height={gh} filter="url(#grain)" />
          </svg>
        </AbsoluteFill>
      ) : null}
    </>
  );
};
