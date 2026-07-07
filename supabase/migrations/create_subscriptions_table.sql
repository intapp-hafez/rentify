-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read subscriptions
CREATE POLICY "Authenticated users can read subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to update subscriptions
CREATE POLICY "Authenticated users can update subscriptions"
  ON public.subscriptions FOR UPDATE TO authenticated USING (true);

-- Allow authenticated users to insert subscriptions
CREATE POLICY "Authenticated users can insert subscriptions"
  ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (true);
