import { LeagueTeam, LeagueMatch } from '../types';

export type FixtureFormat = 'RoundRobin' | 'Groups';

export interface GroupConfig {
  groupName: string;
  teams: LeagueTeam[];
}

/**
 * Pure functions for fixture generation
 */
export const FixtureEngine = {
  /**
   * Distributes teams into groups using snake draft so cabezas de serie
   * (ordenados primero) queden repartidos en grupos distintos cuando hay cupo.
   */
  distributeGroups(teams: LeagueTeam[], teamsPerGroup: number): GroupConfig[] {
    const sortedTeams = [...teams].sort((a, b) => {
      if (a.is_seeded && !b.is_seeded) return -1;
      if (!a.is_seeded && b.is_seeded) return 1;
      return (a.order_index || 0) - (b.order_index || 0);
    });

    const n = sortedTeams.length;
    const G = Math.max(1, Math.ceil(n / Math.max(1, teamsPerGroup)));
    const groups: GroupConfig[] = Array.from({ length: G }, (_, i) => ({
      groupName: `Grupo ${String.fromCharCode(65 + i)}`,
      teams: []
    }));

    sortedTeams.forEach((team, i) => {
      const row = Math.floor(i / G);
      let col = i % G;
      if (row % 2 === 1) col = G - 1 - col;
      groups[col].teams.push(team);
    });

    return groups;
  },

  generateRoundRobin(
    teams: LeagueTeam[],
    categoryId: string,
    groupId: string | null = null,
    isDoubleRound: boolean = false
  ): Partial<LeagueMatch>[] {
    const matches: Partial<LeagueMatch>[] = [];
    const complete = teams.filter((t) => t.player1_id && t.player2_id);
    if (complete.length < 2) return [];

    const n = complete.length;
    const isOdd = n % 2 !== 0;
    const participants: (LeagueTeam | null)[] = isOdd ? [...complete, null] : [...complete];
    const rounds = participants.length - 1;
    const matchesPerRound = participants.length / 2;

    const singleRoundMatches: Partial<LeagueMatch>[] = [];

    for (let j = 0; j < rounds; j++) {
      for (let i = 0; i < matchesPerRound; i++) {
        const team1 = participants[i];
        const team2 = participants[participants.length - 1 - i];

        if (team1 && team2) {
          singleRoundMatches.push({
            league_category_id: categoryId,
            league_group_id: groupId,
            team1_id: team1.id,
            team2_id: team2.id,
            round: j + 1,
            status: 'pendiente',
            team1_sets: 0,
            team1_games: 0,
            team2_sets: 0,
            team2_games: 0
          });
        }
      }
      const last = participants.pop();
      if (last !== undefined) {
        participants.splice(1, 0, last);
      }
    }

    matches.push(...singleRoundMatches);

    if (isDoubleRound) {
      const secondRound = singleRoundMatches.map((m) => ({
        ...m,
        team1_id: m.team2_id,
        team2_id: m.team1_id,
        round: m.round! + rounds
      }));
      matches.push(...secondRound);
    }

    return matches;
  }
};
