-- Migration 004: Arrastre de puntos fase 1 + mejor 6° para playoffs
-- ------------------------------------------------------------

ALTER TABLE league_phase2_participants
  ADD COLUMN IF NOT EXISTS carryover_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carryover_played INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carryover_won INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carryover_lost INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carryover_sets_for INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carryover_sets_against INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carryover_games_for INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carryover_games_against INTEGER NOT NULL DEFAULT 0;

ALTER TABLE league_phase2_config
  ADD COLUMN IF NOT EXISTS best_sixths_count INTEGER NOT NULL DEFAULT 0;

-- Defaults torneo 3×7 → playoff 16
UPDATE league_phase2_config
SET
  groups_count = 3,
  teams_per_group = 7,
  qualifiers_per_group = 5,
  best_sixths_count = 1,
  best_thirds_count = 0
WHERE groups_count = 2 OR qualifiers_per_group = 2;
