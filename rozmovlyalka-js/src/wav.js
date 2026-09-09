// WAV — упаковка PCM в WAV (11025 Гц, моно, 8 бит без знака) с оригинальным
// 44-байтным заголовком программы (wavhead.bin): поля размеров патчатся под
// длину данных.
import { fromHex } from './util.js';

// Точные байты data/wavhead.bin (шаблон DAT_02365704).
const WAV_TEMPLATE = fromHex(
  '524946462400000057415645666d74201000000001000100112b0000112b0000010008006461746100000000',
);

export function wavHeader(dataLen) {
  const h = WAV_TEMPLATE.slice();
  const dv = new DataView(h.buffer);
  dv.setUint32(4, 44 - 8 + dataLen, true); // filesize-8
  dv.setUint32(0x28, dataLen, true); // filesize-44
  return h;
}

// pcmToWAV — PCM → готовый WAV-файл (Uint8Array).
export function pcmToWAV(pcm) {
  const h = wavHeader(pcm.length);
  const out = new Uint8Array(44 + pcm.length);
  out.set(h, 0);
  out.set(pcm, 44);
  return out;
}
