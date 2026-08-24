create or replace function public.apply_score_event(p_match_id uuid,p_action jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare m matches;old jsonb;new jsonb;typ text:=p_action->>'type';side text:=p_action->>'team';val int:=coalesce((p_action->>'value')::int,1);key text;last_event score_events;first_side text;second_side text;winning_id uuid;summary text;should_rotate boolean:=false;should_finish boolean:=false;
begin
 select * into m from matches where id=p_match_id for update;
 if m.id is null then raise exception 'Match not found';end if;
 if not(m.scorer_id=auth.uid() or is_admin()) then raise exception 'Not assigned to this match';end if;
 if m.status in ('completed','cancelled') then raise exception 'This match is finished and read-only';end if;
 old:=m.score_state;new:=old;

 if typ='start_match' then
   if m.status<>'scheduled' then raise exception 'Match has already started';end if;
   if m.sport='cricket' then
     side:=case when side='b' then 'b' else 'a' end;
     new:=new||jsonb_build_object('innings',1,'battingTeam',side,'runs',0,'wickets',0,'balls',0);
   end if;
   update matches set status='live',score_state=new,updated_at=now() where id=p_match_id;
   return new;
 elsif m.status='scheduled' then raise exception 'Start the match before scoring';
 elsif typ='undo' then
   select * into last_event from score_events where match_id=p_match_id and undone_at is null order by id desc limit 1;
   if last_event.id is null then return old;end if;
   new:=last_event.state_before;update score_events set undone_at=now() where id=last_event.id;
 elsif m.sport='cricket' and typ in ('runs','wicket','wide','no_ball','end_innings') then
   if typ='runs' then new:=jsonb_set(jsonb_set(new,'{runs}',to_jsonb(coalesce((new->>'runs')::int,0)+val)),'{balls}',to_jsonb(coalesce((new->>'balls')::int,0)+1));
   elsif typ='wicket' then
     if coalesce((new->>'wickets')::int,0)>=10 then raise exception 'The batting team is already all out';end if;
     new:=jsonb_set(jsonb_set(new,'{wickets}',to_jsonb(coalesce((new->>'wickets')::int,0)+1)),'{balls}',to_jsonb(coalesce((new->>'balls')::int,0)+1));
   elsif typ in ('wide','no_ball') then new:=jsonb_set(new,'{runs}',to_jsonb(coalesce((new->>'runs')::int,0)+val));
   elsif typ='end_innings' then
     if coalesce((new->>'innings')::int,1)<>1 then raise exception 'The chase is already in progress';end if;
     should_rotate:=true;
   end if;

   if coalesce((new->>'innings')::int,1)=1 and (coalesce((new->>'wickets')::int,0)>=10 or (new ? 'maxBalls' and coalesce((new->>'balls')::int,0)>=coalesce((new->>'maxBalls')::int,999999))) then should_rotate:=true;end if;
   if should_rotate then
     side:=case when coalesce(new->>'battingTeam','a')='a' then 'b' else 'a' end;
     new:=new||jsonb_build_object('innings1Runs',coalesce((new->>'runs')::int,0),'innings1Wickets',coalesce((new->>'wickets')::int,0),'innings1Balls',coalesce((new->>'balls')::int,0),'target',coalesce((new->>'runs')::int,0)+1,'innings',2,'battingTeam',side,'runs',0,'wickets',0,'balls',0);
   elsif coalesce((new->>'innings')::int,1)=2 then
     if coalesce((new->>'runs')::int,0)>=coalesce((new->>'target')::int,2147483647) or coalesce((new->>'wickets')::int,0)>=10 or (new ? 'maxBalls' and coalesce((new->>'balls')::int,0)>=coalesce((new->>'maxBalls')::int,999999)) then should_finish:=true;end if;
   end if;
 elsif typ='score' then key:=case when m.sport in ('badminton','volleyball','table_tennis') then case when side='a' then 'pointsA' else 'pointsB' end else case when side='a' then 'teamA' else 'teamB' end end;new:=jsonb_set(new,array[key],to_jsonb(coalesce((new->>key)::int,0)+val));
 elsif typ='next_set' then new:=new||jsonb_build_object('setsA',coalesce((new->>'setsA')::int,0)+(case when coalesce((new->>'pointsA')::int,0)>coalesce((new->>'pointsB')::int,0) then 1 else 0 end),'setsB',coalesce((new->>'setsB')::int,0)+(case when coalesce((new->>'pointsB')::int,0)>coalesce((new->>'pointsA')::int,0) then 1 else 0 end),'pointsA',0,'pointsB',0,'currentSet',coalesce((new->>'currentSet')::int,1)+1);
 elsif typ='start_timer' then new:=new||jsonb_build_object('timer_started_at',now(),'timer_status','running');
 elsif typ='pause_timer' then new:=new||jsonb_build_object('elapsed_seconds',coalesce((new->>'elapsed_seconds')::int,0)+extract(epoch from(now()-(new->>'timer_started_at')::timestamptz))::int,'timer_started_at',null,'timer_status','paused');
 elsif typ='next_period' then new:=jsonb_set(new,'{period}',to_jsonb(case when m.sport='football' then case when new->>'period'='FIRST HALF' then 'SECOND HALF' else 'FIRST HALF' end else case new->>'period' when 'Q1' then 'Q2' when 'Q2' then 'Q3' when 'Q3' then 'Q4' else 'Q1' end end));
 elsif typ='finish' then should_finish:=true;
 else raise exception 'Unknown score action';
 end if;

 if should_finish and m.sport='cricket' and coalesce((new->>'innings')::int,1)=2 then
   second_side:=coalesce(new->>'battingTeam','b');first_side:=case when second_side='a' then 'b' else 'a' end;
   if coalesce((new->>'runs')::int,0)>=coalesce((new->>'target')::int,2147483647) then
     winning_id:=case when second_side='a' then m.team_a_id else m.team_b_id end;
     summary:=(case when second_side='a' then (select short_name from teams where id=m.team_a_id) else (select short_name from teams where id=m.team_b_id) end)||' won by '||(10-coalesce((new->>'wickets')::int,0))||' wickets';
   elsif coalesce((new->>'runs')::int,0)=coalesce((new->>'innings1Runs')::int,0) then summary:='Match tied';
   else
     winning_id:=case when first_side='a' then m.team_a_id else m.team_b_id end;
     summary:=(case when first_side='a' then (select short_name from teams where id=m.team_a_id) else (select short_name from teams where id=m.team_b_id) end)||' won by '||(coalesce((new->>'innings1Runs')::int,0)-coalesce((new->>'runs')::int,0))||' runs';
   end if;
 end if;
 if should_finish then update matches set status='completed',score_state=new,winner_id=winning_id,result_summary=coalesce(summary,result_summary),updated_at=now() where id=p_match_id;
 else update matches set score_state=new,updated_at=now() where id=p_match_id;end if;
 if typ<>'undo' then insert into score_events(match_id,actor_id,action,state_before,state_after) values(p_match_id,auth.uid(),p_action,old,new);end if;
 return new;
end$$;
