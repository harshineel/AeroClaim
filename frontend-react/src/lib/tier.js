// Mirror of bpmn-models/payout-tier.dmn (hit policy FIRST). Camunda makes the authoritative decision; this copy powers UI estimates only.
export const TIERS = [
  { min: 60, pct: 25, label: '1 hour' },
  { min: 120, pct: 50, label: '2 hours' },
  { min: 180, pct: 75, label: '3 hours' },
  { min: 240, pct: 100, label: '4 hours' },
];

export function tierFor(delayMinutes, cancelled = false) {
  if (cancelled) return 100;
  let pct = 0;
  for (const t of TIERS) if (delayMinutes >= t.min) pct = t.pct;
  return pct;
}
