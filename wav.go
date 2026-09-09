package rozmovlialka

import (
	"encoding/binary"
	"fmt"
	"io"
)

// wavHeader — 44-байтный RIFF-шаблон из DAT_02365704 (wavhead.bin), поля
// размеров (@4 и @0x28) патчатся под длину данных.
func wavHeader(dataLen int, patched [44]byte) []byte {
	h := patched
	binary.LittleEndian.PutUint32(h[4:], uint32(44-8+dataLen)) // filesize-8
	binary.LittleEndian.PutUint32(h[0x28:], uint32(dataLen))   // filesize-44
	return h[:]
}

// loadWavTemplate возвращает копию шаблона wavhead.bin из встроенных данных.
func loadWavTemplate() ([44]byte, error) {
	var t [44]byte
	b, err := gunzipData("wavhead.bin.gz")
	if err != nil {
		return t, err
	}
	if len(b) != 44 {
		return t, fmt.Errorf("rozmovlialka: шаблон wavhead имеет размер %d, ожидалось 44", len(b))
	}
	copy(t[:], b)
	return t, nil
}

// WriteWAV — упаковка PCM в WAV (11025 Гц, моно, 8 бит без знака) с
// оригинальным 44-байтным заголовком программы.
func WriteWAV(w io.Writer, pcm []byte) error {
	t, err := loadWavTemplate()
	if err != nil {
		return err
	}
	if _, err := w.Write(wavHeader(len(pcm), t)); err != nil {
		return err
	}
	_, err = w.Write(pcm)
	return err
}
