-- Lets one booker reserve slots for guest friends who don't have accounts.
-- Guest rows carry no user_id (no profiles row exists for them) and are
-- linked back to the booker via booked_by, so the booker pays for and owns
-- the whole group booking.
alter table game_players alter column user_id drop not null;
alter table game_players add column is_guest boolean not null default false;
alter table game_players add column guest_name text;
alter table game_players add column booked_by uuid references profiles(id) on delete set null;

alter table game_players add constraint game_players_guest_shape check (
  (is_guest = false and guest_name is null and booked_by is null)
  or (is_guest = true and guest_name is not null and booked_by is not null and user_id is null)
);

-- Both existing policies gate on auth.uid() = user_id, which a guest row (user_id
-- null) can never satisfy. Widen them so the booker can also insert/delete the
-- guest rows they own via booked_by — needed for the cash/wallet booking paths in
-- GameCheckoutPage.jsx (client-side inserts) and for cancellation to clean up guest
-- seats. The ToyyibPay edge functions insert via the service-role key and are
-- unaffected by RLS either way.
drop policy "User can insert own join" on game_players;
create policy "User can insert own join" on game_players
  for insert
  with check (auth.uid() = user_id or (is_guest and auth.uid() = booked_by));

drop policy "Users can delete their own game_players row" on game_players;
create policy "Users can delete their own game_players row" on game_players
  for delete
  using (auth.uid() = user_id or (is_guest and auth.uid() = booked_by));
