import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as mupdf from 'mupdf';
import { decryptPdf, looksEncrypted } from '../src/utils/pdf-decrypt.js';

/** A two-page PDF whose second page says "Chapter One". */
async function samplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage().drawText('Front matter', { x: 50, y: 700, font, size: 18 });
  doc.addPage().drawText('Chapter One', { x: 50, y: 700, font, size: 18 });
  return doc.save();
}

/** The same file with owner-password protection (opens without a password, content encrypted). */
function ownerProtected(bytes: Uint8Array): Uint8Array {
  const doc = mupdf.Document.openDocument(bytes, 'application/pdf').asPDF()!;
  return doc.saveToBuffer('encrypt=aes-128,owner-password=secret,permissions=-3904').asUint8Array();
}

/** Copies one page out with pdf-lib, the way chapter PDFs are built, and reads its text back. */
async function textOfExtractedPage(master: Uint8Array, pageIndex: number): Promise<string> {
  const source = await PDFDocument.load(master, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const [page] = await out.copyPages(source, [pageIndex]);
  out.addPage(page!);
  const extracted = mupdf.Document.openDocument(await out.save(), 'application/pdf');
  return extracted.loadPage(0).toStructuredText().asText();
}

describe('PDF decryption before chapter extraction', () => {
  it('leaves unencrypted PDFs untouched', async () => {
    const plain = await samplePdf();
    expect(looksEncrypted(plain)).toBe(false);
    const result = await decryptPdf(plain);
    expect(result.decrypted).toBe(false);
    expect(result.bytes).toBe(plain);
  });

  it('removes owner-password protection so extracted pages keep their content', async () => {
    const encrypted = ownerProtected(await samplePdf());
    expect(looksEncrypted(encrypted)).toBe(true);

    // The bug: copying pages straight out of the encrypted file loses the text
    expect(await textOfExtractedPage(encrypted, 1)).not.toContain('Chapter One');

    const result = await decryptPdf(encrypted);
    expect(result).toMatchObject({ decrypted: true, needsPassword: false });
    expect(looksEncrypted(result.bytes)).toBe(false);
    expect(await textOfExtractedPage(result.bytes, 1)).toContain('Chapter One');
  });

  it('reports PDFs that need a password to open', async () => {
    const doc = mupdf.Document.openDocument(await samplePdf(), 'application/pdf').asPDF()!;
    const locked = doc.saveToBuffer('encrypt=aes-128,user-password=open,owner-password=secret').asUint8Array();
    const result = await decryptPdf(locked);
    expect(result).toMatchObject({ decrypted: false, needsPassword: true });
  });
});
