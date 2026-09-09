// Оракул темповой декомпозиции голоса 1: для каждого дифона × всех rate != 5
// длина + FNV-1a 64 сверяются с эталоном, снятым с ассемблера Rozm.exe
// (fixtures/v1_tempo_hash.bin, тот же файл, что в Go-порте).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Rozmovlyalka, decodeUnitV1, diphoneRows, diphoneTableSize } from '../src/index.js';

const dataUrl = new URL('../data/', import.meta.url).href;
const engine = await Rozmovlyalka.create({ dataUrl });
const v = engine.voices['1'];
const oracle = new Uint8Array(
  await readFile(new URL('./fixtures/v1_tempo_hash.bin', import.meta.url)),
);

function fnv1a64(bytes) {
  const M = (1n << 64n) - 1n;
  const P = 1099511628211n;
  let h = 14695981039346656037n;
  for (let i = 0; i < bytes.length; i++) {
    h ^= BigInt(bytes[i]);
    h = (h * P) & M;
  }
  return h;
}

test('decodeUnitV1: полный оракул 1764×9', () => {
  const view = new DataView(oracle.buffer);
  const rates = [1, 2, 3, 4, 6, 7, 8, 9, 10];
  let pos = 0;
  for (let k = 0; k < diphoneRows; k++) {
    for (const rate of rates) {
      assert.ok(pos + 12 <= oracle.length, 'оракул короче ожидаемого');
      const wantLen = view.getUint32(pos, true);
      const wantHash = view.getBigUint64(pos + 4, true);
      pos += 12;
      if (v.lp[k] <= 0) continue;
      const prev = Math.floor(k / diphoneTableSize);
      const next = k % diphoneTableSize;
      const got = decodeUnitV1(v.sd, v.ip[k], rate, prev, next);
      assert.equal(got.length, wantLen, `k=${k} rate=${rate}`);
      assert.equal(fnv1a64(got), wantHash, `k=${k} rate=${rate}`);
    }
  }
});
