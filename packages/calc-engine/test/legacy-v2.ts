/**
 * Vana v2 (htdocs/v2/JS/script.js) seinte arvutuse SÕNA-SÕNALINE ülekanne võrdlusaluseks.
 * Allikad: moodud() r.105, arvuta() r.271, arvuta2() r.297, arvutaUus() r.475, pikemLaudSum2() r.635,
 * uksedSum() r.773, aknadSum() r.843.
 *
 * Globaalsed muutujad on tehtud lokaalseks; DOM-i väljund on eemaldatud. Valemid on muutmata,
 * v.a. `partial` parameeter, millega saab osalise rea liikme (v2: 1/murdosa) asendada.
 */
export interface LegacyInput {
  viilKatus: boolean;
  misPikkus: 'palk' | 'sise' | 'valis';
  cab_width: number;
  cab_depth: number;
  heightSide: number;
  heightFb: number;
  roofHeight: number;
  palgiPaksus: number;
  palgiKorgus: number;
  pikemadLauad?: { pikkus: number; korgus: number; kogus: number }[];
  uksed?: { ukselaius: number; uksekorgus: number; kogus: number }[];
  aknad?: { laius: number; korgus: number; kogus: number }[];
}

/** v2 algne osalise rea liige: palgiKorgus/(palgiKorgus*murdosa) */
export const legacyPartial = (palgiKorgus: number, h: number) =>
  palgiKorgus / (palgiKorgus * (h / palgiKorgus - Math.floor(h / palgiKorgus)));

export function legacyWalls(
  i: LegacyInput,
  partial: (palgiKorgus: number, h: number) => number = legacyPartial,
) {
  const { viilKatus, heightSide, heightFb, roofHeight, palgiPaksus, palgiKorgus } = i;
  // moodud()
  let width: number, depth: number;
  if (i.misPikkus == 'sise') {
    width = i.cab_width + 280;
    depth = i.cab_depth + 280;
  } else if (i.misPikkus == 'valis') {
    width = i.cab_width + 200;
    depth = i.cab_depth + 200;
  } else {
    width = i.cab_width;
    depth = i.cab_depth;
  }

  // pikemLaudSum2()
  let pikemadLauadJooksvadMeetrid = 0, pikemadLauadArv = 0, pikemadLauad114jm = 0, pikemadLauad114Arv = 0;
  for (const l of i.pikemadLauad ?? []) {
    if (l.korgus > 114) {
      pikemadLauadJooksvadMeetrid += l.pikkus * l.kogus;
      pikemadLauadArv += l.kogus;
    } else if (l.korgus <= 114) {
      pikemadLauad114jm += (l.pikkus * l.kogus) / 1000;
      pikemadLauad114Arv += l.kogus;
    }
  }
  pikemadLauadJooksvadMeetrid = Number(pikemadLauadJooksvadMeetrid) / 1000;
  let pikemadLauad114LisaKulu: number;
  if (viilKatus) {
    pikemadLauad114LisaKulu = Number(pikemadLauad114jm - (pikemadLauad114Arv * depth) / 1000);
  } else {
    pikemadLauad114LisaKulu = Number(pikemadLauad114jm - (pikemadLauad114Arv * width) / 1000);
  }

  // uksedSum() / aknadSum()
  let uksedJooksvadMeetrid = 0;
  for (const u of i.uksed ?? []) uksedJooksvadMeetrid += (u.ukselaius * Math.ceil(u.uksekorgus / palgiKorgus) * u.kogus) / 1000;
  let aknadJooksvadMeetrid = 0;
  for (const a of i.aknad ?? []) aknadJooksvadMeetrid += (a.laius * Math.ceil(a.korgus / palgiKorgus) * a.kogus) / 1000;

  // arvutaUus()
  let palgiPikkusKokku = 0;
  let gableJooksevMeeter = 0;
  const pikkused: number[] = [];
  if (viilKatus) {
    const gableLaudadeArv = Math.ceil((roofHeight - heightFb) / palgiKorgus);
    const gableArvutuslikLaius = width - 2 * (100 + palgiPaksus);
    const gableArvutuslikKorgus = roofHeight - heightSide;
    for (let k = 1; k <= gableLaudadeArv; k++) {
      const palkTipust = (gableLaudadeArv + 1 - k) * palgiKorgus;
      const palgiPikkus = k === 1 ? width : gableArvutuslikLaius * (palkTipust / gableArvutuslikKorgus);
      pikkused.push(palgiPikkus);
      palgiPikkusKokku += palgiPikkus;
    }
  } else {
    const kolmnurkLaudadeArv = Math.ceil((heightFb - (roofHeight - palgiKorgus / 2)) / palgiKorgus);
    const kolmnurkArvutuslikLaius = depth - (2 * 100 + palgiPaksus);
    const kolmnurkArvutuslikKorgus = ((heightFb - roofHeight) * (depth - (100 + palgiPaksus))) / kolmnurkArvutuslikLaius;
    const kolmnurgaKorgendus = kolmnurkArvutuslikKorgus - (heightFb - roofHeight);
    for (let k = 1; k <= kolmnurkLaudadeArv; k++) {
      const palkTipust = (kolmnurkLaudadeArv + 1 + -k) * palgiKorgus - palgiKorgus / 2 + kolmnurgaKorgendus;
      const palgiPikkus =
        k === 1 ? depth : kolmnurkArvutuslikLaius * (palkTipust / (kolmnurkArvutuslikKorgus - kolmnurgaKorgendus));
      pikkused.push(palgiPikkus);
      palgiPikkusKokku += palgiPikkus;
    }
  }
  // v2: gableJooksevMeeter = 2*Number(palgiPikkusKokku/1000).toFixed(2) – ümardus eemaldatud võrdluseks
  gableJooksevMeeter = (2 * palgiPikkusKokku) / 1000;

  // arvuta2()
  let jooksevMeeter: number, lahutatav: number;
  if (viilKatus) {
    const seinaPindala1jm =
      ((Math.floor(heightFb / palgiKorgus) * width) / 1000) * 2 + (partial(palgiKorgus, heightFb) * width) / 1000;
    lahutatav = heightSide / palgiKorgus == Math.floor(heightSide / palgiKorgus) ? 0 : 1;
    const seinaPindala2jm =
      ((Math.floor(heightSide / palgiKorgus) - lahutatav) * depth * 2) / 1000 + pikemadLauad114LisaKulu;
    jooksevMeeter = seinaPindala1jm + seinaPindala2jm + gableJooksevMeeter + pikemadLauadJooksvadMeetrid;
  } else {
    lahutatav = heightFb / palgiKorgus == Math.floor(heightFb / palgiKorgus) ? 0 : 1;
    const seinaPindala1jm =
      (Math.floor(heightFb / palgiKorgus - lahutatav) * width) / 1000 +
      (partial(palgiKorgus, heightFb) * width) / 1000 +
      pikemadLauad114LisaKulu / 2;
    lahutatav = roofHeight / palgiKorgus == Math.floor(roofHeight / palgiKorgus) ? 0 : 1;
    const seinaPindala2jm =
      (Math.floor(roofHeight / palgiKorgus - lahutatav) * width) / 1000 +
      (partial(palgiKorgus, roofHeight) * width) / 1000 +
      pikemadLauad114LisaKulu / 2;
    const seinaPindala3jm = (Math.floor((roofHeight - palgiKorgus / 2) / palgiKorgus) * depth * 2) / 1000;
    jooksevMeeter = seinaPindala1jm + seinaPindala2jm + seinaPindala3jm + gableJooksevMeeter + pikemadLauadJooksvadMeetrid;
  }
  const jooksevMeeterUksedAknad = jooksevMeeter - uksedJooksvadMeetrid - aknadJooksvadMeetrid;
  const tuuleliistud = viilKatus
    ? (4 * heightSide) / 1000
    : (2 * (heightFb - palgiKorgus)) / 1000 + (2 * (roofHeight - palgiKorgus)) / 1000;

  return { width, depth, jooksevMeeter, jooksevMeeterUksedAknad, gableJooksevMeeter, pikkused, tuuleliistud };
}

/**
 * Parandatud osalise rea liige (DEVIATIONS.md D1): v2 avaldises tähendab väärtus 2 "1 laud kummalegi seinale"
 * (viilkatus: 2 esi/tagaseina; ühekalle: (floor-1)+2 = floor+1 ühel seinal). Murdosa 0,5 korral on see
 * täpselt sama mis v2 1/murdosa.
 */
export const fixedPartial = (palgiKorgus: number, h: number) =>
  Math.abs(h / palgiKorgus - Math.round(h / palgiKorgus)) < 1e-9 ? 0 : 2;
