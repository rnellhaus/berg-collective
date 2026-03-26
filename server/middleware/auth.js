import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'berg-cms-dev-secret-change-in-production';
const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

export function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRY });
  const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: REFRESH_EXPIRY });
  return { accessToken, refreshToken };
}

export function verifyToken(req, res, next) {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export { JWT_SECRET };
