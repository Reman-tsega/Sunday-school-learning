import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import { Role } from '@prisma/client';
import {
  getAdminCurriculum,
  createGrade,
  updateGrade,
  deleteGrade,
  createSubject,
  updateSubject,
  deleteSubject,
  createChapter,
  updateChapter,
  deleteChapter,
  upsertTextbook,
  createQuiz,
  addQuestion,
  addReferenceLink,
  deleteQuiz,
  deleteQuestion,
  deleteReferenceLink,
  publishChapter,
  unpublishChapter,
  uploadPdf,
} from '../controllers/curriculum.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';

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

const upload = multer({
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

export const adminCurriculumRouter: Router = Router();

// Enforce authentication & Admin RBAC on all admin curriculum management routes
adminCurriculumRouter.use(authenticate, requireRole([Role.ADMIN]));

// Curriculum Hierarchy (Includes all unpublished/draft chapters)
adminCurriculumRouter.get('/hierarchy', getAdminCurriculum);

// File Uploads (PDF Textbooks and Reference Documents)
adminCurriculumRouter.post('/upload-pdf', upload.single('file'), uploadPdf);

// Grades
adminCurriculumRouter.post('/grades', createGrade);
adminCurriculumRouter.patch('/grades/:id', updateGrade);
adminCurriculumRouter.delete('/grades/:id', deleteGrade);

// Subjects
adminCurriculumRouter.post('/grades/:gradeId/subjects', createSubject);
adminCurriculumRouter.patch('/subjects/:id', updateSubject);
adminCurriculumRouter.delete('/subjects/:id', deleteSubject);

// Chapters
adminCurriculumRouter.post('/subjects/:subjectId/chapters', createChapter);
adminCurriculumRouter.patch('/chapters/:id', updateChapter);
adminCurriculumRouter.delete('/chapters/:id', deleteChapter);

// Textbook & Page Range Mapping
adminCurriculumRouter.put('/chapters/:chapterId/textbook', upsertTextbook);

// Practice Quizzes & Questions
adminCurriculumRouter.post('/chapters/:chapterId/quizzes', createQuiz);
adminCurriculumRouter.delete('/quizzes/:quizId', deleteQuiz);
adminCurriculumRouter.post('/quizzes/:quizId/questions', addQuestion);
adminCurriculumRouter.delete('/questions/:questionId', deleteQuestion);

// Reference Links
adminCurriculumRouter.post('/chapters/:chapterId/references', addReferenceLink);
adminCurriculumRouter.delete('/references/:referenceId', deleteReferenceLink);

// Publishing Controls
adminCurriculumRouter.post('/chapters/:chapterId/publish', publishChapter);
adminCurriculumRouter.post('/chapters/:chapterId/unpublish', unpublishChapter);
