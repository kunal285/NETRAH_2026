import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const uriSrv = process.env.MONGODB_URI;

async function check() {
  try {
    await mongoose.connect(uriSrv, { serverSelectionTimeoutMS: 5000 });
    console.log('[STATUS] Connection Successful!');
    console.log('Host:', mongoose.connection.host);
    console.log('Database Name:', mongoose.connection.name);
    await mongoose.disconnect();
  } catch (e) {
    console.error('[STATUS] Connection Failed:', e.message);
  }
  process.exit(0);
}

check();
