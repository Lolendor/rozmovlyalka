package rozmovlialka

import (
	"encoding/hex"
	"testing"
)

func TestBsnTableBytes(t *testing.T) {
	const want = "21e0e1e2e3b4e4e5bae6e7e8b3bfe9eaebecedeeeff0f1f2f3f4f5f6f7f8f9" +
		"fcfeff275c2d20303132333435363738393a3b3c3d3e3f402324"
	got := hex.EncodeToString(bsnTable[:57])
	if got != want {
		t.Fatalf("bsnTable mismatch\n got: %s\nwant: %s", got, want)
	}
}

func mustDict(t *testing.T) *dictionaries {
	t.Helper()
	d, err := loadDictionaries()
	if err != nil {
		t.Fatalf("loadDictionaries: %v", err)
	}
	return d
}

func TestDictionaryCounts(t *testing.T) {
	d := mustDict(t)
	if d.skorN != 2788 {
		t.Errorf("skorN = %d, want 2788", d.skorN)
	}
	if d.bsn.count != 1681698 {
		t.Errorf("bsn.count = %d, want 1681698", d.bsn.count)
	}
	if d.eudic.count != 105384 {
		t.Errorf("eudic.count = %d, want 105384", d.eudic.count)
	}
}

func TestSkorLookup(t *testing.T) {
	d := mustDict(t)
	cases := map[string]byte{
		"ієрусалиме": '5',
		"ієсейську":  '3',
		"іаков":      '2',
		"ієремія":    '4',
		"людина":     dictMiss,
		"":           dictMiss,
	}
	for w, want := range cases {
		got := d.skorLookup(ToCP1251(w))
		if got != want {
			t.Errorf("skorLookup(%q) = %q, want %q", w, got, want)
		}
	}
}

func TestBsnLookup(t *testing.T) {
	d := mustDict(t)
	cases := map[string]byte{
		"ієрарх":     '3',
		"ієрархія":   '3',
		"ієрархії":   '3',
		"людина":     '2',
		"київ":       ':',
		"ієрархів":   '3',
		"кіт":        '1',
		"собака":     '2',
		"привіт":     '2',
		"дякую":      ':',
		"розмовляти": '3',
		"говорить":   '2',
		"xyzzy":      dictMiss,
	}
	for w, want := range cases {
		got := d.bsnLookup(ToCP1251(w))
		if got != want {
			t.Errorf("bsnLookup(%q) = %q, want %q", w, got, want)
		}
	}
}

func TestEuLookup(t *testing.T) {
	d := mustDict(t)
	cases := map[string]string{
		"aaberg": "а\\берг",
		"aachen": "а\\кен",
		"aaron":  "е\\рен",
		"zzz":    "",
	}
	for w, want := range cases {
		got := FromCP1251(d.euLookup(ToCP1251(w)))
		if got != want {
			t.Errorf("euLookup(%q) = %q, want %q", w, got, want)
		}
	}
}
