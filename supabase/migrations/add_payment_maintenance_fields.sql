-- Migration to add UI-specific fields to payments and maintenance

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_number text,
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'تحويل بنكي';

ALTER TABLE public.maintenance
ADD COLUMN IF NOT EXISTS number text,
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'عادي',
ADD COLUMN IF NOT EXISTS maintenance_date date;
