package rozmovlyalka

import (
	"bytes"
	"fmt"
)

// Options — параметры синтеза.
type Options struct {
	Voice byte // '1', '2', '3'
	Rate  int  // 1..10; для голоса 1 поддерживается только 5 (эталон)
}

// DefaultOptions — голос «1», стандартный темп (как в оригинале по умолчанию).
func DefaultOptions() Options { return Options{Voice: '1', Rate: 5} }

func (o *Options) validate() error {
	if o.Voice == 0 {
		o.Voice = '1'
	}
	switch o.Voice {
	case '1', '2', '3':
	default:
		return fmt.Errorf("rozmovlyalka: неизвестный голос %q (ожидается '1', '2' или '3')", o.Voice)
	}
	if o.Rate == 0 {
		o.Rate = 5
	}
	if o.Rate < 1 || o.Rate > 10 {
		return fmt.Errorf("rozmovlyalka: скорость %d вне диапазона 1..10", o.Rate)
	}
	return nil
}

// synthesizeRaw — главный цикл FUN_004678b4/FUN_00468670: текст режется на
// фрагменты (по «\r», пунктуации и концу буфера), каждый фрагмент проходит
// конвейер аббревиатуры → числа → английский → нормализация → ударения →
// G2P → синтез. Вход и выход — байты cp1251/PCM.
func synthesizeRaw(text []byte, opts Options) ([]byte, error) {
	if err := opts.validate(); err != nil {
		return nil, err
	}
	d, err := loadDictionaries()
	if err != nil {
		return nil, err
	}
	cur, err := loadVoice(byte(opts.Voice))
	if err != nil {
		return nil, err
	}
	return chunkSynth(text, d, cur, opts)
}

// chunkSynth — цикл по символам главной процедуры. Поддержана и команда «#»
// переключения голоса (как в оригинале, включая её причуды).
func chunkSynth(text []byte, d *dictionaries, cur *voice, opts Options) ([]byte, error) {
	n := len(text)
	out := make([]byte, 0, n*44)
	acc := make([]byte, 0, 200)
	hashFlag := false

	process := func() error {
		pcm, err := processChunk(acc, d, cur, opts.Rate)
		if err != nil {
			return err
		}
		out = append(out, pcm...)
		acc = acc[:0]
		return nil
	}

	for i := 0; i < n; i++ {
		c := text[i]
		if c == 0x0A { // "\n" отбрасывается без следа
			continue
		}
		if c == '#' { // префикс команды смены голоса
			hashFlag = true
			continue
		}
		if hashFlag {
			// Только «1»/«2»/«3»; иначе флаг остаётся взведённым
			// (поведение оригинала), а символ обрабатывается как текст.
			if c == '1' || c == '2' || c == '3' {
				v, err := loadVoice(c)
				if err != nil {
					return nil, err
				}
				cur = v
				hashFlag = false
				continue
			}
		}
		if c == 0x0D { // "\r" — граница фрагмента при длине ≥ 3
			if len(acc) >= 3 {
				if err := process(); err != nil {
					return nil, err
				}
			}
			continue
		}
		acc = append(acc, c)
		if c == chDot && at(text, i+2) == chDot { // «..» откладывает границу
			continue
		}
		if setPunct[c] {
			if err := process(); err != nil {
				return nil, err
			}
			continue
		}
		if i == n-1 { // последний символ буфера
			if err := process(); err != nil {
				return nil, err
			}
		}
	}
	return out, nil
}

// processChunk — конвейер одного фрагмента + "\r\n".
func processChunk(acc []byte, d *dictionaries, v *voice, rate int) ([]byte, error) {
	s := catStr(acc, []byte{0x0D, 0x0A})
	s = expandAbbreviations(s)
	s = expandNumbers(s)
	s = expandEnglish(s, d)
	s = normalizeText(s)
	if len(s) < 2 {
		return nil, nil
	}
	s = d.stressText(s)
	s = g2p(s)
	return synthPCM(s, v, rate)
}

// Synthesize — текст (UTF-8) → 8-битный беззнаковый PCM, 11025 Гц, моно.
func Synthesize(text string, opts Options) ([]byte, error) {
	return synthesizeRaw(ToCP1251(text), opts)
}

// SynthesizeWAV — текст → готовый WAV-файл.
func SynthesizeWAV(text string, opts Options) ([]byte, error) {
	pcm, err := Synthesize(text, opts)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := WriteWAV(&buf, pcm); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// SynthesizeMP3 — текст → MP3 (требует ffmpeg с libmp3lame в PATH).
func SynthesizeMP3(text string, opts Options) ([]byte, error) {
	pcm, err := Synthesize(text, opts)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := EncodeMP3(&buf, pcm); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
