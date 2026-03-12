CREATE TABLE IF NOT EXISTS public.settings (
    id int PRIMARY KEY DEFAULT 1,
    is_open boolean DEFAULT true,
    auto_acceptance boolean DEFAULT false,
    store_name text DEFAULT 'Smart Delivery',
    delivery_fee numeric(10,2) DEFAULT 5.00,
    store_cep text,
    max_delivery_distance integer DEFAULT 10
);

INSERT INTO public.settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Master can manage settings" ON public.settings FOR ALL USING (auth.jwt() ->> 'role' = 'master' OR auth.email() LIKE '%admin%');
