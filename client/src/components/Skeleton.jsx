// Skeleton-Loading: dezente Pulse-Karten in der Form der spaeteren Listen.
// Zwei Varianten:
//   <SkeletonCardList count={4} />   — Bestell-/Dauerbestellungs-Karten
//   <SkeletonTableRows count={5} />  — Tabellenzeilen (Produktionssumme)

export function SkeletonCardList({ count = 3 }) {
  return (
    <div className="skeleton-card-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line skeleton-line-title" />
          <div className="skeleton-line skeleton-line-meta" />
          <div className="skeleton-line skeleton-line-row" />
          <div className="skeleton-line skeleton-line-row short" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTableRows({ count = 5 }) {
  return (
    <div className="skeleton-rows">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-line skeleton-line-row" />
        </div>
      ))}
    </div>
  );
}
