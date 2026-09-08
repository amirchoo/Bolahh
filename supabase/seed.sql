-- Reference data applied after migrations on `supabase db reset` / a fresh
-- `supabase start` (see [db.seed] in config.toml). This is the same
-- non-personal reference data production uses — avatar presets, banners,
-- fields — copied from production on 2026-09-01 so a fresh local (or a
-- freshly linked, freshly pushed) database isn't completely empty: avatar
-- pickers have presets to show, the home page has fields/banners to render,
-- and there's something to create a test game against.
--
-- Image URLs point at production's public storage (these buckets are
-- public-read), so they load correctly from a local dev server too without
-- needing to copy any binary files. No user accounts, games, or wallet data
-- are seeded here — those are per-person and created by signing up through
-- the app (see SUPABASE_LOCAL_SETUP.md step 7 for making yourself an admin).

insert into public.avatar_presets (image_url) values
  ('https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/avatar-presets/1784545382153.png'),
  ('https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/avatar-presets/1784545385790.png'),
  ('https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/avatar-presets/1784545388570.png'),
  ('https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/avatar-presets/1784545392035.png'),
  ('https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/avatar-presets/1784545395016.png')
on conflict do nothing;

insert into public.banners (image_url, title, subtitle, link_url, active, sort_order) values
  ('https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/field-images/banner-1783319066360.png',
   'Be our Manager!', 'Click now to apply!', 'https://forms.gle/dn2e9ZERRHkpv9Wp6', true, 0),
  ('https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/field-images/banner-1786636986588.png',
   'Football For Everyone with Bolahh!', null, null, true, 0)
on conflict do nothing;

insert into public.fields (id, name, area, address, field_rules, has_toilet, has_parking, has_shop, has_shoe_rent, images, default_slots, default_price, maps_url) values
  ('44869ec9-2c30-4c06-9852-3433040b4943', 'Dwi Emas International School (Interlocking)', 'Shah Alam',
   'Dwi Emas International School, No. 5 Jalan Ikhtisas, Jalan 14/1, Seksyen 14, 40000 Shah Alam Selangor ( Ask Security for parking and Futsal court (Level5) )',
   '1. Smoking is STRICTLY PROHIBITED within the premises of the centre
2. All customers are required to register at the security guard house before entering the centre.
3. Please do not leave your valuables unattended. We will not be responsible for any theft.
4. There are no elevators available. All access to different levels is via staircases only.
5. Badminton and Table Tennis are located on Level 3.
6.Futsal is on the Rooftop (Level 5).',
   true, true, true, false,
   array[
     'https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/field-images/1779806255245-z2xz9x7hqx.webp',
     'https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/field-images/1779806255572-8wj79iga6o.webp'
   ], 15, 15, 'https://maps.app.goo.gl/LWTvsoC96vJii7T77'),

  ('a85db64d-2f51-489f-9672-ac87b6fb26e3', 'Dwi Emas International School (Turf)', 'Shah Alam',
   'Shah Alam · Dwi Emas International School, No. 5 Jalan Ikhtisas, Jalan 14/1, Seksyen 14, 40000 Shah Alam Selangor (Ask Security for parking and Futsal court (Level5) )',
   '1. Smoking is STRICTLY PROHIBITED within the premises of the centre
2. All customers are required to register at the security guard house before entering the centre.
3. Please do not leave your valuables unattended. We will not be responsible for any theft.
4. There are no elevators available. All access to different levels is via staircases only.
5. Badminton and Table Tennis are located on Level 3.
6.Futsal is on the Rooftop (Level 5).',
   true, true, true, false,
   array[
     'https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/field-images/1784092697857-xwhw8lfiybh.jpeg',
     'https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/field-images/1784092698353-w8ethd41nkb.jpeg',
     'https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/field-images/1784092699222-nhlbof3xl1r.jpeg',
     'https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/field-images/1787222155007-6ztycn44upt.jpeg'
   ], 15, 15, 'https://maps.app.goo.gl/LWTvsoC96vJii7T77'),

  ('78185e8d-59b1-45dd-a413-13e6406ef63a', 'Hanyang ERICA Futsal Field A', 'Ansan',
   '한양대학요 ERICA캠퍼스 풋살장, 경기 안산시 상록구 한양대학로 55',
   '1. 다음 이용자를 위해 퇴실시간을 엄수해 주세요. 최소한 10분 전 퇴실 준비를 시작해 주시기 바랍니다.
2. 공간에 남아 있는 쓰레기를 모두 치우시고 의자를 바르게 정돈해 주시기 바랍니다.
3. 공간 예약 후 별다른 연락 없이 사용하지 않는 경우 모든 공간 이용자격이 박탈 되는 등 불이익이 있을 수 있습니다.
4. 공지사항 메뉴에서 [한양대학교 ERICA 대관 공지사항] 반드시 확인해주세요.
5. 공간별 유의사항을 반드시 확인해주세요. 공지 미숙지로 인한 책임은 본인에게 있습니다.
6. 단과대 단위의 행사인 경우 행정팀 공문이 필요하므로 사이트를 통해서는 접수되지 않습니다.
7. 공간별 기자재 담당부서가 다르므로 필요한 경우 미리 협의하여주시기 바랍니다.',
   true, false, false, false,
   array[
     'https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/field-images/1780225615156-3u5sqxjajnb.jpeg',
     'https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/field-images/1780225615542-qsxq3hzhh5j.jpeg',
     'https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/field-images/1780225619098-19v8nz4cz1q.jpeg'
   ], 15, 15, null),

  ('74f4f7a1-319b-4724-a0f3-505ed6c82113', 'Hanyang Erica Futsal Field B', 'Ansan',
   '경기 안산시 상록구 한양대학로 55',
   'Please leave the field like you enter it',
   false, false, false, false,
   array[
     'https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/field-images/1774925455286-r5offokeouc.jpeg',
     'https://tzzqhkzxzmmnqljnosyu.supabase.co/storage/v1/object/public/field-images/1774925455793-n8p1xm9o42s.jpeg'
   ], 15, 15, null)
on conflict (id) do nothing;
