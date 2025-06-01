import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  let token = null;

  // Get token from cookie OR from Authorization header
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // decoded contains { userId, iat, exp }
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err);
    return res.status(403).json({ message: 'Invalid token' });
  }
};
