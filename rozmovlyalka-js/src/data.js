// Загрузка и парсинг данных оригинальной программы (словари и голоса).
import { Dictionaries, splitBSNbn, splitEUDic, bsnTableBytes } from './dict.js';
import { Voice } from './synth.js';
import { readFileBytes } from './fsread.js';

export const VOICE_LABELS = ['1', '2', '3'];

const DICT_FILES = [
  ['bsn', 'bsnbn.bin.gz'],
  ['eudic', 'eudic.bin.gz'],
  ['skf', 'skf.bin.gz'],
  ['wif', 'wif.bin.gz'],
  ['wlf', 'wlf.bin.gz'],
];

const VOICE_FILES = (label) => [
  [`v_ip_${label}`, `v${label}_ip.bin.gz`],
  [`v_lp_${label}`, `v${label}_lp.bin.gz`],
  [`v_sd_${label}`, `v${label}_sd.bin.gz`],
];

// gunzip — декомпрессия gzip-потока (DecompressionStream).
export async function gunzip(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('rozmovlyalka-js: DecompressionStream не поддерживается этой средой (нужен Node 18+, Chrome 80+, Safari 16.4+, Firefox 113+)');
  }
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

// loadInt32s — байты → Int32Array (little-endian).
export function loadInt32s(bytes) {
  if (bytes.length % 4 !== 0) {
    throw new Error(`rozmovlyalka-js: размер ${bytes.length} не кратен 4`);
  }
  const out = new Int32Array(bytes.length / 4);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < out.length; i++) {
    out[i] = dv.getInt32(4 * i, true);
  }
  return out;
}

// makeFetcher — стратегия чтения файлов данных.
export function makeFetcher(dataUrl, customFetcher) {
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  const base = dataUrl == null ? '' : String(dataUrl).replace(/\/+$/, '') + '/';
  return async (name) => {
    if (customFetcher) {
      const raw = await customFetcher(name, base);
      if (raw instanceof Uint8Array) return raw;
      if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
      throw new Error('rozmovlyalka-js: customFetcher должен возвращать Uint8Array/ArrayBuffer');
    }
    const url = base + name;
    const looksLikePath = /^(\/|\.\/|\.\.\/|[A-Za-z]:[\\/])/.test(url) || !/^[a-z][a-z0-9+.-]*:/i.test(url);
    if (isNode && (url.startsWith('file:') || looksLikePath) && !/^https?:/i.test(url)) {
      return readFileBytes(url);
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`rozmovlyalka-js: не удалось загрузить данные "${url}": ${res.status} ${res.statusText}`);
    }
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  };
}

// buildDictionaries — парсинг тяжёлых словарей.
export function buildDictionaries({ bsn, eudic, skf, wif, wlf }) {
  const wif32 = loadInt32s(wif);
  if (wif32.length === 0) throw new Error('rozmovlyalka-js: пустой wif.bin');
  const decode = new Uint8Array(256);
  decode.set(bsnTableBytes.subarray(0, 57));
  return new Dictionaries({
    bsn: splitBSNbn(bsn),
    eudic: splitEUDic(eudic),
    skf,
    wif: wif32,
    wlf,
    skorN: wif32[0],
    decode,
  });
}

// buildVoice — парсинг голоса ('ip' — смещения, 'lp' — длины, 'sd' — сэмплы).
export function buildVoice(label, ipRaw, lpRaw, sd) {
  const ip = loadInt32s(ipRaw);
  const lp = loadInt32s(lpRaw);
  if (ip.length < 42 * 42 || lp.length < 42 * 42) {
    throw new Error(`rozmovlyalka-js: голос "${label}": таблица дифонов короче 1764`);
  }
  return new Voice(label, ip, lp, sd);
}

// loadDataBundle — полная загрузка словарей и голосов с прогрессом.
export async function loadDataBundle({ dataUrl, fetch, onProgress } = {}) {
  const read = makeFetcher(dataUrl, fetch);
  const allNames = [...DICT_FILES.map((n) => n[1]), ...VOICE_LABELS.flatMap((l) => VOICE_FILES(l).map((n) => n[1]))];
  const cache = new Map();
  let loaded = 0;
  let total = 0;
  for (const name of allNames) {
    const raw = cache.get(name) || (await read(name));
    cache.set(name, raw);
    total += raw.byteLength;
  }
  const dicts = {};
  for (const [slot, name] of DICT_FILES) {
    dicts[slot] = await gunzip(cache.get(name));
    loaded += cache.get(name).byteLength;
    if (onProgress) onProgress({ loaded, total, stage: `dict:${name}` });
  }
  const voices = {};
  for (const l of VOICE_LABELS) {
    const ip = await gunzip(cache.get(`v${l}_ip.bin.gz`));
    const lp = await gunzip(cache.get(`v${l}_lp.bin.gz`));
    const sd = await gunzip(cache.get(`v${l}_sd.bin.gz`));
    const v = buildVoice(l, ip, lp, sd);
    loaded += cache.get(`v${l}_ip.bin.gz`).byteLength +
      cache.get(`v${l}_lp.bin.gz`).byteLength +
      cache.get(`v${l}_sd.bin.gz`).byteLength;
    voices[l] = v;
    if (onProgress) onProgress({ loaded, total, stage: `voice:${l}` });
  }
  return { dicts: buildDictionaries(dicts), voices };
}
