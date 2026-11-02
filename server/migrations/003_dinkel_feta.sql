-- Rezept vom handschriftlichen Produktionszettel, übertragen am 02.11.2026.
-- Kilogramm; Wasser: 1 l = 1 kg. E.W. 0,600 = 600 g Teigeinlage.
-- Nur neu anlegen, niemals ein bereits gepflegtes Rezept überschreiben.
WITH neu AS (
  INSERT INTO recipes (id, name, kategorie, aktiv, data, updated_by)
  SELECT 'dinkel-feta-20261102', 'Dinkel-Feta', 'Brot', true, $rezept$
  {
    "id": "dinkel-feta-20261102",
    "name": "Dinkel-Feta",
    "kategorie": "Brot",
    "aktiv": true,
    "rezeptart": "teig",
    "verkaufsartikel": true,
    "berechnung": "stueck",
    "stueckgewicht_g": 600,
    "min_stueck": 1,
    "max_stueck": 999,
    "produkte": [],
    "zutaten": [
      { "name": "Dinkelvollkornmehl", "menge_kg": 2.5, "ist_mehl": true, "bemerkung": "Vorteig (Poolish)" },
      { "name": "Wasser", "menge_kg": 2.5, "ist_wasser": true, "bemerkung": "Vorteig (Poolish)" },
      { "name": "Hefe", "menge_kg": 0.01, "bemerkung": "Vorteig (Poolish)" },
      { "name": "Dinkelmehl 630", "menge_kg": 8.5, "ist_mehl": true },
      { "name": "Salz", "menge_kg": 0.4 },
      { "name": "Exzellent", "menge_kg": 0.14 },
      { "name": "Stabi", "menge_kg": 0.4 },
      { "name": "Kürbiskerne", "menge_kg": 0.5 },
      { "name": "Essig", "menge_kg": 0.2 },
      { "name": "Pizzagewürz", "menge_kg": 0.03 },
      { "name": "Hefe", "menge_kg": 0.04 },
      { "name": "Wasser", "menge_kg": 6, "ist_wasser": true },
      { "name": "Feta", "menge_kg": 3, "bemerkung": "Feta-Zugabe" }
    ],
    "kz_langsam": 0,
    "kz_schnell": 0,
    "teigtemp_c": 0,
    "stockgare": 0,
    "stueckgare": 0,
    "back_ober": 0,
    "back_unter": 0,
    "backzeit": 0,
    "backverlust_pct": null,
    "backverlust_status": "unbestaetigt",
    "anmerkungen": "Nach handschriftlichem Rezeptzettel: Dinkel Feta, E.W. 0,600 (600 g Teigeinlage). Grundansatz 24,220 kg einschließlich 3,000 kg Feta. Poolish separat führen. Stabi ist die Originalbezeichnung; genaue Produktzuordnung offen. Knetzeiten, Teigtemperatur, Reife-/Garezeiten, Backtemperaturen, Backzeit, Bedampfung und Backverlust sind auf dem Zettel nicht angegeben; Nullfelder bedeuten hier nicht hinterlegt.",
    "erstellt": "2.11.2026"
  }
  $rezept$::jsonb, 'migration:003_dinkel_feta'
  WHERE NOT EXISTS (
    SELECT 1 FROM recipes
    WHERE lower(regexp_replace(name, '[^[:alnum:]]', '', 'g')) = 'dinkelfeta'
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id, name
)
INSERT INTO change_log (user_email, action, recipe_id, recipe_name, details)
SELECT 'migration:003_dinkel_feta', 'new', id, name,
  jsonb_build_object('quelle', 'Handschriftlicher Rezeptzettel von Marten, 02.11.2026',
    'teigeinlage_g', 600, 'grundansatz_kg', 24.22)
FROM neu;
