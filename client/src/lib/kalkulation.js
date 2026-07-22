// Verkaufspreis-Kalkulation (Zuschlagskalkulation über Zielquoten).
//
// Modell: Der Netto-VK wird so gesetzt, dass die Rohstoffkosten (inkl.
// Retoure/Schwund) genau den Materialanteil ausmachen, der nach Abzug
// der Zielquoten für Personal, Energie, sonstige Gemeinkosten und Gewinn
// übrig bleibt:  Netto-VK = Rohstoffe×(1+Schwund) ÷ Materialanteil.
// Defaults = Branchenwerte Bäckerhandwerk 2026 (Betriebsvergleich:
// Wareneinsatz 27–31 %, Personal >40 %, Energie ~5 %, Rendite ~6–8 %).
// Alle Quoten sind vom Admin in den Einstellungen anpassbar
// (settings.kalkulation, DB, geräteübergreifend).

export const KALKULATION_DEFAULTS = {
  schwundPct: 8, // Retoure/Abschriften auf die Rohstoffe
  personalPct: 42, // Zielquote vom Netto-Umsatz
  energiePct: 5,
  gemeinkostenPct: 18, // Miete, Fuhrpark, Versicherung, Verwaltung, AfA …
  gewinnPct: 8,
  ustPct: 7, // Backwaren außer Haus
};

// Aufrunden auf 5 Cent (Kalkulation ist Preisuntergrenze — nie abrunden).
export const rundeAuf5Cent = (v) => Math.ceil(v / 0.05 - 1e-9) * 0.05;

// rohstoffkosten: € pro Kalkulationsbasis (Stück/Blech), > 0.
// Rückgabe null, wenn die Quoten keinen sinnvollen Materialanteil lassen.
export function kalkuliereVk(rohstoffkosten, params = {}) {
  const p = { ...KALKULATION_DEFAULTS, ...params };
  const materialPct = 100 - p.personalPct - p.energiePct - p.gemeinkostenPct - p.gewinnPct;
  if (!(rohstoffkosten > 0) || materialPct < 5) return null;
  const rkEff = rohstoffkosten * (1 + p.schwundPct / 100);
  const netto = rkEff / (materialPct / 100);
  const brutto = netto * (1 + p.ustPct / 100);
  return {
    rkEff,
    materialPct,
    netto,
    brutto,
    empfohlen: rundeAuf5Cent(brutto),
    faktor: netto / rohstoffkosten,
  };
}
