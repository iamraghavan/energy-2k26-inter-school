import { useCallback, useEffect, useState } from 'react'
import { demoMatches } from '../data/demo'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Match } from '../types'

const hydrate = (row: any): Match => ({ ...row, team_a: row.team_a, team_b: row.team_b })
const DEMO_STORAGE_KEY = 'egs_demo_matches_v1'

const loadDemoMatches = (): Match[] => {
  if (typeof window === 'undefined') return demoMatches
  try {
    const saved = localStorage.getItem(DEMO_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // fallback to demo matches if parsing fails
  }
  return demoMatches
}

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>(() => isSupabaseConfigured ? demoMatches : loadDemoMatches())
  const [connected, setConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [usingFallback, setUsingFallback] = useState(!isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)
  const fetchMatches = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    setLoading(true)
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    try {
      const { data, error: fetchError } = await supabase
        .from('matches_view')
        .select('*')
        .order('scheduled_at')
        .abortSignal(controller.signal)
      if (fetchError) throw fetchError
      if (!data?.length) throw new Error('No match data is available yet')
      setMatches(data.map(hydrate))
      setUsingFallback(false)
      setError(null)
      setLastUpdated(new Date())
    } catch (cause) {
      setMatches(current => current.length ? current : demoMatches)
      setUsingFallback(true)
      setError(cause instanceof Error ? cause.message : 'Live data is unavailable')
    } finally {
      window.clearTimeout(timeout)
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    if (!isSupabaseConfigured && matches.length > 0) {
      try {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(matches))
      } catch {
        // ignore storage quota errors
      }
    }
  }, [matches])
  useEffect(() => {
    fetchMatches()
    if (!isSupabaseConfigured) return
    const channel = supabase.channel('tournament-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchMatches())
      .subscribe(status => {
        const online = status === 'SUBSCRIBED'
        setConnected(online)
        if (online) fetchMatches()
      })
    const onOnline = () => fetchMatches()
    window.addEventListener('online', onOnline)
    return () => { window.removeEventListener('online', onOnline); supabase.removeChannel(channel) }
  }, [fetchMatches])
  return { matches, setMatches, connected: isSupabaseConfigured ? connected && !usingFallback : true, lastUpdated, loading, demo: usingFallback, error, refresh: fetchMatches }
}
