/**
 * «КОВЁР ПОМНИТ» — настройки ролика.
 *
 * Визуальный язык построен на борцовском ковре: синее поле, красное кольцо,
 * жёлтый центр. Круги ковра — переходы, цвета ковра — плашки и акценты.
 *
 * Здесь меняются: палитра, фото, длительности сцен, ВЕСЬ текст, звук.
 * Хореография каждой сцены (точные моменты появления слов) — вверху её файла
 * в src/scenes/ в таблице `T` (секунды от начала сцены).
 */

export const FPS = 30;
export const FORMAT = { width: 1920, height: 1080 };

// ─────────────────────────────────────────────────────────────────────────────
// ПАЛИТРА И ВИД
// ─────────────────────────────────────────────────────────────────────────────

export const PALETTE = {
  /** Почти чёрный с синевой — фон типографики. */
  ink: "#0d0f16",
  /** Цвета ковра. */
  blue: "#1d4fa3",
  red: "#d63a2c",
  yellow: "#ffc61a",
  /** Текст. */
  white: "#ffffff",
  paper: "#f5efe3",
};

export const FONTS = {
  display: "Oswald",
  text: "Fira Sans Condensed",
};

export const LOOK = {
  /** Цветокоррекция фото: насыщенность / контраст / яркость. */
  photo: { saturate: 1.08, contrast: 1.06, brightness: 1.02 },
  /** Размытие человека рядом до раскрытия (px при 1080p). */
  mysteryBlur: 16,
  /** Зерно 0…1 и виньетка 0…1. */
  grain: 0.06,
  vignette: 0.38,
  /** Множитель всех встрясок камеры (0 — выключить). */
  shake: 1,
  /** Подписи на плейсхолдерах отсутствующих фото. */
  showPlaceholderLabels: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// ФОТОГРАФИИ — public/assets/photos/  (.jpg / .jpeg / .png / .webp)
// Нет файла — будет плейсхолдер с подписью.
// ─────────────────────────────────────────────────────────────────────────────

export type PhotoDef = {
  file: string;
  label: string;
  /** Точка интереса (0…1) — сюда смотрит кадрирование. */
  focus: [number, number];
  /**
   * Только для фото с Фадзаевым: что размыто до раскрытия.
   * from/to — по горизонтали (0…1); face — где его лицо (для круга-пометки).
   * me — где моё лицо.
   */
  mystery?: { from: number; to: number; face: [number, number]; me: [number, number] };
};

export const PHOTOS = {
  fadzaev: {
    file: "01_fadzaev_photo",
    label: "Я и Арсен Фадзаев, 17 лет",
    focus: [0.55, 0.38],
    mystery: { from: 0.5, to: 0.565, face: [0.44, 0.39], me: [0.66, 0.33] },
  },
  age12: { file: "02_age_12", label: "Мне 12, борцовский зал", focus: [0.52, 0.35] },
  training1: { file: "03_training_01", label: "Тренировка", focus: [0.5, 0.5] },
  training2: { file: "04_training_02", label: "Команда, тренеры", focus: [0.5, 0.42] },
  competition: { file: "05_competition", label: "Пьедестал", focus: [0.5, 0.3] },
  medal: { file: "06_medal", label: "Медаль", focus: [0.45, 0.3] },
  youth: { file: "07_youth", label: "На ковре", focus: [0.45, 0.32] },
  age24: { file: "08_age_24", label: "Я сейчас, 24 года", focus: [0.62, 0.52] },
  astana: { file: "09_astana", label: "Астана сегодня", focus: [0.5, 0.5] },
  arena: { file: "10_arena", label: "Арена чемпионата мира", focus: [0.55, 0.45] },
  crowd: { file: "11_crowd", label: "Трибуны, болельщики", focus: [0.5, 0.5] },
  mat: { file: "12_mat", label: "Борцовский ковёр", focus: [0.5, 0.5] },
  idols: { file: "13_idols", label: "С кумирами", focus: [0.5, 0.4] },
} satisfies Record<string, PhotoDef>;

export type PhotoKey = keyof typeof PHOTOS;
export const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

// ─────────────────────────────────────────────────────────────────────────────
// СЦЕНЫ — длительность в секундах
// ─────────────────────────────────────────────────────────────────────────────

export const SCENES = [
  { id: "mystery", title: "1 · Загадка", duration: 15.6 },
  { id: "age12", title: "2 · 12 лет", duration: 10.6 },
  { id: "path", title: "3 · Путь", duration: 12.4 },
  { id: "today", title: "4 · Сегодня", duration: 12.6 },
  { id: "reveal", title: "5 · Раскрытие", duration: 10.8 },
  { id: "worlds", title: "6 · Чемпионат мира", duration: 7.8 },
  { id: "finale", title: "7 · Ковёр помнит", duration: 15.6 },
] as const;

export type SceneId = (typeof SCENES)[number]["id"];

// ─────────────────────────────────────────────────────────────────────────────
// ТЕКСТ — слова сценария. `*слово*` — выделение жёлтым.
// Фразы разбиты на фрагменты так, как они появляются на экране.
// ─────────────────────────────────────────────────────────────────────────────

export const TEXT = {
  mystery: {
    me: "ЭТО Я.",
    agePrefix: "Мне",
    age: 17,
    ageSuffix: "лет.",
    nextTo: "А рядом со мной —",
    who: "человек, который",
    sevenYears: "СЕМЬ ЛЕТ",
    noLosses: "не проигрывал ни одной схватки",
    fiveYears: "и ПЯТЬ ЛЕТ",
    noPoints: "не отдавал ни одного балла",
    official: "на официальных соревнованиях.",
    toUnderstand: ["Но чтобы понять,", "почему *эта фотография*", "для меня так много значит..."],
    goBack: ["...нужно вернуться", "на *пять лет* назад."],
  },
  age12: {
    agePrefix: "Мне",
    age: 12,
    firstTime: ["Впервые я переступаю", "*порог* борцовского зала."],
    didntKnow: "Тогда я ещё не знал,",
    matBecame: "что этот *ковёр* станет частью",
    parts: ["моего детства,", "моей юности"],
    myself: "И МЕНЯ САМОГО.",
  },
  path: {
    here: "ЗДЕСЬ",
    and: "И",
    learned: "я учился",
    win: "ПОБЕЖДАТЬ.",
    lose: "ПРОИГРЫВАТЬ.",
    knew: "я узнал, что значит",
    fight: "БОРОТЬСЯ ДО КОНЦА.",
    had: "у меня появились свои",
    idols: "КУМИРЫ.",
  },
  today: {
    prefix: "Сегодня мне",
    age: 24,
    list: ["Университет.", "Магистратура.", "Семья.", "Работа.", "*Другая жизнь.*"],
    noMore: "Я больше не выхожу на ковёр.",
    forget: ["Но разве можно забыть то,", "что когда-то было", "*частью тебя?*"],
  },
  reveal: {
    lines: ["Именно поэтому в тот день", "я был одним из самых"],
    happiest: "СЧАСТЛИВЫХ",
    end: "людей на земле.",
    name: "АРСЕН ФАДЗАЕВ",
    title: "двукратный олимпийский чемпион",
  },
  worlds: {
    so: "Поэтому",
    worlds: "чемпионат мира",
    year: 2026,
    yearWord: "года",
    where: "в КАЗАХСТАНЕ —",
    more: ["это", "БОЛЬШЕ,", "чем просто"],
    tournament: "большой спортивный турнир.",
  },
  finale: {
    forSome: "Для кого-то —",
    competition: "это соревнования.",
    idols: "возможность увидеть своих *кумиров.*",
    forMe: "А для таких, как я...",
    again: "...возможность снова почувствовать себя",
    twelve: "ДВЕНАДЦАТИЛЕТНИМ",
    boy: ["тем", "мальчишкой,"],
    firstMat: "который впервые вышел на ковёр.",
    title: "КОВЁР ПОМНИТ.",
    tag: "ASTANA · 2026",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ЗВУК — public/assets/audio/
// Сейчас там синтезированные заготовки (node scripts/make-placeholder-audio.mjs).
// Замените файлы своими с теми же именами.
// Громкость фона: [сцена, секунда в сцене, громкость 0…1].
// ─────────────────────────────────────────────────────────────────────────────

export type VolumeKey = [sceneId: SceneId, at: number, volume: number];
export type AudioLayer = { id: string; file: string; start?: [SceneId, number]; volume: VolumeKey[] };

/** Звуковые эффекты, которые сцены вызывают по имени. */
export const SFX = {
  whoosh: "sfx_whoosh.mp3",
  whooshFast: "sfx_whoosh_fast.mp3",
  hit: "sfx_hit.mp3",
  boom: "sfx_boom.mp3",
  riser: "sfx_riser.mp3",
  tick: "sfx_tick.mp3",
  rewind: "sfx_rewind.mp3",
  flip: "sfx_flip.mp3",
  shutter: "sfx_shutter.mp3",
  pop: "sfx_text_1.mp3",
  pop2: "sfx_text_2.mp3",
  pop3: "sfx_text_3.mp3",
  sparkle: "sfx_sparkle.mp3",
  draw: "sfx_draw.mp3",
  slap: "mat_slap.mp3",
} as const;
export type SfxName = keyof typeof SFX;

export const AUDIO: {
  /** Общая громкость музыки и атмосферы (убавьте под голос). */
  music: number;
  /** Общая громкость SFX. */
  sfx: number;
  /** Закадровый голос: файл в assets/audio, звучит с 0:00. */
  voiceover: string | null;
  layers: AudioLayer[];
} = {
  music: 0.85,
  sfx: 0.7,
  voiceover: null,
  layers: [
    {
      id: "heartbeat",
      file: "heartbeat.mp3",
      volume: [
        ["mystery", 0, 0.55],
        ["mystery", 6, 0.35],
        ["mystery", 13, 0.25],
        ["mystery", 14.6, 0],
        ["finale", 5.2, 0],
        ["finale", 5.6, 0.45],
        ["finale", 7.4, 0.2],
        ["finale", 8, 0],
      ],
    },
    {
      id: "drone",
      file: "ambient_drone.mp3",
      volume: [
        ["mystery", 0, 0],
        ["mystery", 1.5, 0.35],
        ["age12", 0, 0.25],
        ["today", 5.5, 0.3],
        ["reveal", 0, 0.3],
        ["worlds", 0, 0.12],
        ["finale", 11.2, 0.15],
        ["finale", 11.3, 0],
      ],
    },
    {
      id: "gym",
      file: "gym_room.mp3",
      volume: [
        ["mystery", 15.2, 0],
        ["age12", 1.2, 0.45],
        ["age12", 10, 0.2],
        ["path", 0.5, 0],
      ],
    },
    {
      id: "pad",
      file: "swell_pad.mp3",
      volume: [
        ["age12", 0, 0],
        ["age12", 2, 0.25],
        ["path", 0, 0.2],
        ["today", 0, 0.3],
        ["today", 6, 0.22],
        ["reveal", 2.6, 0.25],
        ["reveal", 6.5, 0.75],
        ["worlds", 0, 0.35],
        ["finale", 11.2, 0.4],
        ["finale", 11.3, 0],
      ],
    },
    {
      id: "drive",
      file: "drive_rhythm.mp3",
      start: ["path", 0],
      volume: [
        ["path", 0, 0.7],
        ["path", 11.2, 0.75],
        ["path", 12.3, 0],
      ],
    },
    {
      id: "joy",
      file: "joy_groove.mp3",
      start: ["reveal", 5.6],
      volume: [
        ["reveal", 5.6, 0],
        ["reveal", 7.2, 0.6],
        ["worlds", 0, 0.8],
        ["finale", 5.0, 0.7],
        ["finale", 5.5, 0],
        ["finale", 7.4, 0],
        ["finale", 8.6, 0.65],
        ["finale", 11.2, 0.85],
        ["finale", 11.3, 0],
      ],
    },
    {
      id: "crowd",
      file: "arena_crowd.mp3",
      volume: [
        ["worlds", 0, 0],
        ["worlds", 0.8, 0.4],
        ["finale", 0, 0.35],
        ["finale", 5.0, 0],
        ["finale", 9.0, 0.2],
        ["finale", 11.2, 0.4],
        ["finale", 11.3, 0],
      ],
    },
  ],
};
