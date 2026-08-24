import { useEffect, useState } from 'react'
import type { Match } from '../types'
import { padClock, runningSeconds, sportName } from '../utils'

export function Score({ match, compact=false }: { match: Match; compact?: boolean }) {
  const [, tick] = useState(0)
  useEffect(() => { if (match.score_state.timer_status !== 'running') return; const id=setInterval(()=>tick(x=>x+1),1000); return()=>clearInterval(id) },[match])
  const s=match.score_state
  if (match.sport==='cricket') return <div className="cricket-score"><strong>{s.runs||0}<small>/{s.wickets||0}</small></strong><span>{Math.floor((s.balls||0)/6)}.{(s.balls||0)%6} OVERS</span>{s.target&&<em>Target {s.target}</em>}</div>
  if (match.sport==='chess') return <div className="chess-score"><strong>{s.result || 'In progress'}</strong><span>{s.board || 'Board 1'}</span></div>
  const setSport=['badminton','volleyball','table_tennis'].includes(match.sport)
  const a=setSport ? s.pointsA||0 : s.teamA||0, b=setSport ? s.pointsB||0 : s.teamB||0
  return <>
    <div className={`versus ${compact?'compact':''}`}><div><span>{match.team_a.short_name}</span><strong>{a}</strong></div><i>—</i><div><span>{match.team_b.short_name}</span><strong>{b}</strong></div></div>
    {setSport && <div className="period">SETS {s.setsA||0} — {s.setsB||0} · SET {s.currentSet||1}</div>}
    {!setSport && match.sport!=='basketball' && <div className="period">{s.period || match.current_period || sportName(match.sport)} {match.sport==='football' && ` · ${padClock(runningSeconds(match))}`}</div>}
    {match.sport==='basketball' && <div className="period">{s.period||'Q1'} · {padClock(runningSeconds(match))}</div>}
  </>
}
