# LogCalc – teekaart

Eesmärk: palkmaja materjalikulu ja tootmisandmed otse mõõtudest, ilma Revitis modelleerimata.

## Tehtud

- Arvutusmootor (`packages/calc-engine`): seinad, viilud, uksed/aknad, vundament, põrand, katus, pärlinid.
  Kalibreeritud 8 Viktra Revit-joonise järgi (`DEVIATIONS.md`, `test/revit-houses.test.ts`).
- Seinamudel ja **lõikenimekiri** seinte kaupa, tähised nagu Revitis (`src/wall-model.ts`,
  `test/wall-model.test.ts` – 5 maja × 4 seina tükk tüki haaval).
- Veebirakendus (`apps/web`, Angular Material): kalkulaator, joonised mõõtjoontega, sisselogimine,
  majade salvestamine ja jagamine, ettevõtte hinnakiri, uste/akende kataloog ja arvutuse seaded.
- Backend (`apps/api`, PHP 8 + MySQL): kliendid (tenant), kasutajad, rollid, majad, jagamine.

## Järgmised sammud

1. **Seinamudel kasutajaliideses** – avade sein/kaugus/aknalaua kõrgus, joonis mudelist, vaheleht „Lõikenimekiri“ (prinditav).
2. **Vabakujuline plaan** – seinte graaf: vaheseinad, L-kuju, terrass/veranda, mitu viilu.
   Testjuhtumid Revit-joonistest: Nora I (garaaž, keskviil), Boden II (veranda, magamislava), Lund (terrass, viiluga vahesein).
3. **Kasutajate haldus (admin)** – kasutajate lisamine, rollid, parooli lähtestamine, välja lülitamine
   (backend `/api/users` olemas, puudub kasutajaliides) + **sisselogimiste logi** (kes, millal, IP, brauser).
4. **3D vaade** samast mudelist (Three.js).
5. Google'i sisselogimine; PDF-pakkumised.

## Pikaajaline eesmärk: CNC-/masinafailid

Ideaalis väljastab LogCalc **masinafailid, et maja saaks kohe tootmisse saata**.

Selleks peab seinamudel hoidma iga palgi kohta geomeetriat, mitte ainult pikkust:
- nurgaliidete sälkude asukoht ja tüüp (otsatükk vs avade vaheline tükk on juba eristatud);
- avade lõiked, ülemiste palkide (TL) ja viilupalkide nurk-/kaldlõiked;
- profiil (tapp/soon), puurimised/kinnitused.

Lõikenimekiri on vahekiht, millest saab hiljem genereerida nt **BTL/BTLx** (design2machine) või
masinaspetsiifilise formaadi. Enne formaadi valikut: selgitada, mis masinaga tootja töötab.
