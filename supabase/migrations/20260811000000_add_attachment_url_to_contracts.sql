-- Add attachment_url to contracts table
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS attachment_url text;
