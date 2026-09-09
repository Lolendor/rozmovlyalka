#!/usr/bin/env node
// CLI «roztts-js» — аналог Go-утилиты roztts:
//   roztts-js "Текст" -voice 3 -rate 5 -o out.wav
import { Rozmovlyalka, fromCP1251 } from '../src/index.js';
import { readFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const defaultDataUrl = new URL('../data/', import.meta.url).href;

const HELP = `roztts-js — синтез украинской речи (порт «Розмовляльки», 2003)

Использование:
  roztts-js [флаги] "текст"
  echo "текст" | roztts-js [флаги]
  roztts-js -f file.txt -o out.wav

Флаги:
  -voice, --voice 1|2|3        голос (по умолчанию 1)
  -rate,  --rate 1..10         темп (по умолчанию 5)
  -o,     --out ФАЙЛ            имя выходного файла (.wav или .mp3)
  -f,     --file ФАЙЛ           читать текст из файла (иначе аргумент/stdio)
  --stdout                     WAV в stdout
  --data-url URL|ПУТЬ          каталог с данными (по умолчанию data/ пакета)
  -h,     --help               справка
`;

function parseArgs(argv) {
  const opts = { voice: '1', rate: 5, out: null, file: null, stdout: false, dataUrl: defaultDataUrl };
  const texts = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { const v = argv[++i]; if (v === undefined) fail(`флаг ${a} требует значение`); return v; };
    switch (a) {
      case '-h': case '--help': console.log(HELP); process.exit(0); break;
      case '-voice': case '--voice': opts.voice = val(); break;
      case '-rate': case '--rate': opts.rate = parseInt(val(), 10); break;
      case '-o': case '--out': opts.out = val(); break;
      case '-f': case '--file': opts.file = val(); break;
      case '--stdout': opts.stdout = true; break;
      case '--data-url': opts.dataUrl = val(); break;
      default:
        if (a.startsWith('-')) fail(`неизвестный флаг ${a}`);
        texts.push(a);
    }
  }
  return { opts, texts };
}

function fail(msg) {
  console.error(`roztts-js: ${msg}`);
  console.error(HELP);
  process.exit(1);
}

const { opts, texts } = parseArgs(process.argv.slice(2));

let text;
if (opts.file) {
  text = await readFile(opts.file, 'utf8');
} else if (texts.length > 0) {
  text = texts.join(' ');
} else if (!process.stdin.isTTY) {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  text = Buffer.concat(chunks).toString('utf8');
} else {
  fail('нет входного текста: передайте аргумент, файл (-f) или stdin');
}

const engine = await Rozmovlyalka.create({
  dataUrl: opts.dataUrl,
  onProgress: () => {},
});

console.error(`Текст: ${text}`);
console.error(`Голос: ${opts.voice}, темп: ${opts.rate}`);

if (opts.stdout) {
  const wav = engine.synthesizeWAV(text, { voice: opts.voice, rate: opts.rate });
  process.stdout.write(Buffer.from(wav.buffer, wav.byteOffset, wav.byteLength));
} else if (opts.out) {
  const isMp3 = /\.mp3$/i.test(opts.out);
  const data = isMp3
    ? await engine.synthesizeMP3(text, { voice: opts.voice, rate: opts.rate })
    : engine.synthesizeWAV(text, { voice: opts.voice, rate: opts.rate });
  writeFileSync(opts.out, data);
  console.error(`Записано: ${opts.out} (${data.length} байт)`);
} else {
  fail('нужен вывод: -o файл.wav/.mp3 или --stdout');
}

void fromCP1251;
void fileURLToPath;
void dirname;
void join;
