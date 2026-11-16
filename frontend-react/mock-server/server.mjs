// Stand-in for the Spring Boot backend + Camunda so the UI can be demonstrated, tested and screenshotted without Docker.
// It mimics the same REST contract (see backend-springboot/.../web) and animates a claim through the same BPMN element ids.
// Run:  npm run mock   (listens on :8081, which is where vite proxies /api)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const MODELS = path.resolve(here, '../../bpmn-models');
const SPEED = Number(process.env.MOCK_SPEED || 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SPEED));
const now = () => new Date().toISOString();
const DAY = '2026-11-05';

const policies = {
  'AC-TRV-100234': { policyNumber: 'AC-TRV-100234', holderName: 'Anna Meier', status: 'ACTIVE', benefitPerTraveler: 600, currency: 'CHF', validFrom: '2026-01-01', validTo: '2026-12-31', maxTravelers: 6 },
  'AC-TRV-100235': { policyNumber: 'AC-TRV-100235', holderName: 'Rahul Verma', status: 'ACTIVE', benefitPerTraveler: 1200, currency: 'CHF', validFrom: '2026-01-01', validTo: '2026-12-31', maxTravelers: 4 },
  'AC-TRV-099001': { policyNumber: 'AC-TRV-099001', holderName: 'Jon Park', status: 'EXPIRED', benefitPerTraveler: 600, currency: 'CHF', validFrom: '2025-01-01', validTo: '2025-12-31', maxTravelers: 4 },
};
const flightRows = [
  ['LX1234', 'ZRH', 'LHR', 'Swiss', '08:10', 95, false], ['LX318', 'ZRH', 'JFK', 'Swiss', '10:25', 187, false], ['LH754', 'FRA', 'BLR', 'Lufthansa', '22:05', 70, false],
  ['QR570', 'MAA', 'DOH', 'Qatar Airways', '03:30', 130, false], ['6E201', 'MAA', 'DEL', 'IndiGo', '06:45', 12, false], ['BA117', 'LHR', 'JFK', 'British Airways', '09:15', 0, true],
  ['AI101', 'DEL', 'JFK', 'Air India', '02:20', 260, false], ['EK202', 'JFK', 'DXB', 'Emirates', '23:00', 5, false],
].map((r, i) => ({ id: i + 1, flightNumber: r[0], date: DAY, origin: r[1], destination: r[2], airline: r[3], scheduledDeparture: r[4], delayMinutes: r[5], cancelled: r[6] }));
const flightView = (r) => ({ flightNumber: r.flightNumber, date: r.date, origin: r.origin, destination: r.destination, airline: r.airline, scheduledDeparture: r.scheduledDeparture,
  status: r.cancelled ? 'CANCELLED' : r.delayMinutes >= 15 ? 'DELAYED' : 'ON_TIME', delayMinutes: r.cancelled ? 0 : r.delayMinutes, cancelled: r.cancelled });
const tier = (d, c) => (c ? 100 : d >= 240 ? 100 : d >= 180 ? 75 : d >= 120 ? 50 : d >= 60 ? 25 : 0);

const f = (no, a, b) => ({ flightNumber: no, date: DAY, origin: a, destination: b });
const p = (name, email) => ({ name, email });
const sc = (id, title, description, expectedPath, icon, policyNumber, name, email, flights, travelers, slaDuration) =>
  ({ id, title, description, expectedPath, icon, request: { policyNumber, claimant: { name, email }, flights, travelers, ...(slaDuration ? { slaDuration } : {}) } });
const scenarios = [
  sc('happy-path', 'Happy path - instant payout', 'One 95-minute delay on ZRH-LHR. Below the review threshold, so the claim is verified and paid with no human involvement.', '', 'zap', 'AC-TRV-100234', 'Anna Meier', 'anna.meier@example.com', [f('LX1234', 'ZRH', 'LHR')], [p('Anna Meier', 'anna.meier@example.com')]),
  sc('four-eyes', 'Long delay - four-eyes review', 'ZRH-JFK delayed 187 minutes for two travelers (CHF 1,800). The payout exceeds CHF 500, so two reviewers must approve one after the other.', '', 'users', 'AC-TRV-100235', 'Rahul Verma', 'rahul.verma@example.com', [f('LX318', 'ZRH', 'JFK')], [p('Rahul Verma', 'rahul.verma@example.com'), p('Priya Verma', 'priya.verma@example.com')]),
  sc('multi-leg', 'Multi-leg trip - parallel verification', 'Three legs verified in parallel by a multi-instance call activity. The longest delay (130 min, QR570) decides the 50% tier.', '', 'route', 'AC-TRV-100234', 'Meera Iyer', 'meera.iyer@example.com', [f('LH754', 'FRA', 'BLR'), f('QR570', 'MAA', 'DOH'), f('6E201', 'MAA', 'DEL')], [p('Meera Iyer', 'meera.iyer@example.com'), p('Karthik Iyer', 'karthik.iyer@example.com')]),
  sc('cancelled', 'Cancelled flight - 100% tier', 'BA117 was cancelled. The DMN table pays 100% of the benefit regardless of delay minutes.', '', 'ban', 'AC-TRV-100234', 'Lena Fischer', 'lena.fischer@example.com', [f('BA117', 'LHR', 'JFK')], [p('Lena Fischer', 'lena.fischer@example.com')]),
  sc('no-trigger', 'On-time flight - no payout', '6E201 was only 12 minutes late. The trigger is not reached, the claim is closed and the claimant is e-mailed.', '', 'check', 'AC-TRV-100234', 'Tom Becker', 'tom.becker@example.com', [f('6E201', 'MAA', 'DEL')], [p('Tom Becker', 'tom.becker@example.com')]),
  sc('payment-failure', 'Payment declined - finance escalation', 'The bank declines the transfer (HTTP 402). The settlement sub-process catches PAYMENT_FAILED and routes it to finance-ops.', '', 'alert', 'AC-TRV-100234', 'Omar Haddad', 'omar.haddad@decline.test', [f('LX1234', 'ZRH', 'LHR')], [p('Omar Haddad', 'omar.haddad@decline.test')]),
  sc('sla-breach', 'Slow bank - SLA timer', 'The gateway takes 12 s while the SLA is 8 s. The non-interrupting timer e-mails operations while settlement continues.', '', 'timer', 'AC-TRV-100234', 'Sofia Rossi', 'sofia.rossi@slow.test', [f('LX1234', 'ZRH', 'LHR')], [p('Sofia Rossi', 'sofia.rossi@slow.test')], 'PT8S'),
  sc('ineligible', 'Expired policy - rejected', 'Policy AC-TRV-099001 expired in 2025. The worker throws BPMN error POLICY_INVALID and the sub-process boundary terminates the claim.', '', 'x', 'AC-TRV-099001', 'Jon Park', 'jon.park@example.com', [f('LX318', 'ZRH', 'JFK')], [p('Jon Park', 'jon.park@example.com')]),
];

const claims = new Map();
const tasks = [];
const resolvers = new Map();
let seq = 1000;
const newKey = () => String(2251799813685000 + ++seq);
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newId = () => `CLM-2026-${Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('')}`;

const log = (c, source, type, message) => c.events.push({ id: c.events.length + 1, source, type, message, createdAt: now() });
const start = (c, elementId, name, type) => { c.elements.push({ elementId, name, type, state: 'ACTIVE', startDate: now(), endDate: null, hasIncident: false }); };
const finish = (c, elementId, state = 'COMPLETED') => { for (const e of c.elements) if (e.elementId === elementId && e.state === 'ACTIVE') { e.state = state; e.endDate = now(); } };
const step = async (c, elementId, name, type, ms) => { start(c, elementId, name, type); await sleep(ms); finish(c, elementId); };
const setStatus = (c, status, reason = null) => { c.status = status; c.statusReason = reason; c.updatedAt = now(); if (['PAID', 'CLOSED_NO_PAYOUT', 'REJECTED'].includes(status)) c.completedAt = now(); };

function waitForTask(c, elementId, name, group) {
  const t = { userTaskKey: newKey(), name, elementId, state: 'CREATED', assignee: null, candidateGroups: [group], creationDate: now(), processInstanceKey: c.processInstanceKey, claimId: c.claimId };
  tasks.push(t);
  start(c, elementId, name, 'USER_TASK');
  return new Promise((resolve) => resolvers.set(t.userTaskKey, resolve));
}

async function run(c) {
  const policy = policies[c.policyNumber];
  c.elements.push({ elementId: 'S_claim', name: 'Claim submitted', type: 'START_EVENT', state: 'COMPLETED', startDate: now(), endDate: now(), hasIncident: false });
  await step(c, 'T_register', 'Register claim', 'SERVICE_TASK', 900); setStatus(c, 'VALIDATING');
  log(c, 'WORKER', 'CLAIM_REGISTERED', `Claim registered in the claims core system; policy ${c.policyNumber} queued for validation`);
  await step(c, 'G_fork', '', 'PARALLEL_GATEWAY', 150);
  start(c, 'SP_elig', 'Policy & eligibility checks', 'SUB_PROCESS'); start(c, 'T_fraud', 'Assess fraud risk', 'SERVICE_TASK');
  c.elements.push({ elementId: 'S_elig', name: 'Check policy', type: 'START_EVENT', state: 'COMPLETED', startDate: now(), endDate: now(), hasIncident: false });
  start(c, 'T_policy', 'Validate policy', 'SERVICE_TASK');
  await sleep(1300);
  const prior = [...claims.values()].filter((x) => x !== c && x.claimantEmail.toLowerCase() === c.claimantEmail.toLowerCase()).length;
  c.fraudScore = Math.min(100, prior * 30 + (c.claimantEmail.endsWith('@fraud.test') ? 85 : 0));
  log(c, 'WORKER', 'FRAUD_SCORED', `Fraud risk score ${c.fraudScore}/100`);
  finish(c, 'T_fraud');
  const bad = !policy || policy.status !== 'ACTIVE' || c.flights.some((x) => x.date < policy.validFrom || x.date > policy.validTo);
  if (bad) {
    finish(c, 'T_policy', 'TERMINATED'); finish(c, 'SP_elig', 'TERMINATED');
    const why = !policy ? `Policy ${c.policyNumber} does not exist` : `Policy ${policy.policyNumber} is ${policy.status}`;
    log(c, 'WORKER', 'POLICY_INVALID', why);
    await step(c, 'B_policy', 'Policy invalid', 'BOUNDARY_EVENT', 300);
    await step(c, 'T_rej_inel', 'Mark rejected (ineligible)', 'SERVICE_TASK', 600);
    setStatus(c, 'REJECTED', why); log(c, 'WORKER', 'STATUS_REJECTED', `Claim moved to REJECTED: ${why}`);
    c.elements.push({ elementId: 'E_rej_inel', name: 'Claim rejected - ineligible', type: 'END_EVENT', state: 'COMPLETED', startDate: now(), endDate: now(), hasIncident: false });
    return end(c);
  }
  finish(c, 'T_policy'); c.elements.push({ elementId: 'E_elig', name: 'Policy valid', type: 'END_EVENT', state: 'COMPLETED', startDate: now(), endDate: now(), hasIncident: false }); finish(c, 'SP_elig');
  log(c, 'WORKER', 'POLICY_VALID', `Policy ${policy.policyNumber} is active and covers all flight dates; benefit ${policy.benefitPerTraveler} ${policy.currency} per traveler`);
  setStatus(c, 'VERIFYING');
  await step(c, 'G_join', '', 'PARALLEL_GATEWAY', 150);
  start(c, 'CA_verify', 'Verify each flight (parallel)', 'CALL_ACTIVITY');
  c.children = c.flights.map((x) => ({ processInstanceKey: newKey(), processDefinitionId: 'flight-verification', state: 'ACTIVE', hasIncident: false, startDate: now(), endDate: null }));
  await sleep(1800);
  c.flights.forEach((x, i) => {
    const r = flightRows.find((y) => y.flightNumber === x.flightNumber) || { delayMinutes: 0, cancelled: false };
    const pct = tier(r.delayMinutes, r.cancelled);
    Object.assign(x, { verifiedStatus: r.cancelled ? 'CANCELLED' : r.delayMinutes >= 15 ? 'DELAYED' : 'ON_TIME', verifiedDelayMinutes: r.cancelled ? 0 : r.delayMinutes, tierPercent: pct });
    c.children[i].state = 'COMPLETED'; c.children[i].endDate = now();
    log(c, 'CONNECTOR', 'FLIGHT_VERIFIED', `${x.flightNumber}: ${x.verifiedStatus}, ${x.verifiedDelayMinutes} min -> tier ${pct}%`);
  });
  finish(c, 'CA_verify');
  const maxPct = Math.max(...c.flights.map((x) => x.tierPercent));
  c.maxDelayMinutes = Math.max(...c.flights.map((x) => x.verifiedDelayMinutes));
  const per = Math.round(policy.benefitPerTraveler * maxPct) / 100;
  const total = per * c.travelers.length;
  await step(c, 'T_assess', 'Aggregate results & compute payout', 'SCRIPT_TASK', 700);
  await step(c, 'G_trigger', 'Parametric trigger met?', 'EXCLUSIVE_GATEWAY', 300);
  if (maxPct === 0) {
    await step(c, 'T_mail_none', 'Email: no payout due', 'SERVICE_TASK', 900);
    log(c, 'CONNECTOR', 'EMAIL_SENT', `E-mail sent to ${c.claimantEmail}: no payout due`);
    await step(c, 'T_closed', 'Mark closed (no payout)', 'SERVICE_TASK', 500);
    setStatus(c, 'CLOSED_NO_PAYOUT', 'Verified delay below parametric trigger');
    c.elements.push({ elementId: 'E_closed', name: 'Closed - no trigger', type: 'END_EVENT', state: 'COMPLETED', startDate: now(), endDate: now(), hasIncident: false });
    return end(c);
  }
  await step(c, 'G_review', 'Manual review needed?', 'EXCLUSIVE_GATEWAY', 300);
  if (total >= 500 || c.fraudScore >= 60) {
    setStatus(c, 'UNDER_REVIEW', 'Four-eyes review');
    for (const group of ['claims-handler', 'senior-reviewer']) {
      c.totalPayout = total; c.currency = policy.currency;
      const out = await waitForTask(c, 'UT_review', 'Four-eyes claim review (sequential)', group);
      finish(c, 'UT_review');
      if (out.decision !== 'APPROVE') {
        await step(c, 'G_decision', 'All reviewers approved?', 'EXCLUSIVE_GATEWAY', 300);
        await step(c, 'T_rej_rev', 'Mark rejected (review)', 'SERVICE_TASK', 500);
        setStatus(c, 'REJECTED', 'Rejected during four-eyes review'); log(c, 'WORKER', 'STATUS_REJECTED', 'Claim moved to REJECTED: Rejected during four-eyes review');
        c.elements.push({ elementId: 'E_rej_rev', name: 'Claim rejected - review', type: 'END_EVENT', state: 'COMPLETED', startDate: now(), endDate: now(), hasIncident: false });
        return end(c);
      }
    }
    await step(c, 'G_decision', 'All reviewers approved?', 'EXCLUSIVE_GATEWAY', 300);
  }
  await step(c, 'G_merge', '', 'EXCLUSIVE_GATEWAY', 150);
  setStatus(c, 'SETTLING');
  start(c, 'SP_settle', 'Payout settlement', 'SUB_PROCESS');
  c.elements.push({ elementId: 'S_settle', name: 'Settle', type: 'START_EVENT', state: 'COMPLETED', startDate: now(), endDate: now(), hasIncident: false });
  start(c, 'CA_pay', 'Pay each traveler (sequential)', 'CALL_ACTIVITY');
  const slow = c.claimantEmail.endsWith('@slow.test');
  const sla = c.slaDuration && /PT(\d+)S/.exec(c.slaDuration);
  if (slow && sla) setTimeout(() => { if (c.status === 'SETTLING') { start(c, 'B_sla', 'SLA timer', 'BOUNDARY_EVENT'); log(c, 'CONNECTOR', 'EMAIL_SENT', `SLA breach e-mail sent to ops@aeroclaim.example (${c.slaDuration})`); setTimeout(() => finish(c, 'B_sla'), 900 / SPEED); } }, Number(sla[1]) * 1000 / SPEED);
  for (const tr of c.travelers) {
    const child = { processInstanceKey: newKey(), processDefinitionId: 'payout-settlement', state: 'ACTIVE', hasIncident: false, startDate: now(), endDate: null };
    c.children.push(child);
    await sleep(slow ? 6000 : 1200);
    if (tr.email.endsWith('@decline.test')) {
      child.state = 'TERMINATED'; child.endDate = now(); log(c, 'CONNECTOR', 'PAYMENT_DECLINED', `Bank declined transfer of ${per} ${policy.currency} to ${tr.name}`);
      finish(c, 'CA_pay', 'TERMINATED'); finish(c, 'SP_settle', 'TERMINATED');
      await step(c, 'B_payfail', 'Payment failed', 'BOUNDARY_EVENT', 300);
      const fix = await waitForTask(c, 'UT_payfix', 'Resolve payment manually', 'finance-ops'); finish(c, 'UT_payfix');
      log(c, 'HUMAN', 'PAYMENT_RESOLVED', `Finance resolved the failed payment: ${fix.resolution}`);
      break;
    }
    const ref = `PAY-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
    c.payments.push({ reference: ref, beneficiary: tr.name, amount: per, currency: policy.currency, status: 'SETTLED', createdAt: now() });
    log(c, 'CONNECTOR', 'PAYMENT_SETTLED', `${per} ${policy.currency} transferred to ${tr.name} (${ref})`);
    log(c, 'CONNECTOR', 'EMAIL_SENT', `Payout receipt e-mailed to ${tr.email}`);
    child.state = 'COMPLETED'; child.endDate = now();
  }
  finish(c, 'CA_pay'); c.elements.push({ elementId: 'E_settle', name: 'Settled', type: 'END_EVENT', state: 'COMPLETED', startDate: now(), endDate: now(), hasIncident: false }); finish(c, 'SP_settle');
  await step(c, 'G_settled', '', 'EXCLUSIVE_GATEWAY', 150);
  await step(c, 'T_final', 'Finalize claim (paid)', 'SERVICE_TASK', 600);
  Object.assign(c, { totalPayout: total, currency: policy.currency });
  setStatus(c, 'PAID', `Parametric trigger reached - payout tier ${maxPct}%`); log(c, 'WORKER', 'CLAIM_PAID', `Claim settled: ${total} ${policy.currency} paid out (tier ${maxPct}%)`);
  await step(c, 'T_mail_paid', 'Email: claim settled', 'SERVICE_TASK', 800);
  log(c, 'CONNECTOR', 'EMAIL_SENT', `Settlement e-mail sent to ${c.claimantEmail}`);
  c.elements.push({ elementId: 'E_paid', name: 'Claim paid', type: 'END_EVENT', state: 'COMPLETED', startDate: now(), endDate: now(), hasIncident: false });
  end(c);
}
function end(c) { c.instanceState = 'COMPLETED'; }

const view = (c) => ({ claimId: c.claimId, policyNumber: c.policyNumber, claimantName: c.claimantName, claimantEmail: c.claimantEmail, status: c.status, statusReason: c.statusReason, processInstanceKey: c.processInstanceKey,
  totalPayout: c.totalPayout ?? null, currency: c.currency ?? null, maxDelayMinutes: c.maxDelayMinutes ?? null, fraudScore: c.fraudScore ?? null, createdAt: c.createdAt, updatedAt: c.updatedAt, completedAt: c.completedAt ?? null,
  flights: c.flights, travelers: c.travelers, payments: c.payments });

function submit(body) {
  const c = { claimId: newId(), policyNumber: body.policyNumber.trim().toUpperCase(), claimantName: body.claimant.name, claimantEmail: body.claimant.email, status: 'SUBMITTED', statusReason: null,
    processInstanceKey: newKey(), slaDuration: body.slaDuration, createdAt: now(), updatedAt: now(), flights: body.flights.map((x) => ({ ...x, flightNumber: x.flightNumber.replace(/\s/g, '').toUpperCase(), verifiedStatus: null, verifiedDelayMinutes: null, tierPercent: null })),
    travelers: body.travelers, payments: [], events: [], elements: [], children: [], instanceState: 'ACTIVE' };
  claims.set(c.claimId, c);
  log(c, 'SYSTEM', 'CLAIM_RECEIVED', `Claim submitted by ${c.claimantName} for policy ${c.policyNumber}`);
  log(c, 'SYSTEM', 'PROCESS_STARTED', `Process instance ${c.processInstanceKey} started in Camunda 8 (parametric-claim-main)`);
  run(c).catch((e) => console.error(e));
  return c;
}

const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((resolve) => { let s = ''; req.on('data', (d) => (s += d)); req.on('end', () => resolve(s ? JSON.parse(s) : {})); });
const taskView = (t) => ({ ...t, claim: view(claims.get(t.claimId)) });

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const seg = url.pathname.split('/').filter(Boolean);
  const m = req.method;
  try {
    if (seg[0] !== 'api') return json(res, 404, { message: 'Not found' });
    if (m === 'GET' && seg[1] === 'dashboard') {
      const all = [...claims.values()]; const by = {}; for (const s of ['SUBMITTED', 'VALIDATING', 'VERIFYING', 'UNDER_REVIEW', 'SETTLING', 'PAID', 'CLOSED_NO_PAYOUT', 'REJECTED']) by[s] = all.filter((c) => c.status === s).length;
      const paid = all.filter((c) => c.status === 'PAID');
      const stp = paid.filter((c) => !c.events.some((e) => e.type === 'TASK_COMPLETED')).length;
      return json(res, 200, { totalClaims: all.length, byStatus: by, totalPaidOut: paid.reduce((a, c) => a + (c.totalPayout || 0), 0), currency: 'CHF',
        avgMinutesToPayout: paid.length ? +(paid.reduce((a, c) => a + (new Date(c.completedAt) - new Date(c.createdAt)) / 60000, 0) / paid.length).toFixed(2) : 0,
        openClaims: all.filter((c) => !['PAID', 'CLOSED_NO_PAYOUT', 'REJECTED'].includes(c.status)).length, autoApprovalRate: paid.length ? +((stp * 100) / paid.length).toFixed(1) : 0, flightsMonitored: flightRows.map(flightView) });
    }
    if (m === 'GET' && seg[1] === 'scenarios') return json(res, 200, scenarios);
    if (m === 'GET' && seg[1] === 'policies') return policies[seg[2]?.toUpperCase()] ? json(res, 200, policies[seg[2].toUpperCase()]) : json(res, 404, { message: `Policy ${seg[2]} not found` });
    if (m === 'GET' && seg[1] === 'flights') return json(res, 200, flightRows.map((r) => ({ id: r.id, flight: flightView(r) })));
    if (m === 'PUT' && seg[1] === 'flights') { const r = flightRows.find((x) => x.id === Number(seg[2])); const b = await readBody(req); r.delayMinutes = b.delayMinutes; r.cancelled = !!b.cancelled; return json(res, 200, { id: r.id, flight: flightView(r) }); }
    if (m === 'GET' && seg[1] === 'models') { const file = path.join(MODELS, `${seg[2].replace(/[^a-z0-9-]/g, '')}.bpmn`); return fs.existsSync(file) ? (res.writeHead(200, { 'Content-Type': 'application/xml' }), res.end(fs.readFileSync(file))) : json(res, 404, { message: 'Model not found' }); }
    if (seg[1] === 'claims') {
      if (m === 'POST') { const b = await readBody(req); const errs = {}; if (!b.policyNumber) errs.policyNumber = 'must not be blank'; if (!b.flights?.length) errs.flights = 'must not be empty'; if (Object.keys(errs).length) return json(res, 400, { message: 'Validation failed', errors: errs }); return json(res, 201, view(submit(b))); }
      if (!seg[2]) return json(res, 200, [...claims.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(view));
      const c = claims.get(seg[2]); if (!c) return json(res, 404, { message: `Claim ${seg[2]} not found` });
      if (seg[3] === 'tracker') return json(res, 200, { claim: view(c), instanceState: c.instanceState, hasIncident: false, elements: c.elements, children: c.children, incidents: [], events: c.events, engineReachable: true });
      return json(res, 200, view(c));
    }
    if (seg[1] === 'tasks') {
      if (m === 'GET' && !seg[2]) { const g = url.searchParams.get('group'); return json(res, 200, tasks.filter((t) => t.state === 'CREATED' && (!g || t.candidateGroups.includes(g))).map(taskView)); }
      const t = tasks.find((x) => x.userTaskKey === seg[2]); if (!t) return json(res, 404, { message: 'Task not found' });
      if (m === 'GET') return json(res, 200, taskView(t));
      const b = await readBody(req);
      if (seg[3] === 'assign') { t.assignee = b.assignee; return json(res, 204, {}); }
      if (seg[3] === 'complete') { t.state = 'COMPLETED'; const c = claims.get(t.claimId); log(c, 'HUMAN', 'TASK_COMPLETED', `'${t.name}' completed by ${b.assignee || 'user'} - ${b.variables.decision || b.variables.resolution}`); resolvers.get(t.userTaskKey)?.(b.variables); res.writeHead(204); return res.end(); }
    }
    json(res, 404, { message: 'Not found' });
  } catch (e) { console.error(e); json(res, 500, { message: String(e.message || e) }); }
}).listen(8081, () => console.log('AeroClaim mock API on http://localhost:8081  (MOCK_SPEED=' + SPEED + ')'));
