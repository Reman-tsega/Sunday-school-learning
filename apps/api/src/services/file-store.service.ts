import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

/**
 * Keeps uploaded files in the database as well as on disk. Hosts such as Render's free plan wipe
 * the disk on every deploy or restart; the database copy lets a file be restored on first use.
 * Paths are relative to uploads/, e.g. "textbooks/123-book.pdf".
 */
export class FileStoreService {
  /** Stores the file already written to uploads/<relPath>. */
  async save(relPath: string, mimeType: string): Promise<void> {
    const data = fs.readFileSync(path.join(UPLOADS_DIR, relPath));
    const checksumSha256 = crypto.createHash('sha256').update(data).digest('hex');
    await prisma.storedFile.upsert({
      where: { path: relPath },
      create: { path: relPath, mimeType, size: data.length, checksumSha256, data },
      update: { mimeType, size: data.length, checksumSha256, data },
    });
  }

  /** Absolute path of uploads/<relPath>, restoring it from the database if the disk lost it. */
  async ensureOnDisk(relPath: string): Promise<string | null> {
    const absolute = path.resolve(UPLOADS_DIR, relPath);
    if (!absolute.startsWith(UPLOADS_DIR + path.sep)) return null;
    if (fs.existsSync(absolute)) return absolute;

    const stored = await prisma.storedFile.findUnique({ where: { path: relPath.replace(/\\/g, '/') } });
    if (!stored) return null;
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, stored.data);
    return absolute;
  }

  /** The uploads-relative path inside a stored file URL, or null for external URLs. */
  relativePathFromUrl(fileUrl: string): string | null {
    const marker = '/uploads/';
    const at = fileUrl.indexOf(marker);
    if (at === -1) return null;
    return decodeURIComponent(fileUrl.substring(at + marker.length).split(/[?#]/)[0]!);
  }
}

export const fileStoreService = new FileStoreService();
