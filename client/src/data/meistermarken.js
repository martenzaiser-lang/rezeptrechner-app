// Meistermarken/CSM-Produkte — LMIV-konforme Daten aus Hersteller-PDFs
// 1:1 aus Rezeptrechner/index.html Z. 4930-5130 (MEISTERMARKEN_DATEN).
// Quelle: CSM Ingredients Produktspezifikationen (Downloads/meistermarken/).
// Pro Produkt: gesetzl. Bezeichnung, Zutatenverzeichnis (LMIV-konform mit
// Allergen-Hervorhebung), Allergene (EU-Codes), Nährwerte pro 100g.
// WICHTIG: Wir verkaufen UNVERPACKTE Ware (LMIDV § 3-4) – Allergen-
// kennzeichnung ist Pflicht, Nährwerte/Zutaten freiwillig aber müssen korrekt sein.
// Allergen-Codes: A=Gluten (Aa=Weizen, Ab=Roggen, Ac=Gerste, Ad=Hafer,
//   Ae=Dinkel, Af=Kamut, Ag=Emmer, Ah=Einkorn), B=Krebstiere, C=Eier,
//   D=Fisch, E=Erdnüsse, F=Soja, G=Milch, H=Schalenfrüchte (Ha=Mandeln,
//   Hb=Haselnuss, Hc=Walnuss, ...), I=Sellerie, J=Senf, K=Sesam,
//   L=Sulfite, M=Lupinen, N=Weichtiere.

export const MEISTERMARKEN_DATEN = {
  'sahnessa vanille': {
    produkt: 'Meister Sahnessa Vanille', art_nr: '10101944',
    bezeichnung: 'Sahnestandmittel',
    zutaten_lmiv: 'Zucker; <b>VollMILCHpulver</b>; Gelatine; <b>MagerMILCHpulver</b>; Traubenzucker; Modifizierte Stärke; Extrahierte Vanilleschote; Speisesalz; Natürliches Bourbon-Vanille Aroma.',
    allergene: ['G'], spuren: ['A','C','F','H','K'],
    kcal:404, eiweiss:15.4, fett:3.6, gfs:2.2, kh:77.3, zucker:75.4, ballaststoffe:0.4, salz:0.503
  },
  'sahnessa schoko': {
    produkt: 'Meister Sahnessa Schoko', art_nr: '10101951',
    bezeichnung: 'Sahnestandmittel',
    zutaten_lmiv: 'Zucker; Fettarmes Kakaopulver (16%); Gelatine; Kakaopulver (8,0%); <b>VollMILCHpulver</b>; Traubenzucker; Modifizierte Stärke; Speisesalz; Natürliches Bourbon-Vanille Aroma; Aroma.',
    allergene: ['G'], spuren: ['A','C','F','H','K'],
    kcal:384, eiweiss:15.7, fett:4.7, gfs:2.9, kh:65.2, zucker:61.2, ballaststoffe:7.6, salz:0.3842
  },
  'sahnessa erdbeer': {
    produkt: 'Meister Sahnessa Erdbeer', art_nr: '10101959',
    bezeichnung: 'Sahnestandmittel',
    zutaten_lmiv: 'Zucker; Traubenzucker; Maltodextrin; Gelatine; Getrocknete Erdbeerstückchen (3,1%); Erdbeerpulver (3%); Säuerungsmittel: Citronensäure; Modifizierte Stärke; Aroma; Farbstoff: Betenrot; Speisesalz; Verdickungsmittel: Natriumalginat.',
    allergene: [], spuren: ['A','C','F','G','H','K'],
    kcal:375, eiweiss:6.1, fett:0.1, gfs:0.0, kh:84.7, zucker:73.7, ballaststoffe:0.9, salz:0.2791
  },
  'sahnessa himbeer': {
    produkt: 'Meister Sahnessa Himbeer', art_nr: '10273409',
    bezeichnung: 'Sahnestandmittel',
    zutaten_lmiv: 'Zucker; Traubenzucker; Maltodextrin; Getrocknete Himbeerstückchen (6,1%); Gelatine; Aroma; Modifizierte Stärke; Säuerungsmittel: Citronensäure; Himbeeren getrocknet (2,3%); Farbstoff: Betenrot; Verdickungsmittel: Natriumalginat.',
    allergene: [], spuren: ['A','C','G','H'],
    kcal:372, eiweiss:6.0, fett:0.2, gfs:0.1, kh:82.6, zucker:67.1, ballaststoffe:1.9, salz:0.1050
  },
  'sahnessa zitrone': {
    produkt: 'Meister Sahnessa Zitrone', art_nr: '10273698',
    bezeichnung: 'Sahnestandmittel',
    zutaten_lmiv: 'Zucker; Traubenzucker; Modifizierte Stärke; Gelatine; <b>SüßMOLKENpulver</b>; Zitronensaftpulver (2,5%); Maltodextrin; Natürliches Zitronenaroma mit anderen natürlichen Aromen; Säuerungsmittel: Citronensäure; Orangensaftpulver; Färberdistelextrakt; Speisesalz; Natürliches Zitronenaroma; Natürliches Aroma.',
    allergene: ['G'], spuren: ['A','C','H'],
    kcal:372, eiweiss:6.3, fett:0.1, gfs:0.0, kh:84.2, zucker:74.7, ballaststoffe:0.5, salz:0.3369
  },
  'sahnessa neutral': {
    produkt: 'Meister Sahnessa Neutral', art_nr: '10101941',
    bezeichnung: 'Sahnestandmittel',
    zutaten_lmiv: 'Traubenzucker; Zucker; Gelatine; Glukosesirup, getrocknet; <b>SüßMOLKENpulver</b>; Modifizierte Stärke; Säuerungsmittel: Citronensäure.',
    allergene: ['G'], spuren: ['A','C','F','H'],
    kcal:381, eiweiss:11.2, fett:0.0, gfs:0.0, kh:83.9, zucker:74.8, ballaststoffe:0.0, salz:0.1499
  },
  'sahnessa käse-sahne': {
    produkt: 'Meister Sahn Käse-Sahne', art_nr: '10101937',
    bezeichnung: 'Sahnestandmittel',
    zutaten_lmiv: 'Zucker; Traubenzucker; <b>MagerMILCH-Frischkäsepulver</b> (15%); Gelatine; Modifizierte Stärke; Aroma; Säuerungsmittel: Citronensäure; Verdickungsmittel: Xanthan; Speisesalz.',
    allergene: ['G'], spuren: ['A','C','F','H'],
    kcal:377, eiweiss:11.1, fett:0.2, gfs:0.2, kh:80.9, zucker:74.4, ballaststoffe:0.2, salz:0.4831
  },
  'backtivat krapfen-creme': {
    produkt: 'Backtivat Krapfen-Creme PO SG', art_nr: '10106086',
    bezeichnung: 'Backkrem für die Herstellung von Berlinern, Krapfen und Hefefeinteigen',
    zutaten_lmiv: '<b>MILCHzucker</b>; Palmfett; Emulgator: Mono- und Diglyceride von Speisefettsäuren, Mono- und Diacetylweinsäureester von Mono- und Diglyceriden von Speisefettsäuren; Jodiertes Speisesalz (Speisesalz; Kaliumjodat); Maisquellmehl; Zucker; Pflanzliche Öle: Raps, Sonnenblume; Stabilisator: Diphosphate; <b>WEIZENkleber</b>; <b>WEIZENquellmehl</b>; Natürliches Aroma; Mehlbehandlungsmittel: Ascorbinsäure; <b>WEIZENmehl</b>; Enzyme; Stickstoff.',
    allergene: ['Aa','G'], spuren: ['C'],
    kcal:556, eiweiss:2.2, fett:40.7, gfs:19.5, kh:44.3, zucker:38.3, ballaststoffe:0.8, salz:8.407
  },
  'delfia effekt': {
    produkt: 'Delfia Effekt', art_nr: '10171610',
    bezeichnung: 'Geliermittel für Tortenguss',
    zutaten_lmiv: 'Verdickungsmittel: Carrageen, Johannisbrotkernmehl; Traubenzucker; Säureregulator: Natriumcitrate, Kaliumphosphate; Säuerungsmittel: Citronensäure; Geliermittel: Pektine; Stabilisator: Calciumphosphate.',
    allergene: [], spuren: ['A','C','F','G','H'],
    vegan: true,
    kcal:236, eiweiss:0.2, fett:0.0, gfs:0.0, kh:29.4, zucker:29.7, ballaststoffe:25.5, salz:10.5045
  },
  'delfia effekt erdbeer': {
    produkt: 'Delfia Effekt Erdbeer', art_nr: '10171613',
    bezeichnung: 'Geliermittel',
    zutaten_lmiv: 'Verdickungsmittel: Carrageen, Johannisbrotkernmehl; Säureregulator: Natriumcitrate, Kaliumphosphate; Traubenzucker; Säuerungsmittel: Citronensäure; Geliermittel: Pektine; Farbstoff: Betenrot; Holunderbeerkonzentrat; Stabilisator: Calciumphosphate; Aroma; Karamellzucker; Maltodextrin.',
    allergene: [], spuren: ['A','C','F','G','H'],
    vegan: true,
    kcal:243, eiweiss:0.4, fett:0.0, gfs:0.0, kh:31.0, zucker:26.4, ballaststoffe:25.1, salz:10.4651
  },
  'maitre croissant': {
    produkt: 'Meister Maitre Croissant fin PO MB', art_nr: '10101890',
    bezeichnung: 'Margarine (Ziehmargarine für Croissant/Plunder)',
    zutaten_lmiv: 'Pflanzliche Fette: Palm, Ganz gehärtetes Palm; Pflanzliche Öle: Raps, Palm; Wasser; Emulgator: Mono- und Diglyceride von Speisefettsäuren, Polyglycerinester von Speisefettsäuren, Lecithine; Speisesalz; Säureregulator: Citronensäure, Natriumcitrate; Natürliches Aroma; Antioxidationsmittel: Alpha-Tocopherol.',
    allergene: [], spuren: [],
    vegan: true, glutenfrei: true, laktosefrei: true,
    kcal:721, eiweiss:0.0, fett:80.0, gfs:39.7, kh:0.0, zucker:0.0, ballaststoffe:0.0, salz:0.5618
  },
  'rühr & easy': {
    produkt: 'Meister Rühr & Easy PO SG', art_nr: '10270553',
    bezeichnung: 'Backmischung (für Blechkuchen und Schnitten)',
    zutaten_lmiv: '<b>WEIZENstärke</b>; Zucker; Glukosesirup, getrocknet; Modifizierte Stärke; Emulgator: Mono- und Diglyceride von Speisefettsäuren, Polyglycerinester von Speisefettsäuren; <b>EIklarpulver</b>; Reisstärke; Stabilisator: Diphosphate; Backtriebmittel: Natriumcarbonate; Speisesalz; Aroma; Verdickungsmittel: Xanthan; Farbstoff: Carotin.',
    allergene: ['Aa','C'], spuren: ['F','G'],
    kcal:387, eiweiss:3.4, fett:4.7, gfs:3.7, kh:82.5, zucker:44.8, ballaststoffe:0.3, salz:2.5563
  },
  'sl-creme': {
    produkt: 'Meister SL-Creme', art_nr: '10176299',
    bezeichnung: 'Halbfabrikat (pasteurisierte Pflanzenfett-Creme zum Verdünnen)',
    zutaten_lmiv: 'Pflanzliche Öle und Fette (Sonnenblume; Palm; Kokos; Ganz gehärtetes Palm; Teilweise gehärtetes Palm); Wasser; Traubenzucker; Zucker; Ei-Mischung (<b>VollEI</b>; <b>EIgelb</b>); <b>MILCHzucker</b>; Emulgator: Mono- und Diglyceride von Speisefettsäuren, Lecithine; Stabilisator: Carrageen; Aroma; Farbstoff: Carotin.',
    allergene: ['C','G'], spuren: [],
    kcal:516, eiweiss:0.7, fett:45.6, gfs:20.9, kh:25.7, zucker:25.8, ballaststoffe:0.0, salz:0.0202
  },
  'saftbinder 100': {
    produkt: 'Meister Saftbinder 100', art_nr: '10106096',
    bezeichnung: 'Saftbinder (kaltwasserquellende modifizierte Stärke)',
    zutaten_lmiv: 'Modifizierte Stärke.',
    allergene: [], spuren: ['A','C','F','G','H'],
    vegan: true,
    kcal:373, eiweiss:0.1, fett:0.1, gfs:0.0, kh:93.0, zucker:0.0, ballaststoffe:0.0, salz:1.3
  },
  'saftin kirsch': {
    produkt: 'Meister Saftin Kirsch', art_nr: '10101930',
    bezeichnung: 'Saftbinder (für Fruchtfüllungen Kirsch)',
    zutaten_lmiv: 'Modifizierte Stärke; Zucker; Traubenzucker; Verdickungsmittel: Carrageen, Pektine; Maltodextrin; Sauerkirschpulver (1,5%); Säuerungsmittel: Citronensäure; Stabilisator: Calciumphosphate, Natriumphosphate, Diphosphate; Aroma; Holunderbeerkonzentrat.',
    allergene: [], spuren: ['A','C','F','G','H'],
    vegan: true,
    kcal:366, eiweiss:0.2, fett:0.1, gfs:0.0, kh:88.9, zucker:55.3, ballaststoffe:3.2, salz:0.5819
  },
  'variopan': {
    produkt: 'Meister Variopan PO SG', art_nr: '10101983',
    bezeichnung: 'Gebäckfüllmasse (mit feinem Mandelgeschmack)',
    zutaten_lmiv: 'Zucker; Pflanzliche Fette: Palm, Ganz gehärtetes Palm; <b>MOLKENERzeugnis</b>; <b>MagerMILCHpulver</b>; Modifizierte Stärke; <b>WEIZENmehl</b>; <b>WEIZENgrieß</b>; Erbsenprotein; Glukosesirup, getrocknet; Kartoffelflocken; <b>MANDELpulver</b>; <b>EIklarpulver</b>; Glukosesirup; Emulgator: Mono- und Diglyceride von Speisefettsäuren, Essigsäureester von Mono- und Diglyceriden von Speisefettsäuren; <b>MILCHeiweiß</b>; Aroma; Karottenkonzentrat; Backtriebmittel: Natriumcarbonate, Diphosphate; Speisesalz.',
    allergene: ['Aa','C','G','Ha'], spuren: ['F','H','M'],
    kcal:446, eiweiss:9.3, fett:13.1, gfs:9.0, kh:72.4, zucker:55.1, ballaststoffe:0.7, salz:0.496
  },
  'sp back': {
    produkt: 'SP Back CL PO MB', art_nr: '10185313',
    bezeichnung: 'Margarine (Backmargarine Stange)',
    zutaten_lmiv: 'Palmfett; Wasser; Emulgator: Mono- und Diglyceride von Speisefettsäuren, Palmöl; Säureregulator: Citronensäure.',
    allergene: [], spuren: [],
    vegan: true, glutenfrei: true, laktosefrei: true,
    kcal:720, eiweiss:0.0, fett:80.0, gfs:39.9, kh:0.0, zucker:0.0, ballaststoffe:0.0, salz:0.0
  },
  'sp ziehplatte': {
    produkt: 'SP Ziehplatte CL PO MB', art_nr: '10216847',
    bezeichnung: 'Margarine (Ziehmargarine für Plunder/Blätterteig)',
    zutaten_lmiv: 'Palmfett; Pflanzliche Öle: Rübsen, Palm; Wasser; Speisesalz; Säureregulator: Citronensäure; Emulgator: Mono- und Diglyceride von Speisefettsäuren.',
    allergene: [], spuren: [],
    vegan: true, glutenfrei: true, laktosefrei: true,
    kcal:720, eiweiss:0.0, fett:80.0, gfs:37.6, kh:0.0, zucker:0.0, ballaststoffe:0.0, salz:0.3934
  },
  'eisella mohn': {
    produkt: 'Meister eisella Mohn', art_nr: '10089927',
    bezeichnung: 'Grundstoff für Mohn-Gebäckmassen',
    zutaten_lmiv: 'Mohnsamen (55%); Zucker; Maisquellmehl; <b>WEIZENgrieß</b>; <b>EIklarpulver</b>; Honigpulver (Maltodextrin; Honig); Emulgator: Mono- und Diglyceride von Speisefettsäuren; <b>VollMILCHpulver</b>; Verdickungsmittel: Natriumalginat; Säureregulator: Natriumacetate; Speisesalz; Aroma; Antioxidationsmittel: Stark tocopherolhaltige Extrakte.',
    allergene: ['Aa','C','G'], spuren: ['F','H','M'],
    kcal:460, eiweiss:13.9, fett:23.9, gfs:4.1, kh:40.0, zucker:28.1, ballaststoffe:14.1, salz:0.9127
  },
  'eiweiß mix': {
    produkt: 'Meister Eiweiß Mix', art_nr: '10089870',
    bezeichnung: 'Grundstoff für Eiweiß- und Schaummassen',
    zutaten_lmiv: '<b>HühnerEIklarpulver</b>; Zucker; Modifizierte Stärke; Säuerungsmittel: Citronensäure; Antioxidationsmittel: Ascorbinsäure.',
    allergene: ['C'], spuren: ['A','F','G','H'],
    kcal:365, eiweiss:39.9, fett:0.0, gfs:0.0, kh:50.8, zucker:33.0, ballaststoffe:0.1, salz:1.6408
  },
  'kakaoglasur chips': {
    produkt: 'Meister Dreistand Kakaoglasur Chips PO MB (Goldbiskin Super)', art_nr: '10101836',
    bezeichnung: 'Kakaohaltige Fettglasur',
    zutaten_lmiv: 'Zucker; Pflanzliches Fett, ganz gehärtet: Palmkern; Fettarmes Kakaopulver (18%); Kokosfett; Emulgator: Sonnenblumenlecithine; Aroma.',
    allergene: [], spuren: ['F','G'],
    vegan: true, glutenfrei: true,
    kcal:577, eiweiss:4.4, fett:40.1, gfs:38.1, kh:46.2, zucker:43.9, ballaststoffe:6.7, salz:0.08
  },
  'homann back': {
    produkt: 'Homann Back PO MB', art_nr: '10096412',
    bezeichnung: 'Margarine (für Mürb-Hefeteige und Streusel)',
    zutaten_lmiv: 'Palmfett; Pflanzliche Öle: Raps, Sonnenblume; Wasser; Speisesalz; Emulgator: Lecithine, Mono- und Diglyceride von Speisefettsäuren; Natürliches Aroma; Säureregulator: Citronensäure; Farbstoff: Carotin.',
    allergene: [], spuren: [],
    vegan: true, glutenfrei: true, laktosefrei: true,
    kcal:720, eiweiss:0.0, fett:80.0, gfs:41.4, kh:0.0, zucker:0.0, ballaststoffe:0.0, salz:0.59
  },
  'homann creme': {
    produkt: 'Homann Creme PO MB', art_nr: '10096417',
    bezeichnung: 'Margarine (für Fettkrems/Spritzgebäck)',
    zutaten_lmiv: 'Pflanzliche Fette: Palm, Kokos, Ganz gehärtetes Palm; Wasser; Pflanzliche Öle: Raps, Sonnenblume, Palm; Emulgator: Mono- und Diglyceride von Speisefettsäuren, Lecithine; Speisesalz; Säureregulator: Citronensäure.',
    allergene: [], spuren: [],
    vegan: true, glutenfrei: true, laktosefrei: true,
    kcal:720, eiweiss:0.0, fett:80.0, gfs:47.5, kh:0.0, zucker:0.0, ballaststoffe:0.0, salz:0.1033
  },
  'käsekuchen-basis': {
    produkt: 'Meister Käsekuchen-Basis', art_nr: '10089853',
    bezeichnung: 'Grundstoff für Quarkgebäcke',
    zutaten_lmiv: 'Zucker; Modifizierte Stärke; Traubenzucker; <b>MOLKENERzeugnis</b>; <b>MagerMILCHjoghurtpulver</b>; <b>WEIZENstärke</b>; <b>EIklarpulver</b>; <b>WEIZENkleber</b>; Speisesalz; Säureregulator: Natriumacetate, Citronensäure; Aroma.',
    allergene: ['Aa','C','G'], spuren: ['F','H','M'],
    kcal:375, eiweiss:5.8, fett:0.2, gfs:0.1, kh:87.4, zucker:65.1, ballaststoffe:0.0, salz:0.952
  },
  'meister biskuit': {
    produkt: 'Meister Biskuit', art_nr: '10101741',
    bezeichnung: 'Backmischung (Biskuit-Böden, -Kapseln, Rouladen)',
    zutaten_lmiv: 'Zucker; <b>WEIZENmehl</b>; <b>WEIZENstärke</b>; Glukosesirup, getrocknet; Backtriebmittel: Natriumcarbonate, Diphosphate, Kaliumtartrate; Emulgator: Milchsäureester von Mono- und Diglyceriden von Speisefettsäuren, Polyglycerinester von Speisefettsäuren; <b>MagerMILCHpulver</b>; Modifizierte Stärke; Verdickungsmittel: Xanthan; Speisesalz; Aroma; Natürliches Zitronenaroma mit anderen natürlichen Aromen; Karottenkonzentrat; Kurkuma.',
    allergene: ['Aa','G'], spuren: ['C','F'],
    kcal:376, eiweiss:3.3, fett:2.1, gfs:1.8, kh:85.0, zucker:43.2, ballaststoffe:1.1, salz:1.1891
  },
  'creme gourmet': {
    produkt: 'Meister Creme Gourmet', art_nr: '10101778',
    bezeichnung: 'Kaltcremepulver (für Füllkrems)',
    zutaten_lmiv: 'Zucker; <b>SAHNEpulver</b> (20%); Modifizierte Stärke; Pflanzliches Fett: Ganz gehärtetes Kokos; Glukosesirup; <b>EIgelbpulver</b>; Emulgator: Milchsäureester von Mono- und Diglyceriden von Speisefettsäuren; <b>MILCHeiweiß</b>; Verdickungsmittel: Carrageen; Geliermittel: Natriumalginat; Stabilisator: Calciumsulfat, Diphosphate; Speisesalz; Traubenzucker; Natürliches Aroma; Karottenkonzentrat; Kurkuma.',
    allergene: ['C','G'], spuren: ['A','F','H','M'],
    kcal:509, eiweiss:6.0, fett:25.4, gfs:20.2, kh:63.7, zucker:47.3, ballaststoffe:1.0, salz:1.0606
  },
  'leichtcreme': {
    produkt: 'Meister Leichtcreme', art_nr: '10089909',
    bezeichnung: 'Cremepulver (für leichte, lockere Füllkrems)',
    zutaten_lmiv: 'Zucker; Modifizierte Stärke; <b>MagerMILCHpulver</b>; Pflanzliche Fette: Ganz gehärtetes Palm, Palm; Maltodextrin; <b>MILCHzucker</b>; Emulgator: Mono- und Diglyceride von Speisefettsäuren, Milchsäureester von Mono- und Diglyceriden von Speisefettsäuren; Verdickungsmittel: Carrageen, Natriumalginat; <b>MILCHeiweiß</b>; Stabilisator: Calciumsulfat, Diphosphate, Kaliumphosphate; Speisesalz; Traubenzucker; Kurkuma; Karottenextrakt; Aroma (enthält <b>MILCH</b>).',
    allergene: ['G'], spuren: ['A','C','F','H','M'],
    kcal:430, eiweiss:4.8, fett:9.8, gfs:9.2, kh:80.2, zucker:63.1, ballaststoffe:0.9, salz:0.9938
  }
};
