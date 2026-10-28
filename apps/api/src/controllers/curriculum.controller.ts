import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import {
  CreateGradeSchema,
  UpdateGradeSchema,
  CreateSubjectSchema,
  UpdateSubjectSchema,
  CreateChapterSchema,
  UpdateChapterSchema,
  UpsertTextbookSchema,
  CreateQuizSchema,
  CreateQuestionSchema,
  CreateReferenceLinkSchema,
} from '@eotc/shared';
import { curriculumService } from '../services/curriculum.service.js';
import type { ApiResponse } from '@eotc/shared';

// ==========================================
// GRADES
// ==========================================

export async function getGrades(_req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const grades = await curriculumService.getGrades();
    res.status(200).json({ success: true, data: grades, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function getGradeById(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const grade = await curriculumService.getGradeById(req.params.id as string);
    res.status(200).json({ success: true, data: grade, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function createGrade(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const validated = CreateGradeSchema.parse(req.body);
    const grade = await curriculumService.createGrade(validated);
    res.status(201).json({ success: true, data: grade, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function updateGrade(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const validated = UpdateGradeSchema.parse(req.body);
    const grade = await curriculumService.updateGrade(req.params.id as string, validated);
    res.status(200).json({ success: true, data: grade, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function deleteGrade(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    await curriculumService.deleteGrade(req.params.id as string);
    res.status(200).json({ success: true, data: { message: 'Grade deleted' }, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// SUBJECTS
// ==========================================

export async function getSubjectsByGrade(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const subjects = await curriculumService.getSubjectsByGrade(req.params.gradeId as string);
    res.status(200).json({ success: true, data: subjects, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function getSubjectById(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const subject = await curriculumService.getSubjectById(req.params.id as string);
    res.status(200).json({ success: true, data: subject, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function createSubject(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const validated = CreateSubjectSchema.parse(req.body);
    const subject = await curriculumService.createSubject(req.params.gradeId as string, validated);
    res.status(201).json({ success: true, data: subject, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function updateSubject(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const validated = UpdateSubjectSchema.parse(req.body);
    const subject = await curriculumService.updateSubject(req.params.id as string, validated);
    res.status(200).json({ success: true, data: subject, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function deleteSubject(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    await curriculumService.deleteSubject(req.params.id as string);
    res.status(200).json({ success: true, data: { message: 'Subject deleted' }, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// CHAPTERS
// ==========================================

export async function getChaptersBySubject(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const includeUnpublished = req.user?.role === 'ADMIN';
    const chapters = await curriculumService.getChaptersBySubject(req.params.subjectId as string, includeUnpublished);
    res.status(200).json({ success: true, data: chapters, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function getChapterById(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const chapter = await curriculumService.getChapterById(req.params.id as string);
    res.status(200).json({ success: true, data: chapter, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function createChapter(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const validated = CreateChapterSchema.parse(req.body);
    const chapter = await curriculumService.createChapter(req.params.subjectId as string, validated);
    res.status(201).json({ success: true, data: chapter, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function updateChapter(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const validated = UpdateChapterSchema.parse(req.body);
    const chapter = await curriculumService.updateChapter(req.params.id as string, validated);
    res.status(200).json({ success: true, data: chapter, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function deleteChapter(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    await curriculumService.deleteChapter(req.params.id as string);
    res.status(200).json({ success: true, data: { message: 'Chapter deleted' }, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// TEXTBOOK & QUIZ & REFERENCES
// ==========================================

export async function upsertTextbook(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const validated = UpsertTextbookSchema.parse(req.body);
    const textbook = await curriculumService.upsertTextbook(req.params.chapterId as string, validated);
    res.status(200).json({ success: true, data: textbook, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function createQuiz(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const validated = CreateQuizSchema.parse(req.body);
    const quiz = await curriculumService.createQuiz(req.params.chapterId as string, validated);
    res.status(201).json({ success: true, data: quiz, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function addQuestion(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const validated = CreateQuestionSchema.parse(req.body);
    const question = await curriculumService.addQuestion(req.params.quizId as string, validated);
    res.status(201).json({ success: true, data: question, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function addReferenceLink(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const validated = CreateReferenceLinkSchema.parse(req.body);
    const ref = await curriculumService.addReferenceLink(req.params.chapterId as string, validated);
    res.status(201).json({ success: true, data: ref, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// PUBLISHING
// ==========================================

export async function publishChapter(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const manifest = await curriculumService.publishChapter(req.params.chapterId as string, req.user?.id);
    res.status(200).json({
      success: true,
      data: {
        message: 'Chapter and learning package successfully published',
        manifest,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function unpublishChapter(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const result = await curriculumService.unpublishChapter(req.params.chapterId as string, req.user?.id);
    res.status(200).json({ success: true, data: result, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function getPublishedCurriculum(_req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const curriculum = await curriculumService.getPublishedCurriculum();
    res.status(200).json({ success: true, data: curriculum, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function getAdminCurriculum(_req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    const hierarchy = await curriculumService.getAdminCurriculum();
    res.status(200).json({ success: true, data: hierarchy, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function uploadPdf(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'FILE_REQUIRED', message: 'No PDF file was uploaded' },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const checksumSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const fileSize = req.file.size;
    const protocol = req.protocol;
    const host = req.get('host') || 'localhost:4000';
    const subfolder = req.file.destination.includes('references') ? 'references' : 'textbooks';
    const relativeUrl = `/uploads/${subfolder}/${req.file.filename}`;
    const fileUrl = `${protocol}://${host}${relativeUrl}`;

    res.status(200).json({
      success: true,
      data: {
        fileUrl,
        fileName: req.file.originalname,
        storedFileName: req.file.filename,
        fileSize,
        checksumSha256,
        mimeType: 'application/pdf',
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteQuiz(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    await curriculumService.deleteQuiz(req.params.quizId as string);
    res.status(200).json({ success: true, data: { message: 'Quiz deleted' }, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function deleteQuestion(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    await curriculumService.deleteQuestion(req.params.questionId as string);
    res.status(200).json({ success: true, data: { message: 'Question deleted' }, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function deleteReferenceLink(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction) {
  try {
    await curriculumService.deleteReferenceLink(req.params.referenceId as string);
    res.status(200).json({ success: true, data: { message: 'Reference deleted' }, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function getChapterPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const chapterId = req.params.chapterId as string;
    const { filePath, fileName } = await curriculumService.getChapterIsolatedPdf(chapterId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.removeHeader('X-Frame-Options');

    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

export async function getChapterPracticeQuestions(req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> {
  try {
    const chapterId = req.params.chapterId as string;
    const questions = await curriculumService.getApprovedChapterPracticeQuestions(chapterId);

    res.status(200).json({
      success: true,
      data: questions,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

