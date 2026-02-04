const http = require('http');

const data = JSON.stringify({
  email: 'felipe.sotelo@live.com',
  password: 'Ingphillip!8512'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🔐 Probando login...');
console.log('📧 Email:', 'felipe.sotelo@live.com');

const req = http.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('\n📊 Status Code:', res.statusCode);
    console.log('📄 Response:');
    try {
      const parsed = JSON.parse(responseData);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.success) {
        console.log('\n✅ LOGIN EXITOSO!');
        console.log('🎫 Token generado:', parsed.data.token ? 'Sí' : 'No');
        console.log('👤 Usuario:', parsed.data.user.email);
      } else {
        console.log('\n❌ LOGIN FALLIDO');
      }
    } catch (e) {
      console.log(responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(data);
req.end();
