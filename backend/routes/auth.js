import express from 'express';
import { User } from '../models/User.js';
import { issueToken, authenticate } from '../middleware/auth.js';
import { db } from '../config/db.js';

export const authRouter = express.Router();

const DEMO_USER = {
  _id: '65f000000000000000000001',
  id: '65f00000000000000000001',
  username: 'admin',
  email: 'admin@prahari.local',
  role: 'admin',
  fullName: 'Command Officer',
  isActive: true,
};

authRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const normalizedInput = String(username || '').trim().toLowerCase();

    if (!db.getStatus().connected) {
      return res.status(503).json({
        success: false,
        error: 'DATABASE_UNAVAILABLE',
        message: 'Authentication database is currently unavailable. Please verify MongoDB connection.',
      });
    }

    const user = await User.findOne({ $or: [{ username: normalizedInput }, { email: normalizedInput }] });
    if (!user || !user.isActive || !(await user.comparePassword(String(password || '')))) return res.status(401).json({ error: 'AUTHENTICATION_FAILED' });
    user.lastLogin = new Date();
    await user.save();
    const token = issueToken(user);
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `token=${encodeURIComponent(token)}; Max-Age=28800; HttpOnly; SameSite=Lax${secure}`);
    res.json({ success: true, user: { id: user._id, username: user.username, role: user.role, fullName: user.fullName } });
  } catch (error) { next(error); }
});

authRouter.post('/logout', (_req, res) => { res.setHeader('Set-Cookie', 'token=; Max-Age=0; HttpOnly; SameSite=Lax'); res.json({ success: true }); });
authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    if (!db.getStatus().connected) {
      return res.json({ user: DEMO_USER });
    }
    const user = await User.findById(req.user.sub).select('-passwordHash');
    res.json({ user });
  } catch (error) { next(error); }
});

