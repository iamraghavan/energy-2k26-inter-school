import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { DataNotice, FeaturedMatch, LatestResults, LiveMatches, NewsTicker, UpcomingMatch } from '../components/LiveSportsDashboard'
import { DisplayAudio } from '../components/DisplayAudio'
import { useAnnouncements } from '../hooks/useAnnouncements'
import { useMatches } from '../hooks/useMatches'

const hiddenDisplayMatches = new Set(['5b9cd760-7131-46bf-98cc-5c3788fb1001'])

export function Display() {
  const { matches, connected, lastUpdated, demo, loading, error, refresh } = useMatches({ demoFallback: false })
  const { announcements } = useAnnouncements()
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [livePage, setLivePage] = useState(0)
  const boardRef = useRef<HTMLElement>(null)
  const entered = useRef(false)
  const previousScores = useRef(new Map<string, string>())

  useEffect(() => { const id = window.setInterval(() => setFeaturedIndex(value => value + 1), 12000); return () => window.clearInterval(id) }, [])
  useEffect(() => { const id = window.setInterval(() => setLivePage(value => value + 1), 8000); return () => window.clearInterval(id) }, [])
  useEffect(() => {
    const id = window.setInterval(() => window.location.reload(), 5 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [])

  const displayMatches = useMemo(() => matches.filter(match => !hiddenDisplayMatches.has(match.id)), [matches])
  const live = useMemo(() => displayMatches.filter(match => match.status === 'live' || match.status === 'paused'), [displayMatches])
  const preferred = live.find(match => match.featured)
  const featured = live.length ? (preferred && featuredIndex % live.length === 0 ? preferred : live[featuredIndex % live.length]) : undefined
  const secondary = live.filter(match => match.id !== featured?.id)
  const pageSize = 2
  const pageCount = Math.max(1, Math.ceil(secondary.length / pageSize))
  const activePage = livePage % pageCount
  const visibleLive = secondary.slice(activePage * pageSize, (activePage + 1) * pageSize)
  const upcoming = displayMatches.filter(match => match.status === 'scheduled').sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at))
  const results = displayMatches.filter(match => match.status === 'completed').sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
  const tickerText = announcements.filter(item => item.active).map(item => item.message).join('     ◆     ') || 'THE NEXT MATCH WILL BEGIN SHORTLY — GET READY FOR AN ACTION-PACKED BATTLE AT ENERGY 2026!'

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !boardRef.current) return
    const context = gsap.context(() => {
      if (!entered.current) {
        gsap.fromTo('.led-board > *', { opacity: 0, y: 34, scale: .97 }, { opacity: 1, y: 0, scale: 1, duration: .7, stagger: .1, ease: 'power3.out' })
        entered.current = true
      }
      for (const match of matches) {
        const signature = JSON.stringify(match.score_state), previous = previousScores.current.get(match.id)
        if (previous && previous !== signature) {
          const target = boardRef.current?.querySelector(`[data-match-id="${match.id}"] .score-change`)
          if (target) gsap.fromTo(target, { scale: .88, filter: 'brightness(2.4) drop-shadow(0 0 24px #fff200)' }, { scale: 1, filter: 'brightness(1) drop-shadow(0 0 0 transparent)', duration: .65, ease: 'elastic.out(1, .45)' })
        }
        previousScores.current.set(match.id, signature)
      }
    }, boardRef)
    return () => context.revert()
  }, [matches])

  const showDataNotice = demo || loading || Boolean(error)
  return <main className={`led-page ${showDataNotice ? 'has-data-notice' : ''}`}>
    {showDataNotice && <DataNotice loading={loading} error={error} onRetry={refresh} />}
    <section className="led-board" ref={boardRef}>
      <FeaturedMatch match={featured} next={upcoming[0]} />
      <LiveMatches matches={visibleLive} count={live.length} page={activePage} pages={pageCount} />
      <UpcomingMatch match={upcoming[0]} />
      <LatestResults matches={results} />
    </section>
    <NewsTicker text={tickerText} connected={connected} demo={demo} lastUpdated={lastUpdated} />
    <DisplayAudio matches={matches} />
  </main>
}
