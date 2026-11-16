import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

// No real authentication in this course project: the "role" simulates which Camunda candidate group the signed-in user belongs to.
export const ROLES = [
  { id: 'claims-handler', label: 'Claims handler', user: 'chandra.handler' },
  { id: 'senior-reviewer', label: 'Senior reviewer', user: 'sofia.senior' },
  { id: 'finance-ops', label: 'Finance operations', user: 'farid.finance' },
];

const Ctx = createContext(null);
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }) {
  const [roleId, setRoleId] = useState(() => {
    try { return localStorage.getItem('aeroclaim.role') || ROLES[0].id; } catch { return ROLES[0].id; }
  });
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    try { localStorage.setItem('aeroclaim.role', roleId); } catch { /* storage blocked */ }
  }, [roleId]);

  const toast = useCallback((message, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200);
  }, []);

  const value = useMemo(() => ({ role: ROLES.find((r) => r.id === roleId) || ROLES[0], roleId, setRoleId, toast }), [roleId, toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,380px)] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="panel pointer-events-auto flex items-start gap-3 p-3.5 shadow-2xl">
            {t.kind === 'ok' ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-go" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-stop" />}
            <p className="flex-1 text-sm">{t.message}</p>
            <button className="text-mist hover:text-snow" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
