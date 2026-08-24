# EGS Live Sports

Realtime multi-sport scoreboard for EGS Sports Meet 2026.

## Run locally

1. Copy `.env.example` to `.env.local` and enter the Supabase project URL and publishable key.
2. Apply `supabase/migrations/001_initial.sql` in the Supabase SQL Editor, then optionally run `supabase/seed.sql`.
3. Create scorer/admin users in Supabase Auth. Add each user's UUID to `profiles`; assign scorer UUIDs to matches.
4. Run `pnpm install` and `pnpm dev`.

Without environment variables, the app opens in a fully interactive preview mode with demo tournament data.

Routes: `/display`, `/scorer`, `/admin`.

## Deploy

Build command: `pnpm build`  
Output directory: `dist`

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Cloudflare Pages. Never add the database password to frontend environment variables.
