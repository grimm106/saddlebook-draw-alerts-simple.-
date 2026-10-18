/**
 * SaddleBook draw progress engine.
 * Draw entries must be supplied in displayed draw order, across ALL pages.
 * Green = completed. Never infer completion solely from a draw number.
 */
export type DrawEntry = {
  id: string; // stable per-run identifier, not rider name
  rider: string;
  horse?: string;
  drawNumber: number;
  completed: boolean;
  scratched?: boolean;
};
export type AlertThreshold = 20 | 15 | 10 | 5 | 1;
export const DEFAULT_THRESHOLDS: AlertThreshold[] = [20, 15, 10, 5, 1];
export function progress(entries: DrawEntry[], selectedId: string) {
  const targetIndex = entries.findIndex(x => x.id === selectedId);
  if (targetIndex < 0) throw new Error('Selected run was not found in the draw');
  const target = entries[targetIndex];
  const ahead = entries.slice(0, targetIndex).filter(x => !x.completed && !x.scratched);
  const completedAhead = entries.slice(0, targetIndex).filter(x => x.completed).length;
  return {
    selectedId, drawNumber: target.drawNumber,
    remaining: target.completed || target.scratched ? 0 : ahead.length,
    completedAhead, totalAhead: targetIndex,
    status: target.scratched ? 'scratched' : target.completed ? 'completed' : ahead.length === 0 ? 'up-next' : 'waiting'
  };
}
/**
 * Emit each crossed threshold at most once per run. Caller persists sent keys.
 * Do not emit historical alerts on first snapshot (initialize previousRemaining).
 */
export function alertsCrossed(
  previousRemaining: number | null,
  remaining: number,
  sentKeys: ReadonlySet<string>,
  runId: string,
  thresholds: readonly number[] = DEFAULT_THRESHOLDS
) {
  if (previousRemaining === null || remaining >= previousRemaining) return [];
  return thresholds.filter(t => previousRemaining > t && remaining <= t)
    .filter(t => !sentKeys.has(runId + ':' + t))
    .map(t => ({ key: runId + ':' + t, threshold: t, remaining }));
}
