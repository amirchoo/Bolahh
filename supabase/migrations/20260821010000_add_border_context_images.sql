-- Borders now need separate artwork per render context: the full card
-- (Profile / card modals), the Leaderboard's small rectangular avatar swatch,
-- and the circular PlayerAvatar used across Game Details (roster, Ballers of
-- the Match, standings, MVP popup). image_url is renamed to card_image_url
-- for symmetry with the two new columns; each is independently nullable so a
-- border can exist with just card art until its compact-context variants are
-- uploaded later.
alter table card_border_catalog rename column image_url to card_image_url;
alter table card_border_catalog add column if not exists leaderboard_image_url text;
alter table card_border_catalog add column if not exists roster_image_url text;

-- Variant art is added to an existing row after creation, not just on
-- insert, so admins need update access too (previously only select/insert/delete).
drop policy if exists "Admins can update border catalog entries" on card_border_catalog;
create policy "Admins can update border catalog entries" on card_border_catalog
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
