package rozmovlialka

// Этап «нормализация»: FUN_0046621c.
//
// Приводит текст к алфавиту, который понимает G2P:
//   - строчные украинские буквы, «ь», «ю», «я», знаки препинания, апостроф и
//     «\» проходят как есть;
//   - гравис ` → апостроф ';
//   - пробел перед дефисом/тире → запятая (пауза);
//   - пробел перед знаком препинания → выбрасывается;
//   - заглавные {А..Я, Ь, Ю, Я} → строчные;
//   - I, i, І, і → «і»;  Ї, ї → «ї»;  Є, є → «є»;
//   - всё прочее (в т.ч. «\n», Ъ, Ы) → одиночный пробел.
//
// Если строка начинается с пробела или цифры, в начало добавляется '.',
// чтобы первая фонема получила паузу.

func normKeep(c byte) bool {
	return (c >= 0xE0 && c <= 0xF9) || c == 0xFC || c == 0xFE || c == 0xFF
}

func normUpper(c byte) bool {
	return (c >= 0xC0 && c <= 0xD9) || c == 0xDC || c == 0xDE || c == 0xDF
}

// normalizeText — FUN_0046621c.
func normalizeText(s []byte) []byte {
	n := len(s)
	at := func(i int) byte {
		if i >= 1 && i <= n {
			return s[i-1]
		}
		return 0
	}
	var res []byte
	if n > 0 && (s[0] == chSpace || setDigit[s[0]]) {
		res = append(res, chDot)
	}
	for i := 1; i <= n; i++ {
		c := s[i-1]
		switch {
		case normKeep(c), setPunct[c], c == chApos, c == chBacksl:
			res = append(res, c)
		case c == chBacktick:
			res = append(res, chApos)
		case c == chSpace && setDash[at(i+1)]:
			res = append(res, ',')
		case c == chSpace && setPunct[at(i+1)]:
			// пробел перед знаком препинания теряется
		case normUpper(c):
			res = append(res, c+0x20)
		case c == chLatI, c == chLati, c == chUkrIUp, c == chUkrILow:
			res = append(res, chUkrILow)
		case c == chUkrYiUp, c == chUkrYiLo:
			res = append(res, chUkrYiLo)
		case c == chUkrYeUp, c == chUkrYeLo:
			res = append(res, chUkrYeLo)
		default:
			if len(res) > 0 && res[len(res)-1] != chSpace {
				res = append(res, chSpace)
			}
		}
	}
	return res
}
