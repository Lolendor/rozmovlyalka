// Этап «аббревиатуры»: FUN_00465888.
import { toCP1251 } from './cp1251.js';
import { Bytes } from './util.js';

function b(s) {
  return toCP1251(s);
}

// TBL1 @0x46e070 — 31 байт.
const abbrevTbl1 = b('АБВГДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЮЯ');
// TBL2 @0x46e10c — 6 байт.
const abbrevTbl2 = b('%№+=*/');

// ABBR1 @0x46e08c, индексация 1-based.
const abbrevWords1 = [
  null,
  b('а\\'),
  b('бе\\'),
  b('ве\\'),
  b('ге\\'),
  b('де\\'),
  b('е\\'),
  b('є\\'),
  b('же\\'),
  b('зе\\'),
  b('и\\'),
  b('і\\'),
  b('ї\\'),
  b('и\\й'),
  b('ка\\'),
  b('е\\л'),
  b('е\\м'),
  b('е\\н'),
  b('о\\'),
  b('пе\\'),
  b('е\\р'),
  b('е\\с'),
  b('те\\'),
  b('у\\'),
  b('е\\ф'),
  b('ха\\'),
  b('це\\'),
  b('ча\\'),
  b('ша\\'),
  b('ща\\'),
  b('ю\\'),
  b('я\\'),
];

// ABBR2 @0x46e110, индексация 1-based.
const abbrevWords2 = [
  null,
  b('відсотків'),
  b('номер'),
  b('плюс'),
  b('дорівнює'),
  b('помножити на'),
  b('ділити на'),
];

export const abbrevWords1Hex = null; // (для отладки не используется)

function abbrevIndex(tbl, c) {
  for (let k = 0; k < tbl.length; k++) {
    if (tbl[k] === c) return k + 1;
  }
  return 0;
}

// expandAbbreviations — FUN_00465888.
export function expandAbbreviations(s) {
  const n = s.length;
  const res = new Bytes(n);
  for (let i = 1; i <= n - 1; i++) {
    const c = s[i - 1];
    const j = abbrevIndex(abbrevTbl1, c);
    if (j > 0 && s[i] === 0x2e) {
      res.push(abbrevWords1[j]);
      continue;
    }
    const j2 = abbrevIndex(abbrevTbl2, c);
    if (j2 > 0) {
      res.push(abbrevWords2[j2]);
      continue;
    }
    res.push(c);
  }
  if (n > 0) res.push(s[n - 1]);
  return res.bytes();
}
