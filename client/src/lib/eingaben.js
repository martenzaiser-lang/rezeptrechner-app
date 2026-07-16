// Persistenz der Baker-Eingaben (Stueckzahlen, Blechmasse, Teiler,
// Multi-Produkt-Pressen) pro Rolle — exakt wie die alte App
// (localStorage-Keys 'teigmacher_eingaben' / 'kuchenmacher_eingaben',
// damit ein bereits eingerichtetes Tablet seine Tageswerte behaelt).

export const getEingabenKey = (role) =>
  role === 'kuchenmacher' ? 'kuchenmacher_eingaben' : 'teigmacher_eingaben';

export function loadEingaben(role) {
  try {
    return JSON.parse(localStorage.getItem(getEingabenKey(role)) || '{}');
  } catch {
    return {};
  }
}

export function saveEingabe(role, eingabe) {
  if (!eingabe?.rezeptId) return;
  const alle = loadEingaben(role);
  alle[eingabe.rezeptId] = eingabe;
  try {
    localStorage.setItem(getEingabenKey(role), JSON.stringify(alle));
  } catch {}
}

export function getHeuteDatum() {
  return new Date().toLocaleDateString('de-DE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
