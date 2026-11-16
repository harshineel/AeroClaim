import React, { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { AlertTriangle, ArrowLeft, ExternalLink, Inbox, Mail, Server, User, Cpu, Banknote } from 'lucide-react';
import { api } from '../api.js';
import BpmnLive from '../components/BpmnLive.jsx';
import StatusPill from '../components/StatusPill.jsx';
import Gauge from '../components/Gauge.jsx';
import DelayBar from '../components/DelayBar.jsx';
import PayoutLadder from '../components/PayoutLadder.jsx';
import { TERMINAL, clock, minutes, money } from '../lib/format.js';

const SOURCE = { SYSTEM: Server, WORKER: Cpu, CONNECTOR: Mail, HUMAN: User };

export default function ClaimTracker() {
  const { claimId } = useParams();
  const tracker = useQuery({
    queryKey: ['tracker', claimId], queryFn: () => api.tracker(claimId),
    refetchInterval: (q) => (q.state.data && TERMINAL.includes(q.state.data.claim.status) && q.state.data.instanceState !== 'ACTIVE' ? false : 1500),
  });
  const model = useQuery({ queryKey: ['model', 'parametric-claim-main'], queryFn: () => api.model('parametric-claim-main'), staleTime: Infinity });
  const t = tracker.data;
  const claim = t?.claim;
  const wasPaid = useRef(false);

  useEffect(() => {
    if (claim?.status === 'PAID' && !wasPaid.current) {
      wasPaid.current = true;
      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) confetti({ particleCount: 140, spread: 80, origin: { y: 0.35 }, colors: ['#FFB224', '#3DDC97', '#6CB6FF'] });
    }
  }, [claim?.status]);

  if (tracker.isError) return <div className="panel panel-pad text-stop">Claim not found. <Link className="underline" to="/claims">Back to claims</Link></div>;
  if (!claim) return <div className="panel h-96 animate-pulse" />;

  const active = (t.elements || []).filter((e) => e.state === 'ACTIVE' && !/subProcess|callActivity|multiInstance/i.test(e.type || ''));
  const waiting = active.find((e) => /userTask/i.test(e.type || ''));
  const maxDelay = Math.max(0, ...claim.flights.map((f) => f.verifiedDelayMinutes ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <Link to="/claims" className="inline-flex items-center gap-1.5 text-sm text-mist hover:text-snow"><ArrowLeft className="h-4 w-4" />All claims</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-3xl font-bold tracking-tight">{claim.claimId}</h1>
          <StatusPill status={claim.status} className="!text-base" />
          {claim.processInstanceKey && (
            <a className="ml-auto inline-flex items-center gap-1.5 text-sm text-board hover:underline" target="_blank" rel="noreferrer" href={`http://localhost:8080/operate/processes/${claim.processInstanceKey}`}>
              Open in Camunda Operate <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
        <p className="mt-1 text-mist">{claim.claimantName} - policy {claim.policyNumber}{claim.statusReason ? ` - ${claim.statusReason}` : ''}</p>
      </div>

      {!t.engineReachable && <div className="rounded-lg border border-board/50 bg-board/10 px-4 py-3 text-sm text-board">Live engine data is unavailable right now. Showing the saved claim and audit trail only.</div>}
      {t.hasIncident && (
        <div className="rounded-lg border border-stop/50 bg-stop/10 px-4 py-3 text-sm text-stop"><AlertTriangle className="mr-2 inline h-4 w-4" />The process has an incident (a job ran out of retries). Resolve it in Camunda Operate, then retry.</div>
      )}
      {waiting && (
        <Link to="/tasks" className="flex items-center gap-3 rounded-lg border border-board/60 bg-board/10 px-4 py-3 shadow-glow">
          <Inbox className="h-5 w-5 text-board" /><span><b>Waiting for a person:</b> {waiting.name}. Open the tasklist to act on it.</span>
        </Link>
      )}

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-600/60 px-5 py-3">
          <h2 className="font-bold">Live process</h2>
          <span className="text-sm text-mist">{active.length ? `Now: ${active.map((e) => e.name || e.elementId).join(', ')}` : t.instanceState === 'COMPLETED' ? 'Process finished' : ''}</span>
        </div>
        <BpmnLive xml={model.data} elements={t.elements} height={430} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <section className="space-y-6">
          <div className="panel panel-pad">
            <h2 className="font-bold">Flight verification</h2>
            <ul className="mt-4 space-y-5">
              {claim.flights.map((f) => (
                <li key={f.flightNumber}>
                  <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
                    <span className="font-mono text-lg font-bold">{f.flightNumber}</span>
                    <span className="text-mist">{f.origin} to {f.destination} - {f.date}</span>
                    <span className="ml-auto text-sm">{f.verifiedStatus ? `${f.verifiedStatus.replace('_', ' ')} - ${f.verifiedStatus === 'CANCELLED' ? 'cancelled' : minutes(f.verifiedDelayMinutes)}` : 'waiting for flight data'}</span>
                  </div>
                  <DelayBar delay={f.verifiedDelayMinutes ?? 0} cancelled={f.verifiedStatus === 'CANCELLED'} />
                </li>
              ))}
            </ul>
            {claim.status === 'PAID' || claim.maxDelayMinutes != null ? (
              <div className="mt-5"><PayoutLadder delay={maxDelay || claim.maxDelayMinutes} cancelled={claim.flights.some((f) => f.verifiedStatus === 'CANCELLED')} /></div>
            ) : null}
          </div>

          <div className="panel panel-pad">
            <h2 className="flex items-center gap-2 font-bold"><Banknote className="h-5 w-5 text-board" />Payouts</h2>
            {claim.payments.length ? (
              <table className="mt-3 w-full text-left text-sm">
                <thead className="text-mist"><tr><th className="py-2 font-normal">Traveler</th><th className="font-normal">Reference</th><th className="text-right font-normal">Amount</th></tr></thead>
                <tbody>{claim.payments.map((p) => (
                  <tr key={p.reference} className="border-t border-ink-600/50"><td className="py-2">{p.beneficiary}</td><td className="font-mono">{p.reference}</td><td className="text-right font-mono">{money(p.amount, p.currency)}</td></tr>
                ))}</tbody>
              </table>
            ) : <p className="mt-2 text-mist">{claim.totalPayout != null ? `Total ${money(claim.totalPayout, claim.currency)}` : 'No payment has been made yet.'}</p>}
            {claim.totalPayout != null && <p className="mt-3 text-right font-mono text-xl font-bold text-go">{money(claim.totalPayout, claim.currency)}</p>}
          </div>

          {t.children?.length > 0 && (
            <div className="panel panel-pad">
              <h2 className="font-bold">Child process instances</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {t.children.map((c) => (
                  <li key={c.processInstanceKey} className="flex items-center justify-between rounded-lg border border-ink-600 px-3 py-2 text-sm">
                    <span className="font-mono">{c.processDefinitionId}</span>
                    <span className={c.state === 'COMPLETED' ? 'text-go' : c.hasIncident ? 'text-stop' : 'text-board'}>{c.state}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="panel panel-pad"><Gauge value={claim.fraudScore ?? 0} label={claim.fraudScore == null ? 'Fraud risk (pending)' : 'Fraud risk'} /></div>
          <div className="panel panel-pad">
            <h2 className="font-bold">Activity</h2>
            <ol className="mt-4 space-y-4 border-l border-ink-600 pl-5">
              {[...t.events].reverse().map((e) => {
                const Icon = SOURCE[e.source] || Server;
                return (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full bg-ink-700 text-board"><Icon className="h-3 w-3" /></span>
                    <p className="text-sm leading-snug">{e.message}</p>
                    <p className="mt-0.5 font-mono text-xs text-mist">{clock(e.createdAt)} - {e.source.toLowerCase()}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
