-- Migration to add UI-specific fields to the tenants table

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS job text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'نشط';
