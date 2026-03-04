// ============================================================
// APEX RH — useTaskFilters.js
// ============================================================
import { useState, useCallback } from 'react'

const DEFAULT_FILTERS = {
  search: '',
  status: '',
  priority: '',
  service_id: '',
  division_id: '',
  assignee_id: '',
  due_date_from: '',
  due_date_to: '',
}

export function useTaskFilters() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [activeView, setActiveView] = useState('kanban') // 'kanban' | 'list' | 'calendar' | 'myday'

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  // Filtres actifs pour l'API (retire les valeurs vides)
  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '')
  )

  return {
    filters,
    activeFilters,
    activeView,
    setActiveView,
    updateFilter,
    resetFilters,
    hasActiveFilters,
  }
}