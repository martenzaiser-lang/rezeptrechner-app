// IREKS-Produkte — LMIV-konforme Daten aus IREKS-Qualitätszertifikaten
// Quelle: PDFs unter Downloads/ireks/ (Stand der Zertifikate: 02.07.2026),
// Text per pypdf extrahiert, Werte manuell übertragen und stichprobengeprüft.
// Gleiches Format wie MEISTERMARKEN_DATEN (meistermarken.js):
// Nährwerte pro 100g (8-Feld: kcal, eiweiss, fett, gfs, kh, zucker,
// ballaststoffe, salz), zutaten_lmiv mit <b>Allergen</b>-Markierung,
// allergene/spuren als EU-Codes (siehe allergene.js).
//
// Kodierung: enthaltene Allergene mit Sub-Codes (Aa=Weizen, Ab=Roggen,
// Ac=Gerste, Ad=Hafer, wie MEISTERMARKEN_DATEN). Spuren ("° Spuren nicht
// auszuschließen" im Zertifikat) ebenfalls mit Sub-Codes, wenn das PDF die
// Getreideart einzeln nennt — formatAllergene() löst Sub-Codes korrekt auf.
//
// Anmerkungen zu Einzelwerten:
// - 'Weizenback 1856' und 'Lievito Madre Dolce': Salz laut PDF "< 0,01 g"
//   → als 0.01 (Obergrenze) übernommen.
// - Alle kcal-Werte direkt aus dem PDF (dort steht kJ UND kcal).

export const IREKS_DATEN = {
  'Mella Sandbiskuit': {
    produkt: 'IREKS MELLA-SANDBISKUIT', art_nr: '107400',
    bezeichnung: 'Premix für alle Sand- und Biskuitmassen im All-in-Verfahren',
    zutaten_lmiv: '<b>WEIZENstärke</b>; <b>WEIZENmehl</b>; Glukosesirup; Emulgator E 477, E 472b, E 471, E 470a; Backtriebmittel E 450, E 500; Salz; <b>SüßMOLKENpulver</b>; <b>MILCHeiweiß</b>; Aroma; färbendes Lebensmittel Paprika- und Curcumaextrakt; Enzyme.',
    allergene: ['Aa','G'], spuren: ['Ab','Ac','Ad','C'],
    kcal:368, eiweiss:3.0, fett:6.6, gfs:6.4, kh:73.8, zucker:3.7, ballaststoffe:0.5, salz:4.5
  },
  'Stabilase': {
    produkt: 'IREKS STABILASE', art_nr: '109300',
    bezeichnung: 'Backmittel zur Verbesserung von Gärstabilität, Volumen und Frischhaltung',
    zutaten_lmiv: '<b>WEIZENkleber</b>; Mehlbehandlungsmittel Ascorbinsäure; Enzyme.',
    allergene: ['Aa'], spuren: ['Ab','Ac','Ad','C','G'],
    kcal:399, eiweiss:71.9, fett:6.4, gfs:1.2, kh:12.4, zucker:0.5, ballaststoffe:1.6, salz:0.20
  },
  'Classic Baguette': {
    produkt: 'IREKS CLASSIC-BAGUETTE', art_nr: '130100',
    bezeichnung: 'Backmittel für Baguette/-brötchen und Weißbrotspezialitäten',
    zutaten_lmiv: '<b>WEIZENmehl</b>; getrockneter <b>WEIZENvorteig</b> (<b>WEIZENmehl</b>, Hefe); Salz; Stabilisator E 412, E 466; <b>WEIZENmalzmehl</b>; getrockneter <b>WEIZEN-Natursauerteig</b> (<b>WEIZENmehl</b>, Starterkulturen); Säureregulator E 450, E 263, E 341; Emulgator E 472e; <b>WEIZENkleber</b>; Dextrose; Rapsöl; Mehlbehandlungsmittel Ascorbinsäure; Enzyme (alpha-Amylase, Xylanase).',
    allergene: ['Aa'], spuren: ['Ab','Ac','Ad','C','G'],
    kcal:248, eiweiss:8.7, fett:2.5, gfs:1.3, kh:39.1, zucker:1.9, ballaststoffe:13.9, salz:21.0
  },
  'Panitop Roggen': {
    produkt: 'IREKS PANITOP-ROGGEN', art_nr: '132000',
    bezeichnung: 'Sauerteig-Backmittel für Roggen- und Roggenmischbrot',
    zutaten_lmiv: 'getrockneter <b>ROGGENsauerteig</b> (<b>ROGGENmehl</b>, Starterkulturen); <b>WEIZENkleber</b>; Emulgator E 471; <b>ROGGENquellmehl</b>; Salz; Mehlbehandlungsmittel Ascorbinsäure; Enzyme.',
    allergene: ['Aa','Ab'], spuren: ['Ac','Ad','C','F','G'],
    kcal:379, eiweiss:36.4, fett:9.1, gfs:6.0, kh:27.6, zucker:1.3, ballaststoffe:9.1, salz:1.8
  },
  'Eiszeit': {
    produkt: 'IREKS EISZEIT', art_nr: '132200',
    bezeichnung: 'Backmittel für malzig-aromatisches Kleingebäck, speziell für moderne Kälteführungen',
    zutaten_lmiv: '<b>WEIZENmalzmehl</b>; Stabilisator E 412, E 466; Zucker; Malzextrakt (<b>GERSTENmalz</b>, Wasser); Emulgator E 472e; <b>WEIZENmehl</b>; Säureregulator E 450, E 341; Dextrose; Aroma; Mehlbehandlungsmittel Ascorbinsäure; Enzyme.',
    allergene: ['Aa','Ac'], spuren: ['Ab','Ad','C','G','J'],
    kcal:327, eiweiss:5.6, fett:6.7, gfs:3.5, kh:48.6, zucker:25.7, ballaststoffe:16.9, salz:3.2
  },
  'Mella Berliner Supersoft': {
    produkt: 'IREKS MELLA-BERLINER-SUPERSOFT', art_nr: '133700',
    bezeichnung: 'Premix für softig-zarte Berliner und Siedegebäckspezialitäten',
    zutaten_lmiv: '<b>WEIZENmehl</b>; Stärke; Rapsöl; <b>SüßMOLKENpulver</b>; Zucker; Emulgator E 471, E 472e, <b>SOJAlecithin</b>; <b>MILCHzucker</b>; Salz; <b>HühnerEIweiß getrocknet</b>; Palmöl; Aroma; Säureregulator E 341; färbendes Lebensmittel Paprika- und Curcumaextrakt; Mehlbehandlungsmittel Ascorbinsäure, L-Cystein; Enzyme.',
    allergene: ['Aa','C','F','G'], spuren: ['Ab','Ac','Ad'],
    kcal:411, eiweiss:10.8, fett:11.1, gfs:2.0, kh:65.5, zucker:7.7, ballaststoffe:2.4, salz:1.4
  },
  'Weizenback 1856': {
    produkt: 'IREKS WEIZENBACK 1856', art_nr: '136600',
    bezeichnung: 'Backmittel für Gebäckspezialitäten und Weizengebäcke nach mediterraner Art',
    zutaten_lmiv: 'getrockneter <b>WEIZENsauerteig</b> (<b>WEIZENmehl</b>, Starterkulturen); getrockneter <b>WEIZENvorteig</b> (<b>WEIZENmehl</b>, Hefe); <b>HARTWEIZENgrieß</b>; <b>WEIZENkleber</b>; Mehlbehandlungsmittel Ascorbinsäure; Enzyme.',
    allergene: ['Aa'], spuren: ['Ab','Ac','Ad','C','G'],
    // Salz laut PDF "< 0,01 g" — Obergrenze angesetzt
    kcal:359, eiweiss:18.6, fett:1.8, gfs:0.6, kh:64.0, zucker:1.4, ballaststoffe:3.5, salz:0.01
  },
  'Mella Bourbon-Vanillekrem': {
    produkt: 'IREKS MELLA-BOURBON-VANILLEKREM', art_nr: '140200',
    bezeichnung: 'Vanille-Kaltkrempulver für Back-, Füll- und Butterkrem',
    zutaten_lmiv: 'Zucker; modifizierte Stärke; <b>VollMILCHpulver</b>; Verdickungsmittel E 401; natürliches Bourbon-Vanillearoma; Salz; färbendes Lebensmittel Karottenextrakt.',
    allergene: ['G'], spuren: ['A','C'],
    kcal:405, eiweiss:4.7, fett:5.0, gfs:3.8, kh:85.0, zucker:59.7, ballaststoffe:0.7, salz:0.77
  },
  'Lievito Madre Dolce': {
    produkt: 'IREKS LIEVITO MADRE DOLCE', art_nr: '141000',
    bezeichnung: 'Cuvée für zart-schmelzende Hefefeinteig-Spezialitäten mit Lievito Madre (italienischer Weizensauerteig)',
    zutaten_lmiv: 'Zucker; getrockneter <b>WEIZENsauerteig</b> [<b>WEIZENmehl</b>, Anstellgut (<b>WEIZENmehl</b>, Wasser)]; <b>HARTWEIZENmehl</b>; <b>WEIZENkleber</b>; <b>WEIZENmalzmehl</b>; Enzyme.',
    allergene: ['Aa'], spuren: ['Ab','Ac','Ad','C','F','G'],
    // Salz laut PDF "< 0,01 g" — Obergrenze angesetzt
    kcal:389, eiweiss:8.7, fett:1.0, gfs:0.3, kh:85.4, zucker:60.4, ballaststoffe:1.5, salz:0.01
  }
};

// Synonym-Map: Zutatennamen-Schreibweisen → Key in IREKS_DATEN.
// Kleingeschriebene Selbst-Einträge, damit Lookup per name.toLowerCase()
// funktioniert (die IREKS-Keys sind — anders als bei MEISTERMARKEN_DATEN —
// gemischt geschrieben). Schreibweisen aus echten Rezept-Zutaten
// (app_daten_dump.json): 'Eiszeit', 'Stabilase', 'Classic Baguette',
// 'Classis Baguette', 'Baguette-Backmittel', 'Panitop - Roggen',
// 'Berliner SuperSoft', 'Lievito Madre Dolce'.
// ACHTUNG, bewusst NICHT aufgenommen:
// - 'Mella HT SuperSoft' (Dump) = anderes IREKS-Produkt, kein Zertifikat vorhanden
// - 'Biskuit-Mehl' (Dump) = mehrdeutig (könnte auch CSM Meister Biskuit sein)
// - 'lievito madre' allein = echter Weizensauerteig, nicht das IREKS-Produkt
export const IREKS_SYNONYME = {
  // Mella Sandbiskuit (107400)
  'mella sandbiskuit':'Mella Sandbiskuit','mella-sandbiskuit':'Mella Sandbiskuit',
  'sandbiskuit':'Mella Sandbiskuit','ireks sandbiskuit':'Mella Sandbiskuit',
  // Stabilase (109300)
  'stabilase':'Stabilase','ireks stabilase':'Stabilase',
  // Classic Baguette (130100)
  'classic baguette':'Classic Baguette','classis baguette':'Classic Baguette',
  'klassik baguette':'Classic Baguette','baguette classic':'Classic Baguette',
  'baguette-backmittel':'Classic Baguette','baguette backmittel':'Classic Baguette',
  'classic-baguette':'Classic Baguette',
  // Panitop Roggen (132000)
  'panitop roggen':'Panitop Roggen','panitop - roggen':'Panitop Roggen',
  'panitop-roggen':'Panitop Roggen','panitop':'Panitop Roggen',
  // Eiszeit (132200)
  'eiszeit':'Eiszeit','ireks eiszeit':'Eiszeit','eis zeit':'Eiszeit','eiszeit backmittel':'Eiszeit',
  // Mella Berliner Supersoft (133700)
  'mella berliner supersoft':'Mella Berliner Supersoft','mella-berliner-supersoft':'Mella Berliner Supersoft',
  'berliner supersoft':'Mella Berliner Supersoft',
  // Weizenback 1856 (136600)
  'weizenback 1856':'Weizenback 1856','weizenback':'Weizenback 1856','ireks weizenback':'Weizenback 1856',
  // Mella Bourbon-Vanillekrem (140200)
  'mella bourbon-vanillekrem':'Mella Bourbon-Vanillekrem','mella-bourbon-vanillekrem':'Mella Bourbon-Vanillekrem',
  'bourbon-vanillekrem':'Mella Bourbon-Vanillekrem','bourbon vanillekrem':'Mella Bourbon-Vanillekrem',
  'vanillekrem':'Mella Bourbon-Vanillekrem','mella vanillekrem':'Mella Bourbon-Vanillekrem',
  // Lievito Madre Dolce (141000)
  'lievito madre dolce':'Lievito Madre Dolce','ireks lievito madre':'Lievito Madre Dolce',
  'madre dolce':'Lievito Madre Dolce'
};
