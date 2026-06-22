/**
 * Thin wrapper over ML Kit on-device text recognition. This is the only file in
 * lib/receipt that touches a native module, so the rest of the pipeline stays
 * pure and unit-testable. Requires an Expo dev build — it is a no-op in Expo Go.
 */
import TextRecognition from '@react-native-ml-kit/text-recognition';

import type { BBox, OcrLine, OcrResult } from './types';

/** ML Kit frames come as {left,top,width,height} on iOS/Android; normalize it. */
function toBBox(frame: unknown): BBox | undefined {
  if (!frame || typeof frame !== 'object') return undefined;
  const f = frame as Record<string, number>;
  const x = f.left ?? f.x;
  const y = f.top ?? f.y;
  if (x == null || y == null) return undefined;
  return { x, y, width: f.width ?? 0, height: f.height ?? 0 };
}

/** Run OCR on a local image URI and flatten blocks -> lines. */
export async function recognizeImage(uri: string): Promise<OcrResult> {
  const result = await TextRecognition.recognize(uri);
  const lines: OcrLine[] = [];

  for (const block of result.blocks ?? []) {
    const blockLines = (block as { lines?: { text: string; frame?: unknown }[] })
      .lines;
    if (blockLines && blockLines.length > 0) {
      for (const line of blockLines) {
        lines.push({ text: line.text, bbox: toBBox(line.frame) });
      }
    } else {
      // Some platforms omit per-line breakdown; fall back to the block.
      lines.push({
        text: block.text,
        bbox: toBBox((block as { frame?: unknown }).frame),
      });
    }
  }

  return { lines };
}
