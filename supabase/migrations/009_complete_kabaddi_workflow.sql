-- Complete Kabaddi half transitions and final-result handling.
create or replace function public.ensure_kabaddi_timer_defaults() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.sport='kabaddi' then
    new.score_state:=new.score_state||jsonb_build_object(
      'period',coalesce(new.score_state->>'period','FIRST HALF'),
      'period_duration_seconds',coalesce((new.score_state->>'period_duration_seconds')::int,1200),
      'elapsed_seconds',coalesce((new.score_state->>'elapsed_seconds')::int,0),
      'timer_status',coalesce(new.score_state->>'timer_status','paused')
    );
  end if;
  return new;
end$$;

drop trigger if exists ensure_kabaddi_timer_defaults_trigger on public.matches;
create trigger ensure_kabaddi_timer_defaults_trigger
before insert or update of sport,score_state on public.matches
for each row execute function public.ensure_kabaddi_timer_defaults();

update public.matches
set score_state=score_state||jsonb_build_object(
  'period',coalesce(score_state->>'period','FIRST HALF'),
  'period_duration_seconds',coalesce((score_state->>'period_duration_seconds')::int,1200),
  'elapsed_seconds',coalesce((score_state->>'elapsed_seconds')::int,0),
  'timer_status',coalesce(score_state->>'timer_status','paused')
)
where sport='kabaddi';

create or replace function public.kabaddi_next_period(p_match_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare m matches;old_state jsonb;new_state jsonb;
begin
  select * into m from matches where id=p_match_id for update;
  if m.id is null or m.sport<>'kabaddi' then raise exception 'Kabaddi match not found';end if;
  if not(m.scorer_id=auth.uid() or is_admin()) then raise exception 'Not assigned to this match';end if;
  if m.status in ('completed','cancelled') then raise exception 'This match is finished and read-only';end if;
  if coalesce(m.score_state->>'period','FIRST HALF')='SECOND HALF' then raise exception 'Second half is already active';end if;
  old_state:=m.score_state;
  new_state:=old_state||jsonb_build_object('period','SECOND HALF','period_duration_seconds',1200,'elapsed_seconds',0,'timer_started_at',null,'timer_status','paused');
  update matches set score_state=new_state,current_period='SECOND HALF',updated_at=now() where id=p_match_id;
  insert into score_events(match_id,actor_id,action,state_before,state_after) values(p_match_id,auth.uid(),'{"type":"kabaddi_halftime"}',old_state,new_state);
  return new_state;
end$$;

create or replace function public.finish_kabaddi_match(p_match_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare m matches;old_state jsonb;new_state jsonb;a_score int;b_score int;summary text;winning_id uuid;
begin
  select * into m from matches where id=p_match_id for update;
  if m.id is null or m.sport<>'kabaddi' then raise exception 'Kabaddi match not found';end if;
  if not(m.scorer_id=auth.uid() or is_admin()) then raise exception 'Not assigned to this match';end if;
  if m.status in ('completed','cancelled') then raise exception 'This match is finished and read-only';end if;
  old_state:=m.score_state;new_state:=old_state;
  if new_state->>'timer_status'='running' and new_state->>'timer_started_at' is not null then
    new_state:=new_state||jsonb_build_object('elapsed_seconds',coalesce((new_state->>'elapsed_seconds')::int,0)+extract(epoch from(now()-(new_state->>'timer_started_at')::timestamptz))::int,'timer_started_at',null,'timer_status','paused');
  end if;
  a_score:=coalesce((new_state->>'teamA')::int,0);b_score:=coalesce((new_state->>'teamB')::int,0);
  if a_score=b_score then summary:='Match tied';
  elsif a_score>b_score then winning_id:=m.team_a_id;summary:=(select short_name from teams where id=m.team_a_id)||' won by '||(a_score-b_score)||' points';
  else winning_id:=m.team_b_id;summary:=(select short_name from teams where id=m.team_b_id)||' won by '||(b_score-a_score)||' points';end if;
  update matches set status='completed',score_state=new_state,winner_id=winning_id,result_summary=summary,updated_at=now() where id=p_match_id;
  insert into score_events(match_id,actor_id,action,state_before,state_after) values(p_match_id,auth.uid(),'{"type":"finish_kabaddi"}',old_state,new_state);
  return new_state;
end$$;

grant execute on function public.kabaddi_next_period(uuid) to authenticated;
grant execute on function public.finish_kabaddi_match(uuid) to authenticated;

-- Make newly created RPC functions immediately visible through PostgREST.
notify pgrst, 'reload schema';
