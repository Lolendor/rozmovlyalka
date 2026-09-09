// Общие низкоуровневые помощники порта. Все строки конвейера — байтовые
// (cp1251), как в оригинальной программе.

// at: 1-based доступ к байту строки; за пределами — 0 (в оригинале за
// AnsiString лежит нулевой терминатор).
export function at(u8, i) {
  return i >= 1 && i <= u8.length ? u8[i - 1] : 0;
}

// cat: конкатенация байтовых кусков.
export function cat(...parts) {
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

// cmpRange: лексикографическое сравнение поддиапазона [start, end) с word
// (побайтовое, как bytes.Compare в Go).
export function cmpRange(u8, start, end, word) {
  const alen = end - start;
  const n = Math.min(alen, word.length);
  for (let i = 0; i < n; i++) {
    const a = u8[start + i];
    const b = word[i];
    if (a !== b) return a < b ? -1 : 1;
  }
  return alen === word.length ? 0 : alen < word.length ? -1 : 1;
}

export function bytesEqual(a, b) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function bytesContains(hay, needle) {
  if (needle.length === 0) return true;
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

// delphiDiv2: знаковое деление на 2 как в Delphi (к нулю). Значения lo+hi в
// бинарных поисках всегда положительны, поэтому truncation достаточно.
export function delphiDiv2(x) {
  return Math.trunc(x / 2);
}

// roundEven: Delphi Round = банковское округление (половинка к чётному).
export function roundEven(x) {
  let r = Math.round(x);
  if (Math.abs(x - Math.trunc(x)) === 0.5) r = 2 * Math.round(x / 2);
  return r;
}

// Растущий байтовый буфер для конвейерных накоплений.
export class Bytes {
  constructor(capacity = 256) {
    this.b = new Uint8Array(capacity);
    this.n = 0;
  }

  push(...parts) {
    let need = 0;
    for (const p of parts) need += typeof p === 'number' ? 1 : p.length;
    if (this.n + need > this.b.length) {
      let cap = this.b.length * 2;
      while (cap < this.n + need) cap *= 2;
      const next = new Uint8Array(cap);
      next.set(this.b.subarray(0, this.n));
      this.b = next;
    }
    for (const p of parts) {
      if (typeof p === 'number') {
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
}

// HEX: удобно для отладки и тестов.
export function toHex(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += u8[i].toString(16).padStart(2, '0');
  return s;
}

export function fromHex(s) {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
  return out;
}
