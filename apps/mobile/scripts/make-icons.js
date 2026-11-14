// Gera os ícones provisórios do Ministre (fundo escuro, quadrado laranja, "M" escuro).
// Sem dependências: desenha os pixels e grava PNG com zlib. Uso: node scripts/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [0x0c, 0x0c, 0x0d];
const ORANGE = [0xf7, 0x73, 0x1c];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Coordenadas em unidades de 0..1 do ícone.
function insideRoundRect(u, v, x0, y0, x1, y1, r) {
  if (u < x0 || u > x1 || v < y0 || v > y1) return false;
  const cx = Math.min(Math.max(u, x0 + r), x1 - r);
  const cy = Math.min(Math.max(v, y0 + r), y1 - r);
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
}

function insidePolygon(u, v, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// "M" geométrico, centrado.
const M = [
  [0.3, 0.68], [0.3, 0.32], [0.37, 0.32], [0.5, 0.5], [0.63, 0.32], [0.7, 0.32],
  [0.7, 0.68], [0.62, 0.68], [0.62, 0.45], [0.5, 0.61], [0.38, 0.45], [0.38, 0.68],
];

function shade(u, v, inset) {
  const a = inset;
  const b = 1 - inset;
  if (!insideRoundRect(u, v, a, a, b, b, 0.22 * (b - a))) return BG;
  const mu = (u - a) / (b - a);
  const mv = (v - a) / (b - a);
  return insidePolygon(mu, mv, M) ? BG : ORANGE;
}

function render(size, inset) {
  const SS = 4; // supersampling para bordas suaves
  return png(size, (x, y) => {
    const acc = [0, 0, 0];
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const c = shade((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size, inset);
        acc[0] += c[0];
        acc[1] += c[1];
        acc[2] += c[2];
      }
    }
    return acc.map((n) => Math.round(n / (SS * SS)));
  });
}

const out = path.join(__dirname, '..', 'public', 'app-icons');
fs.mkdirSync(out, { recursive: true });
const files = {
  'icon-192.png': render(192, 0.08),
  'icon-512.png': render(512, 0.08),
  'icon-maskable-512.png': render(512, 0.18),
  'apple-touch-icon.png': render(180, 0.0),
};
for (const [name, data] of Object.entries(files)) {
  fs.writeFileSync(path.join(out, name), data);
  console.log('ok', name, data.length, 'bytes');
}
