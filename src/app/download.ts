/**
 * Bundle every generated crop into a single ZIP and trigger one download.
 * This is the only place the full-resolution export runs: each crop is
 * exported from its canonical scene string at the preset's exact pixels, so
 * the ZIP always reflects the latest edits (the gallery only holds small
 * thumbnails).
 *
 * @see https://github.com/Touffy/client-zip
 */

import { downloadZip } from 'client-zip';

import { exportCrop } from './renderer';
import type { CropResult } from './state';

/** Filesystem-safe file name for a crop, e.g. "instagram-story-1080x1920.png". */
function fileNameFor(result: CropResult): string {
  const slug = result.presetLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${slug}-${result.width}x${result.height}.png`;
}

/** Export all results at full size, zip them, and trigger a browser download. */
export async function downloadAll(results: CropResult[]): Promise<void> {
  // Export sequentially: exportCrop loads each scene into the SHARED headless
  // engine. It's mutex-serialized there, so Promise.all would queue safely — but
  // a sequential loop is simpler and avoids buffering every scene at once.
  const files: { name: string; input: Blob }[] = [];
  for (const result of results) {
    files.push({
      name: fileNameFor(result),
      input: await exportCrop(result.sceneString, result.width, result.height)
    });
  }

  const zipBlob = await downloadZip(files).blob();
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'multicrop-export.zip';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
