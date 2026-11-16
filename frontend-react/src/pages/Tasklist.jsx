import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Inbox, Plane } from 'lucide-react';
import { api } from '../api.js';
import { useSession } from '../components/Session.jsx';
import Gauge from '../components/Gauge.jsx';
import { ago, minutes, money } from '../lib/format.js';

const FORMS = {
  UT_review: { key: 'decision', legend: 'Decision', options: [['APPROVE', 'Approve payout'], ['REJECT', 'Reject claim']] },
  UT_payfix: { key: 'resolution', legend: 'Resolution', options: [['PAID_MANUALLY', 'Paid manually'], ['DETAILS_CORRECTED', 'Beneficiary details corrected'], ['WRITTEN_OFF', 'Written off']] },
};

export default function Tasklist() {
  const { role, roleId, toast } = useSession();
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [value, setValue] = useState('');
  const [comment, setComment] = useState('');

  const tasks = useQuery({ queryKey: ['tasks', roleId], queryFn: () => api.tasks(roleId), refetchInterval: 3000 });
  const list = tasks.data || [];
  const task = list.find((x) => x.userTaskKey === selected) || list[0] || null;
  const form = task ? FORMS[task.elementId] : null;

  useEffect(() => { setValue(''); setComment(''); }, [task?.userTaskKey]);

  const done = useMutation({
    mutationFn: () => api.completeTask(task.userTaskKey, { [form.key]: value, comment }, role.user),
    onSuccess: () => { toast(`${task.name} completed for ${task.claimId}`); setSelected(null); qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['tracker'] }); },
    onError: (e) => toast(e.message, 'error'),
  });

  const c = task?.claim;
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Tasklist</h1>
      <p className="mt-1 text-mist">Work waiting for <b className="text-snow">{role.label}</b>. Switch the role in the top bar to see the other queues.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="panel overflow-hidden">
          {list.length === 0 ? (
            <div className="p-8 text-center"><Inbox className="mx-auto h-8 w-8 text-mist" /><p className="mt-3 text-mist">Nothing waiting in this queue.</p><p className="mt-1 text-sm text-mist">Try the four-eyes example, or the payment-declined one as finance.</p><Link to="/file" className="btn-primary mt-4">File a claim</Link></div>
          ) : (
            <ul className="divide-y divide-ink-600/60">
              {list.map((x) => (
                <li key={x.userTaskKey}>
                  <button type="button" onClick={() => setSelected(x.userTaskKey)} className={`w-full px-4 py-3.5 text-left transition hover:bg-ink-700/40 ${x.userTaskKey === task?.userTaskKey ? 'bg-ink-700/60' : ''}`}>
                    <p className="font-bold leading-tight">{x.name}</p>
                    <p className="mt-1 font-mono text-sm text-board">{x.claimId}</p>
                    <p className="mt-0.5 text-xs text-mist">{ago(x.creationDate)}{x.assignee ? ` - ${x.assignee}` : ' - unassigned'}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {task && (
          <div className="panel panel-pad space-y-6">
            <div>
              <h2 className="text-xl font-bold">{task.name}</h2>
              <p className="text-mist">Claim <Link to={`/claims/${task.claimId}`} className="font-mono text-board hover:underline">{task.claimId}</Link> - queue {task.candidateGroups.join(', ')}</p>
            </div>

            {c && (
              <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
                <div className="space-y-3 text-sm">
                  <p><span className="text-mist">Claimant</span> {c.claimantName}</p>
                  <p><span className="text-mist">Proposed payout</span> <b className="font-mono text-lg text-board">{c.totalPayout != null ? money(c.totalPayout, c.currency) : 'being calculated'}</b></p>
                  <ul className="space-y-1.5">
                    {c.flights.map((f) => <li key={f.flightNumber} className="flex items-center gap-2"><Plane className="h-4 w-4 text-mist" /><span className="font-mono">{f.flightNumber}</span><span className="text-mist">{f.verifiedStatus ? `${f.verifiedStatus.replace('_', ' ')}, ${minutes(f.verifiedDelayMinutes)}` : 'pending'}</span></li>)}
                  </ul>
                </div>
                <Gauge value={c.fraudScore ?? 0} />
              </div>
            )}

            {form && (
              <form onSubmit={(e) => { e.preventDefault(); done.mutate(); }} className="space-y-4 border-t border-ink-600/60 pt-5">
                <fieldset>
                  <legend className="label">{form.legend}</legend>
                  <div className="space-y-2">
                    {form.options.map(([v, l]) => (
                      <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${value === v ? 'border-board bg-board/10' : 'border-ink-600 hover:border-mist/60'}`}>
                        <input type="radio" name="choice" className="accent-[#FFB224]" checked={value === v} onChange={() => setValue(v)} required />{l}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div><label className="label" htmlFor="comment">Comment</label><textarea id="comment" rows={3} className="field" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional note for the audit trail" /></div>
                <button type="submit" className="btn-primary" disabled={!value || done.isPending}><CheckCircle2 className="h-4 w-4" />{done.isPending ? 'Completing...' : 'Complete task'}</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
