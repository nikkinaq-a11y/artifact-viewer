/**
 * Generate the PWA / desktop icons. Drawn procedurally rather than exported from a design
 * tool so the icons can be regenerated without any external file.
 *
 * A lit artifact on a pedestal, reduced to shapes that still read at 32 px.
 *
 * Usage: node scripts/make-icons.mjs
 */
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('public', { recursive: true });

const BG = [10, 10, 13];
const STONE = [214, 202, 186];
const PEDESTAL = [92, 92, 100];

function draw(size) {
  const png = new PNG({ width: size, height: size });
  const s = (v) => Math.round(v * size);

  const put = (x, y, [r, g, b], a = 1) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (size * y + x) << 2;
    png.data[i] = Math.round(png.data[i] * (1 - a) + r * a);
    png.data[i + 1] = Math.round(png.data[i + 1] * (1 - a) + g * a);
    png.data[i + 2] = Math.round(png.data[i + 2] * (1 - a) + b * a);
    png.data[i + 3] = 255;
  };

  // Background with a soft pool of light behind the artifact, echoing the studio.
  const cx = s(0.5);
  const cy = s(0.42);
  const glow = s(0.42);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy) / glow;
      const lift = Math.max(0, 1 - d * d) * 26;
      put(x, y, [BG[0] + lift, BG[1] + lift, BG[2] + lift * 1.1]);
    }
  }

  // Pedestal: a plain block, front face slightly brighter than the side.
  const pTop = s(0.66);
  const pL = s(0.3);
  const pR = s(0.7);
  for (let y = pTop; y < s(0.9); y++) {
    for (let x = pL; x < pR; x++) {
      const shade = x > s(0.58) ? 0.72 : 1;
      put(x, y, PEDESTAL.map((c) => c * shade));
    }
  }
  // Highlight along the top edge so the block reads as three-dimensional.
  for (let x = pL; x < pR; x++) for (let y = pTop; y < pTop + s(0.018); y++) put(x, y, [140, 140, 150]);

  // Artifact: a tapered mask-like form, lit from the left.
  const top = s(0.16);
  const bottom = pTop;
  for (let y = top; y < bottom; y++) {
    const t = (y - top) / (bottom - top);
    // Narrow at the crown, widest around the middle, tucked in at the base.
    const halfW = s(0.055 + 0.075 * Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.06)));
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      const across = (x - (cx - halfW)) / (2 * halfW);
      const shade = 0.55 + 0.45 * Math.cos((across - 0.32) * 1.9);
      put(Math.round(x), y, STONE.map((c) => c * Math.max(0.3, Math.min(1, shade))));
    }
  }

  // Two eye slots — the detail that makes it read as an object rather than a blob.
  const eyeY = s(0.36);
  for (let dy = 0; dy < s(0.055); dy++) {
    for (let dx = 0; dx < s(0.028); dx++) {
      put(cx - s(0.045) + dx, eyeY + dy, [26, 22, 20]);
      put(cx + s(0.02) + dx, eyeY + dy, [26, 22, 20]);
    }
  }

  return PNG.sync.write(png);
}

for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, draw(size));
  console.log(`wrote public/icon-${size}.png`);
}

// A tiny SVG stand-in for the browser tab.
writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#0a0a0d"/>
  <rect x="9" y="22" width="14" height="6" fill="#5c5c64"/>
  <path d="M16 5c3 3 4 8 4 12v5h-8v-5c0-4 1-9 4-12z" fill="#d6caba"/>
  <rect x="13.5" y="12" width="2" height="3.5" fill="#1a1614"/>
  <rect x="16.5" y="12" width="2" height="3.5" fill="#1a1614"/>
</svg>`,
);
console.log('wrote public/favicon.svg');