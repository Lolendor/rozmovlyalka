// rozmovlyalka-js — веб-порт украинского синтезатора «Розмовлялька» (2003).
export {
  Rozmovlyalka,
  SAMPLE_RATE,
  OPTIONS_DEFAULTS,
  processChunk,
  chunkSynth,
  pipelineDebug,
} from './api.js';
export { default } from './api.js';
export { toCP1251, fromCP1251 } from './cp1251.js';
export { pcmToWAV, wavHeader } from './wav.js';
export { pcmToMP3, pcmToMP3Lame } from './mp3.js';
export { gunzip, loadInt32s, buildDictionaries, buildVoice } from './data.js';
export {
  Dictionaries, splitBSNbn, splitEUDic, bsnTableBytes,
} from './dict.js';
export { Voice, synthPCM, decodeUnitV1, diphoneTableSize, diphoneRows } from './synth.js';

export const VERSION = '0.1.0';
