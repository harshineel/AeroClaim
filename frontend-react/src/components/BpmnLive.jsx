import React, { useEffect, useRef, useState } from 'react';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import { Crosshair, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

const MARKERS = ['done', 'active', 'incident', 'terminated'];

/** Collapse the engine's element instances to one marker per BPMN element id (incident > active > done > terminated). */
function markersFrom(elements = []) {
  const out = {};
  const rank = { terminated: 1, done: 2, active: 3, incident: 4 };
  for (const e of elements) {
    if (!e.elementId) continue;
    let m = e.state === 'ACTIVE' ? 'active' : e.state === 'COMPLETED' ? 'done' : e.state === 'TERMINATED' ? 'terminated' : null;
    if (e.hasIncident) m = 'incident';
    if (m && (!out[e.elementId] || rank[m] > rank[out[e.elementId]])) out[e.elementId] = m;
  }
  return out;
}

/** Renders the deployed BPMN model with bpmn-js and lights up steps from live Camunda element instances. */
export default function BpmnLive({ xml, elements, height = 420 }) {
  const host = useRef(null);
  const viewer = useRef(null);
  const [ready, setReady] = useState(false);
  const [follow, setFollow] = useState(true);
  const applied = useRef({});

  useEffect(() => {
    viewer.current = new NavigatedViewer({ container: host.current });
    return () => viewer.current?.destroy();
  }, []);

  useEffect(() => {
    if (!xml || !viewer.current) return;
    setReady(false);
    viewer.current.importXML(xml).then(() => {
      viewer.current.get('canvas').zoom('fit-viewport', 'auto');
      applied.current = {};
      setReady(true);
    }).catch((e) => console.error('BPMN import failed', e));
  }, [xml]);

  useEffect(() => {
    if (!ready) return;
    const canvas = viewer.current.get('canvas');
    const registry = viewer.current.get('elementRegistry');
    const next = markersFrom(elements);
    for (const id of new Set([...Object.keys(applied.current), ...Object.keys(next)])) {
      if (!registry.get(id) || applied.current[id] === next[id]) continue;
      MARKERS.forEach((m) => canvas.removeMarker(id, m));
      if (next[id]) canvas.addMarker(id, next[id]);
    }
    applied.current = next;
    if (follow) focusActive(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, ready, follow]);

  function focusActive(marks = applied.current) {
    const canvas = viewer.current.get('canvas');
    const registry = viewer.current.get('elementRegistry');
    const ids = Object.keys(marks).filter((id) => marks[id] === 'active' || marks[id] === 'incident');
    const shape = ids.map((id) => registry.get(id)).filter((e) => e && e.width && !e.waypoints).sort((a, b) => b.x - a.x)[0];
    if (!shape) return;
    const box = host.current.getBoundingClientRect();
    const z = 0.9;
    canvas.zoom(z);
    canvas.viewbox({ x: shape.x + shape.width / 2 - box.width / 2 / z, y: shape.y + shape.height / 2 - box.height / 2 / z, width: box.width / z, height: box.height / z });
  }

  const zoom = (f) => { const c = viewer.current.get('canvas'); c.zoom(c.zoom() * f); setFollow(false); };
  const tool = '!bg-white/80 !px-2.5 !py-1.5 !text-ink-900';

  return (
    <div className="relative">
      <div ref={host} className="bpmn-paper w-full" style={{ height }} aria-label="Live BPMN process diagram" />
      <div className="absolute right-3 top-3 flex gap-1.5">
        <button className={`btn-ghost ${tool}`} title="Zoom in" onClick={() => zoom(1.25)}><ZoomIn className="h-4 w-4" /></button>
        <button className={`btn-ghost ${tool}`} title="Zoom out" onClick={() => zoom(0.8)}><ZoomOut className="h-4 w-4" /></button>
        <button className={`btn-ghost ${tool}`} title="Fit whole process" onClick={() => { viewer.current.get('canvas').zoom('fit-viewport', 'auto'); setFollow(false); }}><Maximize2 className="h-4 w-4" /></button>
        <button className={`btn-ghost !px-2.5 !py-1.5 ${follow ? '!bg-board !text-ink-950 !border-board' : '!bg-white/80 !text-ink-900'}`} title="Follow the active step" onClick={() => { setFollow(true); focusActive(); }}><Crosshair className="h-4 w-4" /></button>
      </div>
      <ul className="absolute bottom-3 left-3 flex gap-3 rounded-lg bg-white/85 px-3 py-1.5 text-xs text-ink-900">
        <li className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#12A05F]" />done</li>
        <li className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#E08A00]" />running</li>
        <li className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#D62F2F]" />incident</li>
      </ul>
    </div>
  );
}
