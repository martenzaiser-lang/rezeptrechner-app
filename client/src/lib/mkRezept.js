// Rezept-Normalisierung — 1:1 aus der alten App (index.html Z. 2259).
// Wird beim Import verwendet, damit alle Felder typisiert/mit Defaults
// belegt sind (wie die Alt-App es beim Laden tat).

const nid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const mkRezept = (d) => ({
  id: d.id || nid(),
  name: d.name || 'Neues Rezept',
  kategorie: d.kategorie || 'Brot',
  aktiv: d.aktiv !== false,
  berechnung: d.berechnung || ((d.kategorie || 'Brot') === 'Kuchen' ? 'blech' : 'stueck'),
  blech_breite_cm: parseFloat(d.blech_breite_cm) || 0,
  blech_laenge_cm: parseFloat(d.blech_laenge_cm) || 0,
  zutaten: (d.zutaten || []).map((z) => ({
    name: z.name || '',
    menge_kg: parseFloat(z.menge_kg) || 0,
    ist_mehl: !!z.ist_mehl,
    ist_wasser: !!z.ist_wasser,
    ist_kommentar: !!z.ist_kommentar,
    bemerkung: z.bemerkung || '',
    fuer_produkte: z.fuer_produkte || [],
    zusatz_prozent: parseFloat(z.zusatz_prozent) || 0,
    menge_pro_presse: parseFloat(z.menge_pro_presse) || 0,
    einheit: z.einheit || '',
    dosen_gewicht_g: parseFloat(z.dosen_gewicht_g) || 0,
  })),
  produkte: (d.produkte || []).map((p) => ({
    name: p.name || 'Produkt',
    gewicht_g: parseFloat(p.gewicht_g) || 500,
    stueck_pro_presse: parseInt(p.stueck_pro_presse) || 0,
  })),
  bonOptionen: d.bonOptionen ? { ...d.bonOptionen } : null,
  stueckgewicht_g: parseFloat(d.stueckgewicht_g) || 1000,
  min_stueck: parseInt(d.min_stueck) || 1,
  max_stueck: parseInt(d.max_stueck) || 999,
  teigtemp_c: parseFloat(d.teigtemp_c) || 26,
  kz_langsam: parseInt(d.kz_langsam) || 5,
  kz_schnell: parseInt(d.kz_schnell) || 8,
  stockgare: parseInt(d.stockgare) || 30,
  stueckgare: parseInt(d.stueckgare) || 45,
  back_ober: parseInt(d.back_ober) || 230,
  back_unter: parseInt(d.back_unter) || 230,
  backzeit: parseInt(d.backzeit) || 35,
  bedampfung: !!d.bedampfung,
  bedampf_hinweis: d.bedampf_hinweis || '',
  anmerkungen: d.anmerkungen || '',
  erstellt: d.erstellt || new Date().toLocaleDateString('de-DE'),
});
