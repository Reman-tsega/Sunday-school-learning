import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  listStudents,
  getSundaySchools,
  getStudentProgress,
} from '../controllers/admin.student.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';

export const adminStudentRouter: Router = Router();

adminStudentRouter.use(authenticate, requireRole([Role.ADMIN]));

adminStudentRouter.get('/', listStudents);
adminStudentRouter.get('/sunday-schools', getSundaySchools);
adminStudentRouter.get('/:id/progress', getStudentProgress);
