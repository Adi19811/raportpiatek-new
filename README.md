# Raport Rekrutacyjny

Dashboard raportu rekrutacyjnego z integracją Gemini AI (tłumaczenie i odczyt danych ze zrzutów ekranu Excela).

## Struktura

- `index.html` - cała aplikacja (frontend, statyczny plik)
- `api/gemini-generate.js` - serverless function na Vercelu, proxy do Gemini API; klucz API jest trzymany po stronie serwera (`GEMINI_API_KEY`) i nigdy nie trafia do przeglądarki
- `api/send-email.js` - endpoint wysyłki e-mail z raportem; **na razie tylko zaślepka** zwracająca błąd 501 - trzeba dopisać integrację z wybranym dostawcą (np. Resend, SMTP)

## Wdrożenie na Vercel

1. Zainstaluj Vercel CLI (jeśli jeszcze nie masz): `npm i -g vercel`
2. W tym folderze uruchom `vercel` (pierwsze podłączenie projektu) albo `vercel --prod` dla wdrożenia produkcyjnego.
3. Dodaj zmienną środowiskową z kluczem Gemini:
   - Dashboard: Project Settings → Environment Variables → `GEMINI_API_KEY`
   - albo z terminala: `vercel env add GEMINI_API_KEY production`
4. Po dodaniu/zmianie zmiennej środowiskowej zrób ponowny deploy (`vercel --prod`), żeby funkcje ją odczytały.

## WAŻNE - rotacja klucza API

W poprzedniej wersji aplikacji klucz Gemini był wpisany na sztywno w kodzie frontendu (widoczny dla każdego w źródle strony). Ten klucz należy uznać za skompromitowany:

1. Wejdź na https://aistudio.google.com/app/apikey
2. Usuń/dezaktywuj stary klucz (`AIzaSy...KqE`)
3. Wygeneruj nowy klucz i ustaw go **tylko** jako zmienną środowiskową `GEMINI_API_KEY` na Vercelu (nigdy w pliku HTML/JS ani w repo).

## Rozwój lokalny

```
npm install
vercel dev
```

`vercel dev` uruchomi zarówno statyczny frontend, jak i funkcje z folderu `api/` lokalnie, czytając zmienne z pliku `.env` (skopiuj `.env.example` → `.env` i uzupełnij kluczem).
