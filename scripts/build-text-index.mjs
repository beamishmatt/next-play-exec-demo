#!/usr/bin/env node
// Pre-extracts text from every PDF in public/evidence/ and writes
// public/evidence/text-index.json. Run via `npm run build:text-index`,
// or automatically via the `prebuild` / `predev` hooks.
//
// Note: if a PDF is added to public/evidence/ at runtime, it will not
// appear in the match navigator until this script re-runs.

import { readdirSync, statSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const EVIDENCE_DIR = join(REPO_ROOT, 'public', 'evidence');
const OUTPUT_PATH = join(EVIDENCE_DIR, 'text-index.json');
const FORCE = process.argv.includes('--force');

const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');

const pdfFiles = readdirSync(EVIDENCE_DIR)
  .filter(f => f.toLowerCase().endsWith('.pdf'))
  .sort();

if (pdfFiles.length === 0) {
  console.warn('[text-index] no PDFs found in public/evidence/');
  writeFileSync(OUTPUT_PATH, '{}\n');
  process.exit(0);
}

if (!FORCE && existsSync(OUTPUT_PATH)) {
  const outMtime = statSync(OUTPUT_PATH).mtimeMs;
  const newestPdf = Math.max(...pdfFiles.map(f => statSync(join(EVIDENCE_DIR, f)).mtimeMs));
  const existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'));
  const haveAll = pdfFiles.every(f => existing[`/evidence/${f}`]);
  if (newestPdf < outMtime && haveAll) {
    console.log(`[text-index] up to date (${pdfFiles.length} docs); pass --force to rebuild`);
    process.exit(0);
  }
}

const index = {};
let totalPages = 0;
let totalChars = 0;

for (const filename of pdfFiles) {
  const filePath = join(EVIDENCE_DIR, filename);
  const data = new Uint8Array(readFileSync(filePath));
  const doc = await getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .filter(it => typeof it.str === 'string')
      .map(it => ({ str: it.str }));
    pages.push({ items });
    totalChars += items.reduce((n, it) => n + it.str.length, 0);
  }
  index[`/evidence/${filename}`] = { pages };
  totalPages += doc.numPages;
  await doc.cleanup();
}

writeFileSync(OUTPUT_PATH, JSON.stringify(index) + '\n');
console.log(`[text-index] indexed ${pdfFiles.length} docs, ${totalPages} pages, ${totalChars} chars → public/evidence/text-index.json`);
