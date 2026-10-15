import { berechneBaker } from './bakerBerechnung.js';
import { istGewicht } from './ta.js';

// Derselbe Mengenvektor für TA, Nährwerte, Allergene und Druck.
export function produktionsRezept(rezept, sk) {
  return { ...rezept, zutaten: rezept.zutaten.flatMap((z, i) => {
    const menge = sk?.[i] ?? 0;
    if (!istGewicht(z) || !(menge > 0)) return [];
    const f = z.menge_kg > 0 ? menge / z.menge_kg : 0;
    return [{ ...z, menge_kg: menge, zusatz_prozent: 0, menge_pro_presse: 0,
      ...(z.ta_anteile ? { ta_anteile: { mehl_kg: z.ta_anteile.mehl_kg * f, fluessigkeit_kg: z.ta_anteile.fluessigkeit_kg * f } } : {}),
    }];
  }) };
}

export function produktRezept(rezept, produktName) {
  // Bereits unvollständige Profile dürfen bei erneuter Anzeige nicht als
  // leeres, scheinbar fehlerfreies Rezept neu berechnet werden.
  if (rezept.berechnungsfehler) return rezept;
  const p = rezept.produkte?.find(p => p.name === produktName);
  // Bei Blechrezepten die Zutaten des gewählten Produkts vorab auswählen.
  const basis = rezept.berechnung === 'blech' && p
    ? { ...rezept, zutaten: rezept.zutaten.filter(z => !z.fuer_produkte?.length || z.fuer_produkte.includes(p.name)) } : rezept;
  const eingabe = { stueck: 1, faktor: 1, blechN: 1,
    blechB: rezept.blech_breite_cm || 50, blechL: rezept.blech_laenge_cm || 80,
    produktStueck: p ? { [p.name]: 1 } : {},
  };
  const result = berechneBaker(basis, eingabe);
  return { ...produktionsRezept(basis, result?.sk), name: p?.name || rezept.name, berechnungsfehler: result?.fehler,
    grundrezept_name: rezept.grundrezept_name || rezept.name,
    produkt_name: p?.name || rezept.produkt_name || null,
    ...(result?.fehler ? { deklarationsZutaten: rezept.zutaten.filter(z => istGewicht(z)
      && (z.menge_kg > 0 || z.zusatz_prozent > 0 || z.menge_pro_presse > 0)
      && (!p || !z.fuer_produkte?.length || z.fuer_produkte.includes(p.name))) } : {}),
    stueckgewicht_g: p?.gewicht_g ?? rezept.stueckgewicht_g, produkte: p ? [p] : [],
    backverlust_pct: p?.backverlust_pct ?? rezept.backverlust_pct,
    backverlust_status: p?.backverlust_pct != null ? p.backverlust_status || 'unbestaetigt' : rezept.backverlust_status };
}
