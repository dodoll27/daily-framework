import type { Block, BlockProgress, Session } from "./types";
import { sessionMinutes } from "./time";

/** Progress per block for a set of sessions; ratio is done/target. */
export function blockProgress(blocks: Block[], sessions: Session[], expectedRatio: number, now = Date.now()): BlockProgress[] {
  return blocks.map((b) => {
    const mine = sessions.filter((s) => s.block_id === b.id);
    const minutes = mine.reduce((a, s) => a + sessionMinutes(s, now), 0);
    const count = mine.filter((s) => sessionMinutes(s, now) >= 10).length;
    let ratio = 1;
    if (b.target_sessions) ratio = count / b.target_sessions;
    else if (b.weekly_target_minutes) ratio = minutes / b.weekly_target_minutes;
    return {
      block_id: b.id,
      minutes: Math.round(minutes),
      sessions: count,
      target_minutes: b.weekly_target_minutes,
      target_sessions: b.target_sessions,
      ratio,
      expected_ratio: expectedRatio,
    };
  });
}

/** The block furthest behind its weekly target (lowest progress ratio among prioritized blocks). */
export function furthestBehind(blocks: Block[], progress: BlockProgress[]): string | null {
  const eligible = progress.filter((p) => {
    const b = blocks.find((x) => x.id === p.block_id);
    return b?.prioritize && (b.weekly_target_minutes || b.target_sessions);
  });
  if (!eligible.length) return null;
  eligible.sort((a, b) => a.ratio - b.ratio);
  return eligible[0].ratio < 1 ? eligible[0].block_id : null;
}
