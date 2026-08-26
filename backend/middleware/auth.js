import jwt from 'jsonwebtoken';

const jwtSecret = () => process.env.JWT_SECRET || 'development-only-change-me';

function cookieToken(cookieHeader) {
  const token = cookieHeader?.split(';').map((item) => item.trim()).find((item) => item.startsWith('token='));
  return token ? decodeURIComponent(token.slice(6)) : null;
}

export function issueToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, username: user.username }, jwtSecret(), { expiresIn: '8h' });
}

export function authenticate(req, res, next) {
  const token = cookieToken(req.headers.cookie) || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
  try {
    req.user = jwt.verify(token, jwtSecret());
    next();
  } catch {
    return res.status(401).json({ error: 'AUTHENTICATION_FAILED' });
  }
}

export function optionalAuth(req, _res, next) {
  const token = cookieToken(req.headers.cookie) || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (token) {
    try { req.user = jwt.verify(token, jwtSecret()); } catch { req.user = null; }
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'UNAUTHORIZED' });
    next();
  };
}
