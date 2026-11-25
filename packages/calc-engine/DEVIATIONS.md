# Erinevused vanast v2 arvutusest

Mootor on vana `htdocs/v2/JS/script.js` valemite ülekanne. Allpool on kõik kohad, kus tulemus **teadlikult erineb** v2-st. Ülejäänud valemid on muutmata. Seinte osa võrdlus v2-ga on automaatne: vt `test/legacy-v2.ts` ja `test/walls.test.ts`.

| # | Koht v2-s | Mis oli valesti | Mis on nüüd |
|---|---|---|---|
| D1 | `arvuta2()` r.343, 363, 369 – osalise rea liige | `palgiKorgus/(palgiKorgus*murdosa)` = `1/murdosa`. Esi- ja tagasein algavad poole palgiga, seega kõrgus on tavaliselt X,5 rida ja siis `1/0,5 = 2`, ehk üks pool palki kummalegi seinale. See on **õige**. Täisarvulise rea korral oli tulemus aga **lõpmatus** ja muu murdosa korral vale (nt 2190/145 → 9,7). | Osalise rea korral lisatakse **üks täispikk laud kummalegi seinale**. Pool palki on kulus terve palk, sest teine pool jääb üle. Tulemus on X,5 rea korral täpselt sama mis v2-l (vt test „X,5 rea korral…“). Ühekaldelisel = `ceil(h/p)` rida seina kohta. |
| D2 | `uksedSum()`, `aknadSum()` | `uksedKokkuPindala` ja `aknadKokkuPindala` ei nullitud, iga arvutus liitis eelmisele otsa. | Arvutatakse alati nullist. |
| D3 | `moodud()` r.111 | Stsenaarium „siseseinast“ lisas alati +280 mm, mis eeldab palgi paksust 40 mm. | Lisatakse `2 × (nurgaülejääk + palgi paksus)`. Paksusega 40 mm tulemus ei muutu. |
| D4 | `lisaKatus2()` r.4459 jm | `katuseNurk2` kasutas `Math.sin`, kus pidi olema `asin`. Kui katuselaua pikkus anti ette, jäi nurk eelmise arvutuse globaalsest muutujast. | Nurk arvutatakse alati kaatetitest: `atan(kõrgus / horisontaal)`. |
| D5 | `arvuta2()` ühekaldelise ruumala | Kasutas küljeseina kõrgust (ühekaldelisel tavaliselt tühi) ja kiilu ruumala oli 4× liiga suur. | Risttahukas madalama seina kõrguseni + ½ × kiil. Ruumala on ainult info, materjalikulu see ei mõjuta. |
| D6 | `lisakatusKirjuta()` | Räästa- ja papikinnituslaua tüki pikkuseks kuvati `laud + 38`, kogupikkus arvutati aga `laud + 18` järgi. | Kogupikkus = tükkide arv × kuvatud tüki pikkus (`+38`, muudetav konstant `fasciaExtra`). |
| D8 | `parlinNimekiri()` | Pärlini pikkus oli alati maja sügavus, ka ühekaldelisel katusel. | Pärlini pikkus = katuse pikkus: viilkatusel sügavus, ühekaldelisel laius (või pikim pikem laud). Kinnitatud (K4). |
| D7 | `arvutaUus()` | Viilupalkide kogupikkus ümardati enne korrutamist (`toFixed(2)`). | Ümardamist ei tehta; vormindab kasutajaliides. |

### Revit-joonistega kalibreeritud (2026-11, 8 Viktra maja)

Võrdlus: `test/revit-houses.test.ts`; toorandmed ja võrdlusskript `Dropbox/logcalc/Vanad joonised/andmed/` (gitist väljas).

| # | Koht | v2 | Nüüd (Revit) | Kehtib |
|---|---|---|---|---|
| D9 | Katuselaudade arv | `2 + 2 × ümar(L/110)` | `alla(L / laua laius)` katusepoole kohta | 7/8 (Placas I: Revit 72, reegel 70 – tõenäoliselt Revit'i viga) |
| D10 | Pärlinite arv | kaldpinna pikkus ÷ (n+1) < 700 | **horisontaalne** ulatus ÷ (n+1) < 900 | 8/8 |
| D11 | Vundamendi pruss | täispikk; max vahe 500 | 5 mm vahe kummaski otsas (ka ringprussid); automaatne max vahe 600; valik auto / arv / vahe | pikkus 5/5, arv auto-ga 3/5 |
| D12 | Põrandalaudade arv | `üles(ava/110) + 1` | `üles((ava − 2×20)/110)` – 20 mm vahe seinast kummalgi pool | 5/5 |

### Seinte graaf vs Revit (Nora I, Boden II, Lund; `test/graph-houses.test.ts`)

| # | Koht | Revit | Mudel |
|---|---|---|---|
| D13 | Piirde ülemine palk, seina ülemine palk | Eraldi tähis (Lund 1LG9, ALG6, BLG5; ATL/BTL), sama mõõt | Sama pikkuse ja sälkudega tükid on üks detail; profiili erinevust (faasitud pealispind) veel ei eristata |
| D14 | Boden viil 1LG5* / 4LG5* | 1286 | 1420 (rida 284 × k; Revit'i väärtus jääb reeglist välja – tõenäoliselt viga) |
| D15 | Boden ALG4 / BLG2 (veranda kohal 3. ülemine rida) | 4700 (ots faasitud) | 4800 – faasimist ei modelleerita |

Pikkade seinte jätk (max `maxLogLength` 6000): jätk ristuva seina (vaheseina) kesktelje kohal, mõlemal tükil seal sälk;
paaris- ja paaritud read eri vaheseintes (jätkud vaheliti). Ilma sobiva vaheseinata -> hoiatus `wall.logTooLong`.
Plaanist maja seinalauad (BOM) = lõikenimekirja summa.

Tuuleliistud = nurkade vertikaalsed liistud (4 nurka × seina kõrgus) – v2 valem jääb. Revit näitab laopikkust (4 × 2200; kõrgemal seinal + 550).

## Kontroll päris majadega

`test/real-houses.test.ts` (andmed: `Dropbox/kalkull/Abimaterjal/`):

| Maja | Võrdlusalus | Tulemus |
|---|---|---|
| Placas I 40 | Revit-eelarve: terve maja 257,34 m; külg 111,20; viilud 27,74; esi/taga 118,40 (sh 40x57 7,56) | Vahe < 0,02 m; külgseinad ja esi/taga täpselt |
| Bente IV 28 | v2 tulemus 06.03.2019: seinad 239,14 / 216,10 jm; uks 23,04; vundament 9 tk × 2750 (24,75 jm); pärlinid 12,0 jm | Täpselt sama |
| Brantevik II 40 | Joonis: põrandalaud 3515 mm; vundamendi pruss 3600 mm | Täpselt sama |

Kõik varem kõvakodeeritud arvud (100, 110, 200, 500, 700, 114, 38, 5) on nüüd failis `src/constants.ts` ja neid saab `calculateHouse(input, { constants })` kaudu muuta. Hiljem saab need seadistada ka iga kliendi kaupa.

## D16. Tuuleliistud Viktra paigaldusjoonise järgi (2026-11-25)

v2: tuuleliistud = 4 × küljeseina kõrgus (ühekaldel 2 × (esisein − ½ palki) + 2 × (tagasein − ½ palki)) – nurkades.
Revit (kõik 8 maja): „Windboard 18x40“ × 2200, 4 tk (Lund 6), paigaldusleht „Windboard“ (190325): toas katuse kalde
all oleval seinal, 200 mm nurgast, 40 mm põrandast, lõigatakse katuse alla (Assembly 2), uus Ø8 ava 40 mm otsast.
Mootor: materjal = arv × 2200 (18x40), lõikepikkused lõikenimekirjas (`src/windboards.ts`, `test/windboards.test.ts`).
`walls.windStripsJm` (v2 valem) jääb võrdluseks. Boden II lisaks „Windboard2“ 4 × 550 (veranda) – ei arvutata;
seina 2 aken 350 mm nurgast -> hoiatus `windboard.opening`.

## D17. Räästalauad ja profiilid Revit-i järgi (2026-11-25)

- Papikinnituslaud (EE): Revit 28 mm majad (Bente, Annika, Carina) 18x40, 40 mm majad (Boden, Brantevik, Lund, Nora,
  Placas) 18x95 – vaikimisi profiil palgi paksuse järgi (v2: alati 18x95).
- Ühekalle (Revit Carina 2023): räästas esi- ja tagaserval esiräästalaud RF 18x120, pikkus = katuse pikkus + 36
  (3753 -> 3789); suuremat toelauda 18x95 pole. Vanem Annika (2022) kasutas räästas 18x95 (RR1 3140 = 3100 + 40) ja
  viiluservades 18x95 ilma RF-ita – mootor järgib uuemat (Carina).
- RF/EE pikkus viiluservas: Revit = katuselaud + 32…50 mm, mootor ceil10(laud + 38) – Revit-i laua pikkusega erinevus
  ≤ 10 mm; suurem vahe (nt Bente 1690 vs 1640) tuleb katuselaua pikkusest (üleulatus, QUESTIONS.md K14).
- Profiilid lõikenimekirjas: põranda- ja katuselaud 17x114 (katteleius 110), pärlin/hari 40x143 (Boden 68x143/193).

## D18. Detailid Revit „Details“ järgi (Kolding 40 _D_ PDF, 2026-11-25)

`src/details.ts`, `test/model3d.test.ts` („detailid Revit-i järgi“): nurgaliite sälk laius = palgi paksus, sügavus h/4
peal ja all; tavaline palgiots nurgafaas 12 mm; pikendatud ots (varikatus, pärlin) ülevalt 65 püsti + 45°; pärlin 40x143
alt sälk seina paksus × 48 viiluseina kohal, viilupalkides pilu 40 × 95 (143 − 48); hari terav (külg 137); ukse kohal
olev palk alt 12 mm vajumisvaru ukse laiuses. Varem: sälk 19 mm, otsa faas 15 mm, varikatuse ots 0,43 × h, pilu kogu
pärlini kõrguses. Kolding A/B LG-8 „sisselõige 7 + punni kõrgus“ – eesmärk teadmata, ei arvutata.
