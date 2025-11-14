# Pobieranie podręczników NEON Nowa Era do PDF

## To repo jest do użytku tylko dla mojego syna, który chyba spełnia definicję osoby bliskiej, zgodnie z disclaimerem na pierwszej stronie każdego podręcznika Nowej Ery. Zresztą, żeby to pobrać, i tak trzeba mieć login i hasło do zalogowania się na ich stronę - poproś nauczyciela.

1.    Pobierz Firefox
2.    Zainstaluj wtyczkę Greasemonkey
3.    Zainstaluj greasemonkey.js jako skrypt. Ogranicz go do strony https://neon.nowaera.pl. Nie uruchamiaj go jeszcze, na razie niech będzie disabled.
4.    Zainstaluj sobie instancję WSL, albo pożycz linuksa od koleżanki. Potrzebne będą polecenia 
        - rsvg-convert(pakiet librsvg2-bin)
        - ghostscript
5.    Zaloguj się do wydawnictwa, otwórz książkę która cię interesuje.
6.    Kliknij prawym na niebieskim nagłówku przeglądania książek. To jest element <header class="neon-visualizer__header">. Następny zaraz pod nim będzie element <body class="neon-visualizer__body">rame><!----></body>, którego treścią jest <iframe>. I to "src" z tego iframe nam chodzi. Przykładowy src wygląda tak: https://neon.nowaera.pl/viewers/lm50/online/index.html?neon=pro&page=160&url=https://neon.nowaera.pl/product/6475202/ONLINE/assets/book/
7.    Skopiuj z tego src numer projektu. To jest ten numer pomiędzy product a ONLINE.
8.    Sprawdź sobie ile jest stron w książce. Po prostu przewiń do ostatniej.
9.    Włącz skrypt greasemonkey i odśwież stronę. Wejdź w książkę (tą którą chcesz pobrać) jeszcze raz.
10.   W oknie dialogowym wklej numer projektu (te cyfry) i strony od-do do pobrania. Typ pliku SVG i pobierz.
11.   Trwa to w pizdu. Możesz obserwować postęp w narzędziach developerskich przeglądarki (F12) w konsoli
12.   Jak się skończy, czas scalić wszystkie strony zapisane osobno w katalogu "Pobrane". Skopiuj je do instancji WSL do jakiegoś katalogu.
13.   Do tego samego katalogu wrzuć conv.sh i uruchom go. Przekształci wszystkie pliki SVG w PDF, i scali je w jeden.
14.   Zapisz sobie gdzieś ten jeden, resztę powywalaj.