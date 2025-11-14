# 📖 Pobieranie podręczników NEON Nowa Era do PDF

> **⚠️ Disclaimer:** To repo jest do użytku tylko dla mojego syna, który chyba spełnia definicję osoby bliskiej, zgodnie z disclaimerem na pierwszej stronie każdego podręcznika Nowej Ery. Zresztą, żeby to pobrać, i tak trzeba mieć login i hasło do zalogowania się na ich stronę - poproś nauczyciela.

Serdecznie dziękujemy Claude Sonnet 4 za przygotowanie 100% wszystkiego, łącznie z tym readme.

## 🚀 Instrukcja krok po kroku

### 1. Przygotowanie środowiska

1. **Pobierz Firefox**
2. **Zainstaluj wtyczkę Greasemonkey**
3. **Zainstaluj skrypt** `greasemonkey.js` jako skrypt Greasemonkey
   - Ogranicz go do domeny `https://neon.nowaera.pl`
   - Na razie niech będzie **disabled**

### 2. Konfiguracja systemu

4. **Zainstaluj WSL** lub pożycz linuksa od koleżanki 🐧
   
   Potrzebne pakiety:
   - `rsvg-convert` (pakiet `librsvg2-bin`)
   - `ghostscript`

### 3. Pozyskiwanie numeru projektu

5. **Zaloguj się** do wydawnictwa i otwórz interesującą cię książkę

6. **Znajdź element iframe** z książką:
   - Kliknij prawym przyciskiem na niebieskim nagłówku przeglądarki książek
   - Znajdź element: `<header class="neon-visualizer__header">`
   - Następny pod nim będzie: `<body class="neon-visualizer__body">...</body>`
   - Wewnątrz znajdziesz `<iframe>` - jego atrybut `src` jest tym czego szukamy
   
   **Przykładowy URL:**
   ```
   https://neon.nowaera.pl/viewers/lm50/online/index.html?neon=pro&page=160&url=https://neon.nowaera.pl/product/6475202/ONLINE/assets/book/
   ```

7. **Skopiuj numer projektu** z URL - to cyfry między `product/` a `/ONLINE`
   
   W przykładzie powyżej: `6475202`

### 4. Pobieranie

8. **Sprawdź liczbę stron** - po prostu przewiń do ostatniej strony

9. **Włącz skrypt** Greasemonkey i odśwież stronę
   - Wejdź w książkę (tą którą chcesz pobrać) jeszcze raz

10. **Pobierz strony:**
    - W oknie dialogowym wklej:
      - Numer projektu (te cyfry)
      - Zakres stron (od-do)
    - Wybierz typ pliku: **SVG**
    - Kliknij pobierz

11. **Monitoruj postęp** 📊
    - Proces trwa długo...
    - Możesz obserwować postęp w konsoli przeglądarki (`F12`)

### 5. Konwersja do PDF

12. **Przenieś pliki** do WSL:
    - Skopiuj wszystkie pobrane strony z katalogu "Pobrane" do jakiegoś katalogu w WSL

13. **Uruchom konwersję:**
    - Do tego samego katalogu wrzuć `conv.sh`
    - Uruchom skrypt - przekształci wszystkie pliki SVG w PDF i scali je w jeden

14. **Sprzątanie** 🧹
    - Zapisz sobie scalony PDF
    - Resztę plików możesz usunąć

---

## 📁 Pliki w repozytorium

- `greasemonkey.js` - skrypt do pobierania stron jako SVG
- `conv.sh` - skrypt do konwersji SVG → PDF i scalania
- `README.md` - ten plik z instrukcją

## 🔧 Wymagania techniczne

- **Firefox** z wtyczką **Greasemonkey**
- **WSL** lub dystrybucja Linuksa
- **Pakiety:**
  - `librsvg2-bin` (rsvg-convert)
  - `ghostscript`