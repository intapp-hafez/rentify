-- Create settings table as a key-value store for app configuration
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and write settings
CREATE POLICY "Authenticated users can read settings"
  ON public.settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update settings"
  ON public.settings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert settings"
  ON public.settings FOR INSERT TO authenticated WITH CHECK (true);

-- Seed default data
INSERT INTO public.settings (key, value) VALUES
  ('governorates', '["القاهرة","الجيزة","الإسكندرية","الشرقية","الدقهلية","البحيرة","المنوفية","الغربية","القليوبية","كفر الشيخ","دمياط","بورسعيد","الإسماعيلية","السويس","شمال سيناء","جنوب سيناء","الفيوم","بني سويف","المنيا","أسيوط","سوهاج","قنا","الأقصر","أسوان","البحر الأحمر","الوادي الجديد","مطروح"]')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value) VALUES
  ('property_types', '["شقق سكنية","فيلات","مكاتب","محلات تجارية","مستودعات","أراضي","قصور","استوديوهات"]')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value) VALUES
  ('unit_statuses', '["متاح","مؤجر","محجوز","تحت الصيانة","متأخر بالسداد","عقد منتهي"]')
ON CONFLICT (key) DO NOTHING;
