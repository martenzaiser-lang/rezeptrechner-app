import { REGIONALE_VERKAUFSPREISE, REGIONALPREISE_ABRUF } from '../../data/regionaleVerkaufspreise.js';

const euro = n => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
export default function RegionalePreise() {
  return <details className="sortiment-quoten">
    <summary>Regionale Verkaufspreise als Orientierung</summary>
    <p>Öffentlich sichtbare Bruttopreise aus Lüneburg, abgerufen am {new Date(REGIONALPREISE_ABRUF + 'T12:00:00').toLocaleDateString('de-DE')}. Die Anbieter nennen keinen Gültigkeitsstand. Beispiele, keine repräsentative Marktspanne oder Preisempfehlung.</p>
    <p>Bestellshop und Brötchenservice können vom Ladenverkauf abweichen. Liefergebühren sind nicht enthalten; Rote Schleuse nennt zusätzlich 0,50 € je Bestellung. Für Bienenbüttel und Uelzen liegt hier keine belegte öffentliche Preisliste vor.</p>
    <div className="sortiment-table-wrap"><table className="sortiment-table"><thead><tr><th>Produkt</th><th>Anbieter / Quelle</th><th>Menge</th><th>Bruttopreis</th><th>€/kg fertig</th></tr></thead><tbody>
      {REGIONALE_VERKAUFSPREISE.map((r, i) => <tr key={i}>
        <td data-label="Produkt"><strong>{r.produkt}</strong><span className="sortiment-basis">{r.gruppe}</span></td>
        <td data-label="Quelle"><a href={r.url} target="_blank" rel="noreferrer">{r.anbieter}</a><span className="sortiment-basis">{r.ort} · {r.kanal}</span></td>
        <td data-label="Menge">{r.menge}</td><td data-label="Bruttopreis">{euro(r.preis)}</td>
        <td data-label="€/kg fertig">{r.gramm ? euro(r.preis / r.gramm * 1000) : '—'}</td>
      </tr>)}
    </tbody></table></div>
    <p>Brotpreise je kg beziehen sich auf das Verkaufsgewicht. Die eigene Kalkulation verwendet die Teigeinlage: beide Gewichte nicht gleichsetzen. Kuchenportionen nur bei gleicher Schnittgröße vergleichen.</p>
  </details>;
}
