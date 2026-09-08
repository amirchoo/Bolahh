-- Lets an admin pick any card design (Novis, or any Gangsa/Perak/Emas tier)
-- for their own profile card, overriding the design that would normally be
-- computed from their real stats. Purely cosmetic and self-service — the
-- client only exposes the picker when the signed-in user is an admin, and
-- it only ever writes to their own row (covered by the existing "Users can
-- update own profile" RLS policy, no new policy needed). Null means "use my
-- real computed rank", same as everyone else.
alter table profiles add column if not exists card_design_override text;
