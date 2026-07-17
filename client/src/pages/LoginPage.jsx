// Login — bewusst einfach gehalten (der alte Firebase-Login war die
// groesste Huerde im Betrieb):
// - Schnellauswahl der 3 Konten als grosse Buttons (E-Mail-Tippen entfaellt)
// - Passwort-Auge zum Sichtbarmachen (Tablet-Tastatur vertippt sich leicht)
// - zuletzt genutztes Konto wird gemerkt und vorausgewaehlt
// - Session haelt danach 30 Tage (alte App verlangte JEDEN Start einen Login)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { auth } from '../services/api.js';

const KONTEN = [
  { email: 'teigmacher@oetzmann.de', label: 'Teigmacher', icon: '🥖' },
  { email: 'kuchen@oetzmann.de', label: 'Kuchenmacher', icon: '🍰' },
  { email: 'marten@oetzmann.de', label: 'Admin', icon: '⚙️' },
];

export default function LoginPage() {
  const [email, setEmail] = useState(() => localStorage.getItem('login_letzte_email') || '');
  const [password, setPassword] = useState('');
  const [zeigePasswort, setZeigePasswort] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const bekanntesKonto = KONTEN.some((k) => k.email === email);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await auth.login(email.trim(), password);
      localStorage.setItem('login_letzte_email', email.trim());
      navigate(data.role === 'admin' ? '/verwaltung' : '/backen', { replace: true });
    } catch (err) {
      setError(err.message === 'Failed to fetch'
        ? 'Server nicht erreichbar — bitte kurz warten und erneut versuchen'
        : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img src="/logo.jpg" alt="Landbäckerei Oetzmann" className="login-logo" />
          <span className="brand-sub">Rezeptrechner</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {KONTEN.map((k) => (
            <button
              key={k.email}
              type="button"
              onClick={() => { setEmail(k.email); setError(''); }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '12px 4px', minHeight: 68, cursor: 'pointer',
                borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: `2px solid ${email === k.email ? 'var(--accent)' : 'var(--border)'}`,
                background: email === k.email ? 'var(--accent-light)' : 'var(--bg-elevated, #fff)',
                color: 'var(--text)',
              }}
            >
              <span style={{ fontSize: 22 }}>{k.icon}</span>
              <span>{k.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {!bekanntesKonto && (
            <>
              <label htmlFor="email">E-Mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                required
                style={{ minHeight: 48 }}
              />
            </>
          )}

          <label htmlFor="password" style={{ marginTop: 12 }}>
            Passwort{bekanntesKonto ? ` für ${KONTEN.find((k) => k.email === email).label}` : ''}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={zeigePasswort ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus={bekanntesKonto}
              required
              style={{ minHeight: 48, width: '100%', paddingRight: 48, fontSize: 17 }}
            />
            <button
              type="button"
              onClick={() => setZeigePasswort(!zeigePasswort)}
              aria-label={zeigePasswort ? 'Passwort verbergen' : 'Passwort anzeigen'}
              title={zeigePasswort ? 'Passwort verbergen' : 'Passwort anzeigen'}
              style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 8,
                color: 'var(--muted)', display: 'flex',
              }}
            >
              {zeigePasswort ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 16, minHeight: 50, fontSize: 16 }}
            disabled={loading || !email}
          >
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
