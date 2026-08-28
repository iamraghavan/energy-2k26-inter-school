-- Add Kabaddi scheduling, registration, scoring, timer, and period support.
alter table public.matches drop constraint if exists matches_sport_check;
alter table public.matches add constraint matches_sport_check check (
  sport in ('football','badminton','volleyball','basketball','cricket','kabaddi','table_tennis','chess')
);

alter table public.team_sports drop constraint if exists team_sports_sport_check;
alter table public.team_sports add constraint team_sports_sport_check check (
  sport in ('football','badminton','volleyball','basketball','cricket','kabaddi','table_tennis','chess')
);

create or replace function public.create_scheduled_match(
  p_sport text,p_gender text,p_team_a text,p_team_b text,p_scheduled_at timestamptz,p_venue text
) returns uuid language plpgsql security definer set search_path=public as $$
declare a_id uuid;b_id uuid;new_id uuid;base_short text;caller_role user_role;
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  select role into caller_role from profiles where id=auth.uid();
  if caller_role is null then raise exception 'Scorer profile not found';end if;
  if p_sport not in ('football','badminton','volleyball','basketball','cricket','kabaddi','table_tennis','chess') then raise exception 'Invalid sport';end if;
  if p_gender not in ('men','women','mixed') then raise exception 'Invalid category';end if;
  if length(trim(p_team_a))<2 or length(trim(p_team_b))<2 or lower(trim(p_team_a))=lower(trim(p_team_b)) then raise exception 'Enter two different team names';end if;
  select id into a_id from teams where lower(name)=lower(trim(p_team_a)) limit 1;
  if a_id is null then
    base_short:=upper(left(regexp_replace(trim(p_team_a),'[^a-zA-Z0-9]','','g'),8));
    begin insert into teams(name,short_name) values(trim(p_team_a),base_short) returning id into a_id;
    exception when unique_violation then insert into teams(name,short_name) values(trim(p_team_a),left(base_short,5)||upper(substr(gen_random_uuid()::text,1,3))) returning id into a_id;end;
  end if;
  select id into b_id from teams where lower(name)=lower(trim(p_team_b)) limit 1;
  if b_id is null then
    base_short:=upper(left(regexp_replace(trim(p_team_b),'[^a-zA-Z0-9]','','g'),8));
    begin insert into teams(name,short_name) values(trim(p_team_b),base_short) returning id into b_id;
    exception when unique_violation then insert into teams(name,short_name) values(trim(p_team_b),left(base_short,5)||upper(substr(gen_random_uuid()::text,1,3))) returning id into b_id;end;
  end if;
  insert into matches(tournament_id,sport,gender,team_a_id,team_b_id,scheduled_at,venue,status,score_state,scorer_id)
  select id,p_sport,p_gender,a_id,b_id,p_scheduled_at,trim(p_venue),'scheduled',
    case when p_sport in ('badminton','volleyball','table_tennis') then '{"setsA":0,"setsB":0,"pointsA":0,"pointsB":0,"currentSet":1}'::jsonb
         when p_sport='cricket' then '{"runs":0,"wickets":0,"balls":0,"innings":1}'::jsonb
         when p_sport='kabaddi' then '{"teamA":0,"teamB":0,"period":"FIRST HALF","elapsed_seconds":0,"timer_status":"paused"}'::jsonb
         else '{"teamA":0,"teamB":0}'::jsonb end,
    auth.uid() from tournaments where active=true order by created_at desc limit 1 returning id into new_id;
  if new_id is null then raise exception 'No active tournament';end if;
  return new_id;
end$$;
grant execute on function public.create_scheduled_match(text,text,text,text,timestamptz,text) to authenticated;

-- Patch the current scoring function's period behavior without changing its public API.
create or replace function public.kabaddi_next_period(p_match_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare m matches;new_state jsonb;
begin
  select * into m from matches where id=p_match_id for update;
  if m.id is null or m.sport<>'kabaddi' then raise exception 'Kabaddi match not found';end if;
  if not(m.scorer_id=auth.uid() or is_admin()) then raise exception 'Not assigned to this match';end if;
  if m.status in ('completed','cancelled') then raise exception 'This match is finished and read-only';end if;
  new_state:=m.score_state||jsonb_build_object('period',case when m.score_state->>'period'='FIRST HALF' then 'SECOND HALF' else 'FIRST HALF' end,'elapsed_seconds',0,'timer_started_at',null,'timer_status','paused');
  update matches set score_state=new_state,updated_at=now() where id=p_match_id;
  return new_state;
end$$;
grant execute on function public.kabaddi_next_period(uuid) to authenticated;
