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
- Seinamudel kasutajaliideses: avade sein/kaugus/kõrgus põrandast, kopeerimine, külgvaated B/A, lõikenimekiri.
- **Kasutajate haldus** (`/kasutajad`, admin/superadmin): lisamine juhusliku algparooliga, nimi/roll,
  uus parool, välja lülitamine (seanss lõpeb kohe). **Sisselogimiste logi** (`auth_events`): sisse/välja,
  ebaõnnestunud (põhjusega), blokeeritud, halduse muudatused koos tegijaga, IP ja brauser; hoitakse 12 kuud
  (`auth_log_days`). „Minu konto“: parooli muutmine ja oma viimased sisselogimised. Test: `apps/api/tests/users.sh`.

## Järgmised sammud

1. **Vabakujuline plaan** – seinte graaf: vaheseinad, L-kuju, terrass/veranda, mitu viilu. Plaan ja etapid:
   `packages/calc-engine/WALL-GRAPH.md`. Etapid 1–2 (mootor: graaf, liited, seinatüübid, Nora/Boden/Lund = Revit) tehtud;
   järgmine: plaanieditor.
2. **3D vaade** samast mudelist (Three.js).
3. Google'i sisselogimine; PDF-pakkumised; parooli taastamine e-postiga (vajab e-posti saatmist serverist).

## Pikaajaline eesmärk: CNC-/masinafailid

Ideaalis väljastab LogCalc **masinafailid, et maja saaks kohe tootmisse saata**.

Selleks peab seinamudel hoidma iga palgi kohta geomeetriat, mitte ainult pikkust:
- nurgaliidete sälkude asukoht ja tüüp (otsatükk vs avade vaheline tükk on juba eristatud);
- avade lõiked, ülemiste palkide (TL) ja viilupalkide nurk-/kaldlõiked;
- profiil (tapp/soon), puurimised/kinnitused.

Lõikenimekiri on vahekiht, millest saab hiljem genereerida nt **BTL/BTLx** (design2machine) või
masinaspetsiifilise formaadi. Enne formaadi valikut: selgitada, mis masinaga tootja töötab.
