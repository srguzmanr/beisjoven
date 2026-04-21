/* global React, StoryCard, ListCard, SectionHead, Placeholder, Pill, Icon, CAT_MAP, CATEGORIES */
// Homepage body: Mixed feed → Sponsor reservation → Juvenil rail → Gallery module → Per-category sections.

const HERO_STORY = {
  cat: 'juvenil',
  kicker: 'CONADEIP · Final 8 Tijuana',
  headline: 'Halcones Inter van por la corona de CONADEIP que se les ha negado en Tijuana',
  deck: 'Mañana arranca la Final 8. El eterno aspirante llega con su rotación más sólida en cinco años y la sensación, por fin, de que el trofeo puede cambiar de vitrina.',
  byline: 'Redacción Beisjoven',
  date: '19 abr 2026',
  label: 'hero photo · CONADEIP · 21:9',
};

const FEED = [
  { cat: 'seleccion', headline: 'Mexico Rojo se lleva el primer juego de la Serie del Caribe 2026',
    deck: 'Benji Gil apuesta por Kikuchi en el abridor del jueves.',
    byline: 'Redacción Beisjoven', date: '19 abr · hace 3h', label: 'mexico rojo · 16:10' },
  { cat: 'mlb', headline: 'Urías vuelve al bullpen en Dodger Stadium tras ocho meses',
    deck: 'El sinaloense tiró 28 lanzamientos y apunta a regreso en mayo.',
    byline: 'Redacción Beisjoven', date: '19 abr · hace 4h', label: 'pitcher mound · 16:10' },
  { cat: 'ligas', headline: 'Diablos anuncian rotación abridora para el arranque de LMB 2026',
    deck: 'Serie inaugural contra Sultanes del 24 al 26 de abril.',
    byline: 'Redacción Beisjoven', date: '19 abr · hace 6h', label: 'stadium aerial · 16:10' },
  { cat: 'juvenil', headline: 'Liga Mandarina arranca calendario 2026 con 14 equipos',
    deck: 'Conspiradores y Tigres lideran la preventa de boletos.',
    byline: 'Redacción Beisjoven', date: '18 abr', label: 'youth league · 1:1' },
  { cat: 'softbol', headline: 'Femenil Sub-18 cae en extra innings ante Japón en la Copa del Mundo',
    deck: 'México 1–2 en el octavo tras gran jugada del jardín central.',
    byline: 'Redacción Beisjoven', date: '18 abr', label: 'softball player · 1:1' },
  { cat: 'opinion', headline: 'Opinión: el beisbol mexicano tiene un problema de narrativa, no de talento',
    byline: 'Redacción Beisjoven', date: '18 abr', label: 'columnist · 1:1' },
];

const JUVENIL_RAIL = [
  { cat: 'juvenil', headline: 'Los 12 nombres de la generación 2009 que deben estar en el radar',
    deck: 'Prospectos que cruzan 90 mph y jardineros de brazo plus antes de los 17.',
    byline: 'Redacción Beisjoven', date: '19 abr', label: 'prospect showcase · 16:10' },
  { cat: 'juvenil', headline: 'Sub-18: Nuevo León y Sonora chocan por el boleto al Panamericano',
    byline: 'Redacción Beisjoven', date: '18 abr', label: 'youth game · 16:10' },
  { cat: 'juvenil', headline: 'Softbol femenil U-15: una crónica del torneo que empieza a llenar gradas',
    byline: 'Redacción Beisjoven', date: '17 abr', label: 'softball youth · 16:10' },
];

const MOST_READ = [
  { cat: 'mlb', headline: 'México sí tiene college baseball: 6 peloteros mexicanos en DI esta primavera', date: 'hace 3 días', label: 'college · 1:1' },
  { cat: 'juvenil', headline: 'Los 25 mejores prospectos juveniles de México — edición abril 2026', date: 'hace 4 días', label: 'ranking · 1:1' },
  { cat: 'ligas', headline: 'Guía de la temporada LMB 2026: favoritos, sorpresas y calendario crítico', date: 'hace 5 días', label: 'lmb guide · 1:1' },
  { cat: 'seleccion', headline: 'Clásico Mundial 2026: el calendario completo de México', date: 'hace 1 sem', label: 'wbc · 1:1' },
];

const CAT_SECTIONS = [
  { cat: 'mlb', title: 'MLB', stories: [
    { headline: 'Urías vuelve al bullpen en Dodger Stadium tras ocho meses', label: 'urias · 16:10' },
    { headline: 'García firma extensión de 4 años con los Rangers', label: 'garcia · 16:10' },
    { headline: 'Seis mexicanos abren rosters de MLB en 2026', label: 'rosters · 16:10' },
  ]},
  { cat: 'ligas', title: 'Ligas Mexicanas', stories: [
    { headline: 'Diablos anuncian rotación abridora para LMB 2026', label: 'diablos · 16:10' },
    { headline: 'LMP: Naranjeros confirman pretemporada en Mazatlán', label: 'naranjeros · 16:10' },
    { headline: 'Guía para seguir la LMB por primera vez: dónde, cuándo, cómo', label: 'guide · 16:10' },
  ]},
  { cat: 'seleccion', title: 'Selección', stories: [
    { headline: 'Mexico Rojo se lleva el primer juego de la Serie del Caribe', label: 'mexico rojo · 16:10' },
    { headline: 'Benji Gil define roster de 28 para Hermosillo', label: 'manager · 16:10' },
    { headline: 'Rumbo al Clásico 2026: 10 preguntas a la Selección', label: 'wbc · 16:10' },
  ]},
  { cat: 'softbol', title: 'Softbol', stories: [
    { headline: 'Femenil Sub-18 cae en extra innings ante Japón', label: 'japan · 16:10' },
    { headline: 'Sofbol Universitario 2026: calendario y favoritas', label: 'college · 16:10' },
    { headline: 'Tigresas del Norte anuncian staff técnico', label: 'staff · 16:10' },
  ]},
  { cat: 'opinion', title: 'Opinión', stories: [
    { headline: 'El beisbol mexicano tiene un problema de narrativa, no de talento', label: 'opinion · 16:10' },
    { headline: 'Por qué CONADEIP es la mejor historia del beisbol amateur', label: 'opinion · 16:10' },
    { headline: 'La carta: cinco cosas que deben cambiar en la LMB', label: 'opinion · 16:10' },
  ]},
];

const GALLERY = [
  { label: 'CONADEIP · juego 1 · 4:5' },
  { label: 'Mexico Rojo · celebración · 1:1' },
  { label: 'Liga Mandarina · tarde · 4:5' },
  { label: 'Conspiradores · fan · 1:1' },
  { label: 'CONADEIP · bullpen · 1:1' },
];

// ---------- Body root ----------
function HomeBody({ device, useCatColor }) {
  const isMob = device === 'mobile';
  return (
    <main>
      {/* Sponsor reservation — Phase 1 empty, swap-ready for Sprint 5 */}
      <SponsorReservation device={device}/>
      {/* Mixed feed */}
      <section style={{
        background: '#fff', padding: isMob ? '40px 0 8px' : '56px 32px 24px',
      }}>
        <div style={{ maxWidth: 'var(--w-page)', margin: '0 auto', padding: isMob ? '0 16px' : 0 }}>
          <MixedFeed device={device} useCatColor={useCatColor}/>
        </div>
      </section>
      {/* Juvenil rail — dark, navy */}
      <JuvenilRailSection device={device} useCatColor={useCatColor}/>
      {/* Photo gallery module */}
      <GallerySection device={device}/>
      {/* Per-category sections */}
      <section style={{ background: '#fff', padding: isMob ? '16px 0 48px' : '24px 32px 72px' }}>
        <div style={{ maxWidth: 'var(--w-page)', margin: '0 auto', padding: isMob ? '0 16px' : 0, display: 'flex', flexDirection: 'column', gap: isMob ? 40 : 56 }}>
          {CAT_SECTIONS.map(section => (
            <CategorySection key={section.cat} section={section} device={device} useCatColor={useCatColor}/>
          ))}
          <NewsletterBlock wide={!isMob}/>
        </div>
      </section>
    </main>
  );
}

function SponsorReservation({ device }) {
  const isMob = device === 'mobile';
  return (
    <div style={{
      background: '#F6F5F1',
      borderTop: '1px solid var(--rule)',
      borderBottom: '1px solid var(--rule)',
    }}>
      <div style={{
        maxWidth: 'var(--w-page)', margin: '0 auto',
        padding: isMob ? '14px 16px' : '18px 32px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--muted)', flex: '0 0 auto',
        }}>Sponsor · Phase 1</span>
        <span style={{ width: 1, height: 14, background: 'var(--rule-strong)', flex: '0 0 auto' }}/>
        <div style={{
          flex: 1, height: isMob ? 56 : 72,
          background: 'repeating-linear-gradient(135deg, rgba(27,42,74,0.04) 0 10px, transparent 10px 20px)',
          border: '1px dashed var(--rule-strong)',
          display: 'grid', placeItems: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--muted)', letterSpacing: '0.06em',
        }}>SPONSOR SLOT · 970×90 desktop / 320×50 mobile · Sprint 5</div>
      </div>
    </div>
  );
}

function MixedFeed({ device, useCatColor }) {
  const isMob = device === 'mobile';
  const [a, b, c, d, e, f] = FEED;
  return (
    <>
      <SectionHead title="Lo último" more="Todas las historias"/>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMob ? '1fr' : '1.55fr 1fr',
        gap: isMob ? 32 : 48,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMob ? '1fr' : '1fr 1fr', gap: isMob ? 28 : 32 }}>
          {[a, b, c, d].map((s, i) => <StoryCard key={i} story={s} device={device} useCatColor={useCatColor}/>)}
        </div>
        <aside>
          <SectionHead title="Más leídos" more=""/>
          <div>
            {MOST_READ.map((s, i) => (
              <ListCard key={i} story={s} useCatColor={useCatColor} rank={i + 1}/>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

function JuvenilRailSection({ device, useCatColor }) {
  const isMob = device === 'mobile';
  const accent = useCatColor ? 'var(--cat-juvenil)' : 'var(--gold)';
  return (
    <section style={{
      background: 'var(--navy)', color: '#fff',
      padding: isMob ? '40px 0' : '56px 32px',
    }}>
      <div style={{ maxWidth: 'var(--w-page)', margin: '0 auto', padding: isMob ? '0 16px' : 0 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 12,
          borderBottom: `2px solid ${accent}`, paddingBottom: 10, marginBottom: 24,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: accent,
          }}>Nuestra obsesión</span>
          <h2 className="h2" style={{ color: '#fff', fontSize: 'clamp(1.5rem, 1.2rem + 0.8vw, 2rem)', margin: 0 }}>Juvenil</h2>
          <span style={{ flex: 1 }}/>
          <a href="#" style={{
            color: '#fff', fontSize: 12, fontWeight: 600,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            Toda la cobertura <Icon name="arrow-right" size={14}/>
          </a>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMob ? '1fr' : '1.4fr 1fr 1fr',
          gap: isMob ? 28 : 36,
        }}>
          {JUVENIL_RAIL.map((s, i) => (
            <a key={i} href="#" style={{ color: '#fff', display: 'block' }}>
              <Placeholder ratio="16/10" label={s.label} variant="dark"/>
              <div style={{
                borderLeft: `4px solid ${accent}`,
                paddingLeft: 14, paddingTop: 12,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: accent,
                }}>JUVENIL</span>
                <h3 className="h3" style={{ color: '#fff', textWrap: 'balance', margin: 0 }}>{s.headline}</h3>
                {s.deck && (
                  <p className="body-sm" style={{ color: 'rgba(255,255,255,0.78)', margin: 0 }}>{s.deck}</p>
                )}
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                  {s.byline} · {s.date}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function GallerySection({ device }) {
  const isMob = device === 'mobile';
  return (
    <section style={{
      background: '#F6F5F1',
      padding: isMob ? '40px 0' : '56px 32px',
    }}>
      <div style={{ maxWidth: 'var(--w-page)', margin: '0 auto', padding: isMob ? '0 16px' : 0 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 12,
          borderBottom: '2px solid var(--navy)', paddingBottom: 10, marginBottom: 20,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--muted)',
          }}>Fotografía Beisjoven</span>
          <h2 className="h2" style={{ fontSize: 'clamp(1.25rem, 1.05rem + 0.6vw, 1.75rem)', margin: 0 }}>
            La semana, en imágenes
          </h2>
          <span style={{ flex: 1 }}/>
          <a href="#" style={{
            fontSize: 12, fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--navy)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            Ver galería <Icon name="arrow-right" size={14}/>
          </a>
        </div>
        {isMob ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}>
            <div style={{ gridRow: 'span 2' }}>
              <Placeholder ratio="3/4" label={GALLERY[0].label}/>
            </div>
            <Placeholder ratio="1/1" label={GALLERY[1].label}/>
            <Placeholder ratio="1/1" label={GALLERY[2].label}/>
            <div style={{ gridColumn: 'span 2' }}>
              <Placeholder ratio="2/1" label={GALLERY[3].label}/>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: 12, height: 480,
          }}>
            <div style={{ gridRow: 'span 2' }}>
              <Placeholder ratio="auto" label={GALLERY[0].label} style={{ height: '100%' }}/>
            </div>
            <Placeholder ratio="auto" label={GALLERY[1].label} style={{ height: '100%' }}/>
            <Placeholder ratio="auto" label={GALLERY[2].label} style={{ height: '100%' }}/>
            <Placeholder ratio="auto" label={GALLERY[3].label} style={{ height: '100%' }}/>
            <div style={{ position: 'relative' }}>
              <Placeholder ratio="auto" label={GALLERY[4].label} style={{ height: '100%' }}/>
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(15,27,51,0.75)',
                display: 'grid', placeItems: 'center', color: '#fff',
                fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 20,
              }}>+12 fotos</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function CategorySection({ section, device, useCatColor }) {
  const isMob = device === 'mobile';
  const cat = CAT_MAP[section.cat];
  const accent = useCatColor ? cat.color : 'var(--navy)';
  const stories = section.stories.map(s => ({ ...s, cat: section.cat, byline: 'Redacción Beisjoven', date: '19 abr 2026' }));
  return (
    <section>
      <SectionHead title={section.title} more={`Ver ${section.title}`} accent={accent}/>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMob ? '1fr' : '1.4fr 1fr 1fr',
        gap: isMob ? 24 : 28,
      }}>
        {stories.map((s, i) => <StoryCard key={i} story={s} device={device} useCatColor={useCatColor}/>)}
      </div>
    </section>
  );
}

function NewsletterBlock({ wide = false }) {
  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--rule)',
      padding: wide ? '28px 28px' : '20px',
      display: 'flex', flexDirection: wide ? 'row' : 'column', gap: wide ? 32 : 12,
      alignItems: wide ? 'center' : 'flex-start',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 6 }}>
          Newsletter
        </div>
        <h3 className="h3" style={{ fontSize: 'var(--text-h4)' }}>
          El Diamante — Lo esencial del beis mexicano, cada mañana.
        </h3>
        <p className="body-sm" style={{ marginTop: 6, color: 'var(--ink-2)' }}>
          7 minutos de lectura. Gratis. En español.
        </p>
      </div>
      <form style={{ display: 'flex', gap: 0, width: wide ? 'auto' : '100%' }}>
        <input type="email" placeholder="tu@email.com" style={{
          flex: 1, padding: '10px 12px',
          background: '#fff', border: '1px solid var(--rule-strong)',
          fontFamily: 'var(--font-body)', fontSize: 14,
          color: 'var(--navy)', width: wide ? 240 : 'auto',
        }}/>
        <button style={{
          padding: '10px 18px', background: 'var(--navy)', color: '#fff',
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, letterSpacing: '0.02em',
        }}>Suscribirse</button>
      </form>
    </div>
  );
}

Object.assign(window, { HomeBody, HERO_STORY, FEED, JUVENIL_RAIL, MOST_READ, CAT_SECTIONS });
