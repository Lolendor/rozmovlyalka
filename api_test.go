package rozmovlyalka

import (
	"bytes"
	"encoding/binary"
	"testing"
)

func TestDictStressKnownWords(t *testing.T) {
	cases := []struct {
		word, prev string
		want       string
	}{
		{"молоко", "ьь", "молокО"},
		{"весна", "ьь", "веснА"},
		{"привіт", "ьь", "привІт"},
		{"хліб", "ьь", "хлІб"},
		{"людина", "ьь", "людИна"},
		{"читати", "ьь", "читАти"},
		{"мама", "ьь", "мАма"},
		{"говорила", "ьь", "говорИла"},
		{"води", "ьь", "вОди"}, // маркер 'B': форма q
		// спецслучаи мене/тебе/себе после предлогов из LIST1
		{"мене", "до", "мЕне"},
		{"тебе", "біля", "тЕбе"},
		{"себе", "у", "сЕбе"},
		{"мене", "звичайно", "менЕ"},
		// многоформенные записи ('B'..'O'): LIST2 и «-ого» выбирают форму r
		{"верби", "у", "вЕрби"},
		{"верби", "коло", "вербИ"},
		{"верби", "якого", "вербИ"},
		{"вікна", "до", "вікнА"},
		// СловКор (skf)
		{"українська", "ьь", "украЇнська"},
		// слова нет ни в одном словаре — заглавливаются все гласные
		{"пфафрум", "ьь", "пфАфрУм"},
	}
	d := mustDict(t)
	for _, c := range cases {
		got := d.dictStress(cp1251(c.word), cp1251(c.prev))
		if want := cp1251(c.want); !bytes.Equal(got, want) {
			t.Errorf("dictStress(%q, prev=%q) = %q, want %q",
				c.word, c.prev, FromCP1251(got), c.want)
		}
	}
}

func TestExplicitMarker(t *testing.T) {
	if got := applyExplicitMarker(cp1251("до" + string(rune(0x5C)) + "брого")); !bytes.Equal(got, cp1251("дОброго")) {
		t.Errorf("applyExplicitMarker = %q", FromCP1251(got))
	}
	if got := applyExplicitMarker(cp1251("слово'чек")); !bytes.Equal(got, cp1251("словОчек")) {
		t.Errorf("applyExplicitMarker apostrophe = %q", FromCP1251(got))
	}
	if got := markerPos(cp1251("додому")); got != 0 {
		t.Errorf("markerPos without marker = %d", got)
	}
	if got := markerPos(cp1251("до" + string(rune(0x5C)) + "брого")); got != 2 {
		t.Errorf("markerPos backslash = %d", got)
	}
	if got := markerPos(cp1251("до'брого")); got != 2 {
		t.Errorf("markerPos apostrophe = %d", got)
	}
}

func TestG2PKnownTraces(t *testing.T) {
	cases := []struct {
		in   string
		want []byte
	}{
		// д+я → дь+а; д+ь → дь; к(EA), о(EE); соседние согласные
		// разделяются паузой, паузы по краям.
		{"дядько", []byte{0xFA, 0xD8, 0xE0, 0xD8, 0xFA, 0xEA, 0xEE, 0xFA}},
		// щ → ш+ч; с|ть разделяются паузой; т+я → ть+а.
		{"щастя", []byte{0xFA, 0xF6, 0xFA, 0xF7, 0xE0, 0xF1, 0xFA, 0xDE, 0xE0, 0xFA}},
		// заглавная О → ударный код D6.
		{"молокО", []byte{0xFA, 0xEC, 0xEE, 0xEB, 0xEE, 0xEA, 0xD6, 0xFA}},
		// я → й+а; б|л разделяются паузой.
		{"яблуко", []byte{0xFA, 0xE9, 0xE0, 0xE1, 0xFA, 0xEB, 0xF3, 0xEA, 0xEE, 0xFA}},
		// пунктуация → пауза.
		{",", []byte{0xFA, 0xFA}},
	}
	for _, c := range cases {
		got := g2p(cp1251(c.in))
		if !bytes.Equal(got, c.want) {
			t.Errorf("g2p(%q) = % X, want % X", c.in, got, c.want)
		}
	}
}

func TestStressTextSentence(t *testing.T) {
	d := mustDict(t)
	// Нормализованный фрагмент (как подаётся из конвейера): пунктуация
	// переписывается с пробелами, хвостовой NUL — артефакт токенизатора,
	// в оригинале возвращается точно так же (и отбрасывается в G2P).
	norm := normalizeText(cp1251("Привіт, світ!" + "\r\n"))
	got := d.stressText(norm)
	want := append(cp1251("привІт , свІт ! "), 0, chSpace)
	if !bytes.Equal(got, want) {
		t.Errorf("stressText = % X, want % X", got, want)
	}
}

func TestPipelinePCM(t *testing.T) {
	for _, voice := range []byte{'1', '2', '3'} {
		pcm, err := Synthesize("Привіт, світ!", Options{Voice: voice, Rate: 5})
		if err != nil {
			t.Fatalf("voice %q: %v", voice, err)
		}
		if len(pcm) < 1000 {
			t.Fatalf("voice %q: pcm len = %d, ожидалось заметно больше", voice, len(pcm))
		}
		for i, b := range pcm {
			if b < 40 || b > 215 {
				t.Fatalf("voice %q: pcm[%d] = %d вне типичного диапазона речи", voice, i, b)
			}
		}
	}
}

func TestSynthesizeWAV(t *testing.T) {
	wav, err := SynthesizeWAV("Раз, два, три!", Options{Voice: '2', Rate: 5})
	if err != nil {
		t.Fatal(err)
	}
	if len(wav) < 44 {
		t.Fatalf("wav слишком короткий: %d", len(wav))
	}
	if !bytes.Equal(wav[:4], []byte("RIFF")) || !bytes.Equal(wav[8:16], []byte("WAVEfmt ")) {
		t.Fatalf("плохой заголовок: % X", wav[:16])
	}
	if got := binary.LittleEndian.Uint32(wav[4:8]); got != uint32(len(wav)-8) {
		t.Errorf("RIFF size = %d, want %d", got, len(wav)-8)
	}
	if rate := binary.LittleEndian.Uint32(wav[24:28]); rate != 11025 {
		t.Errorf("sample rate = %d", rate)
	}
	if got := binary.LittleEndian.Uint32(wav[40:44]); got != uint32(len(wav)-44) {
		t.Errorf("data size = %d, want %d", got, len(wav)-44)
	}
	if d := binary.LittleEndian.Uint16(wav[34:36]); d != 8 {
		t.Errorf("bits per sample = %d", d)
	}
}

func TestChunkQuirks(t *testing.T) {
	// «\r» при накопленном фрагменте < 3 символов не озвучивает и не
	// сбрасывает накопленное — текст озвучивается вместе со следующим.
	if pcm, err := Synthesize("ха\rдосить", Options{}); err != nil {
		t.Fatal(err)
	} else if len(pcm) > 0 {
		t.Log("накопленный фрагмент озвучен вместе со следующим (байт:", len(pcm), ")")
	}
	// «..» откладывает границу фрагмента; в конце текста фрагмент
	// озвучивается даже без пунктуации.
	if pcm, err := Synthesize("краплинки..", Options{}); err != nil {
		t.Fatal(err)
	} else if len(pcm) == 0 {
		t.Error("фрагмент с «..» не озвучен")
	}
	// Опции по умолчанию: голос 1, rate 5.
	if _, err := Synthesize("один", Options{}); err != nil {
		t.Error(err)
	}
}

func TestEmbeddedWavTemplate(t *testing.T) {
	tmpl, err := gunzipData("wavhead.bin.gz")
	if err != nil {
		t.Fatal(err)
	}
	// Эталон из ALGORITHM.md; поля размеров в шаблоне уже даны для пустого
	// файла (filesize-8 = 36), при записи они перепатчиваются.
	want := append([]byte(nil),
		'R', 'I', 'F', 'F', 0x24, 0, 0, 0, 'W', 'A', 'V', 'E',
		'f', 'm', 't', ' ', 0x10, 0, 0, 0, 1, 0, 1, 0,
		0x11, 0x2B, 0, 0, 0x11, 0x2B, 0, 0, 1, 0, 8, 0,
		'd', 'a', 't', 'a', 0, 0, 0, 0)
	if !bytes.Equal(tmpl, want) {
		t.Errorf("wavhead.bin = % X, want % X", tmpl, want)
	}
}
