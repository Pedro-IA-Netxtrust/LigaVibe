-- ============================================================
-- Liga Vibe Sport — Migration 002: Fase 2 por grupos (editable)
-- Compatibilidad: mantiene modo eliminación existente
-- ============================================================

-- MIGRATION 001: Configuración extendida de fase 2 por categoría
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS league_phase2_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_category_id UUID NOT NULL REFERENCES league_categories(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL DEFAULT 2,
  mode TEXT NOT NULL DEFAULT 'group_league', -- group_league (segunda rueda)
  groups_count INTEGER NOT NULL DEFAULT 2,
  teams_per_group INTEGER NOT NULL DEFAULT 4,
  qualifiers_per_group INTEGER NOT NULL DEFAULT 2,
  best_thirds_count INTEGER NOT NULL DEFAULT 0,
  cross_groups BOOLEAN NOT NULL DEFAULT TRUE,
  protect_seeds BOOLEAN NOT NULL DEFAULT TRUE,
  points_win INTEGER NOT NULL DEFAULT 2,
  points_loss INTEGER NOT NULL DEFAULT 1,
  points_walkover INTEGER NOT NULL DEFAULT 2,
  points_no_show INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT league_phase2_config_mode_chk CHECK (mode IN ('elimination', 'group_league')),
  CONSTRAINT league_phase2_config_phase_chk CHECK (phase = 2),
  CONSTRAINT league_phase2_config_groups_count_chk CHECK (groups_count >= 1),
  CONSTRAINT league_phase2_config_teams_per_group_chk CHECK (teams_per_group >= 2),
  CONSTRAINT league_phase2_config_qualifiers_per_group_chk CHECK (qualifiers_per_group >= 1),
  UNIQUE(league_category_id, phase)
);
-- ROLLBACK: DROP TABLE IF EXISTS league_phase2_config;

-- MIGRATION 002: Participantes de fase 2 (editable)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS league_phase2_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_category_id UUID NOT NULL REFERENCES league_categories(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL DEFAULT 2,
  league_team_id UUID NOT NULL REFERENCES league_teams(id) ON DELETE CASCADE,
  source_phase_closure_id UUID NULL REFERENCES league_phase_closures(id) ON DELETE SET NULL,
  seed INTEGER NULL,
  manually_added BOOLEAN NOT NULL DEFAULT FALSE,
  manually_removed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT league_phase2_participants_phase_chk CHECK (phase = 2),
  UNIQUE(league_category_id, phase, league_team_id)
);
-- ROLLBACK: DROP TABLE IF EXISTS league_phase2_participants;

-- MIGRATION 003: Índices recomendados para consulta rápida
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_phase2_config_category
  ON league_phase2_config (league_category_id, phase);

CREATE INDEX IF NOT EXISTS idx_phase2_participants_category
  ON league_phase2_participants (league_category_id, phase);

CREATE INDEX IF NOT EXISTS idx_phase2_participants_team
  ON league_phase2_participants (league_team_id);

-- MIGRATION 004: RLS (mismo patrón que league_matches)
-- ------------------------------------------------------------
ALTER TABLE league_phase2_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_phase2_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_phase2_config ON league_phase2_config
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY admin_all_phase2_participants ON league_phase2_participants
  FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================
-- Nota de integración lógica
-- ============================================================
-- Para modo "group_league" de fase 2:
-- - Reusar tabla league_groups con phase=2 para crear grupos (A/B/C...).
-- - Reusar league_matches con phase=2 y league_group_id para partidos.
-- - Reusar league_standings con phase=2 para standings desde 0.
--
-- Esta migración no elimina estructuras existentes de playoffs.
-- ============================================================

-- Verificación
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('league_phase2_config', 'league_phase2_participants')
ORDER BY table_name;
