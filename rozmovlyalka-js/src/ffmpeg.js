// Кодирование MP3 через внешний ffmpeg (как в Go-порте): s16le 11025 Гц моно.
import { spawnSync } from 'node:child_process';

export function ffmpegAvailable() {
  try {
    const r = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return r.error === undefined && r.status === 0;
  } catch {
    return false;
  }
}

export function encodeMP3WithFFmpeg(pcm) {
  const raw = Buffer.alloc(2 * pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    raw.writeInt16LE((pcm[i] & 0xff) - 128, 2 * i);
  }
  const r = spawnSync(
    'ffmpeg',
    [
      '-hide_banner', '-loglevel', 'error',
      '-f', 's16le', '-ar', '11025', '-ac', '1',
      '-i', 'pipe:0',
      '-codec:a', 'libmp3lame', '-b:a', '32k',
      '-f', 'mp3', 'pipe:1',
    ],
    { input: raw, maxBuffer: 64 * 1024 * 1024 },
  );
  if (r.error) throw new Error(`rozmovlyalka-js: ffmpeg: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`rozmovlyalka-js: ffmpeg: ${r.stderr.toString()}`);
  return new Uint8Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength);
}
