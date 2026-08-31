-- Border catalog copy for these three cosmetics still referenced the retired
-- ranked "MVP"/"top 3" language — rename to match the new flat Bolahh Awards
-- system. keys/unlock_type/unlock_value are untouched, so nobody's existing
-- unlock progress or equipped border is affected, only the display text.
update card_border_catalog set label = 'Award Trim',   unlock_label = 'Win 5 Bolahh Awards'  where key = 'podium-trim';
update card_border_catalog set label = 'Bolahh Crown', unlock_label = 'Win 3 Bolahh Awards'  where key = 'mvp-crown';
update card_border_catalog set label = 'Royal Baller', unlock_label = 'Win 10 Bolahh Awards' where key = 'mvp-royal';
