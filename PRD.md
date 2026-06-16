# Maestro - PRD v0.1

## 1. Cíl produktu

Maestro je jednoduchá Windows aplikace pro zobrazování PDF not na dotykovém Windows zařízení. Aplikace má umožnit rychle načíst PDF soubory z počítače, zobrazit je přes celou obrazovku a organizovat skladby do playlistů pro koncert nebo zkoušku.

První verze má být jednoduchá, stabilní a vhodná pro živé hraní.

## 2. Platforma

- Cílová platforma: Windows.
- Primární zařízení: dotykový tablet s Windows.
- Ovládání: dotyk, myš, klávesnice, USB/Bluetooth pedál, později případně MIDI pedál.
- Distribuce: portable aplikace bez instalace, ideálně jeden spustitelný soubor nebo jedna přenosná složka.

## 3. Cílový uživatel

Hudebník, který používá PDF noty na Windows tabletu a potřebuje:

- rychle otevřít skladbu,
- číst noty ve fullscreen režimu,
- listovat bez složitého ovládání,
- připravit si playlist/setlist pro koncert.

## 4. MVP rozsah

### 4.1 Knihovna skladeb

Aplikace umožní přidat PDF soubor z počítače do knihovny.

PDF se nebude kopírovat do aplikace. Aplikace si uloží pouze cestu k souboru.

U každé skladby se uloží:

- název,
- autor,
- cesta k PDF souboru.

### 4.2 PDF prohlížeč

Aplikace po otevření skladby automaticky zobrazí PDF noty ve fullscreen režimu.

Prohlížeč musí podporovat:

- zobrazení jedné stránky,
- zobrazení dvou stránek vedle sebe,
- přepínací tlačítko mezi režimem jedna/dvě stránky,
- listování dopředu a dozadu,
- ovládání dotykem,
- ovládání myší,
- ovládání klávesnicí,
- ovládání USB/Bluetooth pedálem, pokud se pedál chová jako klávesnice.

Pro první verzi se nebude ukládat poslední otevřená stránka.

Pokud je otevřený playlist, listování po poslední stránce aktuální skladby automaticky otevře první stránku další skladby v playlistu.

### 4.3 Playlisty / setlisty

Aplikace umožní vytvářet playlisty pro koncert.

Playlist bude obsahovat skladby v konkrétním pořadí.

Uživatel musí umět:

- vytvořit nový playlist,
- přejmenovat playlist,
- smazat playlist,
- přidat skladbu do playlistu,
- odebrat skladbu z playlistu,
- změnit pořadí skladeb v playlistu,
- otevřít playlist a postupně procházet skladby.

### 4.4 Ovládání při hraní

Během fullscreen zobrazení má být ovládání minimální a nerušivé.

Základní akce:

- další stránka,
- předchozí stránka,
- další skladba v playlistu,
- předchozí skladba v playlistu,
- přepnutí jedna/dvě stránky,
- návrat z fullscreen režimu.

Návrat z fullscreen režimu:

- klávesou Escape,
- dotykovým tlačítkem Zpět/Menu v horní liště,
- horní lišta může být během hraní skrytá a zobrazí se klepnutím doprostřed horní části obrazovky.

Dotykové ovládání v režimu hraní:

- klepnutí na pravou část obrazovky: další stránka,
- klepnutí na levou část obrazovky: předchozí stránka,
- klepnutí nahoře uprostřed: zobrazit nebo skrýt ovládací lištu.
- swipe není součástí první verze, aby ovládání zůstalo co nejjednodušší.

Další nástroje v režimu hraní:

- otočení aktuální PDF stránky doleva,
- otočení aktuální PDF stránky doprava.

Otočení stránky se uloží pro danou skladbu, aby se špatně naskenované stránky zobrazily správně i při dalším otevření.

## 5. Mimo rozsah první verze

Tyto funkce nejsou součástí MVP:

- psaní poznámek do not,
- kreslení prstem,
- ukládání poslední otevřené stránky,
- synchronizace mezi zařízeními,
- cloudové úložiště,
- automatické rozpoznávání názvu skladby z PDF,
- složky/kategorie,
- pokročilé vyhledávání,
- export/import knihovny,
- MIDI konfigurace, pokud MIDI pedál neposílá běžné klávesové zkratky.

## 6. Navržené obrazovky

### 6.1 Knihovna

Hlavní obrazovka aplikace.

Obsah:

- seznam přidaných PDF skladeb,
- tlačítko pro přidání PDF,
- vyhledání podle názvu nebo autora,
- otevření skladby,
- editace názvu a autora.

Knihovna bude v první verzi textový seznam bez náhledů stránek.

### 6.2 Playlisty

Obrazovka pro správu koncertních setlistů.

Obsah:

- seznam playlistů,
- detail vybraného playlistu,
- pořadí skladeb,
- přidání skladeb z knihovny,
- změna pořadí skladeb,
- otevření playlistu v režimu hraní.

### 6.3 Režim hraní

Fullscreen prohlížeč PDF.

Obsah:

- samotné noty jako hlavní obsah,
- malé nenápadné ovládání,
- název aktuální skladby v horní liště po klepnutí,
- přepínač jedna/dvě stránky,
- možnost odejít zpět do aplikace.

Režim hraní se zapne automaticky po otevření skladby nebo playlistu.

## 7. Vizuální styl

Aplikace má mít jednoduchý tmavý vzhled inspirovaný stylem Jeeves 3.0 z lokální reference `http://localhost:3000/`.

Základní vizuální směr:

- tmavé mahagonové / bordeaux pozadí,
- akcentní barva voskově tmavě červená,
- doplňková zlatá linka pro rámečky, aktivní stavy a důležité ovládání,
- jemné pergamenové panely v menu a knihovně,
- serifové nadpisy podobné stylu Jeeves 3.0,
- čisté velké ovládací prvky vhodné pro dotyk,
- zaoblení spíše malé, kolem 4-8 px,
- primární optimalizace pro rozlišení 1920 px na šířku,
- v režimu hraní co nejméně rušivých prvků.

Orientační barevné hodnoty podle reference:

- tmavý mahagon: `#2a1508`,
- hluboké pozadí: `#120904`,
- tmavě červený vosk / bordeaux akcent: `#8b0000`,
- zlatá linka: `#c5a059`,
- pergamenový panel: `#f6ebd4`.

## 8. Klávesové zkratky

První návrh:

- Šipka doprava: další stránka.
- Šipka doleva: předchozí stránka.
- Page Down: další stránka.
- Page Up: předchozí stránka.
- Mezerník: další stránka.
- Escape: opustit fullscreen.

Pedál přes USB/Bluetooth bude v první verzi podporovaný hlavně tehdy, pokud posílá některou z těchto kláves.

## 9. Ukládání dat

Aplikace bude ukládat lokální data v počítači.

Ukládají se:

- seznam skladeb,
- metadata skladeb,
- cesty k PDF souborům,
- uložené otočení jednotlivých PDF stránek,
- playlisty,
- pořadí skladeb v playlistech.

PDF soubory zůstanou na původním místě v počítači.

Pokud se PDF přesune nebo smaže, aplikace zobrazí, že soubor chybí, a nabídne znovu vybrat soubor.

## 10. Akceptační kritéria MVP

Aplikace je použitelná pro první verzi, pokud:

- uživatel může přidat PDF z počítače,
- PDF se po otevření automaticky zobrazí přes celou obrazovku,
- uživatel může listovat dopředu a dozadu,
- uživatel může listovat dotykem klepnutím na levou nebo pravou část obrazovky,
- uživatel může přepnout mezi jednou a dvěma stránkami,
- uživatel může otočit špatně naskenovanou stránku,
- aplikace si zapamatuje otočení stránky pro další otevření,
- uživatel může vytvořit playlist,
- uživatel může seřadit skladby v playlistu,
- uživatel může otevřít playlist a hrát skladby v pořadí,
- po poslední stránce skladby v playlistu se další listování přesune na další skladbu,
- uživatel se může z fullscreen režimu vrátit do menu přes Escape nebo dotykové ovládání,
- aplikace si po zavření pamatuje knihovnu a playlisty,
- PDF soubory se nekopírují, ukládá se pouze odkaz na jejich umístění.

## 11. Rozhodnutí

1. Aplikace bude portable bez instalace.
2. PDF se po otevření automaticky zobrazí fullscreen.
3. Ovládání bude optimalizované pro dotyk.
4. Po poslední stránce skladby v playlistu se další listování přesune na další skladbu.
5. Knihovna bude jednoduchý textový seznam bez náhledů.
6. Vizuální směr: Jeeves 3.0, bordeaux / tmavě červená, tmavé mahagonové rozhraní, zlaté linky, pergamenové panely, optimalizace pro 1920 px šířku.
7. Dotykové listování bude v první verzi řešené klepnutím na levou/pravou část obrazovky, bez swipe gest.
8. Aplikace bude podporovat otočení PDF stránky.
9. Otočení PDF stránky se bude ukládat pro další otevření.
10. Název skladby v režimu hraní bude viditelný jen po klepnutí na horní část obrazovky spolu s ovládací lištou.

## 12. Otevřené otázky

Žádné otevřené produktové otázky pro MVP.

## 13. Zmena: razeni skladeb v playlistu

### Cil

Uprava potvrzuje, ze v detailu playlistu musi byt jasna moznost menit poradi skladeb a ze ulozene poradi se pouzije pri hrani playlistu.

### Rozsah

- Udrzet ovladani pres sipky nahoru/dolu pro dotykove a presne presuny.
- Pridat moznost presunout skladbu pretazenim v seznamu playlistu pro mys.
- Po odebrani nebo presunu skladby prepocitat pozice tak, aby playlist nemel mezery ani duplicitni poradi.

### Akceptacni kriteria

- U skladby v playlistu lze zmenit poradi nahoru nebo dolu.
- Skladbu lze pretahnout na jinou pozici v playlistu.
- Prvni skladbu nelze posunout vyse a posledni skladbu nelze posunout nize.
- Po zmene poradi se playlist otevre a hraje ve stejnem poradi, ktere uzivatel vidi v detailu playlistu.
- Po odebrani skladby zustane poradi zbyvajicich skladeb souvisle.

## 14. Oprava: Escape z PDF prohlizece

### Cil

Pri stisku Escape v otevrenem PDF se aplikace musi spolehlive vratit z rezimu hrani do hlavniho menu.

### Rozsah

- Escape zustava klavesou pro navrat do menu.
- Pokud prohlizec Escape pouzije pouze k ukonceni nativniho fullscreen rezimu, aplikace to zachyti a zavre PDF prohlizec.
- Ukonceni fullscreen rezimu nesmi vyvolat viditelnou chybu.

### Akceptacni kriteria

- Po otevreni PDF a stisku Escape se uzivatel vrati do menu.
- Tisnuti tlacitka Menu v horni liste se chova stejne jako dosud.
- Build aplikace projde bez TypeScript chyb.

## 15. Oprava: povoleni k PDF pri otevreni

### Cil

Maestro si ma vyzadat povoleni k PDF souboru primo pri kliknuti na otevreni skladby nebo playlistu, aby prohlizec zadost neodmitl kvuli chybejici uzivatelske akci.

### Rozsah

- Aplikace nebude slibovat trvale systemove povoleni, protoze to Chrome/Edge webove aplikaci nedovoli nastavit natvrdo.
- Pri otevreni skladby se overi a pripadne vyzada povoleni k danemu PDF pred vstupem do rezimu hrani.
- Pri otevreni playlistu se overi a pripadne vyzada povoleni ke skladbam v playlistu pred vstupem do rezimu hrani.
- Pokud uzivatel povoleni neudeli, aplikace zustane v menu a zobrazi srozumitelnou hlasku.

### Akceptacni kriteria

- Kliknuti na skladbu vyzada chybejici povoleni k PDF driv, nez se otevre PDF prohlizec.
- Kliknuti na playlist vyzada chybejici povoleni k PDF souborum v playlistu driv, nez se otevre PDF prohlizec.
- Pokud prohlizec povoleni odmita, uzivatel vidi praktickou hlasku a aplikace nespadne.
- Build aplikace projde bez TypeScript chyb.
