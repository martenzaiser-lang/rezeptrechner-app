import { Component } from 'react';

// Faengt Render-Fehler ab, damit ein Crash (z.B. fehlgeschlagener
// Chunk-Load nach Deploy) nicht die ganze App weiss macht. Bietet einen
// "Neu laden"-Knopf statt eines stummen leeren Bildschirms.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ maxWidth: 420, margin: '15vh auto', textAlign: 'center', padding: 24 }}>
          <h2 style={{ marginBottom: 8 }}>Etwas ist schiefgelaufen</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Möglicherweise wurde gerade eine neue Version veröffentlicht.
            Bitte die Seite neu laden.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
