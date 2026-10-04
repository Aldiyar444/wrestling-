/**
 * «КОВЁР ПОМНИТ» — все настройки ролика в одном месте.
 *
 * Здесь меняются: фотографии, тайминги сцен и фраз, цвета, blur, zoom,
 * длительность переходов, зерно, виньетка и громкость звуковых слоёв.
 * Логику (src/components, src/Film.tsx) трогать не нужно.
 *
 * Все времена — в секундах. Время фраз и кадров считается от начала своей сцены.
 */

export const FPS = 30;

export const FORMATS = {
  landscape: { width: 1920, height: 1080 },
  vertical: { width: 1080, height: 1920 },
};

// ─────────────────────────────────────────────────────────────────────────────
// ВНЕШНИЙ ВИД
// ─────────────────────────────────────────────────────────────────────────────

export const LOOK = {
  /**
   * Общий масштаб времени. 1 — темп, при котором весь текст сценария спокойно
   * читается (~81 с). 0.74 — ровно ~60 с, но длинные фразы будут мелькать.
   * Лучше сокращать текст или длительность отдельных сцен ниже.
   */
  timeScale: 1,

  colors: {
    background: "#0a0a0b",
    placeholder: "#141416",
    text: "#f3f1ec",
    textMuted: "rgba(243, 241, 236, 0.6)",
    /** Единственный акцент: приглушённое золото медали. Используется очень редко. */
    accent: "#c9a66b",
  },

  fonts: {
    display: "Oswald",
    text: "Fira Sans Condensed",
  },

  /** Цветокоррекция фото. Прошлое — чуть теплее, настоящее — чуть холоднее. */
  grade: {
    past: { grayscale: 0.84, sepia: 0.26, hue: 0, contrast: 1.06, brightness: 0.9 },
    neutral: { grayscale: 0.9, sepia: 0.08, hue: 0, contrast: 1.06, brightness: 0.92 },
    present: { grayscale: 0.88, sepia: 0.16, hue: 178, contrast: 1.1, brightness: 0.88 },
  },

  blur: {
    /** Размытие человека рядом со мной до момента раскрытия (px при 1080p). */
    mystery: 34,
    /** Насколько затемнён размытый человек (1 — без затемнения). */
    mysteryDarken: 0.72,
    /** Blur → focus при появлении кадра. */
    focusIn: 16,
    /** Blur при появлении/исчезновении текста. */
    text: 10,
  },

  zoom: {
    /** Стартовый масштаб «резкого» перехода (snap), оседает до 1. */
    snapFrom: 1.14,
    /** Масштаб размытого фона-параллакса. */
    parallaxBackground: 1.22,
  },

  /** Длительность переходов, сек. */
  transitions: {
    fade: 1.1,
    wipe: 0.6,
    snap: 0.55,
    whip: 0.5,
    cut: 0,
    textIn: 0.7,
    textOut: 0.6,
    sceneFadeOut: 0.7,
  },

  /** Зерно плёнки 0…1. */
  grain: 0.14,
  /** Виньетка 0…1. */
  vignette: 0.72,
  /** Общий множитель для всех встрясок камеры (0 — выключить). */
  shake: 1,
  /** Подписи на плейсхолдерах отсутствующих фото. */
  showPlaceholderLabels: true,
};

export type Tone = keyof typeof LOOK.grade;

// ─────────────────────────────────────────────────────────────────────────────
// ФОТОГРАФИИ — public/assets/photos/
// Подойдут .jpg, .jpeg, .png или .webp с тем же именем.
// Если файла нет — на его месте будет аккуратный плейсхолдер с подписью.
// ─────────────────────────────────────────────────────────────────────────────

export type PlaceholderKind =
  | "portrait"
  | "group"
  | "mat"
  | "city"
  | "arena"
  | "crowd";

export type PhotoDef = {
  file: string;
  label: string;
  kind: PlaceholderKind;
  /**
   * Только для фото с Фадзаевым: какая часть кадра (по горизонтали, 0…1)
   * размыта до раскрытия. Всё левее `from` размыто полностью, к `to` blur
   * плавно исчезает. Если замените фото — поправьте эти числа.
   */
  mystery?: { from: number; to: number };
};

export const PHOTOS = {
  fadzaev: {
    file: "01_fadzaev_photo",
    label: "Я и Арсен Фадзаев, 17 лет",
    kind: "portrait",
    mystery: { from: 0.5, to: 0.565 },
  },
  age12: { file: "02_age_12", label: "Мне 12, борцовский зал", kind: "group" },
  training1: { file: "03_training_01", label: "Тренировка", kind: "group" },
  training2: { file: "04_training_02", label: "Тренировка / команда", kind: "group" },
  competition: { file: "05_competition", label: "Соревнования", kind: "mat" },
  medal: { file: "06_medal", label: "Медаль", kind: "portrait" },
  youth: { file: "07_youth", label: "Юность, после схватки", kind: "portrait" },
  age24: { file: "08_age_24", label: "Я сейчас, 24 года", kind: "portrait" },
  astana: { file: "09_astana", label: "Астана сегодня", kind: "city" },
  arena: { file: "10_arena", label: "Арена, флаги", kind: "arena" },
  crowd: { file: "11_crowd", label: "Трибуны, болельщики", kind: "crowd" },
  mat: { file: "12_mat", label: "Борцовский ковёр", kind: "mat" },
} satisfies Record<string, PhotoDef>;

export type PhotoKey = keyof typeof PHOTOS;

export const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

// ─────────────────────────────────────────────────────────────────────────────
// СЦЕНАРИЙ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * framing:
 *   "panel" — фото выходит из темноты с одной стороны, текст в темноте рядом
 *             (в вертикальном формате — фото сверху, текст снизу);
 *   "full"  — фото на весь кадр, текст внизу поверх мягкой тени.
 * focus:  точка интереса на фото (0…1 по x и y) — к ней идёт zoom.
 * zoom:   [масштаб в начале кадра, масштаб в конце] — slow zoom / push-in / zoom-out.
 * pan:    смещение за время кадра, % от ширины/высоты.
 * reveal: как кадр появляется — fade (из темноты, blur→focus), wipe (mask reveal),
 *         snap (резкий, но мягко оседающий), whip (движение с motion blur), cut.
 */
export type Shot = {
  photo: PhotoKey;
  at: number;
  framing?: "panel" | "full";
  focus?: [number, number];
  zoom?: [number, number];
  pan?: [number, number];
  tone?: Tone;
  reveal?: "fade" | "wipe" | "snap" | "whip" | "cut";
  revealDuration?: number;
  direction?: "left" | "right" | "up" | "down";
  /** Размытый фон, движущийся медленнее фото (parallax). */
  parallax?: boolean;
  /** Размыть человека рядом (см. PHOTOS.fadzaev.mystery). */
  mystery?: boolean;
};

/**
 * Текст: `*слово*` — крупнее и плотнее, `[слово]` — акцентный цвет.
 * style: display — крупная короткая фраза; body — фраза-повествование;
 *        list — короткие слова-списки; name / caption — подпись к человеку;
 *        title / tag — финальная надпись.
 */
export type TextStyle = "display" | "body" | "list" | "name" | "caption" | "title" | "tag";
export type Line = {
  at: number;
  text: string;
  style?: TextStyle;
  /** Финальный удар: появляется быстро, вместе с хлопком. */
  impact?: boolean;
  /** Дополнительный воздух над строкой (в высотах строки). */
  space?: number;
};
export type TextGroup = {
  /** Время исчезновения всей группы. */
  out: number;
  zone: "side" | "lower" | "center" | "caption";
  lines: Line[];
};

export type Scene = {
  id: string;
  title: string;
  duration: number;
  shots: Shot[];
  text: TextGroup[];
  /** Затемнение кадра: [время, 0…1]. */
  dim?: [number, number][];
  /** Встряски камеры: очень аккуратно, только в эмоциональные моменты. */
  shakes?: { at: number; duration: number; amount: number }[];
  /** Плавное снятие blur с человека рядом: силуэт → лицо → полностью. */
  unblur?: { start: number; face: number; end: number };
  /** Уйти в чёрный в конце сцены. */
  fadeOut?: boolean;
};

/** Момент, когда появляется «КОВЁР ПОМНИТ.» (и звучит хлопок по ковру). */
export const FINAL_TITLE_AT = 11.9;
/** Момент начала раскрытия Фадзаева (после слова «счастливых»). */
export const REVEAL = { start: 3.1, face: 4.9, end: 7.6 };

export const SCENES: Scene[] = [
  // ── СЦЕНА 1 — ЗАГАДКА ────────────────────────────────────────────────────
  {
    id: "mystery",
    title: "1 · Загадка",
    duration: 15.7,
    shots: [
      {
        photo: "fadzaev",
        at: 0.2,
        framing: "panel",
        focus: [0.6, 0.36],
        zoom: [1.0, 1.1],
        pan: [-1.5, 0],
        tone: "neutral",
        reveal: "fade",
        revealDuration: 2.8,
        mystery: true,
      },
    ],
    dim: [
      [0, 0],
      [10.6, 0],
      [12.2, 0.5],
      [15.0, 0.82],
    ],
    text: [
      {
        out: 4.0,
        zone: "side",
        lines: [
          { at: 1.4, text: "Это я.", style: "display" },
          { at: 2.4, text: "Мне [17] лет.", style: "display" },
        ],
      },
      {
        out: 10.6,
        zone: "side",
        lines: [
          { at: 4.4, text: "А рядом со мной —" },
          { at: 5.3, text: "человек, который *семь лет*" },
          { at: 6.2, text: "не проигрывал ни одной схватки" },
          { at: 7.5, text: "и *пять лет* не отдавал" },
          { at: 8.3, text: "ни одного балла" },
          { at: 8.9, text: "на официальных соревнованиях." },
        ],
      },
      {
        out: 13.3,
        zone: "side",
        lines: [
          { at: 10.9, text: "Но чтобы понять, почему эта фотография" },
          { at: 11.6, text: "для меня так много значит..." },
        ],
      },
      {
        out: 15.1,
        zone: "side",
        lines: [
          { at: 13.6, text: "...нужно вернуться" },
          { at: 14.0, text: "на *пять лет* назад." },
        ],
      },
    ],
    fadeOut: true,
  },

  // ── СЦЕНА 2 — 12 ЛЕТ ─────────────────────────────────────────────────────
  {
    id: "age12",
    title: "2 · 12 лет",
    duration: 10.2,
    shots: [
      {
        photo: "age12",
        at: 0,
        framing: "panel",
        focus: [0.5, 0.42],
        zoom: [1.04, 1.13],
        pan: [0, -1],
        tone: "past",
        reveal: "snap",
        parallax: true,
      },
      {
        photo: "training1",
        at: 4.5,
        framing: "full",
        focus: [0.5, 0.45],
        zoom: [1.12, 1.03],
        pan: [2, 0],
        tone: "past",
        reveal: "wipe",
        direction: "right",
      },
      {
        photo: "training2",
        at: 7.3,
        framing: "full",
        focus: [0.5, 0.4],
        zoom: [1.03, 1.11],
        pan: [-1.5, 0],
        tone: "past",
        reveal: "wipe",
        direction: "up",
      },
    ],
    text: [
      {
        out: 4.2,
        zone: "side",
        lines: [
          { at: 0.7, text: "Мне [12].", style: "display" },
          { at: 1.8, text: "Впервые я переступаю" },
          { at: 2.4, text: "порог борцовского зала." },
        ],
      },
      {
        out: 9.9,
        zone: "lower",
        lines: [
          { at: 4.9, text: "Тогда я ещё не знал," },
          { at: 5.7, text: "что этот ковёр станет частью" },
          { at: 6.7, text: "моего детства, моей юности" },
          { at: 7.8, text: "*и меня самого.*" },
        ],
      },
    ],
  },

  // ── СЦЕНА 3 — ПУТЬ ───────────────────────────────────────────────────────
  {
    id: "path",
    title: "3 · Путь",
    duration: 10.6,
    shots: [
      { photo: "competition", at: 0, framing: "full", zoom: [1.06, 1.14], tone: "past", reveal: "wipe", direction: "right" },
      { photo: "medal", at: 1.35, framing: "full", focus: [0.45, 0.28], zoom: [1.35, 1.5], tone: "past", reveal: "wipe", direction: "up" },
      { photo: "training2", at: 2.7, framing: "full", focus: [0.52, 0.42], zoom: [1.75, 1.6], pan: [2, 0], tone: "past", reveal: "wipe", direction: "left" },
      { photo: "youth", at: 4.05, framing: "full", zoom: [1.1, 1.2], tone: "past", reveal: "snap" },
      { photo: "age12", at: 5.4, framing: "full", focus: [0.64, 0.38], zoom: [1.45, 1.62], tone: "past", reveal: "snap" },
      { photo: "training1", at: 6.9, framing: "full", focus: [0.52, 0.38], zoom: [1.6, 1.5], pan: [-1.5, 0], tone: "past", reveal: "wipe", direction: "right" },
      // кумиры — роспись с борцами на стене зала
      { photo: "age12", at: 8.3, framing: "full", focus: [0.12, 0.14], zoom: [1.9, 2.05], tone: "past", reveal: "fade", revealDuration: 0.9 },
    ],
    text: [
      { out: 2.5, zone: "lower", lines: [{ at: 0.3, text: "Здесь я учился *побеждать*." }] },
      { out: 5.0, zone: "lower", lines: [{ at: 2.85, text: "Здесь я учился *проигрывать*." }] },
      {
        out: 7.9,
        zone: "lower",
        lines: [
          { at: 5.3, text: "Здесь я узнал, что значит" },
          { at: 5.9, text: "*бороться до конца.*" },
        ],
      },
      {
        out: 10.2,
        zone: "lower",
        lines: [
          { at: 8.4, text: "И здесь у меня появились" },
          { at: 9.0, text: "свои [кумиры]." },
        ],
      },
    ],
    shakes: [{ at: 5.9, duration: 0.7, amount: 1 }],
    fadeOut: true,
  },

  // ── СЦЕНА 4 — НАСТОЯЩЕЕ ──────────────────────────────────────────────────
  {
    id: "today",
    title: "4 · Настоящее",
    duration: 12.0,
    shots: [
      {
        photo: "age24",
        at: 0.3,
        framing: "panel",
        focus: [0.5, 0.36],
        zoom: [1.13, 1.0],
        tone: "present",
        reveal: "fade",
        revealDuration: 1.8,
      },
    ],
    dim: [
      [0, 0.3],
      [6.2, 0.3],
      [7.0, 0.5],
    ],
    text: [
      {
        out: 6.0,
        zone: "side",
        lines: [
          { at: 0.9, text: "Сегодня мне [24].", style: "display" },
          { at: 2.2, text: "Университет.", style: "list" },
          { at: 2.7, text: "Магистратура.", style: "list" },
          { at: 3.2, text: "Семья.", style: "list" },
          { at: 3.7, text: "Работа.", style: "list" },
          { at: 4.3, text: "Другая жизнь.", style: "list" },
        ],
      },
      {
        out: 11.3,
        zone: "side",
        lines: [
          { at: 6.8, text: "Я больше не выхожу на ковёр." },
          { at: 8.6, text: "Но разве можно забыть то,", space: 1.1 },
          { at: 9.2, text: "что когда-то было *частью тебя?*" },
        ],
      },
    ],
    fadeOut: true,
  },

  // ── СЦЕНА 5 — РАСКРЫТИЕ ──────────────────────────────────────────────────
  {
    id: "reveal",
    title: "5 · Раскрытие",
    duration: 10.6,
    shots: [
      {
        photo: "fadzaev",
        at: 0,
        framing: "full",
        focus: [0.53, 0.36],
        zoom: [1.07, 1.15],
        pan: [0.8, 0],
        tone: "neutral",
        reveal: "fade",
        revealDuration: 1.3,
        mystery: true,
      },
    ],
    unblur: REVEAL,
    text: [
      {
        out: 6.2,
        zone: "lower",
        lines: [
          { at: 0.9, text: "Именно поэтому в тот день" },
          { at: 1.8, text: "я был одним из самых *счастливых*" },
          { at: 2.9, text: "людей на земле." },
        ],
      },
      {
        out: 10.3,
        zone: "caption",
        lines: [
          { at: 7.7, text: "Арсен Фадзаев", style: "name" },
          { at: 8.1, text: "двукратный олимпийский чемпион", style: "caption" },
        ],
      },
    ],
  },

  // ── СЦЕНА 6 — ЧЕМПИОНАТ МИРА ─────────────────────────────────────────────
  {
    id: "worlds",
    title: "6 · Чемпионат мира",
    duration: 6.8,
    shots: [
      { photo: "astana", at: 0, framing: "full", zoom: [1.02, 1.1], pan: [-2, 0], tone: "present", reveal: "whip", direction: "left" },
      { photo: "arena", at: 3.3, framing: "full", zoom: [1.12, 1.04], tone: "present", reveal: "wipe", direction: "up" },
    ],
    text: [
      {
        out: 3.6,
        zone: "lower",
        lines: [
          { at: 0.6, text: "Поэтому чемпионат мира [2026] года" },
          { at: 1.3, text: "в Казахстане —" },
        ],
      },
      {
        out: 6.6,
        zone: "lower",
        lines: [
          { at: 3.9, text: "это больше, чем просто" },
          { at: 4.5, text: "большой спортивный турнир." },
        ],
      },
    ],
  },

  // ── СЦЕНА 7 — ГЛАВНАЯ МЫСЛЬ ──────────────────────────────────────────────
  {
    id: "finale",
    title: "7 · Ковёр помнит",
    duration: 15.6,
    shots: [
      { photo: "crowd", at: 0, framing: "full", zoom: [1.1, 1.02], pan: [1.5, 0], tone: "present", reveal: "fade", revealDuration: 0.9 },
      { photo: "mat", at: 6.0, framing: "full", focus: [0.5, 0.55], zoom: [1.0, 1.12], tone: "past", reveal: "fade", revealDuration: 1.6 },
    ],
    dim: [
      [0, 0],
      [10.8, 0],
      [11.2, 1],
    ],
    text: [
      { out: 2.5, zone: "lower", lines: [{ at: 0.6, text: "Для кого-то — это соревнования." }] },
      {
        out: 5.4,
        zone: "lower",
        lines: [
          { at: 2.9, text: "Для кого-то — возможность" },
          { at: 3.5, text: "увидеть своих [кумиров]." },
        ],
      },
      { out: 7.2, zone: "lower", lines: [{ at: 5.8, text: "А для таких, как я..." }] },
      {
        out: 10.8,
        zone: "lower",
        lines: [
          { at: 7.5, text: "...возможность снова почувствовать себя" },
          { at: 8.3, text: "тем *двенадцатилетним* мальчишкой," },
          { at: 9.1, text: "который впервые вышел на ковёр." },
        ],
      },
      {
        out: 15.0,
        zone: "center",
        lines: [
          { at: FINAL_TITLE_AT, text: "КОВЁР ПОМНИТ.", style: "title", impact: true },
          { at: FINAL_TITLE_AT + 0.9, text: "ASTANA · 2026", style: "tag" },
        ],
      },
    ],
    shakes: [{ at: FINAL_TITLE_AT, duration: 0.45, amount: 0.8 }],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ЗВУК — public/assets/audio/
// Сейчас там синтезированные заготовки (scripts/make-placeholder-audio.mjs).
// Замените файлы своими (те же имена) — громкость по сценам останется.
// Громкость задаётся точками [сцена, секунда в сцене, громкость 0…1],
// поэтому при изменении таймингов звук сдвигается вместе со сценами.
// ─────────────────────────────────────────────────────────────────────────────

export type VolumeKey = [sceneId: string, at: number, volume: number];
export type AudioLayer = {
  id: string;
  file: string;
  loop: boolean;
  /** Для одиночных звуков: когда начинается. */
  start?: [sceneId: string, at: number];
  volume: VolumeKey[];
};

export const AUDIO: { master: number; voiceover: string | null; layers: AudioLayer[] } = {
  master: 0.9,
  /** Если запишете закадровый голос — положите файл в assets/audio и впишите имя. */
  voiceover: null,
  layers: [
    {
      // тихий ambient на всём протяжении, обрывается в самом конце
      id: "ambient",
      file: "ambient_drone.mp3",
      loop: true,
      volume: [
        ["mystery", 0, 0],
        ["mystery", 2.5, 0.45],
        ["mystery", 11, 0.3],
        ["age12", 0, 0.32],
        ["today", 0, 0.42],
        ["reveal", 0, 0.38],
        ["worlds", 0, 0.28],
        ["finale", 10.75, 0.28],
        ["finale", 10.85, 0],
      ],
    },
    {
      // дыхание в начале
      id: "breath",
      file: "breath.mp3",
      loop: false,
      start: ["mystery", 0.4],
      volume: [
        ["mystery", 0, 0.55],
        ["mystery", 9, 0.4],
        ["mystery", 12, 0],
      ],
    },
    {
      // далёкий шум зала → зал рядом: шаги, голоса, движение по мату
      id: "gym",
      file: "gym_room.mp3",
      loop: true,
      volume: [
        ["mystery", 0, 0],
        ["mystery", 3, 0.12],
        ["mystery", 15, 0.08],
        ["age12", 0, 0.6],
        ["age12", 10, 0.55],
        ["path", 0, 0.38],
        ["path", 10, 0.2],
        ["path", 10.6, 0],
      ],
    },
    {
      // спортивный ритм в «Пути», и снова — в финале
      id: "pulse",
      file: "pulse_rhythm.mp3",
      loop: true,
      volume: [
        ["age12", 6, 0],
        ["path", 0, 0.35],
        ["path", 8, 0.75],
        ["path", 10.4, 0.6],
        ["today", 0, 0],
        ["worlds", 0, 0],
        ["worlds", 0.4, 0.7],
        ["finale", 6, 0.5],
        ["finale", 10.75, 0.85],
        ["finale", 10.85, 0],
      ],
    },
    {
      // эмоциональный пэд: тихо → почти исчезает в «Настоящем» → подъём при раскрытии
      id: "swell",
      file: "swell_pad.mp3",
      loop: true,
      volume: [
        ["mystery", 0, 0],
        ["mystery", 6, 0.12],
        ["age12", 0, 0.18],
        ["path", 0, 0.35],
        ["path", 10.6, 0.3],
        ["today", 0.5, 0.04],
        ["reveal", 0, 0.06],
        ["reveal", REVEAL.start, 0.12],
        ["reveal", REVEAL.end, 0.85],
        ["worlds", 0, 0.8],
        ["finale", 10.75, 0.95],
        ["finale", 10.85, 0],
      ],
    },
    {
      // атмосфера арены и болельщиков
      id: "crowd",
      file: "arena_crowd.mp3",
      loop: true,
      volume: [
        ["worlds", 0, 0],
        ["worlds", 1.2, 0.45],
        ["finale", 0, 0.7],
        ["finale", 6, 0.35],
        ["finale", 10.75, 0.55],
        ["finale", 10.85, 0],
      ],
    },
    {
      // финальный хлопок ладонью по ковру
      id: "slap",
      file: "mat_slap.mp3",
      loop: false,
      start: ["finale", FINAL_TITLE_AT],
      volume: [["finale", 0, 1]],
    },
  ],
};
