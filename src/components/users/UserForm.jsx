import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ROLES } from '../../utils/constants'

const ROLES_OPTIONS = [
  { value: ROLES.ADMINISTRATEUR, label: 'Administrateur' },
  { value: ROLES.DIRECTEUR, label: 'Directeur' },
  // { value: 'direction', label: 'Direction Générale' },  // supprimé — décision B-1
  { value: ROLES.CHEF_DIVISION, label: 'Chef de Division' },
  { value: ROLES.CHEF_SERVICE, label: 'Chef de Service' },
  { value: ROLES.COLLABORATEUR, label: 'Collaborateur' },
]

// ── Attendre que le trigger Supabase crée la ligne dans users ──
const waitForUserRow = async (userId, maxRetries = 10, delay = 300) => {
  for (let i = 0; i < maxRetries; i++) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()
    if (data) return true
    await new Promise((r) => setTimeout(r, delay))
  }
  throw new Error('Le compte a été créé mais le profil met du temps à se synchroniser. Rafraîchissez la page.')
}

export default function UserForm({ user, onSuccess}) {
  const isEdit = !!user

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: ROLES.COLLABORATEUR,
    direction_id: '',
    division_id: '',
    service_id: '',
    password: '',
  })
  const [directions, setDirections] = useState([])
  const [divisions, setDivisions] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Pré-remplir en mode édition
  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        role: user.role || ROLES.COLLABORATEUR,
        direction_id: user.direction_id || '',
        division_id: user.division_id || '',
        service_id: user.service_id || '',
        password: '',
      })
    }
  }, [user])

  // Charger les directions
  useEffect(() => {
    supabase.from('directions').select('id, name').eq('is_active', true).then(({ data }) => {
      if (data) setDirections(data)
    })
  }, [])

  // Charger les divisions (toutes, pour chef_division)
  useEffect(() => {
    supabase.from('divisions').select('id, name').eq('is_active', true).then(({ data }) => {
      if (data) setDivisions(data)
    })
  }, [])

  // Charger les services selon la division sélectionnée
  useEffect(() => {
    if (form.division_id) {
      supabase
        .from('services')
        .select('id, name')
        .eq('division_id', form.division_id)
        .eq('is_active', true)
        .then(({ data }) => {
          if (data) setServices(data)
        })
    } else {
      setServices([])
    }
  }, [form.division_id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // Réinitialiser les champs dépendants si le rôle change
      ...(name === 'role' ? { direction_id: '', division_id: '', service_id: '' } : {}),
      // Réinitialiser le service si la division change
      ...(name === 'division_id' ? { service_id: '' } : {}),
    }))
  }

  // ── Calcul des FK à sauvegarder selon le rôle ──────────────────
  const buildOrgFields = () => {
    switch (form.role) {
      case ROLES.DIRECTEUR:
        return {
          direction_id: form.direction_id || null,
          division_id: null,
          service_id: null,
        }
      case ROLES.CHEF_DIVISION:
        return {
          direction_id: null,
          division_id: form.division_id || null,
          service_id: null,
        }
      case ROLES.CHEF_SERVICE:
      case ROLES.COLLABORATEUR:
        return {
          direction_id: null,
          division_id: form.division_id || null,
          service_id: form.service_id || null,
        }
      default: // administrateur
        return {
          direction_id: null,
          division_id: null,
          service_id: null,
        }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const orgFields = buildOrgFields()

    try {
      if (isEdit) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            first_name: form.first_name,
            last_name: form.last_name,
            role: form.role,
            ...orgFields,
          })
          .eq('id', user.id)

        if (updateError) throw updateError
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              first_name: form.first_name,
              last_name: form.last_name,
            },
          },
        })
        if (authError) throw authError

        // Attendre que le trigger crée la ligne dans la table users
        await waitForUserRow(authData.user.id)

        const { error: profileError } = await supabase
          .from('users')
          .update({
            first_name: form.first_name,
            last_name: form.last_name,
            role: form.role,
            ...orgFields,
          })
          .eq('id', authData.user.id)

        if (profileError) throw profileError
      }

      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm'
  const labelClass = 'block text-xs font-medium text-white/60 mb-1.5'

  // ── Raccourcis booléens pour l'affichage conditionnel ──────────
  const showDirection = form.role === ROLES.DIRECTEUR  // 'direction' supprimé B-1
  const showDivision = [ROLES.CHEF_DIVISION, ROLES.CHEF_SERVICE, ROLES.COLLABORATEUR].includes(form.role)
  const showService = [ROLES.CHEF_SERVICE, ROLES.COLLABORATEUR].includes(form.role)

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Prénom + Nom côte à côte */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Prénom *</label>
          <input
            type="text"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            placeholder="Prénom"
            required
            autoComplete="off"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Nom *</label>
          <input
            type="text"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            placeholder="Nom"
            required
            autoComplete="off"
            className={inputClass}
          />
        </div>
      </div>

      {/* Email (création uniquement) */}
      {!isEdit && (
        <div>
          <label className={labelClass}>Adresse email *</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="email@exemple.com"
            required
            autoComplete="new-email"
            className={inputClass}
          />
        </div>
      )}

      {/* Mot de passe (création uniquement) */}
      {!isEdit && (
        <div>
          <label className={labelClass}>Mot de passe *</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Minimum 6 caractères"
            required
            minLength={6}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
      )}

      {/* Rôle */}
      <div>
        <label className={labelClass}>Rôle *</label>
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          required
          className={inputClass + ' cursor-pointer'}
        >
          {ROLES_OPTIONS.map((r) => (
            <option key={r.value} value={r.value} className="bg-[#1A1A2E]">
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Direction (Directeur uniquement) ───────────────── */}
      {showDirection && (
        <div>
          <label className={labelClass}>Direction</label>
          <select
            name="direction_id"
            value={form.direction_id}
            onChange={handleChange}
            className={inputClass + ' cursor-pointer'}
          >
            <option value="" className="bg-[#1A1A2E]">— Sélectionner une direction —</option>
            {directions.map((d) => (
              <option key={d.id} value={d.id} className="bg-[#1A1A2E]">{d.name}</option>
            ))}
          </select>
          {directions.length === 0 && (
            <p className="text-xs text-amber-400/70 mt-1.5">
              Aucune direction disponible. Créez-en une dans le module Organisation.
            </p>
          )}
        </div>
      )}

      {/* ── Division (Chef Division, Chef Service, Collaborateur) ── */}
      {showDivision && (
        <div>
          <label className={labelClass}>Division</label>
          <select
            name="division_id"
            value={form.division_id}
            onChange={handleChange}
            className={inputClass + ' cursor-pointer'}
          >
            <option value="" className="bg-[#1A1A2E]">— Sélectionner une division —</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id} className="bg-[#1A1A2E]">{d.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Service (Chef Service, Collaborateur) ─────────── */}
      {showService && (
        <div>
          <label className={labelClass}>Service</label>
          <select
            name="service_id"
            value={form.service_id}
            onChange={handleChange}
            disabled={!form.division_id}
            className={inputClass + ' cursor-pointer disabled:opacity-40'}
          >
            <option value="" className="bg-[#1A1A2E]">— Sélectionner un service —</option>
            {services.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#1A1A2E]">{s.name}</option>
            ))}
          </select>
          {form.division_id && services.length === 0 && (
            <p className="text-xs text-amber-400/70 mt-1.5">
              Aucun service dans cette division.
            </p>
          )}
          {!form.division_id && (
            <p className="text-xs text-white/30 mt-1.5">
              Sélectionnez d'abord une division.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : "Créer l'utilisateur"}
        </button>
      </div>
    </form>
  )
}