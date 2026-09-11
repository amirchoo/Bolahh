-- Contact number shown on a manager's business card so players can reach
-- them directly. Same access pattern as manager_card_avatar_url: no RLS/
-- trigger changes needed, since it's editable both by the manager
-- themselves ("Users can update own profile") and by an admin on any
-- manager's row ("Admins can update player stats").
alter table profiles
  add column if not exists manager_contact_number text;
