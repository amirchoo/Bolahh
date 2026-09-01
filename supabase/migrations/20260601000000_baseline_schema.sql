-- Baseline schema snapshot, reconstructed from production (project tzzqhkzxzmmnqljnosyu)
-- via information_schema / pg_catalog introspection on 2026-09-01.
--
-- Every migration in this folder before today only ALTERs or extends tables
-- that were originally created by hand in the Supabase dashboard SQL editor,
-- long before this project adopted the CLI migration workflow (the earliest
-- tracked migration, 20260626210533, already assumes `games` exists). That
-- means a fresh `supabase start` / `supabase db reset`, or linking a brand
-- new project and running `supabase db push`, produced an empty database —
-- "relation \"games\" does not exist" on first read, and signup silently
-- failing because `public.profiles` (and the trigger that populates it on
-- signup) never existed either.
--
-- This migration recreates that pre-CLI baseline: the 11 tables, the 6
-- helper functions, and the 7 triggers (including the auth.users signup
-- trigger) that no later migration ever creates from scratch. Everything
-- here is dated before 20260626210533 so it applies first, and every
-- statement is idempotent (`if not exists` / `drop ... if exists` first) so
-- it's safe to run against a database that already has some of this.
--
-- Columns/constraints/policies that a later migration DOES create are
-- deliberately left out of this file — they're added on top by that
-- migration when it runs next, exactly as it did in production.

-- ============================================================================
-- TABLES
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "position" text,
  avatar_url text,
  created_at timestamp,
  is_admin boolean default false,
  email text,
  total_points integer default 0,
  games_played integer default 0,
  wallet_balance numeric(10,2) default 0,
  is_subscribed boolean default false,
  subscription_expires_at timestamptz,
  gender text,
  age integer,
  area text,
  card_stats jsonb,
  constraint profiles_name_unique unique (name)
);
alter table public.profiles enable row level security;

create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text,
  address text,
  created_at timestamp,
  field_rules text,
  has_toilet boolean default false,
  has_parking boolean default false,
  has_shop boolean default false,
  has_shoe_rent boolean default false,
  images text[] default '{}'::text[]
);
alter table public.fields enable row level security;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text,
  field_id uuid references public.fields(id) on delete cascade,
  area text,
  format text,
  date date,
  time text,
  slots integer,
  price integer,
  description text,
  game_rules text,
  shoes_type text,
  created_by uuid references auth.users(id)
);
alter table public.games enable row level security;

create table if not exists public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id),
  user_id uuid not null references auth.users(id),
  joined_at timestamp,
  player_name text
);
alter table public.game_players enable row level security;

create table if not exists public.game_ratings (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade,
  user_id uuid references auth.users(id),
  rated_by uuid references auth.users(id),
  goals integer default 0,
  assists integer default 0,
  good_defending integer default 0,
  good_keeping integer default 0,
  successful_dribble integer default 0,
  good_chance integer default 0,
  good_manner integer default 0,
  admin_bonus integer default 0,
  total_points integer default 0,
  created_at timestamp default now(),
  constraint game_ratings_game_id_user_id_key unique (game_id, user_id)
);
alter table public.game_ratings enable row level security;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade,
  receiver_id uuid references auth.users(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamp default now(),
  sender_name text,
  receiver_name text,
  constraint friendships_sender_id_receiver_id_key unique (sender_id, receiver_id)
);
alter table public.friendships enable row level security;

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text check (type in ('topup', 'payment', 'refund')),
  amount numeric(10,2),
  description text,
  balance_after numeric(10,2),
  created_at timestamptz default now(),
  reference_no text,
  bill_code text
);
alter table public.wallet_transactions enable row level security;

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percentage integer not null check (discount_percentage between 1 and 100),
  max_uses integer,
  uses_count integer not null default 0,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  subtitle text,
  link_url text,
  active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);
alter table public.banners enable row level security;

create table if not exists public.card_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grad_from text,
  grad_mid text,
  grad_to text,
  border_color text,
  text_dark boolean default true,
  badge_label text,
  badge_color text,
  glow_enabled boolean default false,
  glow_color text,
  foil_enabled boolean default false,
  created_at timestamptz default now()
);
alter table public.card_templates enable row level security;

create table if not exists public.player_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  pac integer default 0,
  sho integer default 0,
  pas integer default 0,
  dri integer default 0,
  def integer default 0,
  phy integer default 0,
  overall integer default 0,
  updated_at timestamp default now(),
  username text
);
alter table public.player_cards enable row level security;

-- ============================================================================
-- POLICIES (only ones no later migration ever creates/replaces)
-- ============================================================================

drop policy if exists "Public profiles are viewable" on public.profiles;
create policy "Public profiles are viewable" on public.profiles
  for select using (true);

drop policy if exists "Public profiles readable by anyone" on public.profiles;
create policy "Public profiles readable by anyone" on public.profiles
  for select using (true);

drop policy if exists "User can insert profile" on public.profiles;
create policy "User can insert profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "User can update own profile" on public.profiles;
create policy "User can update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Admins can update player stats" on public.profiles;
create policy "Admins can update player stats" on public.profiles
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Field are viewable by everyone" on public.fields;
create policy "Field are viewable by everyone" on public.fields
  for select using (true);

drop policy if exists "Admin can insert fields" on public.fields;
create policy "Admin can insert fields" on public.fields
  for insert with check (
    (select is_admin from public.profiles where id = auth.uid()) = true
  );

drop policy if exists "Admins can update any field" on public.fields;
create policy "Admins can update any field" on public.fields
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admin can delete fields" on public.fields;
create policy "Admin can delete fields" on public.fields
  for delete using (
    (select is_admin from public.profiles where id = auth.uid()) = true
  );

drop policy if exists "Admin can delete games" on public.fields;
create policy "Admin can delete games" on public.fields
  for delete using (
    (select is_admin from public.profiles where id = auth.uid()) = true
  );

drop policy if exists "Anyone can read games" on public.games;
create policy "Anyone can read games" on public.games
  for select using (true);

drop policy if exists "Managers can update their own games" on public.games;
create policy "Managers can update their own games" on public.games
  for update using (auth.uid() = created_by) with check (auth.uid() = created_by);

drop policy if exists "Game players are viewable" on public.game_players;
create policy "Game players are viewable" on public.game_players
  for select using (true);

drop policy if exists "Admin insert" on public.game_ratings;
create policy "Admin insert" on public.game_ratings
  for insert with check (
    (select is_admin from public.profiles where id = auth.uid()) = true
  );

drop policy if exists "Admin update" on public.game_ratings;
create policy "Admin update" on public.game_ratings
  for update using (
    (select is_admin from public.profiles where id = auth.uid()) = true
  );

drop policy if exists "Public read" on public.game_ratings;
create policy "Public read" on public.game_ratings
  for select using (true);

drop policy if exists "Users can view their own friendships" on public.friendships;
create policy "Users can view their own friendships" on public.friendships
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can send requests" on public.friendships;
create policy "Users can send requests" on public.friendships
  for insert with check (auth.uid() = sender_id);

drop policy if exists "Users can update received requests" on public.friendships;
create policy "Users can update received requests" on public.friendships
  for update using (auth.uid() = receiver_id);

drop policy if exists "Users can delete their own friendships" on public.friendships;
create policy "Users can delete their own friendships" on public.friendships
  for delete using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can view own transactions" on public.wallet_transactions;
create policy "Users can view own transactions" on public.wallet_transactions
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own transactions" on public.wallet_transactions;
create policy "Users can insert own transactions" on public.wallet_transactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "Admins can manage coupons" on public.coupons;
create policy "Admins can manage coupons" on public.coupons
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Authenticated users can read active coupons" on public.coupons;
create policy "Authenticated users can read active coupons" on public.coupons
  for select using (auth.role() = 'authenticated');

drop policy if exists "Manage banners" on public.banners;
create policy "Manage banners" on public.banners
  for all using (true);

drop policy if exists "Read banners" on public.banners;
create policy "Read banners" on public.banners
  for select using (true);

drop policy if exists "Admins can manage templates" on public.card_templates;
create policy "Admins can manage templates" on public.card_templates
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Everyone can read templates" on public.card_templates;
create policy "Everyone can read templates" on public.card_templates
  for select using (true);

drop policy if exists "Public read" on public.player_cards;
create policy "Public read" on public.player_cards
  for select using (true);

drop policy if exists "Own insert" on public.player_cards;
create policy "Own insert" on public.player_cards
  for insert with check (auth.uid() = user_id);

drop policy if exists "Own update" on public.player_cards;
create policy "Own update" on public.player_cards
  for update using (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, name, position, email, is_admin, total_points, games_played)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', ''),
    coalesce(new.raw_user_meta_data->>'position', ''),
    new.email,
    false,
    30,
    0
  )
  on conflict (id) do update
    set email = new.email,
        name = case when profiles.name = '' then excluded.name else profiles.name end,
        position = case when profiles.position = '' then excluded.position else profiles.position end,
        total_points = case when profiles.total_points = 0 then 30 else profiles.total_points end;

  return new;
end;
$$;

create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

create or replace function public.sync_friendship_names()
returns trigger
language plpgsql
as $$
begin
  select name into new.sender_name
  from public.profiles where id = new.sender_id;

  select name into new.receiver_name
  from public.profiles where id = new.receiver_id;

  return new;
end;
$$;

create or replace function public.sync_player_name()
returns trigger
language plpgsql
as $$
begin
  select name into new.player_name
  from public.profiles
  where id = new.user_id;
  return new;
end;
$$;

create or replace function public.sync_player_card_username()
returns trigger
language plpgsql
security definer
as $$
begin
  select name into new.username from public.profiles where id = new.user_id;
  return new;
end;
$$;

create or replace function public.sync_card_username_on_profile_update()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.name <> old.name then
    update public.player_cards set username = new.name where user_id = new.id;
  end if;
  return new;
end;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_updated();

drop trigger if exists set_friendship_names on public.friendships;
create trigger set_friendship_names
  before insert on public.friendships
  for each row execute function public.sync_friendship_names();

drop trigger if exists set_player_name on public.game_players;
create trigger set_player_name
  before insert on public.game_players
  for each row execute function public.sync_player_name();

drop trigger if exists set_player_card_username on public.player_cards;
create trigger set_player_card_username
  before insert or update on public.player_cards
  for each row execute function public.sync_player_card_username();

drop trigger if exists update_card_username_on_rename on public.profiles;
create trigger update_card_username_on_rename
  after update on public.profiles
  for each row execute function public.sync_card_username_on_profile_update();

-- ============================================================================
-- STORAGE BUCKETS (avatar-presets and card-borders are created by later
-- migrations already; these three were the ones made by hand in the
-- dashboard, per SUPABASE_LOCAL_SETUP.md)
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('card-backgrounds', 'card-backgrounds', true),
  ('field-images', 'field-images', true)
on conflict (id) do nothing;

drop policy if exists "Avatars are publicly viewable 1oj01fe_0" on storage.objects;
create policy "Avatars are publicly viewable 1oj01fe_0" on storage.objects
  for select using (true);

drop policy if exists "Users can upload own avatar 1oj01fe_0" on storage.objects;
create policy "Users can upload own avatar 1oj01fe_0" on storage.objects
  for insert with check (auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "User can update own avatar 1oj01fe_0" on storage.objects;
create policy "User can update own avatar 1oj01fe_0" on storage.objects
  for update using (auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "User can update own avatar 1oj01fe_1" on storage.objects;
create policy "User can update own avatar 1oj01fe_1" on storage.objects
  for select using (auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Images are publicly viewable 1b86zsb_0" on storage.objects;
create policy "Images are publicly viewable 1b86zsb_0" on storage.objects
  for select using (bucket_id = 'field-images');

drop policy if exists "Admins can upload images 1b86zsb_0" on storage.objects;
create policy "Admins can upload images 1b86zsb_0" on storage.objects
  for insert with check (
    (select is_admin from public.profiles where id = auth.uid()) = true
  );
