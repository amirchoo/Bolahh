-- Attendance check-in for the rating page's team/bib setup step: lets a manager
-- confirm a player's bib number and mark them as having actually shown up,
-- with a timestamp, independent of the final rating submission (which only
-- happens once, at the end of the whole session).
alter table game_players add column if not exists checked_in_at timestamptz;
