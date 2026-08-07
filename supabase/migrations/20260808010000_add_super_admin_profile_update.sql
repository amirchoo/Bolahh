-- Lets the Bolahh super-admin grant/revoke manager access (profiles.is_admin)
-- on ANY profile from the new Admin Panel "Managers" tab. The existing
-- profiles UPDATE policy only allows a user to update their own row
-- (auth.uid() = id), which would silently block this — RLS policies for the
-- same command are OR'd together, so this is purely additive and can't loosen
-- access for anyone who isn't already flagged is_super_admin.
create policy "Super admins can update any profile" on profiles
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_super_admin = true)
  );
