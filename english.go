package rozmovlialka

// Этап «английский»: FUN_00465e9c.
//
// Слова из латинских букв заменяются кириллической транскрипцией:
//   - если заглавных букв больше одной — побуквенное чтение (FUN_00465c40);
//   - иначе — поиск в словаре EUtDic (FUN_00465afc), при неудаче —
//     правила чтения (FUN_00465cf8).
// После слова ставится пробел, затем сам разделительный символ.
//
// Апостроф: хвост после "'" (s/t/m/d/ll/re/ve) транслируется отдельно.

var (
	// LETTER @0x46e0ac, индекс = ASCII-код строчной латинской буквы.
	enLetter = [256][]byte{
		'a': cp1251("ей"), 'b': cp1251("бі"), 'c': cp1251("сі"), 'd': cp1251("ді"),
		'e': cp1251("і"), 'f': cp1251("еф"), 'g': cp1251("джі"), 'h': cp1251("ейч"),
		'i': cp1251("ай"), 'j': cp1251("джей"), 'k': cp1251("кей"), 'l': cp1251("ель"),
		'm': cp1251("ем"), 'n': cp1251("ен"), 'o': cp1251("оу"), 'p': cp1251("пі"),
		'q': cp1251("ку"), 'r': cp1251("ар"), 's': cp1251("ес"), 't': cp1251("ті"),
		'u': cp1251("ю"), 'v': cp1251("ві"), 'w': cp1251("дабл"), 'x': cp1251("екс"),
		'y': cp1251("вай"), 'z': cp1251("зет"),
	}

	// TBL @0x46e328 — базовая таблица транслитерации.
	enTranslit = [256][]byte{
		'a': cp1251("а"), 'b': cp1251("б"), 'c': cp1251("к"), 'd': cp1251("д"),
		'e': cp1251("е"), 'f': cp1251("ф"), 'g': cp1251("г"), 'h': cp1251("г"),
		'i': cp1251("і"), 'j': cp1251("дж"), 'k': cp1251("к"), 'l': cp1251("л"),
		'm': cp1251("м"), 'n': cp1251("н"), 'o': cp1251("о"), 'p': cp1251("п"),
		'q': cp1251("к"), 'r': cp1251("р"), 's': cp1251("с"), 't': cp1251("т"),
		'u': cp1251("у"), 'v': cp1251("в"), 'w': cp1251("в"), 'x': cp1251("кс"),
		'y': cp1251("і"), 'z': cp1251("з"),
	}

	enSpace  = cp1251(" ")
	enSh     = cp1251("ш")
	enS      = cp1251("с")
	enCh     = cp1251("ч")
	enStress = cp1251(`\`)

	// Хвосты после апострофа: s→с, t→т, m→м, d→д, ll→л, re→а\, ve→в.
	enTailMap = []struct{ key, val []byte }{
		{cp1251("s"), cp1251("с")},
		{cp1251("t"), cp1251("т")},
		{cp1251("m"), cp1251("м")},
		{cp1251("d"), cp1251("д")},
		{cp1251("ll"), cp1251("л")},
		{cp1251("re"), cp1251(`а\`)},
		{cp1251("ve"), cp1251("в")},
	}
)

func mapEnTail(tail []byte) []byte {
	for _, m := range enTailMap {
		if string(tail) == string(m.key) {
			return m.val
		}
	}
	return tail
}

// spellEnglish — FUN_00465c40: побуквенное чтение.
func spellEnglish(word []byte) []byte {
	var out []byte
	for _, c := range word {
		out = catStr(out, enLetter[c], enSpace)
	}
	return out
}

// translitEnglish — FUN_00465cf8: правила чтения.
// Первый встреченный гласный помечается ударением («\»).
func translitEnglish(word []byte) []byte {
	n := len(word)
	at := func(i int) byte {
		if i >= 1 && i <= n {
			return word[i-1]
		}
		return 0
	}
	var out []byte
	wantStress := true
	i := 1
	for i <= n {
		c := word[i-1]
		t := enTranslit[c]
		if c == 's' && i < n && at(i+1) == 'h' {
			out = append(out, enSh...)
			i += 2
			continue
		}
		if c == 'c' && i < n {
			switch at(i + 1) {
			case 'e', 'i', 'y':
				t = enS
			}
		}
		if c == 'c' && i < n && at(i+1) == 'h' {
			out = append(out, enCh...)
			i += 2
			continue
		}
		out = append(out, t...)
		if wantStress && len(t) > 0 && setEnVow[t[0]] {
			out = append(out, '\\')
			wantStress = false
		}
		i++
	}
	return out
}

// expandEnglish — FUN_00465e9c.
func expandEnglish(s []byte, d *dictionaries) []byte {
	n := len(s)
	at := func(i int) byte {
		if i >= 1 && i <= n {
			return s[i-1]
		}
		return 0
	}
	var out []byte
	var word []byte
	var tail []byte
	inWord := false
	nUpper := 0
	i := 1
	for i <= n {
		c := s[i-1]
		isUpper := c >= 0x41 && c <= 0x5A
		isLower := c >= 0x61 && c <= 0x7A
		if isUpper || isLower {
			inWord = true
			if isUpper {
				word = append(word, c+0x20)
				nUpper++
			} else {
				word = append(word, c)
			}
			i++
			continue
		}
		if !inWord {
			out = append(out, c)
			i++
			continue
		}
		tail = nil
		if c == chApos {
			i++
			for {
				cc := at(i)
				if cc < 0x61 || cc >= 0x7B {
					break
				}
				tail = append(tail, cc)
				i++
			}
			tail = mapEnTail(tail)
			i--
		}
		if nUpper > 1 {
			word = spellEnglish(word)
		} else if w := d.euLookup(word); len(w) > 0 {
			word = append([]byte(nil), w...)
		} else {
			word = translitEnglish(word)
		}
		out = catStr(out, word, tail, enSpace, []byte{c})
		word = nil
		tail = nil
		inWord = false
		nUpper = 0
		i++
	}
	return out
}
