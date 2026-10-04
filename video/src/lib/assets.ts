import { createContext, useContext } from "react";
import { staticFile } from "remotion";
import { AUDIO, PHOTO_EXTENSIONS, PHOTOS, PhotoKey } from "../config";

export type PhotoInfo = { src: string; w: number; h: number } | null;
export type Assets = {
  photos: Record<string, PhotoInfo>;
  /** Audio files that exist in public/assets/audio → duration in seconds. */
  audio: Record<string, number>;
};

export const AssetsContext = createContext<Assets>({ photos: {}, audio: {} });
export const useAssets = () => useContext(AssetsContext);
export const usePhoto = (key: PhotoKey): PhotoInfo => useAssets().photos[key] ?? null;

const loadImage = (src: string) =>
  new Promise<PhotoInfo>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ src, w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });

const audioDuration = (src: string) =>
  new Promise<number | null>((resolve) => {
    const el = document.createElement("audio");
    el.preload = "metadata";
    el.onloadedmetadata = () => resolve(Number.isFinite(el.duration) ? el.duration : null);
    el.onerror = () => resolve(null);
    el.src = src;
  });

/** Finds which photos and audio files are present; missing photos become placeholders. */
export const probeAssets = async (): Promise<Assets> => {
  const photos: Record<string, PhotoInfo> = {};
  await Promise.all(
    (Object.keys(PHOTOS) as PhotoKey[]).map(async (key) => {
      for (const ext of PHOTO_EXTENSIONS) {
        const info = await loadImage(staticFile(`assets/photos/${PHOTOS[key].file}.${ext}`));
        if (info) {
          photos[key] = info;
          return;
        }
      }
      photos[key] = null;
    }),
  );

  const files = [
    ...AUDIO.layers.map((l) => l.file),
    ...AUDIO.sfx.line,
    AUDIO.sfx.display,
    ...(AUDIO.voiceover ? [AUDIO.voiceover] : []),
  ];
  const durations = await Promise.all(files.map((f) => audioDuration(staticFile(`assets/audio/${f}`))));
  const audio: Record<string, number> = {};
  files.forEach((f, i) => {
    const d = durations[i];
    if (d) audio[f] = d;
  });
  return { photos, audio };
};
