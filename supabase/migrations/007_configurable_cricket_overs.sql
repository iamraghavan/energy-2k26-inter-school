create or replace function public.configure_cricket_match(p_match_id uuid,p_overs integer) returns jsonb language plpgsql security definer set search_path=public as $$
declare m matches;new_state jsonb;
begin
 select * into m from matches where id=p_match_id for update;
 if m.id is null then raise exception 'Match not found';end if;
 if not(m.scorer_id=auth.uid() or is_admin()) then raise exception 'Not assigned to this match';end if;
 if m.sport<>'cricket' then raise exception 'Overs can only be configured for cricket';end if;
 if m.status<>'scheduled' then raise exception 'Overs must be configured before the match starts';end if;
 if p_overs<1 or p_overs>50 then raise exception 'Overs must be between 1 and 50';end if;
 new_state:=m.score_state||jsonb_build_object('maxBalls',p_overs*6,'runs',0,'wickets',0,'balls',0,'innings',1);
 update matches set score_state=new_state,updated_at=now() where id=p_match_id;
 return new_state;
end$$;
grant execute on function public.configure_cricket_match(uuid,integer) to authenticated;
