-- Drop strict English check constraints from units table to allow dynamic Arabic types and statuses from settings
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_type_check;
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_status_check;
