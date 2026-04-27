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
  qualifiers_count: 2 | 4 | 8;
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
}

export interface TieGroup {
  group_id: string | null;
  teams: string[];  // league_team_ids
  rank_position: number;  // which rank position they're all tied at
}

export interface PhaseClosePreview {
  total_matches: number;
  played_matches: number;
  pending_matches: number;
  can_close_normally: boolean;
  classified: ClassifiedTeam[];
  ties_at_boundary: TieGroup[];  // ties that affect who classifies
  recommended_qualifiers: number;
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
}
