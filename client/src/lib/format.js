// Zahlen-/Mengenformatierung (de-DE, Komma) — Muster aus der alten App.

export function parseLocaleFloat(v) {
  return parseFloat(String(v || '').replace(',', '.')) || 0;
}

// Mengenanzeige wie im alten Baker-Screen: ab 1000 g in kg (2 Nachkommastellen),
// darunter in ganzen Gramm.
export function fmtMengeKg(kg) {
  const g = Math.round(kg * 1000);
  return g >= 1000 ? kg.toFixed(2).replace('.', ',') + ' kg' : g + ' g';
}

// Dosen-Anzeige: "3 Dosen (à 720g)" — eine Nachkommastelle wie alte App.
export function dosenAnzahl(mengeKg, dosenGewichtG) {
  if (!dosenGewichtG || dosenGewichtG <= 0) return 0;
  return Math.round(((mengeKg * 1000) / dosenGewichtG) * 10) / 10;
}

export function fmtZahl(n, decimals = 0) {
  return Number(n).toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
