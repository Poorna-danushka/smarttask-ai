const prisma = require('../config/prisma');
const path = require('path');
const fs = require('fs');

const checkProjectAccess = async (projectId, userId) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  });
  return !!project;
};

// Handles uploading either to a task or to a project
exports.uploadFile = async (req, res) => {
  try {
    const { taskId, projectId } = req.params;
    const userId = req.user.userId;

    if (!taskId && !projectId) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Missing target id (taskId or projectId)' });
    }

    // Verify existence of target and access
    if (taskId) {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Task not found' });
      }
      const hasAccess = await checkProjectAccess(task.projectId, userId);
      if (!hasAccess) {
        if (req.file) fs.unlinkSync(req.file.path);
              return res.status(403).json({ message: "Access denied to this task's project" });
      }
    }

    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Project not found' });
      }
      const hasAccess = await checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'Access denied to this project' });
      }
    }

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const data = {
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
    };
    if (taskId) data.taskId = taskId;
    if (projectId) data.projectId = projectId;

    const attachment = await prisma.attachment.create({ data });

    res.status(201).json(attachment);
  } catch (error) {
    console.error('File upload error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Server error during upload' });
  }
};

// Supports listing attachments for a task or for a project
exports.getAttachments = async (req, res) => {
  try {
    const { taskId, projectId } = req.params;
    const userId = req.user.userId;
    if (!taskId && !projectId) return res.status(400).json({ message: 'Missing target id' });

    if (taskId) {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) return res.status(404).json({ message: 'Task not found' });
      const hasAccess = await checkProjectAccess(task.projectId, userId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied to this task's project" });
    }

    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return res.status(404).json({ message: 'Project not found' });
      const hasAccess = await checkProjectAccess(projectId, userId);
      if (!hasAccess) return res.status(403).json({ message: 'Access denied to this project' });
    }

    const where = taskId ? { taskId } : { projectId };
    const attachments = await prisma.attachment.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(attachments);
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    // Check access on related project
    const projectId = attachment.projectId || (attachment.taskId ? (await prisma.task.findUnique({ where: { id: attachment.taskId } })).projectId : null);
    if (projectId) {
      const hasAccess = await checkProjectAccess(projectId, userId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied to this attachment's project" });
    }

    const filePath = path.join(__dirname, '../../', attachment.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.attachment.delete({ where: { id } });
    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
