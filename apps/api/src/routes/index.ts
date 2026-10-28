import { Router } from 'express';
import { healthRouter } from './health.route.js';
import { authRouter } from './auth.route.js';
import { adminUserRouter } from './admin.user.route.js';
import { curriculumRouter } from './curriculum.route.js';
import { adminCurriculumRouter } from './admin.curriculum.route.js';
import { studentPackageRouter } from './student.package.route.js';
import { syncRouter } from './sync.route.js';
import { getChapterPdf } from '../controllers/curriculum.controller.js';

import { adminNotificationRouter, notificationRouter } from './notification.route.js';
import { enrollmentRouter } from './enrollment.route.js';
import { adminStudentRouter } from './admin.student.route.js';
import { supportRouter, adminSupportRouter } from './support.route.js';

export const apiRouter: Router = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/admin/users', adminUserRouter);
apiRouter.use('/admin/students', adminStudentRouter);
apiRouter.use('/admin/curriculum', adminCurriculumRouter);
apiRouter.use('/admin/notifications', adminNotificationRouter);
apiRouter.use('/admin/support', adminSupportRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/support', supportRouter);
apiRouter.use('/curriculum', curriculumRouter);
apiRouter.use('/student/enrollments', enrollmentRouter);
apiRouter.use('/student/sync', syncRouter);
apiRouter.use('/student', studentPackageRouter);
apiRouter.get('/chapters/:chapterId/pdf', getChapterPdf);


