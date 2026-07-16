// Abschnitts-Gruppierung der Zutatenliste — 1:1 aus der alten App
// (index.html Z. 2883-2903): Zutaten in Originalreihenfolge, Sektions-
// Header bei Wechsel, Kommentar-Zeilen inline, Zwischensumme pro Sektion
// (nur wenn > 1 Zutat), TEIG GESAMT am Ende.

export const SECTION_KEYS = ['quellstück', 'kochstück', 'hefestück', 'sauerteig', 'vorteig', 'brühstück', 'früchte'];

export const getSec = (z) => {
  if (!z.bemerkung) return 'Hauptteig';
  const bLow = z.bemerkung.toLowerCase();
  const found = SECTION_KEYS.find((k) => bLow.includes(k));
  return found ? z.bemerkung.split('–')[0].trim() : (z.bemerkung.trim() || 'Hauptteig');
};

export const getSecClass = (sec) => {
  const sl = sec.toLowerCase();
  if (sl.includes('sauer')) return 'sec-sauer';
  if (sl.includes('vor')) return 'sec-vor';
  if (sl.includes('quell')) return 'sec-quell';
  if (sl.includes('koch')) return 'sec-koch';
  if (sl.includes('brüh')) return 'sec-brueh';
  if (sl.includes('früchte') || sl.includes('frucht')) return 'sec-frucht';
  return sec !== 'Hauptteig' ? 'sec-custom' : 'sec-haupt';
};

// Mengen-Format der Zutatenliste (Original Z. 2897):
// >= 1kg: "1,25 kg" · >= 10g: "250 g" · >= 1g: "5.5 g" · > 0: "0.25 g"
export function fmtMengeListe(gExact) {
  if (gExact >= 1000) return `${(gExact / 1000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
  if (gExact >= 10) return `${Math.round(gExact)} g`;
  if (gExact >= 1) return `${gExact.toFixed(1)} g`;
  if (gExact > 0) return `${gExact.toFixed(2)} g`;
  return '';
}

// Sektionssummen-Format (Original Z. 2888)
export function fmtSektionsSumme(sumKg) {
  const sg = sumKg * 1000;
  if (sg >= 1000) return `${sumKg.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
  if (sg >= 10) return `${Math.round(sg)} g`;
  return `${sg.toFixed(1)} g`;
}

// Gruppiert Rezept-Zutaten + skalierte Mengen in Sektionen fuer die Anzeige.
// Rueckgabe: [{ name, cls, rows: [{typ:'zutat'|'kommentar', zutat, idx, kg, mengeStr, dosenStr}], sum, count }]
export function gruppiereZutaten(rezept, skaliert) {
  const sections = [];
  let cur = null;

  const open = (name) => {
    cur = { name, cls: getSecClass(name), rows: [], sum: 0, count: 0 };
    sections.push(cur);
  };

  rezept.zutaten.forEach((z, idx) => {
    if (z.name.toLowerCase() === 'gesamt') return;
    const sec = z.ist_kommentar ? (cur?.name || 'Hauptteig') : getSec(z);
    if (!cur || sec !== cur.name) open(sec);

    if (z.ist_kommentar) {
      cur.rows.push({ typ: 'kommentar', zutat: z, idx });
      return;
    }

    const kg = skaliert[idx] || 0;
    const gExact = kg * 1000;
    cur.sum += kg;
    cur.count++;

    let mengeStr = fmtMengeListe(gExact);
    let dosenStr = null;
    if (z.einheit === 'dose' && z.dosen_gewicht_g > 0 && gExact > 0) {
      const dosen = Math.round((gExact / z.dosen_gewicht_g) * 10) / 10;
      dosenStr = dosen.toLocaleString('de-DE') + (dosen === 1 ? ' Dose' : ' Dosen');
    }
    if (mengeStr) cur.rows.push({ typ: 'zutat', zutat: z, idx, kg, mengeStr, dosenStr });
  });

  return sections.filter((s) => s.rows.length > 0);
}
