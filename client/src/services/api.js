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
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      cache: 'no-store',
      body: body == null ? undefined : JSON.stringify(body),
    });
  } finally {
    trackActivity(-1);
  }

  // 304 Not Modified (ETag-Polling): kein Fehler, kein Body.
  if (res.status === 304) return { notModified: true };

  if (!res.ok) {
    let detail = '';
    let resBody = null;
    try {
      resBody = await res.json();
      detail = resBody.error || JSON.stringify(resBody);
    } catch {
      detail = await res.text();
    }
    // Bei 401: Token ungueltig oder abgelaufen → ausloggen.
    // Ausnahme: Offline-Betrieb wird im DataContext behandelt (skipAuthRedirect).
    if (res.status === 401 && !opts.skipAuthRedirect) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_email');
      localStorage.removeItem('auth_role');
      window.location.href = '/login';
      return;
    }
    const err = new Error(`${method} ${path} → ${res.status}: ${detail}`);
    err.status = res.status;
    err.body = resBody;
    throw err;
  }

  if (opts.raw) return res;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
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
  deleteRecipe: (id) => request('DELETE', `/api/recipes/${encodeURIComponent(id)}`),
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
    const res = await fetch(BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login fehlgeschlagen');
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_email', data.email);
    localStorage.setItem('auth_role', data.role);
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
