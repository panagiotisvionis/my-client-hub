-- TherapyDesk - Initial Schema

-- =============================================
-- TABLES
-- =============================================

create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  first_name text not null,
  last_name text not null,
  phone text default '',
  email text default '',
  session_fee numeric(10,2) default 50,
  description text default '',
  start_date date,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  date date not null,
  time text default '09:00',
  fee numeric(10,2) not null default 50,
  notes text default '',
  duration integer default 50,
  type text check (type in ('individual', 'couple', 'family', 'online')) default 'individual',
  status text check (status in ('scheduled', 'completed', 'cancelled', 'no_show')) default 'completed',
  paid boolean default false,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  category text check (category in ('rent', 'utilities', 'supplies', 'training', 'insurance', 'marketing', 'supervision', 'other')) not null,
  description text not null,
  amount numeric(10,2) not null,
  created_at timestamptz default now()
);

create table if not exists waiting_list (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  first_name text not null,
  last_name text not null,
  phone text default '',
  email text default '',
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references clients(id) not null,
  invoice_number text not null,
  date date not null,
  session_ids uuid[] default '{}',
  total numeric(10,2) not null,
  paid boolean default false,
  mydata_mark text,
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table clients enable row level security;
alter table sessions enable row level security;
alter table expenses enable row level security;
alter table waiting_list enable row level security;
alter table invoices enable row level security;

-- Clients policies
drop policy if exists "users_select_clients" on clients;
drop policy if exists "users_insert_clients" on clients;
drop policy if exists "users_update_clients" on clients;
drop policy if exists "users_delete_clients" on clients;
create policy "users_select_clients" on clients for select using (auth.uid() = user_id);
create policy "users_insert_clients" on clients for insert with check (auth.uid() = user_id);
create policy "users_update_clients" on clients for update using (auth.uid() = user_id);
create policy "users_delete_clients" on clients for delete using (auth.uid() = user_id);

-- Sessions policies
drop policy if exists "users_select_sessions" on sessions;
drop policy if exists "users_insert_sessions" on sessions;
drop policy if exists "users_update_sessions" on sessions;
drop policy if exists "users_delete_sessions" on sessions;
create policy "users_select_sessions" on sessions for select using (auth.uid() = user_id);
create policy "users_insert_sessions" on sessions for insert with check (auth.uid() = user_id);
create policy "users_update_sessions" on sessions for update using (auth.uid() = user_id);
create policy "users_delete_sessions" on sessions for delete using (auth.uid() = user_id);

-- Expenses policies
drop policy if exists "users_select_expenses" on expenses;
drop policy if exists "users_insert_expenses" on expenses;
drop policy if exists "users_update_expenses" on expenses;
drop policy if exists "users_delete_expenses" on expenses;
create policy "users_select_expenses" on expenses for select using (auth.uid() = user_id);
create policy "users_insert_expenses" on expenses for insert with check (auth.uid() = user_id);
create policy "users_update_expenses" on expenses for update using (auth.uid() = user_id);
create policy "users_delete_expenses" on expenses for delete using (auth.uid() = user_id);

-- Waiting list policies
drop policy if exists "users_select_waiting" on waiting_list;
drop policy if exists "users_insert_waiting" on waiting_list;
drop policy if exists "users_update_waiting" on waiting_list;
drop policy if exists "users_delete_waiting" on waiting_list;
create policy "users_select_waiting" on waiting_list for select using (auth.uid() = user_id);
create policy "users_insert_waiting" on waiting_list for insert with check (auth.uid() = user_id);
create policy "users_update_waiting" on waiting_list for update using (auth.uid() = user_id);
create policy "users_delete_waiting" on waiting_list for delete using (auth.uid() = user_id);

-- Invoices policies
drop policy if exists "users_select_invoices" on invoices;
drop policy if exists "users_insert_invoices" on invoices;
drop policy if exists "users_update_invoices" on invoices;
drop policy if exists "users_delete_invoices" on invoices;
create policy "users_select_invoices" on invoices for select using (auth.uid() = user_id);
create policy "users_insert_invoices" on invoices for insert with check (auth.uid() = user_id);
create policy "users_update_invoices" on invoices for update using (auth.uid() = user_id);
create policy "users_delete_invoices" on invoices for delete using (auth.uid() = user_id);

-- =============================================
-- INDEXES for performance
-- =============================================

create index if not exists idx_clients_user_id on clients(user_id);
create index if not exists idx_sessions_user_id on sessions(user_id);
create index if not exists idx_sessions_client_id on sessions(client_id);
create index if not exists idx_sessions_date on sessions(date);
create index if not exists idx_expenses_user_id on expenses(user_id);
create index if not exists idx_expenses_date on expenses(date);
create index if not exists idx_waiting_list_user_id on waiting_list(user_id);
create index if not exists idx_invoices_user_id on invoices(user_id);
create index if not exists idx_invoices_client_id on invoices(client_id);
