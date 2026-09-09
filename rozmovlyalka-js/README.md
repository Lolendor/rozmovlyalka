# Розмовлялька · JS

Веб-порт украинского синтезатора речи **«Розмовлялька»** (2001) на JavaScript.
Работает в браузере (подключение через `<script>` или npm) и в Node.js.
Каждая стадия конвейера (нормализация → ударения → графемы-в-фонемы → дифонный
синтез) сверена побайтово с Go-референсом из `../rozmovlialka`.

## Возможности

- **Три голоса** (1, 2, 3) и **темп 1–10** — как в оригинале.
- Диалоги и склейки: синтез реплики любым голосом и сборка общего PCM.
- Экспорт **WAV** (нативно) и **MP3** (в Node через локальный `ffmpeg`, в
  браузере — встроенный lamejs `vendor/lame.min.js`).
- Legacy-разметка `#N#V#P` внутри текста поддерживается.
- 8-битный PCM 11025 Гц моно, как в движке 2001 года.
- Ноль runtime-зависимостей; данные подгружаются отдельно (см. ниже).

## Быстрый старт (браузер, script-тег)

```html
<script src="https://unpkg.com/rozmovlyalka-js/dist/rozmovlyalka.umd.min.js"></script>
<script>
  const engine = await Rozmovlyalka.create({
    dataUrl: 'https://unpkg.com/rozmovlyalka-js/data/',
    onProgress: (loaded, total, file) => console.log(loaded, total, file),
  });

  const text = 'Доброго вечора, Україно!';
  const pcm = engine.synthesize(text, { voice: 2, rate: 5 }); // Uint8Array
  const wav = engine.synthesizeWAV(text, { voice: 1, rate: 5 });
</script>
```

Глобал `Rozmovlyalka` — это реэкспорт модуля: `Rozmovlyalka.create`,
`Rozmovlyalka.pcmToWAV`, `Rozmovlyalka.pcmToMP3`, `Rozmovlyalka.default` и т.д.
Данные (словари и голоса, ~6.5 МБ) **не вшиваются** в бандл — вы указываете
`dataUrl` (URL каталога `data/`), чтобы кэш браузера и CDN работали независимо
от кода. Можно подставить свой `fetcher` для прогресса/киберзащиты.

## npm / Node

```bash
npm install rozmovlyalka-js
```

```js
import Rozmovlyalka from 'rozmovlyalka-js'; // или require('rozmovlyalka-js') → CJS
// ESM автоматически находит каталог data/ пакета; в других окружениях:
const engine = await Rozmovlyalka.create({ dataUrl: 'https://…/data/' });

const pcm = engine.synthesize('Привіт!', { voice: 3, rate: 7 });
await engine.synthesizeMP3('Тест', { voice: 1, rate: 5, kbps: 32 });
```

MP3 в Node требует `ffmpeg` в `PATH` (сам `pcmToMP3` — обёртка над вызовом
процесса; кодек в пакет не включён).

## API

```js
await Rozmovlyalka.create({ dataUrl?, fetcher?, onProgress? }) // → engine
```

- `dataUrl` — URL/путь каталога `data/`; по умолчанию — `data/` пакета (Node)
  или определяется относительно загруженного скрипта (браузер).
- `fetcher(url)` — пользовательская функция выборки вместо `fetch` (Node
  поддерживается встроенной polyfill-реализацией через `fs`).
- `onProgress(loadedBytes, totalBytes, fileName)` — прогресс загрузки данных.

Методы движка:

- `engine.synthesize(text, { voice: '1'|'2'|'3', rate: 1..10 })` → `Uint8Array`
  (8-битный PCM, 11025 Гц).
- `engine.synthesizeWAV(text, opts)` → `Uint8Array` (готовый WAV).
- `await engine.synthesizeMP3(text, { …, kbps? })` → `Uint8Array` (MP3).
- `engine.pcmToWAV(pcm)` / `await engine.pcmToMP3(pcm, { kbps? })` — сборка
  контейнеров из готового PCM (склейка диалога, паузы).

Экспорты низкого уровня (`src/index.js`): `pipelineDebug`, `processChunk`,
`chunkSynth`, `toCP1251`/`fromCP1251`, `wavHeader`, `pcmToWAV`, `pcmToMP3`,
`gunzip`, `buildDictionaries`, `buildVoice`, `Dictionaries`, `Voice` и др.

## Демо

```bash
npm install   # только esbuild для сборки
npm run demo  # http://localhost:4173/demo/
```

`demo/` — плоский белый интерфейс в стиле Vercel: карточки реплик диалога,
каждой реплике свой голос (1/2/3), темп и громкость, Web Audio-плеер с
волновой формой на canvas, прогресс загрузки данных, экспорт WAV/MP3 и
сохранение состояния в localStorage. Никаких сборок и фреймворков:
`demo/app.js` работает напрямую с UMD-бандлом из `dist/`.

## CLI

```bash
npx roztts-js -voice 2 -rate 5 -o out.wav "Доброго вечора, Україно!"
npx roztts-js -f text.txt -o out.mp3
echo "Привіт" | npx roztts-js --stdout > out.wav
```

Флаги: `-voice 1|2|3`, `-rate 1..10`, `-o` (.wav/.mp3), `-f`, `--stdout`,
`--data-url`, `-h`.

## Сборка дистрибутивов

```bash
npm run build   # → dist/
```

- `dist/rozmovlyalka.umd.js` / `.umd.min.js` — IIFE-бандл, глобал
  `Rozmovlyalka` (script-тег, unpkg/jsDelivr через поле `unpkg`).
- `dist/rozmovlyalka.esm.js` — ESM для Node/бандлеров.
- `dist/rozmovlyalka.cjs.js` — CommonJS (`main` в `package.json`).

Данные не входят в бандлы. Пересобирать нужно только при изменении `src/`;
если меняется генерация `data/`, перегенерируйте эталоны в `tests/fixtures/`
(Go: `cd ../rozmovlialka && go test` создаёт их, см. тесты ниже).

## Тесты и паритет

```bash
npm test   # 29 тестов, включая побайтовый паритет с Go
```

- хэши sha256 PCM/WAV корпуса фраз совпадают с Go-фикстурами
  (`tests/fixtures/`), золотой WAV — `5502187c…54bfd0`;
- словари, `bsnbn`/`eudic`, раскладки голосов — покомпонентно;
- стадии конвейера (`pipelineDebug`) сверены побайтово.

## Структура

```
src/            — порт движка (без зависимостей)
data/           — словари и голоса (*.bin.gz), подключаются отдельно (~6.5 МБ)
dist/           — UMD/ESM/CJS-бандлы (собираются esbuild)
demo/           — HTML/CSS/JS-интерфейс (white/vercel-стиль, минимализм)
vendor/         — lamejs для MP3 в браузере (MIT)
bin/roztts.mjs  — CLI-утилита roztts-js
scripts/        — server для демо и сборка
tests/          — unit + паритет с Go (node --test)
```

## Лицензия и источник

MIT. Порт оригинальной «Розмовляльки» («говорилка» 2001 года, авторская
разработка украинской школы TTS); Go-референс и извлечённые данные — в
`../rozmovlialka`.
