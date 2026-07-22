# URL-AUDIT-01 — Inventario de emisión y propagación de URLs

**Fecha del censo:** 2026-07-22 · **Naturaleza:** solo lectura (cero cambios de código, cero escrituras a DB)
**Estado:** reporte de rama — NO doctrina. El PM decide qué se integra a la biblia.

**Metodología:** barrido estático del repo completo (grep + lectura de cada emisor), SELECTs nivel 1 vía MCP sobre `anuncios`, `quick_hits` y `videos` para documentar el estado servido hoy. La verificación por `curl` de canonical/og:url en producción **no fue posible desde este contenedor** (el egress bloquea `beisjoven.com`; el proxy devuelve 403 en el CONNECT) — las filas de canonical/og se derivan del código y quedan pendientes de QA visual manual (lado CEO).

**Clasificación:** `INTERNO-OK` (limpio por doctrina) · `EXTERNO-SIN-UTM` (candidato a instrumentación futura) · `UTM-CANÓNICO` (buildAdHref) · `FUERA-DE-CONVENCIÓN` (params no censados — flag rojo).

---

## Tabla maestra

| # | Superficie | Archivo(s) | URL que emite | ¿Limpia o con params? | Params exactos | ¿Conforme a convención? | Flag |
|---|---|---|---|---|---|---|---|
| 1a | Compartir en X (pie de artículo) | `src/components/ShareButtons.astro:15` | `https://x.com/intent/tweet?url=<articleUrl>&text=<titulo>` | Params del intent; la URL compartida va **limpia** | `url`, `text` (ambos `encodeURIComponent`) | EXTERNO-SIN-UTM | — |
| 1b | Compartir en Facebook | `src/components/ShareButtons.astro:24` | `https://www.facebook.com/sharer/sharer.php?u=<articleUrl>` | Param del intent; URL compartida **limpia** | `u` | EXTERNO-SIN-UTM | — |
| 1c | Compartir en WhatsApp | `src/components/ShareButtons.astro:33` | `https://api.whatsapp.com/send?text=<titulo>%20<articleUrl>` | Param del intent; URL compartida **limpia** (embebida en `text`) | `text` | EXTERNO-SIN-UTM | — |
| 2 | Links internos: cards y rails (ArticleCard, ListCard, HeroArticle, HeroDefault, StoryCard, MostReadWidget, JuvenilRail) | `src/components/*.astro` | `/articulo/<slug>`; JuvenilRail CTA `/categoria/juvenil` | Limpia | ninguno | INTERNO-OK | — |
| 3 | Nav Header | `src/components/Header.astro:53,67,77,88,117,127,135` | `/`, `/categoria/<slug>`, `/tu-historia` | Limpia | ninguno | INTERNO-OK | — |
| 4 | Footer (interno) | `src/components/Footer.astro:7-34,42,96-101` | `/`, `/categoria/<slug>` ×6, `/tu-historia`, `/#newsletter-form`, `/nosotros`, `/contacto`, `/privacidad`, `/terminos`, `/avisos-cookies` | Limpia (una ancla `#newsletter-form`) | ninguno | INTERNO-OK | — |
| 5 | Footer + /contacto (redes salientes) | `Footer.astro:50,53,56` · `src/pages/contacto.astro:30-32` | `https://facebook.com/beisjoven`, `https://instagram.com/beisjoven`, `https://x.com/beisjoven` | Limpia | ninguno | EXTERNO-SIN-UTM | — |
| 6 | Breadcrumb, CategoryPill, CategorySection, SectionHead/Title, Gallery, TuHistoriaCTA, NewsletterBlock | `src/components/*.astro` | `/`, `/categoria/<slug>`, `/galeria`, `/tu-historia`, `/privacidad` | Limpia | ninguno | INTERNO-OK | — |
| 7 | Tags en pie de artículo | `src/pages/articulo/[...slug].astro:192` | `/tag/<slug>` | Limpia | ninguno | INTERNO-OK | — |
| 8 | Paginación (categoría, tag, autor, wbc-2026) | `src/lib/pagination.ts:54` + `[...page].astro` | `/base` (pág. 1) · `/base/<N>` (pág. ≥2) — **path segments, nunca query** | Limpia | ninguno | INTERNO-OK | — |
| 9 | Videos en portada (MixedFeed → VideoTile) | `src/components/MixedFeed.astro:62,65` · `VideoTile.astro:20` | `/video/<slug>` (4 tiles; 10 videos `publicado=true` en DB) y "Ver más" → `/videos` | Limpia | ninguno | INTERNO-OK (limpio) | 🔶 **Ruta `/video/[slug]` NO existe** en `src/pages` → 404 salvo 4 slugs legacy con redirect; `/videos` redirige a `/` (vercel.json). Links rotos activos en portada. |
| 10 | Canonical + `og:url` (todas las páginas) | `src/layouts/BaseLayout.astro:27,37,68,73` + `url=` por página | Absolutas sobre `SITE_URL` (`https://beisjoven.com`); default usa **solo** `Astro.url.pathname` → query entrante (UTMs de Social) nunca se propaga al canonical; trailing slash recortado; paginadas canonicalizan a pág. 1 | Limpia | ninguno | INTERNO-OK | Verificación en prod pendiente (egress bloqueado) |
| 11 | `og:image` | `src/lib/og-image-generator.ts` (`ensureOgImage`) + `BaseLayout.astro:40` | `https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/public/imagenes/<ruta>-og.jpg` (1200×630); fallback `imagen_url` original | Limpia, absoluta | ninguno | INTERNO-OK (propagación) | — |
| 12 | Sitemap | `src/pages/sitemap.xml.ts` | Absolutas `SITE_URL` limpias: estáticas, categorías/autores/tags con paginación path, eventos, wbc-2026, artículos (solo publicados) | Limpia | ninguno | INTERNO-OK | ⚪ Incluye `/tu-historia/terminos`, página marcada `noIndex` (contradicción menor sitemap↔robots-meta) |
| 13 | robots.txt | `src/pages/robots.txt.ts` | `Sitemap: https://beisjoven.com/sitemap.xml`; Disallow `/admin`, `/login`, `/buscar` | Limpia | ninguno | INTERNO-OK | — |
| 14 | RSS / feeds | — | **No existe ningún feed** (RSS/Atom) en el repo | n/a | n/a | n/a — estado censado para Growth Pack | — |
| 15 | Redirects | `astro.config.mjs:74-79` · `vercel.json:36-137` | 4 reglas Astro + 19 Vercel + rewrite `/admin/:path*` → `/admin`. **Ninguna agrega ni borra query params** (Vercel preserva la query por defecto) | No tocan params | ninguno | INTERNO-OK | 🔶 12 reglas legacy apuntan a destinos top-level **inexistentes** (`/seleccion`, `/juvenil`, `/mlb`, `/softbol`, `/liga-mexicana`) → 404 tras el redirect |
| 16 | Correo interno (aviso a redacción) | `src/lib/historia-emails.ts:44-65` | `https://beisjoven.com/admin/historias` | Limpia, absoluta | ninguno | INTERNO-OK (superficie privada) | — |
| 17 | Correo de acuse (remitente Tu Historia) | `src/lib/historia-emails.ts:68-125` | `https://beisjoven.com` (html) + `beisjoven.com` (texto plano) | Limpia | ninguno | EXTERNO-SIN-UTM | — |
| 18 | **Display saliente — buildAdHref** | `src/lib/ad-utm.js:31-52` · `src/components/AdSlot.astro:67-69` | `<target_url>?utm_source=beisjoven&utm_medium=display[&utm_campaign=<campana>]&utm_content=<slot_id>` — solo tipos `propia`/`aliado` | Con UTMs (por diseño) | `utm_source=beisjoven`, `utm_medium=display`, `utm_campaign=anuncios.campana` (omitido si NULL), `utm_content=slot_id` | **UTM-CANÓNICO** | Hoy **latente**: 0 UTMs en HTML vivo (ver §buildAdHref). 🔶 Fila QA inactiva `qa-test` → `beisjoven.com/nosotros` etiquetaría el propio dominio si se activa |
| 19 | JSON-LD Organization | `BaseLayout.astro:43-55` | `url: SITE_URL`, `logo: SITE_URL/brand/logo-lockup.png`, `sameAs`: facebook/instagram/**twitter.com**/beisjoven | Limpia | ninguno | INTERNO-OK (propagación) | ⚪ `sameAs` usa `twitter.com/beisjoven`; Footer y /contacto usan `x.com/beisjoven` (entidad inconsistente) |
| 20 | JSON-LD NewsArticle + BreadcrumbList | `src/pages/articulo/[...slug].astro:70-111` | `mainEntityOfPage`/`url` = `SITE_URL/articulo/<slug>`; autor `SITE_URL/autor/<slug>`; items breadcrumb absolutos | Limpia | ninguno | INTERNO-OK (propagación) | — |
| 21 | JSON-LD Person (autor) | `src/pages/autor/[slug]/[...page].astro:34-49` | `url: SITE_URL/autor/<slug>`, `worksFor.url: SITE_URL` | Limpia | ninguno | INTERNO-OK (propagación) | — |
| 22 | Búsqueda (form + overlay) | `src/pages/buscar.astro:8,20-23` · `src/components/SearchOverlay.astro:474-504` | Form GET → `/buscar?q=<término>`; overlay JS → `/buscar?q=<término>[&cat=<slug>]` vía `window.location.href` | Params funcionales internos | `q` (siempre), `cat` (solo overlay, si scope ≠ "Todo") | INTERNO-OK (funcionales, no tracking; página `noIndex` + Disallow en robots) | ⚪ `cat` se emite pero el servidor lo **ignora** (`buscar.astro` solo lee `q`) — param muerto |
| 23 | Admin — botón "copiar link" | `public/js/admin.js:563,2829-2859` | `https://beisjoven.com/articulo/<slug>` → clipboard | Limpia, absoluta | ninguno | EXTERNO-SIN-UTM (distribución manual: es la URL que se pega en redes) | — |
| 24 | Admin — links "ver artículo" | `public/js/admin.js:555,2179,3902` | `/articulo/<slug>` (`target=_blank`) | Limpia | ninguno | INTERNO-OK | — |
| 25 | Admin — WhatsApp a autor de historia | `public/js/admin.js:3887` | `https://wa.me/<teléfono-solo-dígitos>` | Limpia | ninguno | EXTERNO-SIN-UTM (contacto 1:1, sin atribución) | — |
| 26 | Admin — navegación interna | `public/js/router.js` · `admin.js:3890` | Path-based (History API): `/admin/...`, `/admin/editar/<id>`; única query: `/admin/nuevo?historia=<id>` | Un param funcional privado | `historia` | INTERNO-OK (no público) | — |
| 27 | Admin — media library "copiar URL" | `public/js/media-library-core.js:947-948,1095` | URL pública de imagen en Supabase Storage | Limpia, absoluta | ninguno | INTERNO-OK (asset, no navegación) | — |
| 28 | QuickHitsBar | `src/components/QuickHitsBar.astro:10,26` · montado en `src/pages/index.astro:194` | `hit.url` — **URL arbitraria de la tabla `quick_hits`** (interna o externa; externa → `target=_blank rel="noopener noreferrer"`) | Depende del contenido de DB | los que traiga la fila | Hoy n/a — tabla **vacía** (0 filas) | 🔶 Vector futuro: no hay validación de params; una fila con UTMs ad hoc entraría directo al HTML de portada |
| 29 | Web Share API / copy-link público | — | **No existen** (`navigator.share` ausente; clipboard solo en admin). Compartir público = solo los 3 intents de la fila 1 | n/a | n/a | n/a | — |

### Recursos externos no navegables (fuera del alcance de atribución)

Cargas de `src`/`fetch`, no hrefs: GA4 `googletagmanager.com/gtag/js?id=G-1RE839J27Q` (BaseLayout:107), Google Fonts (BaseLayout:116-119, admin), Turnstile `challenges.cloudflare.com/turnstile/v0/api.js?onload=…&render=explicit` (tu-historia.astro:1201) y su `siteverify` server-side (enviar-historia.ts:99), embeds condicionales `platform.twitter.com/widgets.js` / `instagram.com/embed.js` / `tiktok.com/embed.js` (articulo), `cdn.jsdelivr.net` supabase-js (admin), thumbnails `img.youtube.com/vi/<id>/mqdefault.jpg` (VideoTile), REST Supabase `increment_vistas` y beacons `/api/ad-event` (AdSlot). Ninguno emite URL navegable ni afecta la serie de atribución.

---

## Detalle 1 — Botones de compartir (insumo para la spec de instrumentación)

Componente único: `src/components/ShareButtons.astro`. Sin JS — tres `<a>` estáticos con `target="_blank" rel="noopener"`, renderizados server-side. Props: `url` (string), `title` (string); ambos pasan por `encodeURIComponent` en frontmatter (líneas 8-9).

Único punto de montaje: `src/pages/articulo/[...slug].astro:202` → `<ShareButtons url={articleUrl} title={articulo.titulo} />`, con `articleUrl = ${SITE_URL}/articulo/${articulo.slug}` (línea 46) — absoluta y limpia. Orden en el pie: Tags → **ShareButtons** → Relacionados → TuHistoriaCTA → AdSlot `article-footer`.

Formato exacto por red:

| Red | Intent | La URL del artículo viaja en |
|---|---|---|
| X | `https://x.com/intent/tweet?url=<enc(articleUrl)>&text=<enc(titulo)>` | param `url` |
| Facebook | `https://www.facebook.com/sharer/sharer.php?u=<enc(articleUrl)>` | param `u` |
| WhatsApp | `https://api.whatsapp.com/send?text=<enc(titulo)>%20<enc(articleUrl)>` | dentro de `text`, tras el título y un espacio |

Implicación para la serie actual: la URL que aterriza en la red va **sin UTMs** → esos clics entran como referral (`l.facebook.com`, `t.co`, etc.) salvo que el post se etiquete a mano (convención Social entrante). Instrumentar aquí = decisión del PM; hoy no hay contaminación, solo ausencia de señal.

## Detalle 2 — buildAdHref (sistema canónico de UTM saliente)

`src/lib/ad-utm.js` — builder puro, server-side (el HTML cacheado por ISR ya sale etiquetado), consumido **exclusivamente** por `src/components/AdSlot.astro:68`. Reglas (spec NOMENCLATURA-Y-TRAZABILIDAD):

- Solo tipos pagados `propia` | `aliado`. `casa` y `placeholder` devuelven `target_url` intacto (sin UTMs hacia propiedades propias).
- Params: `utm_source=beisjoven`, `utm_medium=display`, `utm_campaign=<anuncios.campana>` (omitido si NULL/vacío), `utm_content=<slot_id>` (`home-top` | `home-mid` | `article-body` | `article-footer`).
- URL relativa o no-http(s) → intacta. `utm_*` preexistente en `target_url` → el valor de DB gana (nunca duplica ni sobreescribe). Construcción vía API `URL`, no concatenación.
- Cobertura de tests: `tests/ad-utm.test.mjs` (7 casos, incluidos fragmentos y params previos).

**Origen de valores (tabla `anuncios`, censo 2026-07-22):** 20 filas en 4 slots. Las 3 activas son `placeholder` **sin `imagen_url`** → el filtro de servibles (`imagen_url && target_url`, AdSlot:49) las descarta → los slots renderizan caja placeholder **sin `<a>`**. Resultado: **el sistema Display saliente está latente — hoy no hay ni un solo href con UTM en el HTML servido.** Los 17 anuncios pagados/casa (Rafiki, Black Koi 360, Caja Inmaculada, CEDISMAN, Multiclosets, casa) están `activo=false`, todos con `campana=NULL` y los pagados sin `target_url`.

**Confirmación (criterio de aceptación #4):** grep case-insensitive de `utm` sobre todo el repo (excl. `package-lock.json`) → únicas apariciones: `src/lib/ad-utm.js`, su consumidor `AdSlot.astro`, `tests/ad-utm.test.mjs`, comentarios en `supabase/migrations/20260712_ads_golive_prep_01.sql` y typedefs de `src/lib/supabase.ts` (más un falso positivo: "inp**utm**ode" en docs). **`buildAdHref` es el único punto del código que agrega UTMs a un href.** Ningún otro componente, página, script de cliente, correo o feed emite `utm_*`.

## Detalle 3 — Canonical/og:url por tipo de página (derivado de código; QA visual pendiente)

| Página | Canonical / og:url | Fuente |
|---|---|---|
| Home y estáticas (nosotros, contacto, privacidad, terminos, avisos-cookies, tu-historia, buscar, 404) | `https://beisjoven.com<pathname>` (home → `https://beisjoven.com`) | default BaseLayout:27 — **solo pathname**, la query entrante nunca se propaga |
| Artículo | `https://beisjoven.com/articulo/<slug>` | `articulo/[...slug].astro:46,118` |
| Categoría / Tag / Autor (todas las páginas de paginación) | `https://beisjoven.com/{categoria\|tag\|autor}/<slug>` — pág. N canonicaliza a pág. 1 | `[...page].astro` respectivos |
| WBC-2026 | `https://beisjoven.com/wbc-2026` (todas las págs.) | `wbc-2026/[...page].astro:30` |
| Evento / Galería | `https://beisjoven.com/evento/<slug>` · `/galeria` | `evento/[slug].astro:21` · `galeria.astro:44` |

`noIndex` (meta robots): `/buscar`, `/404`, `/avisos-cookies`, `/tu-historia/terminos`. Nota SEO-01 vigente: nunca `Astro.url.href` como default (host del request en SSR).

## Hallazgos flageados (decisión del PM — sin fixes implementados)

| Flag | Hallazgo | Impacto en atribución |
|---|---|---|
| 🔶 | **Portada emite links a `/video/<slug>` sin ruta** (10 videos publicados; solo 4 slugs legacy redirigen) y "Ver más" → `/videos` → `/` | Nulo en UTMs; sí hay fuga de navegación (404s internos) |
| 🔶 | **12 redirects legacy → destinos inexistentes** (`/seleccion`, `/juvenil`, `/mlb`, `/softbol`, `/liga-mexicana`) | Nulo en UTMs; tráfico legacy Wix muere en 404 |
| 🔶 | **Fila QA en `anuncios`** (`aliado "QA Prueba"`, `campana='qa-test'`, target `https://beisjoven.com/nosotros`, inactiva): si se activara, `buildAdHref` etiquetaría un link al **propio dominio** con `utm_source=beisjoven&utm_medium=display` → autoreferral que contaminaría la serie GA4 | Potencial — hoy inactiva |
| 🔶 | **QuickHitsBar acepta URL arbitraria de DB sin censo de params** (tabla hoy vacía) | Potencial — vector futuro de params ad hoc en portada |
| ⚪ | `sameAs` del JSON-LD usa `twitter.com/beisjoven`; Footer//contacto usan `x.com/beisjoven` | Ninguno (consistencia de entidad) |
| ⚪ | Sitemap incluye `/tu-historia/terminos` que es `noIndex` | Ninguno (higiene SEO) |
| ⚪ | SearchOverlay emite `cat=` que el servidor ignora | Ninguno (param muerto interno) |

**Sin filas FUERA-DE-CONVENCIÓN:** ningún punto del código emite hoy parámetros de tracking fuera de `buildAdHref`. Las únicas querys emitidas son funcionales e internas (`/buscar?q&cat`, `/admin/nuevo?historia`) o params de intents de compartir cuyo payload va limpio.
