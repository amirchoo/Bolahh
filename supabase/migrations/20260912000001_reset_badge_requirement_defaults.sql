-- Resets badge_requirements back to a new set of defaults (thresholds and
-- ranked copy both changed from the original seed in
-- 20260912000000_add_badge_requirements_table.sql) — an UPDATE rather than
-- re-seeding, so any admin edits already made in the Badges tab are
-- deliberately overwritten to these values, same pattern as
-- 20260831020000_rename_ranked_award_borders.sql for card_border_catalog.
update badge_requirements set label = 'Played 5 matches',  threshold = 5,  tier = null where type = 'matches' and rarity = 'common';
update badge_requirements set label = 'Played 15 matches', threshold = 15, tier = null where type = 'matches' and rarity = 'rare';
update badge_requirements set label = 'Played 30 matches', threshold = 30, tier = null where type = 'matches' and rarity = 'epic';
update badge_requirements set label = 'Played 50 matches', threshold = 50, tier = null where type = 'matches' and rarity = 'legendary';

update badge_requirements set label = 'Become MVP 3 times',  threshold = 3,  tier = null where type = 'mvp' and rarity = 'common';
update badge_requirements set label = 'Become MVP 10 times', threshold = 10, tier = null where type = 'mvp' and rarity = 'rare';
update badge_requirements set label = 'Become MVP 15 times', threshold = 15, tier = null where type = 'mvp' and rarity = 'epic';
update badge_requirements set label = 'Become MVP 30 times', threshold = 30, tier = null where type = 'mvp' and rarity = 'legendary';

update badge_requirements set label = 'Joined Bolahh', threshold = null, tier = null where type = 'ranked' and rarity = 'common';
update badge_requirements set label = 'Reach top 3 of overall Gangsa tier or higher', threshold = null, tier = 'gangsa' where type = 'ranked' and rarity = 'rare';
update badge_requirements set label = 'Reach top 3 of overall Perak tier or higher',  threshold = null, tier = 'perak'  where type = 'ranked' and rarity = 'epic';
update badge_requirements set label = 'Reach top 3 of overall Emas tier',             threshold = null, tier = 'emas'   where type = 'ranked' and rarity = 'legendary';
