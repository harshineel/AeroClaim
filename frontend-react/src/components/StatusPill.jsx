import React from 'react';
import { STATUS, TONE } from '../lib/format.js';

export default function StatusPill({ status, className = '' }) {
  const meta = STATUS[status] || { label: status, tone: 'mist' };
  const live = ['VALIDATING', 'VERIFYING', 'UNDER_REVIEW', 'SETTLING'].includes(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm ${TONE[meta.tone]} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${live ? 'animate-pulse' : ''}`} />{meta.label}
    </span>
  );
}
