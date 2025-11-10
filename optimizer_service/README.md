# Dokumentacja Optimizer Service (nieformalna, niekompletna)

### Wprowadzenie:

Ten dokument opisuje system optymalizacji planu zajęć. System używa algorytmu ewolucyjnego do przypisywania grup zajęć studentom, a nauczycielom sal i timeslotow, biorąc pod uwagę ograniczenia i preferencje. Dane są przetwarzane przez klasę `Evaluator`, która oblicza fitness (ocenę jakości) rozwiązania.

### Spis treści:
1) pliki wejściowe (input.json) i wyjściowe (output.json)
2) message format kolejek RabbitMQ

## 1) Pliki wejściowe i wyjściowe (FileEvent)

### Struktura Input (input.json)

plik wejściowy definiuje problem: ograniczenia (constraints) i preferencje (preferences)- wszystko w formacie json (później również takie rzeczy jak czas wykonania czy algorytm pewnie też bo to będzie request)

#### Constraints (Ograniczenia)
definiują twarde reguły problemu, które muszą być spełnione (albo problem unsolvable)

- `timeslots_per_day`: Lista liczb, np. `[7, 7, 7, 7, 7, 0, 0]`. Określa liczbę slotów czasowych na każdy dzień tygodnia (7 dni dlatego rozmiar tablicy to 7). Slot to np. godzina lekcyjna. Dni bez zajęć mają 0. Kolejne godziny tego samego dnia są oznaczane jako brak okienka

- `groups_per_subject`: Lista, np. `[3, 5, 2, 4]`. Dla każdego przedmiotu (subject) mówi, ile grup można utworzyć. Przedmioty są indeksowane od 0. 

- `groups_capacity`: Lista, np. `[30, 30, 30, 50, ...]`. Maksymalna liczba studentów w każdej grupie (hard limit).

- `students_subjects`: Lista list, np. `[[0, 1, 2], [1, 0, 2, 3], [0, 2, 3]]`. Dla każdego studenta (indeksowane od 0) lista przedmiotów, które studiuje. Przykładowo student o id 1 studiuje przedmioty o id 1, 0, 2, 3

- `teachers_groups`: Lista list, np. `[[0, 1], [2, 3, 4], [5, 6]]`. Dla każdego nauczyciela (indeks od 0) lista grup, które musi prowadzić (zakładamy że jest to narzucone z góry przez instytucję że ma prowadzić konkretne grupy, my tylko optymalizujemy kiedy z kim i gdzie).

- `rooms_unavailability_timeslots`: Lista list, np. `[[12, 13], [], [5, 6, 7]]`. Dla każdej sali (room, indeks od 0) lista slotów czasowych, kiedy sala jest niedostępna (np. wynajem lub inne tego typu sytuacje)

#### Preferences (Preferencje)
definiują miękkie preferencje, które wpływają na końcowy fitness. Każda preferencja ma wagę (weight), która mówi, jak istotna jest względnie dla danej osoby

- `students`: Lista dla każdego studenta.
  - `free_days`: Lista wag, np. `[5, 0, 2, 0, 0, 0, 0]`. Dla każdego dnia waga preferencji, by mieć wolny dzień (bez zajęć).
  - busy_days: Lista wag, np. `[0, 4, 0, 0, 0, 0, 0]`. Dla każdego dnia waga preferencji, by mieć zajęcia (być zajętym).
  - gaps: Obiekt z `value` (true/false – czy chce przerwy między dniami zajęć) i `weight` (waga). (tutaj pewnie poprawię na dniach na strukturę samej wagi, bez tego boola bo jak ktoś nie chce mieć okienek to dodatnia waga, a jak komuś nie przeszkadzają to waga 0, ale chyba nie ma ludzi co się lubują w okienkach? idk może ktoś lubi zjeść w przerwie)
  - preferred_groups: Mapa, np. `{"0": 4, "2": 2}`. Klucz to indeks grupy, wartość to waga preferencji żeby należeć do tej grupy (tym sposobem omijamy trochę problem komisji kukli typu "nie chce mieć zajęć z Janem Kowalskim" bo to może się nie sprzedać zamiast tego studenci mają preferencję co do grup (a dziwnym przypadkiem każdy prowadzący ma twardo z góry przydzielone grupy)
  - avoid_groups: Mapa, np. `{"3": 2, "5": 3}`. Klucz to indeks grupy, wartość to waga unikania tej grupy.
  - preferred_timeslots: Mapa, np. `{"5": 3, "6": 1}`. Klucz to indeks slotu, wartość to waga preferencji tego slotu.
  - avoid_timeslots: Mapa, np. `{"7": 2, "4": 1}`. Klucz to indeks slotu, wartość to waga unikania tego slotu.

- `teachers`: Podobne do students, ale bez preferred/avoid_groups (nauczyciele mają grupy przypisane w constraints).

- `management`: Preferencje ogólne jakiegoś tam zarządu (dyrektor/dziekan/zarząd)
  - `preferred_room_timeslots`: Lista obiektów, np. `[{"room": 0, "timeslot": 1, "weight": 2}]`. Preferencje, by dana sala była używana w danym slocie.
  - `avoid_room_timeslots`: Lista obiektów, np. `[{"room": 2, "timeslot": 4, "weight": 3}]`. Unikanie użycia danej sali w danym slocie.
  - `group_max_overflow`: Obiekt z `value` (maksymalny nadmiar studentów w grupie, np. 5) i `weight` (waga).
  - ((not implemented)Jeśli możliwe program priorytetyzuje puste grupy (niezapełnione studentami) bo wtedy można ich nie uruchamiać wcale)

### Struktura Output (output.json)

plik wyjściowy to wynik optymalizacji: najlepsze znalezione rozwiązanie

- `genotype`: Lista liczb, np. `[2,1,0,0,2,0,3,0,1,2,16,2,14,2,...]`. To genotyp osobnika w algorytmie ewolucyjnym. Reprezentuje przypisania:
  - Pierwsza część: dla każdego studenta i jego przedmiotów – indeks względny grupy (relatywny do przedmiotu).
  - Druga część: dla każdej grupy – indeks slotu czasowego i indeks sali.
  - Dekodowany w `Evaluator::evaluate()`: zamienia na absolutne indeksy grup, slotów i sal.
- `fitness`: Liczba zmiennoprzecinkowa, np. `0.750441`. Ogólna ocena rozwiązania (średnia z ocen studentów, nauczycieli i zarządzania). Wyższa = lepsze.
- `by_student`: Lista list, np. `[[2,1,0], [0,2,0,3], [0,1,2]]`. Dla każdego studenta lista przypisanych grup (absolutne indeksy) - czytelny format genotypu do odczytu jako pierwsza część gotowych informacji o planie.
- `by_group`: Lista list, np. `[[16,2], [14,2], [8,0], ...]`. Dla każdej grupy: [slot czasowy, sala]. (Druga część)
- `student_fitnesses`: Lista, np. `[1.0,1.0,1.0]`. fitness każdego studenta (dla wglądu, kto jak został pokrzywdzony, raczej debug only).
- `teacher_fitnesses`: Lista, np. `[0.642857, 0.777777, 1.0]`. fitness dla każdego nauczyciela.
- `management_fitness`: Liczba, np. `0.444444`. fitness dla preferencji zarządu.

### Jak Liczone Jest Wyjście
- Dekodowanie genotypu: W `Evaluator::evaluate()` genotyp jest dzielony na dwie części: student-grupy (relatywne indeksy zamieniane na absolutne) i grupa-slot/sala.
- Ocena fitness: Dla każdej grupy (student, teacher, management) liczy się, ile preferencji jest spełnionych (z wagami). Wynik to suma wag spełnionych / suma wag (dla pojedynczego studenta/teachera). Całkowity fitness to średnia ważona z tych trzech (120 studentów + 10 prowadzących + 1 management). (na razie dla uproszczenia dzielę przez 3)
- `Repair`: Jeśli rozwiązanie łamie ograniczenia (np. zbyt wielu studentów w grupie), `Evaluator::repair()` naprawia to deterministycznie przesuwając studentów do innych grup.
- Przykładowo fitness 0.75 oznacza, że 75% preferencji jest spełnionych.






## 2) RabbitMQ integration for C++ Optimizer (RabbitMQEvent) - Specyfikacja 

### Kolejki

#### Input Queue - optimizer otrzymuje:
- Queue: `optimizer_jobs`
- Message Format:
```json
{
  "job_id": "uuid-string",
  "problem_data": {
    "constraints": {...},
    "preferences": {...}
  },
  "max_execution_time": 300
}
```

#### Progress Queue - optimizer wysyła:
- Queue: `optimizer_progress` 
- Message Format:
```json
{
  "job_id": "uuid-string",
  "iteration": 150,
  "best_solution": {
    "genotype": [2,1,0,0,2,0,3,0,1,2,16,2,14,2,8,0,8,1,13,2,2,1,1,0,5,0,12,1,19,0,32,2,30,2,17,1,3,1],
    "fitness": 0.750441,
    "by_student": [[2,1,0],[0,2,0,3],[0,1,2]],
    "by_group": [[16,2],[14,2],[8,0],[8,1],[13,2],[2,1],[1,0],[5,0],[12,1],[19,0],[32,2],[30,2],[17,1],[3,1]],
    "student_fitnesses": [1.0,1.0,1.0],
    "teacher_fitnesses": [0.6428571428571429,0.7777777777777778,1.0],
    "management_fitness": 0.444444
  }
}
```

#### Control Queue - optimizer otrzymuje:
- Queue: `optimizer_control`
- Message Format:
```json
{
  "action": "cancel",
  "job_id": "uuid-string"
}
```

### W skrócie:

RabbitMQEventReceiver - odbiera z optimizer_jobs i optimizer_control
RabbitMQEventSender - wysyła do optimizer_progress