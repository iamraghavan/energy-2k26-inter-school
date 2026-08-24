create table if not exists public.announcements(
 id uuid primary key default gen_random_uuid(),
 message text not null check(length(trim(message)) between 2 and 300),
 active boolean not null default true,
 priority integer not null default 0,
 starts_at timestamptz,
 ends_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists announcements_display_idx on public.announcements(active,priority desc,created_at desc);
alter table public.announcements enable row level security;
create policy "public reads announcements" on public.announcements for select using(true);
create policy "admins create announcements" on public.announcements for insert to authenticated with check(public.is_admin());
create policy "admins update announcements" on public.announcements for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "admins delete announcements" on public.announcements for delete to authenticated using(public.is_admin());
do $$begin alter publication supabase_realtime add table public.announcements;exception when duplicate_object then null;end$$;
