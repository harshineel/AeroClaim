import React from 'react';
import { TIERS, tierFor } from '../lib/tier.js';

/** The parametric promise as a ladder: the longer the verified delay, the larger the share of the benefit. */
export default function PayoutLadder({ delay = null, cancelled = false, benefit = null, currency = 'CHF' }) {
  const active = delay == null && !cancelled ? null : tierFor(delay ?? 0, cancelled);
  const steps = [...TIERS, { pct: 100, label: 'Cancelled', cancelled: true }];
  return (
    <ol className="grid grid-cols-5 gap-1.5 sm:gap-2">
      {steps.map((s) => {
        const hit = active != null && (s.cancelled ? cancelled : !cancelled && active === s.pct);
        return (
          <li key={s.label} className={`rounded-lg border px-2 py-2.5 text-center transition ${hit ? 'border-board bg-board/10 shadow-glow' : 'border-ink-600 bg-ink-900/60'}`}>
            <div className={`font-mono text-lg font-bold ${hit ? 'text-board' : 'text-snow'}`}>{s.pct}%</div>
            <div className="text-xs text-mist">{s.cancelled ? 'cancelled' : `${s.label}+`}</div>
            {benefit != null && <div className="mt-1 text-xs text-mist">{Math.round(benefit * s.pct) / 100} {currency}</div>}
          </li>
        );
      })}
    </ol>
  );
}
