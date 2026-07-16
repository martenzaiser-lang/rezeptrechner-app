// Naehrwerte-Default-Datenbank (kcal, protein, carbs, fat + a: Allergen-Hauptcodes)
// 1:1 aus Rezeptrechner/index.html Z. 2570 ff. — Basis fuer getNaehrwert/calcNutrition
// (Baker-Quick-Chips). Nicht verwechseln mit ZUTAT_NAEHRWERTE (8-Feld, LMIV).

export const NAEHRWERTE_DEFAULT={
  // ═══ MEHLE (alle glutenhaltig = Allergen A) ═══
  'weizenmehl 405':{kcal:348,protein:10.0,carbs:72,fat:1.0,fiber:3.0,sugar:0.3,a:['A']},
  'weizenmehl 550':{kcal:342,protein:10.5,carbs:71,fat:1.0,fiber:3.5,sugar:0.3,a:['A']},
  'weizenmehl 812':{kcal:338,protein:11.0,carbs:69,fat:1.2,fiber:4.5,sugar:0.4,a:['A']},
  'weizenmehl 1050':{kcal:336,protein:11.5,carbs:68,fat:1.5,fiber:5.0,sugar:0.5,a:['A']},
  'weizenmehl 1600':{kcal:326,protein:12.0,carbs:64,fat:1.8,fiber:8.0,sugar:0.6,a:['A']},
  'weizenvollkornmehl':{kcal:320,protein:12.0,carbs:62,fat:2.0,fiber:10.0,sugar:0.8,a:['A']},
  'weizenschrot':{kcal:315,protein:11.5,carbs:60,fat:2.0,fiber:11.0,sugar:0.8,a:['A']},
  'roggenmehl 815':{kcal:332,protein:8.0,carbs:70,fat:1.3,fiber:5.0,sugar:1.0,a:['A']},
  'roggenmehl 997':{kcal:326,protein:8.5,carbs:68,fat:1.5,fiber:6.5,sugar:1.0,a:['A']},
  'roggenmehl 1150':{kcal:338,protein:8.9,carbs:68,fat:1.3,fiber:7.7,sugar:1.1,a:['A']},
  'roggenmehl 1370':{kcal:316,protein:9.2,carbs:64,fat:1.6,fiber:10.0,sugar:1.2,a:['A']},
  'roggenvollkornmehl':{kcal:310,protein:9.5,carbs:62,fat:1.7,fiber:13.0,sugar:1.3,a:['A']},
  'roggenschrot':{kcal:305,protein:9.0,carbs:60,fat:1.6,fiber:14.0,sugar:1.2,a:['A']},
  'roggenschrot fein':{kcal:305,protein:9.0,carbs:60,fat:1.6,fiber:14.0,sugar:1.2,a:['A']},
  'roggenschrot mittel':{kcal:305,protein:9.0,carbs:60,fat:1.6,fiber:14.0,sugar:1.2,a:['A']},
  'dinkelmehl 630':{kcal:342,protein:12.4,carbs:69,fat:1.3,fiber:3.7,sugar:0.8,a:['A']},
  'dinkelmehl 812':{kcal:335,protein:12.5,carbs:67,fat:2.0,fiber:5.5,sugar:0.6,a:['A']},
  'dinkelmehl 1050':{kcal:330,protein:13.0,carbs:65,fat:2.2,fiber:7.0,sugar:0.7,a:['A']},
  'dinkelvollkornmehl':{kcal:324,protein:14.0,carbs:60,fat:2.5,fiber:9.0,sugar:0.9,a:['A']},
  'dinkelruchmehl':{kcal:328,protein:13.5,carbs:63,fat:2.3,fiber:8.0,sugar:0.8,a:['A']},
  'dinkelschrot':{kcal:320,protein:13.0,carbs:60,fat:2.4,fiber:10.0,sugar:0.9,a:['A']},
  'buchweizenmehl':{kcal:340,protein:9.0,carbs:71,fat:1.7,fiber:3.7,sugar:0.5,a:[]}, // glutenfrei
  'hafermehl':{kcal:370,protein:13.0,carbs:58,fat:7.0,fiber:10.0,sugar:1.0,a:['A']}, // Kontamination
  'maismehl':{kcal:353,protein:8.5,carbs:73,fat:2.8,fiber:3.9,sugar:0.6,a:[]}, // glutenfrei
  'reismehl':{kcal:360,protein:6.0,carbs:80,fat:1.0,fiber:2.4,sugar:0.2,a:[]}, // glutenfrei
  // ═══ WASSER & FLÜSSIGKEITEN ═══
  'wasser':{kcal:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0,a:[]},
  // ═══ MILCHPRODUKTE (Allergen G) ═══
  'milch':{kcal:64,protein:3.4,carbs:4.8,fat:3.5,fiber:0,sugar:4.8,a:['G']},
  'buttermilch':{kcal:38,protein:3.5,carbs:4.0,fat:0.5,fiber:0,sugar:4.0,a:['G']},
  'sahne':{kcal:309,protein:2.4,carbs:3.2,fat:31,fiber:0,sugar:3.2,a:['G']},
  'joghurt':{kcal:61,protein:3.5,carbs:4.0,fat:3.5,fiber:0,sugar:4.0,a:['G']},
  'quark':{kcal:67,protein:12.0,carbs:4.0,fat:0.3,fiber:0,sugar:4.0,a:['G']},
  'schmand':{kcal:240,protein:2.8,carbs:3.5,fat:24,fiber:0,sugar:3.5,a:['G']},
  // ═══ FETTE ═══
  'butter':{kcal:741,protein:0.7,carbs:0.6,fat:83,fiber:0,sugar:0.6,a:['G']}, // Milchprodukt
  'margarine':{kcal:722,protein:0.2,carbs:0.4,fat:80,fiber:0,sugar:0.4,a:[]},
  'sonnenblumenöl':{kcal:884,protein:0,carbs:0,fat:100,fiber:0,sugar:0,a:[]},
  'rapsöl':{kcal:884,protein:0,carbs:0,fat:100,fiber:0,sugar:0,a:[]},
  'olivenöl':{kcal:884,protein:0,carbs:0,fat:100,fiber:0,sugar:0,a:[]},
  'schweineschmalz':{kcal:897,protein:0,carbs:0,fat:99.5,fiber:0,sugar:0,a:[]},
  'fett':{kcal:884,protein:0,carbs:0,fat:100,fiber:0,sugar:0,a:[]},
  // ═══ SÜSSUNGSMITTEL ═══
  'zucker':{kcal:400,protein:0,carbs:100,fat:0,fiber:0,sugar:100,a:[]},
  'honig':{kcal:304,protein:0.4,carbs:75,fat:0,fiber:0,sugar:75,a:[]},
  'rübensirup':{kcal:290,protein:0.5,carbs:70,fat:0.1,fiber:0,sugar:70,a:[]},
  'malz':{kcal:320,protein:6.0,carbs:68,fat:1.5,fiber:3.0,sugar:40,a:['A']}, // Gerste=Gluten
  'backmalz':{kcal:320,protein:6.0,carbs:68,fat:1.5,fiber:3.0,sugar:40,a:['A']},
  'roggenmalz':{kcal:315,protein:5.5,carbs:67,fat:1.3,fiber:4.0,sugar:35,a:['A']},
  // ═══ EIER (Allergen C) ═══
  'eier':{kcal:154,protein:12.5,carbs:0.7,fat:11,fiber:0,sugar:0.7,a:['C']},
  'vollei':{kcal:154,protein:12.5,carbs:0.7,fat:11,fiber:0,sugar:0.7,a:['C']},
  'eigelb':{kcal:353,protein:16.0,carbs:0.3,fat:31,fiber:0,sugar:0.3,a:['C']},
  'eiweiß':{kcal:47,protein:11.0,carbs:0.7,fat:0.1,fiber:0,sugar:0.7,a:['C']},
  // ═══ TRIEBMITTEL ═══
  'hefe':{kcal:96,protein:16.7,carbs:1.1,fat:1.2,fiber:7.0,sugar:0,a:[]},
  'frischhefe':{kcal:96,protein:16.7,carbs:1.1,fat:1.2,fiber:7.0,sugar:0,a:[]},
  'trockenhefe':{kcal:325,protein:40.0,carbs:36,fat:7.0,fiber:20.0,sugar:0,a:[]},
  'backpulver':{kcal:90,protein:0,carbs:22,fat:0,fiber:0,sugar:0,a:[]},
  'natron':{kcal:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0,a:[]},
  // ═══ SAUERTEIGE (Gluten vom Mehl) ═══
  'sauerteig':{kcal:200,protein:6.0,carbs:40,fat:1.0,fiber:4.0,sugar:1.0,a:['A']},
  'roggensauerteig':{kcal:195,protein:5.5,carbs:39,fat:0.9,fiber:5.0,sugar:1.0,a:['A']},
  'weizensauerteig':{kcal:205,protein:6.5,carbs:41,fat:1.0,fiber:3.5,sugar:1.0,a:['A']},
  'dinkelsauerteig':{kcal:200,protein:6.0,carbs:40,fat:1.0,fiber:4.0,sugar:1.0,a:['A']},
  // ═══ SALZ & GEWÜRZE ═══
  'salz':{kcal:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0,a:[]},
  'kümmel':{kcal:375,protein:20.0,carbs:44,fat:15.0,fiber:38.0,sugar:0.6,a:[]},
  'koriander':{kcal:298,protein:12.0,carbs:13,fat:18.0,fiber:42.0,sugar:0,a:[]},
  'fenchel':{kcal:345,protein:16.0,carbs:36,fat:15.0,fiber:40.0,sugar:0,a:[]},
  'anis':{kcal:337,protein:18.0,carbs:35,fat:16.0,fiber:15.0,sugar:0,a:[]},
  'brotgewürz':{kcal:340,protein:15.0,carbs:38,fat:14.0,fiber:30.0,sugar:0.5,a:[]},
  'zimt':{kcal:247,protein:4.0,carbs:56,fat:1.2,fiber:53.0,sugar:2.2,a:[]},
  'kardamom':{kcal:311,protein:11.0,carbs:68,fat:6.7,fiber:28.0,sugar:0,a:[]},
  // ═══ KÖRNER & SAATEN ═══
  'sesam':{kcal:565,protein:18.0,carbs:10,fat:50,fiber:12.0,sugar:0.5,a:['K']}, // Allergen Sesam!
  'leinsamen':{kcal:488,protein:22.3,carbs:0,fat:36.5,fiber:27.0,sugar:0,a:[]},
  'sonnenblumenkerne':{kcal:584,protein:20.8,carbs:11.4,fat:51.5,fiber:8.6,sugar:2.6,a:[]},
  'kürbiskerne':{kcal:559,protein:30.0,carbs:5,fat:49,fiber:6.0,sugar:1.4,a:[]},
  'mohn':{kcal:487,protein:24.0,carbs:4.2,fat:42,fiber:20.0,sugar:0.1,a:[]}, // Blaumohn
  'chiasamen':{kcal:486,protein:17.0,carbs:8,fat:31,fiber:34.0,sugar:0,a:[]},
  // ═══ FLOCKEN ═══
  'haferflocken':{kcal:372,protein:13.5,carbs:59,fat:7.0,fiber:10.0,sugar:1.0,a:['A']}, // Glutenkontamination
  'haferkerne':{kcal:370,protein:12.0,carbs:60,fat:6.5,fiber:11.0,sugar:1.0,a:['A']},
  'dinkelflocken':{kcal:355,protein:14.0,carbs:67,fat:2.5,fiber:8.0,sugar:1.5,a:['A']},
  'dinkelkörner':{kcal:338,protein:15.0,carbs:63,fat:2.7,fiber:11.0,sugar:1.8,a:['A']},
  'roggenflocken':{kcal:335,protein:10.0,carbs:67,fat:1.7,fiber:14.0,sugar:1.0,a:['A']},
  'roggenkörner':{kcal:326,protein:9.5,carbs:65,fat:1.6,fiber:15.0,sugar:1.2,a:['A']},
  // ═══ NÜSSE (Allergen H = Schalenfrüchte) ═══
  'mandeln':{kcal:579,protein:21.2,carbs:6,fat:49.9,fiber:12.0,sugar:3.9,a:['H']},
  'haselnüsse':{kcal:628,protein:15.0,carbs:6,fat:61,fiber:10.0,sugar:4.3,a:['H']},
  'walnüsse':{kcal:654,protein:15.0,carbs:7,fat:65,fiber:6.0,sugar:2.6,a:['H']},
  'nüsse':{kcal:620,protein:15.0,carbs:7,fat:60,fiber:8.0,sugar:3.0,a:['H']},
  // ═══ TROCKENFRÜCHTE ═══
  'rosinen':{kcal:299,protein:2.5,carbs:68,fat:0.5,fiber:3.7,sugar:59,a:['L']}, // evtl. Sulfite
  'sultaninen':{kcal:320,protein:2.9,carbs:72,fat:0.9,fiber:5.4,sugar:65,a:['L']},
  'zitronat':{kcal:302,protein:0.3,carbs:73,fat:0.2,fiber:3.5,sugar:68,a:['L']},
  'orangeat':{kcal:302,protein:0.3,carbs:73,fat:0.2,fiber:3.5,sugar:68,a:['L']},
  // ═══ SONSTIGES ═══
  'marzipan':{kcal:460,protein:8.0,carbs:49,fat:26,fiber:2.0,sugar:40,a:['H']}, // Mandeln
  'schokolade':{kcal:546,protein:5.0,carbs:60,fat:31,fiber:5.0,sugar:50,a:['G']}, // oft Milch
  'kakao':{kcal:358,protein:20.0,carbs:11,fat:25,fiber:30.0,sugar:1.0,a:[]},
  'vanillezucker':{kcal:400,protein:0,carbs:100,fat:0,fiber:0,sugar:100,a:[]},
  'oliven':{kcal:123,protein:0.8,carbs:0.5,fat:13,fiber:3.0,sugar:0,a:[]},
  'kartoffelflocken':{kcal:350,protein:7.0,carbs:77,fat:0.5,fiber:6.0,sugar:3.0,a:[]},
  'altbrot':{kcal:265,protein:8.0,carbs:52,fat:1.5,fiber:5.0,sugar:2.0,a:['A']},
  'sojaschrot':{kcal:400,protein:42.0,carbs:10,fat:18,fiber:15.0,sugar:5.0,a:['F']}, // Soja-Allergen
  'lupinenschrot':{kcal:350,protein:38.0,carbs:12,fat:10,fiber:25.0,sugar:2.0,a:['M']}, // Lupinen-Allergen
  'weizengluten':{kcal:370,protein:75.0,carbs:14,fat:1.8,fiber:0.6,sugar:0.5,a:['A']},
  'orangensaft':{kcal:45,protein:0.7,carbs:10,fat:0.2,fiber:0.2,sugar:8.4,a:[]},
  'kürbis':{kcal:26,protein:1.0,carbs:5,fat:0.1,fiber:0.5,sugar:2.8,a:[]},
  'karottenstifte':{kcal:41,protein:0.9,carbs:8,fat:0.2,fiber:2.8,sugar:4.7,a:[]},
  'rote bete':{kcal:43,protein:1.6,carbs:8,fat:0.2,fiber:2.8,sugar:7.0,a:[]},
  'süßkartoffel':{kcal:86,protein:1.6,carbs:20,fat:0.1,fiber:3.0,sugar:4.2,a:[]},
  'aroma':{kcal:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0,a:[]},
  'backmittel':{kcal:300,protein:8.0,carbs:60,fat:2.0,fiber:3.0,sugar:10,a:['A']}, // meist glutenhaltig
};
// Allergen-Bezeichnungen für Anzeige
const ALLERGEN_NAMEN={
  'A':'Gluten','B':'Krebstiere','C':'Eier','D':'Fisch','E':'Erdnüsse',
  'F':'Soja','G':'Milch','H':'Schalenfrüchte','I':'Sellerie','J':'Senf',
  'K':'Sesam','L':'Sulfite','M':'Lupinen','N':'Weichtiere'
};
// Benutzerdefinierte Nährwerte (aus localStorage)
const NAEHRWERTE_DB='nw_custom';
