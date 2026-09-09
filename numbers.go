package rozmovlialka

import "bytes"

// Этап «числа»: FUN_004659dc → FUN_004656a0 → FUN_004653b8.
//
// num3 (FUN_004659dc) копирует нецифровые символы как есть, а каждую серию
// цифр заменяет на " " + пропись числа. num2 (FUN_004656a0) разбивает серию
// на группы по 3 цифры справа налево и рекурсивно вызывает num1
// (FUN_004653b8) с «родом» группы: 0 = единицы, 1 = тысячи, 2 = миллионы…

func catStr(parts ...[]byte) []byte {
	total := 0
	for _, p := range parts {
		total += len(p)
	}
	out := make([]byte, 0, total)
	for _, p := range parts {
		out = append(out, p...)
	}
	return out
}

// atoiDigits — аналог StrToInt для строки, состоящей только из цифр.
func atoiDigits(b []byte) int {
	v := 0
	for _, c := range b {
		if c < '0' || c > '9' {
			return v
		}
		v = v*10 + int(c-'0')
	}
	return v
}

var (
	// T1 @0x46e5d8, индекс = значение 1..19 (нулевой слот — nil).
	numT1 = [20][]byte{
		nil,
		cp1251("один"), cp1251("два"), cp1251("три"), cp1251("чотири"),
		cp1251("п'ять"), cp1251("шість"), cp1251("сім"), cp1251("вісім"),
		cp1251("дев'ять"), cp1251("десять"), cp1251("одинадцять"),
		cp1251("дванадцять"), cp1251("тринадцять"), cp1251("чотирнадцять"),
		cp1251("п'ятнадцять"), cp1251("шістнадцять"), cp1251("сімнадцять"),
		cp1251("вісімнадцять"), cp1251("дев'ятнадцять"),
	}
	// TENS @0x46e4f0, индекс = ASCII-байт цифры. Слоты '0' и '1' физически
	// пересекаются с HUNDREDS['8'] и HUNDREDS['9'] и в коде не используются.
	numTens = [256][]byte{
		'0': cp1251("вісімсот"), '1': cp1251("дев'ятсот"),
		'2': cp1251("двадцять"), '3': cp1251("тридцять"), '4': cp1251("сорок"),
		'5': cp1251("п'ятдесят"), '6': cp1251("шістдесят"), '7': cp1251("сімдесят"),
		'8': cp1251("вісімдесят"), '9': cp1251("дев'яносто"),
	}
	// HUNDREDS @0x46e4d0, индекс = ASCII-байт цифры.
	numHundreds = [256][]byte{
		'1': cp1251("сто"), '2': cp1251("двісті"), '3': cp1251("триста"),
		'4': cp1251("чотириста"), '5': cp1251("п'ятсот"), '6': cp1251("шістсот"),
		'7': cp1251("сімсот"), '8': cp1251("вісімсот"), '9': cp1251("дев'ятсот"),
	}
	// SING / PLUR234 / PLUR5 @0x46e620 / 0x46e640 / 0x46e660, индекс = род 2..9.
	numSing = [10][]byte{
		2: cp1251("мільйон"), 3: cp1251("мільярд"), 4: cp1251("трильйон"),
		5: cp1251("квадрильйон"), 6: cp1251("квінтальйон"), 7: cp1251("секстальйон"),
		8: cp1251("септальйон"), 9: cp1251("октальйон"),
	}
	numPlur234 = [10][]byte{
		2: cp1251("мільйони"), 3: cp1251("мільярди"), 4: cp1251("трильйони"),
		5: cp1251("квадрильйони"), 6: cp1251("квінтальйони"), 7: cp1251("секстальйони"),
		8: cp1251("септальйони"), 9: cp1251("октальйони"),
	}
	numPlur5 = [10][]byte{
		2: cp1251("мільйонів"), 3: cp1251("мільярдів"), 4: cp1251("трильйонів"),
		5: cp1251("квадрильйонів"), 6: cp1251("квінтальйонів"), 7: cp1251("секстальйонів"),
		8: cp1251("септальйонів"), 9: cp1251("октальйонів"),
	}

	numSpace     = cp1251(" ")
	numThousand1 = cp1251("одна тисяча")
	numTwoFem    = cp1251("дві")
	numThoushi   = cp1251("тисячі")
	numThoush    = cp1251("тисяч")
	numZeroWord  = cp1251("нуль")
	numManyWord  = cp1251("багато")
	numTriple0   = cp1251("000")
)

// num1 — FUN_004653b8: пропись группы цифр (1..3 символа) с указанием рода.
func num1(s []byte, gender int) []byte {
	dlen := len(s)
	v := atoiDigits(s)
	var out []byte
	if v > 0 && v < 20 {
		out = append(out, numT1[v]...)
	}
	if gender == 1 {
		if v == 1 {
			out = append(out[:0], numThousand1...)
		}
		if v == 2 {
			out = append(out[:0], numTwoFem...)
		}
		if v >= 2 && v <= 4 {
			out = catStr(out, numSpace, numThoushi)
		} else if v != 1 {
			out = catStr(out, numSpace, numThoush)
		}
	} else if gender > 1 && gender < 10 {
		if v == 1 {
			out = catStr(out, numSpace, numSing[gender])
		}
		if v >= 2 && v <= 4 {
			out = catStr(out, numSpace, numPlur234[gender])
		} else if v != 1 {
			out = catStr(out, numSpace, numPlur5[gender])
		}
	}
	if v > 19 && v < 100 {
		switch dlen {
		case 2:
			out = catStr(numTens[s[0]], numSpace, num1([]byte{s[1]}, gender))
		case 3:
			out = catStr(numTens[s[1]], numSpace, num1([]byte{s[2]}, gender))
		}
	}
	if v > 99 && dlen >= 3 {
		out = catStr(numHundreds[s[0]], numSpace, num1(s[1:3], gender))
	}
	return out
}

// num2 — FUN_004656a0: пропись произвольной серии цифр.
func num2(digits []byte) []byte {
	n := len(digits)
	if n > 30 {
		return append([]byte(nil), numManyWord...)
	}
	if n < 9 && atoiDigits(digits) == 0 {
		return append([]byte(nil), numZeroWord...)
	}
	cur := digits
	var acc []byte
	gender := 0
	for {
		var grp []byte
		if n <= 3 {
			grp = cur
		} else {
			grp = cur[n-3 : n]
			cur = cur[:n-3]
		}
		if !bytes.Equal(grp, numTriple0) {
			acc = catStr(num1(grp, gender), numSpace, acc)
		}
		gender++
		n -= 3
		if n <= 0 {
			break
		}
	}
	return acc
}

// expandNumbers — FUN_004659dc.
//
// Как и оригинал, функция читает байт за пределами строки (Delphi хранит там
// #0); доступ реализован через at(), чтобы поведение совпадало побайтово.
func expandNumbers(s []byte) []byte {
	n := len(s)
	at := func(i int) byte {
		if i >= 1 && i <= n {
			return s[i-1]
		}
		return 0
	}
	var acc []byte
	i := 1
	for i <= n {
		var digits []byte
		for {
			c := at(i)
			if c >= '0' && c <= '9' {
				break
			}
			if i > n {
				break
			}
			acc = append(acc, c)
			i++
		}
		for {
			c := at(i)
			if c < '0' || c > '9' {
				break
			}
			if i > n {
				break
			}
			digits = append(digits, c)
			i++
		}
		if len(digits) > 0 {
			acc = catStr(acc, numSpace, num2(digits))
		}
		if i > n {
			break
		}
	}
	return acc
}
