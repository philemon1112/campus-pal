// Regenerates the PWA PNG icons from the two SVG sources in public/.
// Run with: node scripts/generate-icons.mjs
import sharp from 'sharp';
import path from 'node:path';

const publicDir = path.resolve(import.meta.dirname, '../public');

const jobs = [
  { src: 'icon.svg', out: 'icon-192.png', size: 192 },
  { src: 'icon.svg', out: 'icon-512.png', size: 512 },
  { src: 'icon-maskable-src.svg', out: 'icon-512-maskable.png', size: 512 },
  { src: 'icon-maskable-src.svg', out: 'apple-touch-icon.png', size: 180 },
];

for (const { src, out, size } of jobs) {
  await sharp(path.join(publicDir, src))
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, out));
  console.log(`wrote ${out} (${size}x${size})`);
}
