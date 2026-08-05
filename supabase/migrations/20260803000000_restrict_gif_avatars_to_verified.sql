-- The client-side check in ProfilePage.jsx only hides the option in the UI;
-- it does not stop a user from calling supabase.storage.upload() directly.
-- This restrictive policy is AND-ed with the existing permissive avatar
-- upload policies, so it closes that gap at the database level.
create policy "Only verified users can upload gif avatars"
on storage.objects
as restrictive
for insert
with check (
  bucket_id != 'avatars'
  or metadata->>'mimetype' != 'image/gif'
  or exists (
    select 1 from profiles
    where id = auth.uid()
      and is_subscribed = true
      and subscription_expires_at > now()
  )
);

create policy "Only verified users can update to gif avatars"
on storage.objects
as restrictive
for update
with check (
  bucket_id != 'avatars'
  or metadata->>'mimetype' != 'image/gif'
  or exists (
    select 1 from profiles
    where id = auth.uid()
      and is_subscribed = true
      and subscription_expires_at > now()
  )
);
