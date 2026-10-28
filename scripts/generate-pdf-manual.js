/**
 * EOTC Senbet Tmhrtbet Learning Platform
 * PDF Manual Compiler (using Headless Microsoft Edge)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');

async function main() {
  console.log('[*] Compiling PDF User & Deployment Manual...');

  const htmlPath = path.join(docsDir, 'manual-template.html');
  const pdfPath = path.join(docsDir, 'EOTC-Platform-User-and-Deployment-Manual.pdf');

  if (!fs.existsSync(htmlPath)) {
    console.error(`[-] Source template not found at ${htmlPath}`);
    process.exit(1);
  }

  // Find Edge executable
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  let edgeExecutable = null;
  for (const p of edgePaths) {
    if (fs.existsSync(p)) {
      edgeExecutable = p;
      break;
    }
  }

  if (!edgeExecutable) {
    console.error('[-] Microsoft Edge executable not found. Cannot render PDF headlessly.');
    process.exit(1);
  }

  console.log(`[+] Found Edge executable at: ${edgeExecutable}`);
  console.log('[*] Rendering HTML template to publication-quality PDF...');

  const htmlFileUri = 'file:///' + htmlPath.replace(/\\/g, '/');
  const printCmd = `"${edgeExecutable}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlFileUri}"`;

  try {
    execSync(printCmd, { stdio: 'inherit' });

    // Allow Edge a short moment to flush the file descriptor if needed
    let attempts = 0;
    while (!fs.existsSync(pdfPath) && attempts < 10) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
      attempts++;
    }

    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      console.log(`\n================================================================`);
      console.log(`[SUCCESS] PDF Manual Generated Successfully!`);
      console.log(`================================================================`);
      console.log(`Target File: ${pdfPath}`);
      console.log(`File Size:   ${(stats.size / 1024).toFixed(1)} KB (${stats.size} bytes)`);
      console.log(`================================================================\n`);
    } else {
      console.error('[-] PDF generation failed: target file does not exist.');
      process.exit(1);
    }
  } catch (err) {
    console.error('[-] Error executing headless PDF generation:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
