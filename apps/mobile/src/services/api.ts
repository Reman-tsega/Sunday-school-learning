import type { LearningPackageManifest, UserProfile } from '@eotc/shared';
import type { ISqliteDb } from '../database/sqliteDb';
import { packageRepository, authSessionRepository } from '../database/sqliteDb';
import type { AuthSessionRecord } from '../types';

let currentApiBaseUrl = 'http://localhost:4000/api';
let isOfflineModeSimulated = false;

export function setApiBaseUrl(url: string): void {
  currentApiBaseUrl = url;
}

export function getApiBaseUrl(): string {
  return currentApiBaseUrl;
}

export function setOfflineSimulated(val: boolean): void {
  isOfflineModeSimulated = val;
}

export function isOfflineMode(): boolean {
  return isOfflineModeSimulated;
}

export interface MobileChapterItem {
  id: string;
  chapterNumber: number;
  title: string;
  amharicTitle?: string | null;
  version: number;
  isPublished?: boolean;
  isAvailableOffline?: boolean;
  downloadStatus?: string;
}

export interface MobileSubjectItem {
  id: string;
  name: string;
  amharicName?: string | null;
  chapters: MobileChapterItem[];
}

export interface MobileGradeItem {
  level: number;
  name: string;
  subjects: MobileSubjectItem[];
}

export interface StudentAuthResult {
  student: UserProfile;
  accessToken: string;
  refreshToken: string;
  isOfflineLogin: boolean;
}

export const mobileApiClient = {
  async login(
    email: string,
    password: string,
    db: ISqliteDb
  ): Promise<StudentAuthResult> {
    if (!isOfflineModeSimulated) {
      try {
        const res = await fetch(`${currentApiBaseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (res.ok) {
          const json: any = await res.json();
          const authData = json.data;
          const user: UserProfile = authData.user;
          const tokens = authData.tokens;

          const session: AuthSessionRecord = {
            id: 'current_session',
            studentId: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            cachedAt: new Date().toISOString(),
          };
          await authSessionRepository.saveSession(db, session);

          return {
            student: user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isOfflineLogin: false,
          };
        }
      } catch {
        // Fallback to offline check
      }
    }

    const cachedSession = await authSessionRepository.getSession(db);
    if (cachedSession && cachedSession.email.toLowerCase() === email.toLowerCase()) {
      const studentProfile: UserProfile = {
        id: cachedSession.studentId,
        email: cachedSession.email,
        fullName: cachedSession.fullName,
        role: cachedSession.role as any,
        isActive: true,
        createdAt: cachedSession.cachedAt,
        updatedAt: cachedSession.cachedAt,
      };

      return {
        student: studentProfile,
        accessToken: cachedSession.accessToken,
        refreshToken: cachedSession.refreshToken,
        isOfflineLogin: true,
      };
    }

    throw new Error('የመግቢያ ስህተት: ትክክለኛ የኢንተርኔት ግንኙነት ወይም የተቀመጠ አካውንት አልተገኘም (Invalid credentials or no cached offline profile)');
  },

  async getCurriculum(
    token: string,
    db: ISqliteDb
  ): Promise<MobileGradeItem[]> {
    const localPackages = await packageRepository.getAllPackages(db);
    const offlineMap = new Map(localPackages.map((p) => [p.chapterId, p.downloadStatus]));

    if (!isOfflineModeSimulated) {
      try {
        const res = await fetch(`${currentApiBaseUrl}/student/curriculum`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json: any = await res.json();
          const data: MobileGradeItem[] = json.data;

          return data.map((grade) => ({
            ...grade,
            subjects: grade.subjects.map((sub) => ({
              ...sub,
              chapters: sub.chapters.map((ch) => ({
                ...ch,
                isAvailableOffline: offlineMap.get(ch.id) === 'AVAILABLE_OFFLINE',
                downloadStatus: offlineMap.get(ch.id) || 'NOT_DOWNLOADED',
              })),
            })),
          }));
        }
      } catch {
        // Fallback to offline reconstruction
      }
    }

    return reconstructCurriculumFromLocalPackages(localPackages);
  },

  async getPackageManifest(
    chapterId: string,
    token: string,
    db: ISqliteDb
  ): Promise<LearningPackageManifest> {
    const localPkg = await packageRepository.getPackage(db, chapterId);
    if (localPkg && localPkg.downloadStatus === 'AVAILABLE_OFFLINE') {
      return localPkg.manifest;
    }

    if (isOfflineModeSimulated) {
      if (localPkg) return localPkg.manifest;
      throw new Error('ትምህርቱ ከመስመር ውጭ አልተገኘም (Package not found offline)');
    }

    const res = await fetch(`${currentApiBaseUrl}/student/packages/${chapterId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (localPkg) return localPkg.manifest;
      throw new Error(`Failed to fetch learning package manifest: HTTP ${res.status}`);
    }

    const json: any = await res.json();
    return json.data as LearningPackageManifest;
  },
};

export function reconstructCurriculumFromLocalPackages(
  packages: Array<{
    chapterId: string;
    subjectId: string;
    gradeId: string;
    title: string;
    manifest: LearningPackageManifest;
    downloadStatus: string;
  }>
): MobileGradeItem[] {
  const gradeMap = new Map<number, MobileGradeItem>();

  for (const pkg of packages) {
    const m = pkg.manifest;

    if (!gradeMap.has(m.gradeLevel)) {
      gradeMap.set(m.gradeLevel, {
        level: m.gradeLevel,
        name: m.gradeName,
        subjects: [],
      });
    }

    const gradeObj = gradeMap.get(m.gradeLevel)!;
    let subObj = gradeObj.subjects.find((s) => s.id === m.subjectId);
    if (!subObj) {
      subObj = {
        id: m.subjectId,
        name: m.subjectName,
        amharicName: m.amharicSubjectName,
        chapters: [],
      };
      gradeObj.subjects.push(subObj);
    }

    if (!subObj.chapters.some((c) => c.id === m.chapterId)) {
      subObj.chapters.push({
        id: m.chapterId,
        chapterNumber: m.chapterNumber,
        title: m.chapterTitle,
        amharicTitle: m.amharicChapterTitle,
        version: m.version,
        isPublished: true,
        isAvailableOffline: pkg.downloadStatus === 'AVAILABLE_OFFLINE',
        downloadStatus: pkg.downloadStatus,
      });
    }
  }

  return Array.from(gradeMap.values()).sort((a, b) => a.level - b.level);
}
