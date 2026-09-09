// Публичный API: текст (эмуляция cp1251-конвейера оригинальной программы) →
// PCM / WAV / MP3. Один экземпляр держит словари и все три голоса.
import { toCP1251 } from './cp1251.js';
import { chDot, chSpace, setPunct, setDigit } from './sets.js';
import { expandAbbreviations } from './abbrev.js';
import { expandNumbers } from './numbers.js';
import { expandEnglish } from './english.js';
import { normalizeText } from './normalize.js';
import { stressText } from './stress.js';
import { g2p } from './g2p.js';
import { synthPCM } from './synth.js';
import { loadDataBundle } from './data.js';
import { pcmToWAV } from './wav.js';
import { pcmToMP3 } from './mp3.js';
import { defaultDataUrl } from './module-dir.js';
import { Bytes, cat, at } from './util.js';

export const SAMPLE_RATE = 11025;

export const OPTIONS_DEFAULTS = Object.freeze({ voice: '1', rate: 5 });

function validateOptions(opts) {
  let { voice, rate } = { ...OPTIONS_DEFAULTS, ...(opts || {}) };
  if (!voice || voice === 0) voice = '1';
  if (voice !== '1' && voice !== '2' && voice !== '3') {
    throw new Error(`rozmovlyalka-js: неизвестный голос ${JSON.stringify(voice)} (ожидается '1', '2' или '3')`);
  }
  if (!rate || rate === 0) rate = 5;
  if (rate < 1 || rate > 10) {
    throw new Error(`rozmovlyalka-js: скорость ${rate} вне диапазона 1..10`);
  }
  return { voice: String(voice), rate };
}

// processChunk — конвейер одного фрагмента + "\r\n".
export function processChunk(acc, dicts, voice, rate) {
  let s = cat(acc, new Uint8Array([0x0d, 0x0a]));
  s = expandAbbreviations(s);
  s = expandNumbers(s);
  s = expandEnglish(s, dicts);
  s = normalizeText(s);
  if (s.length < 2) return null;
  s = stressText(dicts, s);
  s = g2p(s);
  return synthPCM(s, voice, rate);
}

// chunkSynth — цикл главной процедуры 0x46791c..0x467c7f. Поддержана и
// команда «#» переключения голоса (как в оригинале, включая её причуды).
export function chunkSynth(textBytes, dicts, initialVoice, voices, rate) {
  const n = textBytes.length;
  const outChunks = [];
  const acc = new Bytes(200);
  let cur = initialVoice;
  let hashFlag = false;
  const process = () => {
    const pcm = processChunk(acc.bytes(), dicts, cur, rate);
    if (pcm !== null) outChunks.push(pcm);
    acc.n = 0;
  };
  for (let i = 0; i < n; i++) {
    const c = textBytes[i];
    if (c === 0x0a) continue; // "\n" отбрасывается без следа
    if (c === 0x23) { // '#'
      hashFlag = true;
      continue;
    }
    if (hashFlag && (c === 0x31 || c === 0x32 || c === 0x33)) {
      const v = voices[c - 0x30 - 1 + 1] || null;
      if (v) {
        cur = v;
        hashFlag = false;
        continue;
      }
    }
    if (c === 0x0d) { // "\r" — граница фрагмента при длине ≥ 3
      if (acc.n >= 3) process();
      continue;
    }
    acc.push(c);
    if (c === chDot && at(textBytes, i + 2) === chDot) continue; // «..»
    if (setPunct[c]) {
      process();
      continue;
    }
    if (i === n - 1) process(); // последний символ буфера
  }
  let total = 0;
  for (const p of outChunks) total += p.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of outChunks) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

export class Rozmovlyalka {
  constructor({ dicts, voices, dataStats }) {
    this.dicts = dicts;
    this.voices = voices;
    this.dataStats = dataStats || null;
    this.sampleRate = SAMPLE_RATE;
  }

  // Создание движка: грузит словари и все три голоса.
  static async create({ dataUrl, fetcher, onProgress } = {}) {
    const url = dataUrl != null ? dataUrl : defaultDataUrl;
    if (url == null && typeof document === 'undefined') {
      throw new Error('rozmovlyalka-js: укажите dataUrl — в этой среде путь к каталогу data/ не определяется автоматически');
    }
    const started = performance.now();
    const bundle = await loadDataBundle({
      dataUrl: url,
      fetch: fetcher,
      onProgress,
    });
    return new Rozmovlyalka({
      dicts: bundle.dicts,
      voices: bundle.voices,
      dataStats: { loadMs: Math.round(performance.now() - started) },
    });
  }

  // synthesize — текст (JS-строка) → 8-битный беззнаковый PCM, 11025 Гц, моно.
  synthesize(text, opts) {
    const { voice, rate } = validateOptions(opts);
    const target = this.voices[voice];
    if (!target) throw new Error(`rozmovlyalka-js: голос "${voice}" не загружен`);
    return chunkSynth(toCP1251(String(text)), this.dicts, target, this.voices, rate);
  }

  // synthesizeWAV — текст → готовый WAV-файл.
  synthesizeWAV(text, opts) {
    return pcmToWAV(this.synthesize(text, opts));
  }

  // synthesizeMP3 — текст → MP3 (в Node через ffmpeg, в браузере lamejs).
  async synthesizeMP3(text, opts) {
    const { kbps, ...rest } = opts || {};
    return pcmToMP3(this.synthesize(text, rest), { kbps: kbps || 32 });
  }

  // Позволяет собрать WAV/MP3 из готового PCM (диалоги, склейки).
  pcmToWAV(pcm) {
    return pcmToWAV(pcm);
  }

  async pcmToMP3(pcm, opts) {
    return pcmToMP3(pcm, opts || {});
  }
}

export default Rozmovlyalka;

// Экспорт стадий для отладки/тестов (порт processChunk без синтеза).
export function pipelineDebug(text, dicts) {
  let s = cat(toCP1251(text), new Uint8Array([0x0d, 0x0a]));
  const stages = { in: s };
  s = expandAbbreviations(s);
  stages.abbrev = s;
  s = expandNumbers(s);
  stages.numbers = s;
  s = expandEnglish(s, dicts);
  stages.english = s;
  s = normalizeText(s);
  stages.normalize = s;
  s = stressText(dicts, s);
  stages.stress = s;
  s = g2p(s);
  stages.g2p = s;
  return stages;
}

// Неиспользуемые импорты держат tree-shaking чистым.
void chSpace;
void setDigit;
void chDot;
