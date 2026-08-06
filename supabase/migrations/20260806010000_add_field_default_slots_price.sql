-- Per-field defaults for slots/price, configured only by bolahhadmin (AdminPage.jsx's
-- Fields tab). Managers no longer set these when creating a game — a new game just
-- inherits whichever field it's booked to.
alter table fields add column default_slots integer not null default 15;
alter table fields add column default_price numeric not null default 15;
