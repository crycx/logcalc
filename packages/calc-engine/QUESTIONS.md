# Lahtised küsimused (vajavad domeenieksperdi kinnitust)

Need kohad on mootoris **jäetud samaks nagu v2-s**. Need tunduvad aga kahtlased ja tuleks üle kontrollida mõne Revit-projekti vastu.

**K1. ~~Viilkatuse esi- ja tagaseina osaline rida~~ – LAHENDATUD**
v2 `1/0,5 = 2` tähendas ühte pool palki kummalegi seinale. Revit (Placas I 40, 40x57) kinnitas seda. Pool palki on kulus terve palk.

**K2. ~~Külgseinte ridade arv~~ – LAHENDATUD**
Mittetäpse kõrguse puhul `floor(h/p) − 1` rida on tahtlik (kinnitatud).

**K3. Vundament, suund AB** (`foundation.ts`, v2 r.4127)
Prusside vahe arvutatakse laiuse ja prusside pikkus sügavuse järgi, aga **mõlemal juhul** kasutatakse kaugust seintest 1–2 (`prussiKaugusValisseinast12`). Kaugust A–B kasutatakse ainult ringprusside juures. Kas see on õige?

**K4. ~~Pärlini pikkus ühekaldelisel katusel~~ – LAHENDATUD**
Ühekaldelisel = laius (katuse pikkus), vt DEVIATIONS.md D8.

**K5. Viilkatuse kõrgused** (`geometry.ts`, v2 `arvutaUus()`)
Viilupalkide arv arvutatakse esi- ja tagaseina kõrgusest (`roofHeight − heightFb`), viilu kolmnurga kõrgus aga küljeseina kõrgusest (`roofHeight − heightSide`). Placas I 40 puhul andis see Revitiga sama tulemuse (27,76 vs 27,74 m), seega on see ilmselt tahtlik poole palgi nihke tõttu. Kinnita.

**K6. Ühekaldelise katuse kolmnurga laius** (`geometry.ts`)
`depth − (2×100 + paksus)`, ehk palgi paksus on lahutatud ainult üks kord, mitte kaks korda nagu viilkatusel.

**K7. Uste ja akende hinnad** (v2 `avaHinnad()`)
Seda pole veel üle kantud: uste ja akende hinnad on v2-s seeriapõhised ja eraldi loogikaga.

**K8. ~~Vundamendi prusside arv vs Revit~~ – LAHENDATUD**
Max vahe on kasutaja määratav (`foundation.maxSpacing`), vaikimisi 500. Brantevik II joonise 7 prussi saab max vahega 600.

**K9. Testimise märkmetest** (Annika I)
- Katuselaua laius peab olema muudetav, mitte alati 110. See on nüüd konstant `roofBoardWidth` ja seda saab muuta.
- Räästalauad tuleks kuvada vastupidises järjekorras („RR-id ees“). See on kasutajaliidese küsimus.
