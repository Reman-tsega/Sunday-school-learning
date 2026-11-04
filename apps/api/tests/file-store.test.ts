import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { fileStoreService, UPLOADS_DIR, CHUNK_BYTES } from '../src/services/file-store.service.js';

const REL = 'references/vitest-file-store-chunks.pdf';
const ABS = path.join(UPLOADS_DIR, REL);

async function cleanup() {
  await prisma.storedFile.deleteMany({ where: { path: { startsWith: 'references/vitest-file-store-' } } });
  fs.rmSync(ABS, { force: true });
}

describe('Durable file store', () => {
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('stores a file in chunks and restores it byte for byte after the disk lost it', async () => {
    await cleanup();
    const bytes = crypto.randomBytes(CHUNK_BYTES * 2 + 12345);
    fs.mkdirSync(path.dirname(ABS), { recursive: true });
    fs.writeFileSync(ABS, bytes);

    await fileStoreService.save(REL, 'application/pdf');
    const stored = await prisma.storedFile.findUnique({ where: { path: REL }, include: { _count: { select: { chunks: true } } } });
    expect(stored?.data).toBeNull();
    expect(stored?._count.chunks).toBe(3);
    expect(stored?.size).toBe(bytes.length);
    expect(stored?.checksumSha256).toBe(crypto.createHash('sha256').update(bytes).digest('hex'));

    fs.rmSync(ABS);
    const restored = await fileStoreService.ensureOnDisk(REL);
    expect(restored).toBe(ABS);
    expect(fs.readFileSync(ABS).equals(bytes)).toBe(true);
  });

  it('saving the same path again replaces the earlier copy', async () => {
    const bytes = crypto.randomBytes(1000);
    fs.writeFileSync(ABS, bytes);
    await fileStoreService.save(REL, 'application/pdf');
    expect(await prisma.storedFile.count({ where: { path: REL } })).toBe(1);
    expect(await prisma.storedFileChunk.count({ where: { file: { path: REL } } })).toBe(1);
  });

  it('never restores an interrupted save', async () => {
    const rel = 'references/vitest-file-store-partial.pdf';
    // A save that stopped before its checksum was written
    await prisma.storedFile.create({
      data: { path: rel, mimeType: 'application/pdf', size: 10, checksumSha256: '', chunks: { create: [{ index: 0, data: Buffer.from('12345') }] } },
    });
    expect(await fileStoreService.ensureOnDisk(rel)).toBeNull();
    expect(fs.existsSync(path.join(UPLOADS_DIR, rel))).toBe(false);
  });
});
