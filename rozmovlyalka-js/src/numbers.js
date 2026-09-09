// Этап «числа»: FUN_004659dc → FUN_004656a0 → FUN_004653b8.
import { toCP1251 } from './cp1251.js';
import { Bytes, cat } from './util.js';

function b(s) {
  return toCP1251(s);
}

// T1 @0x46e5d8, индекс = значение 1..19 (нулевой слот — null).
const numT1 = [
  null,
  b('один'), b('два'), b('три'), b('чотири'),
  b("п'ять"), b('шість'), b('сім'), b('вісім'),
  b("дев'ять"), b('десять'), b('одинадцять'),
  b('дванадцять'), b('тринадцять'), b('чотирнадцять'),
  b("п'ятнадцять"), b('шістнадцять'), b('сімнадцять'),
  b('вісімнадцять'), b("дев'ятнадцять"),
];
// TENS @0x46e4f0, индекс = ASCII-байт цифры.
const numTens = [];
numTens[0x30] = b('вісімсот');
numTens[0x31] = b("дев'ятсот");
numTens[0x32] = b('двадцять');
numTens[0x33] = b('тридцять');
numTens[0x34] = b('сорок');
numTens[0x35] = b("п'ятдесят");
numTens[0x36] = b('шістдесят');
numTens[0x37] = b('сімдесят');
numTens[0x38] = b('вісімдесят');
numTens[0x39] = b("дев'яносто");
// HUNDREDS @0x46e4d0, индекс = ASCII-байт цифры.
const numHundreds = [];
numHundreds[0x31] = b('сто');
numHundreds[0x32] = b('двісті');
numHundreds[0x33] = b('триста');
numHundreds[0x34] = b('чотириста');
numHundreds[0x35] = b("п'ятсот");
numHundreds[0x36] = b('шістсот');
numHundreds[0x37] = b('сімсот');
numHundreds[0x38] = b('вісімсот');
numHundreds[0x39] = b("дев'ятсот");
// SING / PLUR234 / PLUR5, индекс = род 2..9.
const numSing = [];
numSing[2] = b('мільйон'); numSing[3] = b('мільярд'); numSing[4] = b('трильйон');
numSing[5] = b('квадрильйон'); numSing[6] = b('квінтальйон'); numSing[7] = b('секстальйон');
numSing[8] = b('септальйон'); numSing[9] = b('октальйон');
const numPlur234 = [];
numPlur234[2] = b('мільйони'); numPlur234[3] = b('мільярди'); numPlur234[4] = b('трильйони');
numPlur234[5] = b('квадрильйони'); numPlur234[6] = b('квінтальйони'); numPlur234[7] = b('секстальйони');
numPlur234[8] = b('септальйони'); numPlur234[9] = b('октальйони');
const numPlur5 = [];
numPlur5[2] = b('мільйонів'); numPlur5[3] = b('мільярдів'); numPlur5[4] = b('трильйонів');
numPlur5[5] = b('квадрильйонів'); numPlur5[6] = b('квінтальйонів'); numPlur5[7] = b('секстальйонів');
numPlur5[8] = b('септальйонів'); numPlur5[9] = b('октальйонів');

const numSpace = b(' ');
const numThousand1 = b('одна тисяча');
const numTwoFem = b('дві');
const numThoushi = b('тисячі');
const numThoush = b('тисяч');
const numZeroWord = b('нуль');
const numManyWord = b('багато');
const numTriple0 = b('000');

function atoiDigits(s) {
  let v = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c < 0x30 || c > 0x39) return v;
    v = v * 10 + c - 0x30;
  }
  return v;
}

// num1 — FUN_004653b8: пропись группы цифр (1..3 символа) с указанием рода.
function num1(s, gender) {
  const dlen = s.length;
  const v = atoiDigits(s);
  let out = new Uint8Array(0);
  const set = (part) => { out = part; };
  const add = (p) => { out = cat(out, p); };
  if (v > 0 && v < 20) out = cat(out, numT1[v]);
  if (gender === 1) {
    if (v === 1) set(numThousand1);
    if (v === 2) set(numTwoFem);
    if (v >= 2 && v <= 4) add(cat(numSpace, numThoushi));
    else if (v !== 1) add(cat(numSpace, numThoush));
  } else if (gender > 1 && gender < 10) {
    if (v === 1) add(cat(numSpace, numSing[gender]));
    if (v >= 2 && v <= 4) add(cat(numSpace, numPlur234[gender]));
    else if (v !== 1) add(cat(numSpace, numPlur5[gender]));
  }
  if (v > 19 && v < 100) {
    switch (dlen) {
      case 2:
        out = cat(numTens[s[0]], numSpace, num1(s.subarray(1), gender));
        break;
      case 3:
        out = cat(numTens[s[1]], numSpace, num1(s.subarray(2), gender));
        break;
    }
  }
  if (v > 99 && dlen >= 3) {
    out = cat(numHundreds[s[0]], numSpace, num1(s.subarray(1, 3), gender));
  }
  return out;
}

// num2 — FUN_004656a0: пропись произвольной серии цифр.
function num2(digits) {
  let n = digits.length;
  if (n > 30) return numManyWord.slice();
  if (n < 9 && atoiDigits(digits) === 0) return numZeroWord.slice();
  let cur = digits;
  let acc = new Uint8Array(0);
  let gender = 0;
  for (;;) {
    let grp;
    if (n <= 3) {
      grp = cur;
    } else {
      grp = cur.subarray(n - 3, n);
      cur = cur.subarray(0, n - 3);
    }
    if (!(grp.length === 3 && grp[0] === 0x30 && grp[1] === 0x30 && grp[2] === 0x30)) {
      acc = cat(num1(grp, gender), numSpace, acc);
    }
    gender++;
    n -= 3;
    if (n <= 0) break;
  }
  return acc;
}

// expandNumbers — FUN_004659dc.
export function expandNumbers(s) {
  const n = s.length;
  let i = 1;
  const bytes = new Bytes(n + 16);
  while (i <= n) {
    let digits = null;
    for (;;) {
      const c = i <= n ? s[i - 1] : 0;
      if (c >= 0x30 && c <= 0x39) break;
      if (i > n) break;
      bytes.push(c);
      i++;
    }
    const dig = new Bytes();
    for (;;) {
      const c = i <= n ? s[i - 1] : 0;
      if (c < 0x30 || c > 0x39) break;
      if (i > n) break;
      dig.push(c);
      i++;
    }
    digits = dig.bytes();
    if (digits.length > 0) {
      bytes.push(numSpace, num2(digits));
    }
    if (i > n) break;
  }
  return bytes.bytes();
}
