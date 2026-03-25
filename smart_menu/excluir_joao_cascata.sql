-- 1. Primeiro atualizamos a tabela de PEDIDOS para permitir deleção em cascata (Cascading)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 2. Agora deletamos brutalmente o usuário direto da tabela raiz do sistema.
-- Isso vai automaticamente varrer e apagar os pedidos dele graças ao CASCADE acima.
DELETE FROM auth.users WHERE email = 'joao.santos@smart';
