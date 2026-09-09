// Наборы (Delphi sets) из бинарника — битмапы 256 байт.

export function mkSet(...bs) {
  const s = new Uint8Array(256);
  for (const b of bs) s[b] = 1;
  return s;
}

export function mkRangeSet(lo, hi) {
  const s = new Uint8Array(256);
  for (let b = lo; b <= hi; b++) s[b] = 1;
  return s;
}

export function unionSets(...sets) {
  const s = new Uint8Array(256);
  for (const a of sets) for (let i = 0; i < 256; i++) s[i] |= a[i];
  return s;
}

export const chCR = 0x0d;
export const chSpace = 0x20;
export const chApos = 0x27;
export const chDash = 0x2d;
export const chDot = 0x2e;
export const chBacksl = 0x5c;
export const chBacktick = 0x60;
export const chGrave = 0xb4; // ґ
export const chGraveUp = 0x88; // Ґ

// Латиница
export const chLatI = 0x49;
export const chLati = 0x69;

// Украинские буквы (cp1251)
export const chUkrIUp = 0xb2; // І
export const chUkrILow = 0xb3; // і
export const chUkrYiUp = 0xaf; // Ї
export const chUkrYiLo = 0xbf; // ї
export const chUkrYeUp = 0xaa; // Є
export const chUkrYeLo = 0xba; // є
export const chSoft = 0xfc; // ь

// Фонемные байты
export const phPause = 0xfa; // «ъ» — разделитель/пауза, код 40
export const phBase = 0xd2;

// SET_46dff0 — знаки препинания, режущие текст на фразы.
export const setPunct = mkSet(0x0d, 0x21, 0x28, 0x29, 0x2c, 0x2e, 0x3a, 0x3b, 0x3f, 0x85);
// SET_46dfd0 — цифры.
export const setDigit = mkRangeSet(0x30, 0x39);
// SET_46e010 — дефис/тире.
export const setDash = mkSet(0x2d, 0x96, 0x97);
// SET_46e030 — все украинские гласные буквы (верхний и нижний регистр).
export const setVowels = mkSet(
  0xaa, 0xaf, 0xb2, 0xb3, 0xba, 0xbf, 0xc0, 0xc5, 0xc8, 0xce,
  0xd3, 0xde, 0xdf, 0xe0, 0xe5, 0xe8, 0xee, 0xf3, 0xfe, 0xff,
);
// SET_46e050 — безударные украинские гласные (нижний регистр).
export const setEnVow = mkSet(0xb3, 0xe0, 0xe5, 0xe8, 0xee, 0xf3);
// SET_46e574 — согласные, смягчающиеся перед «ь»/іотированной.
export const setSoftP = mkSet(0xe4, 0xe7, 0xeb, 0xed, 0xf0, 0xf1, 0xf2, 0xf6);
// SET_466e50 — іотированные гласные.
export const setIot = mkSet(0xaa, 0xaf, 0xba, 0xbf, 0xde, 0xdf, 0xfe, 0xff);
// SET_466e68 — заглавные гласные, дающие ударный фонемный код.
export const setStressV = mkSet(0xb2, 0xb3, 0xc0, 0xc5, 0xc8, 0xce, 0xd3);
// SET_4653ac — строчные гласные (для поиска явного маркера ударения).
export const setLowVow = mkSet(0xb3, 0xba, 0xbf, 0xe0, 0xe5, 0xe8, 0xee, 0xf3, 0xfe, 0xff);
// SET_465078 / SET_46520c — строчные гласные, имеющие пару в верхнем регистре.
export const setUpperable = mkSet(0xe0, 0xe5, 0xe8, 0xee, 0xf3, 0xfe, 0xff);

// SET_46e554 ∪ SET_46e534 ∪ SET_46e514 — согласные фонемные байты.
export const setConsByte = unionSets(
  unionSets(
    mkSet(0xde, 0xdf, 0xea, 0xef, 0xf2, 0xf6, 0xf7),
    mkSet(0xd8, 0xd9, 0xda, 0xdb, 0xdc, 0xe1, 0xe2, 0xe3, 0xe4,
      0xe6, 0xe7, 0xe9, 0xeb, 0xec, 0xed, 0xf0),
  ),
  mkSet(0xdd, 0xf1, 0xf4, 0xf5, 0xf8),
);

// SET_4676b4 — фонемные коды гласных (используется для голоса 2).
export const setV2Vowel = mkSet(0, 1, 2, 3, 4, 5, 14, 19, 22, 28, 33, 39);
// Коды согласных, перед которыми голос 2 подменяет гласную на код 40.
export const setV2NextFix = mkSet(12, 13, 24, 29, 32, 36, 37);
