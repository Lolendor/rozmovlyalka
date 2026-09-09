// MP3: в Node — внешний ffmpeg (как в Go), в браузере — lamejs. lamejs не
// бандлится (его UMD ломается под сборщиками), а подключается как обычный
// script: <script src="lame.min.js"></script> — либо передаётся классом
// энкодера в опциях.
import { ffmpegAvailable, encodeMP3WithFFmpeg } from './ffmpeg.js';

// pcmToMP3 — 8-битный беззнаковый PCM 11025 Гц → MP3 (32 kbps).
export async function pcmToMP3(pcm, { kbps = 32, encoder } = {}) {
  if (ffmpegAvailable()) {
    return encodeMP3WithFFmpeg(pcm);
  }
  return pcmToMP3Lame(pcm, kbps, encoder);
}

function resolveLameEncoder(encoder) {
  if (encoder) return encoder;
  const g = globalThis;
  if (g && g.lamejs && g.lamejs.Mp3Encoder) return g.lamejs.Mp3Encoder;
  throw new Error(
    'rozmovlyalka-js: энкодер lamejs не найден. Подключите lame.min.js как ' +
    '<script src="lame.min.js"> или передайте класс Mp3Encoder в опциях ' +
    '(в Node используется ffmpeg и lamejs не нужен)',
  );
}

export function pcmToMP3Lame(pcm, kbps = 32, encoder) {
  const pcm16 = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    pcm16[i] = ((pcm[i] & 0xff) - 128) << 8;
  }
  const Mp3Encoder = resolveLameEncoder(encoder);
  const enc = new Mp3Encoder(1, 11025, kbps);
  const parts = [];
  const blockSize = 1152;
  for (let i = 0; i < pcm16.length; i += blockSize) {
    const chunk = pcm16.subarray(i, i + blockSize);
    if (chunk.length === 0) break;
    const mp3buf = enc.encodeBuffer(chunk);
    if (mp3buf.length > 0) parts.push(mp3buf);
  }
  const end = enc.flush();
  if (end.length > 0) parts.push(end);
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
