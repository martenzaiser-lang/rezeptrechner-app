// In-Memory-Fake der DB fuer Tests (Muster Etiketten-App: SQL wird per
// Substring/Regex erkannt). Deckt genau die Statements der Routen ab —
// neue Queries brauchen hier einen neuen Zweig, sonst wirft der Mock.

export function createDbMock() {
  const state = {
    users: [],       // { id, email, password_hash, role }
    recipes: [],     // { id, name, kategorie, aktiv, data, version, updated_at, updated_by }
    settings: {},    // key -> value
    customIngredients: {}, // name -> data
    prices: {},      // zutat_name -> { preis_eur_kg, lieferant }
    changeLog: [],
  };
  let userId = 1;

  async function query(text, params = []) {
    const sql = text.replace(/\s+/g, ' ').trim();

    if (/^(BEGIN|COMMIT|ROLLBACK|SELECT 1)/i.test(sql)) return { rows: [] };

    // --- users ---
    if (sql.startsWith('SELECT id, email, password_hash, role FROM users')) {
      const u = state.users.find((x) => x.email === params[0]);
      return { rows: u ? [u] : [] };
    }
    if (sql.startsWith('INSERT INTO users')) {
      let u = state.users.find((x) => x.email === params[0]);
      if (u) {
        u.password_hash = params[1];
        u.role = params[2];
      } else {
        u = { id: userId++, email: params[0], password_hash: params[1], role: params[2] };
        state.users.push(u);
      }
      return { rows: [{ id: u.id, email: u.email, role: u.role }] };
    }

    // --- recipes: ETag ---
    if (sql.includes('MAX(updated_at)') && sql.includes('FROM recipes')) {
      const maxTs = state.recipes.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), '');
      return { rows: [{ max_ts: maxTs, cnt: String(state.recipes.length) }] };
    }
    if (sql.startsWith('SELECT data, version, updated_at FROM recipes')) {
      const rows = [...state.recipes]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((r) => ({ data: r.data, version: r.version, updated_at: r.updated_at }));
      return { rows };
    }
    if (sql.startsWith('INSERT INTO recipes') && sql.includes('DO NOTHING')) {
      if (state.recipes.some((r) => r.id === params[0])) return { rows: [] };
      state.recipes.push({
        id: params[0], name: params[1], kategorie: params[2], aktiv: params[3],
        data: JSON.parse(params[4]), version: 1,
        updated_at: new Date().toISOString(), updated_by: params[5],
      });
      return { rows: [{ version: 1 }] };
    }
    if (sql.startsWith('UPDATE recipes')) {
      const r = state.recipes.find((x) => x.id === params[0] && x.version === params[6]);
      if (!r) return { rows: [] };
      r.name = params[1];
      r.kategorie = params[2];
      r.aktiv = params[3];
      r.data = JSON.parse(params[4]);
      r.updated_by = params[5];
      r.version += 1;
      r.updated_at = new Date().toISOString();
      return { rows: [{ version: r.version }] };
    }
    if (sql.startsWith('SELECT data, version FROM recipes WHERE id')) {
      const r = state.recipes.find((x) => x.id === params[0]);
      return { rows: r ? [{ data: r.data, version: r.version }] : [] };
    }
    if (sql.startsWith('DELETE FROM recipes WHERE id')) {
      const idx = state.recipes.findIndex((x) => x.id === params[0]);
      if (idx === -1) return { rows: [], rowCount: 0 };
      const [r] = state.recipes.splice(idx, 1);
      return { rows: [{ name: r.name }], rowCount: 1 };
    }
    if (sql === 'DELETE FROM recipes') {
      state.recipes = [];
      return { rows: [] };
    }
    if (sql.startsWith('INSERT INTO recipes') && sql.includes('is_insert')) {
      const existing = state.recipes.find((r) => r.id === params[0]);
      if (existing) {
        existing.name = params[1];
        existing.kategorie = params[2];
        existing.aktiv = params[3];
        existing.data = JSON.parse(params[4]);
        existing.version += 1;
        existing.updated_at = new Date().toISOString();
        return { rows: [{ is_insert: false }] };
      }
      state.recipes.push({
        id: params[0], name: params[1], kategorie: params[2], aktiv: params[3],
        data: JSON.parse(params[4]), version: 1,
        updated_at: new Date().toISOString(), updated_by: params[5],
      });
      return { rows: [{ is_insert: true }] };
    }

    // --- settings ---
    if (sql.startsWith('SELECT key, value FROM settings')) {
      return { rows: Object.entries(state.settings).map(([key, value]) => ({ key, value })) };
    }
    if (sql.startsWith('INSERT INTO settings')) {
      state.settings[params[0]] = JSON.parse(params[1]);
      return { rows: [] };
    }

    // --- custom_ingredients ---
    if (sql.startsWith('SELECT name, data FROM custom_ingredients')) {
      return {
        rows: Object.entries(state.customIngredients)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, data]) => ({ name, data })),
      };
    }
    if (sql.startsWith('INSERT INTO custom_ingredients')) {
      state.customIngredients[params[0]] = JSON.parse(params[1]);
      return { rows: [] };
    }
    if (sql.startsWith('DELETE FROM custom_ingredients')) {
      const existed = params[0] in state.customIngredients;
      delete state.customIngredients[params[0]];
      return { rows: [], rowCount: existed ? 1 : 0 };
    }

    // --- prices ---
    if (sql.startsWith('SELECT zutat_name, preis_eur_kg, lieferant FROM prices')) {
      return {
        rows: Object.entries(state.prices)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([zutat_name, p]) => ({ zutat_name, ...p })),
      };
    }
    if (sql.startsWith('INSERT INTO prices')) {
      state.prices[params[0]] = { preis_eur_kg: params[1], lieferant: params[2] };
      return { rows: [] };
    }
    if (sql.startsWith('DELETE FROM prices')) {
      delete state.prices[params[0]];
      return { rows: [] };
    }

    // --- change_log ---
    if (sql.startsWith('INSERT INTO change_log')) {
      state.changeLog.push({
        ts: new Date().toISOString(),
        user_email: params[0], action: params[1],
        recipe_id: params[2], recipe_name: params[3],
        details: params[4] ? JSON.parse(params[4]) : null,
      });
      return { rows: [] };
    }
    if (sql.includes('FROM change_log')) {
      return { rows: [...state.changeLog].reverse().slice(0, params[0] || 200) };
    }

    throw new Error(`db-mock: nicht abgedecktes SQL: ${sql.slice(0, 100)}`);
  }

  const pool = {
    query,
    connect: async () => ({ query, release: () => {} }),
    on: () => {},
    end: async () => {},
  };

  return { pool, state };
}
