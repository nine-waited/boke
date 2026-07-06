import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, "..");
const INPUT = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(desktopRoot, "public/chestnut-transparent.png");
const OUTPUT = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(desktopRoot, "public/chestnut-os-icon.png");
const SIZE = 1024;
const PADDING = 0.06;

const meta = await sharp(INPUT).metadata();
const inner = Math.round(SIZE * (1 - PADDING * 2));
const resized = await sharp(INPUT)
  .resize(inner, inner, { fit: "inside", withoutEnlargement: false })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: SIZE,
    height: SIZE,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: resized, gravity: "center" }])
  .png()
  .toFile(OUTPUT);

console.log(`[logo] Wrote square OS icon source ${meta.width}x${meta.height} -> ${OUTPUT}`);
