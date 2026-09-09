// roztts — текстовый синтезатор украинской речи из «Розмовлялки».
//
// Примеры:
//
//	roztts -voice 1 -o привіт.wav "Привіт, світ!"
//	roztts "Привіт, світ!" -o привіт.wav      # флаги можно и после текста
//	roztts -f текст.txt -o мова.mp3
//	echo "Привіт" | roztts --stdout > привіт.wav
package main

import (
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"

	"github.com/Lolendor/rozmovlyalka"
)

type config struct {
	voice     byte
	rate      int
	out       string
	inputFile string
	toStdout  bool
	textParts []string
}

func parseArgs(args []string) (*config, error) {
	cfg := &config{voice: '1', rate: 5, out: "out.wav"}
	need := func(i *int, name string) (string, error) {
		if *i+1 >= len(args) {
			return "", fmt.Errorf("флаг %s требует значения", name)
		}
		*i++
		return args[*i], nil
	}
	posArgs := false
	for i := 0; i < len(args); i++ {
		a := args[i]
		if posArgs || !strings.HasPrefix(a, "-") || a == "-" {
			cfg.textParts = append(cfg.textParts, a)
			continue
		}
		name, val, hasVal := strings.Cut(a, "=")
		get := func() (string, error) {
			if hasVal {
				return val, nil
			}
			return need(&i, name)
		}
		switch name {
		case "-o", "--out", "--output":
			v, err := get()
			if err != nil {
				return nil, err
			}
			cfg.out = v
		case "-f", "--file":
			v, err := get()
			if err != nil {
				return nil, err
			}
			cfg.inputFile = v
		case "-voice", "--voice":
			v, err := get()
			if err != nil {
				return nil, err
			}
			if len(v) != 1 || v[0] < '1' || v[0] > '3' {
				return nil, fmt.Errorf("голос должен быть 1, 2 или 3, получено %q", v)
			}
			cfg.voice = v[0]
		case "-rate", "--rate":
			v, err := get()
			if err != nil {
				return nil, err
			}
			r, err := strconv.Atoi(v)
			if err != nil || r < 1 || r > 10 {
				return nil, fmt.Errorf("скорость должна быть числом 1..10, получено %q", v)
			}
			cfg.rate = r
		case "-stdout", "--stdout":
			cfg.toStdout = true
		case "-h", "--help":
			usage()
			os.Exit(0)
		case "--":
			posArgs = true
		default:
			return nil, fmt.Errorf("неизвестный флаг %q", a)
		}
	}
	return cfg, nil
}

func usage() {
	fmt.Fprint(os.Stderr, `roztts — синтезатор украинской речи из «Розмовлялки»

Использование:
  roztts [флаги] [текст...]
  roztts [флаги] -f файл.txt
  echo "текст" | roztts [флаги]

Флаги:
  -o, --out FILE      выходной файл (.wav или .mp3; по умолчанию out.wav)
  -voice, --voice N   голос: 1, 2, 3 (по умолчанию 1)
  -rate, --rate N     скорость 1..10 (голос 1 — только 5)
  -f, --file FILE     читать текст из файла
  -stdout             писать WAV в stdout
  -h, --help          справка

Фрагменты текста, переданные отдельными аргументами, объединяются через
пробел: roztts Привіт, світ! == roztts "Привіт, світ!"
`)
}

func main() {
	cfg, err := parseArgs(os.Args[1:])
	if err != nil {
		fail("%v", err)
	}

	text, err := readText(cfg)
	if err != nil {
		fail("%v", err)
	}
	if strings.TrimSpace(text) == "" {
		fail("нет текста для озвучивания (используйте аргументы, -f файл или stdin)")
	}

	opts := rozmovlyalka.Options{Voice: cfg.voice, Rate: cfg.rate}
	if cfg.voice == '1' && cfg.rate != 5 {
		fail("голос 1 поддерживает только rate 5")
	}

	// Диагностика ввода: помогает заметить, если оболочка «съела» часть текста.
	shown := text
	if len(shown) > 60 {
		shown = shown[:60] + "…"
	}
	fmt.Fprintf(os.Stderr, "roztts: голос %c, rate %d, текст (%d байт UTF-8): %q\n",
		cfg.voice, cfg.rate, len(text), shown)
	if len(cfg.textParts) > 1 {
		fmt.Fprintf(os.Stderr, "roztts: предупреждение: текст состоял из %d отдельных аргументов — "+
			"если фраза обрезалась, возьмите её в кавычки\n", len(cfg.textParts))
	}

	var data []byte
	if strings.HasSuffix(strings.ToLower(cfg.out), ".mp3") {
		data, err = rozmovlyalka.SynthesizeMP3(text, opts)
	} else {
		data, err = rozmovlyalka.SynthesizeWAV(text, opts)
	}
	if err != nil {
		fail("%v", err)
	}

	var w io.Writer
	if cfg.toStdout {
		w = os.Stdout
	} else {
		f, err := os.Create(cfg.out)
		if err != nil {
			fail("%v", err)
		}
		defer f.Close()
		w = f
	}
	if _, err := w.Write(data); err != nil {
		fail("%v", err)
	}
	fmt.Fprintf(os.Stderr, "roztts: %d байт (%.2f c аудио) → %s\n",
		len(data), float64(len(data)-44)/11025, cfg.out)
}

func readText(cfg *config) (string, error) {
	switch {
	case cfg.inputFile != "":
		b, err := os.ReadFile(cfg.inputFile)
		return string(b), err
	case len(cfg.textParts) > 0:
		return strings.Join(cfg.textParts, " "), nil
	default:
		b, err := io.ReadAll(os.Stdin)
		return string(b), err
	}
}

func fail(format string, a ...any) {
	fmt.Fprintf(os.Stderr, "roztts: "+format+"\n", a...)
	os.Exit(1)
}
