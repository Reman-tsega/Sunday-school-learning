import fs from 'fs';

/**
 * Many textbook PDFs carry "owner password" protection: anyone can read them, but the content is
 * encrypted. pdf-lib cannot decrypt, so pages it copies out of such a file come out blank. MuPDF can
 * remove that protection when no password is needed to open the file.
 */

/** Cheap check for an encryption dictionary, so most PDFs never load MuPDF. */
export function looksEncrypted(bytes: Uint8Array): boolean {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).includes('/Encrypt');
}

/**
 * Returns an unencrypted copy of the PDF, or the original bytes when it is not encrypted or needs a
 * password to open (those are left for the caller to report).
 */
export async function decryptPdf(bytes: Uint8Array): Promise<{ bytes: Uint8Array; decrypted: boolean; needsPassword: boolean }> {
  if (!looksEncrypted(bytes)) return { bytes, decrypted: false, needsPassword: false };
  const mupdf = await import('mupdf');
  const doc = mupdf.Document.openDocument(bytes, 'application/pdf');
  try {
    if (doc.needsPassword()) return { bytes, decrypted: false, needsPassword: true };
    const pdf = doc.asPDF();
    if (!pdf) return { bytes, decrypted: false, needsPassword: false };
    const encrypt = pdf.getTrailer().get('Encrypt');
    if (!encrypt || encrypt.isNull()) return { bytes, decrypted: false, needsPassword: false };
    const out = pdf.saveToBuffer('encrypt=none').asUint8Array();
    return { bytes: new Uint8Array(out), decrypted: true, needsPassword: false };
  } finally {
    doc.destroy();
  }
}

/** Decrypts an uploaded PDF file in place; returns whether it changed. */
export async function decryptPdfFile(absolutePath: string): Promise<{ decrypted: boolean; needsPassword: boolean }> {
  const result = await decryptPdf(fs.readFileSync(absolutePath));
  if (result.decrypted) fs.writeFileSync(absolutePath, result.bytes);
  return { decrypted: result.decrypted, needsPassword: result.needsPassword };
}
