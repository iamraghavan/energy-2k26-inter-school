create table if not exists public.team_sports(
 team_id uuid not null references public.teams(id) on delete cascade,
 sport text not null check(sport in ('football','badminton','volleyball','basketball','cricket','table_tennis','chess')),
 created_at timestamptz not null default now(),
 primary key(team_id,sport)
);
alter table public.team_sports enable row level security;
create policy "public reads team sports" on public.team_sports for select using(true);
create policy "admins manage team sports" on public.team_sports for all to authenticated using(public.is_admin()) with check(public.is_admin());

create or replace function public.register_match_teams_for_sport() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into team_sports(team_id,sport) values(new.team_a_id,new.sport),(new.team_b_id,new.sport) on conflict do nothing;
 return new;
end$$;
drop trigger if exists register_match_teams_trigger on public.matches;
create trigger register_match_teams_trigger after insert or update of team_a_id,team_b_id,sport on public.matches for each row execute function public.register_match_teams_for_sport();

with schools(name,short_name) as (values
 ('Cavvery Public School, Karaikal','CPSK'),('GHSS Akkaraippettai','GHSSA'),('CSI Higher Secondary School','CSIHSS'),
 ('SRVS National Higher Secondary School','SRVSNHSS'),('Govt. Hr. Sec. School – Kurukkathi','GHSSKUR'),
 ('Ghouthia Higher Secondary School','GHOUTHIA'),('Velammal Bodhi Campus','VBC'),
 ('Government Hr. Secondary School, Sembodai','GHSSSEM'),('Govt. Model HSS, Thopputhurai','GMHSST'),
 ('ONGC Public School','ONGCPS'),('Chinmaya Vidyalaya, Nagapattinam','CVN'),('KMK Hr. Sec. School, Karaikal','KMKHSS'),
 ('Best Matric Higher Secondary School','BESTMHSS'),('GHSS Enangudi','GHSSE'),
 ('Government Hr. Sec. School, Umbalachery','GHSSUMB'),('Adharsh Matric Hr. Sec. School','AMHSS'),
 ('EGSPJ International School','EGSPJIS'),('CHSS Vilunthamavadi','CHSSV'),
 ('Amrita Vidyalayam, Nagapattinam','AVN'),('TPGHSS Kovilpathu, Karaikal','TPGHSS')
)
insert into public.teams(name,short_name)
select name,short_name from schools
where not exists(select 1 from public.teams t where lower(t.name)=lower(schools.name))
on conflict(short_name) do nothing;

insert into public.team_sports(team_id,sport)
select id,'cricket' from public.teams where short_name in
('CPSK','GHSSA','CSIHSS','SRVSNHSS','GHSSKUR','GHOUTHIA','VBC','GHSSSEM','GMHSST','ONGCPS','CVN','KMKHSS','BESTMHSS','GHSSE','GHSSUMB','AMHSS','EGSPJIS','CHSSV','AVN','TPGHSS')
on conflict do nothing;
