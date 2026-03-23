require('dotenv').config();
const fs = require('fs');

async function testInvalidJWT() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL + '/rest/v1/categories?select=*';
  try {
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.jwt',
            'Origin': 'http://localhost:8081'
        }
    });

    const lines = [];
    lines.push('Status: ' + res.status);
    lines.push('Allow-Origin: ' + res.headers.get('access-control-allow-origin'));
    const body = await res.text();
    lines.push('Body: ' + body);
    
    fs.writeFileSync('jwt_test.txt', lines.join('\n'), 'utf8');
  } catch (error) {
    fs.writeFileSync('jwt_test.txt', 'Error: ' + error.message, 'utf8');
  }
}

testInvalidJWT();
