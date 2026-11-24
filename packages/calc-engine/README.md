# @logcalc/calc-engine

LogCalc arvutusmootor: maja mõõdud → materjalikulu (BOM) ja hind. Kirjutatud puhtas TypeScriptis, ilma DOM-i ja raamistikuta, nii et sama koodi saab kasutada Angularis, testides ja vajadusel serveris.

```ts
import { calculateHouse } from '@logcalc/calc-engine';

const r = calculateHouse(
  {
    roofType: 'gable',          // 'gable' = viilkatus, 'mono' = ühekaldeline
    lengthScenario: 'outer',    // 'log' | 'outer' | 'inner'
    width: 3000, depth: 4000,
    sideWallHeight: 2000, frontBackWallHeight: 2070, roofHeight: 3000,
    log: { thickness: 44, height: 145 },
    doors: [{ width: 900, height: 1900, count: 1 }],
    foundation: { joistWidth: 100, joistHeight: 150 },
    floor: { boardWidth: 95 },
    roof: {},                   // laua pikkus arvutatakse vaikimisi üleulatusest
    purlins: {},                // arv arvutatakse automaatselt
  },
  { prices: { seinaLauad: 1.33, katuseLauad: 0.69 } },
);

r.walls.netJm;   // seinalauad jm (avad maha arvatud)
r.bom;           // materjaliread koos tükkide ja hindadega
r.totalPrice;
r.warnings;
```

Kõik pikkused on millimeetrites ja kogused jooksvates meetrites. Väljundit ei ümardata, vormindamine on kasutajaliidese töö.

## Struktuur

| Fail | Sisu | v2 vaste |
|---|---|---|
| `src/geometry.ts` | Arvutuslikud mõõdud, viilu/kolmnurga palgid | `moodud()`, `arvutaUus()` |
| `src/walls.ts` | Seinte jm, pikemad lauad, uksed/aknad, pindala, ruumala, tuuleliistud | `arvuta2()`, `pikemLaudSum2()`, `uksedSum()`, `aknadSum()` |
| `src/foundation.ts` | Vundamendi prussid, põrandalauad | `lisaPorandVundament()`, `vundamentKirjuta()`, `porandKirjuta()` |
| `src/roof.ts` | Katuselauad, räästalauad, katuse nurk, pärlinid | `lisaKatus2()`, `lisakatusKirjuta()`, `lisaParlin2()`, `parlinNimekiri()` |
| `src/calculate.ts` | `calculateHouse()` – valideerimine, kõik kokku, BOM ja hind | `detailInfo()` |
| `src/constants.ts` | Varem kõvakodeeritud arvud | – |

- **[DEVIATIONS.md](DEVIATIONS.md)**: kus ja miks tulemus v2-st erineb (parandatud vead).
- **[QUESTIONS.md](QUESTIONS.md)**: kahtlased kohad, mis on jäetud nagu v2-s ja vajavad kinnitust.

## Käsud

```bash
npm install
npm test          # vitest
npm run typecheck
npm run build     # -> dist/
```

`test/legacy-v2.ts` on vana v2 seinavalemite sõna-sõnaline koopia. Testid kontrollivad, et uus mootor annab täpselt sama tulemuse, kui vana valemi parandatud osa (D1) asendada parandusega. Kõik muud erinevused oleksid testides näha.

## Järgmised sammud

1. Lisada testjuhtumid Revitis modelleeritud majadest (sisend + teadaolev materjalikulu).
2. Vastata [QUESTIONS.md](QUESTIONS.md) küsimustele ja parandada vastavalt.
3. Uus seinamudel (seinte graaf, seinatüübid, nurgaliited) ja palgipõhine lõikenimekiri. See on 3D vaate alus.
