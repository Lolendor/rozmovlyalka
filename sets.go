package rozmovlyalka

// byteSet — аналог Delphi `set of AnsiChar` (побитовая карта).
type byteSet [256]bool

func mkSet(bs ...byte) byteSet {
	var s byteSet
	for _, b := range bs {
		s[b] = true
	}
	return s
}

func mkRangeSet(lo, hi byte) byteSet {
	var s byteSet
	for b := int(lo); b <= int(hi); b++ {
		s[b] = true
	}
	return s
}

func unionSets(a, b byteSet) byteSet {
	var s byteSet
	for i := range s {
		s[i] = a[i] || b[i]
	}
	return s
}

const (
	chCR       = 0x0D
	chSpace    = 0x20
	chApos     = 0x27
	chDash     = 0x2D
	chDot      = 0x2E
	chDigit0   = 0x30
	chDigit9   = 0x39
	chBacksl   = 0x5C
	chBacktick = 0x60

	// Латиница
	chLatI = 0x49
	chLati = 0x69

	// Украинские буквы (cp1251)
	chUkrIUp  = 0xB2 // І
	chUkrILow = 0xB3 // і
	chUkrYiUp = 0xAF // Ї
	chUkrYiLo = 0xBF // ї
	chUkrYeUp = 0xAA // Є
	chUkrYeLo = 0xBA // є
	chSoft    = 0xFC // ь
	chGrave   = 0xB4 // ґ
	chGraveUp = 0x88 // Ґ

	// Фонемные байты
	phPause = 0xFA // «ъ» — разделитель/пауза, код 40
	phBase  = 0xD2
)

var (
	// SET_46dff0 — знаки препинания, режущие текст на фразы.
	setPunct = mkSet(0x0D, 0x21, 0x28, 0x29, 0x2C, 0x2E, 0x3A, 0x3B, 0x3F, 0x85)
	// SET_46dfd0 — цифры.
	setDigit = mkRangeSet(0x30, 0x39)
	// SET_46e010 — дефис/тире.
	setDash = mkSet(0x2D, 0x96, 0x97)
	// SET_46e030 — все украинские гласные буквы (верхний и нижний регистр).
	setVowels = mkSet(0xAA, 0xAF, 0xB2, 0xB3, 0xBA, 0xBF, 0xC0, 0xC5, 0xC8, 0xCE,
		0xD3, 0xDE, 0xDF, 0xE0, 0xE5, 0xE8, 0xEE, 0xF3, 0xFE, 0xFF)
	// SET_46e050 — безударные украинские гласные (нижний регистр).
	setEnVow = mkSet(0xB3, 0xE0, 0xE5, 0xE8, 0xEE, 0xF3)
	// SET_46e574 — согласные, смягчающиеся перед «ь»/іотированной.
	setSoftP = mkSet(0xE4, 0xE7, 0xEB, 0xED, 0xF0, 0xF1, 0xF2, 0xF6)
	// SET_466e50 — іотированные гласные.
	setIot = mkSet(0xAA, 0xAF, 0xBA, 0xBF, 0xDE, 0xDF, 0xFE, 0xFF)
	// SET_466e68 — заглавные гласные, дающие ударный фонемный код.
	setStressV = mkSet(0xB2, 0xB3, 0xC0, 0xC5, 0xC8, 0xCE, 0xD3)
	// SET_4653ac — строчные гласные (для поиска явного маркера ударения).
	setLowVow = mkSet(0xB3, 0xBA, 0xBF, 0xE0, 0xE5, 0xE8, 0xEE, 0xF3, 0xFE, 0xFF)
	// SET_465078 / SET_46520c — строчные гласные, имеющие пару в верхнем регистре
	// (индекс = (c+0x20)&0x7F): а е и о у ю я.
	setUpperable = mkSet(0xE0, 0xE5, 0xE8, 0xEE, 0xF3, 0xFE, 0xFF)

	// Объединение SET_46e554 ∪ SET_46e534 ∪ SET_46e514 — согласные фонемные байты.
	setConsByte = unionSets(
		unionSets(mkSet(0xDE, 0xDF, 0xEA, 0xEF, 0xF2, 0xF6, 0xF7),
			mkSet(0xD8, 0xD9, 0xDA, 0xDB, 0xDC, 0xE1, 0xE2, 0xE3, 0xE4,
				0xE6, 0xE7, 0xE9, 0xEB, 0xEC, 0xED, 0xF0)),
		mkSet(0xDD, 0xF1, 0xF4, 0xF5, 0xF8))

	// SET_4676b4 — фонемные коды гласных (используется для голоса 2).
	setV2Vowel = mkSet(0, 1, 2, 3, 4, 5, 14, 19, 22, 28, 33, 39)
	// Коды согласных, перед которыми голос 2 подменяет гласную на код 40.
	setV2NextFix = mkSet(12, 13, 24, 29, 32, 36, 37)
)
