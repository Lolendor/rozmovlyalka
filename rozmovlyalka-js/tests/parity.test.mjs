// Паритет с Go-портом: стадии конвейера и sha256 PCM корпуса фраз
// (эталоны сгенерированы Go-библиотекой, fixtures/pipeline.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Rozmovlyalka, pipelineDebug } from '../src/index.js';
import { toHex } from '../src/util.js';

const dataUrl = new URL('../data/', import.meta.url).href;
const fixtures = JSON.parse(
  await readFile(new URL('./fixtures/pipeline.json', import.meta.url), 'utf8'),
);

const engine = await Rozmovlyalka.create({ dataUrl });

function shaHex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

test('словари: количество записей совпадает с оригиналом', () => {
  assert.equal(engine.dicts.skorN, fixtures.counts.skorN);
  assert.equal(engine.dicts.bsn.count, fixtures.counts.bsn);
  assert.equal(engine.dicts.eudic.count, fixtures.counts.eudic);
  assert.equal(toHex(engine.dicts.decode.subarray(0, 57)), fixtures.bsnTable);
});

test('паритет стадий конвейера и sha256 PCM для корпуса фраз', async (t) => {
  for (const entry of fixtures.entries) {
    await t.test(`"${entry.text.slice(0, 40)}"`, () => {
      const stages = pipelineDebug(entry.text, engine.dicts);
      for (const stage of ['in', 'abbrev', 'numbers', 'english', 'normalize', 'stress', 'g2p']) {
        assert.equal(toHex(stages[stage]), entry.stages[stage], `стадия ${stage}`);
      }
      const matrix = [
        ['1r1', { voice: '1', rate: 1 }],
        ['1r5', { voice: '1', rate: 5 }],
        ['1r10', { voice: '1', rate: 10 }],
        ['2r5', { voice: '2', rate: 5 }],
        ['3r5', { voice: '3', rate: 5 }],
      ];
      for (const [key, opts] of matrix) {
        const pcm = engine.synthesize(entry.text, opts);
        assert.equal(pcm.length, entry.synth[key].len, `${key} длина`);
        assert.equal(shaHex(pcm), entry.synth[key].sha, `${key} sha256`);
      }
      const wav = engine.synthesizeWAV(entry.text, { voice: '1', rate: 5 });
      assert.equal(wav.length, entry.synth['wav.v1r5'].len, 'wav длина');
      assert.equal(shaHex(wav), entry.synth['wav.v1r5'].sha, 'wav sha256');
    });
  }
});

test('золотой WAV голоса 1 (rate 5) из тестов Go', () => {
  const wav = engine.synthesizeWAV('Привіт, світ!', { voice: '1', rate: 5 });
  assert.equal(
    shaHex(wav),
    '5502187c7a643938c60bc526949eb3512938c4336f3a53811bc309c20554bfd0',
  );
});
