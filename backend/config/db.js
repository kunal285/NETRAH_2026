import mongoose from 'mongoose';
import dns from 'dns';
import { User } from '../models/User.js';

// Configure public DNS resolvers to handle SRV record lookups reliably on Windows/Node.js
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (dnsErr) {
  console.warn('[MongoDB] Custom DNS server initialization notice:', dnsErr.message);
}

class Database {
  constructor() {
    this.isConnecting = false;
    this.shutdownRegistered = false;
  }

  get isConnected() {
    return mongoose.connection.readyState === 1;
  }

  async connect(uri) {
    const mongoUri = uri || process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error('[MongoDB] MONGODB_URI is not defined in environment variables.');
      return false;
    }

    if (this.isConnected) {
      return true;
    }

    if (this.isConnecting) {
      return false;
    }

    this.isConnecting = true;

    try {
      mongoose.set('strictQuery', false);

      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
      };

      await mongoose.connect(mongoUri, options);
      this.isConnecting = false;
      console.log('[MongoDB] Successfully connected to MongoDB database.');

      // Ensure default admin operator account exists in MongoDB
      await this.ensureAdminUser();

      mongoose.connection.on('error', (err) => {
        console.error('[MongoDB] Connection error:', err.message);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('[MongoDB] Disconnected from MongoDB.');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('[MongoDB] Reconnected to MongoDB successfully.');
      });

      if (!this.shutdownRegistered) {
        process.on('SIGINT', this.handleShutdown.bind(this));
        process.on('SIGTERM', this.handleShutdown.bind(this));
        this.shutdownRegistered = true;
      }

      return true;
    } catch (error) {
      this.isConnecting = false;
      console.error('[MongoDB] Connection failed:', error.message);
      return false;
    }
  }

  async ensureAdminUser() {
    try {
      const adminCount = await User.countDocuments({ username: 'admin' });
      if (adminCount === 0) {
        const passwordHash = await User.hashPassword('admin123');
        await User.create({
          username: 'admin',
          email: 'admin@prahari.local',
          passwordHash,
          fullName: 'Command Officer',
          role: 'admin',
          isActive: true,
        });
        console.log('[MongoDB] Default administrator account initialized in MongoDB.');
      }
    } catch (err) {
      console.warn('[MongoDB] Admin user verification notice:', err.message);
    }
  }

  async handleShutdown() {
    if (this.isConnected) {
      try {
        await mongoose.connection.close(false);
        console.log('[MongoDB] Connection closed through graceful shutdown.');
      } catch (err) {
        console.error('[MongoDB] Error closing database connection:', err.message);
      }
    }
  }

  getStatus() {
    const readyState = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return {
      connected: readyState === 1,
      state: stateMap[readyState] || 'unknown',
      readyState,
      dbName: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
    };
  }
}

export const db = new Database();
export default db;
