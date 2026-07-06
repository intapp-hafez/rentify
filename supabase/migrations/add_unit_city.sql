-- Add city column to units for governorate-based filtering
ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS city text;
