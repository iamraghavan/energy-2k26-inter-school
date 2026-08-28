import { useEffect, useState } from 'react'
import type { Match } from '../types'
import { padClock, runningSeconds, sportName } from '../utils'

export function Score({ match, compact=false }: { match: Match; compact?: boolean }) {
  const [, tick] = useState(0), [revision,setRevision]=useState(0)
  useEffect(() => { if (match.score_state.timer_status !== 'running') return; const id=setInterval(()=>tick(x=>x+1),1000); return()=>clearInterval(id) },[match])
  const scoreSignature=JSON.stringify({...match.score_state,timer_started_at:undefined})
  useEffect(()=>setRevision(x=>x+1),[scoreSignature])
  const s=match.score_state
  if (match.sport==='cricket') {
    const batting=s.battingTeam==='b'?match.team_b:match.team_a,opponent=s.battingTeam==='b'?match.team_a:match.team_b,ballsLeft=s.maxBalls?Math.max(0,s.maxBalls-(s.balls||0)):undefined,needed=s.target?Math.max(0,s.target-(s.runs||0)):0;
    if (compact) {
      return <div key={revision} className="cricket-score compact-score score-change">
        <div className="cricket-compact-main">
          <span className="batting-name">{batting.short_name}</span>
          <strong className="runs">{s.runs||0}/{s.wickets||0}</strong>
          <small className="overs">({Math.floor((s.balls||0)/6)}.{(s.balls||0)%6} ov)</small>
        </div>
        <div className="period">VS {opponent.short_name} · {s.innings===2?'2ND INN':'1ST INN'}</div>
      </div>
    }
    return <div key={revision} className="cricket-score score-change"><div className="cricket-teams"><b>{batting.short_name}</b><span>vs {opponent.short_name} · {s.innings===2?'2ND':'1ST'} INNINGS</span></div><strong>{s.runs||0}<small>/{s.wickets||0}</small></strong><span>{Math.floor((s.balls||0)/6)}.{(s.balls||0)%6} OVERS</span>{s.innings===2&&s.target&&<><em>Target {s.target}</em><small className="chase-line">Need {needed}{ballsLeft!==undefined?` from ${ballsLeft} balls`:''}</small></>}{s.innings===2&&s.innings1Runs!==undefined&&<small className="first-innings-line">1st innings · {opponent.short_name} {s.innings1Runs}/{s.innings1Wickets||0}</small>}</div>
  }
  if (match.sport==='chess') {
    if (compact) {
      return <div key={revision} className="chess-score compact-score score-change">
        <strong className="compact-result">{s.result || 'In progress'}</strong>
        <span className="period">{match.team_a.short_name} vs {match.team_b.short_name}</span>
      </div>
    }
    return <div key={revision} className="chess-score score-change"><strong>{s.result || 'In progress'}</strong><span>{s.board || 'Board 1'}</span></div>
  }
  if (match.sport==='kabaddi') {
    const a=s.teamA||0, b=s.teamB||0
    const remaining=Math.max(0,(s.period_duration_seconds||1200)-runningSeconds(match))
    return <div key={revision} className={`kabaddi-score score-change ${compact?'compact-score':''}`}>
      <div className="kabaddi-teams"><div><span>{match.team_a.short_name}</span><strong>{a}</strong></div><i>VS</i><div><span>{match.team_b.short_name}</span><strong>{b}</strong></div></div>
      <div className="kabaddi-period"><span>{s.period||'FIRST HALF'}</span><b>{padClock(remaining)}</b></div>
    </div>
  }
  const setSport=['badminton','volleyball','table_tennis'].includes(match.sport)
  const a=setSport ? s.pointsA||0 : s.teamA||0, b=setSport ? s.pointsB||0 : s.teamB||0
  return <div key={revision} className="score-change">
    <div className={`versus ${compact?'compact':''}`}><div><span>{match.team_a.short_name}</span><strong>{a}</strong></div><i>—</i><div><span>{match.team_b.short_name}</span><strong>{b}</strong></div></div>
    {setSport && <div className="period">SETS {s.setsA||0} — {s.setsB||0} · SET {s.currentSet||1}</div>}
    {!setSport && match.sport!=='basketball' && <div className="period">{s.period || match.current_period || sportName(match.sport)} {match.sport==='football' && ` · ${padClock(runningSeconds(match))}`}</div>}
    {match.sport==='basketball' && <div className="period">{s.period||'Q1'} · {padClock(runningSeconds(match))}</div>}
  </div>
}
