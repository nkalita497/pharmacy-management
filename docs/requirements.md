# Wymagania systemu Pharmacy Management

## 1. Cel dokumentu

Dokument opisuje wymagania funkcjonalne i niefunkcjonalne dla systemu zarzadzania apteka "Pharmacy Management". Celem systemu jest obsluga codziennej pracy apteki: logowanie personelu, zarzadzanie danymi magazynowymi i pacjentami, obsluga sprzedazy, rejestracja dostaw oraz monitoring zdarzen.

## 2. Zakres systemu

System obejmuje:
- backend API (Node.js/Express + SQLite),
- frontend webowy (Angular),
- autoryzacje sesyjna z opcjonalnym MFA i captcha,
- dokumentacje API przez Swagger/OpenAPI.

## 3. Role uzytkownikow

- **Administrator (`admin`)**
  - pelny dostep do wszystkich funkcji,
  - zarzadzanie zasobami i operacjami administracyjnymi.
- **Farmaceuta (`pharmacist`)**
  - obsluga lekow, pacjentow, sprzedazy i dostaw,
  - dostep do raportow PDF i wybranych danych audytowych.
- **Kasjer (`cashier`)**
  - podstawowa obsluga procesow sprzedazy i podglad danych wymaganych do pracy na stanowisku.

## 4. Wymagania funkcjonalne

### RF-01. Uwierzytelnianie uzytkownika
System musi umozliwiac logowanie uzytkownika za pomoca loginu i hasla.

**Kryteria akceptacji:**
- Po podaniu poprawnych danych logowania system tworzy sesje.
- Po podaniu blednych danych system zwraca komunikat bledu.

### RF-02. Weryfikacja captcha przy logowaniu
System musi obslugiwac captcha dla procesu logowania (z mozliwoscia wlaczenia/wylaczenia konfiguracja).

**Kryteria akceptacji:**
- API udostepnia endpoint pobrania captcha (`/api/auth/captcha`).
- Przy aktywnej captcha logowanie bez poprawnej captcha jest odrzucane.

### RF-03. Uwierzytelnianie dwuskladnikowe (MFA)
System musi obslugiwac MFA (TOTP) dla kont uzytkownikow, ktorzy je wlaczyli.

**Kryteria akceptacji:**
- Po poprawnym hasle dla konta z MFA system wymaga kodu TOTP.
- System udostepnia endpointy setup/enable/verify/disable MFA.

### RF-04. Zarzadzanie sesja
System musi umozliwiac odczyt aktywnej sesji i wylogowanie.

**Kryteria akceptacji:**
- Endpoint sesji (`GET /api/auth`) zwraca dane zalogowanego uzytkownika lub `null`.
- Wylogowanie (`DELETE /api/auth`) niszczy sesje.

### RF-05. Autoryzacja oparta o role
System musi ograniczac dostep do wybranych endpointow wg roli uzytkownika.

**Kryteria akceptacji:**
- Uzytkownik bez sesji otrzymuje `401`.
- Uzytkownik bez odpowiedniej roli otrzymuje `403`.

### RF-06. CRUD lekow
System musi umozliwiac tworzenie, odczyt, aktualizacje i usuwanie lekow.

**Kryteria akceptacji:**
- Dostepna jest lista lekow z paginacja i wyszukiwaniem.
- Dostepne sa endpointy `GET/POST/PUT/DELETE` dla `/api/medicines`.

### RF-07. Import lekow z CSV
System musi umozliwiac import lekow z pliku CSV.

**Kryteria akceptacji:**
- Endpoint importu przyjmuje plik `multipart/form-data`.
- Poprawny import zwraca liczbe dodanych rekordow lub komunikat sukcesu.

### RF-08. CRUD dostawcow
System musi umozliwiac pelna obsluge dostawcow.

**Kryteria akceptacji:**
- Dostepne sa endpointy `GET/POST/PUT/DELETE` dla `/api/suppliers`.
- Lista dostawcow wspiera paginacje i wyszukiwanie.

### RF-09. CRUD pacjentow
System musi umozliwiac pelna obsluge pacjentow.

**Kryteria akceptacji:**
- Dostepne sa endpointy `GET/POST/PUT/DELETE` dla `/api/patients`.
- Lista pacjentow wspiera paginacje i wyszukiwanie.

### RF-10. Obsluga sprzedazy
System musi umozliwiac obsluge transakcji sprzedazy i ich modyfikacje zgodnie z uprawnieniami.

**Kryteria akceptacji:**
- Dostepne sa endpointy `GET/POST/PUT/DELETE` dla `/api/sales`.
- System wylicza wartosc laczna transakcji (`total_price`).

### RF-11. Raport sprzedazy PDF
System musi generowac raport PDF dla sprzedazy.

**Kryteria akceptacji:**
- Endpoint `/api/sales/report/pdf` zwraca plik PDF.
- Raport zawiera zestawienie transakcji i podsumowanie.

### RF-12. Obsluga recept
System musi umozliwiac obsluge rekordow recept.

**Kryteria akceptacji:**
- Dostepne sa endpointy `GET/POST/PUT/DELETE` dla `/api/prescriptions`.
- Dostepny jest endpoint raportu PDF dla recept.

### RF-13. Obsluga dostaw
System musi umozliwiac rejestracje i modyfikacje dostaw.

**Kryteria akceptacji:**
- Dostepne sa endpointy `GET/POST/PUT/DELETE` dla `/api/deliveries`.
- Dane dostaw zawieraja powiazania z lekiem i dostawca.

### RF-14. Dashboard alertow
System musi prezentowac alerty o niskich stanach i terminach waznosci.

**Kryteria akceptacji:**
- Endpoint `/api/dashboard/alerts` zwraca co najmniej:
  - liste niskich stanow magazynowych,
  - liste lekow z krotkim terminem waznosci.

### RF-15. Log audytowy
System musi rejestrowac wybrane operacje biznesowe i udostepniac ich podglad.

**Kryteria akceptacji:**
- Endpoint `/api/audit` zwraca liste wpisow audytowych.
- Wpisy zawieraja co najmniej informacje o akcji, encji i czasie.

### RF-16. Wyszukiwanie pelnotekstowe
System musi umozliwiac wyszukiwanie danych przez endpoint FTS.

**Kryteria akceptacji:**
- Endpoint `/api/search?q=...` zwraca wyniki i liczbe trafien.
- Brak parametru `q` zwraca blad walidacji.

### RF-17. Preferencje uzytkownika
System musi przechowywac i zwracac preferencje interfejsu (motyw i jezyk).

**Kryteria akceptacji:**
- Endpointy `GET/PUT /api/preferences` zwracaja i aktualizuja ustawienia.
- Wspierane sa co najmniej wartosci: `theme` (`light`, `dark`) i `locale` (`pl`, `en`, `fr`).

### RF-18. Dokumentacja API
System musi udostepniac interaktywna dokumentacje backendu.

**Kryteria akceptacji:**
- Swagger UI jest dostepny pod `/api-docs`.
- Definicja OpenAPI znajduje sie w repozytorium (`backend/src/docs/openapi.yaml`).

## 5. Wymagania niefunkcjonalne

### RNF-01. Bezpieczenstwo
- Hasla uzytkownikow musza byc przechowywane jako hash (bcrypt).
- Sesja musi byc oparta o `httpOnly` cookie.
- Endpointy chronione musza wymagac autoryzacji.

### RNF-02. Niezawodnosc
- Aplikacja musi obslugiwac bledy backendowe i zwracac kontrolowane odpowiedzi JSON.
- Awaria modulu dokumentacji (Swagger) nie moze unieruchamiac API biznesowego.

### RNF-03. Wydajnosc
- Lista danych (leki, pacjenci, dostawcy) musi wspierac paginacje.
- Operacje wyszukiwania musza dzialac z limitem wynikow.

### RNF-04. Utrzymywalnosc
- Kod backendu musi byc podzielony na moduly routow i middleware.
- Definicja API musi byc utrzymywana w jednym zrodle OpenAPI.

### RNF-05. Testowalnosc
- Projekt backendu musi przechodzic testy automatyczne i kompilacje TypeScript.

## 6. Ograniczenia i zalozenia

- System pracuje na bazie SQLite.
- Wersja developerska zaklada uruchomienie lokalne (`localhost`).
- Dostep do niektorych operacji zalezy od roli i aktualnej sesji.

## 7. Slownik pojec

- **CRUD** - Create, Read, Update, Delete.
- **MFA** - Multi-Factor Authentication (drugi skladnik logowania).
- **TOTP** - Time-based One-Time Password.
- **FTS** - Full Text Search.
- **RBAC** - Role-Based Access Control.
- **OpenAPI/Swagger** - standard i interfejs dokumentacji API REST.



