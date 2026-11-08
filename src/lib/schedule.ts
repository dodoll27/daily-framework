import type { Slot } from "./types";

type Span = Pick<Slot, "id" | "start_min" | "end_min">;

/**
 * "Running over shifts the rest of the day instead of breaking it."
 * After `pinnedId` changes, push every later slot forward just enough to avoid overlap.
 * Never pulls slots earlier. Returns the slots whose times changed.
 */
export function reflow<T extends Span>(slots: T[], pinnedId: string): T[] {
  const sorted = [...slots].sort((a, b) => a.start_min - b.start_min || (a.id === pinnedId ? -1 : 1));
  const idx = sorted.findIndex((s) => s.id === pinnedId);
  if (idx < 0) return [];
  const changed: T[] = [];
  let cursor = sorted[idx].end_min;
  for (let i = idx + 1; i < sorted.length; i++) {
    const s = sorted[i];
    if (s.start_min >= cursor) break;
    const len = s.end_min - s.start_min;
    let start = cursor;
    let end = start + len;
    if (end > 1440) {
      end = 1440;
      start = Math.min(start, 1435);
    }
    if (start !== s.start_min || end !== s.end_min) changed.push({ ...s, start_min: start, end_min: end });
    cursor = end;
  }
  return changed;
}

export function snap(min: number, step = 15) {
  return Math.round(min / step) * step;
}
