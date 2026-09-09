package rozmovlyalka

import (
	"crypto/sha256"
	_ "embed"
	"encoding/binary"
	"testing"
)

//go:embed testdata/v1_tempo_hash.bin
var tempoOracle []byte

// fnv1a64 — контрольная сумма эталонных данных: независимый оракул,
// снятый с ассемблера 0x46705f..0x4673be из Rozm.exe.
func fnv1a64(b []byte) uint64 {
	h := uint64(14695981039346656037)
	for _, x := range b {
		h ^= uint64(x)
		h *= 1099511628211
	}
	return h
}

// TestDecodeUnitV1Oracle сверяет темповую декомпозицию каждого юнита голоса 1
// при всех rate != 5 с эталоном, посчитанным по ассемблеру (длина + FNV-1a 64).
func TestDecodeUnitV1Oracle(t *testing.T) {
	v, err := loadVoice('1')
	if err != nil {
		t.Fatal(err)
	}
	rates := []int{1, 2, 3, 4, 6, 7, 8, 9, 10}
	pos := 0
	for k := 0; k < diphoneRows; k++ {
		prev, next := k/diphoneTableSize, k%diphoneTableSize
		for _, rate := range rates {
			if pos+12 > len(tempoOracle) {
				t.Fatal("оракул короче ожидаемого")
			}
			wantLen := binary.LittleEndian.Uint32(tempoOracle[pos : pos+4])
			wantHash := binary.LittleEndian.Uint64(tempoOracle[pos+4 : pos+12])
			pos += 12
			if v.lp[k] <= 0 {
				continue
			}
			got := decodeUnitV1(v.sd, int(v.ip[k]), rate, prev, next)
			if len(got) != int(wantLen) || fnv1a64(got) != wantHash {
				t.Fatalf("k=%d rate=%d: decode дал %d байт/fnv %X, эталон %d/%X",
					k, rate, len(got), fnv1a64(got), wantLen, wantHash)
			}
		}
	}
}

// TestVoice1AllRates — сквозной синтез голоса 1 на всех темпах; эталонные
// длины PCM фразы «Привіт, світ!» сняты с ассемблерной реализации.
func TestVoice1AllRates(t *testing.T) {
	want := map[int]int{
		1: 49796, 2: 39696, 3: 36491, 4: 34630, 5: 19721,
		6: 26985, 7: 26490, 8: 25260, 9: 23245, 10: 18442,
	}
	for rate := 1; rate <= 10; rate++ {
		pcm, err := Synthesize("Привіт, світ!", Options{Voice: '1', Rate: rate})
		if err != nil {
			t.Fatalf("rate %d: %v", rate, err)
		}
		if len(pcm) != want[rate] {
			t.Errorf("rate %d: pcm len = %d, эталон %d", rate, len(pcm), want[rate])
		}
		for i, b := range pcm {
			if b < 40 || b > 215 {
				t.Fatalf("rate %d: pcm[%d] = %d вне типичного диапазона речи", rate, i, b)
			}
		}
	}
}

// TestVoice1Rate5SHA256 — золотой WAV голоса 1 на эталонном темпе: ветка
// rate == 5 не должна меняться при доработке темповой декомпозиции.
func TestVoice1Rate5SHA256(t *testing.T) {
	wav, err := SynthesizeWAV("Привіт, світ!", Options{Voice: '1', Rate: 5})
	if err != nil {
		t.Fatal(err)
	}
	const want = "5502187c7a643938c60bc526949eb3512938c4336f3a53811bc309c20554bfd0"
	sum := sha256.Sum256(wav)
	if got := hexSum(sum[:]); got != want {
		t.Errorf("rate 5 WAV sha256 = %s, эталон %s", got, want)
	}
}

func hexSum(b []byte) string {
	const digits = "0123456789abcdef"
	out := make([]byte, 0, len(b)*2)
	for _, x := range b {
		out = append(out, digits[x>>4], digits[x&15])
	}
	return string(out)
}
