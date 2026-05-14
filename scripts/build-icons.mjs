// Rasterises public/icon.svg into the PNG sizes the PWA manifest needs.
// Run on demand: `node scripts/build-icons.mjs` — the SVG stays the source
// of truth so updating the logo means editing one file.
//
// Outputs:
//   public/icon-192.png           — any-purpose 192×192 (legacy)
//   public/icon-512.png           — any-purpose 512×512 (modern)
//   public/icon-512-maskable.png  — 512×512 with a safe 12.5% inner-area
//                                   inset for Android adaptive-icon masking
//                                   (per the maskable-icon spec).
import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(ROOT, 'public/icon.svg')

const svg = await readFile(SRC)

// Plain renders: SVG → PNG at the requested raster size. `density: 384`
// pushes librsvg's internal raster grid up so anti-aliasing on the
// gradients + hibiscus petals stays clean at scale.
async function renderPlain(size, outName) {
  const buf = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  await writeFile(resolve(ROOT, 'public', outName), buf)
  console.log(`✓ ${outName} (${size}×${size})`)
}

// Maskable render: render at 80% of the canvas then composite onto a
// full-bleed background of the same deep-slate the SVG opens with, so
// Android adaptive-icon masking never crops any of the M / hibiscus.
async function renderMaskable(size, outName) {
  const inner = Math.round(size * 0.8)
  const innerBuf = await sharp(svg, { density: 384 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  const composite = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 15, g: 23, b: 42, alpha: 1 } },
  })
    .composite([{ input: innerBuf, gravity: 'center' }])
    .png()
    .toBuffer()
  await writeFile(resolve(ROOT, 'public', outName), composite)
  console.log(`✓ ${outName} (${size}×${size}, maskable)`)
}

await renderPlain(192, 'icon-192.png')
await renderPlain(512, 'icon-512.png')
await renderMaskable(512, 'icon-512-maskable.png')

console.log('Done.')
