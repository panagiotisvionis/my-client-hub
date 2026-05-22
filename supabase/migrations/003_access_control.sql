-- Migration 003: Access control — invite codes, user profiles, admin role

-- =============================================
-- User profiles (role + status)
-- =============================================
create table if not exists user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  role text default 'user' check (role in ('admin', 'user')),
  status text default 'trial' check (status in ('trial', 'active', 'suspended')),
  trial_ends_at timestamptz default now() + interval '14 days',
  invited_by text,
  created_at timestamptz default now()
);

alter table user_profiles enable row level security;
drop policy if exists "users_select_own_profile" on user_profiles;
drop policy if exists "admin_select_all_profiles" on user_profiles;
drop policy if exists "admin_update_all_profiles" on user_profiles;

-- Users can read their own profile
create policy "users_select_own_profile" on user_profiles
  for select using (auth.uid() = id);

-- Admins can read all profiles
create policy "admin_select_all_profiles" on user_profiles
  for select using (
    exists (select 1 from user_profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Admins can update all profiles
create policy "admin_update_all_profiles" on user_profiles
  for update using (
    exists (select 1 from user_profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================
-- Invite codes
-- =============================================
create table if not exists invite_codes (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  label text default '',           -- e.g. "Για Δρ. Παπαδόπουλο"
  used_by uuid references auth.users(id),
  used_at timestamptz,
  expires_at timestamptz default now() + interval '60 days',
  created_at timestamptz default now()
);

alter table invite_codes enable row level security;
drop policy if exists "admin_all_invite_codes" on invite_codes;
drop policy if exists "anon_read_invite_codes" on invite_codes;

-- Admins manage all codes
create policy "admin_all_invite_codes" on invite_codes
  for all using (
    exists (select 1 from user_profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Anyone can check if a code is valid (needed during registration)
create policy "anon_read_invite_codes" on invite_codes
  for select to anon, authenticated
  using (used_by is null and expires_at > now());

-- =============================================
-- Auto-create profile on signup
-- =============================================
create or replace function handle_new_user_profile()
returns trigger as $$
declare
  is_admin boolean;
begin
  -- Check if this is the admin email
  is_admin := new.email = 'panagiotisvionis@gmail.com';

  insert into public.user_profiles (id, email, role, status, trial_ends_at)
  values (
    new.id,
    new.email,
    case when is_admin then 'admin' else 'user' end,
    case when is_admin then 'active' else 'trial' end,
    case when is_admin then null else now() + interval '14 days' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure handle_new_user_profile();

-- =============================================
-- Insert admin profile if user already exists
-- =============================================
insert into public.user_profiles (id, email, role, status, trial_ends_at)
select id, email, 'admin', 'active', null
from auth.users
where email = 'panagiotisvionis@gmail.com'
on conflict (id) do update set role = 'admin', status = 'active', trial_ends_at = null;

-- =============================================
-- Indexes
-- =============================================
create index if not exists idx_user_profiles_role on user_profiles(role);
create index if not exists idx_user_profiles_status on user_profiles(status);
create index if not exists idx_invite_codes_code on invite_codes(code);
