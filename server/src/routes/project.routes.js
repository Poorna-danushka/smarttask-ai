const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.use(verifyToken);

router.post('/', projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// Members management
router.post('/:id/members', projectController.addMember);
router.get('/:id/members', projectController.listMembers);
router.delete('/:id/members/:memberId', projectController.removeMember);

module.exports = router;
