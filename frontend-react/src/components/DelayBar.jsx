import React from 'react';

/** Delay as a bar against the 60 / 120 / 180 / 240 minute thresholds. */
export default function DelayBar({ delay = 0, cancelled = false }) {
  const pct = cancelled ? 100 : Math.min(100, (delay / 300) * 100);
  const tone = cancelled ? 'bg-stop' : delay >= 60 ? 'bg-board' : 'bg-go';
  return (
    <div className="relative h-2.5 rounded-full bg-ink-900" role="img" aria-label={cancelled ? 'Flight cancelled' : `${delay} minutes late`}>
      <div className={`h-full rounded-full transition-all duration-700 ${tone}`} style={{ width: `${pct}%` }} />
      {[60, 120, 180, 240].map((m) => <span key={m} className="absolute top-0 h-full w-px bg-ink-600" style={{ left: `${(m / 300) * 100}%` }} />)}
    </div>
  );
}
