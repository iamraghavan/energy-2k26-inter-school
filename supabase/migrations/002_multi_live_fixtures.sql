-- Representative four-live-match state for testing both LED aspect ratios.
insert into public.matches(tournament_id,sport,gender,team_a_id,team_b_id,scheduled_at,venue,status,score_state,featured,scorer_id)
select t.id,'football','men',a.id,b.id,'2026-08-24 09:30+05:30','Main Ground','live','{"teamA":2,"teamB":1,"period":"SECOND HALF","elapsed_seconds":3138,"timer_status":"paused"}',true,u.id
from tournaments t,teams a,teams b,auth.users u
where t.name='EGS Sports Meet 2026' and a.short_name='CSE' and b.short_name='ECE' and u.email='football.scorer@egslive.app'
and not exists(select 1 from matches where sport='football' and status='live') limit 1;

insert into public.matches(tournament_id,sport,gender,team_a_id,team_b_id,scheduled_at,venue,status,score_state,featured,scorer_id)
select t.id,'badminton','men',a.id,b.id,'2026-08-24 10:00+05:30','Court 1','live','{"setsA":1,"setsB":1,"pointsA":15,"pointsB":12,"currentSet":3}',false,u.id
from tournaments t,teams a,teams b,auth.users u
where t.name='EGS Sports Meet 2026' and a.short_name='MECH' and b.short_name='IT' and u.email='badminton.scorer@egslive.app'
and not exists(select 1 from matches where sport='badminton' and status='live') limit 1;

insert into public.matches(tournament_id,sport,gender,team_a_id,team_b_id,scheduled_at,venue,status,score_state,featured,scorer_id)
select t.id,'volleyball','women',a.id,b.id,'2026-08-24 10:05+05:30','Court 2','live','{"setsA":2,"setsB":1,"pointsA":20,"pointsB":17,"currentSet":4}',false,u.id
from tournaments t,teams a,teams b,auth.users u
where t.name='EGS Sports Meet 2026' and a.short_name='CSE' and b.short_name='EEE' and u.email='volleyball.scorer@egslive.app'
and not exists(select 1 from matches where sport='volleyball' and status='live') limit 1;

insert into public.matches(tournament_id,sport,gender,team_a_id,team_b_id,scheduled_at,venue,status,score_state,featured,scorer_id)
select t.id,'basketball','men',a.id,b.id,'2026-08-24 10:10+05:30','Indoor Court','live','{"teamA":62,"teamB":57,"period":"Q4","elapsed_seconds":261,"timer_status":"paused"}',false,u.id
from tournaments t,teams a,teams b,auth.users u
where t.name='EGS Sports Meet 2026' and a.short_name='ECE' and b.short_name='MECH' and u.email='basketball.scorer@egslive.app'
and not exists(select 1 from matches where sport='basketball' and status='live') limit 1;
