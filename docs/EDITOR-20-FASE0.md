# EDITOR-20 — Fase 0: Diagnóstico integral del Editor 2.0

**Fecha:** 19-jul-2026 · **Estado:** REPORTE PREVIO — pendiente de GO del CEO. Cero código tocado; solo lecturas (SELECT vía MCP, Nivel 1) y builds de verificación locales.

---

## 1. Arquitectura del editor

El admin es una **SPA vanilla-JS** servida por Astro desde una sola página (`src/pages/admin/index.astro`, prerender) que carga 12 scripts desde `public/js/` y rutea client-side (`Router`). No existen páginas Astro por ruta de admin: `/admin/usuarios`, `/admin/editar/:id`, etc. son rutas del router JS.

| Archivo | Líneas | Rol |
|---|---|---|
| `public/js/admin.js` | 4,754 | `AdminPages` (todas las pantallas) + `Autosave` + `AdminComponents` + `Onboarding` |
| `public/js/supabase.js` | 817 | `SupabaseAPI` / `SupabaseAdmin` / `SupabaseStorage` / `SupabaseHistorias` (cliente anon + auth) |
| `src/admin/tiptap-editor.js` | 1,339 | Fuente del editor; Vite lo bundlea a `public/js/tiptap-editor.js` (IIFE, `window.TiptapEditor`) |
| `public/js/tag-picker.js` | 273 | `PickerModal` (bottom-sheet compartido tags/categorías — usado por acciones bulk de la lista) |
| `public/js/media-library-core.js` | 1,435 | Biblioteca de medios (sube/borra directo con cliente authenticated) |
| `public/js/article-preview.js` | 254 | Modal de vista previa |
| `public/js/auth.js`, `router.js` | 129/127 | Sesión Supabase Auth; router hash-less |

**Flujo borrador→publicado:** `AdminPages.editor()` renderiza el form → `Autosave` (30s debounce; existentes: UPDATE sin tocar `publicado`; nuevos: INSERT `publicado:false` y reúso de `_draftId`; sesiones `?historia=` solo-localStorage) → `saveArticle(editId, action)` detiene autosave, valida, sanitiza con regex (`sanitizeHtmlBasic`), calcula slug/read_time, escribe vía `SupabaseAdmin`, sincroniza tags (delete+insert), y en publish de historia dispara la copia de foto + transición de estado. Redirect post-INSERT a `/admin/editar/:id` ✅ (doctrina cumplida).

### Hallazgo mayor A1 — ~5,700 líneas de legacy muerto cargadas en cada visita
`pages.js` (3,770 — el sitio público pre-Astro completo, incluido el hub WBC con badge Caja Inmaculada), `api.js` (244) y `database.js` (572) — API y datos **simulados** de la era mock — y `components.js` (299) se cargan en todas las pantallas del admin. Dependencia real de admin.js sobre todo eso: **una función de 4 líneas (`escapeHTML`, en pages.js)**. `rich-text-editor.js` (851, editor viejo) ya ni se carga: archivo 100% muerto. Borrable con mover `escapeHTML` a admin.js.

### Hallazgo mayor A2 — Slugs de artículos publicados NO son inmutables
El autosave de artículos existentes **recalcula el slug desde el título en cada UPDATE** (`admin.js` — `payload.slug = ...` dentro de la rama `_editId`), y `saveArticle` también lo reescribe. Editar el titular de una nota publicada cambia su URL sin aviso y rompe la URL vieja (404; sin 301). Contradice la doctrina de inmutabilidad que la misión pide para tags.

### Hallazgo A3 — Vista previa de borrador rota (botón 👁️ móvil)
`ArticlePreview.openDraft()` lee `.rte-editor` (clase del editor VIEJO) y cae a `#content` (tampoco existe con Tiptap) → el preview del borrador siempre muestra "Sin contenido".

---

## 2. `destacado`

- **Columna:** `articulos.destacado boolean default false`. En prod: **275 de 657 artículos la tienen en true (42%)** — es un hábito de captura, no un juicio de curación. Cero expiración, cero orden.
- **Consumo homepage:** `getArticulosDestacados(3)` → `featured` → **solo `featured[0]` se usa** (hero `HeroDefault`); `featured[1..2]` se descartan. Fallback ya existente: si no hay destacados → 3 más recientes. Es decir: el hero de hoy ≈ "el destacado más reciente", que con 42% del catálogo marcado ≈ recencia. La capa de curación real hoy es **un (1) slot efectivo**.
- **Otros consumidores:** editor (checkbox `#featured` + autosave), lista admin (tab "Destacados" + ⭐ + `_tabToPredicate`), `article-preview.js` (badge ⭐), `SupabaseAPI.getArticulosDestacados` (public/js, legacy), `supabase.ts` tipos.
- **Si desaparece sin reemplazo:** el hero cae al fallback de recencia (la homepage NO queda huérfana — el fallback ya está escrito), pero se pierde toda capacidad de curar. La secuencia dura de la misión aplica igual: UI fuera → curación viva y verificada → recién entonces `DROP COLUMN`.
- Nota: `videos.destacado` existe también y NO está en alcance (no tocar).

---

## 3. WBC — inventario completo

| Rastro | Ubicación | ¿Vivo? | Acción propuesta |
|---|---|---|---|
| Checkbox "⚾ Cobertura WBC 2026" + estilos ámbar | editor (`admin.js` + `admin-mobile-fix.css:228`) | Sí (UI) | **Eliminar** (Fase 1) |
| `es_wbc2026` en autosave/saveArticle/preview badge "Caja Inmaculada" | `admin.js`, `article-preview.js` | Sí | **Eliminar** (Fase 1) |
| Columna `articulos.es_wbc2026` | DB — **50 artículos en true** | Sí (consumida por ↓) | **Conservar congelada** (ver decisión) |
| Página `/wbc-2026` (+ paginación + sitemap) | `src/pages/wbc-2026/`, `sitemap.xml.ts`, `supabase.ts` | Sí — URL pública con 50 notas | **Decisión CEO** (ver abajo) |
| Tablas `wbc_galeria` (11 filas), `wbc_posiciones` (5), `wbc_resultados` (12), `wbc_videos` (3) | DB | **Muertas** — único consumidor era el sitio legacy `pages.js` (código muerto) | **DROP vía SQL** (CEO ejecuta) |
| Hub WBC completo + badge patrocinador | `pages.js` legacy, `wbc-hub.css` | Muertos | **Borrar con A1** (Fase 1) |
| Policies inseguras `wbc_*` (escritura para cualquier authenticated) | DB | — | Mueren con el DROP de las tablas |

**Decisión que pido al CEO (dos opciones):**
- **(A) Archivo congelado — recomendada:** `/wbc-2026` sigue viva como archivo (50 notas, URLs indexadas), la columna `es_wbc2026` se queda read-only, y solo muere el control del editor + el badge. Cero riesgo SEO, cero 301s.
- **(B) Cierre total:** además, 301 de `/wbc-2026*` a `/`, drop de columna y de las queries en `supabase.ts`/sitemap. Más limpieza, pero mata URLs con tráfico potencial.

En ambas: las 4 tablas `wbc_*` se dropean ya (nadie vivo las lee).

---

## 4. Pipeline de tags — hipótesis confirmadas y descartadas con datos

**Pipeline actual (editor):** `_initTagInput` — input con debounce 200ms → filtro `t.nombre.toLowerCase().includes(q)` (**sensible a acentos**) → sugerencias (máx 8) → "Crear:" solo si NO hay `exactMatch` (`nombre.toLowerCase() === q || slug === makeSlug(q)`) → `SupabaseAPI.createTag(nombre, slug)` INSERT directo → **si falla devuelve `null` y la UI no muestra NADA** (violación de la doctrina de errores). `makeSlug` ya es correcto: NFD → strip marcas → lowercase → guiones (é→e, ñ→n).

**Datos reales (SELECT MCP):** 164 tags; **0 nombres en forma NFD; 0 slugs vacíos/corruptos; 0 duplicados por forma normalizada; 0 duplicados por forma sin acentos**. 17 tags con acentos existen y están sanos. `tags.slug` tiene UNIQUE (`tags_slug_key`); `nombre` no tiene unicidad. 149 tags en uso; 173/657 artículos con tags.

**Veredicto de la hipótesis NFC/NFD:** **descartada como causa de datos corruptos** (la DB está limpia) y **degradada como causa primaria del fallo**. Las causas confirmadas del síntoma "crear tag con acento falla en móvil" son:

1. **Dead-end del picker (bug de diseño, confirmado por lectura de código):** si existe "Seleccion" (sin acento) y tecleas "Selección": la búsqueda accent-sensitive no la encuentra (0 sugerencias) **y** el check de `exactMatch` por slug (`makeSlug('Selección')='seleccion'`) **suprime la opción "Crear:"** → el dropdown queda vacío y Enter no hace nada. Silencio total. Lo mismo ocurre con variantes de mayúsculas/acentos de cualquier tag existente.
2. **Fallo silencioso de `createTag`:** cualquier error (unique violation de slug, RLS con JWT stale) devuelve `null` sin toast. En la ventana post-SEC-ROLES-01 (JWT viejo con `role='admin'` vs política `tags_admin_insert` exigiendo superadmin), TODA creación de tags falló en silencio hasta el re-login — consistente con la experiencia reportada desde iPhone.
3. NFC del input sigue siendo higiene correcta (Fase 3 la implementa), pero los datos prueban que no ha producido corrupción.

**Consecuencia para el plan:** no hay fusión de duplicados ni redirects 301 de tags que proponer (0 duplicados históricos). El índice único por forma normalizada se propone igual, como candado preventivo.

**Extra (editorial, no data-fix):** existen near-duplicados semánticos con slugs distintos — "Liga Arco Mexicana del Pacifico" vs "Liga Mexicana del Pacífico"; "Campeonato Mundial Colegial de Béisbol" vs "…WCBC" vs "Mundial Colegial WBSC" — fricción del picker, no bug. El picker nuevo (insensible a acentos) los hará visibles al teclear; fusionarlos es decisión editorial del CEO (si la quiere, propongo el SQL correspondiente en su momento).

---

## 5. UI de metadatos — inventario y frecuencia real de uso

Campos del form: título*, extracto*, slug (editable, auto), categoría*, autor*, layout del hero, tags, contenido*, imagen (+pie de foto, crédito), destacado, es_wbc2026.

En móvil (≤768px) TODO salvo título y contenido vive tras el acordeón **"Metadatos & Opciones"** (cerrado por defecto): extracto, slug, categoría, autor, hero_layout, tags, imagen, pie, crédito y los 2 checkboxes fósiles. Publicar exige categoría → **cada publicación móvil obliga a abrir el acordeón**. Sticky bar móvil (Publicar/Borrador/👁️/Cancelar) ya existe y funciona.

Frecuencia real (657 artículos, SELECT MCP): categoría/autor/título/extracto **100%** (requeridos) · imagen ~100% (fallback a default BJ) · pie de foto **36%** · crédito **33%** · tags **26%** de artículos · destacado 42% (fósil) · es_wbc2026 7.6% (fósil) · **hero_layout 'split': 0 artículos** (feature DESIGN-03 sin un solo uso) · kicker, photo_credit, imagen_portada_alt, evento_id: **0 usos** (columnas huérfanas sin UI — solo documento, no propongo drop en esta misión).

**Dato operativo:** 657/657 artículos publicados, 0 borradores — el flujo real es escribir→publicar directo.

---

## 6. Inventario Tiptap — LA MIGRACIÓN 2→3 YA OCURRIÓ

**`package.json` y el lockfile declaran `@tiptap/* ^3.22.1` desde el bootstrap del repo (PR #49, 5-may-2026). El editor en prod ES Tiptap 3.** La línea "Editor: Tiptap 2.0" de CLAUDE.md y la premisa B1 de la misión están stale. Verificado: `npm run build:editor` con 3.22.1 reproduce **byte a byte** el bundle commiteado (`public/js/tiptap-editor.js`) → fuente y prod en sync.

- **Extensiones:** StarterKit (horizontalRule off), HorizontalRule standalone, `SafeYoutube` (extend de Youtube: null-safe, /live/ y /shorts/, placeholder para embeds rotos), Image, Link.configure, Placeholder, custom: `TwitterEmbed`, `InstagramEmbed`, `TikTokEmbed`, `Figure` (img+figcaption editable), `Gallery` (atom con JSON de imágenes), `MarkdownPaste` (paste pipeline HTML/markdown/rich con `marked`), plugin auto-embed de URLs pegadas.
- **Almacenamiento:** HTML (`getHTML()`), no JSON. El frontend lo re-procesa en `src/lib/content.ts` (`renderContent`: embeds, shortcodes, transform de nodos Tiptap).
- **Config-smell real:** StarterKit v3 **ya incluye Link** → el `Link.configure` separado duplica la extensión (warning en consola; funciona porque la última gana). Limpieza: `StarterKit.configure({ link: {...} })`.
- **Perfil del contenido real (riesgo de compatibilidad, SELECT MCP):** youtube 6 · twitter 20 · instagram 11 · galerías 5 · figure 81 · markdown-puro 2 · shortcodes legacy 0 · `<script>` 0 · atributos `on*` 0 · `style=` 17 (legacy Wix) · 1 iframe no-YouTube (id 528, streamable.com) · 0 URLs firmadas persistidas · 0 contenidos vacíos.

**Consecuencia:** la "Fase 5 — migración Tiptap 2→3" se **re-alcanza** a: limpieza de config (Link duplicado), verificación de paridad abrir→guardar contra el muestreo real de arriba, y errata de CLAUDE.md. Cero dependencias nuevas, riesgo bajo.

---

## 7. Sanitización actual

- **Cliente (única capa):** `sanitizeHtmlBasic()` en admin.js — 3 regex (quita `<script>`, atributos `on*` con comillas, `href="javascript:"`). Trivialmente bypasseable (regex sobre HTML; p.ej. `on*` sin comillas, `<img src=x onerror=...>` sin comillas, SVG, `data:`).
- **Servidor: no existe.** El panel escribe directo a PostgREST con el cliente del navegador; `renderContent` (SSR) transforma pero no sanitiza; el artículo se renderiza con `set:html`.
- Datos: el contenido almacenado hoy está limpio (0 script, 0 on*). El riesgo es a futuro (pegar HTML malicioso de fuentes externas) — exactamente lo que SEC-04 debe cerrar.
- Nota adjacente (ya reportada en SEC-ROLES-01, fuera de alcance): escritura de `articulo_tags`, `imagenes_metadata`, `autores`, `categorias`, `streams`, `videos` (INSERT/UPDATE), `historias_enviadas` (read/update) sigue abierta a cualquier authenticated.

---

## 8. Hallazgos críticos NO previstos por la misión

### 🔴 C1 — SEC-02-FIX-01 está IMPLEMENTADO pero ROTO en prod (403)
La Fase 7 asumía implementarlo; **ya existe** (`/api/copiar-foto-historia.ts` + wiring completo en el panel, PRs #92/#93: copia al publicar, sharp `.rotate().jpeg()` re-strip, original privado intacto, timing correcto). PERO el endpoint autoriza con `app_metadata.role === 'admin'` y desde que SEC-ROLES-01-01 se aplicó en prod (verificado vía MCP: Sergio = `superadmin`, y las 5 migraciones + retiro de `admin@beisjoven.com` están aplicadas), **el endpoint devuelve 403 al único usuario**. Publicar una historia con foto fallará hoy (el flujo aborta con toast, sin publicar — el guard funciona). Fix de una línea; propongo tratarlo como **hotfix dentro de PR-1, primero en el orden**.

### 🔴 C2 — Slugs de artículos publicados mutan al editar título (A2 arriba)

### 🟠 C3 — `auth.js` mapea el rol desde `user_metadata` con default `'admin'`
`_mapUser`: `role: user_metadata.role || 'admin'` — gating de UI client-side sobre el campo prohibido por SEC-06 (y default permisivo). La seguridad real la ponen RLS/endpoint, pero el panel debe leer `app_metadata.role` y reconocer `superadmin` (Fase 7, junto con el copy).

### 🟡 C4 — Vista previa de borrador rota (A3) · 🟡 C5 — dashboard con gradiente/copy legacy (`#c41e3a`, "Hola, {user_metadata.name}", rol "Editor") — tokens legacy en extinción dentro del admin (guardrail de marca; se corrige de paso en Fases 4/7).

---

## 9. Plan ajustado — Fases 1–7

**Dos PRs.** PR-1 = Fases 1–4 + 7 (+hotfix C1). PR-2 = Fases 5–6 re-alcanzadas. Verificación por fase: Playwright 375/412/768/1280 sobre `astro dev` local con fixtures de datos reales (SELECT MCP) e intercepción de red (el egress bloquea `*.supabase.co`); screenshots antes/después; RLS por simulación Nivel 2 declarada (`BEGIN → SET LOCAL role/claims → prueba → ROLLBACK`, nunca DDL). Verificación visual en prod: CEO (post-ISR 60s).

**Fase 1 — Limpieza de fósiles (PR-1)**
0. Hotfix C1: `copiar-foto-historia.ts` acepta `superadmin`.
1. Fuera del editor: checkbox WBC, badge Caja Inmaculada del preview, checkbox destacado (+autosave/payloads/preview ⭐).
2. Borrar legacy muerto: `pages.js`, `api.js`, `components.js`, `database.js`, `rich-text-editor.js`, `wbc-hub.css`, CSS WBC de `admin-mobile-fix.css`, `initMarkdownImport` (muerto con el RTE viejo) — `escapeHTML` se muda a admin.js.
3. **SQL propuesto** `editor20_01_drop_wbc_tables.sql`: DROP de `wbc_galeria/posiciones/resultados/videos` (con verificaciones embebidas). Columnas `destacado`/`es_wbc2026` NO se tocan aún.

**Fase 2 — Capa de curación de portada (PR-1)**
- **SQL propuesto** `editor20_02_portada_slots.sql`: tabla `portada_slots (slot smallint PK CHECK 1..5, articulo_id int UNIQUE NOT NULL REFERENCES articulos ON DELETE CASCADE, fijado_at timestamptz)`. RLS: SELECT público, escritura `is_admin()`. Slot 1 = hero; 2–5 = posiciones de "Lo último" del MixedFeed.
- SSR: hero = slot 1 (JOIN `publicado=true`) → fallback recencia (hoy ya escrito); slots 2–5 se anteponen a "Lo último" → huecos se rellenan por recencia. Cero mantenimiento obligatorio; artículo despublicado/borrado desaparece solo (JOIN/CASCADE).
- Admin: acción "Fijar a portada" en la lista de artículos (tarjeta móvil + fila desktop) con `PickerModal` en modo single para elegir slot, indicador de fijados, y "Quitar de portada". Tab "Destacados" → "En portada". Usable a 375px (44px targets).
- Tras verificación del CEO en prod (ambos estados: con y sin slots): **SQL** `editor20_03_drop_destacado.sql` (DROP COLUMN `articulos.destacado` + limpieza de queries).

**Fase 3 — Tags: Unicode + picker (PR-1)**
- NFC del input al entrar (`value.normalize('NFC')`); slugify se queda (ya es correcto); display name conserva acentos.
- Búsqueda **insensible a acentos y mayúsculas** (comparar formas plegadas NFD-sin-marcas) en el input del editor Y en PickerModal; "Crear:" deja de suprimirse por colisión de slug — si el slug colisiona con un tag existente se ofrece ESE tag como sugerencia (fin del dead-end).
- `createTag` con manejo de errores visible (toast + mensaje accionable) — fin del fallo silencioso.
- Enter con texto y sin sugerencias = crear (hoy: nada).
- **SQL propuesto** `editor20_04_tags_unique_normalized.sql`: `CREATE UNIQUE INDEX ... ON tags (lower(normalize(nombre, NFC)))` — preventivo; el reporte de duplicados dio 0, no hay fusión ni 301s que proponer.

**Fase 4 — Metadatos móviles-first (PR-1)**
- Acordeón fuera; todo visible en orden por frecuencia/flujo: título → extracto → categoría/autor → tags → imagen (pie/crédito) → contenido → (slug y hero_layout al final, visibles; hero_layout queda señalado como candidato a retiro con 0 usos — decisión CEO aparte).
- Teclados móviles correctos (`inputmode`, `autocapitalize=off` en slug, `enterkeyhint`).
- Fix C4 (preview de borrador lee Tiptap). Sticky bar se conserva.

**Fase 5 (PR-2, re-alcanzada) — Paridad Tiptap 3 + limpieza**
- `StarterKit.configure({ link: {...} })` (elimina extensión duplicada), rebuild del bundle, y test de paridad abrir→guardar contra el muestreo real (6 youtube, 20 twitter, 11 instagram, 5 galerías, figures, 2 markdown, id 528). Errata CLAUDE.md: "Tiptap 3.22.1 desde mayo-2026".

**Fase 6 (PR-2) — SEC-04 sanitización server-side**
- Nuevo endpoint autenticado `/api/guardar-articulo` (mismo patrón de auth que copiar-foto, aceptando superadmin): sanitiza con allowlist y escribe con service role; `saveArticle` y `Autosave` pasan por él. Allowlist derivada del output real del editor (§6): p, h2, h3, ul/ol/li, blockquote, hr, strong/em, br, code, a[href,rel,target], img[src,alt,loading], figure/figcaption[class], div[data-youtube-video], iframe[src^=youtube-nocookie, width,height,allowfullscreen], div.twitter-embed[data-tweet-*], blockquote.instagram-media[data-instgrm-*]/a, blockquote.tiktok-embed[cite,data-video-id], div.gallery[data-gallery], span. `style=` NO entra (los 17 legacy no se re-guardan salvo edición, donde se limpian). Decisión menor CEO: ¿permitir `iframe` de streamable (1 artículo) o degradarlo a link?
- La misma allowlist aplicada en `renderContent` (SSR) como defensa en profundidad para contenido legacy/bypass.
- **Dependencia nueva a aprobar: `sanitize-html`** (server-only; allowlist-first; sin DOM). Alternativas evaluadas: `DOMPurify`+`jsdom` (jsdom pesadísimo para serverless) y `xss` (menos expresiva para atributos por-tag). Peso: ~0.5 MB en node_modules, cero impacto en cliente.
- Recordatorio doctrinal para la entrega: ningún cambio RLS en esta fase; si se tocara algo gated por rol → logout/login antes de diagnosticar.

**Fase 7 — Misceláneos (PR-1)**
- `/admin/usuarios`: copy real (roles `superadmin`/`periodista` vía `app_metadata.role`, altas manuales en Dashboard, signup OFF, matriz en `docs/SEC-ROLES-01.md`; periodista = solo fundación, sin cuentas aún).
- `auth.js`: rol desde `app_metadata` (`superadmin` ⇒ admin UI; default NO permisivo).
- SEC-02-FIX-01: con C1 corregido, verificación end-to-end del flujo historia→publicar (respetando triggers de estado — el panel no duplica esa lógica).

---

## 10. Licencia de Mejora — propuestas (todas por encima del spec, guardrails intactos)

| # | Mejora | Por qué es superior | Referencia |
|---|---|---|---|
| M1 | **Slug lock:** al editar un artículo publicado, el slug NO se regenera del título (autosave y save); editable solo con acción explícita | URLs publicadas estables; hoy un typo corregido rompe la URL | Práctica universal de medios (Guardian/NYT: URL estable post-publicación); coherente con la inmutabilidad de slugs que la misión exige para tags |
| M2 | Contador/aviso de largo de titular (~65 chars, aviso no bloqueante) | 76% móvil: titulares largos truncan en tarjetas y SERP | Sugerida por la propia misión |
| M3 | Borrar el legacy muerto del admin (A1) | ~5.7k líneas menos de parse JS en iPhone en cada carga del panel; menos superficie de bugs | "When replacing a feature, delete ALL old code" (CLAUDE.md) |
| M4 | Fix preview de borrador (C4) y errores visibles en `createTag` | Doctrina de error handling: nunca UI muda | CLAUDE.md |
| M5 | Curación con "Quitar de portada" + indicador en lista | El estado de curación visible donde se cura | facia-tool (Guardian): el editor ve la lista curada |
| M6 | Tags: crear con Enter sin sugerencias; búsqueda accent-insensitive también en PickerModal (bulk) | Elimina el dead-end raíz del problema #1 | — |

**Dependencias nuevas totales a aprobar: 1** (`sanitize-html`, Fase 6). Tiptap 3 ya está instalado — B1 no requiere dependencia alguna.

---

## 11. Estado SQL (doctrina de 3 niveles)

Ejecutado en esta fase: solo SELECTs (Nivel 1). Ninguna verificación Nivel 2 fue necesaria. Archivos SQL que la misión producirá (todos idempotentes, con verificación embebida; **merged ≠ aplicada** — se reportará por archivo):

| Archivo (propuesto) | Fase | Contenido |
|---|---|---|
| `editor20_01_drop_wbc_tables.sql` | 1 | DROP `wbc_*` (4 tablas muertas) |
| `editor20_02_portada_slots.sql` | 2 | Tabla + RLS de curación |
| `editor20_03_drop_destacado.sql` | 2 (post-verificación prod) | DROP COLUMN `articulos.destacado` |
| `editor20_04_tags_unique_normalized.sql` | 3 | Índice único preventivo por forma normalizada |

---

## 12. Preguntas abiertas para el GO

1. **WBC:** ¿opción A (archivo congelado — recomendada) u opción B (cierre total con 301s)?
2. **hero_layout** (0 usos): ¿se queda al fondo del form o lo retiro de la UI (columna intacta)?
3. **Streamable** (1 artículo): ¿entra al allowlist o se degrada a link?
4. **M1 (slug lock):** ¿apruebas el cambio de comportamiento? (edición de slug pasa a ser acción explícita)
5. GO general para Fases 1–7 con el re-alcance de Fase 5 y el hotfix C1 al frente.
