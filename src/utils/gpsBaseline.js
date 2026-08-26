/**
 * shouldDropGpsForLine2Edit — mobile mirror of the same helper in the web
 * seller app. Decides whether coordinates from a GPS capture should be
 * invalidated when the user edits the street (line2).
 *
 * Only line2 edits matter — door, city, pincode, landmark, type never
 * clear the coords. Within line2, we do a case-insensitive whole-word
 * comparison against the baseline captured at last GPS/Map pick. If any
 * baseline word is missing from the current text, the pin no longer
 * represents this street and we drop it.
 *
 * Empty baseline → returns false (nothing to drop).
 */
export function shouldDropGpsForLine2Edit(baselineLine2, currentLine2) {
  const norm = (s) => String(s || '')
    .toLowerCase()
    .replace(/[.,;:!?()"']+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const baseWords = norm(baselineLine2);
  if (baseWords.length === 0) return false;
  const currWords = new Set(norm(currentLine2));
  return baseWords.some(w => !currWords.has(w));
}
