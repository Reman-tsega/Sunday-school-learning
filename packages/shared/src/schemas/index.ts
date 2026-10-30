import { z } from 'zod';

export const UserRoleSchema = z.enum(['ADMIN', 'TEACHER', 'STUDENT']);

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  role: UserRoleSchema,
});

export const UpdateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const UpdateUserRoleSchema = z.object({
  role: UserRoleSchema,
});

export const ResetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const UserQuerySchema = z.object({
  role: UserRoleSchema.optional(),
  isActive: z.preprocess((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean().optional()),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  churchParish: z.string().optional(),
  parishId: z.string().optional(),
  diocese: z.string().optional(),
  subCity: z.string().optional(),
});

export const CreateGradeSchema = z.object({
  level: z.number().int().min(1).max(12),
  name: z.string().min(1, 'Grade name is required'),
  amharicName: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  orderIndex: z.number().int().nonnegative().default(0),
});

export const UpdateGradeSchema = CreateGradeSchema.partial();

export const CreateSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  amharicName: z.string().nullable().optional(),
  code: z.string().min(1, 'Subject code is required'),
  description: z.string().nullable().optional(),
  iconUrl: z.string().url().nullable().optional(),
  orderIndex: z.number().int().nonnegative().default(0),
  textbookUrl: z.string().nullable().optional(),
  textbookFileKey: z.string().nullable().optional(),
  textbookFileName: z.string().nullable().optional(),
  textbookFileSize: z.number().int().nonnegative().nullable().optional(),
  textbookChecksumSha256: z.string().nullable().optional(),
  textbookTotalPages: z.number().int().positive().nullable().optional(),
});

export const UpdateSubjectSchema = CreateSubjectSchema.partial();

export const CreateChapterSchema = z.object({
  chapterNumber: z.number().int().positive('Chapter number must be positive'),
  title: z.string().min(1, 'Title is required'),
  amharicTitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  orderIndex: z.number().int().nonnegative().default(0),
});

export const UpdateChapterSchema = CreateChapterSchema.partial();

export const UpsertTextbookSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    fileUrl: z.string().min(1, 'File URL is required'),
    fileKey: z.string().optional(),
    fileSize: z.number().int().positive('File size must be positive'),
    checksumSha256: z.string().min(1, 'Checksum is required'),
    mimeType: z.string().default('application/pdf'),
    startPage: z.number().int().positive('Start page must be >= 1'),
    endPage: z.number().int().positive('End page must be >= 1'),
    totalPages: z.number().int().positive('Total pages must be >= 1'),
  })
  .refine((data) => data.startPage <= data.endPage, {
    message: 'startPage must be less than or equal to endPage',
    path: ['startPage'],
  })
  .refine((data) => data.endPage <= data.totalPages, {
    message: 'endPage must be less than or equal to totalPages',
    path: ['endPage'],
  });

export const CreateQuizSchema = z.object({
  title: z.string().min(1, 'Quiz title is required'),
  amharicTitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  timeLimitMinutes: z.number().int().positive().nullable().optional(),
  passingScore: z.number().int().min(0).max(100).default(70),
  isPractice: z.boolean().default(true),
});

export const UpdateQuizSchema = CreateQuizSchema.partial();

export const CreateQuestionChoiceSchema = z.object({
  text: z.string().min(1, 'Choice text is required'),
  amharicText: z.string().nullable().optional(),
  orderIndex: z.number().int().nonnegative().default(0),
  isCorrect: z.boolean().default(false),
});

export const CreateQuestionSchema = z
  .object({
    prompt: z.string().min(1, 'Prompt is required'),
    amharicPrompt: z.string().nullable().optional(),
    orderIndex: z.number().int().nonnegative().default(0),
    points: z.number().int().positive().default(1),
    explanation: z.string().nullable().optional(),
    amharicExplanation: z.string().nullable().optional(),
    choices: z.array(CreateQuestionChoiceSchema).min(2, 'At least 2 choices required'),
  })
  .refine((data) => data.choices.some((c) => c.isCorrect), {
    message: 'At least one choice must be marked as correct',
    path: ['choices'],
  });

export const CreateReferenceLinkSchema = z.object({
  title: z.string().min(1, 'Reference title is required'),
  amharicTitle: z.string().nullable().optional(),
  url: z.string().url('URL must be a valid URL'),
  isDownloadable: z.boolean().default(false),
  downloadableDocUrl: z.string().url().nullable().optional(),
  downloadableDocSize: z.number().int().nonnegative().nullable().optional(),
  downloadableDocChecksum: z.string().nullable().optional(),
  orderIndex: z.number().int().nonnegative().default(0),
});

export const TextbookAssetSchema = z.object({
  id: z.string(),
  title: z.string(),
  fileUrl: z.string(),
  fileSize: z.number().int().nonnegative(),
  checksumSha256: z.string(),
  mimeType: z.string(),
  startPage: z.number().int().positive(),
  endPage: z.number().int().positive(),
  totalPages: z.number().int().positive(),
  chapterPdfUrl: z.string().optional(),
  sourceTextbookId: z.string().optional(),
  localFilePath: z.string().optional(),
});

export const OfflineChoiceSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  amharicText: z.string().nullable().optional(),
  orderIndex: z.number().int().nonnegative(),
  isCorrect: z.boolean().optional(),
});

export const OfflineQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string().min(1),
  amharicPrompt: z.string().nullable().optional(),
  orderIndex: z.number().int().nonnegative(),
  points: z.number().int().positive().default(1),
  explanation: z.string().nullable().optional(),
  amharicExplanation: z.string().nullable().optional(),
  choices: z.array(OfflineChoiceSchema).min(2),
});

export const OfflineQuizSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  amharicTitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  timeLimitMinutes: z.number().int().positive().nullable().optional(),
  passingScore: z.number().int().nonnegative(),
  isPractice: z.boolean().default(true),
  version: z.number().int().positive(),
  questions: z.array(OfflineQuestionSchema),
});

export const OfflineReferenceSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  amharicTitle: z.string().nullable().optional(),
  url: z.string().url(),
  isDownloadable: z.boolean(),
  downloadableDocUrl: z.string().url().nullable().optional(),
  downloadableDocSize: z.number().int().nonnegative().nullable().optional(),
  downloadableDocChecksum: z.string().nullable().optional(),
  localFilePath: z.string().optional(),
});

export const LearningPackageManifestSchema = z.object({
  packageId: z.string(),
  chapterId: z.string(),
  chapterNumber: z.number().int().positive(),
  chapterTitle: z.string(),
  amharicChapterTitle: z.string().nullable().optional(),
  subjectId: z.string(),
  subjectName: z.string(),
  amharicSubjectName: z.string().nullable().optional(),
  gradeLevel: z.number().int().positive(),
  gradeName: z.string(),
  version: z.number().int().positive(),
  publishedAt: z.string().datetime(),
  checksumSha256: z.string(),
  totalSizeBytes: z.number().int().nonnegative(),
  textbook: TextbookAssetSchema,
  quizzes: z.array(OfflineQuizSchema),
  references: z.array(OfflineReferenceSchema),
});

export const QuizAttemptAnswerItemSchema = z.object({
  questionId: z.string(),
  selectedChoiceId: z.string(),
  isCorrect: z.boolean().optional(),
  pointsEarned: z.number().optional(),
});

export const SyncQuizAttemptItemSchema = z.object({
  clientAttemptUuid: z.string().uuid('clientAttemptUuid must be a valid UUID'),
  quizId: z.string(),
  quizVersion: z.number().int().positive(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  score: z.number().int().nonnegative(),
  maxScore: z.number().int().positive(),
  passed: z.boolean(),
  clientDevice: z.string().default('unknown'),
  isOffline: z.boolean().default(true),
  answers: z.array(QuizAttemptAnswerItemSchema),
});

export const BatchSyncRequestSchema = z.object({
  attempts: z.array(SyncQuizAttemptItemSchema).max(50),
  progress: z.array(
    z.object({
      chapterId: z.string(),
      isCompleted: z.boolean(),
      lastReadPage: z.number().int().positive(),
      lastStudiedAt: z.string().datetime(),
    })
  ).max(50),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().min(2, 'Full name is required'),
  role: UserRoleSchema.default('STUDENT'),
  age: z.coerce.number().int().min(3, 'Age must be at least 3').max(120).optional().nullable(),
  address: z.string().optional().nullable(),
  baptismalName: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  churchParish: z.string().optional().nullable(),
  parishId: z.string().uuid().optional().nullable(),
  gradeIds: z.array(z.string()).optional(),
});

export const CreateNotificationSchema = z.object({
  title: z.string().min(1, 'Notification title is required'),
  amharicTitle: z.string().optional().nullable(),
  content: z.string().min(1, 'Notification content is required'),
  amharicContent: z.string().optional().nullable(),
  targetType: z.enum(['BROADCAST', 'BY_GRADE', 'BY_ROLE']).default('BROADCAST'),
  targetGradeId: z.string().optional().nullable(),
  targetRole: UserRoleSchema.optional().nullable(),
});

export const EnrollGradesRequestSchema = z.object({
  gradeIds: z.array(z.string()).min(1, 'Select at least one grade to enroll'),
});

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name is required').optional(),
  age: z.coerce.number().int().min(3, 'Age must be at least 3').max(120).optional().nullable(),
  address: z.string().optional().nullable(),
  baptismalName: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  churchParish: z.string().optional().nullable(),
  parishId: z.string().uuid().optional().nullable(),
});

export const TicketCategorySchema = z.enum([
  'CURRICULUM',
  'TECHNICAL_OFFLINE',
  'ACCOUNT_ENROLLMENT',
  'GENERAL',
]);

export const TicketStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
]);

export const CreateSupportTicketSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters long'),
  category: TicketCategorySchema.default('GENERAL'),
  message: z.string().min(5, 'Message must be at least 5 characters long'),
});

export const CreateTicketMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
});

export const UpdateTicketStatusSchema = z.object({
  status: TicketStatusSchema,
});

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long').max(128),
  // Lets the server keep this device signed in while revoking the others
  refreshToken: z.string().max(256).optional(),
});

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(32, 'Invalid reset token').max(256),
  password: z.string().min(8, 'Password must be at least 8 characters long').max(128),
});

export type RegisterRequestInput = z.input<typeof RegisterRequestSchema>;
export type CreateNotificationInput = z.input<typeof CreateNotificationSchema>;
export type EnrollGradesRequestInput = z.input<typeof EnrollGradesRequestSchema>;
export type UpdateProfileInput = z.input<typeof UpdateProfileSchema>;
export type CreateSupportTicketInput = z.input<typeof CreateSupportTicketSchema>;
export type CreateTicketMessageInput = z.input<typeof CreateTicketMessageSchema>;
export type UpdateTicketStatusInput = z.input<typeof UpdateTicketStatusSchema>;

export const ModerationStatusSchema = z.enum(['APPROVED', 'PENDING_REVIEW', 'REJECTED']);
export const QuestionTypeSchema = z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']);

export const CreatePracticeChoiceSchema = z.object({
  text: z.string().min(1, 'Choice text is required'),
  amharicText: z.string().nullable().optional(),
  orderIndex: z.number().int().default(0),
  isCorrect: z.boolean().default(false),
});

export const CreatePracticeQuestionSchema = z.object({
  chapterId: z.string().uuid(),
  questionType: QuestionTypeSchema.default('MULTIPLE_CHOICE'),
  prompt: z.string().min(3, 'Question prompt is required'),
  amharicPrompt: z.string().nullable().optional(),
  orderIndex: z.number().int().default(0),
  hasAnswer: z.boolean().default(true),
  answerText: z.string().nullable().optional(),
  amharicAnswerText: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  amharicExplanation: z.string().nullable().optional(),
  choices: z.array(CreatePracticeChoiceSchema).optional(),
});

export const SubmitPracticeQuestionBatchSchema = z.object({
  chapterId: z.string().uuid(),
  questions: z
    .array(CreatePracticeQuestionSchema.omit({ chapterId: true }))
    .min(1, 'Add at least one question')
    .max(100),
});

export const ReviewMaterialSchema = z.object({
  action: z.enum(['APPROVE', 'DECLINE']),
  rejectionReason: z.string().optional(),
});

export const AssignTeacherParishSchema = z.object({
  churchParish: z.string().min(2, 'Sunday School parish name is required'),
  parishId: z.string().uuid().optional().nullable(),
});

export const CreateParishSchema = z.object({
  name: z.string().min(2, 'Parish name is required'),
  amharicName: z.string().min(2, 'Amharic name is required'),
  diocese: z.string().min(2, 'Diocese is required'),
  subCity: z.string().optional().nullable(),
  woreda: z.string().optional().nullable(),
  city: z.string().default('Addis Ababa'),
  sundaySchoolName: z.string().optional().nullable(),
  parishType: z.string().default('DEBRE'),
  isVerified: z.boolean().default(true),
  suggestedBy: z.string().optional().nullable(),
});

export const ParishQuerySchema = z.object({
  search: z.string().optional(),
  diocese: z.string().optional(),
  subCity: z.string().optional(),
  isVerified: z.preprocess((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean().optional()),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
});

export const UpdateParishSchema = CreateParishSchema.partial();

export type SubmitPracticeQuestionBatchInput = z.infer<typeof SubmitPracticeQuestionBatchSchema>;
export type CreatePracticeQuestionInput = z.infer<typeof CreatePracticeQuestionSchema>;
export type ReviewMaterialInput = z.infer<typeof ReviewMaterialSchema>;
export type AssignTeacherParishInput = z.infer<typeof AssignTeacherParishSchema>;
export type CreateParishInput = z.infer<typeof CreateParishSchema>;
export type UpdateParishInput = z.infer<typeof UpdateParishSchema>;
export type ParishQueryInput = z.infer<typeof ParishQuerySchema>;


