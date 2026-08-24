insert into public.tournaments(name,starts_on,ends_on) values('EGS Sports Meet 2026','2026-08-24','2026-08-26');
insert into public.teams(name,short_name,color) values('Computer Science','CSE','#18c77b'),('Electronics','ECE','#f1a227'),('Mechanical','MECH','#4da6ff'),('Electrical','EEE','#ef5b66'),('Information Technology','IT','#a77bf3');
insert into public.matches(tournament_id,sport,gender,team_a_id,team_b_id,scheduled_at,venue,status,score_state,featured)
select t.id,'football','men',a.id,b.id,'2026-08-24 09:30+05:30','Main Ground','live','{"teamA":2,"teamB":1,"period":"SECOND HALF","elapsed_seconds":3138,"timer_status":"paused"}',true from tournaments t,teams a,teams b where a.short_name='CSE' and b.short_name='ECE' limit 1;

insert into public.matches(tournament_id,sport,gender,team_a_id,team_b_id,scheduled_at,venue,status,score_state,featured)
select t.id,'badminton','men',a.id,b.id,'2026-08-24 10:00+05:30','Court 1','live','{"setsA":1,"setsB":1,"pointsA":15,"pointsB":12,"currentSet":3}',false from tournaments t,teams a,teams b where a.short_name='MECH' and b.short_name='IT' limit 1;

insert into public.matches(tournament_id,sport,gender,team_a_id,team_b_id,scheduled_at,venue,status,score_state,featured)
select t.id,'volleyball','women',a.id,b.id,'2026-08-24 10:05+05:30','Court 2','live','{"setsA":2,"setsB":1,"pointsA":20,"pointsB":17,"currentSet":4}',false from tournaments t,teams a,teams b where a.short_name='CSE' and b.short_name='EEE' limit 1;

insert into public.matches(tournament_id,sport,gender,team_a_id,team_b_id,scheduled_at,venue,status,score_state,featured)
select t.id,'basketball','men',a.id,b.id,'2026-08-24 10:10+05:30','Indoor Court','live','{"teamA":62,"teamB":57,"period":"Q4","elapsed_seconds":261,"timer_status":"paused"}',false from tournaments t,teams a,teams b where a.short_name='ECE' and b.short_name='MECH' limit 1;
