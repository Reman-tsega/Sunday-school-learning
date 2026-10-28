import { Router } from 'express';
import {
  getStudentEnrollments,
  enrollStudentGrades,
  unenrollStudentGrade,
} from '../controllers/enrollment.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export const enrollmentRouter: Router = Router();
enrollmentRouter.use(authenticate);

enrollmentRouter.get('/', getStudentEnrollments);
enrollmentRouter.post('/', enrollStudentGrades);
enrollmentRouter.delete('/:gradeId', unenrollStudentGrade);
