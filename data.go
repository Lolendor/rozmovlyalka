package rozmovlialka

import (
	"bytes"
	"compress/gzip"
	"embed"
	"encoding/binary"
	"fmt"
	"io"
	"sync"
)

// Все данные оригинальной программы (словари и семплы голосов) извлечены из
// RCDATA-ресурсов установщика RozmInstUE1.exe и упакованы gzip'ом.
//
//go:embed data
var dataFS embed.FS

// rawDict — «плоский» отсортированный словарь: общий blob и границы записей.
// Индексация записей 1-based (как в оригинале): 1 <= i <= count.
type rawDict struct {
	blob  []byte
	start []int32 // len = count+2, start[0] не используется
	end   []int32 // len = count+2
	count int
}

// record возвращает i-ю запись (1-based).
func (d *rawDict) record(i int) []byte {
	return d.blob[d.start[i]:d.end[i]]
}

// dictionaries — тяжёлые словари, общие для всех движков.
type dictionaries struct {
	bsn    rawDict // BSNbn — основной словарь ударений
	eudic  rawDict // EUtDic.txt — англо-украинский словарь
	skf    []byte  // СловКор: тела слов и payload
	wif    []int32 // СловКор: int32-смещения, wif[0] = число записей
	wlf    []byte  // СловКор: длины записей
	skorN  int     // число записей СловКор
	decode [256]byte
}

var (
	dictOnce sync.Once
	dictErr  error
	dictRef  *dictionaries
)

// cp1251 — короткая обёртка: все строковые константы оригинала заданы в
// cp1251, а в исходниках Go литералы хранятся в UTF-8.
func cp1251(s string) []byte { return ToCP1251(s) }

// bsnTable — TABLE @0x46e694: декодер байтов BSNbn (значимы индексы 0..56).
var bsnTable = func() (t [256]byte) {
	copy(t[:], cp1251("!"+"абвгґдеєжзиіїйклмнопрстуфхцчшщьюя"+`'\- `+
		"0123456789"+":;<=>?@#$"))
	return t
}()

func gunzipData(name string) ([]byte, error) {
	raw, err := dataFS.ReadFile("data/" + name)
	if err != nil {
		return nil, fmt.Errorf("rozmovlialka: нет данных %q: %w", name, err)
	}
	zr, err := gzip.NewReader(bytes.NewReader(raw))
	if err != nil {
		return nil, fmt.Errorf("rozmovlialka: %q: %w", name, err)
	}
	defer zr.Close()
	out, err := io.ReadAll(zr)
	if err != nil {
		return nil, fmt.Errorf("rozmovlialka: %q: %w", name, err)
	}
	return out, nil
}

func loadInt32s(name string) ([]int32, error) {
	b, err := gunzipData(name)
	if err != nil {
		return nil, err
	}
	if len(b)%4 != 0 {
		return nil, fmt.Errorf("rozmovlialka: %q: размер %d не кратен 4", name, len(b))
	}
	out := make([]int32, len(b)/4)
	for i := range out {
		out[i] = int32(binary.LittleEndian.Uint32(b[4*i:]))
	}
	return out, nil
}

// splitBSNbn воспроизводит загрузчик 0x463fbc..0x464022.
// Буфер лежит по адресу B; A[0] = размер, A[1] = 0, далее для каждого байта
// buf[p] (p = 1..size-1, 0-based) из диапазона 0x26..0x50: A[cnt++] = p+1.
// Запись i = buf[A[i] .. A[i+1]-1] = тело слова + байт-маркер.
// count = A[0x4ec204] = cnt-1.
func splitBSNbn(buf []byte) rawDict {
	n := len(buf)
	marks := make([]int32, 0, n/11+2)
	marks = append(marks, 0) // A[1]
	for p := 1; p <= n-1; p++ {
		if c := buf[p]; c >= 0x26 && c <= 0x50 {
			marks = append(marks, int32(p+1))
		}
	}
	count := len(marks) - 1 // cnt-1, где cnt = len(marks)
	start := make([]int32, count+2)
	end := make([]int32, count+2)
	for i := 1; i <= count; i++ {
		start[i] = marks[i-1]
		end[i] = marks[i]
	}
	return rawDict{blob: buf, start: start, end: end, count: count}
}

// splitEUDic режет EUtDic.txt на записи по "\r\n" (перевод строки в запись
// не входит). Индексация 1-based, как у TStringList в оригинале.
func splitEUDic(buf []byte) rawDict {
	lines := make([]int32, 0, 110000) // начала строк, 0-based
	pos := 0
	for pos <= len(buf) {
		lines = append(lines, int32(pos))
		i := bytes.Index(buf[pos:], []byte{'\r', '\n'})
		if i < 0 {
			break
		}
		pos += i + 2
	}
	// Убираем возможную пустую последнюю «строку» после финального CRLF.
	for len(lines) > 0 && int(lines[len(lines)-1]) >= len(buf) {
		lines = lines[:len(lines)-1]
	}
	count := len(lines)
	start := make([]int32, count+2)
	end := make([]int32, count+2)
	for i := 1; i <= count; i++ {
		start[i] = lines[i-1]
		if i < count {
			end[i] = lines[i] - 2 // минус "\r\n"
		} else {
			end[i] = int32(len(buf))
			if end[i] >= 2 && buf[end[i]-2] == '\r' && buf[end[i]-1] == '\n' {
				end[i] -= 2
			}
		}
	}
	return rawDict{blob: buf, start: start, end: end, count: count}
}

func loadDictionaries() (*dictionaries, error) {
	dictOnce.Do(func() {
		bsnBuf, err := gunzipData("bsnbn.bin.gz")
		if err != nil {
			dictErr = err
			return
		}
		euBuf, err := gunzipData("eudic.bin.gz")
		if err != nil {
			dictErr = err
			return
		}
		skf, err := gunzipData("skf.bin.gz")
		if err != nil {
			dictErr = err
			return
		}
		wif, err := loadInt32s("wif.bin.gz")
		if err != nil {
			dictErr = err
			return
		}
		wlf, err := gunzipData("wlf.bin.gz")
		if err != nil {
			dictErr = err
			return
		}
		if len(wif) == 0 {
			dictErr = fmt.Errorf("rozmovlialka: пустой wif.bin")
			return
		}
		d := &dictionaries{
			bsn:    splitBSNbn(bsnBuf),
			eudic:  splitEUDic(euBuf),
			skf:    skf,
			wif:    wif,
			wlf:    wlf,
			skorN:  int(wif[0]),
			decode: bsnTable,
		}
		dictRef = d
	})
	return dictRef, dictErr
}

// decodeBSN расшифровывает запись BSNbn (FUN_00464724).
func (d *dictionaries) decodeBSN(rec []byte) []byte {
	out := make([]byte, 0, len(rec))
	for _, b := range rec {
		if b < 0x41 {
			out = append(out, d.decode[b])
		} else {
			out = append(out, b)
		}
	}
	return out
}
