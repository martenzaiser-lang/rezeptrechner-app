// Skalierte Zutatenliste mit Sektionen, Zwischensummen, Dosen-Anzeige,
// Arbeitsschritt-Zeilen und TEIG GESAMT — Darstellung wie alte App.

import { gruppiereZutaten, fmtSektionsSumme, fmtMengeListe } from '../../lib/calc/sektionen.js';

export default function ZutatenListe({ rezept, sk, teigGesamtKg }) {
  const sections = gruppiereZutaten(rezept, sk);
  const gtG = Math.round(teigGesamtKg * 1000);
  const gesamtStr =
    gtG >= 1000
      ? `${(gtG / 1000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
      : `${gtG.toLocaleString('de-DE')} g`;

  return (
    <div className="zt-wrap">
      {sections.map((sec, si) => (
        <div className="zt-section" key={si}>
          <div className={`zt-section-header ${sec.cls}`}>{sec.name}</div>
          <div className="zt-section-body">
            {sec.rows.map((row) =>
              row.typ === 'kommentar' ? (
                <div className="zt-comment-row" key={row.idx}>📝 {row.zutat.name}</div>
              ) : (
                <div className="zt-row-clean" key={row.idx}>
                  <span className="zt-zutat-name">{row.zutat.name}</span>
                  <span className="zt-zutat-menge">
                    {row.dosenStr ? (
                      <>
                        {row.dosenStr}
                        <br />
                        <span className="zt-menge-sub">{row.mengeStr}</span>
                      </>
                    ) : (
                      row.mengeStr
                    )}
                  </span>
                </div>
              )
            )}
            {sec.count > 1 && (
              <div className="zt-row-clean zt-sum-row">
                <span className="zt-zutat-name">Σ {sec.name}</span>
                <span className="zt-zutat-menge">{fmtSektionsSumme(sec.sum)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
      <div className="zt-section" style={{ border: 'none', background: 'transparent' }}>
        <div className="zt-gesamt-row">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', alignItems: 'center' }}>
            <span className="zt-zutat-name">TEIG GESAMT</span>
            <span className="zt-zutat-menge">{gesamtStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { fmtMengeListe };
