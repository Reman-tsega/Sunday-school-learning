import { Router } from 'express';
import {
  getGrades,
  getGradeById,
  getSubjectsByGrade,
  getSubjectById,
  getChaptersBySubject,
  getChapterById,
  getPublishedCurriculum,
  getChapterPdf,
  getChapterPracticeQuestions,
} from '../controllers/curriculum.controller.js';

export const curriculumRouter: Router = Router();

curriculumRouter.get('/published', getPublishedCurriculum);
curriculumRouter.get('/grades', getGrades);
curriculumRouter.get('/grades/:id', getGradeById);
curriculumRouter.get('/grades/:gradeId/subjects', getSubjectsByGrade);
curriculumRouter.get('/subjects/:id', getSubjectById);
curriculumRouter.get('/subjects/:subjectId/chapters', getChaptersBySubject);
curriculumRouter.get('/chapters/:chapterId/pdf', getChapterPdf);
curriculumRouter.get('/chapters/:chapterId/practice-questions', getChapterPracticeQuestions);
curriculumRouter.get('/chapters/:id', getChapterById);
