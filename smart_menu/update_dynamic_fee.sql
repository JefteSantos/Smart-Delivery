ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS delivery_fee_per_km numeric(10,2) DEFAULT 0.00; NOTIFY pgrst, 'reload schema';
