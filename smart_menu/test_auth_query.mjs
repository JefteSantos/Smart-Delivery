import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jlyrcwkwsqircblzkboh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpseXJjd2t3c3FpcmNibHprYm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjcxMzIsImV4cCI6MjA4ODQwMzEzMn0.A1A9NwooUuIlYIkNdcv2-9c0JSP35ASIyPsov06rASw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    // Tenta fazer o login com a conta que criamos
    const email = 'maria@smart.com';
    const password = 'password123'; // assumindo um padrão, mas nós registramos test_@smart.com antes!
    
    // Vou usar a conta de cliente testada
    // Se falhar o login eu testo o signup
    let token = null;
    let uid = null;
    
    const { data: logindata, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'maria@smart.com',
        password: '123456',
    });

    if (loginError) {
        console.log("Login maria@smart.com failed, trying to sign up...");
        const { data: signup, error: signError } = await supabase.auth.signUp({
            email: 'maria@smart.com',
            password: '123456',
            options: { data: { role: 'client'} }
        });
        if (signError) {
            console.error("SignUp error:", signError.message);
            return;
        }
        token = signup.session?.access_token;
        uid = signup.user?.id;
    } else {
        token = logindata.session?.access_token;
        uid = logindata.user?.id;
    }
    
    console.log("Logged in with user inside Node! UID:", uid);

    // Agora vamos testar as tabelas
    console.log("\n--- Testing categories ---");
    const c = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    console.log(JSON.stringify(c.error || { success: true }));

    console.log("\n--- Testing products ---");
    const p = await supabase.from('products').select('id, name, description, price, image_url, is_offer, category_id, available_days');
    console.log(JSON.stringify(p.error || { success: true }));

    console.log("\n--- Testing orders ---");
    const o = await supabase.from('orders').select('*').eq('user_id', uid || '');
    console.log(JSON.stringify(o.error || { success: true }));
}

testFetch();
