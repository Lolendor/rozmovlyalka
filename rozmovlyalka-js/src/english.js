// Этап «английский»: FUN_00465e9c.
import { toCP1251 } from './cp1251.js';
import { chApos, setEnVow } from './sets.js';
import { Bytes, cat, at } from './util.js';

function b(s) {
  return toCP1251(s);
}

// LETTER @0x46e0ac, индекс = ASCII-код строчной латинской буквы.
const enLetter = [];
enLetter[0x61] = b('ей');  enLetter[0x62] = b('бі');  enLetter[0x63] = b('сі');
enLetter[0x64] = b('ді');  enLetter[0x65] = b('і');   enLetter[0x66] = b('еф');
enLetter[0x67] = b('джі'); enLetter[0x68] = b('ейч'); enLetter[0x69] = b('ай');
enLetter[0x6a] = b('джей'); enLetter[0x6b] = b('кей'); enLetter[0x6c] = b('ель');
enLetter[0x6d] = b('ем');  enLetter[0x6e] = b('ен');  enLetter[0x6f] = b('оу');
enLetter[0x70] = b('пі');  enLetter[0x71] = b('ку');  enLetter[0x72] = b('ар');
enLetter[0x73] = b('ес');  enLetter[0x74] = b('ті');  enLetter[0x75] = b('ю');
enLetter[0x76] = b('ві');  enLetter[0x77] = b('дабл'); enLetter[0x78] = b('екс');
enLetter[0x79] = b('вай'); enLetter[0x7a] = b('зет');

// TBL @0x46e328 — базовая таблица транслитерации.
const enTranslit = [];
enTranslit[0x61] = b('а');  enTranslit[0x62] = b('б');  enTranslit[0x63] = b('к');
enTranslit[0x64] = b('д');  enTranslit[0x65] = b('е');  enTranslit[0x66] = b('ф');
enTranslit[0x67] = b('г');  enTranslit[0x68] = b('г');  enTranslit[0x69] = b('і');
enTranslit[0x6a] = b('дж'); enTranslit[0x6b] = b('к');  enTranslit[0x6c] = b('л');
enTranslit[0x6d] = b('м');  enTranslit[0x6e] = b('н');  enTranslit[0x6f] = b('о');
enTranslit[0x70] = b('п');  enTranslit[0x71] = b('к');  enTranslit[0x72] = b('р');
enTranslit[0x73] = b('с');  enTranslit[0x74] = b('т');  enTranslit[0x75] = b('у');
enTranslit[0x76] = b('в');  enTranslit[0x77] = b('в');  enTranslit[0x78] = b('кс');
enTranslit[0x79] = b('і');  enTranslit[0x7a] = b('з');

const enSpace = b(' ');
const enSh = b('ш');
const enS = b('с');
const enCh = b('ч');
const enStress = b('\\');

// Хвосты после апострофа: s→с, t→т, m→м, d→д, ll→л, re→а\, ve→в.
const enTailMap = [
  [b('s'), b('с')],
  [b('t'), b('т')],
  [b('m'), b('м')],
  [b('d'), b('д')],
  [b('ll'), b('л')],
  [b('re'), b('а\\')],
  [b('ve'), b('в')],
];

function mapEnTail(tail) {
  for (const [key, val] of enTailMap) {
    if (tail.length === key.length) {
      let eq = true;
      for (let i = 0; i < key.length; i++) {
        if (tail[i] !== key[i]) { eq = false; break; }
      }
      if (eq) return val;
    }
  }
  return tail;
}

// spellEnglish — FUN_00465c40: побуквенное чтение.
function spellEnglish(word) {
  const out = new Bytes(word.length * 4);
  for (let i = 0; i < word.length; i++) {
    out.push(enLetter[word[i]], enSpace);
  }
  return out.bytes();
}

// translitEnglish — FUN_00465cf8: правила чтения.
// Первый встреченный гласный помечается ударением («\»).
function translitEnglish(word) {
  const n = word.length;
  const out = new Bytes(n * 3);
  let wantStress = true;
  let i = 1;
  while (i <= n) {
    const c = word[i - 1];
    let t = enTranslit[c];
    if (c === 0x73 && i < n && at(word, i + 1) === 0x68) { // sh
      out.push(enSh);
      i += 2;
      continue;
    }
    if (c === 0x63 && i < n) { // c перед e/i/y → с
      const nx = at(word, i + 1);
      if (nx === 0x65 || nx === 0x69 || nx === 0x79) t = enS;
    }
    if (c === 0x63 && i < n && at(word, i + 1) === 0x68) { // ch
      out.push(enCh);
      i += 2;
      continue;
    }
    out.push(t);
    if (wantStress && t.length > 0 && setEnVow[t[0]]) {
      out.push(0x5c);
      wantStress = false;
    }
    i++;
  }
  return out.bytes();
}

// expandEnglish — FUN_00465e9c.
export function expandEnglish(s, dicts) {
  const n = s.length;
  const out = new Bytes(n + 16);
  let word = null;
  let tail = null;
  let inWord = false;
  let nUpper = 0;
  let i = 1;
  while (i <= n) {
    const c = s[i - 1];
    const isUpper = c >= 0x41 && c <= 0x5a;
    const isLower = c >= 0x61 && c <= 0x7a;
    if (isUpper || isLower) {
      inWord = true;
      if (word === null) word = new Bytes();
      if (isUpper) {
        word.push(c + 0x20);
        nUpper++;
      } else {
        word.push(c);
      }
      i++;
      continue;
    }
    if (!inWord) {
      out.push(c);
      i++;
      continue;
    }
    tail = null;
    if (c === chApos) {
      i++;
      const t = new Bytes();
      for (;;) {
        const cc = at(s, i);
        if (cc < 0x61 || cc >= 0x7b) break;
        t.push(cc);
        i++;
      }
      tail = mapEnTail(t.bytes());
      i--;
    }
    let w = word.bytes();
    if (nUpper > 1) {
      w = spellEnglish(w);
    } else {
      const found = dicts.euLookup(w);
      if (found !== null && found.length > 0) w = found;
      else w = translitEnglish(w);
    }
    out.push(w, tail === null ? u8empty : tail, enSpace, c);
    word = null;
    tail = null;
    inWord = false;
    nUpper = 0;
    i++;
  }
  return out.bytes();
}

const u8empty = new Uint8Array(0);

// enStress используется в translitEnglish через литерал 0x5c; экспортируем для
// совместимости с оригиналами констант.
export const enStressHex = toHexSafe(enStress);

function toHexSafe(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += u8[i].toString(16).padStart(2, '0');
  return s;
}
