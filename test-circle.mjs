import sharp from "sharp";
import { writeFile } from "node:fs/promises";

async function main() {
  const english = "a clean water droplet";
  const prompt = encodeURIComponent(`A highly polished, modern iOS-style 2D vector flat-design app icon representing "${english}". 
  The icon subject must be vibrant, simple, and perfectly centered. 
  The background MUST be a completely solid, bright, highly contrasting color (like deep blue or vivid purple) that fills the entire frame.
  No gradients, no shading, no text, no letters. Extremely clean and minimalist.`);
  
  const seed = Math.floor(Math.random() * 100000);
  const url = `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&model=flux&nologo=true&seed=${seed}`;
  
  console.log("Fetching...", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error("API failed");
  const buffer = Buffer.from(await res.arrayBuffer());
  
  // Cut a perfect circle
  const size = 256;
  const circleSvg = `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#fff"/></svg>`;
  
  const finalWebp = await sharp(buffer)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: Buffer.from(circleSvg), blend: 'dest-in' }])
    .webp({ quality: 90 })
    .toBuffer();
    
  await writeFile("test-air-circle.webp", finalWebp);
  console.log("Saved test-air-circle.webp!");
}
main();
