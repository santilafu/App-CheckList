/* Genera los PNG de la PWA a partir de public/icon.svg.
   Uso:  node scripts/gen-icons.mjs
   Requiere: sharp (devDependency). */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(raiz, "public");
const svg = readFileSync(join(pub, "icon.svg"));

// Icono normal: el SVG tal cual, en 192 y 512.
const tamanos = [192, 512];

// Icono "maskable": el glyph debe vivir en el 80% central (zona segura) para
// que Android no lo recorte al aplicar su máscara. Lo metemos sobre un fondo
// sólido con padding.
async function generar() {
  for (const t of tamanos) {
    await sharp(svg, { density: 384 })
      .resize(t, t)
      .png()
      .toFile(join(pub, `pwa-${t}.png`));
    console.log(`✓ pwa-${t}.png`);
  }

  // Maskable 512 con padding (zona segura).
  const lado = 512;
  const padding = Math.round(lado * 0.12);
  const interior = lado - padding * 2;
  const glyph = await sharp(svg, { density: 384 }).resize(interior, interior).png().toBuffer();
  await sharp({
    create: { width: lado, height: lado, channels: 4, background: "#0f172a" },
  })
    .composite([{ input: glyph, top: padding, left: padding }])
    .png()
    .toFile(join(pub, "maskable-512.png"));
  console.log("✓ maskable-512.png");

  // apple-touch-icon (iOS): 180x180 sin transparencia.
  await sharp(svg, { density: 384 })
    .resize(180, 180)
    .flatten({ background: "#0f172a" })
    .png()
    .toFile(join(pub, "apple-touch-icon.png"));
  console.log("✓ apple-touch-icon.png");
}

generar().catch((e) => { console.error(e); process.exit(1); });
