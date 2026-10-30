/**
 * Shared Type Definitions for EOTC Learning Platform
 */

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface UserProfile {
  id: string;
  /** Optional for students, who can sign in with a username instead */
  email: string | null;
  username?: string | null;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  age?: number | null;
  address?: string | null;
  baptismalName?: string | null;
  phoneNumber?: string | null;
  churchParish?: string | null;
  parishId?: string | null;
  enrolledGradeIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ParishDto {
  id: string;
  name: string;
  amharicName: string;
  diocese: string;
  subCity?: string | null;
  woreda?: string | null;
  city?: string;
  sundaySchoolName?: string | null;
  parishType?: string;
  isVerified: boolean;
  studentCount?: number;
  teacherCount?: number;
}

export type PackageDownloadStatus =
  | 'NOT_DOWNLOADED'
  | 'DOWNLOADING'
  | 'PARTIALLY_DOWNLOADED'
  | 'AVAILABLE_OFFLINE'
  | 'FAILED'
  | 'UPDATE_AVAILABLE';

export type SyncState = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface TextbookAsset {
  id: string;
  title: string;
  fileUrl: string;
  fileSize: number;
  checksumSha256: string;
  mimeType: string;
  startPage: number;
  endPage: number;
  totalPages: number;
  localFilePath?: string;
  chapterPdfUrl?: string;
  sourceTextbookId?: string;
}

export interface OfflineChoice {
  id: string;
  text: string;
  amharicText?: string | null;
  orderIndex: number;
  // Included in offline practice quiz packages for instant local evaluation
  isCorrect?: boolean;
}

export interface OfflineQuestion {
  id: string;
  prompt: string;
  amharicPrompt?: string | null;
  orderIndex: number;
  points: number;
  explanation?: string | null;
  amharicExplanation?: string | null;
  choices: OfflineChoice[];
}

export interface OfflineQuiz {
  id: string;
  title: string;
  amharicTitle?: string | null;
  description?: string | null;
  timeLimitMinutes?: number | null;
  passingScore: number;
  isPractice: boolean;
  version: number;
  questions: OfflineQuestion[];
}

export interface OfflineReference {
  id: string;
  title: string;
  amharicTitle?: string | null;
  url: string;
  isDownloadable: boolean;
  downloadableDocUrl?: string | null;
  downloadableDocSize?: number | null;
  downloadableDocChecksum?: string | null;
  localFilePath?: string;
}

export interface LearningPackageManifest {
  packageId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  amharicChapterTitle?: string | null;
  subjectId: string;
  subjectName: string;
  amharicSubjectName?: string | null;
  gradeId?: string;
  gradeLevel: number;
  gradeName: string;
  amharicGradeName?: string | null;
  version: number;
  publishedAt: string;
  checksumSha256: string;
  totalSizeBytes: number;
  textbook: TextbookAsset;
  quizzes: OfflineQuiz[];
  references: OfflineReference[];
}

export interface QuizAttemptAnswerItem {
  questionId: string;
  selectedChoiceId: string;
  isCorrect?: boolean;
  pointsEarned?: number;
}

export interface OfflineQuizAttempt {
  clientAttemptUuid: string;
  quizId: string;
  quizVersion: number;
  userId: string;
  startedAt: string;
  completedAt: string;
  score: number;
  maxScore: number;
  passed: boolean;
  clientDevice: string;
  isOffline: boolean;
  answers: QuizAttemptAnswerItem[];
  syncState: SyncState;
  syncedAt?: string | null;
  syncError?: string | null;
}

export interface StudentProgressUpdate {
  chapterId: string;
  isCompleted: boolean;
  lastReadPage: number;
  lastStudiedAt: string;
  syncState?: 'PENDING' | 'SYNCED' | 'FAILED';
  syncedAt?: string | null;
}

export type NotificationTargetType = 'BROADCAST' | 'BY_GRADE' | 'BY_ROLE';

export interface NotificationItem {
  id: string;
  title: string;
  amharicTitle?: string | null;
  content: string;
  amharicContent?: string | null;
  targetType: NotificationTargetType;
  targetGradeId?: string | null;
  targetGradeName?: string | null;
  targetRole?: UserRole | null;
  linkUrl?: string | null;
  senderId?: string | null;
  senderName?: string | null;
  createdAt: string;
  isRead?: boolean;
  readAt?: string | null;
}

export interface StudentEnrollmentItem {
  id: string;
  gradeId: string;
  gradeLevel: number;
  gradeName: string;
  amharicGradeName?: string | null;
  enrolledAt: string;
}

export type TicketCategory = 'CURRICULUM' | 'TECHNICAL_OFFLINE' | 'ACCOUNT_ENROLLMENT' | 'GENERAL';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TicketMessageItem {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  createdAt: string;
}

export interface SupportTicketItem {
  id: string;
  ticketNumber: number;
  userId: string;
  userName: string;
  userEmail: string;
  churchParish?: string | null;
  phoneNumber?: string | null;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messagesCount: number;
  lastMessageSnippet?: string | null;
  messages?: TicketMessageItem[];
}

export interface AdminStudentProgressChapter {
  chapterId: string;
  chapterNumber: number;
  title: string;
  amharicTitle?: string | null;
  subjectTitle: string;
  isCompleted: boolean;
  lastReadPage: number;
  lastStudiedAt?: string | null;
}

export interface AdminStudentQuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  score: number;
  maxScore: number;
  passed: boolean;
  attemptedAt: string;
}

export interface AdminStudentListItem {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  age?: number | null;
  address?: string | null;
  baptismalName?: string | null;
  phoneNumber?: string | null;
  churchParish?: string | null;
  parishId?: string | null;
  parish?: ParishDto | null;
  enrolledGrades: { id: string; gradeLevel: number; gradeName: string; amharicName?: string | null }[];
  totalChaptersCompleted: number;
  totalChaptersAvailable: number;
  progressPercent: number;
  lastActiveAt?: string | null;
  createdAt: string;
}

export interface AdminStudentDetails extends AdminStudentListItem {
  chaptersProgress: AdminStudentProgressChapter[];
  quizAttempts: AdminStudentQuizAttempt[];
}

export type ModerationStatus = 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface PracticeChoiceDto {
  id?: string;
  text: string;
  amharicText?: string | null;
  orderIndex: number;
  isCorrect?: boolean;
}

export interface PracticeQuestionDto {
  id: string;
  chapterId: string;
  questionType: QuestionType;
  prompt: string;
  amharicPrompt?: string | null;
  orderIndex: number;
  hasAnswer: boolean;
  answerText?: string | null;
  amharicAnswerText?: string | null;
  correctChoiceId?: string | null;
  explanation?: string | null;
  amharicExplanation?: string | null;
  status: ModerationStatus;
  rejectionReason?: string | null;
  createdById: string;
  creatorName?: string;
  churchParish?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  choices?: PracticeChoiceDto[];
  chapter?: {
    id?: string;
    title?: string;
    amharicTitle?: string | null;
    chapterNumber?: number;
  };
  createdBy?: {
    id?: string;
    fullName?: string;
    email?: string;
    churchParish?: string | null;
  };
}

export interface ModeratedReferenceDto {
  id: string;
  chapterId: string;
  chapterTitle?: string;
  gradeLevel?: number;
  title: string;
  amharicTitle?: string | null;
  url: string;
  isDownloadable: boolean;
  downloadableDocUrl?: string | null;
  downloadableDocSize?: number | null;
  status: ModerationStatus;
  createdById?: string | null;
  creatorName?: string;
  churchParish?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  chapter?: {
    id?: string;
    title?: string;
    amharicTitle?: string | null;
    chapterNumber?: number;
  };
  createdBy?: {
    id?: string;
    fullName?: string;
    email?: string;
    churchParish?: string | null;
  };
}

export interface TeacherParishOverviewDto {
  churchParish: string;
  totalStudents: number;
  activeStudents: number;
  completedChaptersCount: number;
  pendingSubmissionsCount: number;
  approvedSubmissionsCount: number;
  recentStudents: AdminStudentListItem[];
}


