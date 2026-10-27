-- Die Gewichte dieser Baguetteteig-Varianten bezeichnen den benötigten
-- Grundteig. Oliven, Tomaten, Urstückteig und Kuvertüre kommen hinzu.
-- Marten bestätigt am 27.10.2026: Körnerciabatta = 5,4 kg Grundteig
-- plus bisher ca. 1,2 kg Urstückteig (22,22 % jetzt vom Basisteig).
WITH vorher AS MATERIALIZED (
  SELECT id, name, data, version
  FROM recipes
  WHERE id = 'mmir9dvq16fh'
  FOR UPDATE
), angepasst AS (
  SELECT id, jsonb_set(jsonb_set(data, '{produkte}', (
    SELECT jsonb_agg(
      CASE WHEN produkt->>'name' IN ('Olivenciabatta', 'Tomatenciabatta', 'Körnerciabatta', 'Schokobaguette')
        THEN produkt || '{"gewicht_bezug":"basisteig"}'::jsonb
        ELSE produkt END ORDER BY position
    ) FROM jsonb_array_elements(data->'produkte') WITH ORDINALITY AS p(produkt, position)
  )), '{zutaten}', (
    SELECT jsonb_agg(
      CASE WHEN zutat->>'name' = 'Urstückteig'
        AND zutat->'fuer_produkte' = '["Körnerciabatta"]'::jsonb
        AND zutat->>'prozent_bezug' = 'endprodukt'
        THEN zutat || '{"prozent_bezug":"basisteig"}'::jsonb
        ELSE zutat END ORDER BY position
    ) FROM jsonb_array_elements(data->'zutaten') WITH ORDINALITY AS z(zutat, position)
  )) AS data
  FROM vorher
), aktualisiert AS (
  UPDATE recipes r SET data = a.data, version = r.version + 1,
    updated_at = now(), updated_by = 'migration:002_ciabatta_grundteiggewicht'
  FROM angepasst a WHERE r.id = a.id AND r.data IS DISTINCT FROM a.data
  RETURNING r.id
)
INSERT INTO change_log (user_email, action, recipe_id, recipe_name, details)
SELECT 'migration:002_ciabatta_grundteiggewicht', 'edit', v.id, v.name,
  jsonb_build_object('grund', 'Variantengewicht bezeichnet Grundteig zuzüglich Zugaben',
    'vorher', v.data, 'vorher_version', v.version)
FROM vorher v JOIN aktualisiert a ON a.id = v.id;
