import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import StatusPill from '../components/StatusPill.jsx';
import { ago, money } from '../lib/format.js';

export default function Claims() {
  const { data, isLoading } = useQuery({ queryKey: ['claims'], queryFn: api.claims, refetchInterval: 3000 });
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Claims</h1>
          <p className="mt-1 text-mist">Every claim is one process instance in Camunda. Open one to watch it move through the diagram.</p>
        </div>
        <Link to="/file" className="btn-primary">File a claim</Link>
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="text-sm text-mist">
            <tr className="border-b border-ink-600/60">{['Claim', 'Claimant', 'Flights', 'Status', 'Payout', 'Filed'].map((h) => <th key={h} className="px-4 py-3 font-normal">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan="6" className="px-4 py-8 text-center text-mist">Loading claims...</td></tr>}
            {data?.map((c) => (
              <tr key={c.claimId} className="border-b border-ink-600/40 last:border-0 hover:bg-ink-700/30">
                <td className="px-4 py-3"><Link className="font-mono text-board hover:underline" to={`/claims/${c.claimId}`}>{c.claimId}</Link></td>
                <td className="px-4 py-3">{c.claimantName}<div className="text-sm text-mist">{c.policyNumber}</div></td>
                <td className="px-4 py-3 font-mono text-sm">{c.flights.map((f) => f.flightNumber).join(', ')}</td>
                <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                <td className="px-4 py-3 font-mono">{c.totalPayout != null ? money(c.totalPayout, c.currency) : '-'}</td>
                <td className="px-4 py-3 text-sm text-mist">{ago(c.createdAt)}</td>
              </tr>
            ))}
            {data?.length === 0 && <tr><td colSpan="6" className="px-4 py-12 text-center text-mist">No claims yet. <Link to="/file" className="text-board hover:underline">File one from an example.</Link></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
