#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function color(hex) {
  const value = hex.replace('#', '');
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function setPixel(png, x, y, rgba) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
    return;
  }
  const index = (png.width * y + x) << 2;
  png.data[index] = rgba.r;
  png.data[index + 1] = rgba.g;
  png.data[index + 2] = rgba.b;
  png.data[index + 3] = rgba.a ?? 255;
}

function drawRect(png, x0, y0, x1, y1, rgba) {
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      setPixel(png, x, y, rgba);
    }
  }
}

function createGradientBackground(png, topHex, bottomHex) {
  const top = color(topHex);
  const bottom = color(bottomHex);
  for (let y = 0; y < png.height; y += 1) {
    const t = y / Math.max(1, png.height - 1);
    const r = Math.round(top.r + (bottom.r - top.r) * t);
    const g = Math.round(top.g + (bottom.g - top.g) * t);
    const b = Math.round(top.b + (bottom.b - top.b) * t);
    for (let x = 0; x < png.width; x += 1) {
      setPixel(png, x, y, { r, g, b, a: 255 });
    }
  }
}

function hasOpaqueNeighbor(alphaMap, width, height, x, y, radius) {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }
      if (alphaMap[ny * width + nx] > 24) {
        return true;
      }
    }
  }
  return false;
}

function rgbToHsl(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: lightness };
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue;

  switch (max) {
    case red:
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
      break;
    case green:
      hue = (blue - red) / delta + 2;
      break;
    default:
      hue = (red - green) / delta + 4;
      break;
  }

  return { h: hue / 6, s: saturation, l: lightness };
}

function hueToRgb(p, q, t) {
  let value = t;
  if (value < 0) {
    value += 1;
  }
  if (value > 1) {
    value -= 1;
  }
  if (value < 1 / 6) {
    return p + (q - p) * 6 * value;
  }
  if (value < 1 / 2) {
    return q;
  }
  if (value < 2 / 3) {
    return p + (q - p) * (2 / 3 - value) * 6;
  }
  return p;
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: clamp(Math.round(hueToRgb(p, q, h + 1 / 3) * 255)),
    g: clamp(Math.round(hueToRgb(p, q, h) * 255)),
    b: clamp(Math.round(hueToRgb(p, q, h - 1 / 3) * 255))
  };
}

function transformPixel(r, g, b, mode) {
  const hsl = rgbToHsl(r, g, b);

  if (mode === 'dark') {
    const nextLightness =
      hsl.l < 0.4 ? 0.58 + hsl.l * 0.18 : Math.min(0.82, hsl.l + 0.1);
    const nextSaturation = Math.min(1, hsl.s * 1.08 + 0.03);
    return hslToRgb(hsl.h, nextSaturation, nextLightness);
  }

  const nextLightness =
    hsl.l > 0.56 ? Math.max(0.3, hsl.l * 0.72) : Math.max(0.18, hsl.l * 0.9);
  const nextSaturation = Math.min(1, hsl.s * 1.04 + 0.02);
  return hslToRgb(hsl.h, nextSaturation, nextLightness);
}

function createVariantFromBase(basePng, mode) {
  const width = basePng.width;
  const height = basePng.height;
  const result = new PNG({ width, height });
  const alphaMap = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (width * y + x) << 2;
      alphaMap[y * width + x] = basePng.data[index + 3];
    }
  }

  const outline =
    mode === 'dark'
      ? { r: 244, g: 250, b: 255, a: 110 }
      : { r: 15, g: 23, b: 42, a: 110 };
  const halo =
    mode === 'dark'
      ? { r: 56, g: 189, b: 248, a: 34 }
      : { r: 15, g: 23, b: 42, a: 28 };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (width * y + x) << 2;
      const alpha = alphaMap[y * width + x];

      if (alpha > 0) {
        const transformed = transformPixel(
          basePng.data[index],
          basePng.data[index + 1],
          basePng.data[index + 2],
          mode
        );
        result.data[index] = transformed.r;
        result.data[index + 1] = transformed.g;
        result.data[index + 2] = transformed.b;
        result.data[index + 3] = alpha;
        continue;
      }

      if (hasOpaqueNeighbor(alphaMap, width, height, x, y, 1)) {
        result.data[index] = outline.r;
        result.data[index + 1] = outline.g;
        result.data[index + 2] = outline.b;
        result.data[index + 3] = outline.a;
        continue;
      }

      if (hasOpaqueNeighbor(alphaMap, width, height, x, y, 2)) {
        result.data[index] = halo.r;
        result.data[index + 1] = halo.g;
        result.data[index + 2] = halo.b;
        result.data[index + 3] = halo.a;
      }
    }
  }

  return result;
}

function writeLabel(png, text, hex) {
  const fg = color(hex);
  const pattern = {
    K: ['1001', '1010', '1100', '1010', '1001'],
    I: ['111', '010', '010', '010', '111'],
    C: ['1111', '1000', '1000', '1000', '1111'],
    A: ['0110', '1001', '1111', '1001', '1001'],
    D: ['1110', '1001', '1001', '1001', '1110'],
    S: ['1111', '1000', '1110', '0001', '1111'],
    T: ['11111', '00100', '00100', '00100', '00100'],
    U: ['1001', '1001', '1001', '1001', '1111'],
    O: ['0110', '1001', '1001', '1001', '0110']
  };

  let cursorX = 24;
  const cursorY = png.height - 52;
  for (const char of text) {
    const glyph = pattern[char];
    if (!glyph) {
      cursorX += 16;
      continue;
    }
    glyph.forEach((row, rowIndex) => {
      [...row].forEach((cell, colIndex) => {
        if (cell === '1') {
          drawRect(
            png,
            cursorX + colIndex * 6,
            cursorY + rowIndex * 6,
            cursorX + colIndex * 6 + 5,
            cursorY + rowIndex * 6 + 5,
            { ...fg, a: 255 }
          );
        }
      });
    });
    cursorX += (glyph[0]?.length ?? 4) * 6 + 10;
  }
}

function createScreenshot(filePath, title, top, bottom) {
  const png = new PNG({ width: 1280, height: 720 });
  createGradientBackground(png, top, bottom);
  drawRect(png, 32, 32, 1248, 96, { r: 15, g: 23, b: 42, a: 220 });
  drawRect(png, 32, 112, 1248, 688, { r: 10, g: 17, b: 33, a: 180 });
  drawRect(png, 72, 164, 1180, 640, { r: 245, g: 248, b: 250, a: 245 });

  for (let x = 132; x < 1120; x += 120) {
    drawRect(png, x, 200, x + 8, 600, { r: 48, g: 122, b: 206, a: 255 });
  }
  for (let y = 220; y < 580; y += 80) {
    drawRect(png, 132, y, 1110, y + 6, { r: 104, g: 211, b: 145, a: 180 });
  }
  writeLabel(png, title.toUpperCase(), '#0F172A');
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'assets');
const screenshotsDir = path.join(assetsDir, 'screenshots');
const baseIconPath = path.join(assetsDir, 'icon.png');

ensureDir(screenshotsDir);

if (!fs.existsSync(baseIconPath)) {
  throw new Error(
    'Missing assets/icon.png. Provide your source icon manually; this script will only generate icon-dark.png and icon-light.png from that file.'
  );
}

const baseIcon = PNG.sync.read(fs.readFileSync(baseIconPath));
const darkVariant = createVariantFromBase(baseIcon, 'dark');
const lightVariant = createVariantFromBase(baseIcon, 'light');

fs.writeFileSync(path.join(assetsDir, 'icon-dark.png'), PNG.sync.write(darkVariant));
fs.writeFileSync(path.join(assetsDir, 'icon-light.png'), PNG.sync.write(lightVariant));

createScreenshot(
  path.join(screenshotsDir, 'schematic-viewer.png'),
  'Schematic',
  '#0f172a',
  '#134e4a'
);
createScreenshot(
  path.join(screenshotsDir, 'pcb-viewer.png'),
  'PCB Studio',
  '#111827',
  '#1d4ed8'
);
createScreenshot(
  path.join(screenshotsDir, 'bom-table.png'),
  'BOM Table',
  '#172554',
  '#0369a1'
);
createScreenshot(
  path.join(screenshotsDir, 'drc-results.png'),
  'DRC Results',
  '#1f2937',
  '#7c3aed'
);
createScreenshot(
  path.join(screenshotsDir, 'component-search.png'),
  'Component Search',
  '#082f49',
  '#0f766e'
);
createScreenshot(
  path.join(screenshotsDir, 'git-diff.png'),
  'Git Diff',
  '#172554',
  '#7c2d12'
);
createScreenshot(
  path.join(screenshotsDir, 'ai-assistant.png'),
  'AI Assist',
  '#1e1b4b',
  '#0f766e'
);
