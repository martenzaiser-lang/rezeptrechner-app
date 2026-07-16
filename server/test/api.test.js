// API-Integrationstests gegen die Express-App mit in-memory DB-Mock.
// Deckt ab: Login je Rolle, 401/403-Matrix, ETag→304, version→409, Bulk.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createDbMock } from './db-mock.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-mindestens-32-zeichen-lang!!';

const dbMock = createDbMock();
vi.mock('../db.js', () => ({
  pool: dbMock.pool,
  query: dbMock.pool.query,
  sslRejectUnauthorized: () => true,
}));

const { app } = await import('../app.js');
const { hashPassword } = await import('../services/auth-service.js');

const USERS = [
  { email: 'marten@oetzmann.de', password: 'admin-pw-123', role: 'admin' },
  { email: 'teigmacher@oetzmann.de', password: 'teig-pw-123', role: 'teigmacher' },
  { email: 'kuchen@oetzmann.de', password: 'kuchen-pw-123', role: 'kuchenmacher' },
];

const tokens = {};

function makeRecipe(id, name, extra = {}) {
  return {
    id,
    name,
    kategorie: 'Brot',
    aktiv: true,
    zutaten: [{ name: 'Weizenmehl 550', menge_kg: 10, ist_mehl: true }],
    ...extra,
  };
}

beforeAll(async () => {
  for (const u of USERS) {
    dbMock.state.users.push({
      id: dbMock.state.users.length + 1,
      email: u.email,
      password_hash: await hashPassword(u.password),
      role: u.role,
    });
  }
  for (const u of USERS) {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: u.email, password: u.password });
    expect(res.status).toBe(200);
    tokens[u.role] = res.body.token;
  }
});

beforeEach(() => {
  dbMock.state.recipes = [];
  dbMock.state.changeLog = [];
});

describe('Auth', () => {
  it('Login liefert Token und Rolle', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'marten@oetzmann.de', password: 'admin-pw-123' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
    expect(res.body.token).toBeTruthy();
  });

  it('Login mit falschem Passwort → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'marten@oetzmann.de', password: 'falsch' });
    expect(res.status).toBe(401);
  });

  it('Login mit unbekannter E-Mail → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fremd@example.com', password: 'x' });
    expect(res.status).toBe(401);
  });

  it('/api/auth/me validiert Token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokens.teigmacher}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: 'teigmacher@oetzmann.de', role: 'teigmacher' });
  });

  it('/api/auth/me ohne Token → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Autorisierungs-Matrix (Schreiben ist Admin-only)', () => {
  const recipe = makeRecipe('r1', 'Roggenmischbrot');

  it.each(['teigmacher', 'kuchenmacher'])('%s darf lesen, aber nicht schreiben', async (role) => {
    const read = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${tokens[role]}`);
    expect(read.status).toBe(200);

    const write = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${tokens[role]}`)
      .send(recipe);
    expect(write.status).toBe(403);

    const del = await request(app)
      .delete('/api/recipes/r1')
      .set('Authorization', `Bearer ${tokens[role]}`);
    expect(del.status).toBe(403);

    const settings = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${tokens[role]}`)
      .send({ name: 'Test' });
    expect(settings.status).toBe(403);

    const prices = await request(app)
      .put('/api/prices')
      .set('Authorization', `Bearer ${tokens[role]}`)
      .send({ prices: [{ zutat_name: 'Mehl', preis_eur_kg: 1 }] });
    expect(prices.status).toBe(403);
  });

  it('ohne Token → 401 auf allen Endpunkten', async () => {
    for (const [method, path] of [
      ['get', '/api/recipes'],
      ['post', '/api/recipes'],
      ['get', '/api/settings'],
      ['get', '/api/prices'],
      ['get', '/api/changelog'],
    ]) {
      const res = await request(app)[method](path);
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });

  it('Changelog ist Admin-only', async () => {
    const res = await request(app)
      .get('/api/changelog')
      .set('Authorization', `Bearer ${tokens.teigmacher}`);
    expect(res.status).toBe(403);
  });
});

describe('Rezepte CRUD', () => {
  it('Admin legt Rezept an, alle Rollen sehen es', async () => {
    const created = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send(makeRecipe('r1', 'Roggenmischbrot'));
    expect(created.status).toBe(201);

    const list = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${tokens.kuchenmacher}`);
    expect(list.status).toBe(200);
    expect(list.body.recipes).toHaveLength(1);
    expect(list.body.recipes[0].name).toBe('Roggenmischbrot');
    expect(list.body.recipes[0]._version).toBe(1);
  });

  it('doppelte Rezept-ID → 409', async () => {
    await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send(makeRecipe('r1', 'Brot A'));
    const dup = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send(makeRecipe('r1', 'Brot B'));
    expect(dup.status).toBe(409);
  });

  it('PUT mit korrekter Version aktualisiert, mit veralteter Version → 409 + aktueller Stand', async () => {
    await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send(makeRecipe('r1', 'Roggenmischbrot'));

    const ok = await request(app)
      .put('/api/recipes/r1')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ ...makeRecipe('r1', 'Roggenmischbrot NEU'), _version: 1 });
    expect(ok.status).toBe(200);
    expect(ok.body.version).toBe(2);

    // Zweites Geraet mit altem Stand (version 1) → Konflikt
    const conflict = await request(app)
      .put('/api/recipes/r1')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ ...makeRecipe('r1', 'Anderer Name'), _version: 1 });
    expect(conflict.status).toBe(409);
    expect(conflict.body.current.name).toBe('Roggenmischbrot NEU');
    expect(conflict.body.current._version).toBe(2);
  });

  it('PUT ohne _version → 400', async () => {
    await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send(makeRecipe('r1', 'Brot'));
    const res = await request(app)
      .put('/api/recipes/r1')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send(makeRecipe('r1', 'Brot'));
    expect(res.status).toBe(400);
  });

  it('DELETE entfernt Rezept, unbekannte ID → 404', async () => {
    await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send(makeRecipe('r1', 'Brot'));
    const del = await request(app)
      .delete('/api/recipes/r1')
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(del.status).toBe(200);
    const again = await request(app)
      .delete('/api/recipes/r1')
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(again.status).toBe(404);
  });
});

describe('ETag-Polling', () => {
  it('unveraenderter Stand → 304, nach Aenderung neuer ETag', async () => {
    await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send(makeRecipe('r1', 'Brot'));

    const first = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${tokens.teigmacher}`);
    const etag = first.headers.etag;
    expect(etag).toBeTruthy();

    const cached = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${tokens.teigmacher}`)
      .set('If-None-Match', etag);
    expect(cached.status).toBe(304);

    await request(app)
      .put('/api/recipes/r1')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ ...makeRecipe('r1', 'Brot geaendert'), _version: 1 });

    const fresh = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${tokens.teigmacher}`)
      .set('If-None-Match', etag);
    expect(fresh.status).toBe(200);
    expect(fresh.headers.etag).not.toBe(etag);
  });
});

describe('Bulk-Import', () => {
  it('upsert: legt neue an und aktualisiert bestehende', async () => {
    await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send(makeRecipe('r1', 'Brot alt'));

    const res = await request(app)
      .post('/api/recipes/bulk')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        recipes: [makeRecipe('r1', 'Brot neu'), makeRecipe('r2', 'Broetchen')],
        mode: 'upsert',
      });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ inserted: 1, updated: 1 });

    const list = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(list.body.recipes).toHaveLength(2);
    expect(list.body.recipes.find((r) => r.id === 'r1').name).toBe('Brot neu');
  });

  it('replace: ersetzt den kompletten Bestand', async () => {
    await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send(makeRecipe('alt', 'Altes Rezept'));

    const res = await request(app)
      .post('/api/recipes/bulk')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ recipes: [makeRecipe('neu', 'Neues Rezept')], mode: 'replace' });
    expect(res.status).toBe(200);

    const list = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(list.body.recipes).toHaveLength(1);
    expect(list.body.recipes[0].id).toBe('neu');
  });
});

describe('Settings / Preise / Custom-Zutaten', () => {
  it('Settings-Roundtrip', async () => {
    await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ name: 'Landbäckerei Oetzmann' });
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${tokens.teigmacher}`);
    expect(res.body.name).toBe('Landbäckerei Oetzmann');
  });

  it('Preise-Roundtrip inkl. Loeschen', async () => {
    await request(app)
      .put('/api/prices')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ prices: [{ zutat_name: 'Weizenmehl 550', preis_eur_kg: 0.62, lieferant: 'BÄKO' }] });
    let res = await request(app)
      .get('/api/prices')
      .set('Authorization', `Bearer ${tokens.teigmacher}`);
    expect(res.body.prices).toHaveLength(1);

    await request(app)
      .put('/api/prices')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ prices: [{ zutat_name: 'Weizenmehl 550', preis_eur_kg: 0, deleted: true }] });
    res = await request(app)
      .get('/api/prices')
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(res.body.prices).toHaveLength(0);
  });

  it('Custom-Zutaten-Roundtrip', async () => {
    await request(app)
      .put('/api/custom-ingredients/Dinkelvollkornmehl')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ kcal: 340, eiweiss: 12, allergene: ['01'] });
    const res = await request(app)
      .get('/api/custom-ingredients')
      .set('Authorization', `Bearer ${tokens.kuchenmacher}`);
    expect(res.body.ingredients).toHaveLength(1);
    expect(res.body.ingredients[0].name).toBe('Dinkelvollkornmehl');
  });
});

describe('Changelog', () => {
  it('Mutationen erzeugen Protokoll-Eintraege', async () => {
    await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send(makeRecipe('r1', 'Brot'));
    await request(app)
      .delete('/api/recipes/r1')
      .set('Authorization', `Bearer ${tokens.admin}`);

    const res = await request(app)
      .get('/api/changelog')
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(res.status).toBe(200);
    const actions = res.body.entries.map((e) => e.action);
    expect(actions).toContain('new');
    expect(actions).toContain('del');
  });
});
