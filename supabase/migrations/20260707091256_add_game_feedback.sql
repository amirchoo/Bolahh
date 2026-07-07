create table if not exists game_feedback (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  venue_rating int not null,
  venue_comment text,
  created_at timestamptz not null default now(),
  unique (game_id, user_id)
);

create table if not exists player_sportsmanship_ratings (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  rater_id uuid not null references profiles(id) on delete cascade,
  rated_id uuid not null references profiles(id) on delete cascade,
  rating int not null,
  created_at timestamptz not null default now(),
  unique (game_id, rater_id, rated_id)
);
