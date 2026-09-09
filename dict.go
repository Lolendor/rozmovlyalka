package rozmovlyalka

import "bytes"

// delphiDiv2 — знаковое целочисленное деление на 2 как в Delphi (к нулю):
// в оригинале это sar + условный adc ebx,0.
func delphiDiv2(x int) int {
	q := x >> 1
	if q < 0 {
		q += x & 1
	}
	return q
}

// delphiDiv — Delphi `div`: округление к нулю (не к минус бесконечности).
func delphiDiv(a, b int) int {
	q := a / b
	return q
}

// delphiMod — Delphi `mod`: знак результата совпадает со знаком делимого.
func delphiMod(a, b int) int {
	return a % b
}

const dictMiss = byte('8')

// skorLookup — FUN_004648a8: бинарный поиск по словарю исключений СловКор.
// Возвращает байт-позицию ударной гласной (ASCII-цифра) или '8' (не найдено).
//
// Запись i: слово = skf[wif[i] : wif[i]+wlf[i]-1], payload = skf[wif[i]+wlf[i]-1].
// Как и в оригинале, записи 1 и skorN бинарным поиском не проверяются.
func (d *dictionaries) skorLookup(word []byte) byte {
	lo, hi := 1, d.skorN
	for hi-lo > 1 {
		mid := delphiDiv2(lo + hi)
		off := int(d.wif[mid])
		ln := int(d.wlf[mid])
		if ln < 1 || off+ln > len(d.skf) {
			return dictMiss
		}
		rec := d.skf[off : off+ln-1]
		switch c := bytes.Compare(rec, word); {
		case c == 0:
			return d.skf[off+ln-1]
		case c < 0:
			lo = mid
		default:
			hi = mid
		}
	}
	return dictMiss
}

// bsnLookup — FUN_004647d8: бинарный поиск по основному словарю BSNbn.
// Возвращает payload-байт записи (расшифрованный) или '8'.
func (d *dictionaries) bsnLookup(word []byte) byte {
	lo, hi := 1, d.bsn.count
	scratch := make([]byte, 0, 24)
	for hi-lo > 1 {
		mid := delphiDiv2(lo + hi)
		rec := d.decodeBSNInto(d.bsn.record(mid), scratch[:0])
		if len(rec) == 0 {
			return dictMiss
		}
		payload := rec[len(rec)-1]
		body := rec[:len(rec)-1]
		switch c := bytes.Compare(body, word); {
		case c == 0:
			return payload
		case c < 0:
			lo = mid
		default:
			hi = mid
		}
	}
	return dictMiss
}

// decodeBSNInto расшифровывает запись BSNbn в предоставленный буфер.
func (d *dictionaries) decodeBSNInto(rec, dst []byte) []byte {
	for _, b := range rec {
		if b < 0x41 {
			dst = append(dst, d.decode[b])
		} else {
			dst = append(dst, b)
		}
	}
	return dst
}

// euLookup — FUN_00465afc: бинарный поиск английского слова в EUtDic.txt.
// Записи имеют вид "<en-word> <транскрипция>"; возвращается транскрипция
// либо пустая строка, если слово не найдено.
func (d *dictionaries) euLookup(word []byte) []byte {
	lo, hi := 1, d.eudic.count
	for hi-lo > 1 {
		mid := delphiDiv2(lo + hi)
		rec := d.eudic.record(mid)
		key := rec
		if sp := bytes.IndexByte(rec, ' '); sp >= 0 {
			key = rec[:sp]
		}
		switch c := bytes.Compare(key, word); {
		case c == 0:
			if len(rec) > len(key) {
				return rec[len(key)+1:]
			}
			return nil
		case c < 0:
			lo = mid
		default:
			hi = mid
		}
	}
	return nil
}
