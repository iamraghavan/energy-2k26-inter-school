import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, MapPin, Radio, Trophy, WifiOff } from 'lucide-react'
import { Score } from '../components/Score'
import { useAnnouncements } from '../hooks/useAnnouncements'
import { useMatches } from '../hooks/useMatches'
import { formatTime, genderLabel, sportName } from '../utils'

export function Display(){
  const {matches,connected,lastUpdated,demo}=useMatches(), {announcements}=useAnnouncements(), [clock,setClock]=useState(new Date()), [rotation,setRotation]=useState(0)
  useEffect(()=>{const id=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(id)},[])
  const live=useMemo(()=>matches.filter(m=>m.status==='live'||m.status==='paused'),[matches])
  useEffect(()=>{const id=setInterval(()=>setRotation(x=>x+1),12000);return()=>clearInterval(id)},[])
  const preferred=live.find(m=>m.featured), featured=live.length ? (preferred && rotation%live.length===0 ? preferred : live[rotation%live.length]) : undefined
  const others=live.filter(m=>m.id!==featured?.id).slice(0,3), upcoming=matches.filter(m=>m.status==='scheduled').slice(0,6), results=matches.filter(m=>m.status==='completed').sort((a,b)=>+new Date(b.updated_at)-+new Date(a.updated_at)).slice(0,5)
  return <main className="display-page">
    <header className="display-header"><div className="display-logo"><img src="/Energy-school-meet-transparent.png" alt="Energy 2026 Inter-School Sports Meet"/></div><div className="header-center">LIVE SPORTS</div><div className="status"><time>{clock.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</time><span className={connected?'online':'offline'}>{connected?<Radio/>:<WifiOff/>}{connected?'LIVE':'CONNECTION LOST'}</span></div></header>
    {demo&&<div className="demo-ribbon">PREVIEW DATA · Connect Supabase to go live</div>}
    <section className="display-grid">
      <article className="featured-panel">
        {featured ? <div key={featured.id} className="featured-content"><div className="eyebrow"><span>FEATURED MATCH</span><span className="live-pill"><i/>LIVE</span></div><div className="featured-title"><span>{sportName(featured.sport)}</span><small>{featured.gender.toUpperCase()} · {featured.venue}</small></div><Score match={featured}/></div> : <div className="empty-state"><CalendarClock/><h2>No live matches</h2><p>The next fixture will appear here automatically.</p></div>}
      </article>
      <aside className="live-panel"><div className="section-heading"><span><i/>LIVE NOW</span><b>{live.length} MATCH{live.length===1?'':'ES'}</b></div><div className="live-list">{others.length?others.map(m=><div className="mini-match" key={m.id}><div className="mini-meta"><b>{sportName(m.sport)} <em>{genderLabel(m.gender)}</em></b><span><MapPin/> {m.venue}</span></div><Score match={m} compact/></div>):<p className="quiet">Other live matches will appear here.</p>}</div></aside>
      <section className="upcoming-panel"><div className="section-heading"><span><CalendarClock/>UPCOMING</span><b>NEXT FIXTURES</b></div><div className="fixture-row">{upcoming.length?upcoming.map(m=><div className="fixture" key={m.id}><time>{formatTime(m.scheduled_at)}</time><div><b>{sportName(m.sport)} <em>{genderLabel(m.gender)}</em></b><span>{m.team_a.short_name} <i>vs</i> {m.team_b.short_name}</span></div><small>{m.venue}</small></div>):<p className="quiet">No upcoming fixtures.</p>}</div></section>
      <section className="results-panel"><div className="section-heading"><span><Trophy/>LATEST RESULTS</span></div><div className="result-list">{results.length?results.map(m=><div key={m.id}><b>{sportName(m.sport)} <em>{genderLabel(m.gender)}</em></b><span>{m.result_summary||m.score_state.result||`${m.team_a.short_name} vs ${m.team_b.short_name}`}</span></div>):<p className="quiet">Results will appear here.</p>}</div></section>
    </section>
    <footer className="ticker"><strong>EGS UPDATE</strong><div><span>{announcements.filter(a=>a.active).map(a=>a.message).join('     ◆     ')||'WELCOME TO ENERGY 2026 INTER-SCHOOL SPORTS MEET'}</span></div>{!connected&&<small><AlertTriangle/> Last updated {lastUpdated.toLocaleTimeString()}</small>}</footer>
  </main>
}
