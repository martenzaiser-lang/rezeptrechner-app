// Einmalskript: legt die Datenbank "rezeptrechner" im bestehenden
// Neon-Projekt an (CREATE DATABASE geht nicht in der Ziel-DB selbst,
// daher Verbindung zur vorhandenen "neondb").

import 'dotenv/config';
import pg from 'pg';

const adminUrl = process.env.DATABASE_URL.replace('/rezeptrechner?', '/neondb?');
const client = new pg.Client({
  connectionString: adminUrl,
  ssl: { rejectUnauthorized: true },
});

await client.connect();
const exists = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = 'rezeptrechner'"
);
if (exists.rows.length) {
  console.log('DB rezeptrechner existiert bereits');
} else {
  await client.query('CREATE DATABASE rezeptrechner');
  console.log('DB rezeptrechner angelegt');
}
const dbs = await client.query('SELECT datname FROM pg_database WHERE NOT datistemplate');
console.log('Datenbanken im Projekt:', dbs.rows.map((r) => r.datname).join(', '));
await client.end();
