/**
 * Web stub for OCR. ML Kit has no browser implementation, so on web we skip
 * recognition entirely and return no lines — the confirm screen then falls back
 * to "couldn't read a total, enter it manually". Metro picks this for web.
 */
import type { OcrResult } from './types';

export async function recognizeImage(_uri: string): Promise<OcrResult> {
  return { lines: [] };
}
