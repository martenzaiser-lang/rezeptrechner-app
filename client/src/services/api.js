// Zentraler API-Client — der EINZIGE fetch-Pfad der App
// (Muster aus der Etiketten-App: Auth-Header, 401-Redirect, Lade-Events).
// Base-URL aus Vite-Env, JWT-Token aus localStorage (nach Login).

const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('auth_token') || '';
}

// Globale Lade-Aktivitaet: request() zaehlt laufende API-Calls und feuert
// 'api-activity' — der TopLoadingBar in App.jsx zeigt die Fortschrittsleiste.
let activeRequests = 0;
function trackActivity(delta) {
  activeRequests = Math.max(0, activeRequests + delta);
  try {
    window.dispatchEvent(new CustomEvent('api-activity', { detail: { active: activeRequests } }));
  } catch { /* Test-Umgebung ohne window-Events */ }
}

async function request(method, path, body, opts = {}) {
  const headers = {
    Authorization: `Bearer ${getToken()}`,
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(opts.headers || {}),
  };

  trackActivity(1);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(BASE + path, {
      method, headers, signal: controller.signal, cache: 'no-store',
      body: body == null ? undefined : JSON.stringify(body),
    });
    if (res.status === 304) return { notModified: true };

    // Auch den Antwortinhalt innerhalb der Zeitbegrenzung lesen. Sonst kann
    // ein abgebrochener Download nach empfangenen Headern endlos hängen.
    const raw = await res.text();
    if (!res.ok) {
      let detail = '';
      let resBody = null;
      try { resBody = JSON.parse(raw); detail = resBody?.error || 'Anfrage fehlgeschlagen'; }
      catch { detail = 'Server hat keine gültige Datenantwort geliefert'; }
      if (res.status === 401 && !opts.skipAuthRedirect) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_email');
        localStorage.removeItem('auth_role');
        window.location.href = '/login';
      }
      const err = new Error(method + ' ' + path + ' → ' + res.status + ': ' + detail);
      err.status = res.status;
      err.body = resBody;
      throw err;
    }
    // Aufrufer benötigen weiterhin Response.headers und Response.json().
    // Der Inhalt ist bereits vollständig geladen, der Netzwerk-Stream beendet.
    if (opts.raw) return new Response(raw, { status: res.status, headers: res.headers });
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(method === 'GET' ? 'Server antwortet nicht rechtzeitig. Bitte erneut laden.' : 'Antwort ausgeblieben. Speicherstatus vor einem erneuten Versuch prüfen.');
    throw err;
  } finally {
    clearTimeout(timeout);
    trackActivity(-1);
  }

}

export const api = {
  getBackup: () => request('GET', '/api/backup'),
  restoreBackup: (backup, expectedRevision) => request('POST', '/api/backup/restore', { backup, expectedRevision }),
  // Health (auch fuer Cloud-Status-Indicator)
  health: () => request('GET', '/api/health', null, { skipAuthRedirect: true }),

  // Rezepte
  // getRecipes mit ETag: liefert { notModified: true } bei 304.
  getRecipes: (etag) =>
    request('GET', '/api/recipes', null, {
      raw: true,
      skipAuthRedirect: false,
      headers: etag ? { 'If-None-Match': etag } : {},
    }),
  createRecipe: (recipe) => request('POST', '/api/recipes', recipe),
  updateRecipe: (id, recipe) => request('PUT', `/api/recipes/${encodeURIComponent(id)}`, recipe),
  deleteRecipe: (id, version) => request('DELETE', `/api/recipes/${encodeURIComponent(id)}`, { _version: version }),
  bulkUpsertRecipes: (recipes, mode) => request('POST', '/api/recipes/bulk', { recipes, mode }),

  // Einstellungen
  getSettings: () => request('GET', '/api/settings'),
  putSettings: (settings) => request('PUT', '/api/settings', settings),

  // Custom-Zutaten (Naehrwerte/Allergene)
  getCustomIngredients: () => request('GET', '/api/custom-ingredients'),
  putCustomIngredient: (name, data) =>
    request('PUT', `/api/custom-ingredients/${encodeURIComponent(name)}`, data),
  deleteCustomIngredient: (name) =>
    request('DELETE', `/api/custom-ingredients/${encodeURIComponent(name)}`),

  // Preise
  getPrices: () => request('GET', '/api/prices'),
  putPrices: (prices) => request('PUT', '/api/prices', { prices }),

  // Aenderungsprotokoll
  getChangelog: (limit = 200) => request('GET', `/api/changelog?limit=${limit}`),
};

export const auth = {
  async login(email, password) {
    const data = await request('POST', '/api/auth/login', { email, password }, { skipAuthRedirect: true });
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_email', data.email);
    localStorage.setItem('auth_role', data.role);
    // Frischer Login: DataContext wartet dann sichtbar auf aktuelle Daten,
    // statt still mit dem Cache zu starten (Lehre aus der alten App).
    try { sessionStorage.setItem('frisch_eingeloggt', '1'); } catch {}
    return data;
  },

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
    localStorage.removeItem('auth_role');
    window.location.href = '/login';
  },

  isLoggedIn() {
    return !!localStorage.getItem('auth_token');
  },

  getEmail() {
    return localStorage.getItem('auth_email') || '';
  },

  getRole() {
    return localStorage.getItem('auth_role') || '';
  },
};
