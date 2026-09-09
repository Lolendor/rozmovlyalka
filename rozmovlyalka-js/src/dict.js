// Словари: СловКор (skf/wif/wlf), BSNbn, EUtDic.
import { toCP1251 } from './cp1251.js';
import { cmpRange, delphiDiv2, bytesContains } from './util.js';

// bsnTable — TABLE @0x46e694: декодер байтов BSNbn (значимы индексы 0..56).
export const bsnTableBytes = toCP1251(
  '!' +
  'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя' +
  `'\\- ` +
  '0123456789' +
  ':;<=>?@#$',
);

const dictMiss = 0x38; // '8'

export class Dictionaries {
  constructor({ bsn, eudic, skf, wif, wlf, skorN, decode }) {
    this.bsn = bsn; // { buffer, marks: Uint32Array, count }
    this.eudic = eudic; // { buffer, starts: Uint32Array, count }
    this.skf = skf; // Uint8Array
    this.wif = wif; // Int32Array
    this.wlf = wlf; // Uint8Array
    this.skorN = skorN;
    this.decode = decode; // Uint8Array(256)
  }

  // skorLookup — FUN_004648a8: бинарный поиск по словарю СловКор.
  skorLookup(word) {
    let lo = 1;
    let hi = this.skorN;
    while (hi - lo > 1) {
      const mid = delphiDiv2(lo + hi);
      const off = this.wif[mid];
      const ln = this.wlf[mid];
      if (ln < 1 || off + ln > this.skf.length) return dictMiss;
      const c = cmpRange(this.skf, off, off + ln - 1, word);
      if (c === 0) return this.skf[off + ln - 1];
      if (c < 0) lo = mid;
      else hi = mid;
    }
    return dictMiss;
  }

  // bsnLookup — FUN_004647d8: бинарный поиск по основному словарю BSNbn.
  // Сравнение и декодирование записи ленивое (без аллокаций).
  bsnLookup(word) {
    const buf = this.bsn.buffer;
    const marks = this.bsn.marks;
    const decode = this.decode;
    let lo = 1;
    let hi = this.bsn.count;
    while (hi - lo > 1) {
      const mid = delphiDiv2(lo + hi);
      const start = marks[mid - 1];
      const end = marks[mid]; // запись [start, end), последний байт — payload
      const bodyEnd = end - 1;
      let c;
      const alen = bodyEnd - start;
      const n = Math.min(alen, word.length);
      let res = 0;
      for (let i = 0; i < n && res === 0; i++) {
        const raw = buf[start + i];
        const a = raw < 0x41 ? decode[raw] : raw;
        const wb = word[i];
        if (a !== wb) res = a < wb ? -1 : 1;
      }
      if (res !== 0) c = res;
      else if (alen !== word.length) c = alen < word.length ? -1 : 1;
      else {
        const raw = buf[end - 1];
        return raw < 0x41 ? decode[raw] : raw;
      }
      if (c < 0) lo = mid;
      else hi = mid;
    }
    return dictMiss;
  }

  // euLookup — FUN_00465afc: бинарный поиск английского слова в EUtDic.
  // Записи имеют вид "<en-word> <транскрипция>".
  euLookup(word) {
    const buf = this.eudic.buffer;
    const starts = this.eudic.starts;
    const count = this.eudic.count;
    let lo = 1;
    let hi = count;
    while (hi - lo > 1) {
      const mid = delphiDiv2(lo + hi);
      const s = starts[mid - 1];
      let e = mid < count ? starts[mid] - 2 : buf.length;
      if (e > buf.length) e = buf.length;
      if (mid === count && e >= 2 && buf[e - 2] === 0x0d && buf[e - 1] === 0x0a) e -= 2;
      let sp = e;
      for (let p = s; p < e; p++) {
        if (buf[p] === 0x20) { sp = p; break; }
      }
      const c = cmpRange(buf, s, sp, word);
      if (c === 0 && sp < e) return buf.subarray(sp + 1, e);
      if (c < 0) lo = mid;
      else hi = mid;
    }
    return null;
  }

  // bsnRaw — доступ к записи BSNbn для отладки/тестов.
  bsnRecord(i) {
    return this.bsn.buffer.subarray(this.bsn.marks[i - 1], this.bsn.marks[i]);
  }
}

// splitBSNbn — загрузчик 0x463fbc..0x464022.
export function splitBSNbn(buf) {
  const n = buf.length;
  const marks = [0];
  for (let p = 1; p <= n - 1; p++) {
    const c = buf[p];
    if (c >= 0x26 && c <= 0x50) marks.push(p + 1);
  }
  const count = marks.length - 1;
  return { buffer: buf, marks: Uint32Array.from(marks), count };
}

// splitEUDic режет EUtDic.txt на записи по "\r\n".
export function splitEUDic(buf) {
  const lines = [];
  let pos = 0;
  while (pos <= buf.length) {
    lines.push(pos);
    let found = -1;
    for (let j = pos; j + 1 < buf.length; j++) {
      if (buf[j] === 0x0d && buf[j + 1] === 0x0a) { found = j; break; }
    }
    if (found < 0) break;
    pos = found + 2;
  }
  while (lines.length > 0 && lines[lines.length - 1] >= buf.length) lines.pop();
  const count = lines.length;
  return { buffer: buf, starts: Uint32Array.from(lines), count };
}

// ctxContains — words.Contains для стресс-контекстов (мелкие строки).
export { bytesContains };
