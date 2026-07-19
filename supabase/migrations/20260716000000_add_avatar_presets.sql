create table avatar_presets (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  created_at timestamptz default now()
);
alter table avatar_presets enable row level security;

create policy "Anyone can read avatar presets" on avatar_presets
  for select using (true);

create policy "Admins can add avatar presets" on avatar_presets
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete avatar presets" on avatar_presets
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

insert into storage.buckets (id, name, public)
values ('avatar-presets', 'avatar-presets', true)
on conflict (id) do nothing;

create policy "Public read of avatar presets bucket" on storage.objects
  for select using (bucket_id = 'avatar-presets');

create policy "Admins can upload avatar presets" on storage.objects
  for insert with check (
    bucket_id = 'avatar-presets'
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete avatar presets from storage" on storage.objects
  for delete using (
    bucket_id = 'avatar-presets'
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
