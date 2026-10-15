import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { Printer } from 'lucide-react';
import { produktNaehrwerte } from '../../lib/calc/produktNaehrwerte.js';
import { produktAnzeigename } from '../../lib/calc/produktName.js';
import { malzZuckerHinweis } from '../../lib/calc/zuckerHinweis.js';
import '../../styles/print.css';

const fmt = (n, stellen = 1) => n.toLocaleString('de-DE', { minimumFractionDigits: stellen, maximumFractionDigits: stellen });
export default function NaehrwertDruck({ rezept, customZutaten }) {
  useEffect(() => () => { delete document.body.dataset.printMode; }, []);
  const { werte: nw, deklarationVollstaendig: vollstaendig, deklarationsFehler: fehlend, bezug, druckBezug } = produktNaehrwerte(rezept, customZutaten);
  const zuckerHinweis = malzZuckerHinweis(rezept, customZutaten);
  function drucken() {
    if (!vollstaendig) return;
    document.body.dataset.printMode = 'nutrition';
    const cleanup = () => { delete document.body.dataset.printMode; };
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
  }
  return <>
    <button className="btn" onClick={drucken} disabled={!vollstaendig} title={vollstaendig ? bezug : `Angaben unvollständig: ${fehlend.join(', ') || 'keine Zutatenmenge'}`}>
      <Printer size={15} /> Nur Nährwerte drucken
    </button>
    {createPortal(<section id="nutrition-print-sheet" aria-hidden="true">
      {vollstaendig && <>
        <h1>{produktAnzeigename(rezept)}</h1>
        <h2>Durchschnittliche Nährwerte</h2>
        <p>{druckBezug}</p>
        <table><tbody>
          <tr><th scope="row">Energie</th><td>{fmt(nw.kj, 0)} kJ / {fmt(nw.kcal, 0)} kcal</td></tr>
          {[
            ['Fett', 'fett'], ['davon gesättigte Fettsäuren', 'gfs'],
            ['Kohlenhydrate', 'kh'], ['davon Zucker', 'zucker'],
            ['Ballaststoffe', 'ballaststoffe'], ['Eiweiß', 'eiweiss'], ['Salz', 'salz'],
          ].filter(([, key]) => nw[key] != null).map(([label, key]) => <tr key={key}><th scope="row">{label}{key === 'zucker' && zuckerHinweis && <sup>*</sup>}</th><td>{fmt(nw[key], key === 'salz' ? 2 : 1)} g</td></tr>)}
        </tbody></table>
        {zuckerHinweis && <p className="nutrition-footnote">* {zuckerHinweis}</p>}
      </>}
    </section>, document.body)}
  </>;
}
