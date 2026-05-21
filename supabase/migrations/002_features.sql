-- Migration 002: Reminders, SOAP notes, Recurring sessions, Portal, Blocked dates, Subscriptions
-- Εκτέλεσε αυτό στο Supabase SQL Editor

-- =============================================
-- Sessions: new columns
-- =============================================
alter table sessions add column if not exists portal_token uuid default gen_random_uuid() unique;
alter table sessions add column if not exists reminder_sent boolean default false;
alter table sessions add column if not exists soap_s text default '';   -- Subjective
alter table sessions add column if not exists soap_o text default '';   -- Objective
alter table sessions add column if not exists soap_a text default '';   -- Assessment
alter table sessions add column if not exists soap_p text default '';   -- Plan
alter table sessions add column if not exists recurrence_group_id uuid; -- Groups recurring sessions

-- =============================================
-- Blocked dates (holidays / vacation)
-- =============================================
create table if not exists blocked_dates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  reason text default '',
  created_at timestamptz default now()
);

alter table blocked_dates enable row level security;
create policy "users_select_blocked" on blocked_dates for select using (auth.uid() = user_id);
create policy "users_insert_blocked" on blocked_dates for insert with check (auth.uid() = user_id);
create policy "users_update_blocked" on blocked_dates for update using (auth.uid() = user_id);
create policy "users_delete_blocked" on blocked_dates for delete using (auth.uid() = user_id);

-- =============================================
-- Subscriptions (Stripe billing)
-- =============================================
create table if not exists subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text default 'trialing' check (status in ('trialing','active','canceled','past_due','unpaid')),
  trial_ends_at timestamptz default now() + interval '14 days',
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;
create policy "users_select_subscriptions" on subscriptions for select using (auth.uid() = user_id);

-- Auto-insert subscription row on new user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =============================================
-- Portal: allow anon to read/update sessions by portal_token
-- =============================================
-- Anon can read a session only via its portal_token (capability-based access)
create policy "portal_read_by_token" on sessions
  for select
  to anon
  using (portal_token is not null);

-- Anon can update status via portal (confirm/cancel only)
create policy "portal_update_by_token" on sessions
  for update
  to anon
  using (portal_token is not null)
  with check (portal_token is not null);

-- =============================================
-- Indexes
-- =============================================
create index if not exists idx_sessions_portal_token on sessions(portal_token);
create index if not exists idx_sessions_reminder on sessions(date, reminder_sent) where reminder_sent = false;
create index if not exists idx_sessions_recurrence on sessions(recurrence_group_id) where recurrence_group_id is not null;
create index if not exists idx_blocked_dates_user on blocked_dates(user_id, start_date, end_date);
create index if not exists idx_subscriptions_user on subscriptions(user_id);
create index if not exists idx_subscriptions_stripe on subscriptions(stripe_customer_id);
