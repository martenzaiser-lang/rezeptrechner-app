// Synonym-ERGÄNZUNGEN für Hersteller-Produkte (Zutatennamen aus
// echten Rezepten → Key in HERSTELLER_DATEN, d.h. Meistermarken,
// IREKS oder herstellerErgaenzungen.js).
//
// Eigene Datei, weil synonyme.js/meistermarken.js verbatim mit der
// Alt-App verifiziert werden (test/verify-data.mjs) und dort nichts
// ergänzt werden darf. Wird in lib/calc/naehrwerteLookup.js in
// HERSTELLER_SYNONYME gemergt.
//
// Zuordnung anhand des Rezept-Kontexts (app_daten_dump.json), 2026-07:
// - 'Easy Rühr' (Donauwelle) = Meister Rühr & Easy PO SG — eindeutig.
// - 'Käsekuchenpulver' (Quarkstriezel) = Meister Käsekuchen-Basis —
//   einziges Käsekuchen-Pulver im Betrieb (PDF vorhanden). ANNAHME,
//   von Marten zu bestätigen.
// - 'Neutral' (Tiramisu) = Meister Sahnessa Neutral (Sahnestandmittel) —
//   passt zur Tiramisu-Sahnecreme. ANNAHME, von Marten zu bestätigen.

export const SYNONYME_ERGAENZUNGEN = {
  'easy rühr': 'rühr & easy',
  'käsekuchenpulver': 'käsekuchen-basis',
  'neutral': 'sahnessa neutral',
  // 'Exzelent' (ein l) = Schreibweise in echten Rezepten für das
  // Exzellent-Brotgewürz (herstellerErgaenzungen.js)
  'exzelent': 'exzellent',
};
