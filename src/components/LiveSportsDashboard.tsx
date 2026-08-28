import { AlertTriangle, CalendarClock, MapPin, Radio, RefreshCw, Trophy, WifiOff } from 'lucide-react'
import type { Match } from '../types'
import { formatTime, genderLabel, sportName } from '../utils'
import { Score } from './Score'

type HeaderProps = { clock: Date; connected: boolean }
type DataNoticeProps = { loading: boolean; error: string | null; onRetry: () => void }

export function ScoreboardHeader({ clock, connected }: HeaderProps) {
  return <header className="led-header">
    <div className="led-brand"><div className="led-brand-plate"><img src="/Energy-school-meet.png" alt="Energy 2026 Inter-School Sports Meet" /></div></div>
    <div className="led-title"><strong>LIVE <i>SPORTS</i></strong></div>
    <div className="led-clock"><div><small>{clock.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</small><time>{clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</time></div><b className={connected ? 'is-live' : 'is-offline'}>{connected ? <Radio /> : <WifiOff />}{connected ? 'LIVE' : 'OFFLINE'}</b></div>
  </header>
}

export function DataNotice({ loading, error, onRetry }: DataNoticeProps) {
  return <div className="led-data-notice"><strong>{loading ? 'SYNCING' : 'DATA OFFLINE'}</strong><span>{error ? 'LIVE CONNECTION UNAVAILABLE • NO SAMPLE DATA SHOWN' : 'LOADING LIVE MATCHES'}</span><button onClick={onRetry} disabled={loading}><RefreshCw className={loading ? 'is-spinning' : ''} />RETRY</button></div>
}

export function FeaturedMatch({ match, next }: { match?: Match; next?: Match }) {
  return <article className="led-featured">
    {match ? <div key={match.id} className="led-featured-content">
      <div className="led-featured-top"><span>FEATURED MATCH</span><b><i />LIVE</b></div>
      <div className="led-sport"><h1>{sportName(match.sport)}</h1><p>{genderLabel(match.gender)} <i>•</i> {match.venue}</p></div>
      <Score match={match} />
    </div> : <div className="led-standby"><CalendarClock /><span>STANDBY</span><h2>NEXT MATCH</h2>{next ? <><strong>{sportName(next.sport)}</strong><p>{next.team_a.short_name} <i>VS</i> {next.team_b.short_name}</p><b>{formatTime(next.scheduled_at)} • {next.venue}</b></> : <p>FIXTURES WILL APPEAR HERE</p>}</div>}
  </article>
}

export function LiveMatchCard({ match }: { match: Match }) {
  return <article className={`led-live-card sport-${match.sport}`}>
    <div className="led-card-meta"><strong>{sportName(match.sport)} <em>• {genderLabel(match.gender)}</em></strong><span><MapPin />{match.venue}</span></div>
    <Score match={match} compact />
  </article>
}

export function LiveMatches({ matches, count, page, pages }: { matches: Match[]; count: number; page: number; pages: number }) {
  return <aside className="led-live-panel">
    <div className="led-section-title"><h2><i />LIVE NOW</h2><span>{count} MATCHES{pages > 1 ? ` • ${page + 1}/${pages}` : ''}</span></div>
    <div className="led-live-list" key={page}>{matches.length ? matches.map(match => <LiveMatchCard key={match.id} match={match} />) : <div className="led-no-secondary">FEATURED MATCH IS LIVE</div>}</div>
  </aside>
}

export function UpcomingMatch({ match }: { match?: Match }) {
  return <section className="led-up-next">
    <div className="led-section-title"><h2><CalendarClock />UP NEXT</h2></div>
    {match ? <div className="led-next-content"><time>{formatTime(match.scheduled_at)}</time><div><strong>{sportName(match.sport)} <em>• {genderLabel(match.gender)}</em></strong><b>{match.team_a.short_name} <i>VS</i> {match.team_b.short_name}</b><span>{match.venue}</span></div></div> : <p className="led-empty">NO UPCOMING FIXTURES</p>}
  </section>
}

export function LatestResults({ matches }: { matches: Match[] }) {
  return <section className="led-results">
    <div className="led-section-title"><h2><Trophy />LATEST RESULTS</h2></div>
    <div className="led-result-list">{matches.length ? matches.slice(0, 2).map(match => <div key={match.id}><strong>{sportName(match.sport)} <em>• {genderLabel(match.gender)}</em></strong><span>{match.result_summary || match.score_state.result || `${match.team_a.short_name} vs ${match.team_b.short_name}`}</span></div>) : <p className="led-empty">RESULTS WILL APPEAR HERE</p>}</div>
  </section>
}

export function NewsTicker({ text, connected, demo, lastUpdated }: { text: string; connected: boolean; demo: boolean; lastUpdated: Date }) {
  return <footer className="led-ticker"><strong>EGS UPDATE</strong><div><span>{text}</span></div>{!connected && !demo && <small><AlertTriangle />UPDATED {lastUpdated.toLocaleTimeString()}</small>}</footer>
}
