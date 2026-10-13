// Gera os arquivos do conjunto de avaliação (PDF, "fotos" JPEG, XML e texto) em evals/classify/fixtures/.
// Uso: npm run eval:fixtures   — não chama nenhuma API e não gasta nada.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import { CASES, type EvalCase, type Line } from "./dataset";

const OUT = join(process.cwd(), "evals", "classify", "fixtures");

async function renderPdf(c: EvalCase): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 790;
  for (const l of c.lines ?? []) {
    const size = l.size ?? 10;
    page.drawText(l.text, { x: 40, y, size, font: l.bold ? bold : font, color: rgb(0.1, 0.1, 0.1), maxWidth: 515 });
    y -= size + 8;
  }
  if (c.hidden) page.drawText(c.hidden, { x: 40, y: 40, size: 4, font, color: rgb(1, 1, 1), maxWidth: 515 });
  return doc.save();
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function renderPhoto(c: EvalCase): Promise<Buffer> {
  const lines: Line[] = c.lines ?? [];
  const width = 1100;
  const height = 120 + lines.length * 46;
  const body = lines
    .map((l, i) => {
      const size = Math.round((l.size ?? 11) * 2.1);
      return `<text x="50" y="${90 + i * 46}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${l.bold ? 700 : 400}" fill="#1d1d1d">${esc(l.text)}</text>`;
    })
    .join("");
  // Papel levemente amarelado com sombra, como uma foto de celular sobre a mesa.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f2e7"/><stop offset="1" stop-color="#ddd6c4"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>${body}</svg>`;
  return sharp(Buffer.from(svg))
    .rotate(c.rotate ?? 0, { background: "#6b6258" })
    .blur(0.7)
    .modulate({ brightness: 0.96 })
    .jpeg({ quality: 68 })
    .toBuffer();
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  for (const c of CASES) {
    let data: Uint8Array | Buffer | string;
    if (c.format === "pdf") data = await renderPdf(c);
    else if (c.format === "photo") data = await renderPhoto(c);
    else data = c.text ?? "";
    writeFileSync(join(OUT, `${c.id}__${c.filename}`), data);
  }
  console.log(`${CASES.length} documentos fictícios gerados em ${OUT}`);
}

main();
