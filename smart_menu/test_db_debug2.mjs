import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jlyrcwkwsqircblzkboh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpseXJjd2t3c3FpcmNibHprYm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjcxMzIsImV4cCI6MjA4ODQwMzEzMn0.A1A9NwooUuIlYIkNdcv2-9c0JSP35ASIyPsov06rASw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    console.log("Testing categories...");
    const c = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    console.log("Categories: ", JSON.stringify(c.error || c.data));
}

testFetch();
