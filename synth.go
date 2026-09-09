package rozmovlyalka

import (
	"fmt"
	"math"
	"sync"
)

// synth — порт FUN_00466e7c: склейка дифонов в PCM по фонемной строке.

const (
	diphoneTableSize = 42 // DAT_0046e6e0 — шаг таблицы дифонов
	diphoneRows      = diphoneTableSize * diphoneTableSize
	scratchSize      = 0x1B59 // DAT_004e9dc4 — буфер дифона
	synthBuffer      = 500000 // DAT_0046fca4 — выходной буфер PCM
	xfHalf           = 8      // [ebp-0x24] — половина окна кроссфейда
	xfWin            = 2*xfHalf + 1
)

// voice — загруженный голос («1», «2» или «3»): три потока ip2f/lp2f/sd2f.
type voice struct {
	label byte
	ip    []int32
	lp    []int32
	sd    []byte
}

var (
	voiceOnce sync.Once
	voiceErr  error
	voiceRef  = map[byte]*voice{}
)

// loadVoice — FUN_004676c4: загрузка v<label>_ip/lp/sd из встроенных данных.
func loadVoice(label byte) (*voice, error) {
	voiceOnce.Do(func() {
		for _, l := range []byte{'1', '2', '3'} {
			ip, err := loadInt32s(fmt.Sprintf("v%c_ip.bin.gz", l))
			if err != nil {
				voiceErr = err
				return
			}
			lp, err := loadInt32s(fmt.Sprintf("v%c_lp.bin.gz", l))
			if err != nil {
				voiceErr = err
				return
			}
			sd, err := gunzipData(fmt.Sprintf("v%c_sd.bin.gz", l))
			if err != nil {
				voiceErr = err
				return
			}
			if len(ip) < diphoneRows || len(lp) < diphoneRows {
				voiceErr = fmt.Errorf("rozmovlyalka: голос %q: таблица дифонов короче %d", l, diphoneRows)
				return
			}
			voiceRef[l] = &voice{label: l, ip: ip, lp: lp, sd: sd}
		}
	})
	if voiceErr != nil {
		return nil, voiceErr
	}
	v := voiceRef[label]
	if v == nil {
		return nil, fmt.Errorf("rozmovlyalka: неизвестный голос %q", label)
	}
	return v, nil
}

// synthPCM — FUN_00466e7c: phon → 8-битный беззнаковый PCM 11025 Гц моно.
// Для голоса 1 поддерживается только rate = 5 (эталонный темп); возвращает
// ошибку для других rate (темповая декомпозиция не портирована).
func synthPCM(ph []byte, v *voice, rate int) ([]byte, error) {
	if v.label == '1' && rate != 5 {
		return nil, fmt.Errorf("rozmovlyalka: голос 1 поддерживает только rate 5 (получен %d)", rate)
	}
	out := make([]byte, synthBuffer)
	for i := range out {
		out[i] = 0x80
	}
	scratch := make([]byte, scratchSize)
	total := 0

	for i := 0; i+1 < len(ph); i++ {
		prev := int(ph[i]) - phBase
		next := int(ph[i+1]) - phBase

		// Поправка голоса 2: после гласной перед «ч/ц/чн»-группой — пауза.
		// Отрицательные коды оригинал отбрасывает на гейте `cmp edx, 0x27`.
		if v.label == '2' && prev >= 0 && prev <= 39 && setV2Vowel[byte(prev)] &&
			next >= 0 && next <= 39 && setV2NextFix[byte(next)] {
			next = 40
		}

		// Фонемные байты вне D2..FA подали на вход напрямую — пропускаем
		// (оригинал читал бы память за пределами таблицы).
		if prev < 0 || prev >= diphoneTableSize || next < 0 || next >= diphoneTableSize {
			continue
		}

		k := next + prev*diphoneTableSize
		off := int(v.ip[k])
		ulen := int(v.lp[k])

		if v.label != '1' {
			if ulen <= 0 {
				continue
			}
			copy(scratch, v.sd[off:off+ulen])
		} else {
			if ulen <= 0 {
				continue
			}
			hdr := int(v.sd[off]) // байт-заголовок юнита
			ulen -= hdr
			if ulen > 0 {
				copy(scratch, v.sd[off+hdr:off+hdr+ulen])
			}
		}

		if total == 0 {
			if ulen >= 1 {
				copy(out, scratch[:ulen])
			}
			total += ulen
			continue
		}

		if total+ulen-2*xfHalf >= synthBuffer {
			break
		}
		// Кроссфейд 17 отсчётов, banker's rounding (как Delphi Round).
		for j := 0; j < xfWin; j++ {
			w := float64(j) / float64(2*xfHalf)
			a := math.RoundToEven((1-w)*(float64(out[total-2*xfHalf-1+j])-128) + 128)
			b := math.RoundToEven(w * (float64(scratch[j]) - 128))
			out[total-2*xfHalf-1+j] = byte(a + b)
		}
		// Остаток дифона: scratch[16..ulen-2] (последний байт отбрасывается).
		if m := ulen - 2 - 2*xfHalf; m >= 0 {
			copy(out[total:], scratch[2*xfHalf:2*xfHalf+m+1])
		}
		total += ulen - 2*xfHalf - 1
	}

	return out[:total], nil
}
