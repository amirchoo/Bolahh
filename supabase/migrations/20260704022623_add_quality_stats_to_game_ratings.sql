alter table game_ratings add column if not exists shooting_quality int not null default 0;
alter table game_ratings add column if not exists passing_quality int not null default 0;
