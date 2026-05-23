export type TeamPlayers = {
  player1_id: string;
  player2_id: string | null;
};

export function normalizePlayer2Id(id: string | null | undefined): string | null {
  if (!id || String(id).trim() === '') return null;
  return id;
}

export function resolveTeamPlayers(
  current: TeamPlayers,
  incoming: Partial<TeamPlayers>
): TeamPlayers {
  return {
    player1_id: (incoming.player1_id ?? current.player1_id) as string,
    player2_id:
      incoming.player2_id !== undefined
        ? normalizePlayer2Id(incoming.player2_id)
        : normalizePlayer2Id(current.player2_id)
  };
}

/** Cuántos jugadores cambian respecto al estado actual. */
export function countPlayerChanges(current: TeamPlayers, next: TeamPlayers): number {
  let n = 0;
  if (next.player1_id !== current.player1_id) n += 1;
  if (next.player2_id !== current.player2_id) n += 1;
  return n;
}

/**
 * Pareja ya en juego: solo reemplazo de un jugador; la fila league_teams (y sus puntos) se mantiene.
 * Retorna mensaje de error o null si OK.
 */
export function validatePartnerChangeInPlay(
  current: TeamPlayers,
  incoming: Partial<TeamPlayers>
): string | null {
  const next = resolveTeamPlayers(current, incoming);
  const changes = countPlayerChanges(current, next);

  if (changes === 0) return null;

  if (changes > 1) {
    return 'Solo puedes reemplazar un jugador a la vez. El que se queda conserva los puntos de la pareja.';
  }

  if (!next.player2_id) {
    return 'No puedes dejar la pareja incompleta mientras está en juego.';
  }

  if (next.player1_id === next.player2_id) {
    return 'Los dos jugadores no pueden ser el mismo.';
  }

  return null;
}
