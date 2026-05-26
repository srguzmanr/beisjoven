# Auditoría Técnica — Beisjoven

**Fecha:** 26 de mayo de 2026
**Alcance:** Arquitectura de renderizado/build, seguridad, salud de código, flujo editorial y escalabilidad.
**Método:** Lectura directa del repositorio + verificación de los hallazgos en el código fuente (se citan rutas y líneas).
**Stack:** Astro 5 (SSG) · `@astrojs/vercel` v8 · Supabase (Postgres/Auth/Storage, proyecto `yulkbjpotfmwqkzzfegg`) · Vercel · Cloudflare · Tiptap 3 · Tailwind 4.

---

## 0. Resumen ejecutivo

**El problema raíz, en una frase:** Beisjoven es un sitio **100% estático (SSG)** — cada página de contenido se genera al momento del *build*. Como el contenido vive en Supabase y las páginas son HTML pre-construido, **la única forma de reflejar un cambio es reconstruir el sitio entero**. El panel de admin, además, dispara automáticamente ese rebuild en cada guardado/publicación. De ahí los 4-5 minutos por cada cambio.

**La recomendación central:** Migrar las páginas de contenido de SSG a **renderizado bajo demanda con caché en el edge (SSR + ISR de Vercel)**. Con esto, publicar = una escritura en la base de datos; la página queda fresca en **segundos** sin ningún build. Los builds de Vercel pasan a ocurrir **solo cuando cambia el código**, no el contenido. Es la solución canónica y soportada para un medio de noticias sobre Astro+Vercel, y preserva el SEO (entrega HTML completo).

**Hallazgos de mayor severidad:**

| # | Severidad | Hallazgo | Impacto |
|---|-----------|----------|---------|
| 1 | **CRÍTICA** | SSG + rebuild en cada cambio | Operación editorial bloqueada 4-5 min por publicación; empeora a medida que crecen los artículos (O(n)). |
| 2 | **CRÍTICA** | URL del *deploy hook* de Vercel embebida en una página pública (`/admin`) | Cualquiera puede disparar builds ilimitados → inflar costos / saturar la cola de deploys (DoS de build). |
| 3 | **ALTA** | Bucket de Storage `tu-historia` y `historias_enviadas` abiertos a `anon` sin límites + endpoint de email sin rate-limit | Subida ilimitada de archivos (costo/abuso de storage) y spam de correo desde el dominio (reputación de envío). |
| 4 | **MEDIA** | RLS demasiado permisiva en `tags` y `quick_hits` (`USING (true)`) | Cualquier usuario autenticado (cualquier editor) puede editar/borrar titulares en vivo y etiquetas de todos. |
| 5 | **MEDIA** | Sanitización de contenido solo en el cliente | XSS almacenado posible si un token de editor se usa fuera del panel (defensa solo en frontend, evitable). |
| 6 | **MEDIA** | Duplicación divergente `raíz/` vs `public/` | Dos copias de los JS del admin que ya difieren; trampa de mantenimiento (editar el archivo equivocado no tiene efecto). |

> Lo bueno: la RLS de la tabla `articulos` está **bien diseñada** (lectura pública solo de publicados, borradores propios, escritura autenticada, borrado solo admin). El endpoint serverless escapa HTML correctamente. El stack elegido (Astro+Supabase+Vercel) es sólido y adecuado; el problema es la *configuración de renderizado*, no la tecnología.

---

## 1. Arquitectura actual y flujo de datos

**Cómo se renderiza hoy (SSG puro):**
- `astro.config.mjs:7` → `output: 'static'`. Con adapter `vercel()` (`astro.config.mjs:8`).
- Todas las rutas de contenido se enumeran en build time con `getStaticPaths()`:
  - `src/pages/articulo/[...slug].astro:22-25` → `getAllArticuloSlugs()` (un HTML por artículo).
  - `src/pages/categoria/[slug]/[...page].astro`, `src/pages/tag/[slug]/[...page].astro`, `src/pages/autor/[slug]/[...page].astro`, `src/pages/wbc-2026/[...page].astro`, `src/pages/evento/[slug].astro` → todas usan `getStaticPaths()` y paginan **todos** sus artículos.
  - `src/pages/index.astro` y `src/pages/galeria.astro` consultan Supabase en build time.
  - **Única página dinámica hoy:** `src/pages/buscar.astro:2` (`export const prerender = false`).

**Cómo se publica hoy (el mecanismo del problema):**
1. El periodista guarda/publica en el panel → `public/js/admin.js:1744` (`saveArticle`).
2. Si la acción es `publish` o `save`, dispara `public/js/admin.js:1921-1922` → `_triggerVercelRebuild()` (`public/js/admin.js:1952`).
3. Éste hace `POST` a `window.VERCEL_DEPLOY_HOOK_URL`, hardcodeada en `src/pages/admin/index.astro:90`.
4. Vercel ejecuta `npm run build` (`package.json:8` = `build:editor && astro build`) → regenera **todo** el sitio (~4-5 min) → deploy.

**Importante:** el rebuild no se dispara solo al guardar artículos. `_triggerVercelRebuild()` se invoca también en **otras tres acciones** del admin: `public/js/admin.js:2576`, `:3577`, `:3593` (quick-hits, videos, etc.). Es decir, **casi cualquier operación de contenido** provoca un build completo.

---

## 2. PRIORIDAD CRÍTICA — El problema central del build

### 2.1 Causa raíz (verificada)
El sitio es estático y el contenido es dinámico. Esa contradicción es el origen de todo:

- **SSG total:** `output: 'static'` (`astro.config.mjs:7`) obliga a pre-renderizar cada página en build time.
- **Enumeración completa por build:** cada ruta de listado vuelve a leer *todos* sus artículos con `fetchAllPaginated()` (`src/lib/supabase.ts:105`, p. ej. `getAllArticulos` `:134`, `getAllArticuloSlugs` `:155`). Agregar 1 artículo obliga a regenerar su página **más** todas las páginas de portada, categoría, tag y autor (los offsets de paginación se recorren).
- **Disparo automático de build por guardado** (sección 1).

### 2.2 Costos de build evitables que agravan los 4-5 min
- **Generación de imágenes OG en cada build, por artículo:** `src/lib/og-image-generator.ts:24` (`ensureOgImage`) se llama por artículo en `src/pages/articulo/[...slug].astro:42`. Hace un `HEAD` por imagen (`og-image-generator.ts:34`) y, si falta, descarga + recorta con Sharp (`:51-54`) + sube a Storage (`:57-59`). Con cientos de artículos son cientos de round-trips de red dentro del build.
- **Re-bundle del editor en cada build:** `build:editor` (`package.json:7`, `vite.editor.config.js`) recompila Tiptap a `public/js/tiptap-editor.js` en cada deploy, aunque el editor no haya cambiado.

### 2.3 Solución recomendada — SSR + ISR (renderizado bajo demanda con caché en edge)

**Idea:** dejar de pre-construir el contenido. Renderizar las páginas de contenido **bajo demanda** y cachearlas en el edge de Vercel con **ISR (Incremental Static Regeneration)**. El primer visitante genera la página (lee Supabase fresco), el resultado se sirve cacheado al resto, y se revalida por tiempo o **bajo demanda** vía webhook.

**Pasos concretos (cuando se implemente):**
1. `astro.config.mjs`: `output: 'server'` y configurar ISR en el adapter:
   `vercel({ isr: { expiration: 60, exclude: ['/admin', '/api/*'] } })`. (TTL ajustable; con revalidación on-demand puede subirse.)
2. Marcar como `export const prerender = true` solo las páginas **realmente** estáticas: `nosotros`, `contacto`, `privacidad`, `terminos`, `avisos-cookies`, `tu-historia`, `tu-historia/terminos`, `404`, `admin/index`. Dejar `sitemap.xml.ts` **dinámico/ISR** para que refleje artículos nuevos sin build.
3. Convertir las rutas de contenido a bajo demanda: quitar `getStaticPaths()`, leer `Astro.params` en runtime y consultar con offset/límite. Rutas: `articulo/[...slug]`, `categoria/[slug]/[...page]`, `tag/[slug]/[...page]`, `autor/[slug]/[...page]`, `wbc-2026/[...page]`, `evento/[slug]`, `index`, `galeria`. (Reutilizar `getArticulosByCategoriaPaginados()` en `src/lib/supabase.ts:179`, que ya acepta offset/límite.)
4. **Eliminar el disparador de rebuild:** borrar `window.VERCEL_DEPLOY_HOOK_URL` (`src/pages/admin/index.astro:73-91`) y `_triggerVercelRebuild()` + sus 4 llamadas (`public/js/admin.js:1922,2576,3577,3593`). Borrar el Deploy Hook en Vercel.
5. **Revalidación on-demand (opcional, para reflejo instantáneo):** endpoint serverless `/api/revalidate` que reciba un *Database Webhook* de Supabase (en `articulos`/`quick_hits`) y revalide solo las rutas afectadas usando `isr.bypassToken` (token guardado en env del servidor, **nunca** en el cliente).
6. **Sacar las imágenes OG del build:** generarlas al **subir** la imagen (Edge Function de Supabase o en el flujo de subida del admin) o usar las **transformaciones de imagen de Supabase Storage**; cachear el resultado. La página solo arma la URL ya existente.
7. **Variables de entorno en runtime de Vercel:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` (público) y `SUPABASE_SERVICE_ROLE_KEY` solo si se usa en servidor. **Quitar los fallbacks hardcodeados** (`src/lib/supabase.ts:3-4`, `src/pages/articulo/[...slug].astro:35-36`) para que una mala configuración falle ruidosamente en vez de silenciosamente.
8. **Lecturas públicas con cliente anon** (RLS ya permite `SELECT` de publicados), evitando correr la *service role key* en el camino de cada request.

**Resultado esperado:** publicar/editar = 1 escritura en DB; la página queda fresca en segundos (revalidación on-demand) o en ≤ TTL; los builds de Vercel solo ocurren al cambiar **código**. El tiempo de build deja de bloquear la redacción.

**Alternativas consideradas y descartadas:**
- *Renderizar el cuerpo del artículo en el cliente (CSR):* malo para SEO y para previews en redes — un medio vive de Google/redes. Descartado para contenido (sí es válido para widgets no-SEO como “más leídos” o el contador de vistas, que ya son client-side).
- *Seguir en SSG con builds “incrementales”:* Vercel/Astro no cachean el build entre deploys por defecto; se seguiría reconstruyendo todo en cada publicación. No resuelve el problema.

**Mitigación temporal (si no se puede migrar de inmediato):** reemplazar el disparo automático por-guardado con un botón manual “Actualizar sitio ahora” que agrupe varios cambios en **un** build. Reduce de N builds a 1 por tanda — es un parche, no la solución.

**Riesgos de la migración a vigilar:** env vars mal configuradas en runtime (mitigado quitando fallbacks + smoke test); costo de invocaciones serverless/edge (bajo para tráfico cacheable, monitorear); elección del TTL de ISR vs. revalidación on-demand; manejo de 404 para slugs inexistentes en runtime (ya existe `Astro.redirect('/404')` en `articulo/[...slug].astro:30-32`).

---

## 3. PRIORIDAD CRÍTICA / ALTA — Seguridad

### 3.1 CRÍTICA — Deploy hook de Vercel expuesto públicamente
`src/pages/admin/index.astro:90` define `window.VERCEL_DEPLOY_HOOK_URL = 'https://api.vercel.com/v1/integrations/deploy/prj_…/…'` dentro de la página `/admin`, que es **estática y de descarga pública** (tiene `noindex` en `:17`, pero es accesible; el rewrite `vercel.json:107-112` sirve ese mismo shell para `/admin/*`). Cualquiera que abra el código fuente de `/admin` obtiene la URL y puede hacer `POST` para **disparar builds ilimitados** → inflar la factura de Vercel y/o saturar la cola de deploys.
**Acción:** rotar (regenerar) el deploy hook ahora; eliminarlo del cliente. Queda neutralizado de raíz al adoptar SSR+ISR (sección 2.3), que elimina la necesidad de hooks.

### 3.2 ALTA — Storage y submissions abiertos a `anon` sin límites
- `supabase/migrations/20260414_tuhistoria.sql:116-119`: policy `tu_historia_public_upload` → `TO anon WITH CHECK (bucket_id = 'tu-historia')`. **Sube cualquiera, sin límite de tamaño, cantidad ni rate-limit** a nivel de Storage (las validaciones solo existen en el JS del cliente, que es evitable). Riesgo: llenar el bucket con basura (costo/abuso).
- `supabase/migrations/20260414_tuhistoria.sql:82-85`: `historias_enviadas` permite `INSERT` anónimo `WITH CHECK (true)` sin throttling.
- `api/notify-historia.js`: el handler (`:114`) no exige auth ni rate-limit y acepta un `email` arbitrario (`:119,133`) al que envía un correo vía Resend. **Se puede abusar para spam** (a `hola@beisjoven.com` y a direcciones elegidas por el atacante usando tu dominio → daña tu reputación de envío). *Lo correcto:* sí escapa HTML (`:14-22`) y usa la API key desde env (`:12`).
**Acción:** añadir verificación humana (CAPTCHA/Turnstile — ya usan Cloudflare) y rate-limit en el envío; límites de tamaño/cantidad/expiración en las políticas de Storage; idealmente subir las fotos vía una RPC/función validada en vez de acceso directo `anon` al bucket.

### 3.3 MEDIA — RLS demasiado permisiva en `tags` y `quick_hits`
- `supabase/migrations/20260409_sprint4_tags.sql:29-37`: `UPDATE`/`DELETE` de `tags` con `USING (true)` para cualquier `authenticated`. `articulo_tags` `INSERT`/`DELETE` igual (`:54-62`).
- `supabase/migrations/20260418_quickhits.sql:47-55`: `UPDATE`/`DELETE` de `quick_hits` (titulares en vivo de la portada) con `USING (true)` para cualquier `authenticated`.
Cualquier editor puede modificar/borrar titulares en vivo o re-etiquetar artículos de otros. No es fuga de datos (anon sigue bloqueado), pero es **escalada de privilegios entre roles** y amplía el radio de daño si una cuenta de editor se compromete.
**Acción:** restringir escritura de `quick_hits` a rol `admin` (mismo patrón que `articulos` en `20260407_sprint5_roles.sql:43-53`) y, donde aplique, exigir propiedad o admin.

### 3.4 MEDIA — Sanitización de contenido solo en el cliente (XSS)
El cuerpo del artículo se inyecta con `set:html` en `src/pages/articulo/[...slug].astro:165` tras pasar por `renderContent()` (`src/lib/content.ts:214`). La sanitización (`sanitizeHtmlBasic`) ocurre **solo** en el admin antes de insertar (`public/js/admin.js:1817`). Como la RLS permite `INSERT` a cualquier autenticado, un token de editor usado fuera del panel (vía API REST de Supabase) podría almacenar HTML malicioso que se renderiza a todos los visitantes. Además, la rama Markdown de `renderContent` no re-escapa el contenido interno de `**negrita**`/`*itálica*`/enlaces (`src/lib/content.ts:262-269`).
**Acción (defensa en profundidad):** sanitizar en el **servidor** al renderizar (p. ej. con una librería de sanitización HTML) en lugar de confiar en el frontend.

### 3.5 BAJA — Llave anon hardcodeada e higiene de secretos
La *anon key* aparece hardcodeada como fallback en varios sitios: `src/pages/articulo/[...slug].astro:35-36`, `src/lib/supabase.ts:3-4` (placeholder `'build-placeholder'`), y JS de cliente (`public/js/supabase.js`, `public/js/category-load-more.js`, `src/components/NewsletterBlock.astro`). La anon key es **pública por diseño** (la protege la RLS), así que la severidad es baja; el problema real es el **patrón de fallbacks** que enmascara configuraciones faltantes y complica rotar llaves. No se encontró la *service_role key* commiteada ni `.env` en el repo (`.gitignore` los excluye) — correcto.
**Acción:** centralizar en variables de entorno sin fallbacks; documentar rotación de llaves.

### 3.6 MEDIA/BAJA — Sin cabeceras de seguridad
`vercel.json` no define cabeceras de seguridad (CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS).
**Acción:** añadir un bloque `headers` en `vercel.json`.

### 3.7 BAJA — `increment_vistas` sin límite
`src/lib/supabase.ts:286-288` y la llamada client-side (`articulo/[...slug].astro:362-371`) permiten inflar el contador de vistas sin throttling. Cosmético (ensucia métricas y el widget “más leídos”).

---

## 4. PRIORIDAD MEDIA — Salud de código y arquitectura

### 4.1 Duplicación **divergente** entre `raíz/` y `public/`
Astro solo sirve `public/`, pero el repo mantiene copias paralelas en la raíz (`js/`, `data/`, `css/`, `admin/`). Verificado:
- `js/admin.js` ≠ `public/js/admin.js` — **ya divergieron**. La copia de raíz es una versión vieja (su `saveArticle` está en la línea 1056 y contiene incluso un bug latente: usa una variable `const` antes de declararla, lo que rompería el guardado cuando no se elige imagen de portada). La copia **servida** (`public/js/admin.js:1744`) ya está corregida.
- `js/supabase.js` ≠ `public/js/supabase.js` — también divergen.
- `data/database.js` == `public/data/database.js` (idénticas).
- `public/js/` tiene 7 archivos que la raíz no: `category-load-more`, `envivo`, `media-library-core`, `rich-text-editor`, `tag-picker`, `tiptap-editor`, `tu-historia`.
**Conclusión:** la fuente viva es `public/`; los directorios de raíz son código muerto parcial y divergente. Es una trampa directa: editar el archivo equivocado no surte efecto (o reintroduce bugs). Contradice el principio “ONE source of truth” de `CLAUDE.md`.
**Acción:** eliminar los directorios duplicados de la raíz (`js/`, `data/`, `css/`, `admin/`) dejando solo `public/` (y `src/`), tras confirmar que nada los referencia.

### 4.2 Código muerto de la migración Wix
- `public/data/database.js` (33 KB de datos mock) se carga en el admin (`src/pages/admin/index.astro:62`) pero el admin escribe/lee de Supabase, no de este objeto.
- `public/js/api.js` lee de `window.DB` (los datos mock) — capa legacy sin uso real.
- **Dos editores** coexisten: `public/js/rich-text-editor.js` y `public/js/tiptap-editor.js`. Conviene confirmar cuál está activo y borrar el otro.
**Acción:** eliminar el mock DB, la capa `api.js` legacy y el editor no usado.

### 4.3 Desviaciones de las reglas internas (`CLAUDE.md`)
- Tras crear un artículo nuevo, el admin redirige a la lista `/admin/articulos` (`public/js/admin.js:2930`), mientras que `CLAUDE.md` exige redirigir a `/admin/editar/:id` del artículo guardado. Menor, pero documentado como regla.

---

## 5. PRIORIDAD MEDIA/BAJA — Experiencia del periodista y escalabilidad

Para el objetivo de “plataforma muy amigable que escale”, oportunidades detectadas (algunas requieren confirmar contra la UX deseada):
- **Permisos de publicación:** a nivel DB cualquier autenticado puede insertar artículos publicados (`20260407_sprint5_roles.sql:37-40`); la UI lo modula por rol. Conviene definir explícitamente el flujo borrador→revisión→publicación.
- **Vista previa:** existe `public/js/article-preview.js`; verificar que el periodista pueda previsualizar el render final antes de publicar.
- **Agenda editorial:** hay campo `fecha` pero no hay programación de publicación futura.
- **Biblioteca de medios:** `public/js/media-library.js` es una lista plana; sin carpetas/búsqueda escala mal. Las imágenes se suben sin redimensionado en cliente (subóptimo en móvil, que es el 76% del tráfico).
- **Cuentas y auditoría:** creación de usuarios manual desde el dashboard de Supabase (`20260407_sprint5_roles.sql:67-81`); sin flujo de invitación ni rastro de auditoría por usuario.
- **Operaciones masivas y versionado:** sin publicar/borrar en lote ni historial de versiones del artículo.

---

## 6. Plan de acción priorizado

**Leyenda esfuerzo:** S = días · M = 1-2 semanas · L = 2-4 semanas.

### CRÍTICA (resolver primero — desbloquea la operación y cierra riesgos graves)
| Ítem | Por qué | Esfuerzo | Archivos clave |
|------|---------|----------|----------------|
| Migrar contenido a **SSR + ISR** (elimina el rebuild por cambio) | Es el dolor #1; habilita escalar | **L** | `astro.config.mjs`; rutas en `src/pages/**`; `src/lib/supabase.ts`; `src/lib/og-image-generator.ts` |
| **Rotar y retirar** el deploy hook expuesto | Riesgo de costo/DoS de build | **S** | `src/pages/admin/index.astro:73-91`; `public/js/admin.js` (4 llamadas) + Vercel |
| Cerrar `tu-historia` (Storage + submissions) y poner rate-limit/CAPTCHA al envío | Abuso de storage y spam de correo | **S-M** | `supabase/migrations/20260414_tuhistoria.sql`; `api/notify-historia.js` |

### MEDIA (siguiente — endurecer y limpiar)
| Ítem | Esfuerzo | Archivos |
|------|----------|----------|
| Restringir RLS de `quick_hits`/`tags` a admin/propiedad | S | `20260418_quickhits.sql`, `20260409_sprint4_tags.sql` |
| Sanitización de contenido en el **servidor** | S | `src/lib/content.ts`, `src/pages/articulo/[...slug].astro:165` |
| Eliminar duplicación `raíz/` vs `public/` y código muerto Wix | S-M | `js/`, `data/`, `css/`, `admin/` (raíz); `public/js/api.js`; `public/data/database.js` |
| Cabeceras de seguridad | S | `vercel.json` |
| Higiene de env/secretos (quitar fallbacks, documentar rotación) | S | `src/lib/supabase.ts`, `src/pages/articulo/[...slug].astro` |
| Sacar generación de OG/redimensionado fuera del build (al subir) | M | `src/lib/og-image-generator.ts`, flujo de subida |

### BAJA (mejora continua / estratégico)
| Ítem | Esfuerzo |
|------|----------|
| Flujo editorial (borrador→revisión→publicación), programación, vista previa garantizada | M |
| Biblioteca de medios con carpetas/búsqueda + redimensionado en cliente | M |
| Cuentas por usuario con invitación + auditoría | M |
| Rate-limit a `increment_vistas` y observabilidad/monitoreo (logs, alertas) | S-M |
| Versionado de artículos / operaciones en lote | M-L |

---

## 7. Cómo verificar (cuando se ejecute la prioridad crítica)
- **Build desacoplado del contenido:** publicar un artículo de prueba y confirmar que **no** se dispara ningún deploy en Vercel y que la página aparece en segundos (revalidación on-demand) o en ≤ TTL de ISR.
- **SEO intacto:** `curl` a una URL de artículo y verificar que el HTML completo (título, meta, JSON-LD de `articulo/[...slug].astro:78-103`) viene del servidor.
- **Caché:** segunda visita servida desde el edge (cabecera de caché de Vercel HIT); primera visita tras expiración revalida.
- **Seguridad:** intentar `POST` al endpoint de envío en bucle (debe limitarse); confirmar que `/admin` ya no expone ningún hook; correr **Supabase Advisors** (security/performance) sobre el proyecto.
- **Build solo por código:** un cambio de código sí produce build; un cambio de contenido no.

---

## 8. Apéndice — Inventario de archivos clave citados
- `astro.config.mjs` — modo de render (`output: 'static'`).
- `src/pages/articulo/[...slug].astro` — render de artículo, `getStaticPaths`, `set:html`, OG, increment vistas.
- `src/pages/admin/index.astro` — shell del admin + deploy hook hardcodeado.
- `public/js/admin.js` — lógica viva del admin (save/publish, disparo de rebuild).
- `src/lib/supabase.ts` — capa de datos (queries, paginación, clientes anon/service).
- `src/lib/content.ts` — `renderContent()` (embeds, shortcodes, Markdown).
- `src/lib/og-image-generator.ts` — generación de OG en build.
- `api/notify-historia.js` — endpoint serverless de correo (Resend).
- `supabase/migrations/*.sql` — esquema y RLS (`roles`, `tags`, `quickhits`, `tuhistoria`).
- `vercel.json` — redirects, rewrite de `/admin`, (sin headers de seguridad).
- Duplicados de raíz: `js/`, `data/`, `css/`, `admin/` (código muerto/divergente).

---
*Fin del documento.*
