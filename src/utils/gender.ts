/**
 * Gender utility for Vibe Sport
 * Ensures consistency between UI (Capitalized) and Database (Lowercase/Enums)
 */

export const GENDER_MAP = {
  UI: {
    MALE: 'Masculino',
    FEMALE: 'Femenino',
    OTHER: 'Otro'
  },
  DB: {
    MALE: 'masculino',
    FEMALE: 'femenino',
    OTHER: 'otro'
  }
};

/**
 * Normalizes gender for database operations
 */
export function normalizeGenderForDb(gender: string): string {
  const g = gender.toLowerCase();
  if (g.startsWith('m')) return GENDER_MAP.DB.MALE;
  if (g.startsWith('f') || g.startsWith('d')) return GENDER_MAP.DB.FEMALE;
  return GENDER_MAP.DB.OTHER;
}

/**
 * Formats gender for UI display
 */
export function formatGenderForUi(gender: string): string {
  const g = gender.toLowerCase();
  if (g.startsWith('m')) return GENDER_MAP.UI.MALE;
  if (g.startsWith('f') || g.startsWith('d')) return GENDER_MAP.UI.FEMALE;
  return GENDER_MAP.UI.OTHER;
}

/**
 * Returns the list of valid database enum values
 */
export function getDbGenderValues(genderType: 'male' | 'female'): string[] {
  if (genderType === 'female') {
    // We try both just in case, but primary is lowercase
    return [GENDER_MAP.DB.FEMALE];
  }
  return [GENDER_MAP.DB.MALE];
}
