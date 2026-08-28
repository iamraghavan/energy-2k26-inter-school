import type { Match, Sport } from './types'
export const sportName = (s: Sport) => ({ football:'Football', badminton:'Badminton', volleyball:'Volleyball', basketball:'Basketball', cricket:'Cricket', kabaddi:'Kabaddi', table_tennis:'Table Tennis', chess:'Chess' }[s])
export const genderLabel = (g: Match['gender']) => g === 'men' ? 'M' : g === 'women' ? 'W' : 'Mixed'
export const formatTime = (iso: string) => new Intl.DateTimeFormat('en-IN',{hour:'2-digit',minute:'2-digit'}).format(new Date(iso))
export const padClock = (seconds = 0) => `${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`
export const runningSeconds = (m: Match) => {
  const s = m.score_state
  if (s.timer_status !== 'running' || !s.timer_started_at) return s.elapsed_seconds || 0
  return (s.elapsed_seconds || 0) + Math.floor((Date.now() - new Date(s.timer_started_at).getTime()) / 1000)
}
