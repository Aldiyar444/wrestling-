import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { LOOK } from "../config";

const LATIN =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const CYRILLIC = "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116";

const faces: [family: string, prefix: string, weights: number[], style: "normal" | "italic"][] = [
  [LOOK.fonts.display, "oswald", [200, 300, 400, 500, 600], "normal"],
  [LOOK.fonts.text, "fira-sans-condensed", [300, 400, 500, 600], "normal"],
  [LOOK.fonts.text, "fira-sans-condensed", [500, 600], "italic"],
];

let loaded = false;

export const loadFonts = () => {
  if (loaded || typeof document === "undefined") return;
  loaded = true;
  const handle = delayRender("Loading fonts");
  const all = faces.flatMap(([family, prefix, weights, style]) =>
    weights.flatMap((weight) =>
      (
        [
          ["latin", LATIN],
          ["cyrillic", CYRILLIC],
        ] as const
      ).map(([subset, range]) => {
        const face = new FontFace(
          family,
          `url(${staticFile(`fonts/${prefix}-${subset}-${weight}-${style}.woff2`)}) format("woff2")`,
          { weight: String(weight), style, unicodeRange: range },
        );
        document.fonts.add(face);
        return face.load();
      }),
    ),
  );
  Promise.all(all)
    .then(() => continueRender(handle))
    .catch((err) => cancelRender(err));
};
