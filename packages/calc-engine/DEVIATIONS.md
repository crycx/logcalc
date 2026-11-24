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

## Kontroll päris majadega

`test/real-houses.test.ts` (andmed: `Dropbox/kalkull/Abimaterjal/`):

| Maja | Võrdlusalus | Tulemus |
|---|---|---|
| Placas I 40 | Revit-eelarve: terve maja 257,34 m; külg 111,20; viilud 27,74; esi/taga 118,40 (sh 40x57 7,56) | Vahe < 0,02 m; külgseinad ja esi/taga täpselt |
| Bente IV 28 | v2 tulemus 06.03.2019: seinad 239,14 / 216,10 jm; uks 23,04; vundament 9 tk × 2750 (24,75 jm); pärlinid 12,0 jm | Täpselt sama |
| Brantevik II 40 | Joonis: põrandalaud 3515 mm; vundamendi pruss 3600 mm | Täpselt sama |

Kõik varem kõvakodeeritud arvud (100, 110, 200, 500, 700, 114, 38, 5) on nüüd failis `src/constants.ts` ja neid saab `calculateHouse(input, { constants })` kaudu muuta. Hiljem saab need seadistada ka iga kliendi kaupa.
