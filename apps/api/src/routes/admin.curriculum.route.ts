import { Router } from 'express';
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
  deletePracticeQuestion,
  publishChapter,
  unpublishChapter,
  uploadPdf,
} from '../controllers/curriculum.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.js';

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

// Practice Questions
adminCurriculumRouter.delete('/practice-questions/:questionId', deletePracticeQuestion);

// Publishing Controls
adminCurriculumRouter.post('/chapters/:chapterId/publish', publishChapter);
adminCurriculumRouter.post('/chapters/:chapterId/unpublish', unpublishChapter);
