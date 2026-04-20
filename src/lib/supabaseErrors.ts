/**
 * Maps Supabase / PostgREST errors to short Spanish messages for admins.
 */
export function mapSupabaseError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Error desconocido.';
  const e = err as { message?: string; code?: string; details?: string };
  const code = e.code;
  const msg = (e.message || '').toLowerCase();

  if (code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
    if (msg.includes('rut')) return 'Ya existe un jugador con este RUT.';
    return 'Ya existe un registro con esos datos (duplicado).';
  }
  if (code === '23503' || msg.includes('foreign key')) {
    return 'No se puede completar la acción: hay datos relacionados en otra tabla.';
  }
  if (code === '23514' || msg.includes('violates check constraint')) {
    return 'Los datos no cumplen las reglas de la base de datos.';
  }
  if (code === 'PGRST116' || msg.includes('0 rows')) {
    return 'No se encontró el registro solicitado.';
  }
  if (e.message) return e.message;
  return 'Error al comunicarse con la base de datos.';
}
