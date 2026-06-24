const crypto = require('crypto');

/**
 * Custom Cookie Parser Middleware
 * Parses incoming Request Cookie headers and populates req.cookies.
 */
const cookieParser = (req, res, next) => {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const name = parts.shift().trim();
      const value = parts.join('=');
      try {
        list[name] = decodeURIComponent(value);
      } catch {
        list[name] = value;
      }
    });
  }
  req.cookies = list;
  next();
};

/**
 * CSRF Token Handlers
 * Implements stateless Double-Submit Cookie Pattern.
 */
const csrfTokenSetter = (req, res, next) => {
  const cookies = req.cookies || {};
  if (!cookies.csrfToken) {
    const csrfToken = crypto.randomBytes(24).toString('hex');
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('csrfToken', csrfToken, {
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    // Attach to request context
    req.csrfToken = csrfToken;
  } else {
    req.csrfToken = cookies.csrfToken;
  }
  next();
};

const csrfProtection = (req, res, next) => {
  // Safe HTTP methods do not require CSRF protection
  if (['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(req.method)) {
    return next();
  }

  const cookies = req.cookies || {};
  const csrfCookie = cookies.csrfToken;
  const csrfHeader = req.headers['x-csrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ message: 'CSRF validation failed: Invalid or missing token' });
  }

  next();
};

module.exports = {
  cookieParser,
  csrfTokenSetter,
  csrfProtection
};
