const { verifyAccessToken } = require('../utils/token.util');

const verifyToken = (req, res, next) => {
  const cookies = req.cookies || {};
  // Use unified cookie name; also accept legacy names for backward compatibility
  const token =
    cookies.accessToken ||
    cookies.userAccessToken ||
    cookies.adminAccessToken;

  if (!token) {
    return res.status(401).json({ message: 'No authorization token provided' });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = { userId: decoded.sub || decoded.userId, role: decoded.role };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired authorization token' });
  }
};

module.exports = { verifyToken };
