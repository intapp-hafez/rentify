-- Migration to add UI-specific fields to the contracts table

ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS number text,
ADD COLUMN IF NOT EXISTS deposit numeric;
