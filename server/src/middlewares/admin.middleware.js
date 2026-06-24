const prisma = require('../config/prisma');
const { verifyAccessToken } = require('../utils/token.util');

const verifyAdmin = async (req, res, next) => {
  const cookies = req.cookies || {};
  // Use unified cookie name; also accept legacy names for backward compatibility
  const token =
    cookies.accessToken ||
    cookies.adminAccessToken ||
    cookies.userAccessToken;

  if (!token) {
    return res.status(401).json({ message: 'No authorization token provided' });
  }

  try {
    const decoded = verifyAccessToken(token);
    const userId = decoded.sub || decoded.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user = { userId, role: decoded.role };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired admin token' });
  }
};

module.exports = { verifyAdmin };
