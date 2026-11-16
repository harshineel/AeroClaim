import React, { useEffect, useRef, useState } from 'react';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const reduce = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** One split-flap cell: cycles through random characters, then settles on the target. */
function Cell({ char, delay, tone }) {
  const [shown, setShown] = useState(reduce() ? char : ' ');
  const [flipping, setFlipping] = useState(false);
  const timer = useRef();

  useEffect(() => {
    if (reduce() || char === ' ') { setShown(char); return undefined; }
    let n = 0;
    const cycles = 5 + Math.floor(Math.random() * 6);
    const start = setTimeout(() => {
      setFlipping(true);
      timer.current = setInterval(() => {
        n += 1;
        if (n >= cycles) { clearInterval(timer.current); setShown(char); setFlipping(false); }
        else setShown(CHARSET[Math.floor(Math.random() * CHARSET.length)]);
      }, 55);
    }, delay);
    return () => { clearTimeout(start); clearInterval(timer.current); };
  }, [char, delay]);

  return <span className={`flap ${flipping ? 'flipping' : ''} ${tone || ''}`}>{shown}</span>;
}

/** Text rendered as split-flap cells. `width` pads with blanks so columns line up like a real board. */
export default function SplitFlap({ text, width = 0, tone = '', baseDelay = 0, className = '' }) {
  const chars = String(text ?? '').toUpperCase().padEnd(width, ' ').split('');
  return (
    <span className={`inline-flex whitespace-nowrap text-[1.05rem] sm:text-[1.2rem] ${className}`} aria-label={String(text)}>
      {chars.map((c, i) => <Cell key={i} char={c} tone={tone} delay={baseDelay + i * 45} />)}
    </span>
  );
}
