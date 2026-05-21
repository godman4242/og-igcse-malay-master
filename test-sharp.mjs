import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

async function main() {
  const buffer = await readFile("test-pollinations.jpg");
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
      data[i+3] = 0; // Set Alpha to 0
    }
  }
  const transparentWebp = await sharp(data, { 
    raw: { width: info.width, height: info.height, channels: 4 } 
  }).webp().toBuffer();
  await writeFile("test-pollinations-transparent.webp", transparentWebp);
  console.log("Success!");
}
main();
