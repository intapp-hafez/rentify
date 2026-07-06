-- Migration to add UI-specific fields to the units table

ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS number text,
ADD COLUMN IF NOT EXISTS floor text,
ADD COLUMN IF NOT EXISTS area numeric,
ADD COLUMN IF NOT EXISTS rooms integer,
ADD COLUMN IF NOT EXISTS baths integer;
