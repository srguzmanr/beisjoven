/* global React, ReactDOM, HeaderSafe, HeaderDefault, HeaderAmbitious, Hero, HomeBody, Logo, Icon */
const { useState, useEffect, useRef } = React;

const DEFAULTS = /*EDITMODE-BEGIN*/{
  "band": "default",
  "useCatColor": true,
  "liveActive": true
}/*EDITMODE-END*/;

const STORAGE_KEY = 'beisjoven.prototype.v2';

function usePersistedTweaks() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULTS;
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);
  const update = (patch) => setState(s => ({ ...s, ...patch }));
  return [state, update];
}

function useHostEditMode(onActivate, onDeactivate) {
  useEffect(() => {
    const handler = (e) => {
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === '__activate_edit_mode') onActivate?.();
      if (msg.type === '__deactivate_edit_mode') onDeactivate?.();
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, [onActivate, onDeactivate]);
}

// ------- Composition -------
function BeisjovenHome({ device, tweaks }) {
  const { band, useCatColor, liveActive } = tweaks;
  const Header = {
    safe:      HeaderSafe,
    default:   HeaderDefault,
    ambitious: HeaderAmbitious,
  }[band];
  return (
    <div style={{
      minHeight: '100%',
      background: '#fff',
      fontFamily: 'var(--font-body)',
      color: 'var(--ink)',
      display: 'flex', flexDirection: 'column',
    }}>
      <Header device={device} liveActive={liveActive} useCatColor={useCatColor}/>
      <Hero variant={band} story={window.HERO_STORY} device={device} useCatColor={useCatColor}/>
      <HomeBody device={device} useCatColor={useCatColor}/>
      <footer style={{
        marginTop: 'auto', background: 'var(--navy)', color: 'rgba(255,255,255,0.8)',
        padding: device === 'mobile' ? '32px 16px 32px' : '48px 32px 40px',
        fontFamily: 'var(--font-body)', fontSize: 13,
      }}>
        <div style={{ maxWidth: 'var(--w-page)', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <Logo variant="mark+word" invert compact={device === 'mobile'}/>
          </div>
          <p style={{ maxWidth: 520, lineHeight: 1.6, margin: 0, color: 'rgba(255,255,255,0.7)' }}>
            Somos el futuro del beis. 14+ años cubriendo el beisbol y softbol mexicano con rigor editorial.
          </p>
          <div style={{ marginTop: 20, display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
            <a href="#">Contacto</a>
            <a href="#">Newsletter</a>
            <a href="#">Política de privacidad</a>
            <a href="#">© 2026 Beisjoven</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ------- Device frames -------
function MobileFrame({ tweaks }) {
  return (
    <div className="frame-mobile" data-screen-label="Mobile 375">
      <div className="frame-mobile__status">
        <span>9:41</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><rect x="0" y="4" width="3" height="6"/><rect x="4" y="2" width="3" height="8"/><rect x="8" y="0" width="3" height="10"/><rect x="12" y="5" width="3" height="5" opacity="0.4"/></svg>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 7a6 6 0 0 1 12 0M4 7a3 3 0 0 1 6 0M7 7.5a0.5 0.5 0 0 1 0 0.01" strokeLinecap="round"/></svg>
          <svg width="22" height="10" viewBox="0 0 22 10" fill="none"><rect x="0.5" y="0.5" width="19" height="9" rx="2" stroke="currentColor"/><rect x="2" y="2" width="14" height="6" rx="1" fill="currentColor"/><rect x="20" y="3" width="1.5" height="4" rx="0.5" fill="currentColor"/></svg>
        </span>
      </div>
      <div className="frame-mobile__viewport" style={{ paddingTop: 44 }}>
        <BeisjovenHome device="mobile" tweaks={tweaks}/>
      </div>
    </div>
  );
}

function DesktopFrame({ tweaks, scale = 0.62 }) {
  return (
    <div className="frame-desktop" data-screen-label="Desktop 1280">
      <div className="frame-desktop__chrome">
        <span className="frame-desktop__dot" style={{ background: '#ED6A5E' }}/>
        <span className="frame-desktop__dot" style={{ background: '#F5BF4F' }}/>
        <span className="frame-desktop__dot" style={{ background: '#61C554' }}/>
        <span className="frame-desktop__url">beisjoven.com</span>
      </div>
      <div className="frame-desktop__viewport">
        <div
          className="frame-desktop__scaler"
          style={{ width: 1280, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          <BeisjovenHome device="desktop" tweaks={tweaks}/>
        </div>
      </div>
    </div>
  );
}

function Seg({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map(o => (
        <button
          key={o.value} aria-pressed={value === o.value}
          onClick={() => onChange(o.value)} title={o.title || ''}
        >{o.label}</button>
      ))}
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <button className="toggle" aria-pressed={!!value} onClick={() => onChange(!value)}>
      <span className="toggle__track"><span className="toggle__thumb"/></span>
      <span className="toggle__label">{label}</span>
    </button>
  );
}

function TweaksPanel({ tweaks, update, onClose }) {
  const bandDescs = {
    safe: 'Evolutionary. Current aesthetic + tokens + category colors. Split hero (photo left, text right). Masthead + nav.',
    default: 'Recommended. Image-forward full-bleed hero, headline in prose block below (NYT-like). Compact single-bar header.',
    ambitious: 'Editorial magazine. Oversized wordmark masthead, full-bleed photo with overlaid H1, asymmetric grid, more whitespace.',
  };
  return (
    <div className="tweaks" role="dialog" aria-label="Tweaks">
      <div className="tweaks__head">
        <span style={{ width: 8, height: 8, background: 'var(--gold)' }}/>
        <span className="tweaks__title">Tweaks</span>
        <button className="tweaks__close" onClick={onClose} aria-label="Cerrar">×</button>
      </div>
      <div className="tweaks__body">
        <div className="tweak">
          <span className="tweak__label">Design band</span>
          <Seg
            value={tweaks.band}
            onChange={v => update({ band: v })}
            options={[
              { value: 'safe', label: 'Safe' },
              { value: 'default', label: 'Default' },
              { value: 'ambitious', label: 'Ambitious' },
            ]}
          />
          <span className="tweak__desc">{bandDescs[tweaks.band]}</span>
        </div>
        <div className="tweak">
          <span className="tweak__label">Category color system</span>
          <Toggle
            value={tweaks.useCatColor}
            onChange={v => update({ useCatColor: v })}
            label={tweaks.useCatColor ? 'Per-category accents' : 'Single gold accent'}
          />
          <span className="tweak__desc">
            On = MLB blue, Ligas green, Selección red, Softbol purple, Juvenil gold, Opinión gray. Applied to pill bg, 4px card left-border, 2px section underline.
          </span>
        </div>
        <div className="tweak">
          <span className="tweak__label">Live event</span>
          <Toggle
            value={tweaks.liveActive}
            onChange={v => update({ liveActive: v })}
            label={tweaks.liveActive ? 'CONADEIP Final 8 live' : 'No live event'}
          />
          <span className="tweak__desc">
            LIVE strip stacks above Quick Hits only when a live event is active. Rest of year: only Quick Hits shows.
          </span>
        </div>
        <hr className="rule" style={{ margin: '4px 0' }}/>
        <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
          Headers have auto-hide-on-scroll on mobile. All type uses clamp() per Spec v1.1. →{' '}
          <a href="./Spec.html" style={{ color: 'var(--navy)', textDecoration: 'underline' }}>Spec & anatomy</a>
        </div>
      </div>
    </div>
  );
}

function Root() {
  const [tweaks, update] = usePersistedTweaks();
  const [showTweaks, setShowTweaks] = useState(true);

  useHostEditMode(() => setShowTweaks(true), () => setShowTweaks(false));

  const patchAndPost = (patch) => {
    update(patch);
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*'); } catch {}
  };

  return (
    <div className="proto-shell">
      <div className="proto-topbar">
        <Logo variant="mark+word" invert compact/>
        <span className="proto-topbar__brand">
          <span>Homepage & Header Redesign</span>
          <span style={{ marginLeft: 8, opacity: 0.6, fontWeight: 400 }}>
            · band: <b style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>{tweaks.band}</b>
          </span>
        </span>
        <span className="proto-topbar__spacer"/>
        <a href="./Spec.html" className="proto-topbar__meta" style={{ textDecoration: 'underline' }}>Spec/Cards →</a>
        <span className="proto-topbar__meta">v2 · 19 Abr 2026</span>
      </div>
      <div className="proto-stage">
        <div className="proto-col" style={{ width: 375 }}>
          <span className="proto-col__label">
            <b>Mobile</b> 375 · primary (76.6%) · auto-hide header on scroll
          </span>
          <MobileFrame tweaks={tweaks}/>
        </div>
        <div className="proto-col">
          <span className="proto-col__label">
            <b>Desktop</b> 1280 logical · compact sticky · page container 1200
          </span>
          <DesktopFrame tweaks={tweaks}/>
        </div>
      </div>

      {showTweaks ? (
        <TweaksPanel tweaks={tweaks} update={patchAndPost} onClose={() => setShowTweaks(false)}/>
      ) : (
        <button className="tweaks-fab" onClick={() => setShowTweaks(true)}>
          <span className="dot"/> Tweaks
        </button>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root/>);
