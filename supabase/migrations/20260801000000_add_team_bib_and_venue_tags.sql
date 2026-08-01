alter table game_players add column team_assignment text;
alter table game_players add column bib_number integer;
alter table game_feedback add column tags text[] not null default '{}';
