import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, BadgeCheck, Ban, Check, Plus, Route, Send, Timer, Trash2, Users, X, Zap, AlertTriangle } from 'lucide-react';
import { api } from '../api.js';
import { useSession } from '../components/Session.jsx';
import PayoutLadder from '../components/PayoutLadder.jsx';
import { money } from '../lib/format.js';

const ICONS = { zap: Zap, users: Users, route: Route, ban: Ban, check: Check, alert: AlertTriangle, timer: Timer, x: X };
const STEPS = ['Policy', 'Flights', 'Travelers', 'Review'];
const emptyFlight = () => ({ flightNumber: '', date: '2026-11-05', origin: '', destination: '' });
const emptyTraveler = () => ({ name: '', email: '' });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FileClaim() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { toast } = useSession();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ policyNumber: '', claimant: { name: '', email: '' }, flights: [emptyFlight()], travelers: [emptyTraveler()], slaDuration: '' });
  const [touched, setTouched] = useState(false);
  const [policy, setPolicy] = useState(null);
  const [policyError, setPolicyError] = useState('');

  const scenarios = useQuery({ queryKey: ['scenarios'], queryFn: api.scenarios });
  const submit = useMutation({
    mutationFn: () => api.submitClaim({ ...form, slaDuration: form.slaDuration || undefined, flights: form.flights.map((f) => ({ ...f, flightNumber: f.flightNumber.replace(/\s/g, '') })) }),
    onSuccess: (claim) => { qc.invalidateQueries({ queryKey: ['claims'] }); toast(`Claim ${claim.claimId} submitted - the process is running`); nav(`/claims/${claim.claimId}`); },
    onError: (e) => toast(e.message, 'error'),
  });

  const lookup = async (no) => {
    setPolicy(null); setPolicyError('');
    if (!no) return;
    try { setPolicy(await api.policy(no)); } catch (e) { setPolicyError(e.status === 404 ? 'No policy with that number' : e.message); }
  };

  const loadScenario = (s) => {
    setForm({ ...s.request, slaDuration: s.request.slaDuration || '' });
    setTouched(false); setStep(3); lookup(s.request.policyNumber);
  };

  const set = (path, value) => setForm((f) => {
    const n = structuredClone(f);
    const keys = path.split('.');
    let o = n;
    keys.slice(0, -1).forEach((k) => { o = o[k]; });
    o[keys.at(-1)] = value;
    return n;
  });
  const addTo = (key, item) => setForm((f) => ({ ...f, [key]: [...f[key], item] }));
  const removeFrom = (key, i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, j) => j !== i) }));

  const errors = useMemo(() => {
    const e = {};
    if (!form.policyNumber.trim()) e.policy = 'Enter the policy number';
    if (!form.claimant.name.trim()) e.claimantName = 'Enter your name';
    if (!EMAIL.test(form.claimant.email)) e.claimantEmail = 'Enter a valid e-mail address';
    form.flights.forEach((f, i) => {
      if (!/^[A-Za-z0-9]{2,3}\s?\d{1,4}$/.test(f.flightNumber)) e[`f${i}no`] = 'Like LX318';
      if (!f.date) e[`f${i}date`] = 'Pick the date';
      if (f.origin.length !== 3) e[`f${i}from`] = '3 letters';
      if (f.destination.length !== 3) e[`f${i}to`] = '3 letters';
    });
    form.travelers.forEach((t, i) => {
      if (!t.name.trim()) e[`t${i}name`] = 'Enter a name';
      if (!EMAIL.test(t.email)) e[`t${i}email`] = 'Valid e-mail needed';
    });
    if (form.slaDuration && !/^P(T\d+[HMS])+$|^P\d+D$/.test(form.slaDuration)) e.sla = 'Use ISO-8601 like PT24H';
    return e;
  }, [form]);

  const stepKeys = [
    (k) => k === 'policy' || k.startsWith('claimant'),
    (k) => k.startsWith('f') && k !== 'policy',
    (k) => k.startsWith('t') || k === 'sla',
    () => false,
  ];
  const stepHasError = (i) => Object.keys(errors).some(stepKeys[i]);
  const next = () => { setTouched(true); if (!stepHasError(step)) { setTouched(false); setStep(step + 1); } };
  const err = (k) => (touched && errors[k]) || '';
  const input = (k) => `field ${err(k) ? 'field-error' : ''}`;

  const est = useMemo(() => policy ? { benefit: Number(policy.benefitPerTraveler), n: form.travelers.length, cur: policy.currency } : null, [policy, form.travelers.length]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">File a claim</h1>
        <p className="mt-1 text-mist">You only describe the trip. The delay itself is verified from flight data, so there is nothing to prove.</p>

        <ol className="mt-6 flex gap-2" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${i === step ? 'border-board bg-board/10 text-board' : i < step ? 'border-go/40 text-go' : 'border-ink-600 text-mist'}`}>
              <span className="font-mono">{i + 1}</span> {s}
            </li>
          ))}
        </ol>

        <div className="panel panel-pad mt-5 space-y-5">
          {step === 0 && (
            <>
              <div>
                <label className="label" htmlFor="policy">Policy number</label>
                <input id="policy" className={input('policy')} placeholder="AC-TRV-100234" value={form.policyNumber}
                  onChange={(e) => set('policyNumber', e.target.value.toUpperCase())} onBlur={(e) => lookup(e.target.value)} />
                {err('policy') && <p className="help-error">{err('policy')}</p>}
                {policyError && <p className="help-error">{policyError}</p>}
                {policy && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-go"><BadgeCheck className="h-4 w-4" />
                    {policy.holderName} - {policy.status} - {money(policy.benefitPerTraveler, policy.currency)} per traveler, up to {policy.maxTravelers} travelers</p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="cname">Your name</label>
                  <input id="cname" className={input('claimantName')} value={form.claimant.name} onChange={(e) => set('claimant.name', e.target.value)} />
                  {err('claimantName') && <p className="help-error">{err('claimantName')}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="cmail">Your e-mail</label>
                  <input id="cmail" type="email" className={input('claimantEmail')} value={form.claimant.email} onChange={(e) => set('claimant.email', e.target.value)} />
                  {err('claimantEmail') && <p className="help-error">{err('claimantEmail')}</p>}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              {form.flights.map((f, i) => (
                <fieldset key={i} className="rounded-lg border border-ink-600 p-4">
                  <legend className="px-2 text-sm text-mist">Flight {i + 1}</legend>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <label className="label" htmlFor={`fn${i}`}>Flight number</label>
                      <input id={`fn${i}`} className={input(`f${i}no`)} placeholder="LX318" value={f.flightNumber} onChange={(e) => set(`flights.${i}.flightNumber`, e.target.value.toUpperCase())} />
                      {err(`f${i}no`) && <p className="help-error">{err(`f${i}no`)}</p>}
                    </div>
                    <div>
                      <label className="label" htmlFor={`fd${i}`}>Date</label>
                      <input id={`fd${i}`} type="date" className={input(`f${i}date`)} value={f.date} onChange={(e) => set(`flights.${i}.date`, e.target.value)} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`ff${i}`}>From</label>
                      <input id={`ff${i}`} maxLength={3} className={input(`f${i}from`)} placeholder="ZRH" value={f.origin} onChange={(e) => set(`flights.${i}.origin`, e.target.value.toUpperCase())} />
                      {err(`f${i}from`) && <p className="help-error">{err(`f${i}from`)}</p>}
                    </div>
                    <div>
                      <label className="label" htmlFor={`ft${i}`}>To</label>
                      <input id={`ft${i}`} maxLength={3} className={input(`f${i}to`)} placeholder="JFK" value={f.destination} onChange={(e) => set(`flights.${i}.destination`, e.target.value.toUpperCase())} />
                      {err(`f${i}to`) && <p className="help-error">{err(`f${i}to`)}</p>}
                    </div>
                  </div>
                  {form.flights.length > 1 && <button type="button" className="mt-3 inline-flex items-center gap-1.5 text-sm text-stop hover:underline" onClick={() => removeFrom('flights', i)}><Trash2 className="h-4 w-4" />Remove this flight</button>}
                </fieldset>
              ))}
              <button type="button" className="btn-ghost" disabled={form.flights.length >= 6} onClick={() => addTo('flights', emptyFlight())}><Plus className="h-4 w-4" />Add another flight</button>
              <p className="text-sm text-mist">Each flight is verified by its own child process, all at the same time. The longest delay decides the payout.</p>
            </>
          )}

          {step === 2 && (
            <>
              {form.travelers.map((t, i) => (
                <fieldset key={i} className="rounded-lg border border-ink-600 p-4">
                  <legend className="px-2 text-sm text-mist">Traveler {i + 1}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor={`tn${i}`}>Full name</label>
                      <input id={`tn${i}`} className={input(`t${i}name`)} value={t.name} onChange={(e) => set(`travelers.${i}.name`, e.target.value)} />
                      {err(`t${i}name`) && <p className="help-error">{err(`t${i}name`)}</p>}
                    </div>
                    <div>
                      <label className="label" htmlFor={`te${i}`}>E-mail for the payout receipt</label>
                      <input id={`te${i}`} type="email" className={input(`t${i}email`)} value={t.email} onChange={(e) => set(`travelers.${i}.email`, e.target.value)} />
                      {err(`t${i}email`) && <p className="help-error">{err(`t${i}email`)}</p>}
                    </div>
                  </div>
                  {form.travelers.length > 1 && <button type="button" className="mt-3 inline-flex items-center gap-1.5 text-sm text-stop hover:underline" onClick={() => removeFrom('travelers', i)}><Trash2 className="h-4 w-4" />Remove this traveler</button>}
                </fieldset>
              ))}
              <button type="button" className="btn-ghost" disabled={form.travelers.length >= 8} onClick={() => addTo('travelers', emptyTraveler())}><Plus className="h-4 w-4" />Add another traveler</button>
              <div>
                <label className="label" htmlFor="sla">Settlement SLA (optional, ISO-8601)</label>
                <input id="sla" className={`${input('sla')} max-w-[220px]`} placeholder="PT24H" value={form.slaDuration} onChange={(e) => set('slaDuration', e.target.value.toUpperCase())} />
                {err('sla') && <p className="help-error">{err('sla')}</p>}
                <p className="mt-1 text-sm text-mist">If payout takes longer than this, a timer in the BPMN model alerts operations.</p>
              </div>
            </>
          )}

          {step === 3 && (
            <dl className="divide-y divide-ink-600/60">
              {[
                ['Policy', form.policyNumber || '-'],
                ['Claimant', `${form.claimant.name} (${form.claimant.email})`],
                ['Flights', form.flights.map((f) => `${f.flightNumber} ${f.origin}-${f.destination}`).join(', ')],
                ['Travelers', form.travelers.map((t) => t.name).join(', ')],
                ['SLA', form.slaDuration || 'default (24 hours)'],
              ].map(([k, v]) => <div key={k} className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr]"><dt className="text-mist">{k}</dt><dd>{v}</dd></div>)}
            </dl>
          )}

          <div className="flex items-center justify-between pt-2">
            <button type="button" className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" />Back</button>
            {step < 3 ? (
              <button type="button" className="btn-primary" onClick={next}>Continue<ArrowRight className="h-4 w-4" /></button>
            ) : (
              <button type="button" className="btn-primary" disabled={submit.isPending || Object.keys(errors).length > 0} onClick={() => submit.mutate()}>
                <Send className="h-4 w-4" />{submit.isPending ? 'Submitting...' : 'Submit claim'}
              </button>
            )}
          </div>
          {step === 3 && Object.keys(errors).length > 0 && <p className="help-error">Some details are missing or invalid. Go back and fix the highlighted fields.</p>}
        </div>
      </div>

      <aside className="space-y-5">
        <div className="panel panel-pad">
          <h2 className="font-bold">Try an example</h2>
          <p className="mt-1 text-sm text-mist">Each example takes the process down a different path.</p>
          <ul className="mt-3 space-y-2">
            {(scenarios.data || []).map((s) => {
              const Icon = ICONS[s.icon] || Zap;
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => loadScenario(s)} className="group flex w-full items-start gap-3 rounded-lg border border-ink-600 p-3 text-left transition hover:border-board/70 hover:bg-ink-700/50">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-board" />
                    <span><span className="block font-bold leading-tight">{s.title}</span><span className="mt-1 block text-xs leading-snug text-mist">{s.description}</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        {est && (
          <div className="panel panel-pad">
            <h2 className="font-bold">Maximum payout</h2>
            <p className="mt-1 font-mono text-2xl font-bold text-board">{money(est.benefit * est.n, est.cur)}</p>
            <p className="mb-3 text-sm text-mist">{est.n} traveler{est.n > 1 ? 's' : ''} at {money(est.benefit, est.cur)} each, if the delay reaches the top tier.</p>
            <PayoutLadder benefit={est.benefit} currency={est.cur} />
          </div>
        )}
      </aside>
    </div>
  );
}
