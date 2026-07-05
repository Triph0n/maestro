# Maestro - technicke reseni React verze v0.2

## 1. Rozhodnuti

Maestro bude dal vedene jako React aplikace spoustena lokalne v prohlizeci, primarne v Microsoft Edge nebo Google Chrome na Windows tabletu.

Tauri, Rust, SQLite a portable `.exe` nejsou soucasti aktualni implementacni vetve.

## 2. Proc je React verze vhodna

- rychly vyvoj a jednoducha udrzba,
- dobre sedi na dotykove UI,
- PDF.js bez problemu vykresluje PDF noty do vlastniho prohlizece,
- fullscreen API je pro rezim hrani dostatecne,
- klavesnice a USB/Bluetooth pedal fungujici jako klavesnice jsou podporovane primo v prohlizeci,
- aplikace muze bezet lokalne pres Vite nebo pozdeji jako PWA.

## 3. Hlavni technicky kompromis

Bez desktop backendu nema webova aplikace klasicky pristup k absolutnim cestam na disku.

Misto ukladani cesty k PDF se pouzije File System Access API:

- uzivatel vybere PDF pres `showOpenFilePicker`,
- aplikace ulozi `FileSystemFileHandle` do IndexedDB,
- PDF se nekopiruje do aplikace,
- pri otevreni skladby aplikace pres handle nacte aktualni soubor z puvodniho mista,
- pokud prohlizec vyzada opravneni znovu, aplikace ho vyzada pri otevreni skladby.

Toto nejlepe odpovida PRD v ramci ciste React aplikace: PDF zustava na puvodnim miste a aplikace si uklada jen pristupovy odkaz/handle.

## 4. Podporovany prohlizec

Primarni cil:

- Microsoft Edge na Windows,
- Google Chrome na Windows.

File System Access API neni vhodne brat jako univerzalni pro vsechny prohlizece. Pokud API chybi, aplikace ma jasne rict, ze je potreba Edge/Chrome.

Poznamka: `localhost` se pro tyto browser API bere jako bezpecny kontext, takze lokalni vyvojovy server je v poradku.

## 5. Stack

- React
- TypeScript
- Vite
- PDF.js pres `pdfjs-dist`
- lucide-react pro ikony
- vlastni CSS styl inspirovany Jeeves 3.0
- localStorage pro metadata
- IndexedDB pro file handles

## 6. Data

### Metadata v localStorage

`songs`

- `id`
- `title`
- `author`
- `fileName`
- `handleKey`
- `createdAt`
- `updatedAt`

`playlists`

- `id`
- `name`
- `createdAt`
- `updatedAt`

`playlistItems`

- `id`
- `playlistId`
- `songId`
- `position`

`pageRotations`

- `songId`
- `pageNumber`
- `rotation`

`settings`

- `pageViewMode`

### File handles v IndexedDB

Object store:

- `fileHandles`

Klic:

- `handleKey`

Hodnota:

- `FileSystemFileHandle`

## 7. Prace s PDF

Pridani PDF:

1. Uzivatel klikne na Pridat PDF.
2. Aplikace zavola `showOpenFilePicker`.
3. Uzivatel vybere PDF.
4. Aplikace ulozi file handle do IndexedDB.
5. Do localStorage ulozi metadata skladby.
6. Skladba se otevre ve fullscreen rezimu.

Otevreni PDF:

1. Aplikace najde `handleKey`.
2. Z IndexedDB nacte file handle.
3. Overi opravneni.
4. Pokud opravneni chybi, vyzada ho.
5. Zavola `handle.getFile()`.
6. Preda bytes do PDF.js.

Chybejici nebo presunuty soubor:

- pokud handle nefunguje nebo opravneni nelze ziskat, aplikace zobrazi chybu,
- uzivatel muze skladbu znovu propojit s PDF pres tlacitko v knihovne.

## 8. Rezim hrani

Rezim hrani zustava podle PRD:

- automaticky fullscreen,
- klepnuti vlevo: predchozi stranka,
- klepnuti vpravo: dalsi stranka,
- klepnuti nahore: zobrazit/skryt listu,
- Escape: zpet do menu,
- listovani bez animaci a okamzite,
- sousedni stranky se prednacitaji,
- jedna/dve stranky,
- ve dvojstrankovem rezimu jsou stranky tesne vedle sebe,
- rotace stranky se uklada.

## 9. Playlisty

Playlisty zustavaji lokalni metadata.

Otevreni playlistu:

- aplikace otevre prvni skladbu,
- po posledni strance prejde na dalsi skladbu,
- na zacatku skladby muze predchozi krok prejit na predchozi skladbu.

## 10. Rizika

### Browser podpora

File System Access API je spravna volba pro Edge/Chrome, ale neni univerzalni pro vsechny prohlizece.

Mitigace:

- v aplikaci jasne zobrazit pozadavek Edge/Chrome,
- neslibovat podporu Firefox/Safari pro MVP.

### Opravneni k souboru

Prohlizec muze po case vyzadovat znovu potvrdit pristup.

Mitigace:

- pri otevreni skladby automaticky vyzadat opravneni,
- pokud uzivatel odmita, nabidnout znovu propojit PDF.

### Ztrata metadat

localStorage a IndexedDB patri ke konkretnimu prohlizeci a adrese aplikace.

Mitigace:

- nemazat data webu v prohlizeci,
- pozdeji pridat export/import knihovny.

## 11. Aktualni implementacni cil

Prevest prototyp z kopirovani PDF do IndexedDB na file handles:

- PDF se uz nebude kopirovat do uloziste prohlizece,
- aplikace bude ukladat pouze file handle,
- UI bude ukazovat, ze PDF zustava v pocitaci,
- pridat znovu propojeni PDF, kdyz handle chybi nebo je soubor nedostupny.

## 12. Zmena: razeni skladeb v playlistu

### Kontext

Playlist je ulozeny jako `playlistItems`, kde kazda polozka obsahuje `playlistId`, `songId` a ciselne `position`. Detail playlistu uz sklada viditelny setlist serazenim podle `position`; otevreni playlistu pouziva stejne serazeni.

### Navrh

- Zachovat `position` jako jediny zdroj poradi.
- Pri presunu nahoru/dolu prohodit vybranou polozku se sousedem a znovu priradit pozice od nuly.
- Pri pretazeni presunout vybranou polozku pred cilovou pozici a znovu priradit pozice od nuly.
- Pri odebrani polozky z playlistu znovu priradit pozice zbyvajicim polozkam ve stejnem playlistu.
- V UI pouzit stavajici ikonova tlacitka a pridat drag handle se stavem aktivniho pretazeni.

### Dotcene soubory

- `src/App.tsx`
- `src/components/PlaylistsView.tsx`
- `src/styles/theme.css`

### Overeni

- TypeScript build musi projit.
- Manualne overit, ze zmena poradi meni vizualni seznam i poradi predane do prehravace.

## 13. Oprava: Escape z PDF prohlizece

### Kontext

`PlayerView` vstupuje po otevreni skladby do nativniho fullscreen rezimu pres Fullscreen API. V nekterych prohlizecich se Escape zpracuje primarne jako ukonceni fullscreen rezimu a aplikacni `keydown` handler nemusi byt spolehlivy zdroj navratu do menu.

### Navrh

- Zachovat existujici `keydown` obsluhu pro Escape.
- Pridat obsluhu `fullscreenchange`, ktera pri opusteni fullscreen rezimu zavola stejnou logiku navratu do menu.
- Zajistit idempotentni navrat, aby soubezny Escape, toolbar a `fullscreenchange` nezpusobily duplicitni stavove zmeny.

### Dotcene soubory

- `src/components/PlayerView.tsx`

### Overeni

- TypeScript build musi projit.
- Manualne overit v prohlizeci, ze Escape po otevreni PDF vrati aplikaci do menu.

## 14. Oprava: povoleni k PDF pri otevreni

### Kontext

File System Access API vyzaduje uzivatelskou aktivaci pro `requestPermission`. Pokud se povoleni vyzada az v `PlayerView` efektu po zmene React stavu, prohlizec muze zadost odmitnout, i kdyz uzivatel predtim klikl na otevreni skladby.

### Navrh

- Exportovat helper, ktery podle `handleKey` nacte file handle a overi nebo vyzada read permission.
- Po nacteni metadat skladby prednacist file handles z IndexedDB do pametove cache, aby samotne kliknuti nemuselo cekat na IndexedDB pred `requestPermission`.
- Volat tento helper primo v `openSong` pred nastavenim `playerSession`.
- Pri `openPlaylist` projit skladby v playlistu a vyzadat povoleni pred nastavenim `playerSession`, aby dalsi skladby nepadaly pri automatickem prechodu.
- `PlayerView` si ponecha kontrolu povoleni pri samotnem nacteni PDF jako obrannou vrstvu.

### Dotcene soubory

- `src/data/storage.ts`
- `src/App.tsx`

### Overeni

- TypeScript build musi projit.
- Manualne overit, ze otevreni skladby/playlistu vyzaduje povoleni pred PDF prohlizecem a pri odmitnuti zustane v menu.

## 15. Oprava: fullscreen jen z uzivatelske akce

### Kontext

Prohlizec odmita `requestFullscreen`, pokud neni spusteny primo z uzivatelske akce. Automaticke volani z React efektu v `PlayerView` proto muze pri opakovanem otevreni PDF vyhodit chybu `API can only be initiated by a user gesture`.

### Navrh

- Odstranit automaticke volani `requestFullscreen` z mount efektu `PlayerView`.
- Ponechat prehravac jako celoobrazovkovou aplikacni obrazovku pres CSS.
- Pridat tlacitko v liste prehravace, ktere spusti nativni fullscreen primo z kliknuti uzivatele.
- Nacitani PDF v `PlayerView` nesmi samo vyvolavat `requestPermission`; pokud opravneni chybi, zobrazi chybu a uzivatel otevira skladbu z menu.

### Dotcene soubory

- `src/components/PlayerView.tsx`
- `src/data/storage.ts`

### Overeni

- TypeScript build musi projit.
- Manualne overit, ze otevreni PDF uz nevola `requestFullscreen` z efektu a ze nativni fullscreen funguje z tlacitka v liste.
