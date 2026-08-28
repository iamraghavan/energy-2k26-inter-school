export type Sport = 'football' | 'badminton' | 'volleyball' | 'basketball' | 'cricket' | 'kabaddi' | 'table_tennis' | 'chess'
export type MatchStatus = 'scheduled' | 'live' | 'paused' | 'completed' | 'cancelled'
export type Team = { id: string; name: string; short_name: string; color: string }
export type ScoreState = {
  teamA?: number; teamB?: number; pointsA?: number; pointsB?: number
  setsA?: number; setsB?: number; currentSet?: number; period?: string
  runs?: number; wickets?: number; balls?: number; target?: number; innings?: number
  battingTeam?: 'a' | 'b'; innings1Runs?: number; innings1Wickets?: number; innings1Balls?: number; maxBalls?: number
  timer_started_at?: string | null; elapsed_seconds?: number; timer_status?: 'running' | 'paused'
  board?: string; result?: string; note?: string
}
export type Match = {
  id: string; sport: Sport; gender: 'men' | 'women' | 'mixed'; team_a: Team; team_b: Team
  scheduled_at: string; venue: string; status: MatchStatus; score_state: ScoreState
  current_period?: string; featured: boolean; result_summary?: string; scorer_id?: string; updated_at: string
}
