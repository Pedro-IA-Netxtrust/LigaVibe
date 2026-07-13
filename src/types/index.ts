/**
 * Base TypeScript types for Vibe Sport
 * Based on existing database schema
 */

export interface Client {
  id: string;
  rut: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  gender: 'Masculino' | 'Femenino' | 'Otro' | 'masculino' | 'femenino' | 'otro';
  categoria: string;
  categoria_secundaria?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeagueCategory {
  id: string;
  name: string;
  modality: 'Sencillo' | 'Doble';
  cupos_max: number;
  min_parejas: number;
  status: 'Open' | 'Closed' | 'In Progress' | 'Finished';
  created_at: string;
  updated_at: string;
}

export interface LeagueTeam {
  id: string;
  league_category_id: string;
  player1_id: string;
  player2_id: string | null;
  team_name: string;
  is_seeded: boolean;
  paid_player1: boolean;
  paid_player2: boolean;
  is_ghost?: boolean;
  registration_number?: number;
  order_index?: number;
  created_at: string;
  updated_at: string;
}

export interface LeagueGroup {
  id: string;
  league_category_id: string;
  phase: number;
  group_name: string;
  created_at: string;
  updated_at: string;
}

export interface LeagueMatch {
  id: string;
  league_category_id: string;
  league_group_id: string | null;
  team1_id: string;
  team2_id: string;
  winner_id: string | null;
  round: number;
  phase?: number;
  status: 'pendiente' | 'jugado' | 'live';
  team1_sets: number;
  team1_games: number;
  team2_sets: number;
  team2_games: number;
  s1_t1?: number | null;
  s1_t2?: number | null;
  s2_t1?: number | null;
  s2_t2?: number | null;
  s3_t1?: number | null;
  s3_t2?: number | null;
  match_date?: string | null;
  match_time?: string | null;
  court_name?: string | null;
  comment?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeagueStanding {
  id: string;
  league_category_id: string;
  league_group_id: string | null;
  league_team_id: string;
  phase: number;
  played: number;
  won: number;
  lost: number;
  won2_0: number;
  won2_1: number;
  points: number;
  sets_for: number;
  sets_against: number;
  games_for: number;
  games_against: number;
  created_at: string;
  updated_at: string;
}

// ---- PLAYOFF / PHASE CLOSURE TYPES ----

export interface PhaseClosureRecord {
  id: string;
  league_category_id: string;
  phase_closed: number;
  closed_at: string;
  total_matches: number;
  played_matches: number;
  pending_matches: number;
  was_forced: boolean;
  notes: string | null;
}

export interface PhaseSnapshotRow {
  id: string;
  league_phase_closure_id: string;
  league_category_id: string;
  league_group_id: string | null;
  league_team_id: string;
  team_name?: string;
  group_name?: string;
  phase: number;
  final_rank: number;
  classified: boolean;
  points: number;
  played: number;
  won: number;
  lost: number;
  sets_for: number;
  sets_against: number;
  games_for: number;
  games_against: number;
}

export interface PlayoffConfig {
  id?: string;
  league_category_id: string;
  phase: number;
  qualifiers_count: 2 | 4 | 8 | 16;
  bracket_type: 'single_elimination';
  cross_groups: boolean;
  protect_seeds: boolean;
}

export interface ClassifiedTeam {
  league_team_id: string;
  team_name: string;
  group_id: string | null;
  group_name: string | null;
  rank_in_group: number;  // 1=1st place in group
  overall_rank: number;
  points: number;
  sets_diff: number;
  games_diff: number;
  is_bye?: boolean;
  /** Origen en fase 1 (para trazabilidad visual). */
  phase1_group_name?: string | null;
  phase1_rank_in_group?: number;
  /** Alias explícito de segunda rueda (mismo que group_name / rank_in_group). */
  phase2_group_name?: string | null;
  phase2_rank_in_group?: number;
}

/** Pareja en un grupo de segunda rueda con origen en fase 1. */
export interface SecondRoundTeamDetail {
  league_team_id: string;
  team_name: string;
  phase1_group_name: string;
  phase1_rank_in_group: number;
  phase1_points: number;
  destination_group_name: string;
  /** Fila de posición en la matriz / serpenteo (1° fila, 2° fila…). */
  position_slot: number;
  changed_group: boolean;
}

export interface SecondRoundGroupDetail {
  groupName: string;
  teams: SecondRoundTeamDetail[];
}

export interface TieGroup {
  group_id: string | null;
  group_name?: string | null;
  teams: string[];  // league_team_ids
  rank_position: number;  // which rank position they're all tied at
  spots_in_group?: number;
  /** Cuántas de las parejas empatadas clasifican (orden manual). */
  slots_at_stake?: number;
}

export interface TiebreakerDecision {
  id?: string;
  league_category_id: string;
  league_group_id: string | null;
  phase: number;
  team_ids_involved: string[];
  ordered_team_ids: string[];
  reason: string | null;
  decided_at?: string;
}

export interface PhaseClosePreview {
  total_matches: number;
  played_matches: number;
  pending_matches: number;
  can_close_normally: boolean;
  /** Parejas que clasifican al playoff (top N por grupo). */
  classified: ClassifiedTeam[];
  /** Tabla completa de la fase regular (para mostrar no clasificados). */
  all_ranked: ClassifiedTeam[];
  ties_at_boundary: TieGroup[];  // ties that affect who classifies
  recommended_qualifiers: number;
}

export type Phase2Mode = 'elimination' | 'group_league';

export interface Phase2Config {
  id?: string;
  league_category_id: string;
  phase: 2;
  mode: Phase2Mode;
  groups_count: number;
  teams_per_group: number;
  qualifiers_per_group: number;
  best_thirds_count: number;
  /** Mejores N° lugares entre grupos (p. ej. 1 = mejor 6° de los tres grupos). */
  best_sixths_count: number;
  cross_groups: boolean;
  protect_seeds: boolean;
  points_win: number;
  points_loss: number;
  points_walkover: number;
  points_no_show: number;
  created_at?: string;
  updated_at?: string;
}

export interface Phase2Participant {
  id: string;
  league_category_id: string;
  phase: 2;
  league_team_id: string;
  source_phase_closure_id: string | null;
  seed: number | null;
  manually_added: boolean;
  manually_removed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  team_name?: string;
  group_id?: string | null;
  group_name?: string | null;
}

export interface Phase2Rule {
  qualifiers_per_group: number;
  best_thirds_count: number;
  best_sixths_count: number;
}

export interface Phase2GroupStanding {
  league_team_id: string;
  team_name: string;
  group_id: string | null;
  group_name: string | null;
  rank_in_group: number;
  points: number;
  played: number;
  won: number;
  lost: number;
  sets_for: number;
  sets_against: number;
  games_for: number;
  games_against: number;
  sets_diff: number;
  games_diff: number;
}

export interface Phase2Classification {
  classified: Phase2GroupStanding[];
  waiting_list: Phase2GroupStanding[];
}

export interface BracketMatch {
  id: string;
  playoff_slot: string;
  round: number;
  phase: number;
  team1_id: string | null;
  team2_id: string | null;
  team1_name?: string;
  team2_name?: string;
  winner_id: string | null;
  status: string;
  source_match1_id: string | null;
  source_match2_id: string | null;
  comment: string | null;
  is_bye: boolean;
  s1_t1?: number | null;
  s1_t2?: number | null;
  s2_t1?: number | null;
  s2_t2?: number | null;
  s3_t1?: number | null;
  s3_t2?: number | null;
  team1_sets?: number;
  team2_sets?: number;
  team1_games?: number;
  team2_games?: number;
  match_date?: string | null;
  match_time?: string | null;
  court_name?: string | null;
  team1?: {
    id: string;
    team_name: string;
    player1?: { first_name: string; last_name: string; rut?: string; phone?: string } | null;
    player2?: { first_name: string; last_name: string; rut?: string; phone?: string } | null;
  } | null;
  team2?: {
    id: string;
    team_name: string;
    player1?: { first_name: string; last_name: string; rut?: string; phone?: string } | null;
    player2?: { first_name: string; last_name: string; rut?: string; phone?: string } | null;
  } | null;
}
