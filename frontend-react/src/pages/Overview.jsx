import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Database, Landmark, Mail, ShieldCheck, Gavel } from 'lucide-react';
import { api } from '../api.js';
import SplitFlap from '../components/SplitFlap.jsx';
import PayoutLadder from '../components/PayoutLadder.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { tierFor } from '../lib/tier.js';
import { ago, money, STATUS } from '../lib/format.js';

function Board({ flights }) {
  return (
    <div className="panel overflow-x-auto p-4 sm:p-6" style={{ background: 'linear-gradient(180deg,#0B1226,#0A1020)' }}>
      <div className="min-w-[720px]">
        <div className="mb-3 grid grid-cols-[9rem_10.5rem_12rem_7.5rem_1fr] gap-3 text-sm text-mist">
          <span>Flight</span><span>Route</span><span>Status</span><span>Minutes late</span><span>Pays</span>
        </div>
        <div className="space-y-2">
          {flights.slice(0, 8).map(({ flight: f }, i) => {
            const pct = tierFor(f.delayMinutes, f.cancelled);
            return (
              <div key={f.flightNumber} className="grid grid-cols-[9rem_10.5rem_12rem_7.5rem_1fr] items-center gap-3">
                <SplitFlap text={f.flightNumber} width={6} baseDelay={i * 140} />
                <SplitFlap text={`${f.origin}-${f.destination}`} width={7} baseDelay={i * 140 + 120} className="!text-mist" />
                <SplitFlap text={f.status.replace('_', ' ')} width={9} tone={f.cancelled ? 'bad' : f.status === 'ON_TIME' ? 'ok' : ''} baseDelay={i * 140 + 240} />
                <SplitFlap text={f.cancelled ? '--' : String(f.delayMinutes)} width={3} tone={f.cancelled ? 'bad' : f.delayMinutes >= 60 ? '' : 'ok'} baseDelay={i * 140 + 360} />
                <SplitFlap text={`${pct}%`} width={4} tone={pct ? 'ok' : 'dim'} baseDelay={i * 140 + 480} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Overview() {
  const flights = useQuery({ queryKey: ['flights'], queryFn: api.flights, refetchInterval: 5000 });
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, refetchInterval: 5000 });
  const claims = useQuery({ queryKey: ['claims'], queryFn: api.claims, refetchInterval: 5000 });
  const d = dash.data;
  const total = d ? Math.max(1, d.totalClaims) : 1;

  return (
    <div className="space-y-10">
      <section className="grid items-end gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <h1 className="max-w-[20ch] text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">Your flight is late. The payout is already on its way.</h1>
          <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-mist">
            AeroClaim pays travelers automatically when verified flight data crosses the delay thresholds in their policy. There is no loss adjuster and no form about what went wrong.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/file" className="btn-primary">File a claim <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/tasks" className="btn-ghost">Open the tasklist</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm text-mist">What a verified delay is worth</p>
          <PayoutLadder />
          <p className="mt-3 text-sm text-mist">A cancelled flight pays the full benefit. The rule table is a Camunda DMN decision, not code.</p>
        </div>
      </section>

      <section aria-labelledby="board-title">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 id="board-title" className="text-xl font-bold">Flights the data provider is reporting</h2>
          <Link to="/control-tower" className="text-sm text-board hover:underline">Change a delay</Link>
        </div>
        {flights.data ? <Board flights={flights.data} /> : <div className="panel h-72 animate-pulse" />}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="panel panel-pad">
          <h2 className="text-lg font-bold">Operations</h2>
          <dl className="mt-4 divide-y divide-ink-600/60">
            {[
              ['Claims received', d?.totalClaims ?? '-'],
              ['Still in progress', d?.openClaims ?? '-'],
              ['Paid out', d ? money(d.totalPaidOut, d.currency) : '-'],
              ['Average time to payout', d ? `${d.avgMinutesToPayout} min` : '-'],
              ['Paid without a human step', d ? `${d.autoApprovalRate}%` : '-'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between py-2.5"><dt className="text-mist">{k}</dt><dd className="font-mono text-lg font-bold">{v}</dd></div>
            ))}
          </dl>
          {d && d.totalClaims > 0 && (
            <div className="mt-4">
              <div className="flex h-3 overflow-hidden rounded-full bg-ink-900">
                {Object.entries(d.byStatus).filter(([, n]) => n > 0).map(([s, n]) => (
                  <div key={s} title={`${STATUS[s]?.label}: ${n}`} style={{ width: `${(n / total) * 100}%` }}
                    className={{ PAID: 'bg-go', REJECTED: 'bg-stop', CLOSED_NO_PAYOUT: 'bg-mist/60' }[s] || 'bg-board'} />
                ))}
              </div>
              <p className="mt-2 text-sm text-mist">Green is paid, amber is in progress, grey is closed without payout, red is rejected.</p>
            </div>
          )}
        </div>

        <div className="panel panel-pad">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Latest claims</h2>
            <Link to="/claims" className="text-sm text-board hover:underline">All claims</Link>
          </div>
          {claims.data?.length ? (
            <ul className="mt-3 divide-y divide-ink-600/60">
              {claims.data.slice(0, 5).map((c) => (
                <li key={c.claimId}>
                  <Link to={`/claims/${c.claimId}`} className="flex items-center gap-3 py-3 hover:bg-ink-700/30">
                    <span className="font-mono text-sm">{c.claimId}</span>
                    <span className="hidden flex-1 truncate text-mist sm:block">{c.claimantName} - {c.flights.map((f) => f.flightNumber).join(', ')}</span>
                    <span className="ml-auto text-sm text-mist">{ago(c.createdAt)}</span>
                    <StatusPill status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-lg border border-dashed border-ink-600 p-8 text-center">
              <p className="text-mist">No claims yet. File one from an example and watch the process run.</p>
              <Link to="/file" className="btn-primary mt-4">File your first claim</Link>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="mb-4 text-xl font-bold">What happens behind a claim</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [Database, 'Register and check', 'Spring Boot saves the claim and checks the policy while a fraud score runs in parallel.'],
            [ShieldCheck, 'Verify every flight', 'One child process per flight leg asks the data provider through a REST connector.'],
            [Gavel, 'Decide', 'A DMN table turns delay minutes into a payout share. Large payouts go to two reviewers.'],
            [Landmark, 'Pay each traveler', 'Transfers run one after another. A declined payment goes to finance.'],
            [Mail, 'Tell everyone', 'E-mail connectors confirm the payout or explain why none is due.'],
          ].map(([Icon, t, p]) => (
            <li key={t} className="panel p-4">
              <Icon className="h-5 w-5 text-board" />
              <h3 className="mt-3 font-bold">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-mist">{p}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
