create table if not exists public.deposits (
  id uuid default gen_random_uuid() primary key,
  contract_id uuid references public.contracts(id) on delete cascade not null,
  tenant_id uuid references public.tenants(id) on delete restrict not null,
  amount numeric not null,
  status text check (status in ('held', 'returned', 'deducted', 'transferred')) default 'held',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.deposits enable row level security;

-- Policy: Allow full access for authenticated users
create policy "Allow full access for authenticated users on deposits"
on public.deposits for all to authenticated using (true);
