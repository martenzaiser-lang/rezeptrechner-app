import { findNaehrwerte, getRezeptLmivZutaten } from './naehrwerteLookup.js';

const getreidemalz = /\b(?:gersten|weizen|roggen|dinkel|hafer|reis|getreide|back|aktiv)?(?:röst)?malz(?:mehl|extrakt|schrot|sirup|pulver)?\b/iu;
const gemaelztesGetreide = /\b(?:gerste|weizen|roggen|dinkel|hafer|reis|getreide)\b[^;.]*\bgemälzt\b/iu;
export function malzZuckerHinweis(rezept, customZutaten = []) {
  // Nur tatsächlich verwendete Zutaten mit einem positiven Zuckerwert.
  // Zutatenlisten eigener Mischungen enthalten bereits deren Unterrezepturen.
  const mitMalz = getRezeptLmivZutaten(rezept, customZutaten).some(z => {
    const nw = findNaehrwerte(z.name, customZutaten);
    if (!(Number.isFinite(nw?.zucker) && nw.zucker > 0)) return false;
    // Eine vorhandene Zusammensetzung hat Vorrang vor einem Handelsnamen.
    const inhalt = z.lmiv?.trim() || z.name;
    const text = inhalt.replace(/<[^>]*>/g, '');
    return getreidemalz.test(text) || gemaelztesGetreide.test(text);
  });
  return mitMalz ? 'Enthält auch Zucker aus Getreidemalz.' : '';
}
