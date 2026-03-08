import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/ui/Modal';
import DirectionForm from '../../components/organisation/DirectionForm';
import DivisionForm from '../../components/organisation/DivisionForm';
import ServiceForm from '../../components/organisation/ServiceForm';
import { usePermission } from '../../hooks/usePermission';


const TABS = [
  { key: 'directions', label: 'Directions', icon: '🏛️' },
  { key: 'divisions', label: 'Divisions', icon: '🗂️' },
  { key: 'services', label: 'Services', icon: '⚙️' },
];

function Badge({ active }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
    }`}>
      {active ? 'Actif' : 'Inactif'}
    </span>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition text-sm"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}

// ─── DIRECTIONS TAB ──────────────────────────────────────────────────────────
function DirectionsTab() {
  const [directions, setDirections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('directions')
      .select('*, directeur:users!directeur_id(first_name, last_name)')
      .order('name');
    setDirections(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = directions.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete() {
    await supabase.from('directions').delete().eq('id', selected.id);
    setModal(null);
    setSelected(null);
    fetch();
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          placeholder="Rechercher une direction..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition text-sm w-64"
        />
        <button
          onClick={() => { setSelected(null); setModal('create'); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
        >
          <span>+</span> Nouvelle Direction
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          {search ? 'Aucune direction trouvée.' : 'Aucune direction créée pour le moment.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Direction</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Directeur</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Description</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((dir, i) => (
                <tr
                  key={dir.id}
                  className={`border-b border-white/5 hover:bg-white/5 transition ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
                >
                  <td className="px-4 py-3 text-white font-medium">{dir.name}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {dir.directeur
                      ? `${dir.directeur.first_name} ${dir.directeur.last_name}`
                      : <span className="text-gray-500 italic">Non assigné</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                    {dir.description || <span className="italic text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3"><Badge active={dir.is_active} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setSelected(dir); setModal('edit'); }}
                        className="px-3 py-1 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-indigo-500 transition text-xs"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => { setSelected(dir); setModal('delete'); }}
                        className="px-3 py-1 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition text-xs"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'edit' ? 'Modifier la Direction' : 'Nouvelle Direction'}
      >
        <DirectionForm
          direction={modal === 'edit' ? selected : null}
          onSuccess={() => { setModal(null); fetch(); }}
          onCancel={() => setModal(null)}
        />
      </Modal>

      <Modal isOpen={modal === 'delete'} onClose={() => setModal(null)} title="Confirmer la suppression">
        <ConfirmDialog
          message={`Êtes-vous sûr de vouloir supprimer la direction "${selected?.name}" ? Cette action est irréversible.`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}

// ─── DIVISIONS TAB ────────────────────────────────────────────────────────────
function DivisionsTab() {
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDirection, setFilterDirection] = useState('');
  const [directions, setDirections] = useState([]);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('divisions')
      .select('*, direction:directions(name), chef:users!chef_division_id(first_name, last_name)')
      .order('name');
    setDivisions(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    supabase.from('directions').select('id, name').order('name').then(({ data }) => setDirections(data || []));
  }, [fetch]);

  const filtered = divisions.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchDir = filterDirection ? d.direction_id === filterDirection : true;
    return matchSearch && matchDir;
  });

  async function handleDelete() {
    await supabase.from('divisions').delete().eq('id', selected.id);
    setModal(null);
    setSelected(null);
    fetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Rechercher une division..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition text-sm w-56"
          />
          <select
            value={filterDirection}
            onChange={e => setFilterDirection(e.target.value)}
            className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition text-sm"
          >
            <option value="">Toutes les directions</option>
            {directions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setSelected(null); setModal('create'); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
        >
          <span>+</span> Nouvelle Division
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          {search || filterDirection ? 'Aucune division trouvée.' : 'Aucune division créée pour le moment.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Division</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Direction</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Chef de Division</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((div, i) => (
                <tr
                  key={div.id}
                  className={`border-b border-white/5 hover:bg-white/5 transition ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
                >
                  <td className="px-4 py-3 text-white font-medium">{div.name}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {div.direction?.name || <span className="text-gray-500 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {div.chef
                      ? `${div.chef.first_name} ${div.chef.last_name}`
                      : <span className="text-gray-500 italic">Non assigné</span>}
                  </td>
                  <td className="px-4 py-3"><Badge active={div.is_active} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setSelected(div); setModal('edit'); }}
                        className="px-3 py-1 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-indigo-500 transition text-xs"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => { setSelected(div); setModal('delete'); }}
                        className="px-3 py-1 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition text-xs"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'edit' ? 'Modifier la Division' : 'Nouvelle Division'}
      >
        <DivisionForm
          division={modal === 'edit' ? selected : null}
          onSuccess={() => { setModal(null); fetch(); }}
          onCancel={() => setModal(null)}
        />
      </Modal>

      <Modal isOpen={modal === 'delete'} onClose={() => setModal(null)} title="Confirmer la suppression">
        <ConfirmDialog
          message={`Êtes-vous sûr de vouloir supprimer la division "${selected?.name}" ?`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}

// ─── SERVICES TAB ─────────────────────────────────────────────────────────────
function ServicesTab() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [divisions, setDivisions] = useState([]);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('services')
      .select('*, division:divisions(name), chef:users!chef_service_id(first_name, last_name)')
      .order('name');
    setServices(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    supabase.from('divisions').select('id, name').order('name').then(({ data }) => setDivisions(data || []));
  }, [fetch]);

  const filtered = services.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchDiv = filterDivision ? s.division_id === filterDivision : true;
    return matchSearch && matchDiv;
  });

  async function handleDelete() {
    await supabase.from('services').delete().eq('id', selected.id);
    setModal(null);
    setSelected(null);
    fetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Rechercher un service..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition text-sm w-56"
          />
          <select
            value={filterDivision}
            onChange={e => setFilterDivision(e.target.value)}
            className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition text-sm"
          >
            <option value="">Toutes les divisions</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setSelected(null); setModal('create'); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
        >
          <span>+</span> Nouveau Service
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          {search || filterDivision ? 'Aucun service trouvé.' : 'Aucun service créé pour le moment.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Service</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Division</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Chef de Service</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((svc, i) => (
                <tr
                  key={svc.id}
                  className={`border-b border-white/5 hover:bg-white/5 transition ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
                >
                  <td className="px-4 py-3 text-white font-medium">{svc.name}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {svc.division?.name || <span className="text-gray-500 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {svc.chef
                      ? `${svc.chef.first_name} ${svc.chef.last_name}`
                      : <span className="text-gray-500 italic">Non assigné</span>}
                  </td>
                  <td className="px-4 py-3"><Badge active={svc.is_active} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setSelected(svc); setModal('edit'); }}
                        className="px-3 py-1 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-indigo-500 transition text-xs"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => { setSelected(svc); setModal('delete'); }}
                        className="px-3 py-1 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition text-xs"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'edit' ? 'Modifier le Service' : 'Nouveau Service'}
      >
        <ServiceForm
          service={modal === 'edit' ? selected : null}
          onSuccess={() => { setModal(null); fetch(); }}
          onCancel={() => setModal(null)}
        />
      </Modal>

      <Modal isOpen={modal === 'delete'} onClose={() => setModal(null)} title="Confirmer la suppression">
        <ConfirmDialog
          message={`Êtes-vous sûr de vouloir supprimer le service "${selected?.name}" ?`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────
export default function Organisation() {
  const { can } = usePermission();
  const [activeTab, setActiveTab] = useState('directions');

  if (!can('admin', 'organisation', 'read')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-white/30 text-sm">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
          Gestion de l'Organisation
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Structurez votre organisation : Directions → Divisions → Services
        </p>
      </div>

      {/* Breadcrumb visuel de la hiérarchie */}
      <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3 border border-white/10 text-sm">
        <span className="text-indigo-400 font-medium">🏛️ Direction</span>
        <span className="text-gray-600">→</span>
        <span className="text-purple-400 font-medium">🗂️ Division</span>
        <span className="text-gray-600">→</span>
        <span className="text-cyan-400 font-medium">⚙️ Service</span>
        <span className="text-gray-600">→</span>
        <span className="text-green-400 font-medium">👤 Collaborateur</span>
      </div>

      {/* Onglets */}
      <div className="border-b border-white/10">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-white/20'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu de l'onglet actif */}
      <div>
        {activeTab === 'directions' && <DirectionsTab />}
        {activeTab === 'divisions' && <DivisionsTab />}
        {activeTab === 'services' && <ServicesTab />}
      </div>
    </div>
  );
}