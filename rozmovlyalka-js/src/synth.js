// synth — порт FUN_00466e7c: склейка дифонов в PCM по фонемной строке.
import { phBase, setV2NextFix, setV2Vowel } from './sets.js';
import { roundEven } from './util.js';

export const diphoneTableSize = 42; // DAT_0046e6e0
export const diphoneRows = diphoneTableSize * diphoneTableSize;
const scratchSize = 0x1b59; // DAT_004e9dc4
const synthBuffer = 500000; // DAT_0046fca4
const xfHalf = 8;
const xfWin = 2 * xfHalf + 1;

// voice — загруженный голос: три потока ip2f/lp2f/sd2f.
export class Voice {
  constructor(label, ip, lp, sd) {
    this.label = label; // '1' | '2' | '3'
    this.ip = ip; // Int32Array
    this.lp = ip && lp ? lp : null; // Int32Array
    this.sd = sd; // Uint8Array
  }
}

// synthPCM — FUN_00466e7c: phon → 8-битный беззнаковый PCM 11025 Гц моно.
export function synthPCM(ph, v, rate) {
  const out = new Uint8Array(synthBuffer).fill(0x80);
  const pre = []; // виртуальный «BSS-префикс» для отрицательных индексов
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

    // Поправка голоса 2: после гласной перед «ч/ц/чн»-группой — пауза.
    if (v.label === '2' && prev >= 0 && prev <= 39 && setV2Vowel[prev] &&
      next >= 0 && next <= 39 && setV2NextFix[next]) {
      next = 40;
    }

    // Фонемные байты вне D2..FA — пропускаем.
    if (prev < 0 || prev >= diphoneTableSize || next < 0 || next >= diphoneTableSize) {
      continue;
    }

    const k = next + prev * diphoneTableSize;
    const off = v.ip[k];
    let ulen = v.lp[k];

    if (ulen <= 0) continue;
    let unit;
    if (v.label !== '1') {
      scratch.set(v.sd.subarray(off, off + ulen));
      unit = scratch;
    } else if (rate === 5) {
      const hdr = v.sd[off]; // байт-заголовок юнита
      ulen -= hdr;
      if (ulen > 0) {
        scratch.set(v.sd.subarray(off + hdr, off + hdr + ulen));
      }
      unit = scratch;
    } else {
      unit = decodeUnitV1(v.sd, off, rate, prev, next);
      ulen = unit.length;
      // Кроссфейд читает unit[0..16] безусловно; у юнитов короче 17
      // сэмплов недописанный хвост — 0x80.
      if (ulen < xfWin) {
        const padded = new Uint8Array(xfWin).fill(0x80);
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
    // Кроссфейд 17 отсчётов, banker's rounding (как Delphi Round).
    for (let j = 0; j < xfWin; j++) {
      const w = j / (2 * xfHalf);
      const idx = total - 2 * xfHalf - 1 + j;
      const a = roundEven((1 - w) * (getPCM(idx) - 128) + 128);
      const bv = roundEven(w * (unit[j] - 128));
      putPCM(idx, (a + bv) & 0xff);
    }
    // Остаток дифона: unit[16..ulen-2] (последний байт отбрасывается).
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

// decodeUnitV1 — темповая декомпозиция юнита голоса 1 (0x46705f..0x4673be).
export function decodeUnitV1(sd, off, rate, prev, next) {
  let d = rate;
  if (rate >= 5) {
    d = next < 6 || prev < 6 ? 11 - rate : 12 - rate;
  }
  // Заметка: длина декодированного юнита может превышать scratchSize
  // (0x1B59) — в оригинале запись уходила за границу буфера BSS, поэтому
  // здесь обычный растущий массив без верхней границы.
  const dst = [];
  let dn = 0;
  const pushSlice = (from, to) => {
    for (let i = from; i < to; i++) dst[dn++] = sd[i];
  };
  const pushPause = (cnt) => {
    for (let i = 0; i < cnt; i++) dst[dn++] = 0x80;
  };
  const segCount = sd[off + 1];
  for (let segIdx = 1; segIdx <= segCount; segIdx++) {
    let srcPos = 0;
    const w = sd[off + 1 + segIdx];
    const tagType = sd[off + w];
    const size = sd[off + w + 1] | (sd[off + w + 2] << 8);
    const n2 = sd[off + w + 3] | (sd[off + w + 4] << 8);
    const tmpStart = off + size;
    // pushTmp копирует len байт с текущей позиции, НЕ продвигая srcPos:
    // в оригинале двойной append повторяет один и тот же кусок данных.
    const pushTmp = (len) => {
      for (let i = 0; i < len; i++) dst[dn++] = sd[tmpStart + srcPos + i];
    };
    const skipTmp = (len) => {
      srcPos += len;
    };
    if (tagType === 1) {
      // пауза: заполнение 0x80
      let cnt = n2 + Math.trunc(n2 / d);
      if (rate > 5) cnt = n2 - Math.trunc(n2 / d);
      pushPause(cnt);
    } else if (tagType === 2) {
      // периодический повтор куска period = 70 (35 после prev=0x20)
      const period = prev === 0x20 ? 35 : 70;
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
      // куски с явными длинами; первый сегмент начинается с 8 байт
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
    // Хвост: остаток куска, не покрытый декомпозицией.
    const rem = n2 - srcPos;
    if (rem > 0) {
      pushTmp(rem);
      srcPos += rem;
    }
  }
  return Uint8Array.from(dst.length === dn ? dst : dst.slice(0, dn));
}
