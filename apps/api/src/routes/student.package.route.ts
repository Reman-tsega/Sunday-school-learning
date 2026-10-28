import { Router } from 'express';
import {
  getStudentCurriculum,
  getStudentPackageManifest,
} from '../controllers/student.package.controller.js';
import { handleSingleAttemptSync } from '../controllers/sync.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export const studentPackageRouter: Router = Router();

// Requires authentication to discover and download learning packages
studentPackageRouter.use(authenticate);

studentPackageRouter.get('/curriculum', getStudentCurriculum);
studentPackageRouter.get('/packages/:chapterId', getStudentPackageManifest);
studentPackageRouter.post('/quizzes/attempts', handleSingleAttemptSync);
