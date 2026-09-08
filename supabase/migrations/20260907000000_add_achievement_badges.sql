-- Achievement badges: admin-curated diamond gems shown down the right edge
-- of a player's card (matches/mvp/ranked type, common/rare/epic/legendary
-- rarity — see FifaCard.jsx's BADGE_TYPES/RARITY_COLORS). Stored as an
-- ordered JSON array of {type, rarity} objects; array order is display
-- order, so reordering is just reordering the array. Purely cosmetic and
-- admin-curated only (set from the Player Stats card editor in AdminPage),
-- not earned/granted automatically like card_border_catalog borders are.
alter table profiles add column if not exists achievement_badges jsonb not null default '[]'::jsonb;
