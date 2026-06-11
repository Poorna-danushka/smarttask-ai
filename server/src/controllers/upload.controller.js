const prisma = require('../config/prisma');
const path = require('path');
const fs = require('fs');

exports.uploadFile = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const attachment = await prisma.attachment.create({
      data: { taskId, fileName: req.file.originalname, fileUrl: `/uploads/${req.file.filename}` },
    });

    res.status(201).json(attachment);
  } catch (error) {
    console.error('File upload error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Server error during upload' });
  }
};

exports.getAttachments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const attachments = await prisma.attachment.findMany({ where: { taskId }, orderBy: { createdAt: 'desc' } });
    res.json(attachments);
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    const filePath = path.join(__dirname, '../../', attachment.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.attachment.delete({ where: { id } });
    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
