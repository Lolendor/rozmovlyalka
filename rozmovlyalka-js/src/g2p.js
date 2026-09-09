// g2p — порт FUN_0046662c: перевод текста с ударениями в строку фонемных
// байтов (0xD2..0xFA). Два прохода.
import {
  chApos, chDot, chSoft, chSpace, phBase, phPause, setConsByte, setIot,
  setPunct, setSoftP, setStressV, setVowels,
} from './sets.js';
import { Bytes, at } from './util.js';

function softPhone(c) {
  switch (c) {
    case 0xe4: return 0xd8; // д → дь
    case 0xe7: return 0xd9; // з → зь
    case 0xeb: return 0xda; // л → ль
    case 0xed: return 0xdb; // н → нь
    case 0xf0: return 0xdc; // р → рь
    case 0xf1: return 0xdd; // с → сь
    case 0xf2: return 0xde; // т → ть
    case 0xf6: return 0xdf; // ц → ць
  }
  return c;
}

// iotPhone — іотация (пары набора {Є,І,і,є,Ю,Я,ю,я}).
function iotPhone(c) {
  switch (c) {
    case 0xaa: return 0xd3; // Є → е
    case 0xb2: return 0xd5; // І → і
    case 0xb3: return 0xf9; // і
    case 0xba: return 0xe5; // є → е
    case 0xde: return 0xd7; // Ю → у
    case 0xdf: return 0xd2; // Я → а
    case 0xfe: return 0xf3; // ю → у
    case 0xff: return 0xe0; // я → а
  }
  return c;
}

function stressVowel(c) {
  switch (c) {
    case 0xb2: return 0xd5; // І → і
    case 0xb3: return 0xf9; // і
    case 0xc0: return 0xd2; // А → а
    case 0xc5: return 0xd3; // Е → е
    case 0xc8: return 0xd4; // И → и
    case 0xce: return 0xd6; // О → о
    case 0xd3: return 0xd7; // У → у
  }
  return c;
}

// g2p — оба прохода FUN_0046662c.
export function g2p(s) {
  const n = s.length;
  const r = new Bytes(Math.floor(n * 1.5) + 4);
  if (n > 0 && s[0] === chDot) {
    r.push(phPause);
  }
  for (let i = 1; i <= n; i++) {
    const c = at(s, i);
    const c1 = at(s, i + 1);
    const c2 = at(s, i + 2);
    const prev = at(s, i - 1);
    if (setSoftP[c] && c1 === chSoft) {
      // 1. Мягкий согласный + «ь».
      r.push(softPhone(c));
      i += 1;
    } else if (setSoftP[c] && setIot[c1]) {
      // 2. Мягкий согласный + іотированная гласная.
      r.push(softPhone(c), iotPhone(c1));
      i += 1;
    } else if (c === chSpace && setVowels[c1] && !setPunct[prev]) {
      // 3. Пробел перед гласной (не после пунктуации) → пауза.
      r.push(phPause);
    } else if (c === chApos) {
      // 4. Апостроф пропускается.
    } else if (c === 0xf7 && c1 === 0xf7 && (c2 === 0xb3 || c2 === 0xfe || c2 === 0xff)) {
      // 5a. «чч» + іотированная.
      r.push(0xf7, 0xf9); // «ч» + «щ»
      if (c2 === 0xfe) r.push(0xf3);
      else if (c2 === 0xff) r.push(0xe0);
      i += 2;
    } else if (c === 0xe6 && c1 === 0xe6 && (c2 === 0xb3 || c2 === 0xff)) {
      // 5b. «жж» + і.
      r.push(0xe6, 0xf9); // «ж» + «щ»
      if (c2 === 0xff) r.push(0xe0);
      i += 2;
    } else if (setIot[c]) {
      // 6. Іотированная гласная → «й» + гласная.
      r.push(0xe9, iotPhone(c));
    } else if (c >= 0xe0 && c <= 0xf8) {
      // 7. Буквы а..ш.
      r.push(c);
    } else if (setStressV[c]) {
      // 8. Заглавная ударная гласная.
      r.push(stressVowel(c));
    } else if (c === 0xf9) {
      // 9. «щ» → «ш» + «ч».
      r.push(0xf6, 0xf7);
    } else if (setPunct[c]) {
      // 10. Пунктуация → пауза.
      r.push(phPause);
    }
  }

  // Проход 2: разделители между соседними согласными.
  const len = r.n;
  const mid = r.bytes();
  const out = new Bytes(len + Math.floor(len / 3) + 2);
  for (let j = 0; j < len; j++) {
    const c = mid[j];
    const nx = j + 2 <= len ? mid[j + 1] : 0;
    if (setConsByte[c] && setConsByte[nx]) {
      out.push(c, phPause);
    } else {
      out.push(c);
    }
  }
  out.push(phPause);
  if (out.n > 0 && out.b[0] !== phPause) {
    const full = new Bytes(out.n + 1);
    full.push(phPause);
    full.push(out.bytes());
    return full.bytes();
  }
  return out.bytes();
}

// Служебный экспорт (совместимость с константами оригинала).
export const PH_BASE = phBase;
export const PH_PAUSE = phPause;
