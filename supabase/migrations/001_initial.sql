-- EGS Live Sports: schema, RLS, one-channel realtime, and atomic score events.
create extension if not exists pgcrypto;
create type public.match_status as enum ('scheduled','live','paused','completed','cancelled');
create type public.user_role as enum ('admin','scorer');

create table public.tournaments(id uuid primary key default gen_random_uuid(),name text not null,starts_on date,ends_on date,active boolean default true,created_at timestamptz default now());
create table public.teams(id uuid primary key default gen_random_uuid(),name text not null,short_name text not null unique,color text default '#18c77b',created_at timestamptz default now());
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,full_name text,role public.user_role not null default 'scorer');
create table public.matches(
 id uuid primary key default gen_random_uuid(), tournament_id uuid references public.tournaments(id) on delete cascade,
 sport text not null check(sport in ('football','badminton','volleyball','basketball','cricket','table_tennis','chess')),
 gender text not null check(gender in ('men','women','mixed')),team_a_id uuid not null references public.teams(id),team_b_id uuid not null references public.teams(id),
 scheduled_at timestamptz not null,venue text not null,status public.match_status not null default 'scheduled',score_state jsonb not null default '{}'::jsonb,
 current_period text,featured boolean not null default false,winner_id uuid references public.teams(id),result_summary text,scorer_id uuid references public.profiles(id),updated_at timestamptz not null default now(),
 constraint different_teams check(team_a_id <> team_b_id)
);
create table public.score_events(id bigint generated always as identity primary key,match_id uuid not null references public.matches(id) on delete cascade,actor_id uuid references auth.users(id),action jsonb not null,state_before jsonb not null,state_after jsonb not null,created_at timestamptz default now(),undone_at timestamptz);
create index matches_status_schedule_idx on public.matches(status,scheduled_at);
create index score_events_match_idx on public.score_events(match_id,id desc);

create view public.matches_view with (security_invoker=true) as select m.*,to_jsonb(a) as team_a,to_jsonb(b) as team_b from public.matches m join public.teams a on a.id=m.team_a_id join public.teams b on b.id=m.team_b_id;
grant select on public.matches_view to anon,authenticated;
alter table public.tournaments enable row level security;alter table public.teams enable row level security;alter table public.matches enable row level security;alter table public.profiles enable row level security;alter table public.score_events enable row level security;
create policy "public reads tournaments" on public.tournaments for select using(true);create policy "public reads teams" on public.teams for select using(true);create policy "public reads matches" on public.matches for select using(true);
create policy "own profile read" on public.profiles for select to authenticated using(id=auth.uid());
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and role='admin')$$;
create policy "admins manage tournaments" on public.tournaments for all to authenticated using(public.is_admin()) with check(public.is_admin());create policy "admins manage teams" on public.teams for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "assigned scorers update" on public.matches for update to authenticated using(scorer_id=auth.uid() or public.is_admin()) with check(scorer_id=auth.uid() or public.is_admin());create policy "admins insert matches" on public.matches for insert to authenticated with check(public.is_admin());create policy "admins delete matches" on public.matches for delete to authenticated using(public.is_admin());
create policy "event readers" on public.score_events for select to authenticated using(actor_id=auth.uid() or public.is_admin());

create or replace function public.apply_score_event(p_match_id uuid,p_action jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare m matches; old jsonb; new jsonb; typ text:=p_action->>'type'; side text:=p_action->>'team'; val int:=coalesce((p_action->>'value')::int,1); key text; last_event score_events;
begin
 select * into m from matches where id=p_match_id for update;
 if m.id is null then raise exception 'Match not found'; end if;
 if not (m.scorer_id=auth.uid() or is_admin()) then raise exception 'Not assigned to this match'; end if;
 old:=m.score_state;new:=old;
 if typ='undo' then select * into last_event from score_events where match_id=p_match_id and undone_at is null order by id desc limit 1; if last_event.id is null then return old;end if;new:=last_event.state_before;update score_events set undone_at=now() where id=last_event.id;
 elsif typ='score' then key:=case when m.sport in ('badminton','volleyball','table_tennis') then case when side='a' then 'pointsA' else 'pointsB' end else case when side='a' then 'teamA' else 'teamB' end end;new:=jsonb_set(new,array[key],to_jsonb(coalesce((new->>key)::int,0)+val));
 elsif typ='runs' then new:=jsonb_set(jsonb_set(new,'{runs}',to_jsonb(coalesce((new->>'runs')::int,0)+val)),'{balls}',to_jsonb(coalesce((new->>'balls')::int,0)+1));
 elsif typ='wicket' then new:=jsonb_set(jsonb_set(new,'{wickets}',to_jsonb(coalesce((new->>'wickets')::int,0)+1)),'{balls}',to_jsonb(coalesce((new->>'balls')::int,0)+1));
 elsif typ='extra' then new:=jsonb_set(new,'{runs}',to_jsonb(coalesce((new->>'runs')::int,0)+val));
 elsif typ='next_set' then new:=new||jsonb_build_object('setsA',coalesce((new->>'setsA')::int,0)+(case when coalesce((new->>'pointsA')::int,0)>coalesce((new->>'pointsB')::int,0) then 1 else 0 end),'setsB',coalesce((new->>'setsB')::int,0)+(case when coalesce((new->>'pointsB')::int,0)>coalesce((new->>'pointsA')::int,0) then 1 else 0 end),'pointsA',0,'pointsB',0,'currentSet',coalesce((new->>'currentSet')::int,1)+1);
 elsif typ='start_timer' then new:=new||jsonb_build_object('timer_started_at',now(),'timer_status','running');
 elsif typ='pause_timer' then new:=new||jsonb_build_object('elapsed_seconds',coalesce((new->>'elapsed_seconds')::int,0)+extract(epoch from(now()-(new->>'timer_started_at')::timestamptz))::int,'timer_started_at',null,'timer_status','paused');
 elsif typ='next_period' then new:=jsonb_set(new,'{period}',to_jsonb(case when m.sport='football' then case when new->>'period'='FIRST HALF' then 'SECOND HALF' else 'FIRST HALF' end else case new->>'period' when 'Q1' then 'Q2' when 'Q2' then 'Q3' when 'Q3' then 'Q4' else 'Q1' end end));
 elsif typ='finish' then update matches set status='completed' where id=p_match_id;
 end if;
 update matches set score_state=new,updated_at=now() where id=p_match_id; if typ<>'undo' then insert into score_events(match_id,actor_id,action,state_before,state_after) values(p_match_id,auth.uid(),p_action,old,new);end if;return new;
end$$;
grant execute on function public.apply_score_event(uuid,jsonb) to authenticated;
alter publication supabase_realtime add table public.matches;
