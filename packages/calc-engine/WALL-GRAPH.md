# Seinte graaf (vabakujuline plaan)

Eesmärk: suvaline täisnurkne põhiplaan (L-kuju, vaheseinad, terrass, veranda, garaaž, keskviil) ühest
mudelist: materjalid, lõikenimekiri, joonised, hiljem 3D ja CNC. Otsus 2026-11-24: täielik graaf,
sisestus plaanil joonistades koos täpsete mm-väljadega.

## Mudel

**Plaan = graaf.** Sõlmed `(x, y)` mm = palgi **kesktelg** (mitte välispind), seinad sõlmede vahel,
ainult täisnurgad (x- või y-suunas). Seina kõrvalt vaadates kulgeb x sõlmest `a` sõlme `b` poole.

- Seina **suund** määrab ridade nihke: laiuse suunas (x) seinad algavad poole palgiga (BL),
  sügavuse suunas (y) seinad täispalgiga – nii nagu kõigis Viktra joonistel. Ristuvad seinad vahelduvad ½ palki.
- **Liide** = koht, kus teine sein seda seina ristub või puudutab (L-nurk, T, X). Liite kohal on palgil
  sälk; seina otsas ulatub palk liitest edasi `cornerOverhang` (100) + ½ paksust – ka T-liites läbib
  vahesein välisseina ja ulatub 100 välja (kinnitatud). Sälk tekib ainult ridades, kus ristuval seinal
  liite kohal palk on (nt keskviil sälgub külgseina ainult ülemistes ridades).
- **Pikk sein**: palk max 6 m (`maxLogLength`); pikem jätkatakse vaheseina kohalt, read vaheliti eri
  vaheseintes (kinnitatud). Viktra Gable Sauna 3 (250x760, viktra.ee joonis 92503059): 7800 külgsein
  jätkatud otsapidi vaheseinte **kesktelgedel** (2580 / 4580), BL ja paaris read keskele lähemas
  vaheseinas, paaritud read ja TL teises – mudel annab täpselt samad tükid.
- **Poole palgiga algus**: plaani valik `halfStart` – tavaliselt x-suunas seinad (Nora, Lund, Boden),
  Gable Sauna 3-l hoopis pikad seinad A/B.
- **Seina vaade (elevation)** = palgiread alt üles miinus **tühjad alad** (ristkülikud seina koordinaatides):
  uksed, aknad, lahtine osa (terrass/veranda), piirde vahed, „ainult viil“ alumine osa.
  Lõikenimekiri: iga rida lõigatakse tühjade aladega tükkideks; tüki **sälkude arv** = liidete arv tüki sees
  (0 = avade vahel, 1 = otsatükk/post, 2+ = läbiv palk). Sama pikkuse, profiili ja sälkude arvuga tükid on
  üks detail (nagu Revitis).
- **Katus** määrab seinte ülaosa: viiluseinad saavad kolmnurga (viilupalgid), räästaseinad lõpevad räästa
  kõrgusel, pikemad ülemised palgid ulatuvad üle otsa (varikatus/veranda).

Kontrollitud näited (Revit, `Vanad joonised/andmed`):

| Maja | Mida mudel peab katma |
|---|---|
| Nora I | sein 2 = ainult viil + tõmbepalk; garaažiuks (sein 1: kaks 410 posti + sillus) |
| Boden II | sein 1 = ainult viil (veranda); sein 3 = 2 palki üleval; A/B ülemised 3 palki ulatuvad 900 ette |
| Lund | sein 1 = terrassi raam (piire + vahepalgid, 300 nurgapostid, sillus, viil); X-liited seinaga 2; A/B terrassi osa piirdega |

## Etapid

1. ✅ **Mootori tuum** – üldine seinavaade (read, tühjad alad, liited, lõikenimekiri) + graafi andmemudel.
   Ristküliku maja läbi graafi annab täpselt sama tulemuse mis praegu (5 Revit-maja regressioon).
2. ✅ **Seinatüübid ja -osad** (`PlanWall`): `topOnly` (ainult viil/tõmbepalk/lae serv), `gable`, `height`
   (post, piire), `open` (lahtine osa), `railings` (piire vahepalkidega); liite kõrgusvahemik (sälk ainult
   ridades, kus ristuval seinal palk on); max palk 6 m -> jätk vaheseina kohal, read vaheliti.
   Kontroll: Nora, Boden, Lund tükk tüki haaval (`test/graph-houses.test.ts`, erinevused D13–D15).
3. **Plaanieditor** – SVG plaan: seinte joonistamine (täisnurk, haaramine), sõlmede lohistamine,
   valitud seina paneel täpsete väljadega (pikkus, tüüp, avad), mõõtketid muudetavad. Mallid: ristkülik,
   garaaž, veranda, terrass, L-kuju.
4. **Katus ja põrand graafist** – mitu katusemahtu (L-kuju: orgu), viilud graafist; ruumid (graafi tahud)
   -> põrand ja vundament ruumide kaupa.
5. **3D vaade** samast mudelist; seejärel CNC (BTL/BTLx).
