const fs = require('node:fs');
const path = require('node:path');

const limits = [
  { file: path.join('dist', 'extension.js'), maxBytes: 200 * 1024 },
  { file: path.join('dist', 'exceljs.js'), maxBytes: 2 * 1024 * 1024 },
  { file: path.join('media', 'kicanvas', 'kicanvas.js'), maxBytes: 2 * 1024 * 1024 }
];

let failed = false;
for (const limit of limits) {
  if (!fs.existsSync(limit.file)) {
    console.error(`Missing bundle artifact: ${limit.file}`);
    failed = true;
    continue;
  }
  const size = fs.statSync(limit.file).size;
  const sizeKb = (size / 1024).toFixed(1);
  const maxKb = (limit.maxBytes / 1024).toFixed(1);
  console.log(`${limit.file}: ${sizeKb} KiB / ${maxKb} KiB`);
  if (size > limit.maxBytes) {
    console.error(`Bundle size regression: ${limit.file} exceeds ${maxKb} KiB.`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
