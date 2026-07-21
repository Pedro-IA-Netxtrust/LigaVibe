-- Consolidado de base de datos para separar Segunda Rueda (Fase 2) y Playoffs (Fase 3)

-- 1. Modificar tabla de partidos para trazabilidad de brackets y fases
ALTER TABLE league_matches
  ADD COLUMN IF NOT EXISTS phase INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS playoff_slot TEXT NULL,
  ADD COLUMN IF NOT EXISTS is_bye BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_match1_id UUID REFERENCES league_matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_match2_id UUID REFERENCES league_matches(id) ON DELETE SET NULL;

-- 2. Modificar tabla de categorías para rastrear fase actual
ALTER TABLE league_categories
  ADD COLUMN IF NOT EXISTS playoff_qualifiers INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS current_phase INTEGER DEFAULT 1;

-- 3. Crear cierres e historial de fases
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

-- 4. Crear snapshots de tablas de posiciones
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

-- 5. Crear tabla de decisiones manuales de desempates
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

-- 6. Configuración de Segunda Rueda (Fase 2)
CREATE TABLE IF NOT EXISTS league_phase2_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_category_id UUID NOT NULL REFERENCES league_categories(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL DEFAULT 2,
  mode TEXT NOT NULL DEFAULT 'group_league',
  groups_count INTEGER NOT NULL DEFAULT 3,
  teams_per_group INTEGER NOT NULL DEFAULT 7,
  qualifiers_per_group INTEGER NOT NULL DEFAULT 5,
  best_thirds_count INTEGER NOT NULL DEFAULT 0,
  best_sixths_count INTEGER NOT NULL DEFAULT 1,
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
  UNIQUE(league_category_id, phase)
);

-- 7. Participantes de Segunda Rueda (Fase 2) con arrastre de estadísticas
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
  carryover_points INTEGER NOT NULL DEFAULT 0,
  carryover_played INTEGER NOT NULL DEFAULT 0,
  carryover_won INTEGER NOT NULL DEFAULT 0,
  carryover_lost INTEGER NOT NULL DEFAULT 0,
  carryover_sets_for INTEGER NOT NULL DEFAULT 0,
  carryover_sets_against INTEGER NOT NULL DEFAULT 0,
  carryover_games_for INTEGER NOT NULL DEFAULT 0,
  carryover_games_against INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT league_phase2_participants_phase_chk CHECK (phase = 2),
  UNIQUE(league_category_id, phase, league_team_id)
);

-- 8. Configuración de Playoffs (Fase 3)
CREATE TABLE IF NOT EXISTS league_playoff_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_category_id UUID NOT NULL REFERENCES league_categories(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL DEFAULT 3,
  qualifiers_count INTEGER NOT NULL DEFAULT 4,
  bracket_type TEXT NOT NULL DEFAULT 'single_elimination',
  cross_groups BOOLEAN NOT NULL DEFAULT TRUE,
  protect_seeds BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT league_playoff_config_phase_chk CHECK (phase = 3),
  UNIQUE(league_category_id, phase)
);

-- 9. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_phase2_config_category ON league_phase2_config (league_category_id, phase);
CREATE INDEX IF NOT EXISTS idx_phase2_participants_category ON league_phase2_participants (league_category_id, phase);
CREATE INDEX IF NOT EXISTS idx_playoff_config_category ON league_playoff_config (league_category_id, phase);

-- 10. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE league_phase2_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_phase2_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_playoff_config ENABLE ROW LEVEL SECURITY;

-- 11. Políticas RLS de acceso total para público (admin simplificado)
DROP POLICY IF EXISTS admin_all_phase2_config ON league_phase2_config;
CREATE POLICY admin_all_phase2_config ON league_phase2_config FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_all_phase2_participants ON league_phase2_participants;
CREATE POLICY admin_all_phase2_participants ON league_phase2_participants FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_all_playoff_config ON league_playoff_config;
CREATE POLICY admin_all_playoff_config ON league_playoff_config FOR ALL TO public USING (true) WITH CHECK (true);

-- 12. Script de migración de datos existentes: asegurar separación de fases
UPDATE league_matches
SET phase = 3
WHERE playoff_slot IS NOT NULL;

UPDATE league_playoff_config
SET phase = 3
WHERE phase = 2;
