import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  let token = null;

  if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  } else if (
    typeof req.headers.authorization === 'string' &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contains { userId, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.warn('JWT expired:', err.expiredAt);
      return res.status(401).json({ message: 'Token expired' });
    }
    console.error('JWT Verification Error:', err);
    return res.status(403).json({ message: 'Invalid token' });
  }
};