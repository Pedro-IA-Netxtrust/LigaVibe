import { Client } from '../types';
import { formatGenderForUi, getDbGenderValues, normalizeGenderForDb } from './gender';

/**
 * Valida combinación de géneros según el nombre de la categoría (heurística por texto).
 * Retorna mensaje de error o null si OK.
 */
export function validatePairForCategory(categoryName: string, p1: Client, p2: Client | null): string | null {
  if (!p2) return null;

  const lower = categoryName.toLowerCase();
  const isMixed = lower.includes('mixto') || lower.includes('mixta');

  if (isMixed) {
    const g1 = formatGenderForUi(p1.gender);
    const g2 = formatGenderForUi(p2.gender);
    if (g1 === g2) {
      return 'En categoría mixta la pareja debe combinar un jugador masculino y uno femenino.';
    }
    return null;
  }

  const femaleVals = getDbGenderValues('female');
  const maleVals = getDbGenderValues('male');
  const g1n = normalizeGenderForDb(p1.gender);
  const g2n = normalizeGenderForDb(p2.gender);

  if (lower.includes('damas') || lower.includes('mujeres') || lower.includes('femenino')) {
    if (!femaleVals.includes(g1n) || !femaleVals.includes(g2n)) {
      return 'En esta categoría ambos jugadores deben ser mujeres.';
    }
    return null;
  }

  if (lower.includes('varones') || lower.includes('hombres') || lower.includes('masculino')) {
    if (!maleVals.includes(g1n) || !maleVals.includes(g2n)) {
      return 'En esta categoría ambos jugadores deben ser hombres.';
    }
    return null;
  }

  return null;
}
