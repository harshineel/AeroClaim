import React from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Inbox, LayoutDashboard, FilePlus2, ListChecks, Plane, SlidersHorizontal } from 'lucide-react';
import { api } from './api.js';
import { ROLES, useSession } from './components/Session.jsx';
import Overview from './pages/Overview.jsx';
import FileClaim from './pages/FileClaim.jsx';
import Claims from './pages/Claims.jsx';
import ClaimTracker from './pages/ClaimTracker.jsx';
import Tasklist from './pages/Tasklist.jsx';
import ControlTower from './pages/ControlTower.jsx';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/file', label: 'File a claim', icon: FilePlus2 },
  { to: '/claims', label: 'Claims', icon: ListChecks },
  { to: '/tasks', label: 'Tasklist', icon: Inbox, badge: true },
  { to: '/control-tower', label: 'Control tower', icon: SlidersHorizontal },
];

export default function App() {
  const { role, roleId, setRoleId } = useSession();
  const health = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, refetchInterval: 6000 });
  const tasks = useQuery({ queryKey: ['tasks', roleId], queryFn: () => api.tasks(roleId), refetchInterval: 4000, retry: false });
  const online = !health.isError;

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <header className="sticky top-0 z-40 border-b border-ink-600/60 bg-ink-900/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-board text-ink-950"><Plane className="h-[18px] w-[18px] -rotate-45" /></span>
            <span className="text-lg">AeroClaim</span>
          </NavLink>
          <nav className="ml-4 hidden gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => `relative flex items-center gap-2 rounded-lg px-3 py-2 text-[0.95rem] transition ${isActive ? 'bg-ink-700 text-snow' : 'text-mist hover:text-snow'}`}>
                <n.icon className="h-4 w-4" />{n.label}
                {n.badge && tasks.data?.length > 0 && <span className="rounded-full bg-board px-1.5 text-xs font-bold text-ink-950">{tasks.data.length}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className={`hidden items-center gap-1.5 text-sm sm:flex ${online ? 'text-go' : 'text-stop'}`}>
              <span className={`h-2 w-2 rounded-full bg-current ${online ? '' : 'animate-pulse'}`} />{online ? 'Backend online' : 'Backend offline'}
            </span>
            <label className="sr-only" htmlFor="role">Signed in as</label>
            <select id="role" className="field !w-auto !py-1.5 text-sm" value={roleId} onChange={(e) => setRoleId(e.target.value)} title="Simulated login: decides which tasks you see">
              {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 pt-6">
        {!online && !health.isLoading && (
          <div className="mb-5 rounded-lg border border-stop/50 bg-stop/10 px-4 py-3 text-sm text-stop">
            The backend does not answer on <code className="font-mono">/api</code>. Start it with <code className="font-mono">docker compose up</code> or run the mock server with <code className="font-mono">npm run mock</code>.
          </div>
        )}
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/file" element={<FileClaim />} />
          <Route path="/claims" element={<Claims />} />
          <Route path="/claims/:claimId" element={<ClaimTracker />} />
          <Route path="/tasks" element={<Tasklist />} />
          <Route path="/control-tower" element={<ControlTower />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink-600/60 bg-ink-900/95 backdrop-blur md:hidden" aria-label="Main (mobile)">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[0.7rem] ${isActive ? 'text-board' : 'text-mist'}`}>
            <n.icon className="h-5 w-5" />{n.label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
      <span className="sr-only">Signed in as {role.label}</span>
    </div>
  );
}
