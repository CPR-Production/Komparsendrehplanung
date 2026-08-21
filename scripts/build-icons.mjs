#!/usr/bin/env node
// Erzeugt aus infra/installer/assets/icon.svg alle Icon-Formate, die die drei
// Installer und das Frontend brauchen.
//
// Das läuft bewusst NICHT im Release-Workflow: die Ergebnisse liegen fertig im
// Repo. Ein Icon ändert sich einmal im Jahr, ein Release-Runner müsste aber
// jedes Mal einen Browser mitbringen — und iconutil gibt es ohnehin nur auf
// macOS. Wer die Grafik ändert, ruft das Skript einmal von Hand auf und checkt
// die erzeugten Dateien mit ein.
//
//   node scripts/build-icons.mjs
//
// Voraussetzungen: macOS (sips, iconutil) und Google Chrome als SVG-Rasterer
// (CHROME_BIN übersteuert den Pfad).
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(repoRoot, "infra/installer/assets");
const webPublicDir = join(repoRoot, "apps/web/public");
const workDir = join(repoRoot, "build", "icons");
const masterSvg = readFileSync(join(assetsDir, "icon.svg"), "utf8");

const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
].filter(Boolean);
const chrome = CHROME_CANDIDATES.find((path) => existsSync(path));
if (!chrome) {
  console.error("Kein Chrome gefunden. Pfad über CHROME_BIN setzen.");
  process.exit(1);
}

function step(message) {
  console.log(`\n▸ ${message}`);
}

// --- SVG rastern ------------------------------------------------------------

// Zwei Eigenheiten der Werkzeuge treffen hier aufeinander:
//
// Headless Chrome malt nur den sichtbaren Bereich, und der ist um die Höhe der
// Fensterleiste kleiner als --window-size — unten bliebe also ein Streifen
// leer. Und sips schneidet immer **mittig**; --cropOffset gibt es zwar als
// Option, sie wirkt aber nicht.
//
// Beides zusammen geht auf, wenn die Zeichnung von vornherein mittig im
// Fenster sitzt: halbe Zugabe oben als Rand, halbe unten als Reserve für die
// Fensterleiste. Der mittige Schnitt trifft die Zeichnung dann genau. Die
// Zugabe muss dafür mindestens doppelt so hoch sein wie die Fensterleiste.
const WINDOW_PADDING = 240;

async function renderSvg(svg, size, outPath) {
  const pageDir = join(workDir, "page");
  mkdirSync(pageDir, { recursive: true });
  writeFileSync(join(pageDir, "icon.svg"), svg);
  writeFileSync(
    join(pageDir, "page.html"),
    `<html><body style="margin:0;background:transparent">` +
      `<img src="icon.svg" width="${size}" height="${size}" ` +
      `style="display:block;margin-top:${WINDOW_PADDING / 2}px"></body></html>`,
  );

  // Chrome schreibt den Screenshot und bleibt danach gelegentlich stehen,
  // statt sich zu beenden. Gewartet wird deshalb auf die Datei, nicht auf den
  // Prozess — und der wird anschließend abgeräumt.
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--no-first-run",
      "--no-default-browser-check",
      // Ohne das fragt Chrome den Schlüsselbund und bleibt am Dialog hängen.
      "--use-mock-keychain",
      `--user-data-dir=${join(workDir, "chrome-profile")}`,
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--default-background-color=00000000",
      `--window-size=${size},${size + WINDOW_PADDING}`,
      "--virtual-time-budget=2000",
      `--screenshot=${outPath}`,
      `file://${join(pageDir, "page.html")}`,
    ],
    { stdio: "ignore" },
  );

  try {
    let lastSize = -1;
    for (let waited = 0; waited < 60_000; waited += 250) {
      await new Promise((r) => setTimeout(r, 250));
      if (!existsSync(outPath)) continue;
      // Zweimal dieselbe Größe: sonst liest sips eine halb geschriebene Datei.
      const current = statSync(outPath).size;
      if (current > 0 && current === lastSize) {
        execFileSync("sips", ["-c", String(size), String(size), outPath], { stdio: "ignore" });
        return outPath;
      }
      lastSize = current;
    }
    throw new Error(`Chrome lieferte kein ${outPath}`);
  } finally {
    child.kill("SIGKILL");
  }
}

function resize(sourcePng, size, outPath) {
  cpSync(sourcePng, outPath);
  execFileSync("sips", ["-z", String(size), String(size), outPath], { stdio: "ignore" });
  return outPath;
}

// --- macOS-Variante ---------------------------------------------------------

// Auf macOS füllt ein Icon seine Fläche nicht aus: die Zeichnung sitzt auf
// 824 von 1024 Punkten und wirft einen Schatten. Ohne das steht die App im Dock
// sichtbar größer da als alle anderen. Windows und Linux zeigen dagegen die
// volle Fläche, deshalb zwei Varianten aus derselben Zeichnung.
function macOsVariant() {
  // Kommentare zuerst weg: der Erklärtext in icon.svg erwähnt selbst ein
  // <svg>, und daran bricht die Suche nach dem echten Wurzelelement ab.
  const inner = masterSvg
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <filter id="dock-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g transform="translate(100 88) scale(0.8046875)" filter="url(#dock-shadow)">${inner}</g>
</svg>`;
}

// --- ICO --------------------------------------------------------------------

// Ein eigener Kodierer, weil auf dem Weg hierher keine Bildbibliothek liegt:
// ImageMagick ist nicht vorausgesetzt, und sips kann kein .ico schreiben.
function decodePng(buffer) {
  let offset = 8; // PNG-Signatur
  let header = null;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  // Chrome liefert immer 8 Bit ohne Interlace; alles andere zu unterstützen
  // wäre Code für einen Fall, der hier nicht vorkommt.
  if (!header || header.bitDepth !== 8 || header.interlace !== 0 || ![2, 6].includes(header.colorType)) {
    throw new Error(`PNG-Form nicht unterstützt: ${JSON.stringify(header)}`);
  }

  const channels = header.colorType === 6 ? 4 : 3;
  const { width, height } = header;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(stride * height);

  // Jede Zeile trägt ein Filter-Byte; die Rückrechnung braucht die bereits
  // entfilterte Zeile darüber, läuft also zwingend von oben nach unten.
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prior = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0;
      const b = prior ? prior[x] : 0;
      const c = prior && x >= channels ? prior[x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[x] = value & 0xff;
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = pixels[i * channels];
    rgba[i * 4 + 1] = pixels[i * channels + 1];
    rgba[i * 4 + 2] = pixels[i * channels + 2];
    rgba[i * 4 + 3] = channels === 4 ? pixels[i * channels + 3] : 255;
  }
  return { width, height, rgba };
}

// Ein Eintrag im klassischen DIB-Format: BGRA, Zeilen von unten nach oben, und
// dahinter die 1-Bit-Maske. Die wertet Windows bei 32 Bit nicht mehr aus, sie
// muss aber vorhanden und richtig lang sein, sonst gilt das Icon als defekt.
function dibEntry(png) {
  const { width, height, rgba } = decodePng(png);
  const maskStride = Math.ceil(width / 32) * 4;
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(width, 4);
  header.writeInt32LE(height * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(width * height * 4 + maskStride * height, 20);

  const xor = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const source = (height - 1 - y) * width * 4;
    for (let x = 0; x < width; x++) {
      const from = source + x * 4;
      const to = (y * width + x) * 4;
      xor[to] = rgba[from + 2];
      xor[to + 1] = rgba[from + 1];
      xor[to + 2] = rgba[from];
      xor[to + 3] = rgba[from + 3];
    }
  }
  return Buffer.concat([header, xor, Buffer.alloc(maskStride * height)]);
}

function writeIco(entries, outPath) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(entries.length * 16);
  let offset = 6 + directory.length;
  entries.forEach((entry, index) => {
    const at = index * 16;
    // 256 wird als 0 geschrieben — ein Byte fasst die Größe sonst nicht.
    directory[at] = entry.size === 256 ? 0 : entry.size;
    directory[at + 1] = entry.size === 256 ? 0 : entry.size;
    directory.writeUInt16LE(1, at + 4);
    directory.writeUInt16LE(32, at + 6);
    directory.writeUInt32LE(entry.data.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += entry.data.length;
  });

  writeFileSync(outPath, Buffer.concat([header, directory, ...entries.map((e) => e.data)]));
}

// --- Ablauf -----------------------------------------------------------------

rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });
mkdirSync(webPublicDir, { recursive: true });

step("Zeichnung rastern");
const fullBleed = join(workDir, "full-1024.png");
const macOs = join(workDir, "macos-1024.png");
await renderSvg(masterSvg, 1024, fullBleed);
await renderSvg(macOsVariant(), 1024, macOs);

step("icns bauen");
const iconset = join(workDir, "Komparsendrehplanung.iconset");
mkdirSync(iconset, { recursive: true });
for (const [name, size] of [
  ["icon_16x16", 16],
  ["icon_16x16@2x", 32],
  ["icon_32x32", 32],
  ["icon_32x32@2x", 64],
  ["icon_128x128", 128],
  ["icon_128x128@2x", 256],
  ["icon_256x256", 256],
  ["icon_256x256@2x", 512],
  ["icon_512x512", 512],
  ["icon_512x512@2x", 1024],
]) {
  resize(macOs, size, join(iconset, `${name}.png`));
}
execFileSync("iconutil", ["-c", "icns", iconset, "-o", join(assetsDir, "icon.icns")]);

step("ico bauen");
const icoEntries = [];
for (const size of [16, 24, 32, 48, 64, 128, 256]) {
  const png = readFileSync(resize(fullBleed, size, join(workDir, `ico-${size}.png`)));
  // Ab 256 ist ein eingebettetes PNG das übliche Format; darunter erwarten
  // ältere Windows-Oberflächen das DIB.
  icoEntries.push({ size, data: size === 256 ? png : dibEntry(png) });
}
writeIco(icoEntries, join(assetsDir, "icon.ico"));

step("PNG für Linux und das Frontend");
resize(fullBleed, 512, join(assetsDir, "icon-512.png"));
resize(fullBleed, 180, join(webPublicDir, "apple-touch-icon.png"));
cpSync(join(assetsDir, "icon.svg"), join(webPublicDir, "favicon.svg"));
writeIco(
  [16, 32, 48].map((size) => ({
    size,
    data: dibEntry(readFileSync(resize(fullBleed, size, join(workDir, `fav-${size}.png`)))),
  })),
  join(webPublicDir, "favicon.ico"),
);

console.log("\n✓ icon.icns, icon.ico, icon-512.png und die Favicons erzeugt.");
