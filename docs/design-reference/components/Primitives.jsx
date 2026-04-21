/* global React */
// Shared primitives: logo, icons, placeholder, pills, category system.

const CATEGORIES = [
  { key: 'mlb',       label: 'MLB',            color: 'var(--cat-mlb)',       short: 'MLB' },
  { key: 'ligas',     label: 'Ligas Mexicanas', color: 'var(--cat-ligas)',     short: 'LIGAS MX' },
  { key: 'seleccion', label: 'Selección',      color: 'var(--cat-seleccion)', short: 'SELECCIÓN' },
  { key: 'softbol',   label: 'Softbol',        color: 'var(--cat-softbol)',   short: 'SOFTBOL' },
  { key: 'juvenil',   label: 'Juvenil',        color: 'var(--cat-juvenil)',   short: 'JUVENIL' },
  { key: 'opinion',   label: 'Opinión',        color: 'var(--cat-opinion)',   short: 'OPINIÓN' },
];
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

// ------- Logo (BJ mark) -------
// A custom, original mark: stacked BJ monogram inside a rounded-square shield,
// with a single angled pinstripe. Uses brand navy + red + gold.
function BJMark({ size = 36, mono = false }) {
  const nav = mono ? '#fff' : 'var(--navy)';
  const red = mono ? '#fff' : 'var(--red)';
  const gold = mono ? '#fff' : 'var(--gold)';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label="Beisjoven" role="img">
      <rect x="1.5" y="1.5" width="45" height="45" rx="10" fill={nav} />
      {/* diagonal pinstripe */}
      <path d="M 2 36 L 34 4" stroke={gold} strokeWidth="2.5" opacity="0.85" />
      {/* BJ monogram, set in Plus Jakarta Sans weight 800 */}
      <text
        x="24" y="32"
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontWeight="800"
        fontSize="22"
        letterSpacing="-1"
        fill="#fff"
      >BJ</text>
      {/* red accent tick */}
      <rect x="34" y="34" width="10" height="3" fill={red} />
    </svg>
  );
}

function Wordmark({ invert = false, compact = false }) {
  const color = invert ? '#fff' : 'var(--navy)';
  return (
    <span
      style={{
        fontFamily: 'var(--font-heading)',
        fontWeight: 800,
        letterSpacing: '-0.02em',
        fontSize: compact ? 16 : 20,
        color,
        lineHeight: 1,
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 2,
      }}
    >
      BEIS<span style={{ color: invert ? 'var(--gold)' : 'var(--red)' }}>JOVEN</span>
    </span>
  );
}

function Logo({ variant = 'mark+word', invert = false, compact = false }) {
  const size = compact ? 28 : 36;
  if (variant === 'mark') return <BJMark size={size} mono={invert} />;
  if (variant === 'word') return <Wordmark invert={invert} compact={compact} />;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <BJMark size={size} mono={invert} />
      <Wordmark invert={invert} compact={compact} />
    </span>
  );
}

// ------- Icons (minimal, stroke-based) -------
function Icon({ name, size = 20, stroke = 'currentColor', strokeWidth = 1.75 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'search':
      return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'menu':
      return <svg {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case 'close':
      return <svg {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'arrow-right':
      return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case 'arrow-down':
      return <svg {...p}><path d="M12 5v14M6 13l6 6 6-6"/></svg>;
    case 'chevron-down':
      return <svg {...p}><path d="M6 9l6 6 6-6"/></svg>;
    case 'mail':
      return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></svg>;
    case 'play':
      return <svg {...p} fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>;
    case 'bookmark':
      return <svg {...p}><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>;
    case 'home':
      return <svg {...p}><path d="M3 10l9-7 9 7v11a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V10z"/></svg>;
    case 'grid':
      return <svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case 'user':
      return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>;
    case 'live-dot':
      return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>;
    default: return null;
  }
}

// ------- Placeholder image -------
function Placeholder({ ratio = '16/9', label = 'photo', variant = 'default', style = {}, children }) {
  const cls = 'ph' + (variant === 'dark' ? ' ph--dark' : '');
  return (
    <div
      className={cls}
      data-label={label}
      style={{ aspectRatio: ratio, width: '100%', ...style }}
    >{children}</div>
  );
}

// ------- Pill -------
function Pill({ cat, variant = 'solid', useCatColor = true, children, style = {} }) {
  const c = CAT_MAP[cat];
  const label = children ?? c?.short ?? '';
  const accent = useCatColor && c ? c.color : 'var(--navy)';
  if (variant === 'ghost') {
    return (
      <span
        className="pill pill--ghost"
        style={{ color: accent, borderColor: accent, ...style }}
      >{label}</span>
    );
  }
  if (variant === 'tick') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--navy)',
          ...style
        }}
      >
        <span style={{ width: 12, height: 2, background: accent }}/>
        {label}
      </span>
    );
  }
  return (
    <span
      className="pill"
      style={{ background: accent, ...style }}
    >{label}</span>
  );
}

function LivePill({ children = 'LIVE' }) {
  return <span className="pill pill--live">{children}</span>;
}

// ------- Meta row (byline + date) -------
function Meta({ byline = 'Redacción Beisjoven', date = '19 abr 2026', compact = false }) {
  return (
    <div className="meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{byline}</span>
      <span aria-hidden style={{ opacity: 0.4 }}>·</span>
      <span>{date}</span>
    </div>
  );
}

// Expose
Object.assign(window, {
  CATEGORIES, CAT_MAP,
  BJMark, Wordmark, Logo,
  Icon, Placeholder, Pill, LivePill, Meta,
});
