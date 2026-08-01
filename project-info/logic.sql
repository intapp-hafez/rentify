-- ==========================================
-- RENTIFY — BUSINESS LOGIC (SQL implementation of logic.md)
-- Run AFTER project-info/schema.sql and project-info/policies.sql
-- Idempotent: safe to re-run.
-- ==========================================

-- 1) Months per payment frequency  (logic.md §1)
create or replace function public.frequency_months(_freq text)
returns int
language sql
immutable
set search_path = public
as $$
  select case coalesce(_freq, 'monthly')
    when 'monthly' then 1
    when 'quarterly' then 3
    when 'semiannual' then 6
    when 'yearly' then 12
    else 1
  end
$$;

-- 2) Installment schedule generator  (logic.md §1 + §2)
--    amount = rent_amount x months, periods derived from start_date
create or replace function public.contract_schedule(_contract_id uuid)
returns table (
  installment_no int,
  period_start date,
  period_end date,
  months int,
  amount numeric,
  is_paid boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with c as (
    select id, start_date, end_date, rent_amount,
           public.frequency_months(payment_frequency) as m
    from public.contracts where id = _contract_id
  ),
  periods as (
    select
      row_number() over (order by g.n)::int as installment_no,
      (c.start_date + (g.n * c.m || ' months')::interval)::date as period_start,
      ((c.start_date + ((g.n + 1) * c.m || ' months')::interval)::date - 1) as period_end,
      c.m as months,
      (c.rent_amount * c.m) as amount,
      c.id as contract_id
    from c
    cross join generate_series(
      0,
      greatest(
        ceil(
          (extract(year from c.end_date) * 12 + extract(month from c.end_date)
           - (extract(year from c.start_date) * 12 + extract(month from c.start_date)))::numeric / c.m
        )::int - 1,
        0
      )
    ) as g(n)
  )
  select p.installment_no, p.period_start, p.period_end, p.months, p.amount,
         exists (
           select 1 from public.payments pay
           where pay.contract_id = p.contract_id
             and pay.status = 'completed'
             and pay.payment_date between p.period_start and p.period_end
         ) as is_paid
  from periods p
  where p.period_start < (select end_date from c)
  order by p.installment_no
$$;

-- 3) Unpaid dues only  (logic.md §2)
create or replace function public.contract_unpaid_dues(_contract_id uuid)
returns table (
  installment_no int,
  period_start date,
  period_end date,
  months int,
  amount numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select installment_no, period_start, period_end, months, amount
  from public.contract_schedule(_contract_id)
  where is_paid = false
$$;

-- 4) Contract status refresh  (logic.md §6) — terminated is manual, never overridden
create or replace function public.refresh_contract_statuses()
returns void
language sql
security definer
set search_path = public
as $$
  update public.contracts
     set status = 'expired'
   where status = 'active' and end_date < current_date
$$;

-- 5) Auto-create deposit record when a contract has deposit > 0  (logic.md §4)
create or replace function public.handle_contract_deposit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deposit is not null and new.deposit > 0 then
    insert into public.deposits (contract_id, tenant_id, unit_id, amount, status)
    select new.id, new.tenant_id, new.unit_id, new.deposit, 'held'
    where not exists (
      select 1 from public.deposits d where d.contract_id = new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists contracts_deposit_sync on public.contracts;
create trigger contracts_deposit_sync
after insert on public.contracts
for each row execute function public.handle_contract_deposit();

-- 6) Unique receipt numbers  (logic.md §3)
create unique index if not exists payments_receipt_number_key
  on public.payments (receipt_number)
  where receipt_number is not null;

-- 7) KPIs  (logic.md §8)
create or replace view public.kpi_overview
with (security_invoker = true) as
select
  (select count(*) from public.units) as total_units,
  (select count(*) from public.units where status = 'rented') as rented_units,
  case when (select count(*) from public.units) = 0 then 0
       else round(
         (select count(*) from public.units where status = 'rented')::numeric
         / (select count(*) from public.units)::numeric * 100, 2)
  end as occupancy_rate,
  coalesce((
    select sum(amount) from public.payments
    where status = 'completed'
      and date_trunc('month', payment_date) = date_trunc('month', current_date)
  ), 0) as monthly_collection,
  coalesce((select sum(cost) from public.maintenance), 0) as maintenance_cost,
  coalesce((
    select sum(amount) from public.payments where status = 'completed'
  ), 0) - coalesce((select sum(cost) from public.maintenance), 0) as net_revenue;

grant select on public.kpi_overview to authenticated;
grant all on public.kpi_overview to service_role;
