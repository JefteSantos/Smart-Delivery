import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jlyrcwkwsqircblzkboh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpseXJjd2t3c3FpcmNibHprYm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjcxMzIsImV4cCI6MjA4ODQwMzEzMn0.A1A9NwooUuIlYIkNdcv2-9c0JSP35ASIyPsov06rASw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    console.log("Testing products...");
    const p = await supabase.from('products').select('id, name, description, price, image_url, is_offer, category_id, available_days').limit(1);
    console.log("Products: ", JSON.stringify(p.error || p.data));

    console.log("Testing orders...");
    const o = await supabase.from('orders').select('*').limit(1);
    console.log("Orders: ", JSON.stringify(o.error || o.data));

    console.log("Testing messages...");
    const m = await supabase.from('messages').select('order_id').limit(1);
    console.log("Messages: ", JSON.stringify(m.error || m.data));
    
    console.log("Testing order_items...");
    const i = await supabase.from('order_items').select('*').limit(1);
    console.log("Items: ", JSON.stringify(i.error || i.data));
}

testFetch();
