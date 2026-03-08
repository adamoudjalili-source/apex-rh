import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function DirectionForm({ direction, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    directeur_id: '',
    is_active: true,
  });
  const [directeurs, setDirecteurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (direction) {
      setForm({
        name: direction.name || '',
        description: direction.description || '',
        directeur_id: direction.directeur_id || '',
        is_active: direction.is_active ?? true,
      });
    }
    fetchDirecteurs();
  }, [direction]);

  async function fetchDirecteurs() {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'directeur')
      .eq('is_active', true)
      .order('last_name');
    setDirecteurs(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      directeur_id: form.directeur_id || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (direction) {
      result = await supabase.from('directions').update(payload).eq('id', direction.id);
    } else {
      result = await supabase.from('directions').insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Nom de la Direction <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Ex : Direction Commerciale"
          className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Description de la direction..."
          rows={3}
          className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Directeur assigné</label>
        <select
          value={form.directeur_id}
          onChange={e => setForm({ ...form, directeur_id: e.target.value })}
          className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition"
        >
          <option value="">— Aucun —</option>
          {directeurs.map(d => (
            <option key={d.id} value={d.id}>
              {d.first_name} {d.last_name}
            </option>
          ))}
        </select>
        {directeurs.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">Aucun utilisateur avec le rôle "Directeur" trouvé.</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active_dir"
          checked={form.is_active}
          onChange={e => setForm({ ...form, is_active: e.target.checked })}
          className="rounded border-white/20 bg-[#1a1a2e] text-indigo-500"
        />
        <label htmlFor="is_active_dir" className="text-sm text-gray-300">Direction active</label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition text-sm"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : direction ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  );
}