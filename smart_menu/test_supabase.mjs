import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jlyrcwkwsqircblzkboh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpseXJjd2t3c3FpcmNibHprYm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjcxMzIsImV4cCI6MjA4ODQwMzEzMn0.A1A9NwooUuIlYIkNdcv2-9c0JSP35ASIyPsov06rASw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
    const testEmail = `test_${Date.now()}@smart.com`;
    const testPassword = 'password123';

    console.log(`[TEST] Creating user: ${testEmail}`);
    
    // 1. Sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
            data: {
                name: 'Test User',
                role: 'client'
            }
        }
    });

    if (signUpError) {
        console.error('[TEST] ERROR during signUp:', signUpError.message);
        return;
    }
    console.log('[TEST] SignUp SUCCESS!', signUpData.user?.id);

    // 2. Sign in right away
    console.log(`[TEST] Logging in with newly created user...`);
    const { data: logindata, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
    });

    if (loginError) {
        console.error('[TEST] ERROR during signIn:', loginError.message);
    } else {
        console.log('[TEST] SignIn SUCCESS!', logindata.user?.id);
    }
}

testAuth();
