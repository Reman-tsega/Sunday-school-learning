import { Router } from 'express';
import { Role } from '@prisma/client';
import { upload } from '../middlewares/upload.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import {
  getParishOverview,
  getParishStudents,
  getStudentParishProgress,
  submitReferenceMaterial,
  submitPracticeQuestion,
  submitPracticeQuestionBatch,
  uploadReferenceDocument,
  getMySubmissions,
} from '../controllers/teacher.controller.js';

export const teacherRouter: Router = Router();

// Strictly protect teacher routes
teacherRouter.use(authenticate, requireRole([Role.TEACHER, Role.ADMIN]));

teacherRouter.get('/parish/overview', getParishOverview);
teacherRouter.get('/students', getParishStudents);
teacherRouter.get('/students/:studentId/progress', getStudentParishProgress);

teacherRouter.post('/chapters/:chapterId/references', submitReferenceMaterial);
teacherRouter.post('/practice-questions', submitPracticeQuestion);
teacherRouter.get('/submissions', getMySubmissions);
teacherRouter.post('/practice-questions/batch', submitPracticeQuestionBatch);

// Reference document upload (always stored as a reference document)
teacherRouter.post(
  '/upload-reference',
  (req, _res, next) => {
    req.query.type = 'reference';
    next();
  },
  upload.single('file'),
  uploadReferenceDocument
);
