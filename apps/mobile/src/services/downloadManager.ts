import type { LearningPackageManifest } from '@eotc/shared';
import type { ISqliteDb } from '../database/sqliteDb';
import { packageRepository } from '../database/sqliteDb';
import type { OfflinePackageRecord } from '../types';

export interface IFileSystem {
  documentDirectory: string;
  makeDirectoryAsync(dirUri: string, options?: { intermediates?: boolean }): Promise<void>;
  downloadAsync(url: string, fileUri: string): Promise<{ uri: string; status: number }>;
  getInfoAsync(fileUri: string): Promise<{ exists: boolean; size?: number; uri: string }>;
  deleteAsync(fileUri: string, options?: { idempotent?: boolean }): Promise<void>;
}

let activeFileSystem: IFileSystem | null = null;

export function setActiveFileSystem(fs: IFileSystem): void {
  activeFileSystem = fs;
}

export async function getFileSystem(): Promise<IFileSystem> {
  if (activeFileSystem) return activeFileSystem;
  const ExpoFileSystem = await import('expo-file-system');
  const docDir = ExpoFileSystem.documentDirectory || '';
  activeFileSystem = {
    documentDirectory: docDir,
    async makeDirectoryAsync(dirUri, options) {
      await ExpoFileSystem.makeDirectoryAsync(dirUri, options);
    },
    async downloadAsync(url, fileUri) {
      const res = await ExpoFileSystem.downloadAsync(url, fileUri);
      return { uri: res.uri, status: res.status };
    },
    async getInfoAsync(fileUri) {
      const res = await ExpoFileSystem.getInfoAsync(fileUri);
      return { exists: res.exists, size: (res as any).size, uri: res.uri };
    },
    async deleteAsync(fileUri, options) {
      await ExpoFileSystem.deleteAsync(fileUri, options);
    },
  };
  return activeFileSystem;
}

export interface DownloadProgressCallback {
  (step: string, percent: number): void;
}

export async function downloadLearningPackage(
  db: ISqliteDb,
  fs: IFileSystem,
  manifest: LearningPackageManifest,
  onProgress?: DownloadProgressCallback
): Promise<OfflinePackageRecord> {
  const chapterId = manifest.chapterId;
  const packageDir = `${fs.documentDirectory}packages/${chapterId}/`;
  const pdfTargetUri = `${packageDir}textbook.pdf`;
  const refsDir = `${packageDir}refs/`;

  onProgress?.('ዝግጅት በመጀመር ላይ... (Initializing package download)', 5);

  const initialRecord: OfflinePackageRecord = {
    chapterId,
    subjectId: manifest.subjectId,
    gradeId: `grade-${manifest.gradeLevel}`,
    title: manifest.chapterTitle,
    version: manifest.version,
    manifest,
    localPdfUri: null,
    downloadStatus: 'DOWNLOADING',
    downloadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await packageRepository.savePackage(db, initialRecord);

  try {
    // 1. Create target directories
    await fs.makeDirectoryAsync(packageDir, { intermediates: true });
    await fs.makeDirectoryAsync(refsDir, { intermediates: true });
    onProgress?.('መጽሐፉን በማውረድ ላይ... (Downloading textbook PDF)', 20);

    // 2. Download textbook PDF
    const dlResult = await fs.downloadAsync(manifest.textbook.fileUrl, pdfTargetUri);
    if (dlResult.status !== 200 && dlResult.status !== 0) {
      throw new Error(`Failed to download textbook PDF: HTTP status ${dlResult.status}`);
    }

    // 3. Verify PDF file size and existence
    onProgress?.('የመጽሐፍ ፋይል ትክክለኛነት በማረጋገጥ ላይ... (Verifying textbook file)', 45);
    const pdfInfo = await fs.getInfoAsync(pdfTargetUri);
    if (!pdfInfo.exists || !pdfInfo.size || pdfInfo.size <= 0) {
      throw new Error('Downloaded textbook PDF file is missing or empty');
    }

    // 4. Download and verify downloadable reference documents
    const refCount = manifest.references.length;
    for (let i = 0; i < refCount; i++) {
      const ref = manifest.references[i];
      if (ref && ref.isDownloadable && ref.downloadableDocUrl) {
        onProgress?.(
          `ማጣቀሻ በማውረድ ላይ... (${i + 1}/${refCount}) (Downloading reference ${ref.title})`,
          50 + Math.round(((i + 1) / refCount) * 30)
        );
        const refTargetUri = `${refsDir}${ref.id}.pdf`;
        const refRes = await fs.downloadAsync(ref.downloadableDocUrl, refTargetUri);
        if (refRes.status !== 200 && refRes.status !== 0) {
          throw new Error(`Failed to download reference "${ref.title}": HTTP ${refRes.status}`);
        }
        const refInfo = await fs.getInfoAsync(refTargetUri);
        if (!refInfo.exists || !refInfo.size || refInfo.size <= 0) {
          throw new Error(`Downloaded reference "${ref.title}" is missing or empty`);
        }
      }
    }

    // 5. Verify Quiz Questions & Choices are locally usable
    onProgress?.('የፈተና ጥያቄዎችን በማረጋገጥ ላይ... (Verifying quiz questions)', 85);
    if (manifest.quizzes && manifest.quizzes.length > 0) {
      for (const quiz of manifest.quizzes) {
        if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
          throw new Error('Packaged quiz contains no valid questions');
        }
        for (const q of quiz.questions) {
          if (!q.choices || q.choices.length < 2) {
            throw new Error(`Quiz question "${q.prompt}" has fewer than 2 choices`);
          }
        }
      }
    }

    // 6. Commit final verified record as AVAILABLE_OFFLINE
    onProgress?.('ሙሉ ትምህርቱን ከመስመር ውጭ በማስቀመጥ ላይ... (Finalizing offline package)', 95);
    const completedRecord: OfflinePackageRecord = {
      ...initialRecord,
      localPdfUri: pdfTargetUri,
      downloadStatus: 'AVAILABLE_OFFLINE',
      downloadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await packageRepository.savePackage(db, completedRecord);

    onProgress?.('ውርዱ በተሳካ ሁኔታ ተጠናቋል! (Download complete)', 100);
    return completedRecord;
  } catch (err) {
    const failedRecord: OfflinePackageRecord = {
      ...initialRecord,
      downloadStatus: 'FAILED',
      updatedAt: new Date().toISOString(),
    };
    await packageRepository.savePackage(db, failedRecord);

    try {
      await fs.deleteAsync(packageDir, { idempotent: true });
    } catch {
      // Ignore cleanup error
    }

    throw err;
  }
}

export async function deleteLearningPackage(
  db: ISqliteDb,
  fs: IFileSystem,
  chapterId: string
): Promise<void> {
  const packageDir = `${fs.documentDirectory}packages/${chapterId}/`;
  try {
    await fs.deleteAsync(packageDir, { idempotent: true });
  } catch {
    // Ignore
  }
  await packageRepository.deletePackage(db, chapterId);
}
