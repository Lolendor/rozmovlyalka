/* Розмовлялька web — логика демо-плеера: мультиголосовой диалог, синтез,
   Web Audio воспроизведение, волновая форма, экспорт WAV/MP3. */
(() => {
  'use strict';

  const api = window.Rozmovlyalka;
  const SAMPLE_RATE = 11025;
  const GAP_SAMPLES = Math.round(0.18 * SAMPLE_RATE);
  const TAIL_SAMPLES = Math.round(0.28 * SAMPLE_RATE);
  const LS_KEY = 'rozmovlyalka-demo-v4';
  // Каталог, из которого загружен сам app.js: на Pages демо живёт и в корне
  // сайта, и в /demo/, поэтому данные ищем относительно скрипта и страницы.
  const SCRIPT_DIR = (() => {
    try {
      const src = document.currentScript && document.currentScript.src;
      if (src) return new URL('.', new URL(src, document.baseURI)).href;
    } catch { /* переходим ниже */ }
    return new URL('.', document.baseURI).href;
  })();

  function dataUrlCandidates() {
    const pageDir = new URL('.', document.baseURI).href;
    const urls = [
      new URL('../data/', SCRIPT_DIR).href,
      new URL('data/', pageDir).href,
    ];
    return Array.from(new Set(urls));
  }

  async function resolveDataUrl() {
    for (const base of dataUrlCandidates()) {
      try {
        const res = await fetch(new URL('bsnbn.bin.gz', base).href, {
          method: 'GET', cache: 'no-store',
        });
        const ok = res.ok;
        try { if (res.body) await res.body.cancel(); } catch { /* noop */ }
        if (ok) return base;
      } catch { /* перебираем дальше */ }
    }
    return dataUrlCandidates()[0];
  }

  const $ = (id) => document.getElementById(id);
  const els = {
    status: $('status'),
    segments: $('segments'),
    add: $('add-segment'),
    rate: $('rate'),
    rateValue: $('rate-value'),
    volume: $('volume'),
    volumeValue: $('volume-value'),
    wave: $('wave'),
    play: $('play'),
    playIcon: $('play-icon'),
    playLabel: $('play-label'),
    stop: $('stop'),
    timeCurrent: $('time-current'),
    timeTotal: $('time-total'),
    downloadWav: $('download-wav'),
    downloadMp3: $('download-mp3'),
    overlay: $('overlay'),
    overlayTitle: $('overlay-title'),
    overlaySub: $('overlay-sub'),
    overlayBar: $('overlay-bar'),
    overlayPct: $('overlay-pct'),
    toast: $('toast'),
    loadStats: $('load-stats'),
  };

  const DEFAULT_SEGMENTS = [
    { id: 1, text: 'Привіт! Я — перший голос Розмовляльки.', voice: '1' },
    { id: 2, text: 'А я — другий. Доброго вечора, Україно!', voice: '2' },
    { id: 3, text: "Третій на зв'язку. Як тобі наш новий інтерфейс?", voice: '3' },
    { id: 4, text: 'Звучить краще, ніж у 2001 році!', voice: '1' },
  ];

  let engine = null;
  let segments = loadState().segments;
  let rate = loadState().rate;
  let volume = loadState().volume;
  let nextId = Math.max(0, ...segments.map((s) => s.id)) + 1;

  let audioCtx = null;
  let gainNode = null;
  let dialogue = null; // { key, pcm, wavePcm, times, buffer, }
  let playing = false;
  let startedAt = 0;
  let offset = 0;
  let rafId = 0;
  let buildToken = 0;
  let toastTimer = 0;

  function loadState() {
    // Гучність усередині завжди 0..1; старые состояния хранили проценты 0..100.
    const fallback = { segments: DEFAULT_SEGMENTS.map((s) => ({ ...s })), rate: 5, volume: 1.0 };
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (!raw || !Array.isArray(raw.segments) || raw.segments.length === 0) return fallback;
      if (typeof raw.rate !== 'number' || typeof raw.volume !== 'number') return fallback;
      if (raw.rate < 1 || raw.rate > 10 || raw.volume < 0 || raw.volume > 100) return fallback;
      return {
        segments: raw.segments
          .filter((s) => s && typeof s.text === 'string' && ['1', '2', '3'].includes(s.voice))
          .map((s) => ({ id: s.id || 0, text: s.text, voice: s.voice })),
        rate: raw.rate,
        volume: raw.volume > 1 ? raw.volume / 100 : raw.volume,
      };
    } catch {
      return fallback;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ segments, rate, volume }));
    } catch { /* приватный режим — игнорируем */ }
  }

  function toast(message, isError) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.toggle('is-error', !!isError);
    els.toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => els.toast.classList.remove('is-visible'), 3200);
  }

  /* ---------- Отрисовка реплик ---------- */

  function segmentCard(seg) {
    const row = document.createElement('div');
    row.className = 'segment';
    row.dataset.id = String(seg.id);

    const index = document.createElement('span');
    index.className = 'segment-index mono';
    row.appendChild(index);

    const area = document.createElement('textarea');
    area.rows = 1;
    area.placeholder = 'Текст репліки…';
    area.setAttribute('aria-label', 'Текст репліки');
    area.value = seg.text;
    row.appendChild(area);

    const voice = document.createElement('div');
    voice.className = 'voice-switch';
    voice.setAttribute('role', 'group');
    voice.setAttribute('aria-label', 'Голос');
    for (const v of ['1', '2', '3']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = v;
      b.dataset.voice = v;
      b.title = `Голос ${v}`;
      b.setAttribute('aria-pressed', String(seg.voice === v));
      b.addEventListener('click', () => {
        seg.voice = v;
        voice.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        invalidate();
      });
      voice.appendChild(b);
    }
    row.appendChild(voice);

    const actions = document.createElement('div');
    actions.className = 'segment-actions';

    const aud = document.createElement('button');
    aud.className = 'icon-btn';
    aud.type = 'button';
    aud.title = 'Прослухати репліку';
    aud.setAttribute('aria-label', 'Прослухати репліку');
    aud.innerHTML = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3.4 1.9v8.2c0 .4.4.6.7.4l6.4-4.1a.48.48 0 0 0 0-.8L4.1 1.5c-.3-.2-.7 0-.7.4z" fill="currentColor"/></svg>';
    aud.addEventListener('click', () => audition(seg, aud));
    actions.appendChild(aud);

    const del = document.createElement('button');
    del.className = 'icon-btn';
    del.type = 'button';
    del.title = 'Видалити репліку';
    del.setAttribute('aria-label', 'Видалити репліку');
    del.innerHTML = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 2.5l7 7m0-7l-7 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    del.addEventListener('click', () => {
      if (segments.length === 1) {
        seg.text = '';
        area.value = '';
        area.dispatchEvent(new Event('input'));
      } else {
        segments = segments.filter((x) => x.id !== seg.id);
        render();
        invalidate();
      }
    });
    actions.appendChild(del);

    row.appendChild(actions);
    return { row, index, area };
  }

  function render() {
    els.segments.textContent = '';
    segments.forEach((seg, i) => {
      const { row, index, area } = segmentCard(seg);
      index.textContent = String(i + 1).padStart(2, '0');
      autosize(area);
      area.addEventListener('input', () => {
        seg.text = area.value;
        autosize(area);
        invalidate();
      });
      els.segments.appendChild(row);
    });
    updateTransports();
  }

  function autosize(area) {
    area.style.height = 'auto';
    area.style.height = `${Math.min(area.scrollHeight, 220)}px`;
  }

  function setActiveSegment(id) {
    els.segments.querySelectorAll('.segment').forEach((row) => {
      row.classList.toggle('is-active', row.dataset.id === String(id));
    });
  }

  /* ---------- Слайдеры ---------- */

  els.rate.addEventListener('input', () => {
    rate = Number(els.rate.value);
    els.rateValue.textContent = `×${rate}`;
    invalidate();
  });

  els.volume.addEventListener('input', () => {
    volume = Number(els.volume.value) / 100;
    els.volumeValue.textContent = `${els.volume.value}%`;
    if (gainNode) gainNode.gain.value = volume;
  });

  els.add.addEventListener('click', () => {
    segments.push({ id: nextId++, text: '', voice: '1' });
    render();
    invalidate();
    const last = els.segments.querySelector('.segment:last-of-type textarea');
    if (last) last.focus();
  });

  /* ---------- Синтез диалога ---------- */

  function dialogueKey() {
    const nonEmpty = segments.filter((s) => s.text.trim() !== '');
    return JSON.stringify([nonEmpty.map((s) => [s.text, s.voice]), rate]);
  }

  function buildDialogue() {
    const token = ++buildToken;
    const nonEmpty = segments.filter((s) => s.text.trim() !== '');
    const chunks = [];
    const times = [];
    let acc = 0;
    nonEmpty.forEach((seg, i) => {
      const pcm = engine.synthesize(seg.text, { voice: seg.voice, rate });
      if (i > 0) {
        chunks.push(new Uint8Array(GAP_SAMPLES).fill(0x80));
        acc += GAP_SAMPLES;
      }
      times.push({ id: seg.id, start: acc / SAMPLE_RATE, dur: pcm.length / SAMPLE_RATE });
      if (pcm.length > 0) chunks.push(pcm);
      acc += pcm.length;
    });
    chunks.push(new Uint8Array(TAIL_SAMPLES).fill(0x80));
    acc += TAIL_SAMPLES;
    let total = 0;
    for (const c of chunks) total += c.length;
    const pcm = new Uint8Array(total);
    let pos = 0;
    for (const c of chunks) {
      pcm.set(c, pos);
      pos += c.length;
    }
    if (token !== buildToken) return null;
    dialogue = { key: dialogueKey(), pcm, times, buffer: null };
    drawWaveform(pcm, 0);
    updateTotals();
    return dialogue;
  }

  function ensureDialogue() {
    if (!dialogue || dialogue.key !== dialogueKey()) return buildDialogue();
    return dialogue;
  }

  function invalidate() {
    saveState();
    updateTransports();
  }

  /* ---------- Аудио ---------- */

  function ensureAudio() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(audioCtx.destination);
  }

  async function decodeDialogue() {
    ensureAudio();
    if (!dialogue.buffer) {
      const wav = engine.pcmToWAV(dialogue.pcm);
      const ab = await audioCtx.decodeAudioData(wav.buffer.slice(0));
      dialogue.buffer = ab;
    }
    return dialogue.buffer;
  }

  async function play() {
    if (playing) return pause();
    ensureAudio();
    els.play.disabled = true;
    try {
      const d = ensureDialogue();
      if (!d.times.length) {
        toast('Додайте хоча б одну репліку з текстом');
        return;
      }
      const buffer = await decodeDialogue();
      setPlayingState(true);
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(gainNode);
      src.onended = () => {
        if (playing && src === dialogue.source) {
          playing = false;
          offset = 0;
          setPlayingState(false);
          updateProgress();
        }
      };
      dialogue.source = src;
      startedAt = audioCtx.currentTime;
      src.start(0, Math.min(offset, Math.max(0, buffer.duration - 0.02)));
      loop();
    } catch (err) {
      toast(err.message || String(err), true);
      setPlayingState(false);
    } finally {
      els.play.disabled = false;
    }
  }

  function pause() {
    if (!playing) return;
    const elapsed = audioCtx.currentTime - startedAt;
    offset = Math.min(offset + elapsed, dialogue.buffer.duration);
    try { dialogue.source.stop(); } catch { /* уже остановлен */ }
    playing = false;
    setPlayingState(false);
    updateProgress();
  }

  function stop() {
    if (playing) {
      try { dialogue.source.stop(); } catch { /* нет */ }
      playing = false;
    } else {
      offset = 0;
    }
    if (dialogue && dialogue.buffer) offset = 0;
    setPlayingState(false);
    updateProgress();
  }

  function setPlayingState(v) {
    playing = v;
    els.playIcon.innerHTML = v
      ? '<path d="M4 3.4v9.2c0 .5.5.9.9.5l7-4.6a.6.6 0 0 0 0-1L4.9 2.9c-.4-.4-.9 0-.9.5z" fill="currentColor"/>'
      : '<path d="M4.5 2.7v10.6c0 .5.5.8.9.5l8.3-5.3c.4-.2.4-.7 0-1L5.4 2.2c-.4-.3-.9 0-.9.5z" fill="currentColor"/>';
    els.playLabel.textContent = v ? 'Пауза' : 'Слухати';
    els.play.setAttribute('aria-label', v ? 'Пауза' : 'Відтворити');
    showStop(v || (dialogue && offset > 0));
  }

  function showStop(v) {
    els.stop.disabled = !v;
  }

  function loop() {
    rafId = requestAnimationFrame(() => {
      updateProgress();
      if (playing) loop();
    });
  }

  function updateProgress() {
    if (!dialogue || !dialogue.pcm.length) {
      els.timeCurrent.textContent = '0:00';
      return;
    }
    const dur = dialogue.pcm.length / SAMPLE_RATE;
    let t = playing ? Math.min(offset + (audioCtx.currentTime - startedAt), dur) : offset;
    if (!playing && offset >= dur - 0.01) t = 0;
    els.timeCurrent.textContent = formatTime(t);
    drawWaveform(dialogue.pcm, t / dur);
    const active = dialogue.times.find((seg) => t >= seg.start && t < seg.start + seg.dur);
    setActiveSegment(active ? active.id : null);
    if (playing && t >= dur) {
      playing = false;
      offset = 0;
      setPlayingState(false);
    }
  }

  function updateTotals() {
    if (!dialogue) {
      els.timeTotal.textContent = '0:00';
      els.timeCurrent.textContent = '0:00';
      return;
    }
    els.timeTotal.textContent = formatTime(dialogue.pcm.length / SAMPLE_RATE);
    els.timeCurrent.textContent = formatTime(offset);
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.max(0, Math.floor(sec % 60));
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  /* ---------- Прослушивание одной реплики ---------- */

  let auditionSrc = null;

  async function audition(seg, btn) {
    stop();
    ensureAudio();
    if (auditionSrc) {
      try { auditionSrc.stop(); } catch { /* нет */ }
    }
    btn.classList.add('is-muted');
    btn.disabled = true;
    try {
      const pcm = engine.synthesize(seg.text, { voice: seg.voice, rate });
      if (!pcm.length) {
        toast('Репліка порожня');
        return;
      }
      const ab = await audioCtx.decodeAudioData(engine.pcmToWAV(pcm).buffer.slice(0));
      const src = audioCtx.createBufferSource();
      src.buffer = ab;
      src.connect(gainNode);
      auditionSrc = src;
      src.onended = () => {
        if (auditionSrc === src) auditionSrc = null;
        btn.classList.remove('is-muted');
        btn.disabled = false;
      };
      src.start();
    } catch (err) {
      toast(err.message || String(err), true);
      btn.classList.remove('is-muted');
      btn.disabled = false;
    }
  }

  /* ---------- Волновая форма ---------- */

  function drawWaveform(pcm, progress) {
    const canvas = els.wave;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr;
    const h = 48 * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    if (!pcm || pcm.length === 0) return;
    const step = Math.max(1, Math.floor(pcm.length / (canvas.clientWidth * 0.6)));
    const mid = h / 2;
    const barW = Math.max(1, dpr * 1);
    const gap = dpr * 1;
    const cols = Math.floor(w / (barW + gap));
    const playedCols = Math.floor(progress * cols);
    for (let c = 0; c < cols; c++) {
      const from = Math.min(c * step, pcm.length - 1);
      const to = Math.min((c + 1) * step, pcm.length);
      let peak = 0;
      for (let i = from; i < to; i += 1) {
        const v = Math.abs(pcm[i] - 0x80);
        if (v > peak) peak = v;
      }
      const bh = Math.max(1, Math.min(((peak / 127) * (h - 8 * dpr)) | 0, h - 8 * dpr));
      ctx.fillStyle = c < playedCols ? '#171717' : '#d9d9d9';
      const x = Math.round(c * (barW + gap));
      ctx.fillRect(x, Math.round((mid - bh / 2)), barW, Math.max(1, Math.round(bh)));
    }
  }

  /* ---------- Экспорт ---------- */

  function download(bytes, filename, mime) {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  els.downloadWav.addEventListener('click', () => {
    try {
      const d = ensureDialogue();
      if (!d.times.length) {
        toast('Нема що експортувати: додайте текст репліки');
        return;
      }
      download(engine.pcmToWAV(d.pcm), 'rozmovlyalka.wav', 'audio/wav');
      toast('WAV збережено');
    } catch (err) {
      toast(err.message || String(err), true);
    }
  });

  els.downloadMp3.addEventListener('click', async () => {
    try {
      const d = ensureDialogue();
      if (!d.times.length) {
        toast('Нема що експортувати: додайте текст репліки');
        return;
      }
      els.downloadMp3.disabled = true;
      const mp3 = await engine.pcmToMP3(d.pcm, { kbps: 32 });
      download(mp3, 'rozmovlyalka.mp3', 'audio/mpeg');
      toast('MP3 збережено');
    } catch (err) {
      toast(err.message || String(err), true);
    } finally {
      els.downloadMp3.disabled = false;
    }
  });

  /* ---------- Клавиатура ---------- */

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isTyping(e.target)) {
      e.preventDefault();
      els.play.click();
    } else if (e.code === 'Escape' && !isTyping(e.target)) {
      stop();
    }
  });

  function isTyping(target) {
    return target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT');
  }

  /* ---------- Транспорт ---------- */

  function updateTransports() {
    const hasText = segments.some((s) => s.text.trim() !== '');
    els.downloadWav.disabled = !engine || !hasText;
    els.downloadMp3.disabled = !engine || !hasText;
    els.play.disabled = !engine || !hasText;
    showStop(playing || (dialogue && offset > 0));
  }

  els.play.addEventListener('click', play);
  els.stop.addEventListener('click', stop);

  window.addEventListener('resize', () => {
    if (dialogue) drawWaveform(dialogue.pcm, offset / Math.max(1, dialogue.pcm.length / SAMPLE_RATE));
  });

  /* ---------- Загрузка движка ---------- */

  async function boot() {
    render();
    els.rate.value = String(rate);
    els.rateValue.textContent = `×${rate}`;
    els.volume.value = String(Math.round(volume * 100));
    els.volumeValue.textContent = `${els.volume.value}%`;
    updateTransports();
    try {
      const started = performance.now();
      engine = await api.default.create({
        dataUrl: await resolveDataUrl(),
        onProgress: ({ loaded, total }) => {
          const pct = Math.round((loaded / total) * 100);
          els.overlayPct.textContent = `${pct}% · ${(loaded / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} МБ`;
          els.overlayBar.style.width = `${pct}%`;
        },
      });
      const sec = ((performance.now() - started) / 1000).toFixed(1);
      els.loadStats.textContent = `дані ~6.5 МБ · ${sec}с`;
      els.status.textContent = 'готово';
      els.status.classList.remove('status--loading');
      els.status.classList.add('status--ready');
      els.overlay.classList.add('is-hidden');
      updateTransports();
    } catch (err) {
      els.status.textContent = 'помилка завантаження даних';
      els.status.classList.remove('status--loading');
      els.status.classList.add('status--error');
      els.overlayTitle.textContent = 'Не вдалося завантажити дані';
      els.overlaySub.textContent = err.message ? err.message.split('\n')[0] : String(err);
      els.overlayBar.style.width = '0%';
      els.overlayPct.textContent = 'запустіть через локальний сервер: npx serve rozmovlyalka-js або npm run demo';
    }
  }

  boot();
})();
