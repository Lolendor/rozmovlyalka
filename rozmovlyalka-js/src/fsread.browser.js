// В браузере локальное чтение файлов недоступно — только fetch.
export async function readFileBytes() {
  throw new Error('rozmovlyalka-js: локальное чтение файлов недоступно в браузере');
}
