#!/usr/bin/env node

const crypto = require('crypto');

// Generate a secure random secret for NextAuth
const secret = crypto.randomBytes(32).toString('base64');

console.log('🔑 Generated NextAuth Secret:');
console.log(secret);
console.log('');
console.log('Add this to your .env.local file:');
console.log(`NEXTAUTH_SECRET=${secret}`);
console.log('');
console.log('Also make sure to add these other required environment variables:');
console.log('NEXTAUTH_URL=http://localhost:3000');
console.log('GOOGLE_CLIENT_ID=your_google_client_id');
console.log('GOOGLE_CLIENT_SECRET=your_google_client_secret');
console.log('');
console.log('📖 Follow the setup guide in GOOGLE_OAUTH_SETUP.md for complete configuration.');