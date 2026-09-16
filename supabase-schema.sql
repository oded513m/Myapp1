create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  description text not null,
  amount numeric not null,
  date date not null,
  category text not null
);

create table if not exists public.routine_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tasks jsonb not null default '[]'::jsonb,
  later_activities jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.transactions enable row level security;
alter table public.routine_data enable row level security;

drop policy if exists "Users manage own transactions" on public.transactions;
create policy "Users manage own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own routine" on public.routine_data;
create policy "Users manage own routine" on public.routine_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
