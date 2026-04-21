/* global React, Placeholder, Pill, Meta, Icon, CAT_MAP */
// Hero treatments (Safe / Default / Ambitious) + Card system with category left-border rule.

// === HERO ===
// Per-variant rules:
//   safe:      split (photo left, text right) — evolutionary, matches current pattern
//   default:   below (full-bleed photo, headline in prose block below) — NYT-like, image forward
//   ambitious: overlay (full-bleed photo + oversized H1 overlaid, asymmetric) — magazine feel

function Hero({ variant = 'default', story, device = 'mobile', useCatColor = true }) {
  if (variant === 'safe') return <HeroSafe story={story} device={device} useCatColor={useCatColor}/>;
  if (variant === 'ambitious') return <HeroAmbitious story={story} device={device} useCatColor={useCatColor}/>;
  return <HeroDefault story={story} device={device} useCatColor={useCatColor}/>;
}

function HeroSafe({ story, device, useCatColor }) {
  const cat = CAT_MAP[story.cat];
  const accent = useCatColor ? cat.color : 'var(--gold)';
  const isMob = device === 'mobile';
  return (
    <article style={{
      maxWidth: 'var(--w-page)', margin: '0 auto',
      padding: isMob ? '24px 16px 0' : '32px 32px 0',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMob ? '1fr' : '1.15fr 1fr',
        gap: isMob ? 20 : 40, alignItems: 'center',
      }}>
        <Placeholder ratio={isMob ? '16/10' : '4/3'} label={story.label}/>
        <div style={{
          borderLeft: `4px solid ${accent}`,
          paddingLeft: isMob ? 16 : 24,
          display: 'flex', flexDirection: 'column', gap: isMob ? 10 : 14,
        }}>
          <Pill cat={story.cat} useCatColor={useCatColor}/>
          <h1 className="h1" style={{ textWrap: 'balance' }}>{story.headline}</h1>
          {story.deck && (
            <p className="body" style={{ color: 'var(--ink-2)', maxWidth: 560, margin: 0 }}>{story.deck}</p>
          )}
          <Meta byline={story.byline} date={story.date}/>
        </div>
      </div>
    </article>
  );
}

function HeroDefault({ story, device, useCatColor }) {
  const cat = CAT_MAP[story.cat];
  const accent = useCatColor ? cat.color : 'var(--gold)';
  const isMob = device === 'mobile';
  return (
    <article style={{ background: '#fff' }}>
      <div style={{ position: 'relative' }}>
        <Placeholder
          ratio={isMob ? '4/5' : '16/8'}
          label={story.label}
          variant="dark"
        />
        {/* Subtle gradient anchors headline over image bottom on mobile; desktop still uses prose block below */}
        {isMob && (
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(15,27,51,0.92) 0%, rgba(15,27,51,0.55) 40%, rgba(15,27,51,0) 75%)',
          }}/>
        )}
        {isMob && (
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            padding: '20px 16px 22px', color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 28, height: 3, background: accent }}/>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent }}>{cat.label}</span>
              {story.kicker && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>· {story.kicker}</span>}
            </div>
            <h1 style={{
              fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '-0.02em',
              color: '#fff', textWrap: 'balance', margin: 0,
              fontSize: 'clamp(1.625rem, 1.4rem + 1.2vw, 2.125rem)', lineHeight: 1.15,
            }}>{story.headline}</h1>
          </div>
        )}
      </div>
      {!isMob && (
        <div style={{
          maxWidth: 'var(--w-break)', margin: '0 auto',
          padding: '28px 32px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ width: 32, height: 3, background: accent }}/>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent }}>{cat.label}</span>
            {story.kicker && (
              <>
                <span style={{ color: 'var(--rule-strong)' }}>·</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{story.kicker}</span>
              </>
            )}
          </div>
          <h1 className="h1" style={{
            textWrap: 'balance',
            fontSize: 'clamp(2.25rem, 1.75rem + 1.4vw, 3rem)',
            lineHeight: 1.1,
          }}>{story.headline}</h1>
          {story.deck && (
            <p className="body" style={{
              marginTop: 14, color: 'var(--ink-2)',
              maxWidth: 640,
              fontSize: '1.125rem', margin: '14px 0 0',
            }}>{story.deck}</p>
          )}
          <div style={{ marginTop: 18 }}>
            <Meta byline={story.byline} date={story.date}/>
          </div>
        </div>
      )}
      {isMob && story.deck && (
        <div style={{ padding: '16px 16px 4px' }}>
          <p className="body" style={{ color: 'var(--ink-2)', margin: 0 }}>{story.deck}</p>
          <div style={{ marginTop: 12 }}><Meta byline={story.byline} date={story.date}/></div>
        </div>
      )}
    </article>
  );
}

function HeroAmbitious({ story, device, useCatColor }) {
  const cat = CAT_MAP[story.cat];
  const accent = useCatColor ? cat.color : 'var(--gold)';
  const isMob = device === 'mobile';
  return (
    <article style={{ position: 'relative', overflow: 'hidden', background: 'var(--navy)' }}>
      <Placeholder
        ratio={isMob ? '4/5' : '21/9'}
        label={story.label}
        variant="dark"
        style={{ borderRadius: 0 }}
      />
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: isMob
          ? 'linear-gradient(to top, rgba(15,27,51,0.95) 15%, rgba(15,27,51,0.55) 50%, rgba(15,27,51,0.05) 80%)'
          : 'linear-gradient(to right, rgba(15,27,51,0.92) 0%, rgba(15,27,51,0.6) 40%, rgba(15,27,51,0.1) 75%)',
      }}/>
      <div style={{
        position: 'absolute', inset: 0,
        padding: isMob ? '20px 16px 28px' : '56px 48px',
        display: 'flex', alignItems: 'flex-end',
        color: '#fff',
      }}>
        <div style={{
          maxWidth: isMob ? '100%' : 720,
          display: 'flex', flexDirection: 'column', gap: isMob ? 10 : 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 32, height: 3, background: accent }}/>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: accent,
            }}>{cat.label}</span>
            {story.kicker && (
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.75)',
              }}>· {story.kicker}</span>
            )}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 800,
            letterSpacing: '-0.025em', color: '#fff', textWrap: 'balance', margin: 0,
            fontSize: isMob ? 'clamp(2rem, 1.6rem + 1.2vw, 2.5rem)' : 'clamp(3rem, 2rem + 2.2vw, 4.25rem)',
            lineHeight: 1.05,
          }}>{story.headline}</h1>
          {story.deck && (
            <p style={{
              fontSize: isMob ? 16 : 19, lineHeight: 1.55, margin: 0,
              color: 'rgba(255,255,255,0.88)', fontFamily: 'var(--font-body)',
              maxWidth: 620,
            }}>{story.deck}</p>
          )}
          <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: 500 }}>
            {story.byline} · {story.date}
          </div>
        </div>
      </div>
    </article>
  );
}

// === CARDS ===
// Standard card: photo on top, 4px category left border on text block, category pill tick, H3 headline, meta.
function StoryCard({ story, device = 'mobile', useCatColor = true, size = 'md' }) {
  const cat = CAT_MAP[story.cat];
  const accent = useCatColor ? cat.color : 'var(--rule-strong)';
  const ratio = size === 'sm' ? '1/1' : '16/10';
  return (
    <a href="#" className="bj-card" style={{ display: 'block' }}>
      <Placeholder ratio={ratio} label={story.label}/>
      <div style={{
        padding: size === 'sm' ? '12px 0 0 12px' : '14px 0 0 14px',
        marginTop: size === 'sm' ? 0 : 0,
        borderLeft: `4px solid ${accent}`,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <Pill cat={story.cat} useCatColor={useCatColor}/>
        <h3 className="h3" style={{
          textWrap: 'balance',
          fontSize: size === 'sm' ? 'var(--text-h4)' : 'var(--text-h3)',
          lineHeight: size === 'sm' ? 1.3 : 1.25,
          margin: 0,
        }}>{story.headline}</h3>
        {story.deck && size !== 'sm' && (
          <p className="body-sm" style={{ color: 'var(--ink-2)', margin: 0 }}>{story.deck}</p>
        )}
        <Meta byline={story.byline || 'Redacción Beisjoven'} date={story.date}/>
      </div>
    </a>
  );
}

// Compact list card (thumbnail left, text right)
function ListCard({ story, useCatColor = true, rank, inverse = false }) {
  const cat = CAT_MAP[story.cat];
  const accent = useCatColor ? cat.color : 'var(--rule-strong)';
  return (
    <a href="#" style={{
      display: 'grid',
      gridTemplateColumns: rank != null ? '20px 72px 1fr' : '72px 1fr',
      gap: 12, alignItems: 'start',
      padding: '14px 0',
      borderBottom: `1px solid ${inverse ? 'rgba(255,255,255,0.1)' : 'var(--rule)'}`,
      color: inverse ? '#fff' : 'inherit',
    }}>
      {rank != null && (
        <span style={{
          fontFamily: 'var(--font-heading)', fontWeight: 800,
          fontSize: 20, letterSpacing: '-0.02em', lineHeight: 1,
          color: inverse ? 'rgba(255,255,255,0.6)' : 'var(--navy)',
        }}>{rank}</span>
      )}
      <Placeholder ratio="1/1" label={story.label} variant={inverse ? 'dark' : 'default'}/>
      <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 10 }}>
        <div style={{ marginBottom: 4 }}>
          <Pill cat={story.cat} useCatColor={useCatColor}/>
        </div>
        <h4 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 600,
          fontSize: 15, lineHeight: 1.3, letterSpacing: '-0.005em',
          color: inverse ? '#fff' : 'var(--navy)', textWrap: 'balance', margin: 0,
        }}>{story.headline}</h4>
        <div style={{ marginTop: 6, fontSize: 13, color: inverse ? 'rgba(255,255,255,0.6)' : 'var(--muted)', fontWeight: 500 }}>
          {story.date}
        </div>
      </div>
    </a>
  );
}

// Section header — category underline (2px)
function SectionHead({ title, more = 'Ver todo', accent = 'var(--navy)', inverse = false }) {
  const fg = inverse ? '#fff' : 'var(--navy)';
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 12,
      borderBottom: `2px solid ${accent}`,
      paddingBottom: 10, marginBottom: 20,
    }}>
      <h2 className="h2" style={{
        color: fg,
        fontSize: 'clamp(1.25rem, 1.05rem + 0.6vw, 1.75rem)',
        letterSpacing: '-0.015em', margin: 0,
      }}>{title}</h2>
      <span style={{ flex: 1 }}/>
      {more && (
        <a href="#" style={{
          fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          color: inverse ? '#fff' : 'var(--navy)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>{more} <Icon name="arrow-right" size={14}/></a>
      )}
    </div>
  );
}

Object.assign(window, { Hero, HeroSafe, HeroDefault, HeroAmbitious, StoryCard, ListCard, SectionHead });
