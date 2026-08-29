import mongoose from 'mongoose';
import dns from 'dns';

class Database {
  constructor() {
    this.isConnected = false;
    this.isConnecting = false;
    this.dnsFallbackApplied = false;
    this.retryTimer = null;
    this.shutdownRegistered = false;
  }

  async connect(uri) {
    const mongoUri = uri || process.env.MONGODB_URI;

    if (!mongoUri) {
      console.warn('[MongoDB] MONGODB_URI is not defined. Running in in-memory / non-persistent hybrid mode.');
      return false;
    }

    if (this.isConnected) {
      console.log('[MongoDB] Already connected.');
      return true;
    }

    if (this.isConnecting) {
      console.log('[MongoDB] Connection already in progress...');
      return false;
    }

    this.isConnecting = true;

    try {
      mongoose.set('strictQuery', false);

      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      await mongoose.connect(mongoUri, options);

      this.isConnected = true;
      this.isConnecting = false;
      console.log('[MongoDB] Successfully connected to MongoDB database.');

      mongoose.connection.on('error', (err) => {
        console.error('[MongoDB] Connection error:', err.message);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('[MongoDB] Disconnected from MongoDB. Reconnect will be attempted automatically.');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('[MongoDB] Reconnected to MongoDB successfully.');
        this.isConnected = true;
      });

      // Handle graceful process shutdown
      if (!this.shutdownRegistered) {
        process.on('SIGINT', this.handleShutdown.bind(this));
        process.on('SIGTERM', this.handleShutdown.bind(this));
        this.shutdownRegistered = true;
      }

      return true;
    } catch (error) {
      this.isConnecting = false;
      this.isConnected = false;
      console.error('[MongoDB] Failed to connect to MongoDB:', error.message);

      // Fallback to public DNS servers if Node's c-ares DNS resolver fails with querySrv ECONNREFUSED
      if ((error.code === 'ECONNREFUSED' || error.message.includes('querySrv')) && !this.dnsFallbackApplied) {
        this.dnsFallbackApplied = true;
        console.log('[MongoDB] Applying public DNS server fallback (8.8.8.8, 1.1.1.1) to resolve SRV query issue...');
        try {
          dns.setServers(['8.8.8.8', '1.1.1.1']);
        } catch (dnsErr) {
          console.error('[MongoDB] Failed to set DNS servers:', dnsErr.message);
        }
        return this.connect(mongoUri);
      }

      console.warn('[MongoDB] The application will continue running with in-memory caching fallback and retry MongoDB connection.');
      if (!this.retryTimer) {
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          this.connect(mongoUri).catch(() => {});
        }, 10000);
      }
      return false;
    }
  }

  async handleShutdown() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.isConnected) {
      try {
        await mongoose.connection.close(false);
        console.log('[MongoDB] Connection closed through app graceful shutdown.');
      } catch (err) {
        console.error('[MongoDB] Error closing database connection:', err);
      }
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      readyState: mongoose.connection.readyState,
      dbName: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
    };
  }
}

export const db = new Database();
export default db;
