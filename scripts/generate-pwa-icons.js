import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Pure Node.js PNG encoder without external dependencies
 * Uses standard zlib deflate for IDAT chunk
 */
function createPng(width, height, rgbaBuffer) {
  // 1. Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // 2. IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // Color type 6: RGBA
  ihdrData[10] = 0; // Compression deflate
  ihdrData[11] = 0; // Filter 0
  ihdrData[12] = 0; // No interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // 3. IDAT Chunk (Scanlines with filter byte 0)
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  let scanlineOffset = 0;
  let rgbaOffset = 0;

  for (let y = 0; y < height; y++) {
    scanlines[scanlineOffset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      scanlines[scanlineOffset++] = rgbaBuffer[rgbaOffset++]; // R
      scanlines[scanlineOffset++] = rgbaBuffer[rgbaOffset++]; // G
      scanlines[scanlineOffset++] = rgbaBuffer[rgbaOffset++]; // B
      scanlines[scanlineOffset++] = rgbaBuffer[rgbaOffset++]; // A
    }
  }

  const compressedData = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', compressedData);

  // 4. IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * CRC32 calculation for PNG chunks
 */
function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }

  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);

  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);

  const crcInput = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcInput);
  chunk.writeUInt32BE(crcVal, 8 + len);

  return chunk;
}

/**
 * Render a beautiful Ethiopian Orthodox Cross icon into an RGBA pixel buffer
 */
function renderCrossIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.46;
  const cornerRadius = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Rounded rectangle background (#0C2340 deep church navy)
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const halfSize = size / 2 - 2;

      let inBg = false;
      if (dx <= halfSize && dy <= halfSize) {
        if (dx <= halfSize - cornerRadius || dy <= halfSize - cornerRadius) {
          inBg = true;
        } else {
          const cornerDist = Math.hypot(dx - (halfSize - cornerRadius), dy - (halfSize - cornerRadius));
          inBg = cornerDist <= cornerRadius;
        }
      }

      if (!inBg) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Default background navy
      let r = 12; // 0x0C
      let g = 35; // 0x23
      let b = 64; // 0x40
      let a = 255;

      // Outer gold border glow
      const distToEdge = Math.min(halfSize - dx, halfSize - dy);
      if (distToEdge < size * 0.04) {
        r = 217;
        g = 119;
        b = 6;
      }

      // Subtle circular radial glow behind the cross
      const centerDist = Math.hypot(x - cx, y - cy);
      if (centerDist < radius * 0.85) {
        const glowFactor = (1 - centerDist / (radius * 0.85)) * 0.35;
        r = Math.min(255, Math.round(r + 180 * glowFactor));
        g = Math.min(255, Math.round(g + 130 * glowFactor));
        b = Math.min(255, Math.round(b + 30 * glowFactor));
      }

      // --- Ethiopian Orthodox Cross Geometry ---
      const nx = Math.abs(x - cx);
      const ny = Math.abs(y - cy);

      const barThickness = size * 0.11;
      const armLength = size * 0.34;
      const finialSize = size * 0.08;

      let inCross = false;
      let inDetail = false;

      // Vertical main beam
      if (nx <= barThickness / 2 && ny <= armLength) {
        inCross = true;
      }
      // Horizontal cross beam
      if (ny <= barThickness / 2 && nx <= armLength) {
        inCross = true;
      }

      // Diagonal crosslets (St. Andrew cross-ties typical in Ethiopian crosses)
      const diag1 = Math.abs((x - cx) - (y - cy));
      const diag2 = Math.abs((x - cx) + (y - cy));
      if ((diag1 <= barThickness * 0.45 || diag2 <= barThickness * 0.45) && centerDist <= size * 0.22) {
        inCross = true;
      }

      // Finials / Trefoils at the 4 extremities
      const atTop = Math.hypot(x - cx, y - (cy - armLength)) <= finialSize;
      const atBottom = Math.hypot(x - cx, y - (cy + armLength)) <= finialSize;
      const atLeft = Math.hypot(x - (cx - armLength), y - cy) <= finialSize;
      const atRight = Math.hypot(x - (cx + armLength), y - cy) <= finialSize;
      if (atTop || atBottom || atLeft || atRight) {
        inCross = true;
      }

      // Inner ornamental slit / diamond detail (traditional Ge'ez woodwork)
      if (nx + ny <= barThickness * 0.42) {
        inDetail = true;
      }
      if (centerDist <= size * 0.035) {
        inDetail = true;
      }

      if (inCross && !inDetail) {
        // Gold Gradient from top to bottom
        const gradT = (y / size);
        r = Math.round(245 * (1 - gradT * 0.25));
        g = Math.round(158 * (1 - gradT * 0.3));
        b = Math.round(11 + 30 * (1 - gradT));
      } else if (inDetail) {
        // Dark cutout inside cross
        r = 15;
        g = 23;
        b = 42;
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }

  return buf;
}

// Generate SVG vector icon
function generateSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <radialGradient id="haloGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#0C2340" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="512" height="512" rx="110" fill="#0C2340" />
  <rect x="12" y="12" width="488" height="488" rx="100" fill="none" stroke="#D97706" stroke-width="6" opacity="0.8" />
  
  <!-- Subtle Spiritual Radial Halo -->
  <circle cx="256" cy="256" r="190" fill="url(#haloGrad)" />

  <!-- Ethiopian Orthodox Cross (Meskel) -->
  <g fill="url(#goldGrad)" stroke="#B45309" stroke-width="4" stroke-linejoin="round">
    <!-- Vertical Main Beam -->
    <rect x="228" y="80" width="56" height="352" rx="12" />
    
    <!-- Horizontal Cross Beam -->
    <rect x="80" y="228" width="352" height="56" rx="12" />
    
    <!-- Diagonal Interlocking Crosslets -->
    <rect x="242" y="140" width="28" height="232" rx="6" transform="rotate(45 256 256)" opacity="0.9" />
    <rect x="242" y="140" width="28" height="232" rx="6" transform="rotate(-45 256 256)" opacity="0.9" />

    <!-- Finials & Trefoils -->
    <circle cx="256" cy="76" r="32" />
    <circle cx="256" cy="436" r="32" />
    <circle cx="76" cy="256" r="32" />
    <circle cx="436" cy="256" r="32" />

    <!-- Corner Trefoils -->
    <circle cx="230" cy="70" r="16" />
    <circle cx="282" cy="70" r="16" />
    <circle cx="230" cy="442" r="16" />
    <circle cx="282" cy="442" r="16" />
    
    <circle cx="70" cy="230" r="16" />
    <circle cx="70" cy="282" r="16" />
    <circle cx="442" cy="230" r="16" />
    <circle cx="442" cy="282" r="16" />
  </g>

  <!-- Center Cross Inlay & Ge'ez Diamond -->
  <polygon points="256,234 278,256 256,278 234,256" fill="#0C2340" />
  <circle cx="256" cy="256" r="8" fill="#FDE68A" />
</svg>`;
}

const targetDir = path.resolve(process.cwd(), 'apps/web/public');

console.log('Generating PWA icons in:', targetDir);

// 1. Generate icon.svg
const svgPath = path.join(targetDir, 'icon.svg');
fs.writeFileSync(svgPath, generateSvg(), 'utf-8');
console.log('✓ Created:', svgPath);

// 2. Generate 192x192 PNG
const png192Path = path.join(targetDir, 'icon-192x192.png');
const png192 = createPng(192, 192, renderCrossIcon(192));
fs.writeFileSync(png192Path, png192);
console.log('✓ Created:', png192Path, `(${png192.length} bytes)`);

// 3. Generate 512x512 PNG
const png512Path = path.join(targetDir, 'icon-512x512.png');
const png512 = createPng(512, 512, renderCrossIcon(512));
fs.writeFileSync(png512Path, png512);
console.log('✓ Created:', png512Path, `(${png512.length} bytes)`);

// 4. Generate apple-touch-icon.png (180x180)
const appleTouchPath = path.join(targetDir, 'apple-touch-icon.png');
const appleTouch = createPng(180, 180, renderCrossIcon(180));
fs.writeFileSync(appleTouchPath, appleTouch);
console.log('✓ Created:', appleTouchPath, `(${appleTouch.length} bytes)`);

// 5. Generate favicon-32x32.png and favicon.ico
const faviconPath = path.join(targetDir, 'favicon.ico');
const favicon32 = createPng(32, 32, renderCrossIcon(32));
fs.writeFileSync(faviconPath, favicon32);
console.log('✓ Created:', faviconPath, `(${favicon32.length} bytes)`);

console.log('🎉 All PWA icon assets generated successfully!');
