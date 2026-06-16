# Maestro - React implementacni checklist

Zdroj: `PRD.md` a `TECHNICAL_DESIGN.md`

## Faze 1: Revidovane technicke reseni

- [x] Znovu projit PRD
- [x] Prepsat technicke reseni pro cistou React aplikaci
- [x] Prepsat checklist podle React reseni

## Faze 2: Ukladani PDF bez kopirovani

- [x] Upravit datovy model skladby z `storageKey` na `handleKey`
- [x] Pridat IndexedDB uloziste pro `FileSystemFileHandle`
- [x] Pridat helpery pro podporu File System Access API
- [x] Pridat vyber PDF pres `showOpenFilePicker`
- [x] Odstranit kopirovani PDF bytes do IndexedDB
- [x] Upravit nacitani PDF v PlayerView pres file handle
- [x] Pridat znovu propojeni PDF pro skladbu

## Faze 3: UI a srozumitelnost

- [x] Upravit texty v knihovne, aby bylo jasne, ze PDF zustava v pocitaci
- [x] Zobrazit hlasku, kdyz prohlizec nepodporuje File System Access API
- [x] Zobrazit chybu, kdyz soubor neni dostupny nebo chybi opravneni
- [x] Zachovat dotykove ovladani a okamzite listovani bez animaci

## Faze 4: Overeni

- [x] Spustit TypeScript/build kontrolu
- [x] Aktualizovat poznamky v checklistu

## Aktualni poznamky

- Cilem React verze je Edge/Chrome na Windows.
- PDF se nema kopirovat do aplikace; uklada se pouze browser file handle.
- Absolutni cesta k souboru neni ve webove aplikaci dostupna kvuli bezpecnosti prohlizece.
- Implementace je prepnuta z kopirovani PDF bytes do IndexedDB na `FileSystemFileHandle`.
- Pri upgradu IndexedDB se smaze stary store `pdfs`, aby v prohlizeci nezustavaly stare kopie PDF z prototypu.
- `npm run build` prosel.

## Zmena: razeni skladeb v playlistu

- [x] Doplnit produktovy a technicky zapis k razeni playlistu.
  - Acceptance: `PRD.md` a `TECHNICAL_DESIGN.md` popisuji zmenu poradi skladeb.
  - Verification: Dokumenty obsahuji cil, rozsah, navrh a overeni.

- [x] Implementovat stabilni zmenu poradi skladeb.
  - Acceptance: Skladby lze presouvat sipkami i pretazenim, pozice se po presunu/odebrani prepocitaji.
  - Verification: Build projde a logika pouziva souvisle pozice.

- [x] Provest finalni overeni.
  - Acceptance: Akceptacni kriteria v PRD jsou splnena.
  - Verification: Spustit `npm run build`.

## Oprava: Escape z PDF prohlizece

- [x] Doplnit produktovy a technicky zapis k oprave Escape.
  - Acceptance: `PRD.md` a `TECHNICAL_DESIGN.md` popisuji pozadovane chovani a technicky navrh.
  - Verification: Dokumenty obsahuji cil, rozsah, navrh a overeni.

- [x] Implementovat spolehlivy navrat z fullscreen PDF do menu.
  - Acceptance: Escape i nativni ukonceni fullscreen rezimu zavrou `PlayerView` a vrati aplikaci do menu.
  - Verification: Build projde a `PlayerView` posloucha `fullscreenchange`.

- [x] Provest finalni overeni.
  - Acceptance: Akceptacni kriteria v PRD jsou splnena.
  - Verification: Spustit `npm run build`.

## Oprava: povoleni k PDF pri otevreni

- [x] Doplnit produktovy a technicky zapis k povoleni PDF.
  - Acceptance: `PRD.md` a `TECHNICAL_DESIGN.md` popisuji omezeni prohlizece a pozadovane chovani.
  - Verification: Dokumenty obsahuji cil, rozsah, navrh a overeni.

- [x] Presunout vyzadani povoleni do kliknuti na otevreni skladby/playlistu.
  - Acceptance: `openSong` a `openPlaylist` overi povoleni pred nastavenim `playerSession` a file handles se prednacitaji do pametove cache.
  - Verification: Build projde a kod vola helper pro povoleni pred otevrenim prehravace.

- [x] Provest finalni overeni.
  - Acceptance: Akceptacni kriteria v PRD jsou splnena.
  - Verification: Spustit `npm run build`.
