const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyAdmin } = require('../middlewares/admin.middleware');

router.use(verifyAdmin);

router.get('/stats', adminController.getStats);
router.get('/activity', adminController.getActivity);
router.get('/users', adminController.getAllUsers);
router.delete('/users/:id', adminController.deleteUser);
router.patch('/users/:id/role', adminController.updateUserRole);
router.get('/projects', adminController.getAllProjects);
router.delete('/projects/:id', adminController.deleteProject);
router.post('/broadcast', adminController.broadcastNotification);

module.exports = router;
