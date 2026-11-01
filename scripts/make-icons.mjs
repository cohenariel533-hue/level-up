/**
 * Generates the app icons (PNG) with no image tools needed: two glowing
 * "level up" chevrons on a deep violet background, drawn pixel by pixel.
 *
 *   npm run icons   → writes public/icons/*.png
 *
 * Tweak COLORS or the chevron shape below and re-run to restyle the icon.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../public/icons/', import.meta.url);

const COLORS = {
  bgTop: [26, 20, 64],
  bgBottom: [6, 6, 12],
  glow: [124, 108, 255],
  chevronLeft: [196, 181, 253],
  chevronRight: [90, 224, 255],
};

// ---------- tiny PNG encoder ----------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- drawing ----------
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** Distance from point p to segment a–b. */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
/** Distance to an upward chevron centred at (0, cy), scaled by s. */
function chevronDist(u, v, cy, s) {
  const w = 0.42 * s, h = 0.42 * s;
  return Math.min(segDist(u, v, -w, cy + h / 2, 0, cy - h / 2), segDist(u, v, 0, cy - h / 2, w, cy + h / 2));
}

/** scale < 1 keeps the artwork inside the maskable "safe zone". */
function drawIcon(size, scale) {
  const px = Buffer.alloc(size * size * 4);
  const pixel = 2 / size; // one pixel in normalised units
  const half = 0.085 * scale; // chevron stroke half-width
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = ((x + 0.5) / size) * 2 - 1;
      const v = ((y + 0.5) / size) * 2 - 1;

      // background: vertical gradient + soft violet glow behind the chevrons
      let c = mix(COLORS.bgTop, COLORS.bgBottom, (v + 1) / 2);
      const glow = 0.45 * Math.exp(-(u * u + (v - 0.05) ** 2) / 0.28);
      c = mix(c, COLORS.glow, glow);

      // two chevrons: the top one bright, the lower one fainter ("leveling up")
      const fg = mix(COLORS.chevronLeft, COLORS.chevronRight, (u + 1) / 2);
      for (const [cy, strength] of [[0.24 * scale, 0.45], [-0.12 * scale, 1]]) {
        const d = chevronDist(u, v, cy, scale);
        const a = clamp01((half - d) / pixel + 0.5) * strength;
        c = mix(c, fg, a);
      }

      const i = (y * size + x) * 4;
      px[i] = Math.round(c[0]);
      px[i + 1] = Math.round(c[1]);
      px[i + 2] = Math.round(c[2]);
      px[i + 3] = 255;
    }
  }
  return encodePNG(size, px);
}

mkdirSync(OUT, { recursive: true });
const files = {
  'icon-192.png': drawIcon(192, 1),
  'icon-512.png': drawIcon(512, 1),
  'maskable-512.png': drawIcon(512, 0.72),
  'apple-touch-icon.png': drawIcon(180, 0.92),
};
for (const [name, data] of Object.entries(files)) {
  writeFileSync(new URL(name, OUT), data);
  console.log('wrote public/icons/' + name);
}
