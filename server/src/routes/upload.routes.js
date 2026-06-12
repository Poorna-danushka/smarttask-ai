const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'text/plain',
];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Allowed formats: jpg, png, pdf, txt.'));
    }
    cb(null, true);
  },
});

router.use(verifyToken);

// Task attachments
router.post('/task/:taskId', upload.single('file'), uploadController.uploadFile);
router.get('/task/:taskId', uploadController.getAttachments);

// Project attachments
router.post('/project/:projectId', upload.single('file'), uploadController.uploadFile);
router.get('/project/:projectId', uploadController.getAttachments);

router.delete('/:id', uploadController.deleteAttachment);

module.exports = router;
