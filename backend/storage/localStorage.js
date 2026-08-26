import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const storageRoot = path.resolve(process.env.IMAGE_STORAGE_PATH || 'storage/images');

export const imageStorage = {
  async ensureRoot() {
    await fs.mkdir(storageRoot, { recursive: true });
  },

  async save(buffer, mimeType, extension = 'jpg') {
    await this.ensureRoot();
    const storageKey = `${crypto.randomUUID()}.${extension}`;
    await fs.writeFile(path.join(storageRoot, storageKey), buffer);
    return storageKey;
  },

  async retrieve(storageKey) {
    const safeKey = path.basename(storageKey);
    return fs.readFile(path.join(storageRoot, safeKey));
  },

  async delete(storageKey) {
    try {
      await fs.unlink(path.join(storageRoot, path.basename(storageKey)));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  },

  async exists(storageKey) {
    try {
      await fs.access(path.join(storageRoot, path.basename(storageKey)));
      return true;
    } catch {
      return false;
    }
  },
};
