// news-image-20261124 entry: the picture is the entry, this program only
// delivers it to the gate. It reads entry.png out of the repository root,
// makes sure it is a complete PNG or JPEG within the size limits, then
// writes the exact same bytes to /output/entry.png, where the gate looks.
// The image itself (a newspaper front page summing up Tuesday 24 November
// 2026: Iran refusing talks while tankers hit mines in the Strait of Hormuz,
// a Russian strike on Zaporizhzhia, Israeli strikes killing a Hamas security
// chief in Gaza, fourteen nations backing the ICJ Rohingya ruling, Jensen
// Huang returning as Nvidia chief, COP31 ending without a deal, and US
// states suing Musk's firms over Grok images) is stored in the repository,
// not generated here, so nothing this program produces is judged.
//
// Run it the way the grader does:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The gate only ever sees the copied file, so the copy has to be exact:
// readFileSync + writeFileSync move the bytes unchanged, no re-encoding,
// no resizing, no metadata touched.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '.';
const OUTPUT_DIR =
  process.env.MAKEFUN_OUTPUT_DIR ?? process.env.OUTPUT_DIR ?? '/output';

const sourcePath = join(BOT_DIR, 'entry.png');
if (!existsSync(sourcePath)) {
  console.error(`entry.png not found in ${BOT_DIR}`);
  process.exit(1);
}

const image = readFileSync(sourcePath);
const looksPng =
  image.length >= 8 &&
  image[0] === 0x89 &&
  image[1] === 0x50 &&
  image[2] === 0x4e &&
  image[3] === 0x47;
const looksJpeg =
  image.length >= 3 &&
  image[0] === 0xff &&
  image[1] === 0xd8 &&
  image[2] === 0xff;
if (!looksPng && !looksJpeg) {
  console.error('entry.png is neither a PNG nor a JPEG (bad magic bytes)');
  process.exit(1);
}
if (image.length > 1048576) {
  console.error(`entry.png is ${image.length} bytes, over the 1 MiB cap`);
  process.exit(1);
}
if (looksPng) {
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width > 1024 || height > 1024) {
    console.error(`entry.png is ${width}x${height}, over the 1024x1024 cap`);
    process.exit(1);
  }
  // A whole PNG ends with the IEND chunk (12 bytes: length 0, "IEND", CRC).
  // Reject a truncated file instead of handing the gate a broken image.
  const tail = image.subarray(image.length - 12);
  const isWhole =
    tail.readUInt32BE(0) === 0 &&
    tail.toString('ascii', 4, 8) === 'IEND';
  if (!isWhole) {
    console.error('entry.png is a truncated PNG (no IEND chunk at the end)');
    process.exit(1);
  }
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const destPath = join(OUTPUT_DIR, 'entry.png');
writeFileSync(destPath, image);

const roundTrip = readFileSync(destPath);
if (roundTrip.length !== image.length || !roundTrip.equals(image)) {
  console.error('entry.png written to the output dir differs from the source');
  process.exit(1);
}
console.log(
  `wrote ${image.length} bytes to ${destPath} (${looksPng ? 'PNG' : 'JPEG'})`,
);
