// Isolierter Browser-Prüfserver. Keine .env und keine Produktionsverbindung.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
process.env.NODE_ENV = 'test';
process.env.DOTENV_CONFIG_PATH = '__isolierter_test_ohne_env__';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
process.env.JWT_SECRET = 'isolierter-browser-test-kein-produktionsschluessel';
process.env.CORS_ORIGIN = 'http://127.0.0.1:8770';
process.env.LMIV_API_KEY = 'local-audit-lmiv';
const { createTestPostgres } = await import('./postgres.js');
const local = await createTestPostgres();
const { pool } = await import('../db.js');
pool.query = local.pool.query;
pool.connect = local.pool.connect;
const { hashPassword } = await import('../services/auth-service.js');
const { app } = await import('../app.js');
const { rezept, mehl, wasser, koch } = await import('../../client/test/fach-fixtures.js');
const fixture = [
  rezept(undefined, { id: 'basis', name: 'Audit Basisbrot', backverlust_pct: 10 }),
  { ...koch(), id: 'koch', name: 'Audit Kochstück', backverlust_pct: 10 },
  rezept([mehl(1), { name: 'Zucker', menge_kg: 1 }, { name: 'Butter', menge_kg: 1 }, { name: 'Vollei', menge_kg: 1 }], { id: 'masse', name: 'Audit Rührmasse', kategorie: 'Kuchen', rezeptart: 'masse', berechnung: 'blech', blech_breite_cm: 50, blech_laenge_cm: 80, backverlust_pct: 0 }),
  rezept([mehl(10), wasser(6), wasser(2, { fuer_produkte: ['Feucht'] })], { id: 'multi', name: 'Audit Multi', produkte: [{ name: 'Trocken', gewicht_g: 1000 }, { name: 'Feucht', gewicht_g: 1000 }], backverlust_pct: 10 }),
  rezept([mehl(0, { zusatz_prozent: 100 }), wasser(0, { zusatz_prozent: 60 }), { name: 'Salz', menge_kg: 0, zusatz_prozent: 2 }], { id: 'prozent', name: 'Audit Prozentbrot', backverlust_pct: 12 }),
  rezept([mehl(1), { name: '<img src=x onerror="window.auditInjected=1">', menge_kg: 1 }], { id: 'html', name: 'Audit HTML' }),
];
for (const role of ['admin', 'teigmacher', 'kuchenmacher']) await pool.query('INSERT INTO users (email,password_hash,role) VALUES ($1,$2,$3)', [role+'@audit.invalid', await hashPassword('audit-local-2026'), role]);
async function reset() {
  await local.db.exec('TRUNCATE recipes,settings,prices,custom_ingredients,change_log');
  for (const r of fixture) await pool.query('INSERT INTO recipes (id,name,kategorie,aktiv,data) VALUES ($1,$2,$3,true,$4)', [r.id,r.name,r.kategorie,JSON.stringify(r)]);
  await pool.query('INSERT INTO settings (key,value) VALUES ($1,$2)', ['name', JSON.stringify('Isolierte Testbäckerei')]);
}
await reset();
const failure = { recipes: false, sideData: false };
const base = fileURLToPath(new URL('../../client/dist/', import.meta.url));
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:8770');
    if (url.pathname.startsWith('/__audit/')) {
      let raw=''; for await (const chunk of req) raw += chunk;
      const d=raw ? JSON.parse(raw) : {};
      if (url.pathname.endsWith('/reset')) { await reset(); Object.assign(failure,{ recipes:false,sideData:false }); }
      if (url.pathname.endsWith('/mutate')) {
        if(d.failure) Object.assign(failure,d.failure);
        if(d.settings) for(const [k,v] of Object.entries(d.settings)) await pool.query('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2', [k,JSON.stringify(v)]);
        if(d.recipe) await pool.query('UPDATE recipes SET data=data || $1::jsonb,version=version+1,updated_at=now() WHERE id=$2', [JSON.stringify(d.recipe),d.recipe.id]);
      }
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ ok:true, failure, recipes:(await pool.query('SELECT data,version FROM recipes ORDER BY name')).rows }));return;
    }
    if (url.pathname.startsWith('/api/')) {
      if ((failure.recipes && url.pathname==='/api/recipes') || (failure.sideData && ['/api/settings','/api/prices','/api/custom-ingredients'].includes(url.pathname))) { res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"Isolierter Testausfall"}');return; }
      return app(req,res);
    }
    const name=path.extname(url.pathname) ? url.pathname : '/index.html';
    const file=path.resolve(base,'.'+decodeURIComponent(name));
    if (!file.startsWith(path.resolve(base)+path.sep) || !fs.existsSync(file)) { res.writeHead(404);res.end();return; }
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch(err) { res.writeHead(500);res.end('Lokaler Testserver: '+err.message); }
}).listen(8770,'127.0.0.1',()=>console.log('Isoliert: http://127.0.0.1:8770 (PostgreSQL im RAM, keine Produktionsdaten)'));
