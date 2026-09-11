-- profiles.created_at has no DB default and nothing in signup ever sets it
-- (confirmed: 0 of 262 rows have it populated), so FifaCard's "DEBUTED"
-- line only ever worked on the ProfilePage using the logged-in user's own
-- Auth user.created_at — a value only readable about yourself, not other
-- players, since auth.users isn't exposed to the client for anyone else.
-- Backfilling from auth.users.created_at (readable here since this
-- migration runs with elevated privileges, unlike client-side RLS) gives
-- every profile a real join date that's safe to read cross-user like any
-- other profiles column, and the default keeps new signups populated too.
alter table profiles alter column created_at set default now();

update profiles p
set created_at = au.created_at
from auth.users au
where p.id = au.id and p.created_at is null;
