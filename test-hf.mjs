import { HfInference } from "@huggingface/inference";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const hf = new HfInference(process.env.HF_TOKEN);

async function main() {
  try {
    console.log("Generating image with FLUX...");
    const imageBlob = await hf.textToImage({
      model: 'black-forest-labs/FLUX.1-schnell',
      inputs: 'A minimalist flat-design vector icon of a red apple fruit. Pure solid white background. No shading, thick black outlines.',
    });
    
    const buffer = Buffer.from(await imageBlob.arrayBuffer());
    
    // Remove white background
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
        data[i+3] = 0; // Set Alpha to 0
      }
    }
    
    const transparentWebp = await sharp(data, { 
      raw: { width: info.width, height: info.height, channels: 4 } 
    }).webp().toBuffer();

    await writeFile("test-transparent.webp", transparentWebp);
    console.log("Saved test-transparent.webp!");
  } catch (error) {
    console.error("Error:", error.message);
  }
}
main();
