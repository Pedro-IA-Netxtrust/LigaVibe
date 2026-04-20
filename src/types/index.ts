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
  status: 'pendiente' | 'jugado' | 'live';
  team1_sets: number;
  team1_games: number;
  team2_sets: number;
  team2_games: number;
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
