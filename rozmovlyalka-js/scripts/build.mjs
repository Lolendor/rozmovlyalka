// Сборка дистрибутивов: UMD (script-тег / глобал Rozmovlyalka), minified UMD,
// ESM и CJS-обёртки. Данные НЕ вшиваются: каталог data/ подключается отдельно.
import { build } from 'esbuild';

const common = {
  entryPoints: ['src/index.js'],
  bundle: true,
  sourcemap: false,
  target: ['es2020'],
  legalComments: 'inline',
};

await build({
  ...common,
  format: 'iife',
  globalName: 'Rozmovlyalka',
  platform: 'browser',
  outfile: 'dist/rozmovlyalka.umd.js',
});

await build({
  ...common,
  format: 'iife',
  globalName: 'Rozmovlyalka',
  platform: 'browser',
  minify: true,
  legalComments: 'none',
  outfile: 'dist/rozmovlyalka.umd.min.js',
});

await build({
  ...common,
  format: 'esm',
  platform: 'node',
  outfile: 'dist/rozmovlyalka.esm.js',
});

await build({
  ...common,
  format: 'cjs',
  platform: 'node',
  outfile: 'dist/rozmovlyalka.cjs.js',
});

console.log('build ok');
