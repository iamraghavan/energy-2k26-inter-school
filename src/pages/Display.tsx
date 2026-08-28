import { useEffect, useMemo, useState } from 'react'
import { DataNotice, FeaturedMatch, LatestResults, LiveMatches, NewsTicker, ScoreboardHeader, UpcomingMatch } from '../components/LiveSportsDashboard'
import { useAnnouncements } from '../hooks/useAnnouncements'
import { useMatches } from '../hooks/useMatches'

export function Display() {
  const { matches, connected, lastUpdated, demo, loading, error, refresh } = useMatches({ demoFallback: false })
  const { announcements } = useAnnouncements()
  const [clock, setClock] = useState(new Date())
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [livePage, setLivePage] = useState(0)

  useEffect(() => { const id = window.setInterval(() => setClock(new Date()), 1000); return () => window.clearInterval(id) }, [])
  useEffect(() => { const id = window.setInterval(() => setFeaturedIndex(value => value + 1), 12000); return () => window.clearInterval(id) }, [])
  useEffect(() => { const id = window.setInterval(() => setLivePage(value => value + 1), 8000); return () => window.clearInterval(id) }, [])

  const live = useMemo(() => matches.filter(match => match.status === 'live' || match.status === 'paused'), [matches])
  const preferred = live.find(match => match.featured)
  const featured = live.length ? (preferred && featuredIndex % live.length === 0 ? preferred : live[featuredIndex % live.length]) : undefined
  const secondary = live.filter(match => match.id !== featured?.id)
  const pageSize = 2
  const pageCount = Math.max(1, Math.ceil(secondary.length / pageSize))
  const activePage = livePage % pageCount
  const visibleLive = secondary.slice(activePage * pageSize, (activePage + 1) * pageSize)
  const upcoming = matches.filter(match => match.status === 'scheduled').sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at))
  const results = matches.filter(match => match.status === 'completed').sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
  const tickerText = announcements.filter(item => item.active).map(item => item.message).join('     ◆     ') || 'THE NEXT MATCH WILL BEGIN SHORTLY — GET READY FOR AN ACTION-PACKED BATTLE AT ENERGY 2026!'

  const showDataNotice = demo || loading || Boolean(error)
  return <main className={`led-page ${showDataNotice ? 'has-data-notice' : ''}`}>
    <ScoreboardHeader clock={clock} connected={connected} />
    {showDataNotice && <DataNotice loading={loading} error={error} onRetry={refresh} />}
    <section className="led-board">
      <FeaturedMatch match={featured} next={upcoming[0]} />
      <LiveMatches matches={visibleLive} count={live.length} page={activePage} pages={pageCount} />
      <UpcomingMatch match={upcoming[0]} />
      <LatestResults matches={results} />
    </section>
    <NewsTicker text={tickerText} connected={connected} demo={demo} lastUpdated={lastUpdated} />
  </main>
}
