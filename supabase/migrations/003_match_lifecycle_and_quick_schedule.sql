-- Enforce immutable completed matches and support quick on-ground registration.
create or replace function public.create_scheduled_match(
  p_sport text,p_gender text,p_team_a text,p_team_b text,p_scheduled_at timestamptz,p_venue text
) returns uuid language plpgsql security definer set search_path=public as $$
declare a_id uuid;b_id uuid;new_id uuid;base_short text;caller_role user_role;
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  select role into caller_role from profiles where id=auth.uid();
  if caller_role is null then raise exception 'Scorer profile not found';end if;
  if p_sport not in ('football','badminton','volleyball','basketball','cricket','table_tennis','chess') then raise exception 'Invalid sport';end if;
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
         else '{"teamA":0,"teamB":0}'::jsonb end,
    auth.uid() from tournaments where active=true order by created_at desc limit 1 returning id into new_id;
  if new_id is null then raise exception 'No active tournament';end if;
  return new_id;
end$$;
grant execute on function public.create_scheduled_match(text,text,text,text,timestamptz,text) to authenticated;

-- Replace scoring function with strict lifecycle checks and explicit start.
create or replace function public.apply_score_event(p_match_id uuid,p_action jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare m matches;old jsonb;new jsonb;typ text:=p_action->>'type';side text:=p_action->>'team';val int:=coalesce((p_action->>'value')::int,1);key text;last_event score_events;
begin
 select * into m from matches where id=p_match_id for update;
 if m.id is null then raise exception 'Match not found';end if;
 if not(m.scorer_id=auth.uid() or is_admin()) then raise exception 'Not assigned to this match';end if;
 if m.status in ('completed','cancelled') then raise exception 'This match is finished and read-only';end if;
 old:=m.score_state;new:=old;
 if typ='start_match' then
   if m.status<>'scheduled' then raise exception 'Match has already started';end if;
   update matches set status='live',updated_at=now() where id=p_match_id;
 elsif m.status='scheduled' then raise exception 'Start the match before scoring';
 elsif typ='undo' then select * into last_event from score_events where match_id=p_match_id and undone_at is null order by id desc limit 1;if last_event.id is null then return old;end if;new:=last_event.state_before;update score_events set undone_at=now() where id=last_event.id;
 elsif typ='score' then key:=case when m.sport in ('badminton','volleyball','table_tennis') then case when side='a' then 'pointsA' else 'pointsB' end else case when side='a' then 'teamA' else 'teamB' end end;new:=jsonb_set(new,array[key],to_jsonb(coalesce((new->>key)::int,0)+val));
 elsif typ='runs' then new:=jsonb_set(jsonb_set(new,'{runs}',to_jsonb(coalesce((new->>'runs')::int,0)+val)),'{balls}',to_jsonb(coalesce((new->>'balls')::int,0)+1));
 elsif typ='wicket' then new:=jsonb_set(jsonb_set(new,'{wickets}',to_jsonb(coalesce((new->>'wickets')::int,0)+1)),'{balls}',to_jsonb(coalesce((new->>'balls')::int,0)+1));
 elsif typ='extra' then new:=jsonb_set(new,'{runs}',to_jsonb(coalesce((new->>'runs')::int,0)+val));
 elsif typ='next_set' then new:=new||jsonb_build_object('setsA',coalesce((new->>'setsA')::int,0)+(case when coalesce((new->>'pointsA')::int,0)>coalesce((new->>'pointsB')::int,0) then 1 else 0 end),'setsB',coalesce((new->>'setsB')::int,0)+(case when coalesce((new->>'pointsB')::int,0)>coalesce((new->>'pointsA')::int,0) then 1 else 0 end),'pointsA',0,'pointsB',0,'currentSet',coalesce((new->>'currentSet')::int,1)+1);
 elsif typ='start_timer' then new:=new||jsonb_build_object('timer_started_at',now(),'timer_status','running');
 elsif typ='pause_timer' then new:=new||jsonb_build_object('elapsed_seconds',coalesce((new->>'elapsed_seconds')::int,0)+extract(epoch from(now()-(new->>'timer_started_at')::timestamptz))::int,'timer_started_at',null,'timer_status','paused');
 elsif typ='next_period' then new:=jsonb_set(new,'{period}',to_jsonb(case when m.sport='football' then case when new->>'period'='FIRST HALF' then 'SECOND HALF' else 'FIRST HALF' end else case new->>'period' when 'Q1' then 'Q2' when 'Q2' then 'Q3' when 'Q3' then 'Q4' else 'Q1' end end));
 elsif typ='finish' then update matches set status='completed',score_state=new,updated_at=now() where id=p_match_id;
 else raise exception 'Unknown score action';
 end if;
 if typ not in ('start_match','finish') then update matches set score_state=new,updated_at=now() where id=p_match_id;end if;
 if typ not in ('undo','start_match') then insert into score_events(match_id,actor_id,action,state_before,state_after) values(p_match_id,auth.uid(),p_action,old,new);end if;
 return new;
end$$;
