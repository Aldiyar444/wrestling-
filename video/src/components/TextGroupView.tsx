import React from "react";
import { useCurrentFrame } from "remotion";
import { Line, LOOK, TextGroup, TextStyle } from "../config";
import { hexA, Layout, useLayout } from "../lib/layout";
import { easeInOut, easeOut, progress, sec } from "../lib/timeline";

const STYLES = (L: Layout): Record<TextStyle, React.CSSProperties> => {
  const u = L.u;
  return {
    display: { fontFamily: LOOK.fonts.display, fontWeight: 300, fontSize: 112 * u, lineHeight: 1.04, letterSpacing: "0.005em" },
    body: { fontFamily: LOOK.fonts.text, fontWeight: 400, fontSize: 56 * u, lineHeight: 1.22 },
    list: {
      fontFamily: LOOK.fonts.display,
      fontWeight: 300,
      fontSize: 58 * u,
      lineHeight: 1.18,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: LOOK.colors.textMuted,
    },
    name: { fontFamily: LOOK.fonts.display, fontWeight: 400, fontSize: 66 * u, lineHeight: 1.1, letterSpacing: "0.02em" },
    caption: { fontFamily: LOOK.fonts.text, fontWeight: 300, fontSize: 38 * u, lineHeight: 1.3, color: LOOK.colors.textMuted, letterSpacing: "0.02em" },
    title: {
      fontFamily: LOOK.fonts.display,
      fontWeight: 500,
      fontSize: 214 * u,
      lineHeight: 0.98,
      letterSpacing: "0.035em",
    },
    tag: { fontFamily: LOOK.fonts.display, fontWeight: 400, fontSize: 34 * u, letterSpacing: "0.5em", color: LOOK.colors.accent, paddingLeft: "0.5em" },
  };
};

/** `*x*` → bold italic in the accent colour, `[x]` → accent colour (numbers). */
const RichText: React.FC<{ text: string; style: TextStyle }> = ({ text, style }) => {
  const parts = text.split(/(\*[^*]+\*|\[[^\]]+\])/g).filter(Boolean);
  const big = style === "body";
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("*")) {
          return (
            <span
              key={i}
              style={{
                fontFamily: LOOK.fonts.text,
                fontStyle: "italic",
                fontWeight: 600,
                color: LOOK.colors.accent,
                fontSize: big ? "1.14em" : undefined,
                letterSpacing: "0.005em",
              }}
            >
              {part.slice(1, -1)}
            </span>
          );
        }
        if (part.startsWith("[")) {
          return (
            <span
              key={i}
              style={{
                color: LOOK.colors.accent,
                ...(big ? { fontFamily: LOOK.fonts.display, fontWeight: 400, fontSize: "1.32em", lineHeight: 1 } : {}),
              }}
            >
              {part.slice(1, -1)}
            </span>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
};

const zoneStyle = (zone: TextGroup["zone"], L: Layout): React.CSSProperties => {
  const { W, H } = L;
  const base: React.CSSProperties = { position: "absolute", display: "flex", flexDirection: "column" };
  if (zone === "center") {
    return { ...base, inset: 0, alignItems: "center", justifyContent: "center", textAlign: "center", padding: `0 ${W * 0.06}px` };
  }
  if (zone === "side") {
    return { ...base, left: W * 0.065, width: W * 0.4, top: 0, bottom: 0, justifyContent: "center" };
  }
  // lower + caption
  return { ...base, left: W * 0.065, width: W * (zone === "caption" ? 0.5 : 0.62), bottom: H * 0.095, top: 0, justifyContent: "flex-end" };
};

const LineView: React.FC<{ line: Line; L: Layout; styles: Record<TextStyle, React.CSSProperties> }> = ({ line, L, styles }) => {
  const frame = useCurrentFrame();
  const style = line.style ?? "body";
  const start = sec(line.at);

  if (line.impact) {
    // final title: lands with the slap — fast, firm, no float
    const e = progress(frame, start, sec(0.28), easeOut);
    return (
      <div
        style={{
          ...styles[style],
          opacity: e,
          transform: `scale(${1.06 - 0.06 * e})`,
          filter: `blur(${(1 - e) * 12 * L.u}px)`,
        }}
      >
        <RichText text={line.text} style={style} />
      </div>
    );
  }

  const e = progress(frame, start, sec(LOOK.transitions.textIn), easeOut);
  return (
    <div
      style={{
        ...styles[style],
        opacity: e,
        transform: `translateY(${(1 - e) * 22 * L.u}px)`,
        filter: e < 1 ? `blur(${(1 - e) * LOOK.blur.text * L.u}px)` : undefined,
        marginTop:
          (line.space ?? 0) * (styles[style].fontSize as number) * 1.2 +
          (style === "list" ? 6 * L.u : style === "body" ? 4 * L.u : style === "caption" ? 14 * L.u : style === "tag" ? 36 * L.u : 0),
        marginBottom: style === "display" ? 26 * L.u : style === "name" ? 4 * L.u : 0,
      }}
    >
      <RichText text={line.text} style={style} />
    </div>
  );
};

/** A block of lines that appear one by one and leave together. */
export const TextGroupView: React.FC<{ group: TextGroup }> = ({ group }) => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const styles = STYLES(L);
  const first = sec(Math.min(...group.lines.map((l) => l.at)));
  const outStart = sec(group.out);
  const outLen = sec(LOOK.transitions.textOut);
  if (frame < first || frame > outStart + outLen) return null;

  const o = progress(frame, outStart, outLen, easeInOut);
  const drift = -(frame - first) * 0.22 * L.u;
  const isCaption = group.zone === "caption";

  return (
    <div style={zoneStyle(group.zone, L)}>
      <div
        style={{
          color: LOOK.colors.text,
          opacity: 1 - o,
          filter: o > 0 ? `blur(${o * LOOK.blur.text * 0.7 * L.u}px)` : undefined,
          transform: group.zone === "center" ? undefined : `translateY(${drift}px)`,
          textShadow: `0 1px 3px ${hexA(LOOK.colors.shadow, 0.6)}, 0 3px 26px ${hexA(LOOK.colors.shadow, 0.65)}`,
          textWrap: "pretty",
        }}
      >
        {isCaption ? (
          <div
            style={{
              width: 64 * L.u,
              height: 2 * L.u,
              background: LOOK.colors.accent,
              marginBottom: 22 * L.u,
              opacity: progress(frame, first, sec(0.8), easeOut),
              transform: `scaleX(${progress(frame, first, sec(0.9), easeOut)})`,
              transformOrigin: "left",
            }}
          />
        ) : null}
        {group.lines.map((line, i) => (
          <LineView key={i} line={line} L={L} styles={styles} />
        ))}
      </div>
    </div>
  );
};
