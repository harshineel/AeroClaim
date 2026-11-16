import React from 'react';

/** Half-circle gauge for the 0-100 fraud risk score. */
export default function Gauge({ value = 0, label = 'Fraud risk' }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  const c = Math.PI * 52;
  const tone = v >= 60 ? '#FF6B6B' : v >= 30 ? '#FFB224' : '#3DDC97';
  return (
    <figure className="text-center" aria-label={`${label} ${v} of 100`}>
      <svg viewBox="0 0 130 78" className="mx-auto w-36">
        <path d="M13 65 A52 52 0 0 1 117 65" fill="none" stroke="#1D2B4D" strokeWidth="11" strokeLinecap="round" />
        <path d="M13 65 A52 52 0 0 1 117 65" fill="none" stroke={tone} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} style={{ transition: 'stroke-dasharray .8s ease' }} />
        <text x="65" y="62" textAnchor="middle" className="fill-snow font-mono text-[26px] font-bold">{v}</text>
      </svg>
      <figcaption className="-mt-1 text-sm text-mist">{label}</figcaption>
    </figure>
  );
}
