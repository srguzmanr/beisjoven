/* global React, Logo, Icon, Pill, CATEGORIES */
// Three header bands: Safe / Default / Ambitious.
// All three share: chips-under-logo mobile nav (with right-edge fade),
// icon-only search (expanding overlay), Quick Hits + conditional Live strip,
// mobile auto-hide-on-scroll-down (simulated), desktop compact-sticky behavior.

const { useState, useEffect, useRef } = React;

// Quick Hits — always-present, editable (mocked here)
const QUICK_HITS = [
  'Mexico Rojo se lleva el primer juego de la Serie del Caribe',
  'Liga Mandarina arranca calendario con 14 equipos',
  'Conspiradores anuncian caravana escolar en Querétaro',
  'LMB: Calendario completo de la temporada 2026',
];

// Live event — shown only when liveActive
const LIVE_ITEM = {
  cat: 'juvenil',
  text: 'CONADEIP arranca hoy en Tijuana',
  score: 'Halcones Inter 3–2 Tecolotes · B4',
};

// ===== Sub-components =====

function CategoryChips({ active = 'inicio', useCatColor = true, inverse = false }) {
  // Horizontal scrollable chips. Right-edge gradient fade.
  const items = [
    { key: 'inicio', label: 'Inicio' },
    ...CATEGORIES.map(c => ({ key: c.key, label: c.short, color: c.color })),
  ];
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        <ul style={{
          listStyle: 'none', margin: 0,
          padding: '10px 28px 10px 16px',
          display: 'flex', gap: 20, whiteSpace: 'nowrap',
        }}>
          {items.map((it, i) => {
            const isActive = it.key === active;
            const accent = useCatColor && it.color ? it.color : 'var(--red)';
            const color = inverse
              ? (isActive ? '#fff' : 'rgba(255,255,255,0.78)')
              : (isActive ? 'var(--navy)' : 'var(--ink-2)');
            return (
              <li key={it.key} style={{ flex: '0 0 auto', position: 'relative' }}>
                <a href="#" className="nav-text" style={{
                  color,
                  fontWeight: isActive ? 700 : 500,
                  paddingBottom: 5, display: 'inline-block',
                }}>{it.label}</a>
                {isActive && <span style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0,
                  height: 2, background: accent,
                }}/>}
              </li>
            );
          })}
        </ul>
      </div>
      {/* Right-edge fade */}
      <span aria-hidden style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 32,
        pointerEvents: 'none',
        background: `linear-gradient(to right, transparent, ${inverse ? 'var(--navy)' : '#fff'} 75%)`,
      }}/>
    </div>
  );
}

function DesktopCategoryNav({ active = 'inicio', useCatColor = true, inverse = false, style = 'underline' }) {
  const items = [
    { key: 'inicio', label: 'Inicio' },
    ...CATEGORIES.map(c => ({ key: c.key, label: c.short, color: c.color })),
  ];
  return (
    <ul style={{
      listStyle: 'none', margin: 0, padding: 0,
      display: 'flex', gap: 30, alignItems: 'center', height: '100%',
    }}>
      {items.map(it => {
        const isActive = it.key === active;
        const accent = useCatColor && it.color ? it.color : 'var(--red)';
        const color = inverse
          ? (isActive ? '#fff' : 'rgba(255,255,255,0.78)')
          : (isActive ? 'var(--navy)' : 'var(--ink-2)');
        return (
          <li key={it.key} style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <a href="#" className="nav-text" style={{
              color, fontWeight: isActive ? 700 : 500,
              paddingBottom: 12, display: 'inline-block',
              borderBottom: isActive && style === 'underline' ? `2px solid ${accent}` : '2px solid transparent',
            }}>{it.label}</a>
          </li>
        );
      })}
    </ul>
  );
}

function QuickHitsBar({ items = QUICK_HITS, inverse = false }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % items.length), 4500);
    return () => clearInterval(t);
  }, [items.length]);
  const bg = inverse ? 'rgba(255,255,255,0.06)' : 'var(--bg-2)';
  const border = inverse ? 'rgba(255,255,255,0.1)' : 'var(--rule)';
  const fg = inverse ? '#fff' : 'var(--navy)';
  const metaColor = inverse ? 'rgba(255,255,255,0.6)' : 'var(--muted)';
  return (
    <div style={{
      background: bg,
      borderTop: `1px solid ${border}`,
      borderBottom: `1px solid ${border}`,
    }}>
      <div style={{
        maxWidth: 'var(--w-page)', margin: '0 auto',
        padding: '0 16px',
        height: 36,
        display: 'flex', alignItems: 'center', gap: 14, color: fg,
        fontSize: 13,
      }}>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: metaColor, flex: '0 0 auto',
        }}>Quick Hits</span>
        <span style={{ width: 1, height: 14, background: border, flex: '0 0 auto' }}/>
        <a href="#" style={{
          flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontWeight: 500,
        }}>{items[idx]}</a>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: metaColor, flex: '0 0 auto' }}>
          {idx + 1}/{items.length}
        </span>
      </div>
    </div>
  );
}

function LiveStrip({ inverse = false, compact = false, useCatColor = true }) {
  const cat = CATEGORIES.find(c => c.key === LIVE_ITEM.cat);
  const accent = useCatColor ? cat.color : 'var(--red)';
  return (
    <div style={{
      background: inverse ? 'var(--red)' : 'var(--navy)',
      color: '#fff',
      position: 'relative',
    }}>
      <div style={{
        maxWidth: 'var(--w-page)', margin: '0 auto',
        padding: '0 16px',
        height: compact ? 36 : 40,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: inverse ? 'rgba(255,255,255,0.2)' : 'var(--red)',
          color: '#fff',
          padding: '4px 8px',
          fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 800,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          borderRadius: 2, flex: '0 0 auto', whiteSpace: 'nowrap',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#fff',
            animation: 'bj-live-pulse 1.6s ease-out infinite', flex: '0 0 auto',
          }}/>
          EN&nbsp;VIVO
        </span>
        <span style={{
          fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
        }}>{LIVE_ITEM.text}{!compact && ' · ' + LIVE_ITEM.score}</span>
        <span style={{ flex: 1 }}/>
        {/* Category accent tab */}
        <span aria-hidden style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 2, background: accent,
        }}/>
      </div>
    </div>
  );
}

function SearchOverlay({ open, onClose, inverse = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(15,27,51,0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 50,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 56,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(720px, calc(100% - 32px))',
          background: '#fff', padding: 20, borderRadius: 4,
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.3)',
        }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '2px solid var(--navy)', paddingBottom: 10,
        }}>
          <Icon name="search" size={22} stroke="var(--navy)"/>
          <input autoFocus placeholder="Buscar en Beisjoven…" style={{
            flex: 1, border: 0, outline: 0,
            fontFamily: 'var(--font-heading)',
            fontSize: 22, fontWeight: 500, color: 'var(--navy)',
            letterSpacing: '-0.01em',
          }}/>
          <button onClick={onClose} aria-label="Cerrar" style={{
            width: 32, height: 32, display: 'grid', placeItems: 'center',
            color: 'var(--muted)', border: '1px solid var(--rule)', borderRadius: 2,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
          }}>ESC</button>
        </label>
        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="meta" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Populares</span>
          {['CONADEIP', 'Mexico Rojo', 'Urías', 'LMB calendario', 'Serie del Caribe'].map(t => (
            <button key={t} style={{
              padding: '6px 10px', background: 'var(--bg-2)', border: '1px solid var(--rule)',
              fontSize: 13, color: 'var(--navy)', borderRadius: 2,
            }}>{t}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ======= Auto-hide hook for mobile (simulated on an overflow-scroll viewport) =======
function useAutoHideOnScroll(ref, { threshold = 8 } = {}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = ref?.current;
    if (!el) return;
    // Find the scrollable viewport ancestor
    let scroller = el.parentElement;
    while (scroller && getComputedStyle(scroller).overflowY !== 'auto') scroller = scroller.parentElement;
    scroller = scroller || document.scrollingElement;
    let last = scroller.scrollTop;
    const onScroll = () => {
      const now = scroller.scrollTop;
      if (now < 80) { setHidden(false); last = now; return; }
      const dy = now - last;
      if (Math.abs(dy) < threshold) return;
      setHidden(dy > 0);
      last = now;
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [ref]);
  return hidden;
}

// =================================================
// HEADER — SAFE (evolutionary: current aesthetic preserved, tokens applied)
// =================================================
function HeaderSafe({ device = 'mobile', liveActive = true, useCatColor = true }) {
  const [search, setSearch] = useState(false);
  const wrapRef = useRef(null);
  const hidden = device === 'mobile' ? useAutoHideOnScroll(wrapRef) : false;

  if (device === 'mobile') {
    return (
      <div ref={wrapRef} style={{
        position: 'sticky', top: 0, zIndex: 30,
        transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
        transition: 'transform 0.25s ease',
        background: '#fff',
      }}>
        <header style={{ borderBottom: '1px solid var(--rule)' }}>
          <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4, position: 'relative' }}>
            <span style={{ flex: 1 }}/>
            <Logo variant="mark"/>
            <span style={{ flex: 1 }}/>
            <button aria-label="Buscar" onClick={() => setSearch(true)} style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', color: 'var(--navy)' }}>
              <Icon name="search" size={22}/>
            </button>
          </div>
          <CategoryChips useCatColor={useCatColor}/>
        </header>
        <QuickHitsBar/>
        {liveActive && <LiveStrip compact useCatColor={useCatColor}/>}
        <SearchOverlay open={search} onClose={() => setSearch(false)}/>
      </div>
    );
  }

  // Desktop Safe — masthead row + nav row. Sticky compact collapses to nav row only.
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#fff' }}>
      <header style={{ borderBottom: '1px solid var(--rule)' }}>
        <div style={{
          maxWidth: 'var(--w-page)', margin: '0 auto', padding: '0 32px',
          height: 72, display: 'flex', alignItems: 'center', gap: 24,
        }}>
          <Logo variant="mark+word"/>
          <span style={{ flex: 1 }}/>
          <span className="meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            DOM · 19 ABR · 2026
          </span>
          <span style={{ width: 1, height: 20, background: 'var(--rule)' }}/>
          <button aria-label="Buscar" onClick={() => setSearch(true)} style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', color: 'var(--navy)', borderRadius: 2 }}>
            <Icon name="search" size={22}/>
          </button>
        </div>
      </header>
      {/* Nav row (stays sticky when compact) */}
      <nav style={{ borderBottom: '1px solid var(--rule)', background: '#fff' }}>
        <div style={{ maxWidth: 'var(--w-page)', margin: '0 auto', padding: '0 32px', height: 48, display: 'flex', alignItems: 'flex-end' }}>
          <DesktopCategoryNav useCatColor={useCatColor}/>
        </div>
      </nav>
      <QuickHitsBar/>
      {liveActive && <LiveStrip useCatColor={useCatColor}/>}
      <SearchOverlay open={search} onClose={() => setSearch(false)}/>
    </div>
  );
}

// =================================================
// HEADER — DEFAULT (recommended: compact editorial single bar)
// =================================================
function HeaderDefault({ device = 'mobile', liveActive = true, useCatColor = true }) {
  const [search, setSearch] = useState(false);
  const wrapRef = useRef(null);
  const hidden = device === 'mobile' ? useAutoHideOnScroll(wrapRef) : false;

  if (device === 'mobile') {
    return (
      <div ref={wrapRef} style={{
        position: 'sticky', top: 0, zIndex: 30,
        transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
        transition: 'transform 0.25s ease',
      }}>
        <header style={{ background: '#fff', borderBottom: '1px solid var(--rule)' }}>
          <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 8px 0 16px', gap: 8 }}>
            <Logo variant="mark"/>
            <span style={{ flex: 1 }}/>
            <button aria-label="Buscar" onClick={() => setSearch(true)} style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', color: 'var(--navy)' }}>
              <Icon name="search" size={22}/>
            </button>
          </div>
          <CategoryChips useCatColor={useCatColor}/>
        </header>
        <QuickHitsBar/>
        {liveActive && <LiveStrip compact useCatColor={useCatColor}/>}
        <SearchOverlay open={search} onClose={() => setSearch(false)}/>
      </div>
    );
  }

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 30 }}>
      <header style={{ background: '#fff', borderBottom: '1px solid var(--rule)' }}>
        <div style={{
          maxWidth: 'var(--w-page)', margin: '0 auto', padding: '0 32px',
          height: 64, display: 'flex', alignItems: 'center', gap: 28,
        }}>
          <Logo variant="mark+word"/>
          <span style={{ height: 24, width: 1, background: 'var(--rule)' }}/>
          <nav style={{ flex: 1, alignSelf: 'stretch' }}>
            <DesktopCategoryNav useCatColor={useCatColor}/>
          </nav>
          <button aria-label="Buscar" onClick={() => setSearch(true)} style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', color: 'var(--navy)' }}>
            <Icon name="search" size={22}/>
          </button>
        </div>
      </header>
      <QuickHitsBar/>
      {liveActive && <LiveStrip useCatColor={useCatColor}/>}
      <SearchOverlay open={search} onClose={() => setSearch(false)}/>
    </div>
  );
}

// =================================================
// HEADER — AMBITIOUS (editorial magazine: oversized wordmark, nav inverse)
// =================================================
function HeaderAmbitious({ device = 'mobile', liveActive = true, useCatColor = true }) {
  const [search, setSearch] = useState(false);
  const wrapRef = useRef(null);
  const hidden = device === 'mobile' ? useAutoHideOnScroll(wrapRef) : false;

  if (device === 'mobile') {
    return (
      <div ref={wrapRef} style={{
        position: 'sticky', top: 0, zIndex: 30,
        transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
        transition: 'transform 0.25s ease',
      }}>
        <header style={{ background: '#fff' }}>
          <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4, borderBottom: '1px solid var(--rule)' }}>
            <span className="meta" style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--muted)', paddingLeft: 12,
            }}>Dom · 19 abr</span>
            <span style={{ flex: 1 }}/>
            <button aria-label="Buscar" onClick={() => setSearch(true)} style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', color: 'var(--navy)' }}>
              <Icon name="search" size={22}/>
            </button>
          </div>
          {/* Oversized wordmark */}
          <div style={{ padding: '14px 16px 8px', display: 'flex', justifyContent: 'center', borderBottom: '1px solid var(--rule)' }}>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800, letterSpacing: '-0.035em',
              fontSize: 36, color: 'var(--navy)', lineHeight: 1, textTransform: 'uppercase',
            }}>
              BEIS<span style={{ color: 'var(--red)' }}>JOVEN</span>
            </span>
          </div>
          <CategoryChips useCatColor={useCatColor}/>
        </header>
        <QuickHitsBar/>
        {liveActive && <LiveStrip compact useCatColor={useCatColor}/>}
        <SearchOverlay open={search} onClose={() => setSearch(false)}/>
      </div>
    );
  }

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#fff' }}>
      {/* Thin top rail */}
      <div style={{ borderBottom: '1px solid var(--rule)' }}>
        <div style={{
          maxWidth: 'var(--w-page)', margin: '0 auto', padding: '0 32px',
          height: 34, display: 'flex', alignItems: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--muted)',
        }}>
          <span>Dom · 19 abr 2026</span>
          <span style={{ flex: 1 }}/>
          <span style={{ fontFamily: 'var(--font-body)', textTransform: 'none', letterSpacing: 0, fontStyle: 'italic', color: 'var(--ink-2)' }}>
            Somos el futuro del beis
          </span>
          <span style={{ flex: 1 }}/>
          <button onClick={() => setSearch(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--navy)' }}>
            <Icon name="search" size={14}/> Buscar
          </button>
        </div>
      </div>
      {/* Big wordmark */}
      <div style={{
        maxWidth: 'var(--w-page)', margin: '0 auto',
        padding: '22px 32px 12px', display: 'flex', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 800, letterSpacing: '-0.035em',
          fontSize: 60, color: 'var(--navy)', lineHeight: 1, textTransform: 'uppercase',
        }}>
          BEIS<span style={{ color: 'var(--red)' }}>JOVEN</span>
        </span>
      </div>
      {/* Nav with 2px navy underline band */}
      <div style={{ borderTop: '1px solid var(--rule)', borderBottom: '2px solid var(--navy)' }}>
        <nav style={{ maxWidth: 'var(--w-page)', margin: '0 auto', padding: '0 32px', height: 48, display: 'flex', alignItems: 'flex-end' }}>
          <DesktopCategoryNav useCatColor={useCatColor}/>
        </nav>
      </div>
      <QuickHitsBar/>
      {liveActive && <LiveStrip useCatColor={useCatColor}/>}
      <SearchOverlay open={search} onClose={() => setSearch(false)}/>
    </div>
  );
}

Object.assign(window, {
  HeaderSafe, HeaderDefault, HeaderAmbitious,
  QuickHitsBar, LiveStrip, CategoryChips, DesktopCategoryNav,
  LIVE_ITEM, QUICK_HITS,
});
