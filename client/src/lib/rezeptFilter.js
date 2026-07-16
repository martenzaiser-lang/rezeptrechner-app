// Rollen-/Sortier-Logik fuer Rezeptlisten — 1:1 aus der alten App
// (index.html Z. 2757 getSorted, Z. 2772 populateBakerSel).

// Teigmacher sieht keine Kuchen — AUSSER diesen hardcodierten
// (er knetet die Boeden/Teige dafuer selbst):
export const TEIGMACHER_KUCHEN = ['Mohnkuchen', 'Käsekuchen'];

export function getSorted(rezepte, onlyActive = false) {
  let list = [...rezepte];
  if (onlyActive) list = list.filter((r) => r.aktiv);
  return list.sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

// Sichtbare Rezepte im Baker-Screen je Rolle (immer nur aktive).
export function sichtbareRezepte(rezepte, role) {
  let sorted = getSorted(rezepte, true);
  if (role === 'kuchenmacher') {
    sorted = sorted.filter((r) => r.kategorie === 'Kuchen');
  }
  if (role === 'teigmacher') {
    sorted = sorted.filter(
      (r) => r.kategorie !== 'Kuchen' || TEIGMACHER_KUCHEN.some((k) => r.name.includes(k))
    );
  }
  return sorted;
}
