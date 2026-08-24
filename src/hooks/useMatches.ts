import { useCallback, useEffect, useState } from 'react'
import { demoMatches } from '../data/demo'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Match } from '../types'

const hydrate = (row: any): Match => ({ ...row, team_a: row.team_a, team_b: row.team_b })
export function useMatches() {
  const [matches, setMatches] = useState<Match[]>(demoMatches)
  const [connected, setConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const fetchMatches = useCallback(async () => {
    if (!isSupabaseConfigured) return
    const { data, error } = await supabase.from('matches_view').select('*').order('scheduled_at')
    if (!error && data) { setMatches(data.map(hydrate)); setLastUpdated(new Date()) }
    setLoading(false)
  }, [])
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
  return { matches, setMatches, connected: isSupabaseConfigured ? connected : true, lastUpdated, loading, demo: !isSupabaseConfigured, refresh: fetchMatches }
}
