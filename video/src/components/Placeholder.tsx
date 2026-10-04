import React from "react";
import { LOOK, PHOTOS, PhotoKey, PlaceholderKind } from "../config";

const STROKE = "rgba(255,255,255,0.10)";
const FAINT = "rgba(255,255,255,0.05)";

const Motif: React.FC<{ kind: PlaceholderKind; w: number; h: number }> = ({ kind, w, h }) => {
  const cx = w / 2;
  const s = Math.min(w, h);
  const common = { fill: "none", stroke: STROKE, strokeWidth: Math.max(1.5, s / 500) };

  switch (kind) {
    case "portrait":
    case "group": {
      const people = kind === "portrait" ? [0] : [-2, -1, 0, 1, 2];
      const r = kind === "portrait" ? s * 0.11 : s * 0.06;
      return (
        <>
          {people.map((p) => {
            const x = cx + p * r * 3.1;
            const y = h * 0.42 + Math.abs(p) * r * 0.25;
            return (
              <g key={p} {...common}>
                <circle cx={x} cy={y} r={r} />
                <path d={`M ${x - r * 2.3} ${h} Q ${x - r * 2.1} ${y + r * 1.6} ${x} ${y + r * 1.5} Q ${x + r * 2.1} ${y + r * 1.6} ${x + r * 2.3} ${h}`} />
              </g>
            );
          })}
        </>
      );
    }
    case "mat": {
      const cy = h * 0.58;
      const R = Math.max(w, h) * 0.42;
      return (
        <g {...common}>
          <ellipse cx={cx} cy={cy} rx={R} ry={R * 0.36} />
          <ellipse cx={cx} cy={cy} rx={R * 0.8} ry={R * 0.29} stroke={LOOK.colors.accent} strokeOpacity={0.22} strokeWidth={s / 60} />
          <ellipse cx={cx} cy={cy} rx={R * 0.62} ry={R * 0.22} />
          <ellipse cx={cx} cy={cy} rx={R * 0.08} ry={R * 0.03} />
        </g>
      );
    }
    case "city": {
      const base = h * 0.78;
      const blocks = [
        [0.08, 0.3], [0.15, 0.42], [0.22, 0.26], [0.3, 0.5], [0.62, 0.38], [0.7, 0.55], [0.79, 0.3], [0.87, 0.44],
      ];
      return (
        <g {...common}>
          <line x1={0} y1={base} x2={w} y2={base} />
          {blocks.map(([x, bh], i) => (
            <rect key={i} x={w * x} y={base - h * bh * 0.6} width={w * 0.055} height={h * bh * 0.6} />
          ))}
          {/* Байтерек */}
          <line x1={cx} y1={base} x2={cx} y2={base - h * 0.42} />
          <line x1={cx - w * 0.012} y1={base} x2={cx - w * 0.003} y2={base - h * 0.4} />
          <line x1={cx + w * 0.012} y1={base} x2={cx + w * 0.003} y2={base - h * 0.4} />
          <circle cx={cx} cy={base - h * 0.47} r={s * 0.045} stroke={LOOK.colors.accent} strokeOpacity={0.35} />
        </g>
      );
    }
    case "arena": {
      return (
        <g {...common}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ellipse key={i} cx={cx} cy={h * 0.95} rx={w * (0.25 + i * 0.09)} ry={h * (0.16 + i * 0.07)} stroke={i === 0 ? STROKE : FAINT} />
          ))}
          <rect x={cx - w * 0.12} y={h * 0.82} width={w * 0.24} height={h * 0.08} stroke={LOOK.colors.accent} strokeOpacity={0.25} />
          {[-3, -2, -1, 0, 1, 2, 3].map((i) => (
            <g key={i}>
              <line x1={cx + i * w * 0.07} y1={h * 0.08} x2={cx + i * w * 0.07} y2={h * 0.26} />
              <rect x={cx + i * w * 0.07} y={h * 0.08} width={w * 0.04} height={h * 0.06} stroke={FAINT} />
            </g>
          ))}
        </g>
      );
    }
    case "crowd": {
      const dots: React.ReactNode[] = [];
      for (let row = 0; row < 9; row++) {
        const y = h * (0.25 + row * 0.085);
        const r = s * (0.012 + row * 0.0035);
        const n = Math.ceil(w / (r * 3.2));
        for (let i = 0; i < n; i++) {
          const x = (i + (row % 2) * 0.5) * r * 3.2;
          const o = 0.04 + ((i * 37 + row * 11) % 9) / 90;
          dots.push(<circle key={`${row}-${i}`} cx={x} cy={y} r={r} fill={`rgba(255,255,255,${o})`} />);
        }
      }
      return <>{dots}</>;
    }
  }
};

/** Shown in place of a photo that isn't in public/assets/photos yet. */
export const Placeholder: React.FC<{ photo: PhotoKey; w: number; h: number; u: number }> = ({ photo, w, h, u }) => {
  const def = PHOTOS[photo];
  return (
    <div
      style={{
        width: w,
        height: h,
        position: "relative",
        overflow: "hidden",
        background: `radial-gradient(ellipse 70% 60% at 50% 42%, #26262a 0%, ${LOOK.colors.placeholder} 75%)`,
      }}
    >
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        <Motif kind={def.kind} w={w} h={h} />
      </svg>
      {LOOK.showPlaceholderLabels ? (
        <div
          style={{
            position: "absolute",
            top: h * 0.07,
            right: w * 0.06,
            textAlign: "right",
            fontFamily: LOOK.fonts.display,
            color: "rgba(255,255,255,0.42)",
            fontSize: 24 * u,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            lineHeight: 1.6,
          }}
        >
          <div>{def.label}</div>
          <div style={{ fontFamily: LOOK.fonts.text, letterSpacing: "0.04em", textTransform: "none", opacity: 0.75 }}>
            assets/photos/{def.file}.jpg
          </div>
        </div>
      ) : null}
    </div>
  );
};
