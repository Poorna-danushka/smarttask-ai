const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.use(verifyToken);
router.get('/search', userController.searchUsers);
router.get('/me', userController.getMe);
router.patch('/profile', userController.updateProfile);
router.patch('/change-password', userController.changePassword);

module.exports = router;
