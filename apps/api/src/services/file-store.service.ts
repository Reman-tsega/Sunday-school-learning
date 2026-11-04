import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

/** Size of each stored piece: large uploads are written and restored one piece at a time. */
export const CHUNK_BYTES = 512 * 1024;

/**
 * Keeps uploaded files in the database as well as on disk. Hosts such as Render's free plan wipe
 * the disk on every deploy or restart; the database copy lets a file be restored on first use.
 * Paths are relative to uploads/, e.g. "textbooks/123-book.pdf".
 *
 * Files are stored in CHUNK_BYTES pieces: Prisma needs many times a value's size in memory, so a
 * single 13 MB value pushed the API over the 512 MB limit of a small instance.
 */
export class FileStoreService {
  /** Stores the file already written to uploads/<relPath>. */
  async save(relPath: string, mimeType: string): Promise<void> {
    const absolute = path.join(UPLOADS_DIR, relPath);
    const size = fs.statSync(absolute).size;
    const hash = crypto.createHash('sha256');
    const fd = fs.openSync(absolute, 'r');
    try {
      // Replace any earlier copy of this path, then add the pieces one by one
      await prisma.storedFile.deleteMany({ where: { path: relPath } });
      const file = await prisma.storedFile.create({
        data: { path: relPath, mimeType, size, checksumSha256: '' },
        select: { id: true },
      });
      const buffer = Buffer.alloc(CHUNK_BYTES);
      for (let index = 0, offset = 0; offset < size; index++) {
        const read = fs.readSync(fd, buffer, 0, CHUNK_BYTES, offset);
        const piece = Buffer.from(buffer.subarray(0, read));
        hash.update(piece);
        await prisma.storedFileChunk.create({ data: { fileId: file.id, index, data: piece } });
        offset += read;
      }
      // The checksum is set last, so an interrupted save is never mistaken for a complete one
      await prisma.storedFile.update({ where: { id: file.id }, data: { checksumSha256: hash.digest('hex') } });
    } finally {
      fs.closeSync(fd);
    }
  }

  /** Absolute path of uploads/<relPath>, restoring it from the database if the disk lost it. */
  async ensureOnDisk(relPath: string): Promise<string | null> {
    const absolute = path.resolve(UPLOADS_DIR, relPath);
    if (!absolute.startsWith(UPLOADS_DIR + path.sep)) return null;
    if (fs.existsSync(absolute)) return absolute;

    const stored = await prisma.storedFile.findUnique({
      where: { path: relPath.replace(/\\/g, '/') },
      select: { id: true, size: true, checksumSha256: true },
    });
    if (!stored || !stored.checksumSha256) return null;

    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    const partial = `${absolute}.${process.pid}.partial`;
    try {
      const legacy = await prisma.storedFile.findUnique({ where: { id: stored.id }, select: { data: true } });
      if (legacy?.data) {
        // Stored before chunking: the whole file is one value
        fs.writeFileSync(partial, legacy.data);
      } else {
        const fd = fs.openSync(partial, 'w');
        try {
          for (let index = 0; ; index++) {
            const chunk = await prisma.storedFileChunk.findUnique({ where: { fileId_index: { fileId: stored.id, index } } });
            if (!chunk) break;
            fs.writeSync(fd, chunk.data);
          }
        } finally {
          fs.closeSync(fd);
        }
      }
      if (fs.statSync(partial).size !== stored.size) {
        console.error(`Stored copy of ${relPath} is incomplete; not restoring it`);
        fs.rmSync(partial, { force: true });
        return null;
      }
      fs.renameSync(partial, absolute);
      return absolute;
    } catch (err) {
      fs.rmSync(partial, { force: true });
      throw err;
    }
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
