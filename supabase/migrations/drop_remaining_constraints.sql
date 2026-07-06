-- Drop strict English check constraints from all tables to allow dynamic Arabic values from settings
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_payment_frequency_check;
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.maintenance DROP CONSTRAINT IF EXISTS maintenance_status_check;
