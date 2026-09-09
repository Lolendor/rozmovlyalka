package rozmovlialka

// g2p — порт FUN_0046662c: перевод текста с ударениями в строку фонемных
// байтов (0xD2..0xFA). Два прохода:
//   1) побуквенные правила (мягкость, іотация, паузы, ударные гласные);
//   2) вставка разделителя «ъ» между соседними согласными + «ъ» по краям.

// Таблицы трансформаций (jump-таблицы из бинарника, байт → фонемный байт).

func softPhone(c byte) byte {
	switch c {
	case 0xE4: // д → дь
		return 0xD8
	case 0xE7: // з → зь
		return 0xD9
	case 0xEB: // л → ль
		return 0xDA
	case 0xED: // н → нь
		return 0xDB
	case 0xF0: // р → рь
		return 0xDC
	case 0xF1: // с → сь
		return 0xDD
	case 0xF2: // т → ть
		return 0xDE
	case 0xF6: // ц → ць
		return 0xDF
	}
	return c
}

// iotPhone — іотация после мягкого согласного (пары набор {Є,І,і,є,Ю,Я,ю,я}).
func iotPhone(c byte) byte {
	switch c {
	case 0xAA: // Є → е
		return 0xD3
	case 0xB2: // І → і
		return 0xD5
	case 0xB3: // і
		return 0xF9
	case 0xBA: // є → е
		return 0xE5
	case 0xDE: // Ю → у
		return 0xD7
	case 0xDF: // Я → а
		return 0xD2
	case 0xFE: // ю → у
		return 0xF3
	case 0xFF: // я → а
		return 0xE0
	}
	return c
}

// iotVowel — гласная из іотированной (для «й + гласная»).
func iotVowel(c byte) byte {
	return iotPhone(c)
}

// stressVowel — заглавная ударная гласная → ударный фонемный код.
func stressVowel(c byte) byte {
	switch c {
	case 0xB2: // І → і
		return 0xD5
	case 0xB3: // і
		return 0xF9
	case 0xC0: // А → а
		return 0xD2
	case 0xC5: // Е → е
		return 0xD3
	case 0xC8: // И → и
		return 0xD4
	case 0xCE: // О → о
		return 0xD6
	case 0xD3: // У → у
		return 0xD7
	}
	return c
}

// g2p — оба прохода FUN_0046662c.
func g2p(s []byte) []byte {
	// ---- Проход 1 ----
	n := len(s)
	r := make([]byte, 0, n*3/2+4)
	if n > 0 && s[0] == chDot {
		r = append(r, phPause)
	}
	for i := 1; i <= n; i++ {
		c := at(s, i)
		c1 := at(s, i+1)
		c2 := at(s, i+2)
		prev := at(s, i-1)
		switch {
		// 1. Мягкий согласный + «ь».
		case setSoftP[c] && c1 == chSoft:
			r = append(r, softPhone(c))
			i += 1
		// 2. Мягкий согласный + іотированная гласная.
		case setSoftP[c] && setIot[c1]:
			r = append(r, softPhone(c), iotVowel(c1))
			i += 1
		// 3. Пробел перед гласной (не после пунктуации) → пауза.
		case c == chSpace && setVowels[c1] && !setPunct[prev]:
			r = append(r, phPause)
		// 4. Апостроф пропускается.
		case c == chApos:
		// 5. Удвоение «чч/жж» с іотированной.
		case c == 0xF7 && c1 == 0xF7 && (c2 == 0xB3 || c2 == 0xFE || c2 == 0xFF):
			r = append(r, 0xF7, 0xF9) // «ч» + «щ»
			if c2 == 0xFE {
				r = append(r, 0xF3)
			} else if c2 == 0xFF {
				r = append(r, 0xE0)
			}
			i += 2
		case c == 0xE6 && c1 == 0xE6 && (c2 == 0xB3 || c2 == 0xFF):
			r = append(r, 0xE6, 0xF9) // «ж» + «щ»
			if c2 == 0xFF {
				r = append(r, 0xE0)
			}
			i += 2
		// 6. Іотированная гласная → «й» + гласная.
		case setIot[c]:
			r = append(r, 0xE9, iotVowel(c))
		// 7. Буквы а..ш.
		case c >= 0xE0 && c <= 0xF8:
			r = append(r, c)
		// 8. Заглавная ударная гласная.
		case setStressV[c]:
			r = append(r, stressVowel(c))
		// 9. «щ» → «ш» + «ч».
		case c == 0xF9:
			r = append(r, 0xF6, 0xF7)
		// 10. Пунктуация → пауза; всё прочее отбрасывается.
		case setPunct[c]:
			r = append(r, phPause)
		}
	}

	// ---- Проход 2: разделители между согласными ----
	out := make([]byte, 0, len(r)+len(r)/3+2)
	for j := 0; j < len(r); j++ {
		c := r[j]
		if setConsByte[c] && setConsByte[at(r, j+2)] {
			out = append(out, c, phPause)
		} else {
			out = append(out, c)
		}
	}
	out = append(out, phPause)
	if len(out) == 0 || out[0] != phPause {
		out = append([]byte{phPause}, out...)
	}
	return out
}
