export interface ComputedStanding {
  league_team_id: string;
  team_name: string;
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
}

const WIN_POINTS = 2;

function emptyRow(teamId: string, teamName: string): ComputedStanding {
  return {
    league_team_id: teamId,
    team_name: teamName,
    played: 0,
    won: 0,
    lost: 0,
    won2_0: 0,
    won2_1: 0,
    points: 0,
    sets_for: 0,
    sets_against: 0,
    games_for: 0,
    games_against: 0
  };
}

/** Agrega estadísticas solo a partir de partidos ya finalizados del slice recibido. */
export function computeStandingsFromMatches(
  finishedMatches: Array<{
    team1_id: string;
    team2_id: string;
    winner_id: string | null;
    team1_sets: number;
    team2_sets: number;
    team1_games: number;
    team2_games: number;
  }>,
  teamNames: Record<string, string>
): ComputedStanding[] {
  const byTeam = new Map<string, ComputedStanding>();

  const ensure = (id: string) => {
    if (!byTeam.has(id)) {
      byTeam.set(id, emptyRow(id, teamNames[id] || id.slice(0, 8)));
    }
    return byTeam.get(id)!;
  };

  Object.keys(teamNames).forEach((id) => ensure(id));

  for (const m of finishedMatches) {
    const a = ensure(m.team1_id);
    const b = ensure(m.team2_id);

    a.played += 1;
    b.played += 1;

    a.sets_for += m.team1_sets;
    a.sets_against += m.team2_sets;
    b.sets_for += m.team2_sets;
    b.sets_against += m.team1_sets;

    a.games_for += m.team1_games;
    a.games_against += m.team2_games;
    b.games_for += m.team2_games;
    b.games_against += m.team1_games;

    if (m.team1_sets === 2 && m.team2_sets === 0) {
      a.points += 3;
      a.won += 1;
      a.won2_0 += 1;
      b.lost += 1;
    } else if (m.team1_sets === 2 && m.team2_sets === 1) {
      a.points += 2;
      b.points += 1;
      a.won += 1;
      a.won2_1 += 1;
      b.lost += 1;
    } else if (m.team2_sets === 2 && m.team1_sets === 0) {
      b.points += 3;
      b.won += 1;
      b.won2_0 += 1;
      a.lost += 1;
    } else if (m.team2_sets === 2 && m.team1_sets === 1) {
      b.points += 2;
      a.points += 1;
      b.won += 1;
      b.won2_1 += 1;
      a.lost += 1;
    } else if (m.winner_id === m.team1_id) {
      a.points += 3;
      a.won += 1;
      a.won2_0 += 1;
      b.lost += 1;
    } else if (m.winner_id === m.team2_id) {
      b.points += 3;
      b.won += 1;
      b.won2_0 += 1;
      a.lost += 1;
    }
  }

  const rows = Array.from(byTeam.values()).filter((r) => r.played > 0);

  rows.sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    const dsx = x.sets_for - x.sets_against;
    const dsy = y.sets_for - y.sets_against;
    if (dsy !== dsx) return dsy - dsx;
    const dgx = x.games_for - x.games_against;
    const dgy = y.games_for - y.games_against;
    return dgy - dgx;
  });

  return rows;
}
