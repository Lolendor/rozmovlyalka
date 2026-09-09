# Rozmovlyalka

[![Демо в браузері](https://img.shields.io/badge/перейти%20до%20демо-браузерна%20TTS-blue)](https://lolendor.github.io/rozmovlyalka/)

Веб-демо (JS-порт у цьому репо, гілка `js-web`) відкривається з дефолтами
темп ×5 і гучність 100% — грає без підсилення поверх оригінальної амплітуди.

A reverse-engineered, byte-faithful reimplementation in Go of the Ukrainian
speech synthesizer **«Розмовлялька»** (Rozm.exe, Windows, ~2001). The original
algorithm was recovered from the disassembly: letter and dictionary rules,
stress placement, letter-to-phoneme (G2P) conversion and diphone
concatenation — including the quirks (and occasional bugs) of the original
program.

Input: arbitrary text. Output: speech with one of the three original voices,
as WAV (11025 Hz, mono, 8-bit) or MP3 (via ffmpeg).

## Synthesis pipeline

```
text → phrase chunking → abbreviations → numbers in words
     → English words transliteration → normalization → stress placement
     → grapheme-to-phoneme codes → diphone concatenation → PCM → WAV/MP3
```

- stress dictionaries: СловКор (12,615 entries) and BSNbn (30,575 entries);
- position-dependent stress (`вЕрби` by default, `вербИ` after «коло»);
- explicit stress marker: `словО'чек` or `до\брого`;
- phonemic rules: palatalization, iotation, pauses, «щ» → «шч», etc.;
- synthesis: a 42×42 diphone table (1764 entries per voice), 17-sample
  crossfade with banker's rounding (matching Delphi `Round`).

A detailed write-up of the reverse engineering effort lives in
[docs/ALGORITHM.md](docs/ALGORITHM.md).

## Install

Requires Go 1.21+. Voice and dictionary data are embedded into the binary.

```sh
go install github.com/Lolendor/rozmovlyalka/cmd/roztts@latest
```

Or from source:

```sh
git clone https://github.com/Lolendor/rozmovlyalka
cd rozmovlyalka
go run ./cmd/roztts -o hello.wav "Привіт, світ!"
```

## CLI

```sh
# WAV
roztts -voice 1 -o hello.wav "Привіт, світ!"

# MP3 (requires ffmpeg with libmp3lame)
roztts -voice 3 -o speech.mp3 -f text.txt

# stdin → stdout
echo "Доброго ранку!" | roztts --stdout > morning.wav
```

Options:

- `-voice, --voice 1|2|3` — voice (default 1);
- `-rate, --rate 1..10` — speed (default 5);
- `-o, --out file` — output file, format selected by extension `.wav`/`.mp3`;
- `-f, --file file` — read text from a file;
- `-stdout` — write WAV to stdout.

Flags may appear before or after the text. Before synthesizing, the CLI
prints the text it actually received — if the shell truncated part of the
phrase (e.g. an unquoted `!`), it is immediately visible.

## Library

```go
package main

import (
	"os"

	"github.com/Lolendor/rozmovlyalka"
)

func main() {
	wav, err := rozmovlyalka.SynthesizeWAV("Привіт, світ!",
		rozmovlyalka.Options{Voice: '2', Rate: 5})
	if err != nil {
		panic(err)
	}
	os.WriteFile("hello.wav", wav, 0o644)
}
```

Available: `Synthesize` (raw PCM), `SynthesizeWAV`, `SynthesizeMP3`
(requires `ffmpeg` in PATH). Input is UTF-8; internally the library works in
cp1251, the original encoding of the program.

## Port status

- all three voices, all rates 1..10;
- voice 1 `rate ≠ 5` uses the unit tempo decomposition reimplemented from
  0x46705f..0x4673be (byte-exact against the original binary for every
  diphone × every rate; see `docs/ALGORITHM.md`);
- voice 2 reproduces its signature pause placement before ч/ц.

## Tests

```sh
go test ./...
```

Dictionaries, known stress placements, position-dependent forms, explicit
stress markers, reference phoneme chains and the PCM/WAV output of all three
voices are covered.

## Layout

```
abbrev.go     abbreviations (FUN_00465888)
numbers.go    numbers in words (FUN_004659dc)
english.go    English word transliteration (FUN_00465e9c)
normalize.go  text normalization (FUN_0046621c)
stress.go     stress: tokenizer, marker, dictionaries (FUN_00465210)
g2p.go        letters → phoneme codes (FUN_0046662c)
synth.go      diphone concatenation, voice loading (FUN_00466e7c/004676c4)
wav.go/mp3.go WAV and MP3 output
cmd/roztts    command-line utility
docs/ALGORITHM.md  data formats and algorithm walkthrough
data/         dictionaries and voices extracted from the installer (gzip)
samples/      synthesis samples for each voice
```

## Licensing note

The voice and dictionary files under `data/` were extracted from the
«Розмовлялька» distribution and belong to the authors of the original program.
This project is educational and archival in nature: it reconstructs the
behavior of an old synthesizer to give it a second life on modern systems.
