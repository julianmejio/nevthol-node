import uWS from 'uWebSockets.js';
import fs from 'fs';

console.log("1");

// Use the H3App for QUIC/HTTP3
uWS.SSLApp({
    key_file_name: './src/localhost+2-key.pem',
    cert_file_name: './src/localhost+2.pem'
}).get('/*', (res, req) => {
    console.log('req', req);
    // res.cork ensures the small response is packed into one packet
    res.cork(() => {
        res.end('OK');
    });
}).listen(9001, (token) => {
    if (token) {
        console.log('🚀 H3 Server listening on port 9001');
    } else {
        console.log('❌ Failed to listen. Check certs and UDP permissions.');
    }
});