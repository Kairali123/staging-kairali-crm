// src/hooks/useEmployees.ts
// Fetches and caches employee data from GAS endpoint
// Usage in any component:
//   const { employees, grouped, nameList, loading, error, refetch } = useEmployees()

import { useState, useEffect, useCallback } from 'react'
import { transformEmployees, groupByDepartment, toNameList, type Employee } from '@/lib/employees'

const GAS_EMPLOYEES_URL = 'https://script.google.com/macros/s/AKfycbyAJuushBcFxdon4YG2sQCLqiYZV6RvpJlUWzyHFqkeCbOfyYqZiBcGSPKNVTouY01w/exec'

// ── Module-level cache so re-renders don't re-fetch ───────────────────────────
let _cache: Employee[] | null = null
let _fetchPromise: Promise<Employee[]> | null = null
const CACHE_TTL = 10 * 60 * 1000  // 10 minutes

let _cachedAt = 0

async function fetchEmployees(): Promise<Employee[]> {
  // Return cache if fresh
  if (_cache && Date.now() - _cachedAt < CACHE_TTL) return _cache

  // Deduplicate concurrent calls — reuse same promise
  if (_fetchPromise) return _fetchPromise

  _fetchPromise = (async () => {
    try {
      const res  = await fetch(GAS_EMPLOYEES_URL)
      if (!res.ok) throw new Error(`GAS responded ${res.status}`)
      const raw  = await res.json()
      const list = transformEmployees(raw)
      _cache    = list
      _cachedAt = Date.now()
      return list
    } finally {
      _fetchPromise = null
    }
  })()

  return _fetchPromise
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(_cache || [])
  const [loading,   setLoading]   = useState(!_cache)
  const [error,     setError]     = useState<string | null>(null)

  const load = useCallback(async (force = false) => {
    if (force) {
      _cache    = null
      _cachedAt = 0
    }
    setLoading(true)
    setError(null)
    try {
      const list = await fetchEmployees()
      setEmployees(list)
    } catch (e: any) {
      setError('Could not load employee list. Using defaults.')
      console.warn('[useEmployees]', e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return {
    employees,                              // Employee[] — full list, active only
    grouped:  groupByDepartment(employees), // Record<dept, Employee[]> — for optgroup
    nameList: toNameList(employees),        // string[] — for diarizer
    loading,
    error,
    refetch: () => load(true),             // force re-fetch, bypasses cache

    // Helpers used in the meetings page
    findByName:  (name: string)  => employees.find(e => e.name  === name),
    findByEmail: (email: string) => employees.find(e => e.email === email.toLowerCase()),
    getEmail:    (name: string)  => employees.find(e => e.name  === name)?.email || '',
  }
}