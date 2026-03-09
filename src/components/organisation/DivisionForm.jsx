import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ROLES } from '../../utils/constants'

export default function DivisionForm({ division, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    direction_id: '',
    chef_division_id: '',
    is_active: true,
  });
  const [directions, setDirections] = useState([]);
  const [chefsDivision, setChefsDivision] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (division) {
      setForm({
        name: division.name || '',
        description: division.description || '',
        direction_id: division.direction_id || '',
        chef_division_id: division.chef_division_id || '',
        is_active: division.is_active ?? true,
      });
    }
    fetchDirections();
    fetchChefsDivision();
  }, [division]);

  async function fetchDirections() {
    const { data } = await supabase
      .from('directions')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setDirections(data || []);
  }

  async function fetchChefsDivision() {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', ROLES.CHEF_DIVISION)
      .eq('is_active', true)
      .order('last_name');
    setChefsDivision(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      direction_id: form.direction_id || null,
      chef_division_id: form.chef_division_id || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (division) {
      result = await supabase.from('divisions').update(payload).eq('id', division.id);
    } else {
      result = await supabase.from('divisions').insert(payload);
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
          Nom de la Division <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Ex : Division Marketing"
          className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Description de la division..."
          rows={3}
          className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Direction parente</label>
        <select
          value={form.direction_id}
          onChange={e => setForm({ ...form, direction_id: e.target.value })}
          className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition"
        >
          <option value="">— Aucune —</option>
          {directions.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Chef de Division</label>
        <select
          value={form.chef_division_id}
          onChange={e => setForm({ ...form, chef_division_id: e.target.value })}
          className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition"
        >
          <option value="">— Aucun —</option>
          {chefsDivision.map(c => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}
            </option>
          ))}
        </select>
        {chefsDivision.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">Aucun utilisateur avec le rôle "Chef de Division" trouvé.</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active_div"
          checked={form.is_active}
          onChange={e => setForm({ ...form, is_active: e.target.checked })}
          className="rounded border-white/20 bg-[#1a1a2e] text-indigo-500"
        />
        <label htmlFor="is_active_div" className="text-sm text-gray-300">Division active</label>
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
          {loading ? 'Enregistrement...' : division ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  );
}