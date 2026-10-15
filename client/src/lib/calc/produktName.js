const norm = n => String(n || '').trim().toLocaleLowerCase('de-DE').replace(/[-–—]/g, ' ').replace(/\s+/g, ' ');

// Varianten wie „mit Körnern“ brauchen den Namen des Grundrezepts.
// Die Rechenschlüssel (rezept.name / produkte[].name) bleiben unverändert.
export function produktAnzeigename(rezept) {
  const grundname = rezept.grundrezept_name || rezept.name;
  const variante = rezept.produkt_name || (rezept.produkte?.length === 1 ? rezept.produkte[0].name : null);
  if (!variante || norm(variante) === norm(grundname)) return grundname;
  if (norm(variante).includes(norm(grundname))) return variante;
  return `${grundname} – ${variante}`;
}
