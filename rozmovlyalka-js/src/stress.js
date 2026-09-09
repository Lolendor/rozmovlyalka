// Stress — порт FUN_00465210 (оркестратор расстановки ударений).
import { toCP1251 } from './cp1251.js';
import {
  chApos, chBacksl, chDash, chSpace, chUkrILow, chUkrIUp, chUkrYiLo,
  chUkrYiUp, chUkrYeLo, chUkrYeUp, setLowVow, setPunct, setUpperable, setVowels,
} from './sets.js';
import { Bytes, at, cat, bytesContains, bytesEqual } from './util.js';

function b(s) {
  return toCP1251(s);
}

const list1 = b(' у в до на по від од про для за під із з біля крім без повз окрім коло ');
const list2 = b(' до від од з із біля коло для без крім нема немає окрім поблизу');

// upVowel — «заглавить ударную гласную»: а..я через SET_465078 плюс і/ї/є.
function upVowel(c) {
  if (setUpperable[c]) return c - 0x20;
  if (c === chUkrILow) return chUkrIUp;
  if (c === chUkrYiLo) return chUkrYiUp;
  if (c === chUkrYeLo) return chUkrYeUp;
  return c;
}

// tokenize — FUN_0046463c. Возвращает слово из s, продвигая *i (1-based) за
// следующий разделитель. Разделители: пунктуация, пробел, дефис.
function tokenize(s, state) {
  const n = s.length;
  for (;;) {
    const c = at(s, state.i);
    if (!(setPunct[c] || c === chSpace || c === chDash)) break;
    state.i++;
  }
  const word = new Bytes();
  for (;;) {
    const c = at(s, state.i);
    if (setPunct[c] || c === chSpace || c === chDash) break;
    word.push(c);
    state.i++;
    if (n < state.i) break;
  }
  return word.bytes();
}

// applyExplicitMarker — FUN_00465100: слово с явным маркером «\» или «'».
// Маркер поглощается, гласная перед ним заглавляется.
function applyExplicitMarker(word) {
  const n = word.length;
  const res = new Bytes(n);
  let i = 1;
  while (i <= n - 1) {
    const c = at(word, i);
    let out = c;
    if (setLowVow[c] && (at(word, i + 1) === chBacksl || at(word, i + 1) === chApos)) {
      i++;
      out = upVowel(c);
    }
    res.push(out);
    i++;
  }
  if (i === n) res.push(at(word, n));
  return res.bytes();
}

// markStress — помечает в word гласную под 1-based номером pos (k-счётчик по
// SET_46e030). pos == 0 означает «не помечать».
function markStress(word, pos) {
  if (pos === 0) return word;
  const out = word.slice();
  let k = 0;
  for (let j = 0; j < out.length; j++) {
    if (!setVowels[out[j]]) continue;
    k++;
    if (k === pos) {
      out[j] = upVowel(out[j]);
    }
  }
  return out;
}

// upcaseAllVowels — запасная ветка FUN_00464adc (b = '8'): заглавливаются
// все гласные.
function upcaseAllVowels(word) {
  const out = word.slice();
  for (let j = 0; j < out.length; j++) {
    const c = out[j];
    if (setUpperable[c]) out[j] = c - 0x20;
    else if (c === chUkrILow) out[j] = chUkrIUp;
    else if (c === chUkrYiLo) out[j] = chUkrYiUp;
    else if (c === chUkrYeLo) out[j] = chUkrYeUp;
  }
  return out;
}

const meneMarked = b('мЕне');
const tebeMarked = b('тЕбе');
const sebeMarked = b('сЕбе');
const mene = b('мене');
const tebe = b('тебе');
const sebe = b('себе');
const oyi = b('ої');
const yeyi = b('єї');
const oho = b('ого');
const sya = b('ся');
const sy = b('сь');

// dictStress — FUN_00464adc. Возвращает word с расставленным ударением.
export function dictStress(d, word, prev) {
  const ctx = cat(b(' '), prev, b(' '));
  // Спецслучаи «мене/тебе/себе» после коротких предлогов из LIST1.
  if (bytesContains(list1, ctx)) {
    if (bytesEqual(word, mene)) return meneMarked.slice();
    if (bytesEqual(word, tebe)) return tebeMarked.slice();
    if (bytesEqual(word, sebe)) return sebeMarked.slice();
  }

  // Основной быстрый словарный поиск (СловКор).
  let bch = d.skorLookup(word);
  if (bch !== 0x38) {
    // k-счётчик стартует с '0': позиция = b, но '0' никогда не совпадает.
    const out = word.slice();
    let k = 0x30;
    for (let j = 0; j < out.length; j++) {
      if (!setVowels[out[j]]) continue;
      k++;
      if (k === bch) {
        out[j] = upVowel(out[j]);
      }
    }
    return out;
  }

  // Большой словарь BSNbn.
  bch = d.bsnLookup(word);
  const n = word.length;

  // Многоформенные записи с кодами 'B'..'O': x := b-0x3C; r := x mod 4
  // (r==0 → 4); q := (x-r) div 4.
  if (bch > 0x41 && bch < 0x50) {
    const x = bch - 0x3c;
    let r = x % 4;
    if (r === 0) r = 4;
    const q = Math.trunc((x - r) / 4);
    bch = q;
    if (bytesContains(list2, ctx)) {
      bch = r;
    } else if (prev.length > 2) {
      const t2 = prev.subarray(prev.length - 2);
      const t3 = prev.subarray(prev.length - 3);
      if (bytesEqual(t2, oyi) || bytesEqual(t2, yeyi) || bytesEqual(t3, oho)) {
        bch = r;
      }
    }
  }

  // Повторная попытка без окончания (только для кода '8').
  if (bch === 0x38 && n > 2) {
    const pre = word.subarray(0, n - 2);
    let end2 = word.subarray(n - 2);
    if (bytesEqual(end2, sy)) end2 = sya;
    if (
      bytesEqual(end2, b('ая')) || bytesEqual(end2, b('ую')) ||
      bytesEqual(end2, b('еє')) || bytesEqual(end2, b('ії')) ||
      bytesEqual(end2, b('яя')) || bytesEqual(end2, b('єє'))
    ) {
      end2 = end2.subarray(0, 1);
    }
    bch = d.bsnLookup(cat(pre, end2));
  }

  // Слово в словаре отсутствует: заглавливаются все гласные (n > 1).
  if (bch === 0x38) {
    if (n > 1) return upcaseAllVowels(word);
    return word.slice();
  }

  // Код → позиция: ':'..'$' → 1..9 (b -= 0x39), '0'..'9' → 0..9 (b -= 0x30).
  if (bch > 0x39) bch -= 0x39;
  else if (bch > 0x2f) bch -= 0x30;
  return markStress(word, bch);
}

// markerPos — поиск явного маркера ударения. Возвращает 1-based позицию маркера
// минус 1 (0 — маркера нет).
function markerPos(word) {
  for (let j = 1; j <= word.length; j++) {
    if (at(word, j) === chBacksl) return j - 1;
    if (at(word, j) === chApos && setLowVow[at(word, j - 1)]) return j - 1;
  }
  return 0;
}

const prevInit = b('ьь');

// stressText — FUN_00465210: токенизация входной строки с расстановкой
// ударений. Пунктуация переписывается как «символ + пробел», слова — через
// пробел. Возвращает новую строку.
export function stressText(d, s) {
  const n = s.length;
  const acc = new Bytes(n + Math.floor(n / 4) + 16);
  const state = { i: 1 };
  let prevWord = prevInit.slice();
  for (;;) {
    const c = at(s, state.i);
    if (setPunct[c]) {
      acc.push(c, chSpace);
    }
    let word = tokenize(s, state);
    if (markerPos(word) === 0) {
      prevWord = word.slice();
      word = dictStress(d, word, prevWord);
    } else {
      word = applyExplicitMarker(word);
    }
    acc.push(word, chSpace);
    if (state.i >= n) break;
  }
  return acc.bytes();
}

// Экспорт внутренностей для тестов.
export const __internals = {
  dictStress, stressText, markerPos, tokenize, applyExplicitMarker, markStress,
  upcaseAllVowels, upVowel, list1, list2,
};
