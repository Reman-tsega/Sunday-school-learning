import {
  saveOfflinePackage,
  getOfflinePackage,
  deleteOfflinePackage,
  type StoredPackage,
} from '@/lib/offline-db';
import type { LearningPackageManifest } from '@eotc/shared';

export type DownloadProgressCallback = (status: {
  phase: string;
  progressPercent: number;
  currentFile?: string;
  error?: string;
}) => void;

export class WebDownloadManager {
  /**
   * Downloads, validates, and persists a complete learning package into IndexedDB.
   */
  async downloadPackage(
    manifest: LearningPackageManifest,
    onProgress?: DownloadProgressCallback
  ): Promise<StoredPackage> {
    const chapterId = manifest.chapterId;

    // 1. Initial State: DOWNLOADING
    const initialPkg: StoredPackage = {
      chapterId,
      manifest,
      downloadStatus: 'DOWNLOADING',
      downloadedAt: new Date().toISOString(),
    };
    await saveOfflinePackage(initialPkg);
    onProgress?.({ phase: 'Starting download', progressPercent: 5 });

    try {
      // 2. Download Textbook PDF
      onProgress?.({
        phase: 'Downloading textbook PDF',
        progressPercent: 20,
        currentFile: manifest.textbook.title,
      });

      const textbookUrl = manifest.textbook.chapterPdfUrl || manifest.textbook.fileUrl || `/api/chapters/${chapterId}/pdf`;
      const response = await fetch(textbookUrl);
      if (!response.ok) {
        throw new Error(`Failed to download textbook: HTTP ${response.status}`);
      }
      const textbookBlob = await response.blob();

      // Verify file size
      if (textbookBlob.size === 0) {
        throw new Error('Downloaded textbook file is empty');
      }

      onProgress?.({ phase: 'Textbook verified', progressPercent: 50 });

      // 3. Download references with isDownloadable === true
      const referenceBlobs: Record<string, Blob> = {};
      const downloadableRefs = manifest.references.filter((r) => r.isDownloadable);

      for (let i = 0; i < downloadableRefs.length; i++) {
        const ref = downloadableRefs[i]!;
        onProgress?.({
          phase: `Downloading reference ${i + 1}/${downloadableRefs.length}`,
          progressPercent: 50 + Math.round(((i + 1) / downloadableRefs.length) * 35),
          currentFile: ref.title,
        });

        if (ref.downloadableDocUrl) {
          try {
            const refRes = await fetch(ref.downloadableDocUrl);
            if (!refRes.ok) throw new Error(`HTTP ${refRes.status}`);
            const blob = await refRes.blob();
            if (blob.size > 0) referenceBlobs[ref.id] = blob;
          } catch (refErr) {
            // A missing reference must not block the textbook; it stays online-only
            console.warn(`Reference "${ref.title}" could not be saved offline:`, refErr);
          }
        }
      }

      // 4. All resources downloaded and verified -> Commit as AVAILABLE_OFFLINE
      const completedPkg: StoredPackage = {
        chapterId,
        manifest,
        downloadStatus: 'AVAILABLE_OFFLINE',
        downloadedAt: new Date().toISOString(),
        textbookBlob,
        referenceBlobs,
      };

      await saveOfflinePackage(completedPkg);
      onProgress?.({ phase: 'Download complete and verified offline', progressPercent: 100 });
      return completedPkg;
    } catch (error) {
      const errMessage = (error as Error).message || 'Download failed';
      const failedPkg: StoredPackage = {
        chapterId,
        manifest,
        downloadStatus: 'FAILED',
        downloadedAt: new Date().toISOString(),
        error: errMessage,
      };
      await saveOfflinePackage(failedPkg);
      onProgress?.({ phase: 'Download failed', progressPercent: 0, error: errMessage });
      throw error;
    }
  }

  async removePackage(chapterId: string): Promise<void> {
    await deleteOfflinePackage(chapterId);
  }

  async getPackageStatus(chapterId: string) {
    const pkg = await getOfflinePackage(chapterId);
    return pkg?.downloadStatus ?? 'NOT_DOWNLOADED';
  }
}

export const downloadManager = new WebDownloadManager();
