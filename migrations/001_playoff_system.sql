-- ============================================================
-- Liga Vibe Sport — Migrations para sistema de Playoffs
-- Ejecutar en orden en el editor SQL de Supabase
-- Todas las migrations son seguras y reversibles
-- ============================================================

-- MIGRATION 001: Columnas auxiliares en league_categories
-- --------------------------------------------------------
ALTER TABLE league_categories 
  ADD COLUMN IF NOT EXISTS playoff_qualifiers INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS current_phase INTEGER DEFAULT 1;
-- ROLLBACK: ALTER TABLE league_categories DROP COLUMN IF EXISTS playoff_qualifiers, DROP COLUMN IF EXISTS current_phase;

-- MIGRATION 002: Trazabilidad de bracket en league_matches
-- --------------------------------------------------------
ALTER TABLE league_matches
  ADD COLUMN IF NOT EXISTS playoff_slot TEXT NULL,
  ADD COLUMN IF NOT EXISTS is_bye BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_match1_id UUID REFERENCES league_matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_match2_id UUID REFERENCES league_matches(id) ON DELETE SET NULL;
-- ROLLBACK: ALTER TABLE league_matches DROP COLUMN IF EXISTS playoff_slot, DROP COLUMN IF EXISTS is_bye, DROP COLUMN IF EXISTS source_match1_id, DROP COLUMN IF EXISTS source_match2_id;

-- MIGRATION 003: Registro inmutable de cierres de fase
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS league_phase_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_category_id UUID NOT NULL REFERENCES league_categories(id) ON DELETE CASCADE,
  phase_closed INTEGER NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by TEXT NULL,
  total_matches INTEGER NOT NULL DEFAULT 0,
  played_matches INTEGER NOT NULL DEFAULT 0,
  pending_matches INTEGER NOT NULL DEFAULT 0,
  was_forced BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ROLLBACK: DROP TABLE IF EXISTS league_phase_closures;

-- MIGRATION 004: Snapshots de standings por fase
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS league_phase_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_phase_closure_id UUID NOT NULL REFERENCES league_phase_closures(id) ON DELETE CASCADE,
  league_category_id UUID NOT NULL REFERENCES league_categories(id) ON DELETE CASCADE,
  league_group_id UUID NULL REFERENCES league_groups(id) ON DELETE SET NULL,
  league_team_id UUID NOT NULL REFERENCES league_teams(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL,
  final_rank INTEGER NOT NULL,
  classified BOOLEAN NOT NULL DEFAULT FALSE,
  points INTEGER NOT NULL DEFAULT 0,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  sets_for INTEGER NOT NULL DEFAULT 0,
  sets_against INTEGER NOT NULL DEFAULT 0,
  games_for INTEGER NOT NULL DEFAULT 0,
  games_against INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ROLLBACK: DROP TABLE IF EXISTS league_phase_snapshots;

-- MIGRATION 005: Decisiones manuales de desempate
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS league_tiebreaker_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_category_id UUID NOT NULL REFERENCES league_categories(id) ON DELETE CASCADE,
  league_group_id UUID NULL REFERENCES league_groups(id) ON DELETE SET NULL,
  phase INTEGER NOT NULL,
  team_ids_involved JSONB NOT NULL,
  ordered_team_ids JSONB NOT NULL,
  reason TEXT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ROLLBACK: DROP TABLE IF EXISTS league_tiebreaker_decisions;

-- MIGRATION 006: Configuración de playoff por categoría
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS league_playoff_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_category_id UUID NOT NULL REFERENCES league_categories(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL DEFAULT 2,
  qualifiers_count INTEGER NOT NULL DEFAULT 4,
  bracket_type TEXT NOT NULL DEFAULT 'single_elimination',
  cross_groups BOOLEAN NOT NULL DEFAULT TRUE,
  protect_seeds BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(league_category_id, phase)
);
-- ROLLBACK: DROP TABLE IF EXISTS league_playoff_config;

-- ============================================================
-- Verificación: Confirma que todo se creó correctamente
-- ============================================================
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('league_phase_closures', 'league_phase_snapshots', 'league_tiebreaker_decisions', 'league_playoff_config')
ORDER BY table_name;
