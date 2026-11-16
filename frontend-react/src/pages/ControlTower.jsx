import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { api } from '../api.js';
import { useSession } from '../components/Session.jsx';
import DelayBar from '../components/DelayBar.jsx';
import { tierFor } from '../lib/tier.js';

function Row({ row }) {
  const { toast } = useSession();
  const qc = useQueryClient();
  const f = row.flight;
  const [delay, setDelay] = useState(f.delayMinutes);
  const [cancelled, setCancelled] = useState(f.cancelled);
  const dirty = delay !== f.delayMinutes || cancelled !== f.cancelled;
  const save = useMutation({
    mutationFn: () => api.updateFlight(row.id, { delayMinutes: Number(delay), cancelled }),
    onSuccess: () => { toast(`${f.flightNumber} updated - new claims will see this data`); qc.invalidateQueries({ queryKey: ['flights'] }); },
    onError: (e) => toast(e.message, 'error'),
  });
  const pct = tierFor(Number(delay), cancelled);
  return (
    <li className="panel panel-pad">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-mono text-xl font-bold">{f.flightNumber}</span>
        <span className="text-mist">{f.origin} to {f.destination} - {f.airline}</span>
        <span className={`ml-auto font-mono text-lg font-bold ${pct ? 'text-board' : 'text-go'}`}>pays {pct}%</span>
      </div>
      <div className="mt-4 grid items-center gap-4 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <label className="sr-only" htmlFor={`d${row.id}`}>Delay minutes for {f.flightNumber}</label>
          <input id={`d${row.id}`} type="range" min="0" max="300" step="5" value={delay} disabled={cancelled} onChange={(e) => setDelay(Number(e.target.value))} className="w-full accent-[#FFB224]" />
          <DelayBar delay={Number(delay)} cancelled={cancelled} />
          <p className="mt-1.5 font-mono text-sm text-mist">{cancelled ? 'cancelled' : `${delay} minutes late`}</p>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#FF6B6B]" checked={cancelled} onChange={(e) => setCancelled(e.target.checked)} />Cancelled</label>
        <button type="button" className="btn-primary" disabled={!dirty || save.isPending} onClick={() => save.mutate()}><Save className="h-4 w-4" />Apply</button>
      </div>
    </li>
  );
}

export default function ControlTower() {
  const { data, isLoading } = useQuery({ queryKey: ['flights'], queryFn: api.flights });
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Control tower</h1>
      <p className="mt-1 max-w-[64ch] text-mist">This stands in for the real flight data provider. Change a delay, then file a claim for that flight: the REST connector in the BPMN model fetches whatever you set here.</p>
      <ul className="mt-6 grid gap-4 lg:grid-cols-2">
        {isLoading && <li className="panel h-40 animate-pulse" />}
        {data?.map((row) => <Row key={`${row.id}-${row.flight.delayMinutes}-${row.flight.cancelled}`} row={row} />)}
      </ul>
    </div>
  );
}
