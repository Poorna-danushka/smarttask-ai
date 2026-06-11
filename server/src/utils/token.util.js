const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ISSUER,
  JWT_AUDIENCE,
} = require('../config/env');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createSignOptions = (jwtId, expiresIn) => {
  const options = {
    expiresIn,
    jwtid: jwtId,
    algorithm: 'HS256',
  };

  if (JWT_ISSUER) options.issuer = JWT_ISSUER;
  if (JWT_AUDIENCE) options.audience = JWT_AUDIENCE;

  return options;
};

const jwtVerifyOptions = {
  algorithms: ['HS256'],
};

if (JWT_ISSUER) jwtVerifyOptions.issuer = JWT_ISSUER;
if (JWT_AUDIENCE) jwtVerifyOptions.audience = JWT_AUDIENCE;

const generateAccessToken = (user) => {
  const jwtId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    { sub: user.id, role: user.role },
    JWT_SECRET,
    createSignOptions(jwtId, '15m')
  );
};

const generateRefreshToken = (user) => {
  const jwtId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const refreshToken = jwt.sign(
    { sub: user.id, role: user.role },
    JWT_REFRESH_SECRET,
    createSignOptions(jwtId, '7d')
  );

  return {
    token: refreshToken,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
};

const generatePasswordResetToken = () => crypto.randomBytes(48).toString('hex');

const verifyAccessToken = (token) => jwt.verify(token, JWT_SECRET, jwtVerifyOptions);
const verifyRefreshToken = (token) => jwt.verify(token, JWT_REFRESH_SECRET, jwtVerifyOptions);

module.exports = {
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  generatePasswordResetToken,
  verifyAccessToken,
  verifyRefreshToken,
};
