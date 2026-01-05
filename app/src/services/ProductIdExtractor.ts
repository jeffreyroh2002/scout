import type { Retailer } from '../types';

const UNIQLO_ID_REGEX = /\b(\d{6})\b/g;
const MUJI_ID_REGEX = /\b(\d{13})\b/g;

export type ProductIdCandidate = {
  id: string;
  score: number;
  sourceText: string;
};

export function extractProductId(
  lines: string[],
  retailer: Retailer
): { productId: string | null; candidates: ProductIdCandidate[] } {
  const candidates: ProductIdCandidate[] = [];

  const pattern = retailer === 'MUJI' ? MUJI_ID_REGEX : UNIQLO_ID_REGEX;

  lines.forEach((line, index) => {
    const matches = Array.from(line.matchAll(pattern));
    matches.forEach((match) => {
      const id = match[1];
      const score = scoreCandidate(id, line, index, lines.length);
      candidates.push({ id, score, sourceText: line });
    });
  });

  // Aggregate scores by ID to account for duplicates across lines.
  const aggregated = new Map<string, number>();
  candidates.forEach(({ id, score }) => {
    aggregated.set(id, (aggregated.get(id) ?? 0) + score);
  });

  const ranked = Array.from(aggregated.entries())
    .map(([id, score]) => ({ id, score, sourceText: '' }))
    .sort((a, b) => b.score - a.score);

  return {
    productId: ranked[0]?.id ?? null,
    candidates: ranked,
  };
}

function scoreCandidate(id: string, line: string, index: number, totalLines: number): number {
  let score = 1;

  const nearHyphen = /-/.test(line);
  if (nearHyphen) score += 1.5;

  const centered = index >= 1 && index <= totalLines - 2;
  if (centered) score += 0.5;

  const shortLine = line.trim().length <= 12;
  if (shortLine) score += 0.5;

  // Penalize if appears with other numbers that look like sizes.
  const containsSize = /\b[XSML]{1,2}\b/i.test(line);
  if (containsSize) score -= 0.5;

  // Preference boost for IDs that are not repeating patterns like 000000.
  if (!/(.)\1{5}/.test(id)) {
    score += 0.5;
  }

  return score;
}
