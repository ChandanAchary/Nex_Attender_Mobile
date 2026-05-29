/**
 * Builds all app assets from a single master logo image.
 *
 * 1. Save your logo (the pin "Ni" mark) into the project as:
 *        assets/logo-master.png        (square, ~1024x1024 recommended)
 * 2. Run:  node scripts/gen-from-master.cjs
 *
 * Produces icon.png, splash-icon.png, adaptive-icon.png and favicon.png with
 * the correct sizes/padding for Expo. PNG or JPG master accepted.
 */
const Jimp = require("jimp");
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "assets");
const CANDIDATES = ["logo-master.png", "logo-master.jpg", "logo-master.jpeg", "logo.png"];

const WHITE = 0xffffffff;
const TRANSPARENT = 0x00000000;

function centered(master, canvasSize, fitSize, bg) {
  const canvas = new Jimp(canvasSize, canvasSize, bg);
  const logo = master.clone().contain(fitSize, fitSize);
  const offset = Math.round((canvasSize - fitSize) / 2);
  canvas.composite(logo, offset, offset);
  return canvas;
}

/**
 * Makes the logo's background transparent by flood-filling light/near-grey
 * pixels inward from the image edges. The colourful pin stops the flood, and
 * the pin's enclosed white interior (behind the "N") is never reached, so it
 * stays intact — only the outer white square + drop shadow are removed.
 */
function removeBackground(img) {
  const { width, height, data } = img.bitmap;
  const seen = new Uint8Array(width * height);
  const stack = [];
  const isBg = (p) => {
    const i = p * 4;
    if (data[i + 3] < 8) return true;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    return max > 200 && max - min < 30; // light & near-grey (white square + shadow)
  };
  const visit = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (seen[p]) return;
    seen[p] = 1;
    if (isBg(p)) {
      data[p * 4 + 3] = 0;
      stack.push(p);
    }
  };
  for (let x = 0; x < width; x++) { visit(x, 0); visit(x, height - 1); }
  for (let y = 0; y < height; y++) { visit(0, y); visit(width - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % width, y = (p / width) | 0;
    visit(x + 1, y); visit(x - 1, y); visit(x, y + 1); visit(x, y - 1);
  }
  return img;
}

(async () => {
  const found = CANDIDATES.map((c) => path.join(dir, c)).find((p) => fs.existsSync(p));
  if (!found) {
    console.error(
      "\n  No master logo found.\n" +
        "  Save your logo as  assets/logo-master.png  (square, ~1024px) and re-run:\n" +
        "      node scripts/gen-from-master.cjs\n",
    );
    process.exit(1);
  }

  const master = await Jimp.read(found);

  // Home-screen icon: full-bleed on white (square; OS rounds the corners).
  const icon = centered(master, 1024, 1024, WHITE);
  await icon.writeAsync(path.join(dir, "icon.png"));

  // Splash + in-app launch: pin with the white square removed, so it floats
  // on the (indigo) splash instead of sitting in a white box.
  const pin = removeBackground(master.clone());
  const splash = centered(pin, 1024, 720, TRANSPARENT);
  await splash.writeAsync(path.join(dir, "splash-icon.png"));

  // Android adaptive foreground: padded into the centre "safe zone" on white
  // (app.json sets android.adaptiveIcon.backgroundColor to #ffffff).
  const adaptive = centered(master, 1024, 720, WHITE);
  await adaptive.writeAsync(path.join(dir, "adaptive-icon.png"));

  // Web favicon.
  await icon.clone().resize(48, 48).writeAsync(path.join(dir, "favicon.png"));

  console.log(`Generated icon / splash-icon / adaptive-icon / favicon from ${path.basename(found)}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
