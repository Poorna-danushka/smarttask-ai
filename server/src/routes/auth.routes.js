const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { body, validationResult } = require('express-validator');
const { verifyToken } = require('../middlewares/auth.middleware');

// Validation middleware generator
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    res.status(400).json({ errors: errors.array() });
  };
};

router.post('/register', validate([
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
]), authController.register);

router.post('/login', validate([
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').exists().withMessage('Password is required'),
]), authController.login);

router.post('/refresh', authController.refresh);

router.post('/forgot-password', validate([
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
]), authController.forgotPassword);

router.post('/reset-password', validate([
  body('token').exists().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
]), authController.resetPassword);

router.post('/logout', verifyToken, authController.logout);

module.exports = router;
