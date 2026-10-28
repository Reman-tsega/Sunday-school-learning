import type { IFileSystem } from '../src/services/downloadManager';

export function createMockFileSystem(): IFileSystem & {
  files: Map<string, { size: number; content: string }>;
} {
  const files = new Map<string, { size: number; content: string }>();

  return {
    documentDirectory: 'file:///data/user/0/org.eotc.learning/files/',
    files,
    async makeDirectoryAsync() {
      // virtual in-memory dirs
    },
    async downloadAsync(url: string, fileUri: string) {
      if (url.includes('error-fail-download')) {
        return { uri: fileUri, status: 500 };
      }
      files.set(fileUri, { size: 1024 * 1024 * 4, content: 'mock-pdf-binary' });
      return { uri: fileUri, status: 200 };
    },
    async getInfoAsync(fileUri: string) {
      const file = files.get(fileUri);
      if (!file) {
        return { exists: false, uri: fileUri };
      }
      return { exists: true, size: file.size, uri: fileUri };
    },
    async deleteAsync(fileUri: string) {
      for (const k of Array.from(files.keys())) {
        if (k.startsWith(fileUri)) {
          files.delete(k);
        }
      }
      files.delete(fileUri);
    },
  };
}
