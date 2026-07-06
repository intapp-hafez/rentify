-- ==========================================
-- RENTIFY DATABASE SCHEMA
-- ==========================================

-- 1. Profiles Table (Extends Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  role text check (role in ('admin', 'manager', 'tenant')) default 'tenant',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Units Table (Properties)
create table if not exists public.units (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  address text,
  type text check (type in ('apartment', 'villa', 'shop', 'office')) not null,
  rent_price numeric not null,
  status text check (status in ('available', 'rented', 'maintenance')) default 'available',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tenants Table
create table if not exists public.tenants (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  civil_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Contracts Table
create table if not exists public.contracts (
  id uuid default gen_random_uuid() primary key,
  unit_id uuid references public.units(id) on delete cascade not null,
  tenant_id uuid references public.tenants(id) on delete restrict not null,
  start_date date not null,
  end_date date not null,
  rent_amount numeric not null,
  payment_frequency text check (payment_frequency in ('monthly', 'quarterly', 'yearly')) not null,
  status text check (status in ('active', 'expired', 'terminated')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Payments Table (Collections)
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  contract_id uuid references public.contracts(id) on delete cascade not null,
  amount numeric not null,
  payment_date date not null,
  status text check (status in ('pending', 'completed', 'late')) default 'completed',
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Maintenance Table
create table if not exists public.maintenance (
  id uuid default gen_random_uuid() primary key,
  unit_id uuid references public.units(id) on delete cascade not null,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  description text not null,
  status text check (status in ('pending', 'in_progress', 'completed')) default 'pending',
  cost numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.units enable row level security;
alter table public.tenants enable row level security;
alter table public.contracts enable row level security;
alter table public.payments enable row level security;
alter table public.maintenance enable row level security;

-- Policy: Allow full access to authenticated users for now
-- (This assumes all users logging in right now are admins/managers.
--  We can restrict this later based on roles).

create policy "Allow full access for authenticated users on profiles"
on public.profiles for all to authenticated using (true);

create policy "Allow full access for authenticated users on units"
on public.units for all to authenticated using (true);

create policy "Allow full access for authenticated users on tenants"
on public.tenants for all to authenticated using (true);

create policy "Allow full access for authenticated users on contracts"
on public.contracts for all to authenticated using (true);

create policy "Allow full access for authenticated users on payments"
on public.payments for all to authenticated using (true);

create policy "Allow full access for authenticated users on maintenance"
on public.maintenance for all to authenticated using (true);

-- Trigger to automatically create a profile for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'admin');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to fire the function when a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
