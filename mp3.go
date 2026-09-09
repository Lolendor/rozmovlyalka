package rozmovlyalka

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io"
	"os/exec"
)

// EncodeMP3 — конвертация PCM в MP3 через внешний ffmpeg (codec libmp3lame).
// Семплы переводятся из беззнаковых 8-битных в s16le.
func EncodeMP3(w io.Writer, pcm []byte) error {
	ff, err := exec.LookPath("ffmpeg")
	if err != nil {
		return fmt.Errorf("rozmovlyalka: для MP3 нужен ffmpeg в PATH: %w", err)
	}
	raw := make([]byte, 2*len(pcm))
	for i, b := range pcm {
		binary.LittleEndian.PutUint16(raw[2*i:], uint16(int16(b)-128))
	}
	cmd := exec.Command(ff,
		"-hide_banner", "-loglevel", "error",
		"-f", "s16le", "-ar", "11025", "-ac", "1",
		"-i", "pipe:0",
		"-codec:a", "libmp3lame", "-b:a", "32k",
		"-f", "mp3", "pipe:1",
	)
	cmd.Stdin = bytes.NewReader(raw)
	var out, errb bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errb
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("rozmovlyalka: ffmpeg: %w: %s", err, errb.String())
	}
	_, err = w.Write(out.Bytes())
	return err
}
