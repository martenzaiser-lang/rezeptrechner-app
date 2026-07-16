// Schuetttemperatur-Rechner — 1:1 aus der alten App (index.html Z. 3552-3556).
// Formel: Schuettwasser-Temp = Teigtemp × 3 − Raumtemp − Mehltemp − Kneterwaermung

export function schuettTemperatur({ teig = 26, raum = 22, mehl = 20, knet = 8 } = {}) {
  return Math.round(teig * 3 - raum - mehl - knet);
}

export function schuettHinweis(schuett) {
  if (schuett < 0) return '⚠️ Eiswasser + Eis verwenden!';
  if (schuett < 5) return '❄️ Sehr kaltes Wasser (Kühlschrank)';
  if (schuett < 15) return '🧊 Kaltes Wasser';
  if (schuett > 40) return '⚠️ Zu warm - Mehl/Raum kühlen!';
  return '✓ Im normalen Bereich';
}
