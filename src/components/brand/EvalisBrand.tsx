import { Link } from 'react-router-dom';

export function EvalisMark({ size = 34 }: { size?: number }) {
  return <svg className="evalis-mark" width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M7 7.5h17.5a8 8 0 0 1 8 8V33H15a8 8 0 0 1-8-8V7.5Z" fill="currentColor"/>
    <path d="M13 13.5h10.5a3 3 0 0 1 3 3V27H16a3 3 0 0 1-3-3V13.5Z" fill="var(--brand-cut, #fff)"/>
    <path d="M26.5 7v7h6.8" stroke="var(--brand-signal, #ff6b4a)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

export function EvalisBrand({ to = '/', compact = false }: { to?: string; compact?: boolean }) {
  return <Link to={to} className={`evalis-wordmark ${compact ? 'is-compact' : ''}`} aria-label="Evalis home">
    <EvalisMark size={compact ? 30 : 36}/><span>evalis</span><i>Academic OS</i>
  </Link>;
}
