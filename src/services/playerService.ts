import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/supabaseErrors';
import { Client } from '../types';
import { normalizeGenderForDb } from '../utils/gender';

async function assertRutAvailable(rut: string, excludeClientId?: string) {
  let q = supabase.from('clients').select('id').eq('rut', rut).limit(1);
  if (excludeClientId) q = q.neq('id', excludeClientId);
  const { data } = await q.maybeSingle();
  if (data) throw new Error('Ya existe un jugador asociado a este RUT.');
}

export const playerService = {
  async getAll(filters?: {
    search?: string;
    gender?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  }) {
    const pageSize = filters?.pageSize || 10;
    const page = filters?.page || 1;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' });

    if (filters?.search) {
      const search = filters.search;
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,rut.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (filters?.gender && filters.gender !== 'all') {
      // Map gender using normalization utility
      const dbGender = normalizeGenderForDb(filters.gender);
      query = query.eq('gender', dbGender);
    }

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('categoria', filters.category);
    }

    const { data, error, count } = await query
      .order('last_name', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(mapSupabaseError(error));

    return {
      players: data as Client[],
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  /** Valores distintos de `clients.categoria` (y secundaria) para filtros sin inventar catálogo local. */
  async getDistinctPlayerCategories() {
    const { data, error } = await supabase.from('clients').select('categoria, categoria_secundaria');
    if (error) throw new Error(mapSupabaseError(error));
    const names = new Set<string>();
    (data || []).forEach((row: { categoria?: string; categoria_secundaria?: string | null }) => {
      if (row.categoria?.trim()) names.add(row.categoria.trim());
      if (row.categoria_secundaria?.trim()) names.add(row.categoria_secundaria.trim());
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(mapSupabaseError(error));
    return data as Client;
  },

  async create(player: Omit<Client, 'id' | 'created_at' | 'updated_at'>) {
    await assertRutAvailable(player.rut);

    const { data, error } = await supabase
      .from('clients')
      .insert([{
        ...player,
        gender: normalizeGenderForDb(player.gender)
      }])
      .select()
      .single();

    if (error) throw new Error(mapSupabaseError(error));
    return data as Client;
  },

  async update(id: string, player: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>) {
    if (player.rut !== undefined) {
      await assertRutAvailable(player.rut, id);
    }

    const updateData = { ...player };
    if (updateData.gender) {
      updateData.gender = normalizeGenderForDb(updateData.gender) as any;
    }

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(mapSupabaseError(error));
    return data as Client;
  },

  async delete(id: string) {
    // 1. Check if player is used as Player 1
    const { data: p1Usage, error: e1 } = await supabase
      .from('league_teams')
      .select('id, team_name')
      .eq('player1_id', id)
      .limit(1);

    if (e1) throw new Error(mapSupabaseError(e1));
    if (p1Usage && p1Usage.length > 0) {
      throw new Error(`No se puede eliminar: El jugador es titular en la pareja "${p1Usage[0].team_name}".`);
    }

    // 2. Check if player is used as Player 2
    const { data: p2Usage, error: e2 } = await supabase
      .from('league_teams')
      .select('id, team_name')
      .eq('player2_id', id)
      .limit(1);

    if (e2) throw new Error(mapSupabaseError(e2));
    if (p2Usage && p2Usage.length > 0) {
      throw new Error(`No se puede eliminar: El jugador es compañero en la pareja "${p2Usage[0].team_name}".`);
    }

    // 3. Process deletion
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Delete error details:', deleteError);
      throw new Error(mapSupabaseError(deleteError));
    }

    return true;
  }
};
