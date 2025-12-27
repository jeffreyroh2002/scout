import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';

import type { OcrResult } from '../types';

/**
 * On-device OCR backed by ML Kit (Android) and Apple Vision (iOS).
 */
export async function recognizeTextFromImage(uri: string): Promise<OcrResult> {
  const result = await TextRecognition.recognize(uri, TextRecognitionScript.LATIN);

  const lines: string[] = [];
  result.blocks.forEach((block) => {
    block.lines.forEach((line) => {
      if (line.text) {
        lines.push(line.text);
      }
    });
  });

  const deduped = Array.from(new Set(lines.map((line) => line.trim()).filter(Boolean)));

  return {
    text: deduped,
    rawText: result.text,
  };
}
