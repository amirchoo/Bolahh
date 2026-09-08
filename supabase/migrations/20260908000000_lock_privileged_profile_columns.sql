-- Closes a privilege-escalation hole: the existing "Users can update own profile"
-- RLS policy is `auth.uid() = id` with no column restriction, and every column
-- (including is_admin, is_super_admin, wallet_balance, total_points, card_stats...)
-- is grantable to the authenticated role. That means any logged-in user could
-- currently run, from their own browser session:
--   supabase.from('profiles').update({ is_admin: true, is_super_admin: true }).eq('id', <self>)
-- and it would succeed. RLS can't express per-column rules on its own, so this
-- adds a BEFORE UPDATE trigger that enforces them regardless of which RLS
-- policy let the UPDATE through.
--
-- Scope: this migration locks is_admin / is_super_admin / card-stat columns,
-- which have NO legitimate self-service write path in the app today (only
-- admin-facing flows touch them, always on other players' rows via the
-- "Admins can update player stats" / "Super admins can update any profile"
-- policies). wallet_balance and is_subscribed/subscription_expires_at are
-- deliberately NOT locked down here — GameCheckoutPage (wallet payment),
-- GameCancelPage (self-refund on cancel), SubscriptionPage (self-purchase)
-- and the failed-join rollback in GameCheckoutPage all legitimately move a
-- user's OWN wallet_balance in both directions from the client, and there is
-- no reliable signal in the row itself to tell a real refund from a forged
-- one — closing that properly means moving those flows to validated
-- server-side RPCs, not a trigger. Tracked as separate follow-up work.
create or replace function protect_profile_privileged_columns()
returns trigger as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean := false;
  caller_is_super boolean := false;
begin
  -- Edge functions (service role key) are already fully trusted and bypass RLS;
  -- let them through untouched rather than re-deriving trust for them here.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if caller_id is not null then
    select is_admin, is_super_admin into caller_is_admin, caller_is_super
    from profiles where id = caller_id;
  end if;

  -- Super-admin status has no grant flow in the app at all — DB-console only.
  if new.is_super_admin is distinct from old.is_super_admin then
    raise exception 'is_super_admin cannot be changed through the application';
  end if;

  -- Manager access: only a super admin can grant/revoke it (matches the
  -- existing Admin Panel "Managers" tab, which already runs as super admin).
  if new.is_admin is distinct from old.is_admin and not coalesce(caller_is_super, false) then
    raise exception 'Only a super admin can change manager access';
  end if;

  -- Card stats / OVR / games played: only set by the post-match rating flow
  -- and the admin manual card editor, both of which require is_admin.
  if (new.card_stats is distinct from old.card_stats
      or new.total_points is distinct from old.total_points
      or new.games_played is distinct from old.games_played
      or new.mvp_count is distinct from old.mvp_count
      or new.podium_count is distinct from old.podium_count)
     and not coalesce(caller_is_admin, false) then
    raise exception 'Only a manager can change player stats';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists protect_profile_privileged_columns_trigger on profiles;
create trigger protect_profile_privileged_columns_trigger
  before update on profiles
  for each row execute function protect_profile_privileged_columns();
