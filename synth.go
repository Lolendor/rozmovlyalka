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
// Для голоса 1 при rate != 5 воспроизводится темповая декомпозиция юнита
// (0x46705f..0x4673be), см. decodeUnitV1.
func synthPCM(ph []byte, v *voice, rate int) ([]byte, error) {
	// В оригинале выходной буфер 0x46fca4 лежит в BSS; при очень коротких
	// первых дифонах кроссфейд читает/пишет память ДО буфера (нули BSS).
	// pre — виртуальный «BSS-префикс»: растёт по мере захода индексов в минус.
	out := make([]byte, synthBuffer)
	var pre []byte
	getPCM := func(i int) byte {
		if i >= 0 {
			return out[i]
		}
		for len(pre) <= -i-1 {
			pre = append(pre, 0)
		}
		return pre[-i-1]
	}
	putPCM := func(i int, b byte) {
		if i >= 0 {
			out[i] = b
			return
		}
		for len(pre) <= -i-1 {
			pre = append(pre, 0)
		}
		pre[-i-1] = b
	}
	for i := range out {
		out[i] = 0x80
	}
	// scratch = глобальный буфер 0x4e9dc4 в оригинале: переиспользуется между
	// дифонами, поэтому «хвост» предыдущего дифона живой (как в BSS оригинала).
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

		if ulen <= 0 {
			continue
		}
		var unit []byte // сэмплы дифона (scratch в оригинале)
		switch {
		case v.label != '1':
			copy(scratch, v.sd[off:off+ulen])
			unit = scratch
		case rate == 5:
			hdr := int(v.sd[off]) // байт-заголовок юнита
			ulen -= hdr
			if ulen > 0 {
				copy(scratch, v.sd[off+hdr:off+hdr+ulen])
			}
			unit = scratch
		default:
			unit = decodeUnitV1(v.sd, off, rate, prev, next)
			ulen = len(unit)
			// Кроссфейд читает unit[0..16] безусловно; у юнитов короче 17
			// сэмплов недописанный хвост — 0x80 (FillChar оригинала).
			if ulen < xfWin {
				pad := make([]byte, xfWin-ulen)
				for j := range pad {
					pad[j] = 0x80
				}
				unit = append(unit, pad...)
			}
		}

		if total == 0 {
			if ulen >= 1 {
				copy(out, unit[:ulen])
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
			idx := total - 2*xfHalf - 1 + j
			a := math.RoundToEven((1-w)*(float64(getPCM(idx))-128) + 128)
			b := math.RoundToEven(w * (float64(unit[j]) - 128))
			putPCM(idx, byte(a+b))
		}
		// Остаток дифона: unit[16..ulen-2] (последний байт отбрасывается).
		if m := ulen - 2 - 2*xfHalf; m >= 0 {
			for j := 0; j <= m; j++ {
				putPCM(total+j, unit[2*xfHalf+j])
			}
		}
		total += ulen - 2*xfHalf - 1
	}

	return out[:total], nil
}

// decodeUnitV1 — темповая декомпозиция юнита голоса 1 (0x46705f..0x4673be).
//
// Юнит sd[off:off+lp] состоит из заголовка и сегментов:
//
//	sd[off+0]          = hdr — длина заголовка (при rate 5 payload просто
//	                    лежит по off+hdr целиком);
//	sd[off+1]          = segCount — число сегментов;
//	sd[off+2..]        = w_j — смещения записей сегментов от начала юнита;
//	запись j по p = off+w_j:
//	  p[0]             = tagType: 1 (пауза), 2 (повторы), 3 (длины кусков);
//	  p[1..2]          = size:LE16 — смещение куска данных от начала юнита;
//	  p[3..4]          = n2:LE16 — длина куска данных;
//	  при tagType == 3: p[5] = lcnt, p[6..5+lcnt] = длины кусков.
//
// Куски данных сегментов без пропусков и наложений разбивают payload юнита
// (sd[off+hdr:off+hdr+lp-hdr]). Возвращает сэмплы юнита в темпе rate;
// длина может превышать scratchSize (0x1B59) — в оригинале запись уходит
// за границу буфера 0x4e9dc4 в зазор BSS, который читается обратно.
func decodeUnitV1(sd []byte, off, rate, prev, next int) []byte {
	d := rate
	if rate >= 5 {
		if next < 6 || prev < 6 {
			d = 11 - rate
		} else {
			d = 12 - rate
		}
	}
	dst := make([]byte, 0, scratchSize)
	segCount := int(sd[off+1])
	for segIdx := 1; segIdx <= segCount; segIdx++ {
		srcPos := 0
		w := int(sd[off+1+segIdx])
		tagType := int(sd[off+w])
		size := int(sd[off+w+1]) | int(sd[off+w+2])<<8
		n2 := int(sd[off+w+3]) | int(sd[off+w+4])<<8
		tmp := sd[off+size : off+size+n2]
		switch tagType {
		case 1: // пауза: заполнение 0x80
			cnt := n2 + n2/d
			if rate > 5 {
				cnt = n2 - n2/d
			}
			for i := 0; i < cnt; i++ {
				dst = append(dst, 0x80)
			}
		case 2: // периодический повтор куска period = 70 (35 после prev=0x20)
			period := 70
			if prev == 0x20 {
				period = 35
			}
			for k := 1; k <= n2/period; k++ {
				switch {
				case k%d != 0:
					dst = append(dst, tmp[srcPos:srcPos+period]...)
					srcPos += period
				case rate > 5:
					srcPos += period
				default:
					dst = append(dst, tmp[srcPos:srcPos+period]...)
					dst = append(dst, tmp[srcPos:srcPos+period]...)
					srcPos += period
				}
			}
		case 3: // куски с явными длинами; первый сегмент начинается с 8 байт
			lcnt := int(sd[off+w+5])
			if segIdx == 1 {
				dst = append(dst, tmp[srcPos:srcPos+8]...)
				srcPos += 8
			}
			for k := 1; k <= lcnt; k++ {
				ln := int(sd[off+w+5+k])
				switch {
				case k%d != 0:
					dst = append(dst, tmp[srcPos:srcPos+ln]...)
					srcPos += ln
				case rate > 5:
					srcPos += ln
				default:
					dst = append(dst, tmp[srcPos:srcPos+ln]...)
					dst = append(dst, tmp[srcPos:srcPos+ln]...)
					srcPos += ln
				}
			}
		}
		// Хвост: остаток куска, не покрытый декомпозицией.
		if rem := n2 - srcPos; rem > 0 {
			dst = append(dst, tmp[srcPos:srcPos+rem]...)
		}
	}
	return dst
}
