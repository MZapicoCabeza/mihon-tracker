import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#144633" />
      <stop offset="50%" stop-color="#0E2F22" />
      <stop offset="100%" stop-color="#071912" />
    </linearGradient>

    <!-- Accent Glow -->
    <radialGradient id="auraGlow" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#34D399" stop-opacity="0.35" />
      <stop offset="60%" stop-color="#10B981" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Book Left Page Gradient -->
    <linearGradient id="pageLeft" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E2F4EB" />
      <stop offset="85%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#D1EADE" />
    </linearGradient>

    <!-- Book Right Page Gradient -->
    <linearGradient id="pageRight" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#CFE7DC" />
      <stop offset="15%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#E2F4EB" />
    </linearGradient>

    <!-- Coral Bookmark Ribbon -->
    <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB7185" />
      <stop offset="100%" stop-color="#E11D48" />
    </linearGradient>

    <!-- Gold Accent Star -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>

    <!-- Drop Shadow Filter -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.45" />
    </filter>
    <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- App Icon Squircle Base -->
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#bgGrad)" />
  <rect x="16" y="16" width="480" height="480" rx="112" fill="none" stroke="#34D399" stroke-width="3" stroke-opacity="0.28" />

  <!-- Background Aura Glow -->
  <circle cx="256" cy="240" r="210" fill="url(#auraGlow)" />

  <!-- Speed / Reading Telemetry Pulse Rings -->
  <ellipse cx="256" cy="385" rx="150" ry="24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-dasharray="8 8" opacity="0.3" />
  <ellipse cx="256" cy="385" rx="110" ry="16" fill="none" stroke="#34D399" stroke-width="3" stroke-dasharray="12 6" opacity="0.5" />

  <!-- Manga Book (Main Illustration) with Shadow -->
  <g filter="url(#shadow)">
    <!-- Book Base / Cover Rim Backing -->
    <path d="M 100 340 C 180 360, 235 348, 256 325 C 277 348, 332 360, 412 340 L 412 180 C 332 200, 277 188, 256 165 C 235 188, 180 200, 100 180 Z"
          fill="#064E3B" opacity="0.8" />

    <!-- Left Open Page Surface -->
    <path d="M 110 330 C 185 348, 235 336, 253 315 L 253 155 C 235 176, 185 188, 110 170 Z"
          fill="url(#pageLeft)" />

    <!-- Left Page Under-layers (Page thickness) -->
    <path d="M 108 333 C 183 351, 233 339, 251 318" fill="none" stroke="#9BD1B9" stroke-width="2" />
    <path d="M 106 336 C 181 354, 231 342, 249 321" fill="none" stroke="#68B693" stroke-width="2" />

    <!-- Right Open Page Surface -->
    <path d="M 259 315 C 277 336, 327 348, 402 330 L 402 170 C 327 188, 277 176, 259 155 Z"
          fill="url(#pageRight)" />

    <!-- Right Page Under-layers -->
    <path d="M 261 318 C 279 339, 329 351, 404 333" fill="none" stroke="#9BD1B9" stroke-width="2" />
    <path d="M 263 321 C 281 342, 331 354, 406 336" fill="none" stroke="#68B693" stroke-width="2" />

    <!-- Book Spine Crease Depth -->
    <path d="M 253 155 Q 256 240 253 315 L 259 315 Q 256 240 259 155 Z" fill="#064E3B" opacity="0.35" />

    <!-- Manga Panels on Left Page -->
    <rect x="135" y="196" width="46" height="52" rx="4" fill="#064E3B" opacity="0.12" />
    <rect x="187" y="194" width="48" height="28" rx="4" fill="#064E3B" opacity="0.14" />
    <rect x="187" y="226" width="48" height="22" rx="4" fill="#064E3B" opacity="0.1" />
    <rect x="135" y="254" width="100" height="42" rx="4" fill="#064E3B" opacity="0.12" />

    <!-- Reading Progress Speedlines on Right Page -->
    <line x1="278" y1="202" x2="380" y2="198" stroke="#059669" stroke-width="3" stroke-linecap="round" opacity="0.25" />
    <line x1="278" y1="216" x2="350" y2="213" stroke="#059669" stroke-width="3" stroke-linecap="round" opacity="0.25" />
    <line x1="278" y1="230" x2="375" y2="228" stroke="#059669" stroke-width="3" stroke-linecap="round" opacity="0.25" />
    
    <!-- Mini Tracker Metric Bars on Right Page -->
    <rect x="278" y="252" width="60" height="6" rx="3" fill="#10B981" opacity="0.75" />
    <rect x="278" y="264" width="85" height="6" rx="3" fill="#34D399" opacity="0.7" />
    <rect x="278" y="276" width="45" height="6" rx="3" fill="#6EE7B7" opacity="0.65" />
  </g>

  <!-- Hanging Coral Bookmark Ribbon -->
  <path d="M 248 152 L 264 152 L 264 265 L 256 254 L 248 265 Z" fill="url(#ribbonGrad)" filter="url(#shadow)" />

  <!-- Active Reading Glowing Sparkles / Achievement Star -->
  <g transform="translate(365, 110)" filter="url(#glowFilter)">
    <path d="M 0 -22 Q 0 0 22 0 Q 0 0 0 22 Q 0 0 -22 0 Q 0 0 0 -22 Z" fill="url(#goldGrad)" />
    <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
  </g>

  <!-- Secondary Mini Star -->
  <g transform="translate(130, 140)" opacity="0.85">
    <path d="M 0 -11 Q 0 0 11 0 Q 0 0 0 11 Q 0 0 -11 0 Q 0 0 0 -11 Z" fill="#FDE68A" />
  </g>
</svg>`;

const publicDir = path.resolve('tracker-app/public');

// 1. Write SVG icon & favicon
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf-8');
console.log('✅ Generated icon.svg & favicon.svg');

// 2. Pure PNG Encoder using zlib
function createPNG(width, height, getPixel) {
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }
  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const scanlineLen = 1 + width * 4;
  const rawData = Buffer.alloc(scanlineLen * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLen;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Procedural renderer matching the vector design
function renderIconPixel(px, py, W, H) {
  // Normalize to 0..1
  const u = px / W;
  const v = py / H;
  const cx = u - 0.5;
  const cy = v - 0.5;

  // Squircle distance: (2x)^4 + (2y)^4 <= 0.82^4
  const sqDist = Math.pow(Math.abs(cx * 2), 4.5) + Math.pow(Math.abs(cy * 2), 4.5);
  if (sqDist > 0.88) {
    return [0, 0, 0, 0]; // Transparent outside squircle
  }

  // Smooth anti-aliased edge
  let alpha = 255;
  if (sqDist > 0.80) {
    alpha = Math.round(255 * (1 - (sqDist - 0.80) / 0.08));
    alpha = Math.max(0, Math.min(255, alpha));
  }

  // Background Gradient from #144633 (20, 70, 51) to #071912 (7, 25, 18)
  const gradT = (u + v) / 2;
  let r = Math.round(20 * (1 - gradT) + 7 * gradT);
  let g = Math.round(70 * (1 - gradT) + 25 * gradT);
  let b = Math.round(51 * (1 - gradT) + 18 * gradT);

  // Subtle center radial glow (#34D399)
  const glowDist = Math.sqrt(cx * cx + (cy + 0.05) * (cy + 0.05));
  if (glowDist < 0.45) {
    const glowAmt = (1 - glowDist / 0.45) * 0.35;
    r = Math.round(r * (1 - glowAmt) + 52 * glowAmt);
    g = Math.round(g * (1 - glowAmt) + 211 * glowAmt);
    b = Math.round(b * (1 - glowAmt) + 153 * glowAmt);
  }

  // Book pages bounding box: u in [0.22, 0.78], v in [0.32, 0.70]
  const inBookX = u >= 0.22 && u <= 0.78;
  const spineDist = Math.abs(u - 0.50);

  // Curved page bottom line
  const pageBaseV = 0.65 - Math.sin(spineDist * Math.PI / 0.28) * 0.04;
  const pageTopV = 0.35 - Math.sin(spineDist * Math.PI / 0.28) * 0.04;

  if (inBookX && v >= pageTopV && v <= pageBaseV) {
    // Inside open book
    const isLeftPage = u < 0.495;
    const isRightPage = u > 0.505;
    const isSpine = !isLeftPage && !isRightPage;

    if (isSpine) {
      r = 10; g = 45; b = 30; // Deep spine crease
    } else {
      // Paper color (#F4FBF7 to #FFFFFF)
      const pageCurve = Math.sin((u - 0.22) / 0.56 * Math.PI);
      const paperWhite = 240 + Math.round(15 * pageCurve);
      r = paperWhite - 8;
      g = paperWhite;
      b = paperWhite - 4;

      // Bookmark ribbon in center (#FB7185 to #E11D48)
      if (u >= 0.485 && u <= 0.515 && v >= pageTopV - 0.02 && v <= pageTopV + 0.22) {
        // Triangle cutout at bottom of ribbon
        const ribbonTip = pageTopV + 0.22;
        const ribbonDistV = ribbonTip - v;
        const ribbonDistH = Math.abs(u - 0.50) / 0.015;
        if (ribbonDistV > (1 - ribbonDistH) * 0.02) {
          r = 244; g = 63; b = 94; // Coral ribbon
        }
      }

      // Drawing lines on right page
      if (isRightPage && u >= 0.55 && u <= 0.74) {
        // Progress metric bar rows
        if ((v >= 0.44 && v <= 0.46 && u <= 0.72) ||
            (v >= 0.48 && v <= 0.50 && u <= 0.68) ||
            (v >= 0.52 && v <= 0.54 && u <= 0.74)) {
          r = 16; g = 185; b = 129; // Mint green progress lines
        }
      }

      // Manga panels on left page
      if (isLeftPage && u >= 0.26 && u <= 0.45) {
        if ((u <= 0.35 && v >= 0.42 && v <= 0.52) ||
            (u >= 0.37 && v >= 0.42 && v <= 0.47) ||
            (u >= 0.37 && v >= 0.49 && v <= 0.54) ||
            (v >= 0.55 && v <= 0.61)) {
          r = Math.round(r * 0.88);
          g = Math.round(g * 0.88);
          b = Math.round(b * 0.90);
        }
      }
    }
  }

  // Golden star sparkle at top right: center at (0.74, 0.24)
  const starDx = Math.abs(u - 0.74);
  const starDy = Math.abs(v - 0.24);
  if (starDx + starDy * 1.5 < 0.07 || starDx * 1.5 + starDy < 0.07) {
    r = 251; g = 191; b = 36; // Amber gold star
  }

  return [r, g, b, alpha];
}

// Generate PNG sizes
const sizes = [
  { name: 'favicon.png', size: 64 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 }
];

for (const { name, size } of sizes) {
  const buf = createPNG(size, size, renderIconPixel);
  fs.writeFileSync(path.join(publicDir, name), buf);
  console.log(`✅ Generated ${name} (${size}x${size}, ${(buf.length / 1024).toFixed(1)} KB)`);
}

console.log('🚀 All mobile icons generated successfully!');
