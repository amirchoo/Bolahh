alter table game_players add column amount_paid numeric;

update game_players
set amount_paid = games.price
from games
where games.id = game_players.game_id
  and game_players.amount_paid is null;
