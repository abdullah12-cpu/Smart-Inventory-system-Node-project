const http = require('http');

const data = JSON.stringify({
  message: 'search the product name cables and tell me how many pieces are avalible ?"',
  history: []
});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/copilot/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', error => {
  console.error('Request Error:', error);
});

req.write(data);
req.end();
