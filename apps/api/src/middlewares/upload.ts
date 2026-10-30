import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Setup directories for uploaded assets
const textbooksDir = path.resolve(process.cwd(), 'uploads/textbooks');
const referencesDir = path.resolve(process.cwd(), 'uploads/references');
fs.mkdirSync(textbooksDir, { recursive: true });
fs.mkdirSync(referencesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const isReference = req.query.type === 'reference' || req.body?.type === 'reference';
    cb(null, isReference ? referencesDir : textbooksDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginal}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max for textbooks & references
  fileFilter: (req, file, cb) => {
    const isReference = req.query?.type === 'reference' || req.body?.type === 'reference';
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedReferenceExts = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];

    if (isReference) {
      if (
        allowedReferenceExts.includes(ext) ||
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/vnd.ms-powerpoint' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF, DOC, DOCX, PPT, and PPTX documents are allowed for references'));
      }
    } else {
      if (ext === '.pdf' || file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF documents (.pdf) are allowed for textbooks'));
      }
    }
  },
});
