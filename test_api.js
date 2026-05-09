const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/customers/7',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    try {
      const json = JSON.parse(data);
      console.log('Error Message:');
      console.log(json.error);
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
});

const payload = {
  name: "AKRAM FOLI",
  activity: "REGISTRE DE COMMERCE",
  type: "REGULAR",
  phone: "0770226864",
  email: null,
  rc: null,
  nif: null,
  ai: null,
  nis: null,
  address: null,
  commune: "Jijel",
  wilaya: "Jijel",
  postalCode: "18000",
  creditLimit: 0
};

req.write(JSON.stringify(payload));
req.end();
