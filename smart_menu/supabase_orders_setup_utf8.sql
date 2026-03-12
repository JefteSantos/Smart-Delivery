-- Script SQL para Criar e Configurar a Tabela de Pedidos (orders) e os Itens do Pedido (order_items)
CREATE TABLE public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  items_count integer NOT NULL,
  delivery_fee numeric(10,2) DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY \
Users
can
insert
their
own
orders\ ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY \
Users
can
view
their
own
orders\ ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY \
Master
can
view
all
orders\ ON public.orders FOR SELECT USING (auth.jwt() ->> 'role' = 'master' OR auth.email() LIKE '%admin%');
CREATE POLICY \
Master
can
update
orders\ ON public.orders FOR UPDATE USING (auth.jwt() ->> 'role' = 'master' OR auth.email() LIKE '%admin%');
CREATE POLICY \
Users
can
insert
order
items\ ON public.order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid()));
CREATE POLICY \
Users
can
view
their
order
items\ ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid()));
CREATE POLICY \
Master
can
view
all
order
items\ ON public.order_items FOR SELECT USING (auth.jwt() ->> 'role' = 'master' OR auth.email() LIKE '%admin%');
