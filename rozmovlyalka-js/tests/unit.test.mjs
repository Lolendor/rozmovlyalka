// Юнит-тесты, перенесённые из Go-порта (dict_test.go, api_test.go).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Rozmovlyalka } from '../src/index.js';
import { toCP1251, fromCP1251 } from '../src/cp1251.js';
import { g2p } from '../src/g2p.js';
import { __internals } from '../src/stress.js';
import { dictStress } from '../src/stress.js';

const dataUrl = new URL('../data/', import.meta.url).href;
const engine = await Rozmovlyalka.create({ dataUrl });
const d = engine.dicts;

test('cp1251 round-trip', () => {
  const s = 'Привіт, світ! Ґанок їжачок 100% €';
  assert.equal(fromCP1251(toCP1251(s)), s);
});

test('dictStress: известные слова', () => {
  const cases = [
    ['молоко', 'ьь', 'молокО'],
    ['весна', 'ьь', 'веснА'],
    ['привіт', 'ьь', 'привІт'],
    ['хліб', 'ьь', 'хлІб'],
    ['людина', 'ьь', 'людИна'],
    ['читати', 'ьь', 'читАти'],
    ['мама', 'ьь', 'мАма'],
    ['говорила', 'ьь', 'говорИла'],
    ['води', 'ьь', 'вОди'],
    ['мене', 'до', 'мЕне'],
    ['тебе', 'біля', 'тЕбе'],
    ['себе', 'у', 'сЕбе'],
    ['мене', 'звичайно', 'менЕ'],
    ['верби', 'у', 'вЕрби'],
    ['верби', 'коло', 'вербИ'],
    ['верби', 'якого', 'вербИ'],
    ['вікна', 'до', 'вікнА'],
    ['українська', 'ьь', 'украЇнська'],
    ['пфафрум', 'ьь', 'пфАфрУм'],
  ];
  for (const [word, prev, want] of cases) {
    const got = dictStress(d, toCP1251(word), toCP1251(prev));
    assert.equal(fromCP1251(got), want, `${word} (prev=${prev})`);
  }
});

test('явный маркер ударения', () => {
  assert.equal(fromCP1251(__internals.applyExplicitMarker(toCP1251('до\\брого'))), 'дОброго');
  assert.equal(fromCP1251(__internals.applyExplicitMarker(toCP1251("слово'чек"))), 'словОчек');
  assert.equal(__internals.markerPos(toCP1251('додому')), 0);
  assert.equal(__internals.markerPos(toCP1251('до\\брого')), 2);
  assert.equal(__internals.markerPos(toCP1251("до'брого")), 2);
});

test('g2p: известные цепочки фонем', () => {
  const traces = [
    ['дядько', [0xfa, 0xd8, 0xe0, 0xd8, 0xfa, 0xea, 0xee, 0xfa]],
    ['щастя', [0xfa, 0xf6, 0xfa, 0xf7, 0xe0, 0xf1, 0xfa, 0xde, 0xe0, 0xfa]],
    ['молокО', [0xfa, 0xec, 0xee, 0xeb, 0xee, 0xea, 0xd6, 0xfa]],
    ['яблуко', [0xfa, 0xe9, 0xe0, 0xe1, 0xfa, 0xeb, 0xf3, 0xea, 0xee, 0xfa]],
    [',', [0xfa, 0xfa]],
  ];
  for (const [input, want] of traces) {
    assert.deepEqual(Array.from(g2p(toCP1251(input))), want, input);
  }
});

test('lookup: СловКор и BSNbn', () => {
  assert.equal(d.skorLookup(toCP1251('ієрусалиме')), 0x35);
  assert.equal(d.skorLookup(toCP1251('ієсейську')), 0x33);
  assert.equal(d.skorLookup(toCP1251('іаков')), 0x32);
  assert.equal(d.skorLookup(toCP1251('ієремія')), 0x34);
  assert.equal(d.skorLookup(toCP1251('людина')), 0x38);
  assert.equal(d.skorLookup(toCP1251('')), 0x38);
  assert.equal(d.bsnLookup(toCP1251('ієрарх')), 0x33);
});

test('сквозной синтез воспроизводим и не падает', () => {
  const texts = [
    'Він має 1234 гривні та 5 відсотків.',
    'I love Kyiv, it is my city!',
    'Т. Г. Шевченко і 9 березня 1814 року.',
    'шість, сім, вісімсот дев\'яносто дев\'ять',
  ];
  for (const text of texts) {
    const a = engine.synthesize(text, { voice: '1', rate: 5 });
    const b = engine.synthesize(text, { voice: '1', rate: 5 });
    assert.deepEqual(a, b, text);
    assert.ok(a.length > 100, `${text} → ${a.length}`);
  }
});

test('переключение голоса командой «#» внутри текста', () => {
  // Причуда оригинала: «#2 » снимается до пробела, поэтому чанк начинается
  // с пробела и нормализатор добавляет паузу. Эталон снят с Go-порта.
  const pcm = engine.synthesize('#2 Привіт, світ!', { voice: '1', rate: 5 });
  assert.equal(pcm.length, 23514);
  assert.equal(
    createHash('sha256').update(pcm).digest('hex'),
    'b976c4c308d03e4f8335be6a23bfc60ccdff5503be5e0393f84c935c7326ca37',
  );
});

test('валидация параметров', () => {
  assert.throws(() => engine.synthesize('тест', { voice: '9' }), /неизвестный голос/);
  assert.throws(() => engine.synthesize('тест', { rate: 42 }), /скорость/);
});
