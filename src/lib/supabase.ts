import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const isSupabaseConfigured = Boolean(
  url &&
  key &&
  !url.includes('your-project.supabase.co') &&
  !key.includes('your-publishable-anon-key')
)
export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder', {
  realtime: { params: { eventsPerSecond: 5 } },
  auth: { persistSession: true, autoRefreshToken: true }
})

