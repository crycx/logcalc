# Küsimused arvutuse kohta

## Lahendatud

| # | Küsimus | Otsus |
|---|---|---|
| K1 | Viilkatuse esi/tagaseina osaline rida | v2 `1/0,5 = 2` = pool palki kummalegi seinale; kinnitatud Revitiga (Placas I 40). Pool palki on kulus terve palk. |
| K2 | Külgseinte ridade arv (`floor(h/p) − 1` mittetäpsel kõrgusel) | Tahtlik, jääb. |
| K3 | Vundamendi prusside vahe ja kaugused seintest | Kuvab õigesti vastavalt suunale A→B / 1→2; jääb. |
| K4 | Pärlini pikkus ühekaldelisel | = katuse pikkus (laius). DEVIATIONS.md D8. |
| K5 | Esi/tagaseina kõrgus | Kasutajaliideses automaatselt = küljesein − ½ palki, käsitsi muudetav (`fbAuto`). Vanad salvestatud majad jäävad käsitsi väärtusega. |
| K6 | Ühekaldelise kolmnurga laius `pikkus − (2×100 + paksus)` | Kinnitatud Revitiga (Annika I 28): kolmnurga palgid 2000 / 1429 / 543 mm täpselt, seinad kokku 150,82 m. |
| K7 | Uste ja akende hinnad | Ettevõtte kataloog (nimi, mõõdud, hind tk kohta), admin seadistab; materjalide nimekirjas tükiridadena. |
| K8 | Vundamendi prusside max vahe | Kasutaja määratav (valik auto / arv / vahe), automaatne max vahe 600 (Revit). |
| K9 | Räästalaudade järjekord | Toelauad (RR) ees, siis esiräästalaud (RF) ja papikinnituslaud (EE). |
| K10 | Vundamendi prusside pikkus/arv | Pikkus: 5 mm vahe otstes (Revit 5/5). Arv: valik auto (max vahe 600) / arv / vahe – Revit'i mudelid kasutavad 368–593 mm. |
| K11 | Tuuleliistud | Nurkade vertikaalsed liistud; Revit näitab laopikkust 2200 (+550 kõrgel seinal). Valem jääb. |
| K13 | Katuselaudade, pärlinite, põranda arv | Kalibreeritud 8 Revit-joonise järgi (DEVIATIONS.md D9–D12). |

## Lahtised

**K12. Katuse nurk** – joonistel täisarvud (Annika 7°, Bente 17°), mootor arvutab arvutuslikust kolmnurgast (7,7°, 16,5°). Mõjutab ainult kuvamist. Kas joonisel on tootekirjelduse ümardatud nurk?

**K14. Katuselaua pikkus** – Revit'i pikkused (nt Bente 1590, Brantevik 2197) sõltuvad tegelikust üleulatusest; mootor arvutab vaikimisi üleulatusega 200 (1643, 2083). Iga maja üleulatus tuleb sisestada või see peab olema kliendi seade.

## Seinamudeli testjuhtumid (praegune 4-seinaline mudel ei kata)

- **Nora I 40** – garaaž: garaažiukse kõrval postid (410), kolm viilu (sh keskmine viilsõrestik), külgseinas uks + aken.
- **Boden II 40** – lahtine veranda postidega, magamislava (redel, piire), 68 mm pärlinid, 39° katus, 6 seinagruppi.
- **Lund 40** – kinnine terrass (piirded, nurgapostid 300 klotsidest), viiluga vahesein uksega, 3 viilu, X-nurgaliited.
