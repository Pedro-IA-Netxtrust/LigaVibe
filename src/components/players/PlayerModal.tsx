import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Base';
import { Client, LeagueCategory } from '../../types';
import { validateRut, formatRut, validatePhone } from '../../utils/validation';
import { formatGenderForUi } from '../../utils/gender';
import { supabase } from '../../lib/supabase';

interface PlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  player?: Client | null;
  playerService: any;
}

export function PlayerModal({ isOpen, onClose, onSave, player, playerService }: PlayerModalProps) {
  const [formData, setFormData] = React.useState({
    rut: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: 'Masculino',
    categoria: '',
    categoria_secundaria: ''
  });
  
  const [categories, setCategories] = React.useState<LeagueCategory[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load existing categories for the dropdown
  React.useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase.from('league_categories').select('*').order('name');
      if (data) setCategories(data);
    }
    loadCategories();
  }, []);

  React.useEffect(() => {
    if (player) {
      setFormData({
        rut: player.rut,
        first_name: player.first_name,
        last_name: player.last_name,
        email: player.email || '',
        phone: player.phone || '',
        gender: player.gender ? (formatGenderForUi(player.gender) as any) : 'Masculino',
        categoria: player.categoria,
        categoria_secundaria: player.categoria_secundaria || ''
      });
    } else {
      setFormData({
        rut: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        gender: 'Masculino',
        categoria: '',
        categoria_secundaria: ''
      });
    }
    setError(null);
  }, [player, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!validateRut(formData.rut)) {
        throw new Error('RUT inválido. Debe tener formato 12345678-K');
      }

      if (formData.phone && !validatePhone(formData.phone)) {
        throw new Error('Teléfono inválido. Formato esperado: +56 9 1234 5678');
      }

      if (player) {
        await playerService.update(player.id, formData);
      } else {
        await playerService.create(formData);
      }
      
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, rut: formatRut(e.target.value) });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">
              {player ? 'Editar Jugador' : 'Nuevo Jugador'}
            </h3>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-400/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0" size={20} />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">RUT (Mandatorio)</label>
                <input
                  required
                  type="text"
                  placeholder="12345678-K"
                  value={formData.rut}
                  onChange={handleRutChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Género</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:border-indigo-500 transition-colors"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Nombres</label>
                <input
                  required
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Apellidos</label>
                <input
                  required
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Teléfono</label>
                <input
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Categoría</label>
                <select
                  required
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:border-indigo-500 transition-colors"
                >
                  <option value="">Seleccionar Categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Categoría Secundaria (Opcional)</label>
                <select
                  value={formData.categoria_secundaria}
                  onChange={(e) => setFormData({ ...formData, categoria_secundaria: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:border-indigo-500 transition-colors"
                >
                  <option value="">Sin Categoría Secundaria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={loading}>
                {player ? 'Guardar Cambios' : 'Crear Jugador'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
