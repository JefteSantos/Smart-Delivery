require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function formatUser() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'joao.silva@smart.com',
    password: 'senha' // Ou uma que vc conheça
  });
  
  if (data.session) {
    const { error: updErr } = await supabase.auth.updateUser({
      data: { role: 'master' }
    });
    console.log('Update Result:', updErr ? updErr : 'SUCCESS');
    
    // Testa produtos do master (deve trazer TUDO independente de available_days no BD)
    const { data: prods } = await supabase.from('products').select('*');
    console.log(`Master ve ${prods.length} produtos`);
  } else {
    console.log('Login failed:', error.message);
  }
}

formatUser();
