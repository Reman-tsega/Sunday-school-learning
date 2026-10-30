import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { PackageStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import type {
  LearningPackageManifest,
  TextbookAsset,
  OfflineQuiz,
  OfflineReference,
} from '@eotc/shared';

export class CurriculumService {
  // ==========================================
  // GRADES CRUD
  // ==========================================

  async getGrades() {
    return prisma.grade.findMany({
      orderBy: [{ level: 'asc' }, { orderIndex: 'asc' }],
      include: {
        subjects: {
          orderBy: { orderIndex: 'asc' },
          select: { id: true, name: true, amharicName: true, code: true },
        },
      },
    });
  }

  async getAdminCurriculum() {
    return prisma.grade.findMany({
      orderBy: [{ level: 'asc' }, { orderIndex: 'asc' }],
      include: {
        subjects: {
          orderBy: { orderIndex: 'asc' },
          include: {
            chapters: {
              orderBy: { chapterNumber: 'asc' },
              include: {
                textbook: true,
                quizzes: {
                  include: {
                    questions: {
                      orderBy: { orderIndex: 'asc' },
                      include: {
                        choices: { orderBy: { orderIndex: 'asc' } },
                      },
                    },
                  },
                },
                references: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        },
      },
    });
  }

  async getGradeById(id: string) {
    const grade = await prisma.grade.findUnique({
      where: { id },
      include: {
        subjects: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
    if (!grade) throw new AppError(404, 'NOT_FOUND', 'Grade not found');
    return grade;
  }

  async createGrade(data: {
    level: number;
    name: string;
    amharicName?: string | null | undefined;
    description?: string | null | undefined;
    orderIndex?: number | undefined;
  }) {
    const existing = await prisma.grade.findUnique({ where: { level: data.level } });
    if (existing) {
      throw new AppError(409, 'GRADE_EXISTS', `Grade with level ${data.level} already exists`);
    }

    return prisma.grade.create({
      data: {
        level: data.level,
        name: data.name,
        amharicName: data.amharicName ?? null,
        description: data.description ?? null,
        orderIndex: data.orderIndex ?? data.level,
      },
    });
  }

  async updateGrade(
    id: string,
    data: {
      name?: string | undefined;
      amharicName?: string | null | undefined;
      description?: string | null | undefined;
      orderIndex?: number | undefined;
    }
  ) {
    await this.getGradeById(id);
    return prisma.grade.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.amharicName !== undefined && { amharicName: data.amharicName }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
      },
    });
  }

  async deleteGrade(id: string) {
    await this.getGradeById(id);
    return prisma.grade.delete({ where: { id } });
  }

  // ==========================================
  // SUBJECTS CRUD
  // ==========================================

  async getSubjectsByGrade(gradeId: string) {
    return prisma.subject.findMany({
      where: { gradeId },
      orderBy: { orderIndex: 'asc' },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' },
          select: {
            id: true,
            chapterNumber: true,
            title: true,
            amharicTitle: true,
            isPublished: true,
            version: true,
          },
        },
      },
    });
  }

  async getSubjectById(id: string) {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        grade: true,
        chapters: {
          orderBy: { chapterNumber: 'asc' },
        },
      },
    });
    if (!subject) throw new AppError(404, 'NOT_FOUND', 'Subject not found');
    return subject;
  }

  async createSubject(
    gradeId: string,
    data: {
      name: string;
      amharicName?: string | null | undefined;
      code: string;
      description?: string | null | undefined;
      iconUrl?: string | null | undefined;
      orderIndex?: number | undefined;
    }
  ) {
    await this.getGradeById(gradeId);

    const existingCode = await prisma.subject.findUnique({
      where: {
        gradeId_code: { gradeId, code: data.code },
      },
    });
    if (existingCode) {
      throw new AppError(409, 'SUBJECT_EXISTS', `Subject code ${data.code} already exists for this grade`);
    }

    return prisma.subject.create({
      data: {
        gradeId,
        name: data.name,
        amharicName: data.amharicName ?? null,
        code: data.code,
        description: data.description ?? null,
        iconUrl: data.iconUrl ?? null,
        orderIndex: data.orderIndex ?? 0,
      },
    });
  }

  async updateSubject(
    id: string,
    data: {
      name?: string | undefined;
      amharicName?: string | null | undefined;
      code?: string | undefined;
      description?: string | null | undefined;
      iconUrl?: string | null | undefined;
      orderIndex?: number | undefined;
      textbookUrl?: string | null | undefined;
      textbookFileKey?: string | null | undefined;
      textbookFileName?: string | null | undefined;
      textbookFileSize?: number | null | undefined;
      textbookChecksumSha256?: string | null | undefined;
      textbookTotalPages?: number | null | undefined;
    }
  ) {
    await this.getSubjectById(id);
    return prisma.subject.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.amharicName !== undefined && { amharicName: data.amharicName }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.iconUrl !== undefined && { iconUrl: data.iconUrl }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
        ...(data.textbookUrl !== undefined && { textbookUrl: data.textbookUrl }),
        ...(data.textbookFileKey !== undefined && { textbookFileKey: data.textbookFileKey }),
        ...(data.textbookFileName !== undefined && { textbookFileName: data.textbookFileName }),
        ...(data.textbookFileSize !== undefined && { textbookFileSize: data.textbookFileSize }),
        ...(data.textbookChecksumSha256 !== undefined && { textbookChecksumSha256: data.textbookChecksumSha256 }),
        ...(data.textbookTotalPages !== undefined && { textbookTotalPages: data.textbookTotalPages }),
      },
    });
  }

  async deleteSubject(id: string) {
    await this.getSubjectById(id);
    return prisma.subject.delete({ where: { id } });
  }

  // ==========================================
  // CHAPTERS CRUD
  // ==========================================

  async getChaptersBySubject(subjectId: string, includeUnpublished = false) {
    return prisma.chapter.findMany({
      where: {
        subjectId,
        ...(includeUnpublished ? {} : { isPublished: true }),
      },
      orderBy: { chapterNumber: 'asc' },
      include: {
        textbook: true,
        quizzes: {
          select: { id: true, title: true, isPractice: true, passingScore: true, isPublished: true },
        },
        references: true,
      },
    });
  }

  async getChapterById(id: string) {
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        subject: { include: { grade: true } },
        textbook: true,
        quizzes: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: {
                choices: { orderBy: { orderIndex: 'asc' } },
              },
            },
          },
        },
        references: {
          where: { status: 'APPROVED' },
          orderBy: { orderIndex: 'asc' },
        },
        packages: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!chapter) throw new AppError(404, 'NOT_FOUND', 'Chapter not found');
    return chapter;
  }

  async createChapter(
    subjectId: string,
    data: {
      chapterNumber: number;
      title: string;
      amharicTitle?: string | null | undefined;
      description?: string | null | undefined;
      orderIndex?: number | undefined;
    }
  ) {
    await this.getSubjectById(subjectId);

    const existing = await prisma.chapter.findUnique({
      where: {
        subjectId_chapterNumber: {
          subjectId,
          chapterNumber: data.chapterNumber,
        },
      },
    });
    if (existing) {
      throw new AppError(409, 'CHAPTER_EXISTS', `Chapter ${data.chapterNumber} already exists for this subject`);
    }

    return prisma.chapter.create({
      data: {
        subjectId,
        chapterNumber: data.chapterNumber,
        title: data.title,
        amharicTitle: data.amharicTitle ?? null,
        description: data.description ?? null,
        orderIndex: data.orderIndex ?? data.chapterNumber,
      },
    });
  }

  async updateChapter(
    id: string,
    data: {
      chapterNumber?: number | undefined;
      title?: string | undefined;
      amharicTitle?: string | null | undefined;
      description?: string | null | undefined;
      orderIndex?: number | undefined;
    }
  ) {
    await this.getChapterById(id);
    return prisma.chapter.update({
      where: { id },
      data: {
        ...(data.chapterNumber !== undefined && { chapterNumber: data.chapterNumber }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.amharicTitle !== undefined && { amharicTitle: data.amharicTitle }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
      },
    });
  }

  async deleteChapter(id: string) {
    await this.getChapterById(id);
    return prisma.chapter.delete({ where: { id } });
  }

  // ==========================================
  // TEXTBOOK & PAGE MAPPING
  // ==========================================

  async upsertTextbook(
    chapterId: string,
    data: {
      title: string;
      fileUrl: string;
      fileKey?: string | undefined;
      fileSize: number;
      checksumSha256: string;
      mimeType?: string | undefined;
      startPage: number;
      endPage: number;
      totalPages: number;
    }
  ) {
    this.invalidateChapterPdfCache(chapterId);

    return prisma.textbookDocument.upsert({
      where: { chapterId },
      create: {
        chapterId,
        title: data.title,
        fileUrl: data.fileUrl,
        fileKey: data.fileKey ?? null,
        fileSize: data.fileSize,
        checksumSha256: data.checksumSha256,
        mimeType: data.mimeType ?? 'application/pdf',
        startPage: data.startPage,
        endPage: data.endPage,
        totalPages: data.totalPages,
      },
      update: {
        title: data.title,
        fileUrl: data.fileUrl,
        fileKey: data.fileKey ?? null,
        fileSize: data.fileSize,
        checksumSha256: data.checksumSha256,
        mimeType: data.mimeType ?? 'application/pdf',
        startPage: data.startPage,
        endPage: data.endPage,
        totalPages: data.totalPages,
      },
    });
  }

  // ==========================================
  // QUIZZES & QUESTIONS
  // ==========================================

  async createQuiz(
    chapterId: string,
    data: {
      title: string;
      amharicTitle?: string | null | undefined;
      description?: string | null | undefined;
      timeLimitMinutes?: number | null | undefined;
      passingScore?: number | undefined;
      isPractice?: boolean | undefined;
    }
  ) {
    await this.getChapterById(chapterId);

    return prisma.quiz.create({
      data: {
        chapterId,
        title: data.title,
        amharicTitle: data.amharicTitle ?? null,
        description: data.description ?? null,
        timeLimitMinutes: data.timeLimitMinutes ?? null,
        passingScore: data.passingScore ?? 70,
        isPractice: data.isPractice ?? true,
      },
    });
  }

  async addQuestion(
    quizId: string,
    data: {
      prompt: string;
      amharicPrompt?: string | null | undefined;
      orderIndex?: number | undefined;
      points?: number | undefined;
      explanation?: string | null | undefined;
      amharicExplanation?: string | null | undefined;
      choices: Array<{
        text: string;
        amharicText?: string | null | undefined;
        orderIndex?: number | undefined;
        isCorrect?: boolean | undefined;
      }>;
    }
  ) {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new AppError(404, 'NOT_FOUND', 'Quiz not found');

    return prisma.quizQuestion.create({
      data: {
        quizId,
        prompt: data.prompt,
        amharicPrompt: data.amharicPrompt ?? null,
        orderIndex: data.orderIndex ?? 0,
        points: data.points ?? 1,
        explanation: data.explanation ?? null,
        amharicExplanation: data.amharicExplanation ?? null,
        choices: {
          create: data.choices.map((c, idx) => ({
            text: c.text,
            amharicText: c.amharicText ?? null,
            orderIndex: c.orderIndex ?? idx + 1,
            isCorrect: c.isCorrect ?? false,
          })),
        },
      },
      include: { choices: true },
    });
  }

  // ==========================================
  // REFERENCE LINKS
  // ==========================================

  async addReferenceLink(
    chapterId: string,
    data: {
      title: string;
      amharicTitle?: string | null | undefined;
      url: string;
      isDownloadable: boolean;
      downloadableDocUrl?: string | null | undefined;
      downloadableDocSize?: number | null | undefined;
      downloadableDocChecksum?: string | null | undefined;
      orderIndex?: number | undefined;
    }
  ) {
    await this.getChapterById(chapterId);

    return prisma.referenceLink.create({
      data: {
        chapterId,
        title: data.title,
        amharicTitle: data.amharicTitle ?? null,
        url: data.url,
        isDownloadable: data.isDownloadable,
        downloadableDocUrl: data.downloadableDocUrl ?? null,
        downloadableDocSize: data.downloadableDocSize ?? null,
        downloadableDocChecksum: data.downloadableDocChecksum ?? null,
        orderIndex: data.orderIndex ?? 0,
      },
    });
  }

  async deleteQuiz(id: string) {
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Quiz not found');
    return prisma.quiz.delete({ where: { id } });
  }

  async deleteQuestion(id: string) {
    const existing = await prisma.quizQuestion.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Question not found');
    return prisma.quizQuestion.delete({ where: { id } });
  }

  async deleteReferenceLink(id: string) {
    const existing = await prisma.referenceLink.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Reference not found');
    return prisma.referenceLink.delete({ where: { id } });
  }

  async deletePracticeQuestion(id: string) {
    const existing = await prisma.practiceQuestion.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Practice question not found');
    return prisma.practiceQuestion.delete({ where: { id } });
  }

  // ==========================================
  // PUBLISHING WORKFLOW & PACKAGE MANIFEST
  // ==========================================

  async publishChapter(chapterId: string, adminUserId?: string): Promise<LearningPackageManifest> {
    const chapter = await this.getChapterById(chapterId);

    // 1. Verify required textbook mapping
    if (!chapter.textbook) {
      throw new AppError(
        400,
        'PUBLISH_PRECONDITION_FAILED',
        'Cannot publish chapter: No textbook PDF with page mapping has been configured.'
      );
    }

    // 2. Quiz validation (optional - chapter can be reading-only without a quiz)

    // Increment version
    const newVersion = chapter.version + 1;
    const publishedAt = new Date().toISOString();

    // Extract and cache chapter-isolated PDF
    let isolatedPdf: {
      filePath: string;
      fileName: string;
      fileSize: number;
      totalPages: number;
      checksumSha256: string;
    } | null = null;

    try {
      isolatedPdf = await this.getChapterIsolatedPdf(chapterId);
    } catch (extractErr) {
      console.warn('PDF extraction warning during publish:', extractErr);
    }

    // Prepare Textbook Asset
    const textbookAsset: TextbookAsset = {
      id: chapter.textbook.id,
      title: chapter.textbook.title,
      fileUrl: chapter.textbook.fileUrl,
      chapterPdfUrl: `/api/chapters/${chapter.id}/pdf`,
      fileSize: isolatedPdf?.fileSize ?? chapter.textbook.fileSize,
      checksumSha256: isolatedPdf?.checksumSha256 ?? chapter.textbook.checksumSha256,
      mimeType: 'application/pdf',
      startPage: chapter.textbook.startPage,
      endPage: chapter.textbook.endPage,
      totalPages: chapter.textbook.totalPages,
    };

    // Prepare Quizzes
    const offlineQuizzes: OfflineQuiz[] = chapter.quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      amharicTitle: q.amharicTitle,
      description: q.description,
      timeLimitMinutes: q.timeLimitMinutes,
      passingScore: q.passingScore,
      isPractice: q.isPractice,
      version: newVersion,
      questions: q.questions.map((ques) => ({
        id: ques.id,
        prompt: ques.prompt,
        amharicPrompt: ques.amharicPrompt,
        orderIndex: ques.orderIndex,
        points: ques.points,
        explanation: ques.explanation,
        amharicExplanation: ques.amharicExplanation,
        choices: ques.choices.map((c) => ({
          id: c.id,
          text: c.text,
          amharicText: c.amharicText,
          orderIndex: c.orderIndex,
          isCorrect: c.isCorrect,
        })),
      })),
    }));

    // Prepare References
    const offlineReferences: OfflineReference[] = chapter.references.map((r) => ({
      id: r.id,
      title: r.title,
      amharicTitle: r.amharicTitle,
      url: r.url,
      isDownloadable: r.isDownloadable,
      downloadableDocUrl: r.downloadableDocUrl,
      downloadableDocSize: r.downloadableDocSize,
      downloadableDocChecksum: r.downloadableDocChecksum,
    }));

    // Calculate total size: isolated textbook size + downloadable reference sizes
    let totalSizeBytes = textbookAsset.fileSize;
    for (const ref of chapter.references) {
      if (ref.isDownloadable && ref.downloadableDocSize) {
        totalSizeBytes += ref.downloadableDocSize;
      }
    }

    // Build canonical manifest
    const manifestPayload = {
      packageId: `pkg-${chapter.id}-v${newVersion}`,
      chapterId: chapter.id,
      chapterNumber: chapter.chapterNumber,
      chapterTitle: chapter.title,
      amharicChapterTitle: chapter.amharicTitle,
      subjectId: chapter.subject.id,
      subjectName: chapter.subject.name,
      amharicSubjectName: chapter.subject.amharicName,
      gradeId: chapter.subject.grade.id,
      gradeLevel: chapter.subject.grade.level,
      gradeName: chapter.subject.grade.name,
      amharicGradeName: chapter.subject.grade.amharicName,
      version: newVersion,
      publishedAt,
      textbook: textbookAsset,
      quizzes: offlineQuizzes,
      references: offlineReferences,
      totalSizeBytes,
    };

    // Calculate deterministic SHA256 checksum of manifest content
    const manifestChecksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(manifestPayload))
      .digest('hex');

    const manifest: LearningPackageManifest = {
      ...manifestPayload,
      checksumSha256: manifestChecksum,
    };

    // Persist published changes in a transaction
    await prisma.$transaction([
      prisma.chapter.update({
        where: { id: chapterId },
        data: {
          isPublished: true,
          version: newVersion,
        },
      }),
      prisma.quiz.updateMany({
        where: { chapterId },
        data: { isPublished: true, version: newVersion },
      }),
      prisma.learningPackage.upsert({
        where: {
          chapterId_version: { chapterId, version: newVersion },
        },
        create: {
          chapterId,
          version: newVersion,
          status: PackageStatus.PUBLISHED,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          manifestJson: manifest as any,
          checksumSha256: manifestChecksum,
          packageSizeBytes: totalSizeBytes,
          publishedAt: new Date(publishedAt),
        },
        update: {
          status: PackageStatus.PUBLISHED,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          manifestJson: manifest as any,
          checksumSha256: manifestChecksum,
          packageSizeBytes: totalSizeBytes,
          publishedAt: new Date(publishedAt),
        },
      }),
      ...(adminUserId
        ? [
            prisma.auditLog.create({
              data: {
                userId: adminUserId,
                action: 'CHAPTER_PUBLISHED',
                entity: 'CHAPTER',
                entityId: chapterId,
                details: {
                  version: newVersion,
                  packageId: manifest.packageId,
                  totalSizeBytes,
                },
              },
            }),
          ]
        : []),
    ]);

    return manifest;
  }

  async unpublishChapter(chapterId: string, adminUserId?: string) {
    await this.getChapterById(chapterId);

    await prisma.$transaction([
      prisma.chapter.update({
        where: { id: chapterId },
        data: { isPublished: false },
      }),
      prisma.learningPackage.updateMany({
        where: { chapterId },
        data: { status: PackageStatus.ARCHIVED },
      }),
      ...(adminUserId
        ? [
            prisma.auditLog.create({
              data: {
                userId: adminUserId,
                action: 'CHAPTER_UNPUBLISHED',
                entity: 'CHAPTER',
                entityId: chapterId,
              },
            }),
          ]
        : []),
    ]);

    return { chapterId, isPublished: false };
  }

  // ==========================================
  // STUDENT DISCOVERY & PACKAGE MANIFEST
  // ==========================================

  async getPublishedCurriculum() {
    const grades = await prisma.grade.findMany({
      orderBy: [{ level: 'asc' }, { orderIndex: 'asc' }],
      include: {
        subjects: {
          orderBy: { orderIndex: 'asc' },
          include: {
            chapters: {
              where: { isPublished: true },
              orderBy: { chapterNumber: 'asc' },
              select: {
                id: true,
                chapterNumber: true,
                title: true,
                amharicTitle: true,
                version: true,
                isPublished: true,
                _count: {
                  select: { practiceQuestions: { where: { status: 'APPROVED' } } },
                },
                packages: {
                  where: { status: PackageStatus.PUBLISHED },
                  orderBy: { version: 'desc' },
                  take: 1,
                  select: {
                    packageSizeBytes: true,
                    checksumSha256: true,
                    version: true,
                    publishedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Expose the approved practice question count so clients can show a Practice shortcut
    return grades.map((g) => ({
      ...g,
      subjects: g.subjects.map((sub) => ({
        ...sub,
        chapters: sub.chapters.map(({ _count, ...ch }) => ({
          ...ch,
          practiceQuestionCount: _count.practiceQuestions,
        })),
      })),
    }));
  }

  async getLearningPackageManifest(chapterId: string): Promise<LearningPackageManifest> {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        textbook: true,
        subject: { include: { grade: true } },
        packages: {
          where: { status: PackageStatus.PUBLISHED },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!chapter || !chapter.isPublished || chapter.packages.length === 0) {
      throw new AppError(404, 'PACKAGE_NOT_FOUND', 'Learning package not found or not published');
    }

    const latestPkg = chapter.packages[0]!;
    const manifest = JSON.parse(JSON.stringify(latestPkg.manifestJson)) as LearningPackageManifest;

    // Packages published before these fields existed would otherwise miss grade/subject details,
    // which clients need for the enrollment check and titles
    const { subject } = chapter;
    manifest.chapterId = chapter.id;
    manifest.chapterNumber = chapter.chapterNumber;
    manifest.chapterTitle = chapter.title;
    manifest.amharicChapterTitle = chapter.amharicTitle;
    manifest.subjectId = subject.id;
    manifest.subjectName = subject.name;
    manifest.amharicSubjectName = subject.amharicName;
    manifest.gradeId = subject.grade.id;
    manifest.gradeLevel = subject.grade.level;
    manifest.gradeName = subject.grade.name;
    manifest.amharicGradeName = subject.grade.amharicName;

    // Ensure student viewer and download manager have access to the isolated chapter PDF
    if (manifest.textbook) {
      manifest.textbook.chapterPdfUrl = `/api/chapters/${chapterId}/pdf`;
    }

    return manifest;
  }

  // ==========================================
  // CHAPTER PDF EXTRACTION & CACHING
  // ==========================================

  resolveLocalPdfPath(fileUrl: string): string | null {
    if (!fileUrl) return null;
    if (fileUrl.includes('/uploads/')) {
      const rel = fileUrl.substring(fileUrl.indexOf('/uploads/'));
      const fullPath = path.resolve(process.cwd(), '.' + rel);
      if (fs.existsSync(fullPath)) return fullPath;
    }
    const fallbackPath = path.resolve(process.cwd(), 'uploads/textbooks', path.basename(fileUrl));
    if (fs.existsSync(fallbackPath)) return fallbackPath;
    return null;
  }

  invalidateChapterPdfCache(chapterId: string): void {
    try {
      const cacheDir = path.resolve(process.cwd(), 'uploads/cache/chapters');
      if (!fs.existsSync(cacheDir)) return;
      const files = fs.readdirSync(cacheDir);
      for (const file of files) {
        if (file.startsWith(`${chapterId}-`)) {
          fs.unlinkSync(path.join(cacheDir, file));
        }
      }
    } catch (err) {
      console.warn('Failed to invalidate chapter PDF cache:', err);
    }
  }

  async getChapterIsolatedPdf(chapterId: string): Promise<{
    filePath: string;
    fileName: string;
    fileSize: number;
    totalPages: number;
    checksumSha256: string;
  }> {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        textbook: true,
        subject: true,
      },
    });

    if (!chapter) {
      throw new AppError(404, 'NOT_FOUND', 'Chapter not found');
    }

    // Resolve master textbook file URL
    const masterUrl = chapter.textbook?.fileUrl || chapter.subject?.textbookUrl;
    if (!masterUrl) {
      throw new AppError(404, 'TEXTBOOK_NOT_FOUND', 'No master textbook PDF attached to this chapter or subject');
    }

    const startPage = chapter.textbook?.startPage ?? 1;
    const endPage = chapter.textbook?.endPage ?? (chapter.subject?.textbookTotalPages || 20);

    const masterPath = this.resolveLocalPdfPath(masterUrl);
    if (!masterPath || !fs.existsSync(masterPath)) {
      throw new AppError(404, 'MASTER_PDF_NOT_FOUND', `Master textbook file not found on disk for ${masterUrl}`);
    }

    const cacheDir = path.resolve(process.cwd(), 'uploads/cache/chapters');
    fs.mkdirSync(cacheDir, { recursive: true });

    const cacheFileName = `${chapter.id}-v${chapter.version}-p${startPage}-p${endPage}.pdf`;
    const cacheFilePath = path.join(cacheDir, cacheFileName);

    // Return cached PDF if it exists and is valid
    if (fs.existsSync(cacheFilePath)) {
      const stats = fs.statSync(cacheFilePath);
      if (stats.size > 0) {
        const fileBuffer = fs.readFileSync(cacheFilePath);
        const checksumSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const totalPages = Math.max(1, endPage - startPage + 1);
        return {
          filePath: cacheFilePath,
          fileName: `${chapter.title.replace(/[^a-zA-Z0-9.-]/g, '_')}-p${startPage}-p${endPage}.pdf`,
          fileSize: stats.size,
          totalPages,
          checksumSha256,
        };
      }
    }

    // Extract pages using pdf-lib
    const masterBytes = fs.readFileSync(masterPath);
    const masterDoc = await PDFDocument.load(masterBytes, { ignoreEncryption: true });
    const masterTotal = masterDoc.getPageCount();

    const validStart = Math.max(1, Math.min(startPage, masterTotal));
    const validEnd = Math.max(validStart, Math.min(endPage, masterTotal));
    const expectedCount = validEnd - validStart + 1;

    const chapterDoc = await PDFDocument.create();
    const pageIndices: number[] = [];
    for (let p = validStart; p <= validEnd; p++) {
      pageIndices.push(p - 1);
    }

    const copiedPages = await chapterDoc.copyPages(masterDoc, pageIndices);
    copiedPages.forEach((page) => chapterDoc.addPage(page));

    const chapterBytes = await chapterDoc.save();
    fs.writeFileSync(cacheFilePath, chapterBytes);

    const stats = fs.statSync(cacheFilePath);
    const checksumSha256 = crypto.createHash('sha256').update(chapterBytes).digest('hex');

    return {
      filePath: cacheFilePath,
      fileName: `${chapter.title.replace(/[^a-zA-Z0-9.-]/g, '_')}-p${validStart}-p${validEnd}.pdf`,
      fileSize: stats.size,
      totalPages: expectedCount,
      checksumSha256,
    };
  }

  async getApprovedChapterPracticeQuestions(chapterId: string) {
    const questions = await prisma.practiceQuestion.findMany({
      where: {
        chapterId,
        status: 'APPROVED',
      },
      orderBy: { orderIndex: 'asc' },
      include: {
        choices: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return questions.map((q) => ({
      id: q.id,
      chapterId: q.chapterId,
      questionType: q.questionType,
      prompt: q.prompt,
      amharicPrompt: q.amharicPrompt,
      orderIndex: q.orderIndex,
      hasAnswer: q.hasAnswer,
      answerText: q.answerText,
      amharicAnswerText: q.amharicAnswerText,
      explanation: q.explanation,
      amharicExplanation: q.amharicExplanation,
      status: q.status,
      choices: q.choices.map((c) => ({
        id: c.id,
        text: c.text,
        amharicText: c.amharicText,
        orderIndex: c.orderIndex,
        isCorrect: c.isCorrect,
      })),
    }));
  }
}

export const curriculumService = new CurriculumService();
