# Dokumentacja bazy danych

## 1. Cel

Ten dokument opisuje model danych systemu `Pharmacy Management`: tabele, relacje, klucze oraz ograniczenia wynikajace z aktualnego schematu SQL (`database/schema.sql`).

## 2. Silnik i lokalizacja

- Silnik: `SQLite`
- Plik bazy: `database/pharmacy.db`
- Schemat: `database/schema.sql`

## 3. Diagram ERD

Masz gotowy plik do dbdiagram: `docs/database-erd.dbml`.

### Jak wygenerowac diagram (2 minuty)

1. Wejdz na [dbdiagram.io](https://dbdiagram.io/).
2. Utworz nowy diagram.
3. Wklej zawartosc pliku `docs/database-erd.dbml`.
4. Zapisz i (opcjonalnie) wyeksportuj PNG/SVG do `docs/database-erd.png`.

Nie musisz rysowac recznie - relacje sa juz zdefiniowane w DBML.

## 4. Opis tabel

### 4.1 `users`

Przechowuje konta uzytkownikow systemu.

- PK: `id`
- Unikalne: `username`
- Kluczowe pola:
  - `password` (hash hasla),
  - `role` (`admin`, `pharmacist`, `cashier`),
  - `mfa_enabled`, `mfa_secret`.

### 4.2 `user_preferences`

Preferencje interfejsu per uzytkownik.

- PK/FK: `user_id` -> `users.id`
- Kluczowe pola: `theme`, `locale`, `updated_at`

### 4.3 `suppliers`

Dane dostawcow.

- PK: `id`
- Powiazania: 1:N z `medicines`, 1:N z `deliveries`
- Kluczowe pola: `name`, `contact`, `email`, `phone`

### 4.4 `medicines`

Kartoteka lekow.

- PK: `id`
- FK: `supplier_id` -> `suppliers.id`
- Kluczowe pola: `name`, `price`, `stock`, `expiry_date`
- Powiazania:
  - N:1 z `suppliers`
  - 1:N do `prescriptions`, `sales`, `deliveries`

### 4.5 `patients`

Kartoteka pacjentow.

- PK: `id`
- Unikalne: `pesel`
- Powiazania: 1:N z `prescriptions`

### 4.6 `prescriptions`

Rejestr recept.

- PK: `id`
- FK:
  - `patient_id` -> `patients.id`
  - `medicine_id` -> `medicines.id`
- Kluczowe pola: `quantity`, `doctor_name`, `status`, `expiry_date`
- Powiazania: 1:N z `sales` (sprzedaz moze byc podpieta pod recepte)

### 4.7 `sales`

Transakcje sprzedazy.

- PK: `id`
- FK:
  - `prescription_id` -> `prescriptions.id` (opcjonalnie)
  - `medicine_id` -> `medicines.id`
  - `user_id` -> `users.id`
- Kluczowe pola: `quantity`, `unit_price`, `total_price`, `sale_date`

### 4.8 `deliveries`

Przyjecia magazynowe.

- PK: `id`
- FK:
  - `supplier_id` -> `suppliers.id`
  - `medicine_id` -> `medicines.id`
- Kluczowe pola: `quantity`, `cost`, `delivery_date`

### 4.9 `audit_log`

Log operacji biznesowych.

- PK: `id`
- FK: `user_id` -> `users.id` (opcjonalnie)
- Kluczowe pola: `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `timestamp`

## 5. Relacje (skrot)

- `users` 1:1 `user_preferences`
- `users` 1:N `sales`
- `users` 1:N `audit_log`
- `suppliers` 1:N `medicines`
- `suppliers` 1:N `deliveries`
- `patients` 1:N `prescriptions`
- `medicines` 1:N `prescriptions`
- `medicines` 1:N `sales`
- `medicines` 1:N `deliveries`
- `prescriptions` 1:N `sales`

## 6. Ograniczenia i integralnosc

- Klucze glowne: wszystkie tabele posiadaja PK typu `INTEGER AUTOINCREMENT` (poza `user_preferences` z PK = FK).
- Klucze obce: zdefiniowane w schemacie SQL zgodnie z relacjami powyzej.
- Unikalnosc:
  - `users.username`
  - `patients.pesel`
- Ograniczenia dziedzin:
  - `users.role` - tylko `admin/pharmacist/cashier`
  - `user_preferences.theme` - `light/dark`
  - `user_preferences.locale` - `pl/en/fr`
  - `prescriptions.status` - `pending/completed/cancelled`

## 7. Indeksy

W schemacie sa zdefiniowane indeksy wspierajace zapytania operacyjne:

- `idx_medicines_supplier`, `idx_medicines_category`, `idx_medicines_expiry`
- `idx_prescriptions_patient`, `idx_prescriptions_status`
- `idx_sales_date`
- `idx_patients_pesel`
- `idx_audit_user`, `idx_audit_timestamp`

Schemat bazy danych jest dostępny w pliku 'schemat.png' oraz pod tym linkiem: https://kroki.io/dbml/svg/eNq1VsFu2zAMvecrhJyLYOceAgxDDzt0GLLsVBSuZtGJEFlSJbptsO3fR9mxLCUx6jbdzZRIie-RfPKa_1LAGg_Os98zxqRgUiNswLE7u7sio3RQg8Z72gxumtfAEF6Q3WmDTDdKXbFGy8cGgovl3j8bJ45cwpYz6jSSvuCazbmopWZ_mN1yV_NSeiSj5H4rwc1DMNRcqjaajLrihQdKDNMV0AFLkr-AijcKr9mncAK5cwRRcGSCPlASjsHl4cvP1erm27pYf729-bH-fPv94X72dzZbR34K66ACB7qEjqp2Mecr3INbiAzF4-dKbrY4j3hbkyAK7nYtPmVKrk7DrBpirKIACCxVHSeNFe9G5BtrlZxU9TMVb_k0GnkZK5AVyG6Nht64hPgahCylhvenKcCXTlqURseEKIuNcfve7rlIihkwOFkCo9xVfqBHU-7GmgxerHT7IuBswV4I33KUBG8C-ko6j8UIB4qP71nwoA7rwxj_n2rSBMViTMB0QJ_NWJp63xyjDo8N1yhxf35XmBKNG3hpaz4kmBXxTF09cmz86cSCFlJvkrHtFoKemdoqIPJabSMdUSRX80u1yZNuTCEzhZY1-oU0UtNgMTYsaJCr0d0TBc3mjHANhL-JEgFKPoGTU3g5M_wf22VdLkeaYOiBC3xcWHveCCJfmc20tzuvO4l3L4p5ytDCKXBv42AclrJ4o0TxxFUTnTQ85wsBC41Jbd-CbAXV9cmDu-jTX3b_KgspOsf4QCzSQi6H9y16ZuKzSLRlGWV2xDftgGVyY-_dTuDieMCWR6fk3tPOHEM9NPirsBPX1-6M3XTu3n-qcIcf
