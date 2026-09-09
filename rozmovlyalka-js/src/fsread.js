import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// readFileBytes — чтение локального файла (путь или file:-URL) в Uint8Array.
export async function readFileBytes(url) {
  const target = url.startsWith('file:') ? fileURLToPath(url) : url;
  const buf = await readFile(target);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}
