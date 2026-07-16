// Excel-Roundtrip: Export → Parse → alle fachlichen Felder identisch.
// (XLSX.writeFile geht in Node nicht auf Platte-los — wir bauen das
// Workbook direkt und lesen es wieder ein.)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { parseStandardFormat } from './excel.js';
import { mkRezept } from './mkRezept.js';

const dump = JSON.parse(readFileSync('C:/Users/marte/Rezeptrechner/app_daten_dump.json', 'utf8'));

// Export-Logik wie exportExcel, aber als Workbook-Objekt (testbar)
function buildWorkbook(rezepte) {
  const wb = XLSX.utils.book_new();
  const rH = ['ID', 'Name', 'Kategorie', 'Aktiv', 'Fertiggewicht_g', 'Backverlust_pct', 'Min_Stueck', 'Max_Stueck', 'Teigtemp_C', 'Knetzeit_langsam_min', 'Knetzeit_schnell_min', 'Stockgare_min', 'Stueckgare_min', 'Backtemp_Ober_C', 'Backtemp_Unter_C', 'Backzeit_min', 'Bedampfung', 'Bedampf_Hinweis', 'Anmerkungen', 'Erstellt'];
  const rR = rezepte.map((r) => [r.id, r.name, r.kategorie, r.aktiv ? 'JA' : 'NEIN', r.stueckgewicht_g, r.backverlust_pct, r.min_stueck, r.max_stueck, r.teigtemp_c, r.kz_langsam, r.kz_schnell, r.stockgare, r.stueckgare, r.back_ober, r.back_unter, r.backzeit, r.bedampfung ? 'JA' : 'NEIN', r.bedampf_hinweis, r.anmerkungen, r.erstellt]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([rH, ...rR]), 'Rezepte');
  const zH = ['Rezept_ID', 'Rezept_Name', 'Zutat_Name', 'Menge_kg', 'Ist_Mehl', 'Ist_Wasser', 'Bemerkung', 'Fuer_Produkte'];
  const zR = [];
  rezepte.forEach((r) => r.zutaten.forEach((z) => zR.push([r.id, r.name, z.name, z.menge_kg, z.ist_mehl ? 'JA' : 'NEIN', z.ist_wasser ? 'JA' : 'NEIN', z.bemerkung || '', (z.fuer_produkte || []).join(';')])));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([zH, ...zR]), 'Zutaten');
  return wb;
}

describe('Excel-Roundtrip (Export → Import)', () => {
  it('92 echte Rezepte: fachliche Felder bleiben erhalten', () => {
    const rezepte = dump.rezepte.map(mkRezept);
    const wb = buildWorkbook(rezepte);
    // Ueber Buffer serialisieren (wie echter Datei-Roundtrip)
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const zurueck = parseStandardFormat(XLSX.read(buf, { type: 'array' }));

    expect(zurueck).toHaveLength(rezepte.length);
    for (const orig of rezepte) {
      const re = zurueck.find((r) => r.name === orig.name);
      expect(re, orig.name).toBeTruthy();
      expect(re.kategorie).toBe(orig.kategorie);
      expect(re.aktiv).toBe(orig.aktiv);
      expect(re.stueckgewicht_g).toBe(orig.stueckgewicht_g);
      expect(re.teigtemp_c).toBe(orig.teigtemp_c);
      expect(re.backzeit).toBe(orig.backzeit);
      expect(re.bedampfung).toBe(orig.bedampfung);
      // Zutaten: Name/Menge/Flags/Bemerkung/fuer_produkte
      // (Excel-Format transportiert bewusst NICHT: ist_kommentar, Dosen,
      //  zusatz_prozent, menge_pro_presse — wie in der alten App)
      const zOrig = orig.zutaten;
      expect(re.zutaten).toHaveLength(zOrig.length);
      zOrig.forEach((z, i) => {
        expect(re.zutaten[i].name).toBe(z.name);
        expect(re.zutaten[i].menge_kg).toBeCloseTo(z.menge_kg, 10);
        expect(re.zutaten[i].ist_mehl).toBe(z.ist_mehl);
        expect(re.zutaten[i].ist_wasser).toBe(z.ist_wasser);
        expect(re.zutaten[i].bemerkung).toBe(z.bemerkung || '');
        expect(re.zutaten[i].fuer_produkte).toEqual(z.fuer_produkte || []);
      });
    }
  });
});
