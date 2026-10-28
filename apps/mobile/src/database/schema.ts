export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS packages (
  chapterId TEXT PRIMARY KEY,
  subjectId TEXT NOT NULL,
  gradeId TEXT NOT NULL,
  title TEXT NOT NULL,
  version INTEGER NOT NULL,
  manifestJson TEXT NOT NULL,
  localPdfUri TEXT,
  downloadStatus TEXT NOT NULL,
  downloadedAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  clientAttemptUuid TEXT PRIMARY KEY,
  quizId TEXT NOT NULL,
  chapterId TEXT NOT NULL,
  score INTEGER NOT NULL,
  maxScore INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  answersJson TEXT NOT NULL,
  startedAt TEXT NOT NULL,
  completedAt TEXT NOT NULL,
  syncState TEXT NOT NULL,
  syncedAt TEXT
);

CREATE TABLE IF NOT EXISTS student_progress (
  chapterId TEXT PRIMARY KEY,
  lastReadPage INTEGER NOT NULL DEFAULT 1,
  isCompleted INTEGER NOT NULL DEFAULT 0,
  timeSpentSeconds INTEGER NOT NULL DEFAULT 0,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_session (
  id TEXT PRIMARY KEY DEFAULT 'current_session',
  studentId TEXT NOT NULL,
  email TEXT NOT NULL,
  fullName TEXT NOT NULL,
  role TEXT NOT NULL,
  accessToken TEXT NOT NULL,
  refreshToken TEXT NOT NULL,
  cachedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reference_files (
  id TEXT PRIMARY KEY,
  chapterId TEXT NOT NULL,
  title TEXT NOT NULL,
  localUri TEXT,
  checksum TEXT,
  fileSize INTEGER,
  FOREIGN KEY(chapterId) REFERENCES packages(chapterId) ON DELETE CASCADE
);
`;
