var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.js
var index_exports = {};
__export(index_exports, {
  Dictionaries: () => Dictionaries,
  OPTIONS_DEFAULTS: () => OPTIONS_DEFAULTS,
  Rozmovlyalka: () => Rozmovlyalka,
  SAMPLE_RATE: () => SAMPLE_RATE,
  VERSION: () => VERSION,
  Voice: () => Voice,
  bsnTableBytes: () => bsnTableBytes,
  buildDictionaries: () => buildDictionaries,
  buildVoice: () => buildVoice,
  chunkSynth: () => chunkSynth,
  decodeUnitV1: () => decodeUnitV1,
  default: () => api_default,
  diphoneRows: () => diphoneRows,
  diphoneTableSize: () => diphoneTableSize,
  fromCP1251: () => fromCP1251,
  gunzip: () => gunzip,
  loadInt32s: () => loadInt32s,
  pcmToMP3: () => pcmToMP3,
  pcmToMP3Lame: () => pcmToMP3Lame,
  pcmToWAV: () => pcmToWAV,
  pipelineDebug: () => pipelineDebug,
  processChunk: () => processChunk,
  splitBSNbn: () => splitBSNbn,
  splitEUDic: () => splitEUDic,
  synthPCM: () => synthPCM,
  toCP1251: () => toCP1251,
  wavHeader: () => wavHeader
});
module.exports = __toCommonJS(index_exports);

// src/cp1251.js
var CP1251_TO_UNICODE = [
  1026,
  1027,
  8218,
  1107,
  8222,
  8230,
  8224,
  8225,
  8364,
  8240,
  1033,
  8249,
  1034,
  1036,
  1035,
  1039,
  1106,
  8216,
  8217,
  8220,
  8221,
  8226,
  8211,
  8212,
  -1,
  8482,
  1113,
  8250,
  1114,
  1116,
  1115,
  1119,
  160,
  1038,
  1118,
  1032,
  164,
  1168,
  166,
  167,
  1025,
  169,
  1028,
  171,
  172,
  173,
  174,
  1031,
  176,
  177,
  1030,
  1110,
  1169,
  181,
  182,
  183,
  1105,
  8470,
  1108,
  187,
  1112,
  1029,
  1109,
  1111,
  1040,
  1041,
  1042,
  1043,
  1044,
  1045,
  1046,
  1047,
  1048,
  1049,
  1050,
  1051,
  1052,
  1053,
  1054,
  1055,
  1056,
  1057,
  1058,
  1059,
  1060,
  1061,
  1062,
  1063,
  1064,
  1065,
  1066,
  1067,
  1068,
  1069,
  1070,
  1071,
  1072,
  1073,
  1074,
  1075,
  1076,
  1077,
  1078,
  1079,
  1080,
  1081,
  1082,
  1083,
  1084,
  1085,
  1086,
  1087,
  1088,
  1089,
  1090,
  1091,
  1092,
  1093,
  1094,
  1095,
  1096,
  1097,
  1098,
  1099,
  1100,
  1101,
  1102,
  1103
];
var UNICODE_TO_CP1251 = /* @__PURE__ */ new Map();
for (let i = 0; i < CP1251_TO_UNICODE.length; i++) {
  const r = CP1251_TO_UNICODE[i];
  if (r >= 0) UNICODE_TO_CP1251.set(r, i + 128);
}
function toCP1251(str) {
  const out = new Uint8Array(str.length);
  let n = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.codePointAt(i);
    if (c > 65535) i++;
    if (c < 128) {
      out[n++] = c;
      continue;
    }
    const b5 = UNICODE_TO_CP1251.get(c);
    out[n++] = b5 === void 0 ? 63 : b5;
  }
  return out.subarray(0, n);
}
function fromCP1251(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c < 128) {
      s += String.fromCharCode(c);
      continue;
    }
    const r = CP1251_TO_UNICODE[c - 128];
    s += String.fromCharCode(r >= 0 ? r : 65533);
  }
  return s;
}

// src/sets.js
function mkSet(...bs) {
  const s = new Uint8Array(256);
  for (const b5 of bs) s[b5] = 1;
  return s;
}
function mkRangeSet(lo, hi) {
  const s = new Uint8Array(256);
  for (let b5 = lo; b5 <= hi; b5++) s[b5] = 1;
  return s;
}
function unionSets(...sets) {
  const s = new Uint8Array(256);
  for (const a of sets) for (let i = 0; i < 256; i++) s[i] |= a[i];
  return s;
}
var chSpace = 32;
var chApos = 39;
var chDash = 45;
var chDot = 46;
var chBacksl = 92;
var chBacktick = 96;
var chLatI = 73;
var chLati = 105;
var chUkrIUp = 178;
var chUkrILow = 179;
var chUkrYiUp = 175;
var chUkrYiLo = 191;
var chUkrYeUp = 170;
var chUkrYeLo = 186;
var chSoft = 252;
var phPause = 250;
var phBase = 210;
var setPunct = mkSet(13, 33, 40, 41, 44, 46, 58, 59, 63, 133);
var setDigit = mkRangeSet(48, 57);
var setDash = mkSet(45, 150, 151);
var setVowels = mkSet(
  170,
  175,
  178,
  179,
  186,
  191,
  192,
  197,
  200,
  206,
  211,
  222,
  223,
  224,
  229,
  232,
  238,
  243,
  254,
  255
);
var setEnVow = mkSet(179, 224, 229, 232, 238, 243);
var setSoftP = mkSet(228, 231, 235, 237, 240, 241, 242, 246);
var setIot = mkSet(170, 175, 186, 191, 222, 223, 254, 255);
var setStressV = mkSet(178, 179, 192, 197, 200, 206, 211);
var setLowVow = mkSet(179, 186, 191, 224, 229, 232, 238, 243, 254, 255);
var setUpperable = mkSet(224, 229, 232, 238, 243, 254, 255);
var setConsByte = unionSets(
  unionSets(
    mkSet(222, 223, 234, 239, 242, 246, 247),
    mkSet(
      216,
      217,
      218,
      219,
      220,
      225,
      226,
      227,
      228,
      230,
      231,
      233,
      235,
      236,
      237,
      240
    )
  ),
  mkSet(221, 241, 244, 245, 248)
);
var setV2Vowel = mkSet(0, 1, 2, 3, 4, 5, 14, 19, 22, 28, 33, 39);
var setV2NextFix = mkSet(12, 13, 24, 29, 32, 36, 37);

// src/util.js
function at(u8, i) {
  return i >= 1 && i <= u8.length ? u8[i - 1] : 0;
}
function cat(...parts) {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}
function cmpRange(u8, start, end, word) {
  const alen = end - start;
  const n = Math.min(alen, word.length);
  for (let i = 0; i < n; i++) {
    const a = u8[start + i];
    const b5 = word[i];
    if (a !== b5) return a < b5 ? -1 : 1;
  }
  return alen === word.length ? 0 : alen < word.length ? -1 : 1;
}
function bytesEqual(a, b5) {
  if (a === b5) return true;
  if (a.length !== b5.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b5[i]) return false;
  return true;
}
function bytesContains(hay, needle) {
  if (needle.length === 0) return true;
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}
function delphiDiv2(x) {
  return Math.trunc(x / 2);
}
function roundEven(x) {
  let r = Math.round(x);
  if (Math.abs(x - Math.trunc(x)) === 0.5) r = 2 * Math.round(x / 2);
  return r;
}
var Bytes = class {
  constructor(capacity = 256) {
    this.b = new Uint8Array(capacity);
    this.n = 0;
  }
  push(...parts) {
    let need = 0;
    for (const p of parts) need += typeof p === "number" ? 1 : p.length;
    if (this.n + need > this.b.length) {
      let cap = this.b.length * 2;
      while (cap < this.n + need) cap *= 2;
      const next = new Uint8Array(cap);
      next.set(this.b.subarray(0, this.n));
      this.b = next;
    }
    for (const p of parts) {
      if (typeof p === "number") {
        this.b[this.n++] = p;
      } else {
        this.b.set(p, this.n);
        this.n += p.length;
      }
    }
  }
  bytes() {
    return this.b.subarray(0, this.n);
  }
};
function fromHex(s) {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
  return out;
}

// src/abbrev.js
function b(s) {
  return toCP1251(s);
}
var abbrevTbl1 = b("\u0410\u0411\u0412\u0413\u0414\u0415\u0404\u0416\u0417\u0418\u0406\u0407\u0419\u041A\u041B\u041C\u041D\u041E\u041F\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042E\u042F");
var abbrevTbl2 = b("%\u2116+=*/");
var abbrevWords1 = [
  null,
  b("\u0430\\"),
  b("\u0431\u0435\\"),
  b("\u0432\u0435\\"),
  b("\u0433\u0435\\"),
  b("\u0434\u0435\\"),
  b("\u0435\\"),
  b("\u0454\\"),
  b("\u0436\u0435\\"),
  b("\u0437\u0435\\"),
  b("\u0438\\"),
  b("\u0456\\"),
  b("\u0457\\"),
  b("\u0438\\\u0439"),
  b("\u043A\u0430\\"),
  b("\u0435\\\u043B"),
  b("\u0435\\\u043C"),
  b("\u0435\\\u043D"),
  b("\u043E\\"),
  b("\u043F\u0435\\"),
  b("\u0435\\\u0440"),
  b("\u0435\\\u0441"),
  b("\u0442\u0435\\"),
  b("\u0443\\"),
  b("\u0435\\\u0444"),
  b("\u0445\u0430\\"),
  b("\u0446\u0435\\"),
  b("\u0447\u0430\\"),
  b("\u0448\u0430\\"),
  b("\u0449\u0430\\"),
  b("\u044E\\"),
  b("\u044F\\")
];
var abbrevWords2 = [
  null,
  b("\u0432\u0456\u0434\u0441\u043E\u0442\u043A\u0456\u0432"),
  b("\u043D\u043E\u043C\u0435\u0440"),
  b("\u043F\u043B\u044E\u0441"),
  b("\u0434\u043E\u0440\u0456\u0432\u043D\u044E\u0454"),
  b("\u043F\u043E\u043C\u043D\u043E\u0436\u0438\u0442\u0438 \u043D\u0430"),
  b("\u0434\u0456\u043B\u0438\u0442\u0438 \u043D\u0430")
];
function abbrevIndex(tbl, c) {
  for (let k = 0; k < tbl.length; k++) {
    if (tbl[k] === c) return k + 1;
  }
  return 0;
}
function expandAbbreviations(s) {
  const n = s.length;
  const res = new Bytes(n);
  for (let i = 1; i <= n - 1; i++) {
    const c = s[i - 1];
    const j = abbrevIndex(abbrevTbl1, c);
    if (j > 0 && s[i] === 46) {
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

// src/numbers.js
function b2(s) {
  return toCP1251(s);
}
var numT1 = [
  null,
  b2("\u043E\u0434\u0438\u043D"),
  b2("\u0434\u0432\u0430"),
  b2("\u0442\u0440\u0438"),
  b2("\u0447\u043E\u0442\u0438\u0440\u0438"),
  b2("\u043F'\u044F\u0442\u044C"),
  b2("\u0448\u0456\u0441\u0442\u044C"),
  b2("\u0441\u0456\u043C"),
  b2("\u0432\u0456\u0441\u0456\u043C"),
  b2("\u0434\u0435\u0432'\u044F\u0442\u044C"),
  b2("\u0434\u0435\u0441\u044F\u0442\u044C"),
  b2("\u043E\u0434\u0438\u043D\u0430\u0434\u0446\u044F\u0442\u044C"),
  b2("\u0434\u0432\u0430\u043D\u0430\u0434\u0446\u044F\u0442\u044C"),
  b2("\u0442\u0440\u0438\u043D\u0430\u0434\u0446\u044F\u0442\u044C"),
  b2("\u0447\u043E\u0442\u0438\u0440\u043D\u0430\u0434\u0446\u044F\u0442\u044C"),
  b2("\u043F'\u044F\u0442\u043D\u0430\u0434\u0446\u044F\u0442\u044C"),
  b2("\u0448\u0456\u0441\u0442\u043D\u0430\u0434\u0446\u044F\u0442\u044C"),
  b2("\u0441\u0456\u043C\u043D\u0430\u0434\u0446\u044F\u0442\u044C"),
  b2("\u0432\u0456\u0441\u0456\u043C\u043D\u0430\u0434\u0446\u044F\u0442\u044C"),
  b2("\u0434\u0435\u0432'\u044F\u0442\u043D\u0430\u0434\u0446\u044F\u0442\u044C")
];
var numTens = [];
numTens[48] = b2("\u0432\u0456\u0441\u0456\u043C\u0441\u043E\u0442");
numTens[49] = b2("\u0434\u0435\u0432'\u044F\u0442\u0441\u043E\u0442");
numTens[50] = b2("\u0434\u0432\u0430\u0434\u0446\u044F\u0442\u044C");
numTens[51] = b2("\u0442\u0440\u0438\u0434\u0446\u044F\u0442\u044C");
numTens[52] = b2("\u0441\u043E\u0440\u043E\u043A");
numTens[53] = b2("\u043F'\u044F\u0442\u0434\u0435\u0441\u044F\u0442");
numTens[54] = b2("\u0448\u0456\u0441\u0442\u0434\u0435\u0441\u044F\u0442");
numTens[55] = b2("\u0441\u0456\u043C\u0434\u0435\u0441\u044F\u0442");
numTens[56] = b2("\u0432\u0456\u0441\u0456\u043C\u0434\u0435\u0441\u044F\u0442");
numTens[57] = b2("\u0434\u0435\u0432'\u044F\u043D\u043E\u0441\u0442\u043E");
var numHundreds = [];
numHundreds[49] = b2("\u0441\u0442\u043E");
numHundreds[50] = b2("\u0434\u0432\u0456\u0441\u0442\u0456");
numHundreds[51] = b2("\u0442\u0440\u0438\u0441\u0442\u0430");
numHundreds[52] = b2("\u0447\u043E\u0442\u0438\u0440\u0438\u0441\u0442\u0430");
numHundreds[53] = b2("\u043F'\u044F\u0442\u0441\u043E\u0442");
numHundreds[54] = b2("\u0448\u0456\u0441\u0442\u0441\u043E\u0442");
numHundreds[55] = b2("\u0441\u0456\u043C\u0441\u043E\u0442");
numHundreds[56] = b2("\u0432\u0456\u0441\u0456\u043C\u0441\u043E\u0442");
numHundreds[57] = b2("\u0434\u0435\u0432'\u044F\u0442\u0441\u043E\u0442");
var numSing = [];
numSing[2] = b2("\u043C\u0456\u043B\u044C\u0439\u043E\u043D");
numSing[3] = b2("\u043C\u0456\u043B\u044C\u044F\u0440\u0434");
numSing[4] = b2("\u0442\u0440\u0438\u043B\u044C\u0439\u043E\u043D");
numSing[5] = b2("\u043A\u0432\u0430\u0434\u0440\u0438\u043B\u044C\u0439\u043E\u043D");
numSing[6] = b2("\u043A\u0432\u0456\u043D\u0442\u0430\u043B\u044C\u0439\u043E\u043D");
numSing[7] = b2("\u0441\u0435\u043A\u0441\u0442\u0430\u043B\u044C\u0439\u043E\u043D");
numSing[8] = b2("\u0441\u0435\u043F\u0442\u0430\u043B\u044C\u0439\u043E\u043D");
numSing[9] = b2("\u043E\u043A\u0442\u0430\u043B\u044C\u0439\u043E\u043D");
var numPlur234 = [];
numPlur234[2] = b2("\u043C\u0456\u043B\u044C\u0439\u043E\u043D\u0438");
numPlur234[3] = b2("\u043C\u0456\u043B\u044C\u044F\u0440\u0434\u0438");
numPlur234[4] = b2("\u0442\u0440\u0438\u043B\u044C\u0439\u043E\u043D\u0438");
numPlur234[5] = b2("\u043A\u0432\u0430\u0434\u0440\u0438\u043B\u044C\u0439\u043E\u043D\u0438");
numPlur234[6] = b2("\u043A\u0432\u0456\u043D\u0442\u0430\u043B\u044C\u0439\u043E\u043D\u0438");
numPlur234[7] = b2("\u0441\u0435\u043A\u0441\u0442\u0430\u043B\u044C\u0439\u043E\u043D\u0438");
numPlur234[8] = b2("\u0441\u0435\u043F\u0442\u0430\u043B\u044C\u0439\u043E\u043D\u0438");
numPlur234[9] = b2("\u043E\u043A\u0442\u0430\u043B\u044C\u0439\u043E\u043D\u0438");
var numPlur5 = [];
numPlur5[2] = b2("\u043C\u0456\u043B\u044C\u0439\u043E\u043D\u0456\u0432");
numPlur5[3] = b2("\u043C\u0456\u043B\u044C\u044F\u0440\u0434\u0456\u0432");
numPlur5[4] = b2("\u0442\u0440\u0438\u043B\u044C\u0439\u043E\u043D\u0456\u0432");
numPlur5[5] = b2("\u043A\u0432\u0430\u0434\u0440\u0438\u043B\u044C\u0439\u043E\u043D\u0456\u0432");
numPlur5[6] = b2("\u043A\u0432\u0456\u043D\u0442\u0430\u043B\u044C\u0439\u043E\u043D\u0456\u0432");
numPlur5[7] = b2("\u0441\u0435\u043A\u0441\u0442\u0430\u043B\u044C\u0439\u043E\u043D\u0456\u0432");
numPlur5[8] = b2("\u0441\u0435\u043F\u0442\u0430\u043B\u044C\u0439\u043E\u043D\u0456\u0432");
numPlur5[9] = b2("\u043E\u043A\u0442\u0430\u043B\u044C\u0439\u043E\u043D\u0456\u0432");
var numSpace = b2(" ");
var numThousand1 = b2("\u043E\u0434\u043D\u0430 \u0442\u0438\u0441\u044F\u0447\u0430");
var numTwoFem = b2("\u0434\u0432\u0456");
var numThoushi = b2("\u0442\u0438\u0441\u044F\u0447\u0456");
var numThoush = b2("\u0442\u0438\u0441\u044F\u0447");
var numZeroWord = b2("\u043D\u0443\u043B\u044C");
var numManyWord = b2("\u0431\u0430\u0433\u0430\u0442\u043E");
var numTriple0 = b2("000");
function atoiDigits(s) {
  let v = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c < 48 || c > 57) return v;
    v = v * 10 + c - 48;
  }
  return v;
}
function num1(s, gender) {
  const dlen = s.length;
  const v = atoiDigits(s);
  let out = new Uint8Array(0);
  const set = (part) => {
    out = part;
  };
  const add = (p) => {
    out = cat(out, p);
  };
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
function num2(digits) {
  let n = digits.length;
  if (n > 30) return numManyWord.slice();
  if (n < 9 && atoiDigits(digits) === 0) return numZeroWord.slice();
  let cur = digits;
  let acc = new Uint8Array(0);
  let gender = 0;
  for (; ; ) {
    let grp;
    if (n <= 3) {
      grp = cur;
    } else {
      grp = cur.subarray(n - 3, n);
      cur = cur.subarray(0, n - 3);
    }
    if (!(grp.length === 3 && grp[0] === 48 && grp[1] === 48 && grp[2] === 48)) {
      acc = cat(num1(grp, gender), numSpace, acc);
    }
    gender++;
    n -= 3;
    if (n <= 0) break;
  }
  return acc;
}
function expandNumbers(s) {
  const n = s.length;
  let i = 1;
  const bytes = new Bytes(n + 16);
  while (i <= n) {
    let digits = null;
    for (; ; ) {
      const c = i <= n ? s[i - 1] : 0;
      if (c >= 48 && c <= 57) break;
      if (i > n) break;
      bytes.push(c);
      i++;
    }
    const dig = new Bytes();
    for (; ; ) {
      const c = i <= n ? s[i - 1] : 0;
      if (c < 48 || c > 57) break;
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

// src/english.js
function b3(s) {
  return toCP1251(s);
}
var enLetter = [];
enLetter[97] = b3("\u0435\u0439");
enLetter[98] = b3("\u0431\u0456");
enLetter[99] = b3("\u0441\u0456");
enLetter[100] = b3("\u0434\u0456");
enLetter[101] = b3("\u0456");
enLetter[102] = b3("\u0435\u0444");
enLetter[103] = b3("\u0434\u0436\u0456");
enLetter[104] = b3("\u0435\u0439\u0447");
enLetter[105] = b3("\u0430\u0439");
enLetter[106] = b3("\u0434\u0436\u0435\u0439");
enLetter[107] = b3("\u043A\u0435\u0439");
enLetter[108] = b3("\u0435\u043B\u044C");
enLetter[109] = b3("\u0435\u043C");
enLetter[110] = b3("\u0435\u043D");
enLetter[111] = b3("\u043E\u0443");
enLetter[112] = b3("\u043F\u0456");
enLetter[113] = b3("\u043A\u0443");
enLetter[114] = b3("\u0430\u0440");
enLetter[115] = b3("\u0435\u0441");
enLetter[116] = b3("\u0442\u0456");
enLetter[117] = b3("\u044E");
enLetter[118] = b3("\u0432\u0456");
enLetter[119] = b3("\u0434\u0430\u0431\u043B");
enLetter[120] = b3("\u0435\u043A\u0441");
enLetter[121] = b3("\u0432\u0430\u0439");
enLetter[122] = b3("\u0437\u0435\u0442");
var enTranslit = [];
enTranslit[97] = b3("\u0430");
enTranslit[98] = b3("\u0431");
enTranslit[99] = b3("\u043A");
enTranslit[100] = b3("\u0434");
enTranslit[101] = b3("\u0435");
enTranslit[102] = b3("\u0444");
enTranslit[103] = b3("\u0433");
enTranslit[104] = b3("\u0433");
enTranslit[105] = b3("\u0456");
enTranslit[106] = b3("\u0434\u0436");
enTranslit[107] = b3("\u043A");
enTranslit[108] = b3("\u043B");
enTranslit[109] = b3("\u043C");
enTranslit[110] = b3("\u043D");
enTranslit[111] = b3("\u043E");
enTranslit[112] = b3("\u043F");
enTranslit[113] = b3("\u043A");
enTranslit[114] = b3("\u0440");
enTranslit[115] = b3("\u0441");
enTranslit[116] = b3("\u0442");
enTranslit[117] = b3("\u0443");
enTranslit[118] = b3("\u0432");
enTranslit[119] = b3("\u0432");
enTranslit[120] = b3("\u043A\u0441");
enTranslit[121] = b3("\u0456");
enTranslit[122] = b3("\u0437");
var enSpace = b3(" ");
var enSh = b3("\u0448");
var enS = b3("\u0441");
var enCh = b3("\u0447");
var enStress = b3("\\");
var enTailMap = [
  [b3("s"), b3("\u0441")],
  [b3("t"), b3("\u0442")],
  [b3("m"), b3("\u043C")],
  [b3("d"), b3("\u0434")],
  [b3("ll"), b3("\u043B")],
  [b3("re"), b3("\u0430\\")],
  [b3("ve"), b3("\u0432")]
];
function mapEnTail(tail) {
  for (const [key, val] of enTailMap) {
    if (tail.length === key.length) {
      let eq = true;
      for (let i = 0; i < key.length; i++) {
        if (tail[i] !== key[i]) {
          eq = false;
          break;
        }
      }
      if (eq) return val;
    }
  }
  return tail;
}
function spellEnglish(word) {
  const out = new Bytes(word.length * 4);
  for (let i = 0; i < word.length; i++) {
    out.push(enLetter[word[i]], enSpace);
  }
  return out.bytes();
}
function translitEnglish(word) {
  const n = word.length;
  const out = new Bytes(n * 3);
  let wantStress = true;
  let i = 1;
  while (i <= n) {
    const c = word[i - 1];
    let t = enTranslit[c];
    if (c === 115 && i < n && at(word, i + 1) === 104) {
      out.push(enSh);
      i += 2;
      continue;
    }
    if (c === 99 && i < n) {
      const nx = at(word, i + 1);
      if (nx === 101 || nx === 105 || nx === 121) t = enS;
    }
    if (c === 99 && i < n && at(word, i + 1) === 104) {
      out.push(enCh);
      i += 2;
      continue;
    }
    out.push(t);
    if (wantStress && t.length > 0 && setEnVow[t[0]]) {
      out.push(92);
      wantStress = false;
    }
    i++;
  }
  return out.bytes();
}
function expandEnglish(s, dicts) {
  const n = s.length;
  const out = new Bytes(n + 16);
  let word = null;
  let tail = null;
  let inWord = false;
  let nUpper = 0;
  let i = 1;
  while (i <= n) {
    const c = s[i - 1];
    const isUpper = c >= 65 && c <= 90;
    const isLower = c >= 97 && c <= 122;
    if (isUpper || isLower) {
      inWord = true;
      if (word === null) word = new Bytes();
      if (isUpper) {
        word.push(c + 32);
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
      for (; ; ) {
        const cc = at(s, i);
        if (cc < 97 || cc >= 123) break;
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
var u8empty = new Uint8Array(0);
var enStressHex = toHexSafe(enStress);
function toHexSafe(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += u8[i].toString(16).padStart(2, "0");
  return s;
}

// src/normalize.js
function normKeep(c) {
  return c >= 224 && c <= 249 || c === 252 || c === 254 || c === 255;
}
function normUpper(c) {
  return c >= 192 && c <= 217 || c === 220 || c === 222 || c === 223;
}
function normalizeText(s) {
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
      res.push(44);
    } else if (c === chSpace && setPunct[nx]) {
    } else if (normUpper(c)) {
      res.push(c + 32);
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

// src/stress.js
function b4(s) {
  return toCP1251(s);
}
var list1 = b4(" \u0443 \u0432 \u0434\u043E \u043D\u0430 \u043F\u043E \u0432\u0456\u0434 \u043E\u0434 \u043F\u0440\u043E \u0434\u043B\u044F \u0437\u0430 \u043F\u0456\u0434 \u0456\u0437 \u0437 \u0431\u0456\u043B\u044F \u043A\u0440\u0456\u043C \u0431\u0435\u0437 \u043F\u043E\u0432\u0437 \u043E\u043A\u0440\u0456\u043C \u043A\u043E\u043B\u043E ");
var list2 = b4(" \u0434\u043E \u0432\u0456\u0434 \u043E\u0434 \u0437 \u0456\u0437 \u0431\u0456\u043B\u044F \u043A\u043E\u043B\u043E \u0434\u043B\u044F \u0431\u0435\u0437 \u043A\u0440\u0456\u043C \u043D\u0435\u043C\u0430 \u043D\u0435\u043C\u0430\u0454 \u043E\u043A\u0440\u0456\u043C \u043F\u043E\u0431\u043B\u0438\u0437\u0443");
function upVowel(c) {
  if (setUpperable[c]) return c - 32;
  if (c === chUkrILow) return chUkrIUp;
  if (c === chUkrYiLo) return chUkrYiUp;
  if (c === chUkrYeLo) return chUkrYeUp;
  return c;
}
function tokenize(s, state) {
  const n = s.length;
  for (; ; ) {
    const c = at(s, state.i);
    if (!(setPunct[c] || c === chSpace || c === chDash)) break;
    state.i++;
  }
  const word = new Bytes();
  for (; ; ) {
    const c = at(s, state.i);
    if (setPunct[c] || c === chSpace || c === chDash) break;
    word.push(c);
    state.i++;
    if (n < state.i) break;
  }
  return word.bytes();
}
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
function upcaseAllVowels(word) {
  const out = word.slice();
  for (let j = 0; j < out.length; j++) {
    const c = out[j];
    if (setUpperable[c]) out[j] = c - 32;
    else if (c === chUkrILow) out[j] = chUkrIUp;
    else if (c === chUkrYiLo) out[j] = chUkrYiUp;
    else if (c === chUkrYeLo) out[j] = chUkrYeUp;
  }
  return out;
}
var meneMarked = b4("\u043C\u0415\u043D\u0435");
var tebeMarked = b4("\u0442\u0415\u0431\u0435");
var sebeMarked = b4("\u0441\u0415\u0431\u0435");
var mene = b4("\u043C\u0435\u043D\u0435");
var tebe = b4("\u0442\u0435\u0431\u0435");
var sebe = b4("\u0441\u0435\u0431\u0435");
var oyi = b4("\u043E\u0457");
var yeyi = b4("\u0454\u0457");
var oho = b4("\u043E\u0433\u043E");
var sya = b4("\u0441\u044F");
var sy = b4("\u0441\u044C");
function dictStress(d, word, prev) {
  const ctx = cat(b4(" "), prev, b4(" "));
  if (bytesContains(list1, ctx)) {
    if (bytesEqual(word, mene)) return meneMarked.slice();
    if (bytesEqual(word, tebe)) return tebeMarked.slice();
    if (bytesEqual(word, sebe)) return sebeMarked.slice();
  }
  let bch = d.skorLookup(word);
  if (bch !== 56) {
    const out = word.slice();
    let k = 48;
    for (let j = 0; j < out.length; j++) {
      if (!setVowels[out[j]]) continue;
      k++;
      if (k === bch) {
        out[j] = upVowel(out[j]);
      }
    }
    return out;
  }
  bch = d.bsnLookup(word);
  const n = word.length;
  if (bch > 65 && bch < 80) {
    const x = bch - 60;
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
  if (bch === 56 && n > 2) {
    const pre = word.subarray(0, n - 2);
    let end2 = word.subarray(n - 2);
    if (bytesEqual(end2, sy)) end2 = sya;
    if (bytesEqual(end2, b4("\u0430\u044F")) || bytesEqual(end2, b4("\u0443\u044E")) || bytesEqual(end2, b4("\u0435\u0454")) || bytesEqual(end2, b4("\u0456\u0457")) || bytesEqual(end2, b4("\u044F\u044F")) || bytesEqual(end2, b4("\u0454\u0454"))) {
      end2 = end2.subarray(0, 1);
    }
    bch = d.bsnLookup(cat(pre, end2));
  }
  if (bch === 56) {
    if (n > 1) return upcaseAllVowels(word);
    return word.slice();
  }
  if (bch > 57) bch -= 57;
  else if (bch > 47) bch -= 48;
  return markStress(word, bch);
}
function markerPos(word) {
  for (let j = 1; j <= word.length; j++) {
    if (at(word, j) === chBacksl) return j - 1;
    if (at(word, j) === chApos && setLowVow[at(word, j - 1)]) return j - 1;
  }
  return 0;
}
var prevInit = b4("\u044C\u044C");
function stressText(d, s) {
  const n = s.length;
  const acc = new Bytes(n + Math.floor(n / 4) + 16);
  const state = { i: 1 };
  let prevWord = prevInit.slice();
  for (; ; ) {
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

// src/g2p.js
function softPhone(c) {
  switch (c) {
    case 228:
      return 216;
    // д → дь
    case 231:
      return 217;
    // з → зь
    case 235:
      return 218;
    // л → ль
    case 237:
      return 219;
    // н → нь
    case 240:
      return 220;
    // р → рь
    case 241:
      return 221;
    // с → сь
    case 242:
      return 222;
    // т → ть
    case 246:
      return 223;
  }
  return c;
}
function iotPhone(c) {
  switch (c) {
    case 170:
      return 211;
    // Є → е
    case 178:
      return 213;
    // І → і
    case 179:
      return 249;
    // і
    case 186:
      return 229;
    // є → е
    case 222:
      return 215;
    // Ю → у
    case 223:
      return 210;
    // Я → а
    case 254:
      return 243;
    // ю → у
    case 255:
      return 224;
  }
  return c;
}
function stressVowel(c) {
  switch (c) {
    case 178:
      return 213;
    // І → і
    case 179:
      return 249;
    // і
    case 192:
      return 210;
    // А → а
    case 197:
      return 211;
    // Е → е
    case 200:
      return 212;
    // И → и
    case 206:
      return 214;
    // О → о
    case 211:
      return 215;
  }
  return c;
}
function g2p(s) {
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
      r.push(softPhone(c));
      i += 1;
    } else if (setSoftP[c] && setIot[c1]) {
      r.push(softPhone(c), iotPhone(c1));
      i += 1;
    } else if (c === chSpace && setVowels[c1] && !setPunct[prev]) {
      r.push(phPause);
    } else if (c === chApos) {
    } else if (c === 247 && c1 === 247 && (c2 === 179 || c2 === 254 || c2 === 255)) {
      r.push(247, 249);
      if (c2 === 254) r.push(243);
      else if (c2 === 255) r.push(224);
      i += 2;
    } else if (c === 230 && c1 === 230 && (c2 === 179 || c2 === 255)) {
      r.push(230, 249);
      if (c2 === 255) r.push(224);
      i += 2;
    } else if (setIot[c]) {
      r.push(233, iotPhone(c));
    } else if (c >= 224 && c <= 248) {
      r.push(c);
    } else if (setStressV[c]) {
      r.push(stressVowel(c));
    } else if (c === 249) {
      r.push(246, 247);
    } else if (setPunct[c]) {
      r.push(phPause);
    }
  }
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

// src/synth.js
var diphoneTableSize = 42;
var diphoneRows = diphoneTableSize * diphoneTableSize;
var scratchSize = 7001;
var synthBuffer = 5e5;
var xfHalf = 8;
var xfWin = 2 * xfHalf + 1;
var Voice = class {
  constructor(label, ip, lp, sd) {
    this.label = label;
    this.ip = ip;
    this.lp = ip && lp ? lp : null;
    this.sd = sd;
  }
};
function synthPCM(ph, v, rate) {
  const out = new Uint8Array(synthBuffer).fill(128);
  const pre = [];
  const getPCM = (i) => {
    if (i >= 0) return out[i];
    while (pre.length <= -i - 1) pre.push(0);
    return pre[-i - 1];
  };
  const putPCM = (i, bv) => {
    if (i >= 0) {
      out[i] = bv;
      return;
    }
    while (pre.length <= -i - 1) pre.push(0);
    pre[-i - 1] = bv;
  };
  const scratch = new Uint8Array(scratchSize);
  let total = 0;
  for (let i = 0; i + 1 < ph.length; i++) {
    let prev = ph[i] - phBase;
    let next = ph[i + 1] - phBase;
    if (v.label === "2" && prev >= 0 && prev <= 39 && setV2Vowel[prev] && next >= 0 && next <= 39 && setV2NextFix[next]) {
      next = 40;
    }
    if (prev < 0 || prev >= diphoneTableSize || next < 0 || next >= diphoneTableSize) {
      continue;
    }
    const k = next + prev * diphoneTableSize;
    const off = v.ip[k];
    let ulen = v.lp[k];
    if (ulen <= 0) continue;
    let unit;
    if (v.label !== "1") {
      scratch.set(v.sd.subarray(off, off + ulen));
      unit = scratch;
    } else if (rate === 5) {
      const hdr = v.sd[off];
      ulen -= hdr;
      if (ulen > 0) {
        scratch.set(v.sd.subarray(off + hdr, off + hdr + ulen));
      }
      unit = scratch;
    } else {
      unit = decodeUnitV1(v.sd, off, rate, prev, next);
      ulen = unit.length;
      if (ulen < xfWin) {
        const padded = new Uint8Array(xfWin).fill(128);
        padded.set(unit);
        unit = padded;
      }
    }
    if (total === 0) {
      if (ulen >= 1) out.set(unit.subarray(0, ulen));
      total += ulen;
      continue;
    }
    if (total + ulen - 2 * xfHalf >= synthBuffer) break;
    for (let j = 0; j < xfWin; j++) {
      const w = j / (2 * xfHalf);
      const idx = total - 2 * xfHalf - 1 + j;
      const a = roundEven((1 - w) * (getPCM(idx) - 128) + 128);
      const bv = roundEven(w * (unit[j] - 128));
      putPCM(idx, a + bv & 255);
    }
    const m = ulen - 2 - 2 * xfHalf;
    if (m >= 0) {
      for (let j = 0; j <= m; j++) {
        putPCM(total + j, unit[2 * xfHalf + j]);
      }
    }
    total += ulen - 2 * xfHalf - 1;
  }
  return out.subarray(0, total);
}
function decodeUnitV1(sd, off, rate, prev, next) {
  let d = rate;
  if (rate >= 5) {
    d = next < 6 || prev < 6 ? 11 - rate : 12 - rate;
  }
  const dst = [];
  let dn = 0;
  const pushSlice = (from, to) => {
    for (let i = from; i < to; i++) dst[dn++] = sd[i];
  };
  const pushPause = (cnt) => {
    for (let i = 0; i < cnt; i++) dst[dn++] = 128;
  };
  const segCount = sd[off + 1];
  for (let segIdx = 1; segIdx <= segCount; segIdx++) {
    let srcPos = 0;
    const w = sd[off + 1 + segIdx];
    const tagType = sd[off + w];
    const size = sd[off + w + 1] | sd[off + w + 2] << 8;
    const n2 = sd[off + w + 3] | sd[off + w + 4] << 8;
    const tmpStart = off + size;
    const pushTmp = (len) => {
      for (let i = 0; i < len; i++) dst[dn++] = sd[tmpStart + srcPos + i];
    };
    const skipTmp = (len) => {
      srcPos += len;
    };
    if (tagType === 1) {
      let cnt = n2 + Math.trunc(n2 / d);
      if (rate > 5) cnt = n2 - Math.trunc(n2 / d);
      pushPause(cnt);
    } else if (tagType === 2) {
      const period = prev === 32 ? 35 : 70;
      const kMax = Math.trunc(n2 / period);
      for (let k = 1; k <= kMax; k++) {
        if (k % d !== 0) {
          pushTmp(period);
          srcPos += period;
        } else if (rate > 5) {
          skipTmp(period);
        } else {
          pushTmp(period);
          pushTmp(period);
          srcPos += period;
        }
      }
    } else if (tagType === 3) {
      const lcnt = sd[off + w + 5];
      if (segIdx === 1) {
        pushTmp(8);
        srcPos += 8;
      }
      for (let k = 1; k <= lcnt; k++) {
        const ln = sd[off + w + 5 + k];
        if (k % d !== 0) {
          pushTmp(ln);
          srcPos += ln;
        } else if (rate > 5) {
          skipTmp(ln);
        } else {
          pushTmp(ln);
          pushTmp(ln);
          srcPos += ln;
        }
      }
    }
    const rem = n2 - srcPos;
    if (rem > 0) {
      pushTmp(rem);
      srcPos += rem;
    }
  }
  return Uint8Array.from(dst.length === dn ? dst : dst.slice(0, dn));
}

// src/dict.js
var bsnTableBytes = toCP1251(
  `!\u0430\u0431\u0432\u0433\u0491\u0434\u0435\u0454\u0436\u0437\u0438\u0456\u0457\u0439\u043A\u043B\u043C\u043D\u043E\u043F\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044C\u044E\u044F'\\- 0123456789:;<=>?@#$`
);
var dictMiss = 56;
var Dictionaries = class {
  constructor({ bsn, eudic, skf, wif, wlf, skorN, decode }) {
    this.bsn = bsn;
    this.eudic = eudic;
    this.skf = skf;
    this.wif = wif;
    this.wlf = wlf;
    this.skorN = skorN;
    this.decode = decode;
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
      const end = marks[mid];
      const bodyEnd = end - 1;
      let c;
      const alen = bodyEnd - start;
      const n = Math.min(alen, word.length);
      let res = 0;
      for (let i = 0; i < n && res === 0; i++) {
        const raw = buf[start + i];
        const a = raw < 65 ? decode[raw] : raw;
        const wb = word[i];
        if (a !== wb) res = a < wb ? -1 : 1;
      }
      if (res !== 0) c = res;
      else if (alen !== word.length) c = alen < word.length ? -1 : 1;
      else {
        const raw = buf[end - 1];
        return raw < 65 ? decode[raw] : raw;
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
      if (mid === count && e >= 2 && buf[e - 2] === 13 && buf[e - 1] === 10) e -= 2;
      let sp = e;
      for (let p = s; p < e; p++) {
        if (buf[p] === 32) {
          sp = p;
          break;
        }
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
};
function splitBSNbn(buf) {
  const n = buf.length;
  const marks = [0];
  for (let p = 1; p <= n - 1; p++) {
    const c = buf[p];
    if (c >= 38 && c <= 80) marks.push(p + 1);
  }
  const count = marks.length - 1;
  return { buffer: buf, marks: Uint32Array.from(marks), count };
}
function splitEUDic(buf) {
  const lines = [];
  let pos = 0;
  while (pos <= buf.length) {
    lines.push(pos);
    let found = -1;
    for (let j = pos; j + 1 < buf.length; j++) {
      if (buf[j] === 13 && buf[j + 1] === 10) {
        found = j;
        break;
      }
    }
    if (found < 0) break;
    pos = found + 2;
  }
  while (lines.length > 0 && lines[lines.length - 1] >= buf.length) lines.pop();
  const count = lines.length;
  return { buffer: buf, starts: Uint32Array.from(lines), count };
}

// src/fsread.js
var import_promises = require("node:fs/promises");
var import_node_url = require("node:url");
async function readFileBytes(url) {
  const target = url.startsWith("file:") ? (0, import_node_url.fileURLToPath)(url) : url;
  const buf = await (0, import_promises.readFile)(target);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

// src/data.js
var VOICE_LABELS = ["1", "2", "3"];
var DICT_FILES = [
  ["bsn", "bsnbn.bin.gz"],
  ["eudic", "eudic.bin.gz"],
  ["skf", "skf.bin.gz"],
  ["wif", "wif.bin.gz"],
  ["wlf", "wlf.bin.gz"]
];
var VOICE_FILES = (label) => [
  [`v_ip_${label}`, `v${label}_ip.bin.gz`],
  [`v_lp_${label}`, `v${label}_lp.bin.gz`],
  [`v_sd_${label}`, `v${label}_sd.bin.gz`]
];
async function gunzip(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("rozmovlyalka-js: DecompressionStream \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u044D\u0442\u043E\u0439 \u0441\u0440\u0435\u0434\u043E\u0439 (\u043D\u0443\u0436\u0435\u043D Node 18+, Chrome 80+, Safari 16.4+, Firefox 113+)");
  }
  const ds = new DecompressionStream("gzip");
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}
function loadInt32s(bytes) {
  if (bytes.length % 4 !== 0) {
    throw new Error(`rozmovlyalka-js: \u0440\u0430\u0437\u043C\u0435\u0440 ${bytes.length} \u043D\u0435 \u043A\u0440\u0430\u0442\u0435\u043D 4`);
  }
  const out = new Int32Array(bytes.length / 4);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < out.length; i++) {
    out[i] = dv.getInt32(4 * i, true);
  }
  return out;
}
function makeFetcher(dataUrl, customFetcher) {
  const isNode = typeof process !== "undefined" && process.versions && process.versions.node;
  const base = dataUrl == null ? "" : String(dataUrl).replace(/\/+$/, "") + "/";
  return async (name) => {
    if (customFetcher) {
      const raw = await customFetcher(name, base);
      if (raw instanceof Uint8Array) return raw;
      if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
      throw new Error("rozmovlyalka-js: customFetcher \u0434\u043E\u043B\u0436\u0435\u043D \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0442\u044C Uint8Array/ArrayBuffer");
    }
    const url = base + name;
    const looksLikePath = /^(\/|\.\/|\.\.\/|[A-Za-z]:[\\/])/.test(url) || !/^[a-z][a-z0-9+.-]*:/i.test(url);
    if (isNode && (url.startsWith("file:") || looksLikePath) && !/^https?:/i.test(url)) {
      return readFileBytes(url);
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`rozmovlyalka-js: \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 "${url}": ${res.status} ${res.statusText}`);
    }
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  };
}
function buildDictionaries({ bsn, eudic, skf, wif, wlf }) {
  const wif32 = loadInt32s(wif);
  if (wif32.length === 0) throw new Error("rozmovlyalka-js: \u043F\u0443\u0441\u0442\u043E\u0439 wif.bin");
  const decode = new Uint8Array(256);
  decode.set(bsnTableBytes.subarray(0, 57));
  return new Dictionaries({
    bsn: splitBSNbn(bsn),
    eudic: splitEUDic(eudic),
    skf,
    wif: wif32,
    wlf,
    skorN: wif32[0],
    decode
  });
}
function buildVoice(label, ipRaw, lpRaw, sd) {
  const ip = loadInt32s(ipRaw);
  const lp = loadInt32s(lpRaw);
  if (ip.length < 42 * 42 || lp.length < 42 * 42) {
    throw new Error(`rozmovlyalka-js: \u0433\u043E\u043B\u043E\u0441 "${label}": \u0442\u0430\u0431\u043B\u0438\u0446\u0430 \u0434\u0438\u0444\u043E\u043D\u043E\u0432 \u043A\u043E\u0440\u043E\u0447\u0435 1764`);
  }
  return new Voice(label, ip, lp, sd);
}
async function loadDataBundle({ dataUrl, fetch: fetch2, onProgress } = {}) {
  const read = makeFetcher(dataUrl, fetch2);
  const allNames = [...DICT_FILES.map((n) => n[1]), ...VOICE_LABELS.flatMap((l) => VOICE_FILES(l).map((n) => n[1]))];
  const cache = /* @__PURE__ */ new Map();
  let loaded = 0;
  let total = 0;
  for (const name of allNames) {
    const raw = cache.get(name) || await read(name);
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
    loaded += cache.get(`v${l}_ip.bin.gz`).byteLength + cache.get(`v${l}_lp.bin.gz`).byteLength + cache.get(`v${l}_sd.bin.gz`).byteLength;
    voices[l] = v;
    if (onProgress) onProgress({ loaded, total, stage: `voice:${l}` });
  }
  return { dicts: buildDictionaries(dicts), voices };
}

// src/wav.js
var WAV_TEMPLATE = fromHex(
  "524946462400000057415645666d74201000000001000100112b0000112b0000010008006461746100000000"
);
function wavHeader(dataLen) {
  const h = WAV_TEMPLATE.slice();
  const dv = new DataView(h.buffer);
  dv.setUint32(4, 44 - 8 + dataLen, true);
  dv.setUint32(40, dataLen, true);
  return h;
}
function pcmToWAV(pcm) {
  const h = wavHeader(pcm.length);
  const out = new Uint8Array(44 + pcm.length);
  out.set(h, 0);
  out.set(pcm, 44);
  return out;
}

// src/ffmpeg.js
var import_node_child_process = require("node:child_process");
function ffmpegAvailable() {
  try {
    const r = (0, import_node_child_process.spawnSync)("ffmpeg", ["-version"], { stdio: "ignore" });
    return r.error === void 0 && r.status === 0;
  } catch {
    return false;
  }
}
function encodeMP3WithFFmpeg(pcm) {
  const raw = Buffer.alloc(2 * pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    raw.writeInt16LE((pcm[i] & 255) - 128, 2 * i);
  }
  const r = (0, import_node_child_process.spawnSync)(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "s16le",
      "-ar",
      "11025",
      "-ac",
      "1",
      "-i",
      "pipe:0",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "32k",
      "-f",
      "mp3",
      "pipe:1"
    ],
    { input: raw, maxBuffer: 64 * 1024 * 1024 }
  );
  if (r.error) throw new Error(`rozmovlyalka-js: ffmpeg: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`rozmovlyalka-js: ffmpeg: ${r.stderr.toString()}`);
  return new Uint8Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength);
}

// src/mp3.js
async function pcmToMP3(pcm, { kbps = 32, encoder } = {}) {
  if (ffmpegAvailable()) {
    return encodeMP3WithFFmpeg(pcm);
  }
  return pcmToMP3Lame(pcm, kbps, encoder);
}
function resolveLameEncoder(encoder) {
  if (encoder) return encoder;
  const g = globalThis;
  if (g && g.lamejs && g.lamejs.Mp3Encoder) return g.lamejs.Mp3Encoder;
  throw new Error(
    'rozmovlyalka-js: \u044D\u043D\u043A\u043E\u0434\u0435\u0440 lamejs \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435 lame.min.js \u043A\u0430\u043A <script src="lame.min.js"> \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u0434\u0430\u0439\u0442\u0435 \u043A\u043B\u0430\u0441\u0441 Mp3Encoder \u0432 \u043E\u043F\u0446\u0438\u044F\u0445 (\u0432 Node \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F ffmpeg \u0438 lamejs \u043D\u0435 \u043D\u0443\u0436\u0435\u043D)'
  );
}
function pcmToMP3Lame(pcm, kbps = 32, encoder) {
  const pcm16 = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    pcm16[i] = (pcm[i] & 255) - 128 << 8;
  }
  const Mp3Encoder = resolveLameEncoder(encoder);
  const enc = new Mp3Encoder(1, 11025, kbps);
  const parts = [];
  const blockSize = 1152;
  for (let i = 0; i < pcm16.length; i += blockSize) {
    const chunk = pcm16.subarray(i, i + blockSize);
    if (chunk.length === 0) break;
    const mp3buf = enc.encodeBuffer(chunk);
    if (mp3buf.length > 0) parts.push(mp3buf);
  }
  const end = enc.flush();
  if (end.length > 0) parts.push(end);
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

// src/module-dir.js
var import_meta = {};
var defaultDataUrl = (() => {
  try {
    return new URL("../data/", import_meta.url).href;
  } catch {
    return null;
  }
})();

// src/api.js
var SAMPLE_RATE = 11025;
var OPTIONS_DEFAULTS = Object.freeze({ voice: "1", rate: 5 });
function validateOptions(opts) {
  let { voice, rate } = { ...OPTIONS_DEFAULTS, ...opts || {} };
  if (!voice || voice === 0) voice = "1";
  if (voice !== "1" && voice !== "2" && voice !== "3") {
    throw new Error(`rozmovlyalka-js: \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0433\u043E\u043B\u043E\u0441 ${JSON.stringify(voice)} (\u043E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F '1', '2' \u0438\u043B\u0438 '3')`);
  }
  if (!rate || rate === 0) rate = 5;
  if (rate < 1 || rate > 10) {
    throw new Error(`rozmovlyalka-js: \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C ${rate} \u0432\u043D\u0435 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430 1..10`);
  }
  return { voice: String(voice), rate };
}
function processChunk(acc, dicts, voice, rate) {
  let s = cat(acc, new Uint8Array([13, 10]));
  s = expandAbbreviations(s);
  s = expandNumbers(s);
  s = expandEnglish(s, dicts);
  s = normalizeText(s);
  if (s.length < 2) return null;
  s = stressText(dicts, s);
  s = g2p(s);
  return synthPCM(s, voice, rate);
}
function chunkSynth(textBytes, dicts, initialVoice, voices, rate) {
  const n = textBytes.length;
  const outChunks = [];
  const acc = new Bytes(200);
  let cur = initialVoice;
  let hashFlag = false;
  const process2 = () => {
    const pcm = processChunk(acc.bytes(), dicts, cur, rate);
    if (pcm !== null) outChunks.push(pcm);
    acc.n = 0;
  };
  for (let i = 0; i < n; i++) {
    const c = textBytes[i];
    if (c === 10) continue;
    if (c === 35) {
      hashFlag = true;
      continue;
    }
    if (hashFlag && (c === 49 || c === 50 || c === 51)) {
      const v = voices[c - 48 - 1 + 1] || null;
      if (v) {
        cur = v;
        hashFlag = false;
        continue;
      }
    }
    if (c === 13) {
      if (acc.n >= 3) process2();
      continue;
    }
    acc.push(c);
    if (c === chDot && at(textBytes, i + 2) === chDot) continue;
    if (setPunct[c]) {
      process2();
      continue;
    }
    if (i === n - 1) process2();
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
var Rozmovlyalka = class _Rozmovlyalka {
  constructor({ dicts, voices, dataStats }) {
    this.dicts = dicts;
    this.voices = voices;
    this.dataStats = dataStats || null;
    this.sampleRate = SAMPLE_RATE;
  }
  // Создание движка: грузит словари и все три голоса.
  static async create({ dataUrl, fetcher, onProgress } = {}) {
    const url = dataUrl != null ? dataUrl : defaultDataUrl;
    if (url == null && typeof document === "undefined") {
      throw new Error("rozmovlyalka-js: \u0443\u043A\u0430\u0436\u0438\u0442\u0435 dataUrl \u2014 \u0432 \u044D\u0442\u043E\u0439 \u0441\u0440\u0435\u0434\u0435 \u043F\u0443\u0442\u044C \u043A \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443 data/ \u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438");
    }
    const started = performance.now();
    const bundle = await loadDataBundle({
      dataUrl: url,
      fetch: fetcher,
      onProgress
    });
    return new _Rozmovlyalka({
      dicts: bundle.dicts,
      voices: bundle.voices,
      dataStats: { loadMs: Math.round(performance.now() - started) }
    });
  }
  // synthesize — текст (JS-строка) → 8-битный беззнаковый PCM, 11025 Гц, моно.
  synthesize(text, opts) {
    const { voice, rate } = validateOptions(opts);
    const target = this.voices[voice];
    if (!target) throw new Error(`rozmovlyalka-js: \u0433\u043E\u043B\u043E\u0441 "${voice}" \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D`);
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
};
var api_default = Rozmovlyalka;
function pipelineDebug(text, dicts) {
  let s = cat(toCP1251(text), new Uint8Array([13, 10]));
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

// src/index.js
var VERSION = "0.1.0";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Dictionaries,
  OPTIONS_DEFAULTS,
  Rozmovlyalka,
  SAMPLE_RATE,
  VERSION,
  Voice,
  bsnTableBytes,
  buildDictionaries,
  buildVoice,
  chunkSynth,
  decodeUnitV1,
  diphoneRows,
  diphoneTableSize,
  fromCP1251,
  gunzip,
  loadInt32s,
  pcmToMP3,
  pcmToMP3Lame,
  pcmToWAV,
  pipelineDebug,
  processChunk,
  splitBSNbn,
  splitEUDic,
  synthPCM,
  toCP1251,
  wavHeader
});
