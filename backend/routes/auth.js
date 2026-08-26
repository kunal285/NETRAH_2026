import express from 'express';
import { User } from '../models/User.js';
import { issueToken, authenticate } from '../middleware/auth.js';

export const authRouter = express.Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const user = await User.findOne({ $or: [{ username: String(username || '').toLowerCase() }, { email: String(username || '').toLowerCase() }] });
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
authRouter.get('/me', authenticate, async (req, res, next) => { try { const user = await User.findById(req.user.sub).select('-passwordHash'); res.json({ user }); } catch (error) { next(error); } });
