import {
  getCachedAuthSession,
  cacheAuthSession,
  getOfflinePackage,
  getAllOfflinePackages,
} from '@/lib/offline-db';
import type {
  AuthResponseData,
  LearningPackageManifest,
  UserProfile,
  NotificationItem,
  StudentEnrollmentItem,
  RegisterRequestInput,
  CreateNotificationInput,
  UpdateProfileInput,
  AdminStudentListItem,
  AdminStudentDetails,
  SupportTicketItem,
  TicketMessageItem,
  CreateSupportTicketInput,
  TicketStatus,
  TicketCategory,
} from '@eotc/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiClient {
  private token: string | null = null;
  private user: UserProfile | null = null;
  private listeners: Array<(user: UserProfile | null) => void> = [];

  onAuthChange(callback: (user: UserProfile | null) => void): () => void {
    this.listeners.push(callback);
    // Call immediately with current state
    callback(this.user);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyAuthChange(user: UserProfile | null) {
    this.listeners.forEach((cb) => {
      try {
        cb(user);
      } catch (err) {
        console.error('Error in auth change listener:', err);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eotc:auth-change', { detail: user }));
    }
  }

  async init(): Promise<UserProfile | null> {
    if (typeof window !== 'undefined') {
      // First check synchronous localStorage for instant availability
      const localToken = localStorage.getItem('eotc_auth_token');
      const localUserStr = localStorage.getItem('eotc_user');
      if (localToken && localUserStr) {
        this.token = localToken;
        try {
          this.user = JSON.parse(localUserStr);
        } catch {
          // ignore invalid json
        }
      }

      // Then verify / refresh with IndexedDB offline session
      const cached = await getCachedAuthSession();
      if (cached) {
        this.token = cached.accessToken;
        this.user = cached.user;
        localStorage.setItem('eotc_auth_token', cached.accessToken);
        localStorage.setItem('eotc_refresh_token', cached.refreshToken);
        localStorage.setItem('eotc_user', JSON.stringify(cached.user));
        this.notifyAuthChange(this.user);
      } else if (!localToken) {
        this.token = null;
        this.user = null;
        this.notifyAuthChange(null);
      } else {
        this.notifyAuthChange(this.user);
      }
    }
    return this.user;
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('eotc_auth_token');
    }
    return this.token;
  }

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('eotc_refresh_token');
    }
    return null;
  }

  getUser(): UserProfile | null {
    if (!this.user && typeof window !== 'undefined') {
      const raw = localStorage.getItem('eotc_user');
      if (raw) {
        try {
          this.user = JSON.parse(raw);
        } catch {
          // ignore
        }
      }
    }
    return this.user;
  }

  async handleSessionExpired(reason: string = 'session_expired'): Promise<void> {
    console.warn(`[Auth] User session expired (${reason}). Forcing immediate logout.`);
    this.token = null;
    this.user = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('eotc_auth_token');
      localStorage.removeItem('eotc_refresh_token');
      localStorage.removeItem('eotc_user');

      try {
        const { clearCachedAuthSession } = await import('@/lib/offline-db');
        await clearCachedAuthSession();
      } catch (err) {
        console.warn('Failed to clear cached auth session on expiration:', err);
      }

      this.notifyAuthChange(null);

      // Force navigate user to login page immediately, avoiding trapped expired state
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/login')) {
        window.location.href = `/login?reason=${encodeURIComponent(reason)}`;
      }
    } else {
      this.notifyAuthChange(null);
    }
  }

  async refreshSession(): Promise<string | null> {
    let refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      try {
        const cached = await getCachedAuthSession();
        if (cached?.refreshToken) {
          refreshToken = cached.refreshToken;
        }
      } catch {
        // ignore
      }
    }

    if (!refreshToken) {
      if (this.user || this.token) {
        await this.handleSessionExpired('session_expired');
      }
      return null;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        await this.handleSessionExpired('session_expired');
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json: any = await res.json();
      const newTokens = json.data?.tokens;
      if (newTokens?.accessToken) {
        this.token = newTokens.accessToken;
        if (typeof window !== 'undefined') {
          localStorage.setItem('eotc_auth_token', newTokens.accessToken);
          if (newTokens.refreshToken) {
            localStorage.setItem('eotc_refresh_token', newTokens.refreshToken);
          }
        }
        const currentUser = this.user || this.getUser();
        if (currentUser) {
          await cacheAuthSession({
            user: currentUser,
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken || refreshToken,
            cachedAt: new Date().toISOString(),
          });
        }
        return newTokens.accessToken;
      }

      await this.handleSessionExpired('session_expired');
      return null;
    } catch (err) {
      console.warn('Silent refresh error:', err);
      return null;
    }
  }

  async login(email: string, password: string): Promise<AuthResponseData> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errData: any = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Login failed');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const authData: AuthResponseData = data.data;

    this.token = authData.tokens.accessToken;
    this.user = authData.user;

    if (typeof window !== 'undefined') {
      localStorage.setItem('eotc_auth_token', authData.tokens.accessToken);
      localStorage.setItem('eotc_refresh_token', authData.tokens.refreshToken);
      localStorage.setItem('eotc_user', JSON.stringify(authData.user));
    }

    // Cache session in IndexedDB for offline restart
    await cacheAuthSession({
      user: authData.user,
      accessToken: authData.tokens.accessToken,
      refreshToken: authData.tokens.refreshToken,
      cachedAt: new Date().toISOString(),
    });

    this.notifyAuthChange(this.user);

    return authData;
  }

  async register(data: RegisterRequestInput): Promise<AuthResponseData> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errData: any = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Registration failed');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resJson: any = await res.json();
    const authData: AuthResponseData = resJson.data;

    this.token = authData.tokens.accessToken;
    this.user = authData.user;

    if (typeof window !== 'undefined') {
      localStorage.setItem('eotc_auth_token', authData.tokens.accessToken);
      localStorage.setItem('eotc_refresh_token', authData.tokens.refreshToken);
      localStorage.setItem('eotc_user', JSON.stringify(authData.user));
    }

    // Cache session in IndexedDB for offline restart
    await cacheAuthSession({
      user: authData.user,
      accessToken: authData.tokens.accessToken,
      refreshToken: authData.tokens.refreshToken,
      cachedAt: new Date().toISOString(),
    });

    this.notifyAuthChange(this.user);
    return authData;
  }

  async updateProfile(data: UpdateProfileInput): Promise<UserProfile> {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to update profile: HTTP ${res.status}`);
    }

    const json = await res.json();
    const updatedUser: UserProfile = json.data;
    this.user = updatedUser;

    if (typeof window !== 'undefined') {
      localStorage.setItem('eotc_user', JSON.stringify(updatedUser));
    }

    const currentToken = this.getToken();
    const currentRefreshToken = this.getRefreshToken();
    if (currentToken) {
      await cacheAuthSession({
        user: updatedUser,
        accessToken: currentToken,
        refreshToken: currentRefreshToken || currentToken,
        cachedAt: new Date().toISOString(),
      });
    }

    this.notifyAuthChange(updatedUser);
    return updatedUser;
  }

  async logout(): Promise<void> {
    this.token = null;
    this.user = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('eotc_auth_token');
      localStorage.removeItem('eotc_refresh_token');
      localStorage.removeItem('eotc_user');
      try {
        const { clearCachedAuthSession } = await import('@/lib/offline-db');
        await clearCachedAuthSession();
      } catch (err) {
        console.warn('Failed to clear cached auth session:', err);
      }
    }

    this.notifyAuthChange(null);
  }

  async getCurriculum() {
    try {
      const endpoint = this.token
        ? `${API_BASE_URL}/student/curriculum`
        : `${API_BASE_URL}/curriculum/published`;

      const res = await fetch(endpoint, {
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      });

      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json: any = await res.json();
        const rawGrades = Array.isArray(json.data) ? json.data : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return rawGrades.map((g: any, index: number) => ({
          ...g,
          id: g.id || (g.level != null ? `grade-level-${g.level}` : `grade-${index}`),
        }));
      }
    } catch {
      console.warn('Network offline, reconstructing curriculum from cached packages');
    }

    // Offline fallback: Reconstruct curriculum hierarchy from downloaded packages in IndexedDB!
    const offlinePackages = await getAllOfflinePackages();
    return this.reconstructCurriculumFromPackages(offlinePackages.map((p) => p.manifest));
  }

  async getPackageManifest(chapterId: string): Promise<LearningPackageManifest> {
    // 1. Check local IndexedDB first for offline guarantee
    const localPkg = await getOfflinePackage(chapterId);
    if (localPkg && localPkg.downloadStatus === 'AVAILABLE_OFFLINE') {
      return localPkg.manifest;
    }

    // 2. If online, fetch fresh manifest from API
    const res = await fetch(`${API_BASE_URL}/student/packages/${chapterId}`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });

    if (!res.ok) {
      if (localPkg?.manifest) {
        return localPkg.manifest; // Fallback to whatever local copy exists
      }
      throw new Error(`Failed to load chapter package: HTTP ${res.status}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    return json.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private reconstructCurriculumFromPackages(manifests: LearningPackageManifest[]): any[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gradesMap = new Map<number, any>();

    for (const m of manifests) {
      if (!gradesMap.has(m.gradeLevel)) {
        const gradeId = m.gradeId || `grade-level-${m.gradeLevel}`;
        gradesMap.set(m.gradeLevel, {
          id: gradeId,
          level: m.gradeLevel,
          name: m.gradeName,
          amharicName: m.amharicGradeName || null,
          subjects: [],
        });
      }
      const grade = gradesMap.get(m.gradeLevel)!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let subject = grade.subjects.find((s: any) => s.id === m.subjectId);
      if (!subject) {
        subject = {
          id: m.subjectId,
          name: m.subjectName,
          amharicName: m.amharicSubjectName,
          chapters: [],
        };
        grade.subjects.push(subject);
      }
      subject.chapters.push({
        id: m.chapterId,
        chapterNumber: m.chapterNumber,
        title: m.chapterTitle,
        amharicTitle: m.amharicChapterTitle,
        version: m.version,
        isPublished: true,
      });
    }

    return Array.from(gradesMap.values());
  }

  // ==========================================
  // ADMIN API CLIENT METHODS
  // ==========================================

  private getAuthHeader() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async getAdminCurriculum() {
    const token = this.getToken();
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/hierarchy`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to load admin curriculum: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async uploadPdf(file: File, type: 'textbook' | 'reference' = 'textbook'): Promise<{
    fileUrl: string;
    fileName: string;
    storedFileName: string;
    fileSize: number;
    checksumSha256: string;
    mimeType: string;
  }> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const res = await fetch(`${API_BASE_URL}/admin/curriculum/upload-pdf?type=${type}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to upload PDF: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async getChapterById(id: string) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE_URL}/curriculum/chapters/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Failed to load chapter: HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  }

  async getUsers(params?: { role?: string | undefined; page?: number | undefined; limit?: number | undefined; search?: string | undefined }) {
    const q = new URLSearchParams();
    if (params?.role) q.append('role', params.role);
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.search) q.append('search', params.search);

    const res = await fetch(`${API_BASE_URL}/admin/users?${q.toString()}`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) throw new Error(`Failed to load users: HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  }

  async createUser(data: { email: string; fullName: string; password: string; role: string }) {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create user: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async updateUserStatus(id: string, isActive: boolean) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${id}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) throw new Error(`Failed to update user status: HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  }

  async updateUserRole(id: string, role: string) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${id}/role`, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error(`Failed to update user role: HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  }

  async resetUserPassword(id: string, newPassword: string) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${id}/reset-password`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) throw new Error(`Failed to reset password: HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  }

  async createGrade(data: { level: number; name: string; amharicName?: string | null | undefined; description?: string | null | undefined; orderIndex?: number | undefined }) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/grades`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create grade: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async createSubject(gradeId: string, data: { name: string; amharicName?: string | null | undefined; code: string; description?: string | null | undefined; orderIndex?: number | undefined }) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/grades/${gradeId}/subjects`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create subject: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async updateSubject(subjectId: string, data: {
    name?: string | undefined;
    amharicName?: string | null | undefined;
    code?: string | undefined;
    description?: string | null | undefined;
    orderIndex?: number | undefined;
    textbookUrl?: string | null | undefined;
    textbookFileName?: string | null | undefined;
    textbookFileSize?: number | null | undefined;
    textbookChecksumSha256?: string | null | undefined;
    textbookTotalPages?: number | null | undefined;
  }) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/subjects/${subjectId}`, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to update subject: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async createChapter(subjectId: string, data: { chapterNumber: number; title: string; amharicTitle?: string | null | undefined; description?: string | null | undefined; orderIndex?: number | undefined }) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/subjects/${subjectId}/chapters`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create chapter: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async updateChapter(chapterId: string, data: {
    chapterNumber?: number | undefined;
    title?: string | undefined;
    amharicTitle?: string | null | undefined;
    description?: string | null | undefined;
    orderIndex?: number | undefined;
  }) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/chapters/${chapterId}`, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to update chapter: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async upsertTextbook(chapterId: string, data: {
    title: string;
    fileUrl: string;
    fileSize: number;
    checksumSha256: string;
    mimeType: string;
    startPage: number;
    endPage: number;
    totalPages: number;
  }) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/chapters/${chapterId}/textbook`, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to update textbook: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async createQuiz(chapterId: string, data: {
    title: string;
    amharicTitle?: string | null | undefined;
    description?: string | null | undefined;
    passingScore: number;
    isPractice?: boolean | undefined;
    timeLimitMinutes?: number | undefined;
  }) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/chapters/${chapterId}/quizzes`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ ...data, isPractice: data.isPractice ?? true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create quiz: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async addQuizQuestion(quizId: string, data: {
    prompt: string;
    amharicPrompt?: string | null | undefined;
    points: number;
    orderIndex?: number | undefined;
    explanation?: string | null | undefined;
    amharicExplanation?: string | null | undefined;
    choices: { text: string; amharicText?: string | null | undefined; isCorrect: boolean; orderIndex: number }[];
  }) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/quizzes/${quizId}/questions`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to add question: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async addReference(chapterId: string, data: {
    title: string;
    amharicTitle?: string | null | undefined;
    url: string;
    isDownloadable: boolean;
    downloadableDocUrl?: string | null | undefined;
    downloadableDocSize?: number | null | undefined;
    downloadableDocChecksum?: string | null | undefined;
    orderIndex?: number | undefined;
  }) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/chapters/${chapterId}/references`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to attach reference: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async publishChapter(chapterId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/chapters/${chapterId}/publish`, {
      method: 'POST',
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to publish chapter: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async unpublishChapter(chapterId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/chapters/${chapterId}/unpublish`, {
      method: 'POST',
      headers: this.getAuthHeader(),
    });
    if (!res.ok) throw new Error(`Failed to unpublish chapter: HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  }

  async deleteChapter(chapterId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/chapters/${chapterId}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to delete chapter: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async deleteQuiz(quizId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/quizzes/${quizId}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to delete quiz: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async deleteQuestion(questionId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/questions/${questionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to delete question: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async deleteReference(referenceId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/references/${referenceId}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to delete reference: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  // --- Notifications ---
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await fetch(`${API_BASE_URL}/notifications`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      return [];
    }
    const json = await res.json();
    return json.data || [];
  }

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
    });
  }

  async markAllNotificationsRead(): Promise<void> {
    await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'POST',
      headers: this.getAuthHeader(),
    });
  }

  async createNotification(data: CreateNotificationInput) {
    const res = await fetch(`${API_BASE_URL}/admin/notifications`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create notification: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async listAdminNotifications() {
    const res = await fetch(`${API_BASE_URL}/admin/notifications`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  }

  async deleteAdminNotification(id: string) {
    const res = await fetch(`${API_BASE_URL}/admin/notifications/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to delete notification: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  // --- Student Grade Enrollments ---
  async getStudentEnrollments(): Promise<StudentEnrollmentItem[]> {
    const res = await fetch(`${API_BASE_URL}/student/enrollments`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  }

  async enrollStudentGrades(gradeIds: string[]): Promise<StudentEnrollmentItem[]> {
    const cleanIds = (gradeIds || []).filter((id) => Boolean(id) && typeof id === 'string');
    const res = await fetch(`${API_BASE_URL}/student/enrollments`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ gradeIds: cleanIds }),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to enroll grades: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  async unenrollStudentGrade(gradeId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/student/enrollments/${gradeId}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to unenroll: HTTP ${res.status}`);
    }
  }

  // --- Admin Student Directory & Progress ---
  async adminListStudents(params?: {
    churchParish?: string | undefined;
    gradeId?: string | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  }): Promise<{ students: AdminStudentListItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params?.churchParish) query.set('churchParish', params.churchParish);
    if (params?.gradeId) query.set('gradeId', params.gradeId);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await fetch(`${API_BASE_URL}/admin/students?${query.toString()}`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch students: HTTP ${res.status}`);
    }
    return res.json();
  }

  async adminGetSundaySchools(): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/admin/students/sunday-schools`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.sundaySchools || [];
  }

  async adminGetStudentProgress(userId: string): Promise<AdminStudentDetails> {
    const res = await fetch(`${API_BASE_URL}/admin/students/${userId}/progress`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch student progress: HTTP ${res.status}`);
    }
    return res.json();
  }

  // --- Customer Support / Helpdesk System ---
  async createSupportTicket(data: CreateSupportTicketInput): Promise<SupportTicketItem> {
    const res = await fetch(`${API_BASE_URL}/support/tickets`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to submit ticket: HTTP ${res.status}`);
    }
    return res.json();
  }

  async getStudentTickets(): Promise<SupportTicketItem[]> {
    const res = await fetch(`${API_BASE_URL}/support/tickets`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.tickets || [];
  }

  async getTicketDetails(ticketId: string): Promise<SupportTicketItem> {
    const res = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch ticket: HTTP ${res.status}`);
    }
    return res.json();
  }

  async addTicketMessage(ticketId: string, message: string): Promise<TicketMessageItem> {
    const res = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to send reply: HTTP ${res.status}`);
    }
    return res.json();
  }

  async adminListTickets(params?: {
    status?: TicketStatus | undefined;
    category?: TicketCategory | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  }): Promise<{ tickets: SupportTicketItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await fetch(`${API_BASE_URL}/admin/support/tickets?${query.toString()}`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch tickets: HTTP ${res.status}`);
    }
    return res.json();
  }

  async adminUpdateTicketStatus(ticketId: string, status: TicketStatus): Promise<SupportTicketItem> {
    const res = await fetch(`${API_BASE_URL}/admin/support/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to update status: HTTP ${res.status}`);
    }
    return res.json();
  }

  // ==========================================
  // TEACHER PARISH & MATERIAL SUBMISSIONS
  // ==========================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTeacherParishOverview(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/teacher/parish/overview`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch parish overview: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTeacherParishStudents(params?: { search?: string; gradeLevel?: number; page?: number; limit?: number }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.gradeLevel) query.set('gradeLevel', String(params.gradeLevel));
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await fetch(`${API_BASE_URL}/teacher/students?${query.toString()}`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch parish students: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTeacherStudentProgress(studentId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/teacher/students/${studentId}/progress`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch student progress: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async submitTeacherReference(chapterId: string, data: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/teacher/chapters/${chapterId}/references`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to submit reference: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async submitTeacherPracticeQuestion(data: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/teacher/practice-questions`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to submit practice question: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTeacherSubmissions(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/teacher/submissions`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch submissions: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  // ==========================================
  // ADMIN MODERATION DESK & PARISH ASSIGNMENT
  // ==========================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getPendingModeration(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/moderation/pending`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch pending moderation: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async reviewModerationReference(referenceId: string, action: 'APPROVE' | 'DECLINE', rejectionReason?: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/moderation/references/${referenceId}/review`, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ action, rejectionReason }),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to review reference: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async reviewModerationPracticeQuestion(questionId: string, action: 'APPROVE' | 'DECLINE', rejectionReason?: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/moderation/practice-questions/${questionId}/review`, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ action, rejectionReason }),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to review practice question: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async assignTeacherParish(userId: string, churchParish: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/parish`, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ churchParish }),
    });
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to assign parish: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  }

  // ==========================================
  // PRACTICE QUESTIONS (STUDENT SELF-STUDY)
  // ==========================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getChapterPracticeQuestions(chapterId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/curriculum/chapters/${chapterId}/practice-questions`);
    if (!res.ok) {
      return [];
    }
    const json = await res.json();
    return json.data || [];
  }
}

export const api = new ApiClient();
