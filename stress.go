package rozmovlyalka

import "bytes"

// Stress — порт FUN_00465210 (оркестратор расстановки ударений) вместе с
// вложенными процедурами FUN_0046463c (токенизатор), FUN_00465100
// (явный маркер ударения) и FUN_00464adc (словарное ударение).

var (
	list1 = cp1251(" у в до на по від од про для за під із з біля крім без повз окрім коло ")
	list2 = cp1251(" до від од з із біля коло для без крім нема немає окрім поблизу")
)

// setLowVow — SET_4653ac / SET_465200: битмап из 10 байт, индекс (c+0x50)&0x7F
// гейтится ≤ 0x4F. Членство эквивалентно {і,є,ї,а,е,и,о,у,ю,я} — см. sets.go.
//
// setUpperable — SET_465078 / SET_46520c: индекс (c+0x20)&0x7F, гейт ≤ 0x1F,
// битмап 21 41 08 C0 → {а,е,и,о,у,ю,я}.

// upVowel — общий помощник «заглавить ударную гласную»:
// а..я через битмап SET_465078 и ї/є/і явными проверками.
func upVowel(c byte) byte {
	switch {
	case setUpperable[c]:
		return c - 0x20
	case c == chUkrILow: // і → І
		return chUkrIUp
	case c == chUkrYiLo: // ї → Ї
		return chUkrYiUp
	case c == chUkrYeLo: // є → Є
		return chUkrYeUp
	}
	return c
}

// at возвращает s[i] для 1-based индекса; за пределами строки — 0 (в оригинале
// за данными AnsiString лежит нулевой терминатор).
func at(s []byte, i int) byte {
	if i < 1 || i > len(s) {
		return 0
	}
	return s[i-1]
}

// tokenize — FUN_0046463c. Возвращает слово из s, продвигая *i (1-based) за
// следующий разделитель. Разделители: SET_46dff0 (пунктуация), пробел, дефис.
func tokenize(s []byte, i *int) []byte {
	n := len(s)
	for {
		c := at(s, *i)
		if !(setPunct[c] || c == chSpace || c == chDash) {
			break
		}
		*i++
	}
	word := make([]byte, 0, 8)
	for {
		c := at(s, *i)
		if setPunct[c] || c == chSpace || c == chDash {
			break
		}
		word = append(word, c)
		*i++
		if n < *i {
			break
		}
	}
	return word
}

// applyExplicitMarker — FUN_00465100: слово с явным маркером «\» или «'».
// Маркер поглощается, гласная перед ним заглавляется.
func applyExplicitMarker(word []byte) []byte {
	n := len(word)
	res := make([]byte, 0, n)
	i := 1 // 1-based
	for i <= n-1 {
		c := at(word, i)
		out := c
		if setLowVow[c] && (at(word, i+1) == chBacksl || at(word, i+1) == chApos) {
			i++
			out = upVowel(c)
		}
		res = append(res, out)
		i++
	}
	if i == n {
		res = append(res, at(word, n))
	}
	return res
}

// markStress — помечает в word гласную под 1-based номером pos (k-счётчик по
// SET_46e030). pos == 0 означает «не помечать».
func markStress(word []byte, pos byte) []byte {
	if pos == 0 {
		return word
	}
	out := make([]byte, len(word))
	copy(out, word)
	k := byte(0)
	for j := 0; j < len(out); j++ {
		if !setVowels[out[j]] {
			continue
		}
		k++
		if k == pos {
			out[j] = upVowel(out[j])
		}
	}
	return out
}

// upcaseAllVowels — вариант запасной ветки FUN_00464adc (b = '8', слово не в
// словаре): заглавливаются все гласные: а е и о у ю я через SET_465078
// плюс і/ї/є.
func upcaseAllVowels(word []byte) []byte {
	out := make([]byte, len(word))
	for j, c := range word {
		switch {
		case setUpperable[c]:
			out[j] = c - 0x20
		case c == chUkrILow:
			out[j] = chUkrIUp
		case c == chUkrYiLo:
			out[j] = chUkrYiUp
		case c == chUkrYeLo:
			out[j] = chUkrYeUp
		default:
			out[j] = c
		}
	}
	return out
}

// dictStress — FUN_00464adc. Возвращает word с расставленным ударением.
func (d *dictionaries) dictStress(word, prev []byte) []byte {
	ctx := catStr([]byte(" "), prev, []byte(" "))
	// Спецслучаи «мене/тебе/себе» после коротких предлогов из LIST1.
	if bytes.Contains(list1, ctx) {
		switch {
		case bytes.Equal(word, cp1251("мене")):
			return cp1251("мЕне")
		case bytes.Equal(word, cp1251("тебе")):
			return cp1251("тЕбе")
		case bytes.Equal(word, cp1251("себе")):
			return cp1251("сЕбе")
		}
	}

	// Основной быстрый словарный поиск (СловКор). Payload — ASCII
	// '1'..'6' (позиция) или '8' (не найдено); '0' означает «без ударения».
	if b := d.skorLookup(word); b != '8' {
		// k-счётчик стартует с '0': позиция = b, но '0' никогда не совпадает.
		out := make([]byte, len(word))
		copy(out, word)
		k := byte(0x30)
		for j := 0; j < len(out); j++ {
			if !setVowels[out[j]] {
				continue
			}
			k++
			if k == b {
				out[j] = upVowel(out[j])
			}
		}
		return out
	}

	// Большой словарь BSNbn.
	b := d.bsnLookup(word)
	n := len(word)

	// Многоформенные записи с кодами 'B'..'O' (0x42..0x4F):
	// x := b-0x3C; r := x mod 4 (r==0 → 4); q := (x-r) div 4.
	// Контекст из LIST2 или окончания «ої/єї/ого» предыдущего слова
	// выбирают форму r, иначе — q.
	if b > 0x41 && b < 0x50 {
		x := int(b) - 0x3C
		r := delphiMod(x, 4)
		if r == 0 {
			r = 4
		}
		q := delphiDiv(x-r, 4)
		b = byte(q)
		if bytes.Contains(list2, ctx) {
			b = byte(r)
		} else if len(prev) > 2 {
			t2 := prev[len(prev)-2:]
			t3 := prev[len(prev)-3:]
			if bytes.Equal(t2, cp1251("ої")) || bytes.Equal(t2, cp1251("єї")) ||
				bytes.Equal(t3, cp1251("ого")) {
				b = byte(r)
			}
		}
	}

	// Повторная попытка без окончания (только для кода '8'):
	// убираются последние 2 символа; «сь»→«ся»; двусложные окончания
	// «ая/ую/еє/ії/яя/єє» урезаются до первого символа.
	if b == '8' && n > 2 {
		pre := word[:n-2]
		end2 := append([]byte(nil), word[n-2:]...)
		if bytes.Equal(end2, cp1251("сь")) {
			end2 = cp1251("ся")
		}
		switch {
		case bytes.Equal(end2, cp1251("ая")), bytes.Equal(end2, cp1251("ую")),
			bytes.Equal(end2, cp1251("еє")), bytes.Equal(end2, cp1251("ії")),
			bytes.Equal(end2, cp1251("яя")), bytes.Equal(end2, cp1251("єє")):
			end2 = end2[:1]
		}
		b = d.bsnLookup(catStr(pre, end2))
	}

	// Слово в словаре отсутствует: заглавливаются все гласные (n > 1).
	if b == '8' {
		if n > 1 {
			return upcaseAllVowels(word)
		}
		return append([]byte(nil), word...)
	}

	// Код → позиция: 'A'..'O' уже обработаны выше; ':'..'$' → 1..9
	// (b -= 0x39), '0'..'9' → 0..9 (b -= 0x30).
	if b > '9' {
		b -= 0x39
	} else if b > '/' {
		b -= 0x30
	}
	return markStress(word, b)
}

// stressText — FUN_00465210: токенизация входной строки с расстановкой
// ударений. Пунктуация переписывается как «символ + пробел», слова — через
// пробел. Возвращает новую строку.
func (d *dictionaries) stressText(s []byte) []byte {
	n := len(s)
	acc := make([]byte, 0, n+n/4+16)
	i := 1 // 1-based
	prevWord := cp1251("ьь")
	for {
		if c := at(s, i); setPunct[c] {
			acc = append(acc, c, chSpace)
		}
		word := tokenize(s, &i)
		if p := markerPos(word); p == 0 {
			prevWord = append(prevWord[:0], word...)
			word = d.dictStress(word, prevWord)
		} else {
			word = applyExplicitMarker(word)
		}
		acc = append(acc, word...)
		acc = append(acc, chSpace)
		if i >= n {
			break
		}
	}
	return acc
}

// markerPos — поиск явного маркера ударения. Возвращает 1-based позицию маркера
// минус 1 (0 — маркера нет). «\» действует всегда, «'» — только после строчной
// гласной из SET_4653ac.
func markerPos(word []byte) int {
	for j := 1; j <= len(word); j++ {
		if at(word, j) == chBacksl {
			return j - 1
		}
		if at(word, j) == chApos && setLowVow[at(word, j-1)] {
			return j - 1
		}
	}
	return 0
}
