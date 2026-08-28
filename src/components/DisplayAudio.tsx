import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import type { Match } from '../types'

const scoreTotal = (match: Match) => {
  const score = match.score_state
  return (score.teamA || 0) + (score.teamB || 0) + (score.pointsA || 0) + (score.pointsB || 0) +
    (score.setsA || 0) + (score.setsB || 0) + (score.runs || 0) + (score.wickets || 0)
}

export function DisplayAudio({ matches }: { matches: Match[] }) {
  const [enabled, setEnabled] = useState(false)
  const contextRef = useRef<AudioContext | null>(null)
  const musicTimerRef = useRef<number>()
  const previousScores = useRef(new Map<string, number>())

  const playNote = (context: AudioContext, frequency: number) => {
    const oscillator = context.createOscillator(), gain = context.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(); oscillator.stop(context.currentTime + 0.6)
  }

  const startMusic = (context: AudioContext) => {
    const notes = [196, 246.94, 293.66, 246.94, 220, 261.63, 329.63, 261.63]
    let step = 0
    playNote(context, notes[step])
    musicTimerRef.current = window.setInterval(() => { step = (step + 1) % notes.length; playNote(context, notes[step]) }, 700)
  }

  const playCheer = () => {
    const context = contextRef.current
    if (!enabled || !context) return
    const duration = 1.4, buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate), data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain()
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = 1200; filter.Q.value = 0.55
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
    source.connect(filter).connect(gain).connect(context.destination); source.start()
  }

  const toggle = async () => {
    if (enabled) {
      if (musicTimerRef.current) window.clearInterval(musicTimerRef.current)
      await contextRef.current?.suspend(); setEnabled(false); return
    }
    const context = contextRef.current || new AudioContext()
    contextRef.current = context; await context.resume(); startMusic(context); setEnabled(true)
  }

  useEffect(() => {
    const live = matches.filter(match => match.status === 'live' || match.status === 'paused')
    let increased = false
    for (const match of live) {
      const total = scoreTotal(match), previous = previousScores.current.get(match.id)
      if (previous !== undefined && total > previous) increased = true
      previousScores.current.set(match.id, total)
    }
    if (increased) playCheer()
  }, [matches, enabled])

  useEffect(() => () => {
    if (musicTimerRef.current) window.clearInterval(musicTimerRef.current)
    void contextRef.current?.close()
  }, [])

  return <button className={`display-audio-toggle ${enabled ? 'is-on' : ''}`} onClick={toggle} aria-label={enabled ? 'Mute display sound' : 'Start display sound'}>
    {enabled ? <Volume2 /> : <VolumeX />}<span>{enabled ? 'SOUND ON' : 'START SOUND'}</span>
  </button>
}
