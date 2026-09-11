-- Moves achievement badge unlock requirements (previously hardcoded in
-- client/src/lib/achievements.js) into a DB table so an admin can retune
-- thresholds/tiers/copy from the new admin Badges tab without a code
-- deploy. Fixed 12-row catalog (3 badge types x 4 rarities, matching
-- BADGE_TYPE_LIST in FifaCard.jsx) — editable in place, not admin-extensible
-- with new rows, so only a select/update policy is needed, no insert/delete.
--
-- threshold drives 'matches' (vs games_played) and 'mvp' (vs mvp_count).
-- tier drives 'ranked' — the tier a player must have passed or be top-3 in
-- (null means "always met", used for the ranked/common row). See
-- highestEarnedRarity/fetchAchievementRequirements in achievements.js for
-- how these two columns turn into a live met() check.
create table if not exists badge_requirements (
  type text not null,
  rarity text not null,
  label text not null,
  threshold int,
  tier text,
  primary key (type, rarity)
);

alter table badge_requirements enable row level security;

drop policy if exists "Anyone can read badge requirements" on badge_requirements;
create policy "Anyone can read badge requirements" on badge_requirements
  for select using (true);

drop policy if exists "Admins can update badge requirements" on badge_requirements;
create policy "Admins can update badge requirements" on badge_requirements
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

insert into badge_requirements (type, rarity, label, threshold, tier) values
  ('matches', 'common',    'Play 3 matches', 3, null),
  ('matches', 'rare',      'Play 10 matches', 10, null),
  ('matches', 'epic',      'Play 25 matches', 25, null),
  ('matches', 'legendary', 'Play 50 matches', 50, null),
  ('mvp',     'common',    'Become MVP 1 time', 1, null),
  ('mvp',     'rare',      'Become MVP 5 times', 5, null),
  ('mvp',     'epic',      'Become MVP 15 times', 15, null),
  ('mvp',     'legendary', 'Become MVP 30 times', 30, null),
  ('ranked',  'common',    'Joined Bolahh', null, null),
  ('ranked',  'rare',      'Reach Top 3 in Gangsa tier or higher', null, 'gangsa'),
  ('ranked',  'epic',      'Reach Top 3 in Perak tier or higher', null, 'perak'),
  ('ranked',  'legendary', 'Reach Top 3 in Emas tier', null, 'emas')
on conflict (type, rarity) do nothing;
