import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jlyrcwkwsqircblzkboh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpseXJjd2t3c3FpcmNibHprYm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjcxMzIsImV4cCI6MjA4ODQwMzEzMn0.A1A9NwooUuIlYIkNdcv2-9c0JSP35ASIyPsov06rASw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    const c = await supabase.from('categories').select('*').limit(1);
    console.log("Categories columns:", c.data ? Object.keys(c.data[0]) : "error", c.error);
    
    const p = await supabase.from('products').select('*').limit(1);
    console.log("Products columns:", p.data ? Object.keys(p.data[0]) : "error", p.error);

    const o = await supabase.from('orders').select('*').limit(1);
    console.log("Orders columns:", o.data ? Object.keys(o.data[0]) : "error", o.error);
}

testFetch();
