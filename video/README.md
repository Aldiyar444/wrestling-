# «Ковёр помнит»

Короткий документальный motion-design ролик, собранный только из фотографий, на [Remotion](https://www.remotion.dev).

Две версии:

- `KoverPomnit` — 1920×1080, основная;
- `KoverPomnit-Vertical` — 1080×1920, для телефона (Reels / Shorts / TikTok).

## Запуск

```bash
npm i
npm run dev                                   # Remotion Studio: превью и таймлайн
npx remotion render KoverPomnit out/kover-pomnit.mp4
npx remotion render KoverPomnit-Vertical out/kover-pomnit-vertical.mp4
```

## Что где менять

Всё настраивается в одном файле: **`src/config.ts`**.

- `LOOK` — цвета фона, текста и акцента, шрифты, цветокоррекция прошлого и настоящего,
  blur, zoom, длительность переходов, зерно, виньетка, сила встрясок, общий темп `timeScale`.
- `PHOTOS` — имена файлов фотографий. Сами фото лежат в `public/assets/photos/`
  (см. README там же). Если фото нет, вместо него показывается плейсхолдер с подписью.
- `SCENES` — семь сцен: длительность, кадры (какое фото, кадрирование, движение камеры,
  тип перехода) и фразы со временем появления. `*слово*` — крупнее, `[слово]` — акцентный цвет.
- `AUDIO` — звуковые слои и их громкость по сценам. Громкость привязана к сценам,
  поэтому при изменении таймингов звук сдвигается вместе с ними.

## Звук

В `public/assets/audio/` лежат синтезированные заготовки (ambient, дыхание, зал, ритм,
эмоциональный пэд, трибуны, хлопок по ковру), сгенерированные скриптом:

```bash
node scripts/make-placeholder-audio.mjs
```

Это черновой звук для монтажа. Для финальной версии замените файлы музыкой и шумами
из библиотеки (те же имена файлов). Если записать закадровый голос, укажите файл в
`AUDIO.voiceover`.

## Структура

```
src/config.ts               все параметры и сценарий
src/Film.tsx                сборка ролика: сцены → зерно/виньетка → звук
src/components/SceneView    общая сцена: фото, затемнение, текст
src/components/ShotLayer    одно фото: кадрирование, движение, переходы, выборочный blur
src/components/TextGroupView  появление фраз
src/components/Placeholder  плейсхолдеры для отсутствующих фото
src/components/Soundtrack   звуковые слои
scripts/make-placeholder-audio.mjs  генератор звуковых заготовок
```

## Рендер в облачной сессии Claude Code

Remotion скачивает свой браузер с `remotion.media`, который может быть заблокирован сетью.
В этом случае укажите уже установленный:
`--browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`
