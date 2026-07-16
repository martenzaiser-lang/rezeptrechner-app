-- Migration 001: Basis-Schema Rezeptrechner
--
-- Rezepte als JSONB (eine Zeile pro Rezept): das Rezept-Objekt ist tief
-- verschachtelt (zutaten[], produkte[], bonOptionen) und wird immer als
-- Ganzes gelesen/geschrieben. Pro-Rezept-Zeilen verhindern strukturell,
-- dass ein Speichern andere Rezepte ueberschreibt (ersetzt den alten
-- "nie weniger Rezepte schreiben"-Schutz der Firestore-App).

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'teigmacher', 'kuchenmacher')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipes (
  id         TEXT PRIMARY KEY,           -- uebernimmt die IDs aus Firestore
  name       TEXT NOT NULL,              -- denormalisiert fuer Changelog/Listen
  kategorie  TEXT NOT NULL DEFAULT '',
  aktiv      BOOLEAN NOT NULL DEFAULT true,
  data       JSONB NOT NULL,             -- komplettes Rezept-Objekt (Datenmodell wie alte App)
  version    INTEGER NOT NULL DEFAULT 1, -- optimistische Sperre (PUT mit version → 409 bei Mismatch)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS recipes_kategorie_idx ON recipes (kategorie);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ehemals localStorage 'nw_custom' (nur auf dem Admin-PC) — jetzt geraeteuebergreifend
CREATE TABLE IF NOT EXISTS custom_ingredients (
  name       TEXT PRIMARY KEY,
  data       JSONB NOT NULL,             -- Naehrwerte (8 Felder) + Allergene + Spuren + Zutatenverzeichnis
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ehemals localStorage 'rz_preise'
CREATE TABLE IF NOT EXISTS prices (
  zutat_name   TEXT PRIMARY KEY,
  preis_eur_kg NUMERIC(10, 4) NOT NULL,
  lieferant    TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ehemals localStorage-Aenderungsprotokoll ('oetzmann_log_v1')
CREATE TABLE IF NOT EXISTS change_log (
  id          SERIAL PRIMARY KEY,
  ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_email  TEXT NOT NULL,
  action      TEXT NOT NULL,             -- new/edit/del/import/settings/price/custom_ingredient
  recipe_id   TEXT,
  recipe_name TEXT,
  details     JSONB
);
CREATE INDEX IF NOT EXISTS change_log_ts_idx ON change_log (ts DESC);
