// Rezept-Normalisierung — 1:1 aus der alten App (index.html Z. 2259).
// Wird beim Import verwendet, damit alle Felder typisiert/mit Defaults
// belegt sind (wie die Alt-App es beim Laden tat).

const num = (v, fallback = 0) => {
  if (v == null || v === '') return fallback;
  const n = Number(String(v).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
};
const nid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const mkRezept = (d) => ({
  ...d,
  id: d.id || nid(),
  name: d.name || 'Neues Rezept',
  kategorie: d.kategorie || 'Brot',
  aktiv: d.aktiv !== false,
  berechnung: d.berechnung || ((d.kategorie || 'Brot') === 'Kuchen' ? 'blech' : 'stueck'),
  blech_breite_cm: num(d.blech_breite_cm, 0),
  blech_laenge_cm: num(d.blech_laenge_cm, 0),
  zutaten: (d.zutaten || []).map((z) => ({
    ...z,
    name: z.name || '',
    menge_kg: num(z.menge_kg, 0),
    ist_mehl: !!z.ist_mehl,
    ist_wasser: !!z.ist_wasser,
    ist_kommentar: !!z.ist_kommentar,
    bemerkung: z.bemerkung || '',
    fuer_produkte: z.fuer_produkte || [],
    zusatz_prozent: num(z.zusatz_prozent, 0),
    menge_pro_presse: num(z.menge_pro_presse, 0),
    einheit: z.einheit || '',
    dosen_gewicht_g: num(z.dosen_gewicht_g, 0),
  })),
  produkte: (d.produkte || []).map((p) => ({
    ...p,
    name: p.name || 'Produkt',
    gewicht_g: num(p.gewicht_g, 500),
    stueck_pro_presse: Math.trunc(num(p.stueck_pro_presse, 0)),
  })),
  bonOptionen: d.bonOptionen ? { ...d.bonOptionen } : null,
  stueckgewicht_g: num(d.stueckgewicht_g, 1000),
  min_stueck: Math.trunc(num(d.min_stueck, 1)),
  max_stueck: Math.trunc(num(d.max_stueck, 999)),
  // Abweichung vom Original (Bug dort): mkRezept verwarf backverlust_pct,
  // obwohl Excel-Import/-Export das Feld transportieren — hier erhalten.
  backverlust_pct: num(d.backverlust_pct, null),
  teigtemp_c: num(d.teigtemp_c, 26),
  kz_langsam: Math.trunc(num(d.kz_langsam, 5)),
  kz_schnell: Math.trunc(num(d.kz_schnell, 8)),
  stockgare: Math.trunc(num(d.stockgare, 30)),
  stueckgare: Math.trunc(num(d.stueckgare, 45)),
  back_ober: Math.trunc(num(d.back_ober, 230)),
  back_unter: Math.trunc(num(d.back_unter, 230)),
  backzeit: Math.trunc(num(d.backzeit, 35)),
  bedampfung: !!d.bedampfung,
  bedampf_hinweis: d.bedampf_hinweis || '',
  anmerkungen: d.anmerkungen || '',
  erstellt: d.erstellt || new Date().toLocaleDateString('de-DE'),
});
