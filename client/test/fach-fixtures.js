export const zutat = (name, menge_kg, extra = {}) => ({ name, menge_kg, ...extra });
export const mehl = (kg, extra) => zutat('Weizenmehl 550', kg, { ist_mehl: true, ...extra });
export const wasser = (kg, extra) => zutat('Wasser', kg, { ist_wasser: true, ...extra });
export const rezept = (zutaten = [mehl(10), wasser(6)], extra = {}) => ({ id: 'test', name: 'Testbrot', kategorie: 'Brot', aktiv: true, berechnung: 'stueck', stueckgewicht_g: 1000, zutaten, produkte: [], ...extra });
export const koch = () => rezept([mehl(9), wasser(5), mehl(1, { bemerkung: 'Kochstück' }), wasser(2, { bemerkung: 'Kochstück' })]);
export const multi = () => rezept([mehl(1), wasser(1), zutat('Rosinen', 1, { fuer_produkte: ['B'] })], { produkte: [{ name: 'A', gewicht_g: 2000 }, { name: 'B', gewicht_g: 3000 }] });
