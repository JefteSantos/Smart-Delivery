ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_phone text; NOTIFY pgrst, 'reload schema';
