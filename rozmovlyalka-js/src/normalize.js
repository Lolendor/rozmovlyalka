// Этап «нормализация»: FUN_0046621c.
import {
  chApos, chBacksl, chBacktick, chDot, chLatI, chLati, chSpace,
  chUkrIUp, chUkrILow, chUkrYiUp, chUkrYiLo, chUkrYeUp, chUkrYeLo,
  setDash, setDigit, setPunct,
} from './sets.js';
import { Bytes } from './util.js';

// Строчные украинские буквы плюс ь/ю/я.
function normKeep(c) {
  return (c >= 0xe0 && c <= 0xf9) || c === 0xfc || c === 0xfe || c === 0xff;
}

// Заглавные А..Я, Ь, Ю, Я.
function normUpper(c) {
  return (c >= 0xc0 && c <= 0xd9) || c === 0xdc || c === 0xde || c === 0xdf;
}

// normalizeText — FUN_0046621c.
export function normalizeText(s) {
  const n = s.length;
  const res = new Bytes(n + 4);
  if (n > 0 && (s[0] === chSpace || setDigit[s[0]])) {
    res.push(chDot);
  }
  for (let i = 1; i <= n; i++) {
    const c = s[i - 1];
    const nx = i + 1 <= n ? s[i] : 0;
    if (normKeep(c) || setPunct[c] || c === chApos || c === chBacksl) {
      res.push(c);
    } else if (c === chBacktick) {
      res.push(chApos);
    } else if (c === chSpace && setDash[nx]) {
      res.push(0x2c);
    } else if (c === chSpace && setPunct[nx]) {
      // пробел перед знаком препинания теряется
    } else if (normUpper(c)) {
      res.push(c + 0x20);
    } else if (c === chLatI || c === chLati || c === chUkrIUp || c === chUkrILow) {
      res.push(chUkrILow);
    } else if (c === chUkrYiUp || c === chUkrYiLo) {
      res.push(chUkrYiLo);
    } else if (c === chUkrYeUp || c === chUkrYeLo) {
      res.push(chUkrYeLo);
    } else {
      if (res.n > 0 && res.b[res.n - 1] !== chSpace) {
        res.push(chSpace);
      }
    }
  }
  return res.bytes();
}
