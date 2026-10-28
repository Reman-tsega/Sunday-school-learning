import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import {
  getParishOverview,
  getParishStudents,
  getStudentParishProgress,
  submitReferenceMaterial,
  submitPracticeQuestion,
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
