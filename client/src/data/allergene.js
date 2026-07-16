// EU-14-Allergene & Zutat-Allergen-Mapping (LMIV / VO (EU) 1169/2011)
// 1:1 aus Rezeptrechner/index.html Z. 4827-4915 (EU_ALLERGENE, ZUTAT_ALLERGENE)
// und Z. 2690-2694 (ALLERGEN_NAMEN). Werte NICHT verändern — lebensmittelrechtlich relevant.

export const EU_ALLERGENE = {
  A: { name: 'Glutenhaltiges Getreide', sub: { a:'Weizen', b:'Roggen', c:'Gerste', d:'Hafer', e:'Dinkel', f:'Kamut', g:'Emmer', h:'Einkorn' }},
  B: { name: 'Krebstiere' },
  C: { name: 'Eier' },
  D: { name: 'Fisch' },
  E: { name: 'Erdnüsse' },
  F: { name: 'Sojabohnen' },
  G: { name: 'Milch (inkl. Laktose)' },
  H: { name: 'Schalenfrüchte', sub: { a:'Mandeln', b:'Haselnüsse', c:'Walnüsse', d:'Cashewnüsse', e:'Pecannüsse', f:'Paranüsse', g:'Pistazien', h:'Macadamianüsse' }},
  I: { name: 'Sellerie' },
  J: { name: 'Senf' },
  K: { name: 'Sesamsamen' },
  L: { name: 'Schwefeldioxid/Sulfite' },
  M: { name: 'Lupinen' },
  N: { name: 'Weichtiere' }
};

// Allergen-Bezeichnungen für Anzeige (Kurzform, nur Hauptcodes)
export const ALLERGEN_NAMEN = {
  'A':'Gluten','B':'Krebstiere','C':'Eier','D':'Fisch','E':'Erdnüsse',
  'F':'Soja','G':'Milch','H':'Schalenfrüchte','I':'Sellerie','J':'Senf',
  'K':'Sesam','L':'Sulfite','M':'Lupinen','N':'Weichtiere'
};

// Allergen-Mapping für Zutaten (Buchstabe = EU-Allergen-Code)
export const ZUTAT_ALLERGENE = {
  // ═══ GLUTENHALTIGES GETREIDE ═══
  // Weizen (Aa)
  'weizenmehl': ['Aa'], 'weizenmehl 405': ['Aa'], 'weizenmehl 550': ['Aa'], 'weizenmehl 812': ['Aa'],
  'weizenmehl 1050': ['Aa'], 'weizenmehl 1600': ['Aa'], 'weizenvollkornmehl': ['Aa'],
  'weizengrieß': ['Aa'], 'weizendunst': ['Aa'], 'weizenkleie': ['Aa'], 'weizenbackschrot': ['Aa'],
  'weizenschrot': ['Aa'], 'hartweizengrieß': ['Aa'], 'paniermehl': ['Aa'], 'semmelbrösel': ['Aa'],
  'altbrot': ['Aa'], 'weizengluten': ['Aa'],
  // Roggen (Ab)
  'roggenmehl': ['Ab'], 'roggenmehl 815': ['Ab'], 'roggenmehl 997': ['Ab'], 'roggenmehl 1150': ['Ab'],
  'roggenmehl 1370': ['Ab'], 'roggenvollkornmehl': ['Ab'], 'roggenschrot': ['Ab'],
  'roggenschrot fein': ['Ab'], 'roggenschrot mittel': ['Ab'], 'roggenkleie': ['Ab'],
  'roggenflocken': ['Ab'], 'roggenkörner': ['Ab'], 'roggenmalz': ['Ab'],
  'roggensauerteig': ['Ab'], 'sauerteig': ['Ab'],
  // Gerste (Ac)
  'gerstenmehl': ['Ac'], 'gerste': ['Ac'], 'gerstenmalz': ['Ac'], 'malz': ['Ac'], 'backmalz': ['Ac'], 'eismalz': ['Ac'],
  // Hafer (Ad)
  'hafermehl': ['Ad'], 'haferflocken': ['Ad'], 'haferkleie': ['Ad'], 'haferkerne': ['Ad'], 'hafer': ['Ad'],
  // Dinkel (Ae)
  'dinkelmehl': ['Ae'], 'dinkelmehl 630': ['Ae'], 'dinkelmehl 812': ['Ae'], 'dinkelmehl 1050': ['Ae'],
  'dinkelvollkornmehl': ['Ae'], 'dinkelruchmehl': ['Ae'], 'dinkelschrot': ['Ae'],
  'dinkelflocken': ['Ae'], 'dinkelkörner': ['Ae'], 'dinkelsauerteig': ['Ae'],
  // Kamut (Af)
  'kamutmehl': ['Af'], 'kamut': ['Af'],
  // Emmer (Ag)
  'emmermehl': ['Ag'], 'emmer': ['Ag'],
  // Einkorn (Ah)
  'einkornmehl': ['Ah'], 'einkorn': ['Ah'],
  // ═══ EIER (C) ═══
  'eier': ['C'], 'eigelb': ['C'], 'eiweiß': ['C'], 'vollei': ['C'], 'eierlikör': ['C'], 'flüssigei': ['C'],
  // ═══ MILCH (G) ═══
  'milch': ['G'], 'vollmilch': ['G'], 'buttermilch': ['G'], 'sahne': ['G'], 'butter': ['G'], 'butterschmalz': ['G'],
  'joghurt': ['G'], 'quark': ['G'], 'frischkäse': ['G'], 'käse': ['G'], 'milchpulver': ['G'], 'magermilchpulver': ['G'],
  'kondensmilch': ['G'], 'saure sahne': ['G'], 'schmand': ['G'], 'crème fraîche': ['G'], 'mascarpone': ['G'],
  'molkenpulver': ['G'], 'laktose': ['G'],
  // ═══ SCHALENFRÜCHTE (H) ═══
  'mandeln': ['Ha'], 'marzipan': ['Ha'], 'marzipanrohmasse': ['Ha'], 'mandelmehl': ['Ha'],
  'haselnüsse': ['Hb'], 'haselnussmus': ['Hb'], 'nougat': ['Hb'],
  'walnüsse': ['Hc'],
  'cashewkerne': ['Hd'], 'cashew': ['Hd'],
  'pekannüsse': ['He'], 'pekan': ['He'],
  'paranüsse': ['Hf'],
  'pistazien': ['Hg'],
  'macadamia': ['Hh'], 'macadamianüsse': ['Hh'],
  // ═══ ERDNÜSSE (E) ═══
  'erdnüsse': ['E'], 'erdnussbutter': ['E'],
  // ═══ SOJA (F) ═══
  'sojabohnen': ['F'], 'sojamehl': ['F'], 'sojalecithin': ['F'], 'sojaöl': ['F'], 'tofu': ['F'], 'sojaschrot': ['F'],
  // ═══ SESAM (K) ═══
  'sesam': ['K'], 'sesamöl': ['K'], 'sesamkörner': ['K'],
  // ═══ SENF (J) ═══
  'senf': ['J'], 'senfkörner': ['J'], 'senfpulver': ['J'],
  // ═══ SELLERIE (I) ═══
  'sellerie': ['I'], 'selleriesalz': ['I'],
  // ═══ LUPINEN (M) ═══
  'lupinen': ['M'], 'lupinenmehl': ['M'],
  // ═══ SULFITE (L) ═══
  'trockenfrüchte geschwefelt': ['L'], 'rosinen geschwefelt': ['L'],
  // ═══ KEINE ALLERGENE ═══
  // Diese Zutaten haben explizit KEINE der 14 EU-Allergene
  'wasser': [], 'salz': [], 'zucker': [], 'honig': [], 'rübensirup': [],
  'sonnenblumenkerne': [], 'kürbiskerne': [], 'leinsamen': [], 'chiasamen': [], 'mohn': [],
  'sonnenblumenöl': [], 'rapsöl': [], 'olivenöl': [], 'öl': [], 'fett': [], 'schweineschmalz': [],
  'hefe': [], 'frischhefe': [], 'trockenhefe': [], 'backpulver': [],
  'kümmel': [], 'koriander': [], 'fenchel': [], 'anis': [], 'zimt': [], 'pfeffer': [],
  'brotgewürz': [], 'tiroler brotgewürz': [], 'schabziger klee': [],
  'kürbis': [], 'kürbiswürfel': [], 'karottenstifte': [], 'rote bete': [], 'süßkartoffel': [],
  'kartoffelflocken': [], 'rosinen': [], 'sultaninen': [], 'orangensaft': [],
  'buchweizenmehl': [], 'buchweizenvollmehl': [], 'maismehl': [], 'reismehl': [], 'hopfenmehl': [],
  'backerbse': [], 'aroma': []
};
