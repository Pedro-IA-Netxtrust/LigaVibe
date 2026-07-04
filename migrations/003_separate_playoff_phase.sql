-- ============================================================
-- Migration 003: Separar playoffs (phase 3) de segunda rueda (phase 2)
-- ============================================================

-- Partidos de cuadro eliminatorio → fase 3
UPDATE league_matches
SET phase = 3
WHERE phase = 2
  AND playoff_slot IS NOT NULL;

-- Config de playoff → fase 3
UPDATE league_playoff_config
SET phase = 3
WHERE phase = 2;

-- ROLLBACK (manual):
-- UPDATE league_matches SET phase = 2 WHERE phase = 3 AND playoff_slot IS NOT NULL;
-- UPDATE league_playoff_config SET phase = 2 WHERE phase = 3;
