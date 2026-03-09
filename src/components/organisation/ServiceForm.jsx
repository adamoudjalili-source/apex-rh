import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ROLES } from '../../utils/constants'

export default function ServiceForm({ service, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    division_id: '',
    chef_service_id: '',
    is_active: true,
  });
  const [divisions, setDivisions] = useState([]);
  const [chefsService, setChefsService] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name || '',
        description: service.description || '',
        division_id: service.division_id || '',
        chef_service_id: service.chef_service_id || '',
        is_active: service.is_active ?? true,
      });
    }
    fetchDivisions();
    fetchChefsService();
  }, [service]);

  async function fetchDivisions() {
    const { data } = await supabase
      .from('divisions')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setDivisions(data || []);
  }

  async function fetchChefsService() {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', ROLES.CHEF_SERVICE)
      .eq('is_active', true)
      .order('last_name');
    setChefsService(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      division_id: form.division_id || null,
      chef_service_id: form.chef_service_id || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (service) {
      result = await supabase.from('services').update(payload).eq('id', service.id);
    } else {
      result = await supabase.from('services').insert(payload);
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
          Nom du Service <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Ex : Service Comptabilité"
          className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Description du service..."
          rows={3}
          className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Division parente</label>
        <select
          value={form.division_id}
          onChange={e => setForm({ ...form, division_id: e.target.value })}
          className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition"
        >
          <option value="">— Aucune —</option>
          {divisions.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Chef de Service</label>
        <select
          value={form.chef_service_id}
          onChange={e => setForm({ ...form, chef_service_id: e.target.value })}
          className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition"
        >
          <option value="">— Aucun —</option>
          {chefsService.map(c => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}
            </option>
          ))}
        </select>
        {chefsService.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">Aucun utilisateur avec le rôle "Chef de Service" trouvé.</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active_svc"
          checked={form.is_active}
          onChange={e => setForm({ ...form, is_active: e.target.checked })}
          className="rounded border-white/20 bg-[#1a1a2e] text-indigo-500"
        />
        <label htmlFor="is_active_svc" className="text-sm text-gray-300">Service actif</label>
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
          {loading ? 'Enregistrement...' : service ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  );
}