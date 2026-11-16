export const money = (n, cur = 'CHF') =>
  n == null ? '-' : `${cur} ${Number(n).toLocaleString('en-CH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const minutes = (m) => {
  if (m == null) return '-';
  const h = Math.floor(m / 60), r = m % 60;
  return h ? `${h} h ${String(r).padStart(2, '0')} min` : `${r} min`;
};

export const ago = (iso) => {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

export const clock = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-GB') : '');

export const STATUS = {
  SUBMITTED: { label: 'Submitted', tone: 'mist' },
  VALIDATING: { label: 'Checking policy', tone: 'sky' },
  VERIFYING: { label: 'Verifying flights', tone: 'sky' },
  UNDER_REVIEW: { label: 'In review', tone: 'board' },
  SETTLING: { label: 'Paying out', tone: 'board' },
  PAID: { label: 'Paid', tone: 'go' },
  CLOSED_NO_PAYOUT: { label: 'No payout due', tone: 'mist' },
  REJECTED: { label: 'Rejected', tone: 'stop' },
};
export const TERMINAL = ['PAID', 'CLOSED_NO_PAYOUT', 'REJECTED'];

export const TONE = {
  mist: 'text-mist border-mist/40 bg-mist/10',
  sky: 'text-sky border-sky/40 bg-sky/10',
  board: 'text-board border-board/40 bg-board/10',
  go: 'text-go border-go/40 bg-go/10',
  stop: 'text-stop border-stop/40 bg-stop/10',
};
