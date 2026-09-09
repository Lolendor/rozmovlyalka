// В браузере ffmpeg недоступен; MP3 кодирует встроенный lamejs.
export function ffmpegAvailable() {
  return false;
}

export function encodeMP3WithFFmpeg() {
  throw new Error('rozmovlyalka-js: ffmpeg недоступен в браузере');
}
