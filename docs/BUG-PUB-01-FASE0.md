# BUG-PUB-01 — Fase 0: rutas públicas sirven artículos despublicados

Fecha: 2026-08-01 · Estado: diagnóstico **CONCLUYENTE**

## Causa raíz (una sola línea de código)

`getArticuloBySlug()` (`src/lib/supabase.ts`) resolvía el slug **sin filtrar
`publicado`**:

```ts
const { data } = await supabaseServer
  .from('articulos')
  .select(ARTICLE_SELECT)
  .eq('slug', slug)      // ← único predicado
  .single();
```

Es la única query de artículos del repo que resolvía por identificador sin el
filtro. Los listados (portada, categoría, autor, tag, WBC, búsqueda,
relacionados, más leídos, sitemap) sí lo llevaban — de ahí que el artículo 730
desapareciera de todas las listas y siguiera vivo en su URL.

### Por qué RLS no lo atrapó

La policy `public_read_published` sobre `articulos` es correcta
(`qual: publicado = true`), pero **no aplica**: todas las lecturas SSR del sitio
usan `supabaseServer`, es decir la **service role key**, que bypasea RLS por
diseño. El filtro tiene que estar en la query; la policy es red de seguridad
sólo para el cliente anónimo del navegador.

Inventario de policies SELECT sobre `articulos` (verificado por SQL, Nivel 1):

| policy | roles | qual |
| --- | --- | --- |
| `Lectura pública de articulos` | public | `publicado = true` |
| `public_read_published` | public | `publicado = true` |
| `own_drafts_read` | public | `auth.uid() = user_id AND publicado = false` |
| `admin_read_all` | authenticated | `is_admin()` |

### Por qué duró 36 h y no 60 s

No fue la caché: el ISR revalidó decenas de veces en esas 36 horas y **cada
revalidación volvió a pedir el artículo a la DB y volvió a recibirlo**, porque
la query no discriminaba `publicado`. Ninguna purga de caché lo habría
arreglado; el fix opera en la query en tiempo de request, como pide el ticket.

## Segundo defecto: la URL del artículo nunca devolvía 404

Aun cuando el slug no existía, la ruta hacía `return Astro.redirect('/404')`.
Medido contra producción el 1-ago (`beisjoven.com`, código previo al fix):
`/articulo/<slug-inexistente>` → **302** a `/404`, y `/404` → **404** (lo
sirve el catch-all de Vercel, `{"src":"^/.*$","dest":"/404.html","status":404}`).

Es decir: el status 404 existía, pero **en otra URL**. La URL del artículo
respondía 302, así que un rastreador o un monitor que consultara el estado de
`/articulo/<slug>` nunca veía un 404 en esa URL — veía una redirección a una
página distinta. Ambas rutas de detalle (`/articulo`, `/evento`) tenían el
mismo patrón. El fix hace que el 404 salga en la URL pedida, sin salto.

## Auditoría completa de superficies públicas

Barrido de todo consumo de `articulos` en `src/lib`, `src/pages`,
`src/components` y `public/js` (`.from('articulos')`, `.eq('slug'`, `.eq('id'`).

### Resuelven un artículo por identificador

| Superficie | Archivo | Filtro `publicado` | Veredicto |
| --- | --- | --- | --- |
| Detalle de artículo | `src/pages/articulo/[...slug].astro` → `getArticuloBySlug` | **NO** | **BUG — contenido completo servido con 200** |
| Header: categoría activa del nav | `src/components/Header.astro:36` → `getArticuloBySlug` | **NO** | **Mismo bug.** Segundo consumidor de la función; no filtra contenido pero resolvía despublicados. Se corrige con el mismo cambio |
| Preview del panel (por id) | `public/js/article-preview.js:212` | no | OK — sólo lo carga `/admin`, con sesión; RLS `admin_read_all`. Leer borradores es su función |
| `DB.getArticuloBySlug` del panel | `public/js/supabase.js:162` | no | OK — mismo caso: bundle admin-only, cliente anónimo + sesión, RLS aplica |
| Guardado de artículo | `src/pages/api/guardar-articulo.ts:90` | no | OK — endpoint de escritura, exige `app_metadata.role = superadmin` |

### Listados y feeds (todos correctos, verificados uno por uno)

`getArticulos`, `getAllArticulos`, `getAllArticuloSlugs`,
`getArticulosByCategoria(+Paginados)`, `getArticulosByAutor(+Paginados)`,
`getArticulosByTag(+Paginados)`, `getArticulosWbc2026Paginados`,
`getAllArticulosWbc2026`, `getAllArticulosByCategoria`, `getAllArticulosByTag`,
`getAllArticulosByAutor`, `getMasLeidos`, `getMasLeidosByCategoria`,
`getArticulosByEvento`, `buscarArticulos`, `getPortadaSlots`
(`.eq('articulo.publicado', true)` sobre el join `!inner`), las tres tiers de
`getRelatedArticulos`, las queries inline de `src/pages/index.astro` (feed,
más leídos 30d, fallback, rail juvenil) y de `src/components/CategorySection.astro`,
y el "Cargar más" del navegador (`public/js/category-load-more.js:96`).
**Todas llevan `.eq('publicado', true)`.**

- **Sitemap** (`src/pages/sitemap.xml.ts`): consume `getAllArticulos()` y
  `getAllArticulosByTag()`, ambos filtrados → nunca emitió despublicados.
  Criterio 4 ya se cumplía antes del fix; queda protegido por el test.
- **Feeds/RSS**: no existen. No hay ruta `rss.xml`/`feed`; `@astrojs/sitemap`
  está en `package.json` pero no está en `integrations` — el único mapa de
  URLs es `sitemap.xml.ts`.
- **Endpoint OG**: no existe como ruta. `ensureOgImage()` recibe una URL de
  imagen ya resuelta por la página; no consulta `articulos`.
- **Búsqueda interna** (`/buscar`): `buscarArticulos` filtra **y además** usa
  el cliente anónimo (`supabase`, no `supabaseServer`), así que también está
  cubierta por RLS. Es el único consumo público que ya era fail-closed doble.

### Observaciones adyacentes (fuera del alcance del ticket, sin cambios)

1. **`/galeria`** (`src/pages/galeria.astro`) lista `imagenes_metadata` de todo
   el bucket `imagenes`. Las fotos de un artículo retractado siguen siendo
   públicas ahí. No es una superficie de artículos y `imagenes_metadata` no
   tiene concepto de `publicado`: retirar una foto de un artículo retractado es
   hoy una acción manual. Decisión de producto, no bug de esta ruta.
2. **`increment_vistas`**: RPC pública invocada desde la página del artículo.
   Tras el fix sólo se ejecuta en páginas que renderizan (publicadas). No
   divulga contenido; no se toca.
3. **`Header.astro` repite la query del artículo** que la página ya hizo (un
   round-trip extra por render de artículo). No se cambia en este ticket:
   pasar el dato exigiría refactorizar el contrato del layout.
4. **Deuda SEC-04 confirmada**: `articulo_tags` tiene INSERT/DELETE para
   cualquier `authenticated` (`qual: true`) y `articulos` conserva
   `authenticated_insert` con `auth.uid() IS NOT NULL`. Ya inventariado en
   `docs/SEC-ROLES-01.md`; no se toca aquí.

## Estado de la data en prod (SELECT, Nivel 1)

`704 publicados / 0 despublicados / 704 total`. El artículo 730 ya no existe
(borrado por el CEO). **No hay ningún artículo con `publicado = false` para
probar el caso negativo en el preview** → ver `supabase/qa/BUG-PUB-01-datos-prueba.sql`.

## Fix aplicado (Fase 1)

1. `getArticuloBySlug` añade `.eq('publicado', true)`. Fail-closed: sin
   parámetro para saltarse el filtro. Corrige a la vez la ruta de detalle y el
   Header.
2. `/articulo/[...slug]` devuelve `new Response(null, { status: 404 })` en vez
   del redirect. Con body nulo y status reroutable, Astro sirve la página 404
   prerenderizada (`404.html`) **conservando el status 404 y la URL original**
   (`REROUTABLE_STATUS_CODES` en `astro/dist/core/app/index.js`). No se toca
   `404.astro` ni el catch-all de Vercel.

   Dependencia que introduce ese camino, verificada en el artefacto: Astro
   recupera el cuerpo del 404 con `prerenderedErrorPageFetch` — un `fetch` a
   `<host>/404.html` del propio deployment (log del harness:
   `http://localhost/404.html`). En prod el host es `beisjoven.com` y ese
   archivo lo sirve el CDN (comprobado: `beisjoven.com/404` responde 404 con
   `content-disposition: filename="404.html"`). En un preview con SSO el
   fetch interno topa con la pantalla de autenticación; el status sigue
   siendo 404 porque `#mergeResponses` lo fuerza, pero el cuerpo puede no ser
   la página de marca. Es cosmético y sólo afecta previews protegidos.
3. `/evento/[slug]` recibe el mismo trato (mejora declarada: era el único otro
   detalle con soft 404; dejarlo inconsistente no tenía defensa).
4. `tests/publicado-filter.test.mjs`: guarda de regresión estática que recorre
   toda cadena `.from('articulos')` de las superficies públicas y exige el
   token `publicado`, más la aserción de que la ruta de detalle devuelve 404
   real. Verificada quitando el filtro a mano: falla señalando el archivo:línea.

Sin dependencias nuevas, sin cambios de esquema, sin migraciones.

## Fase 2 — verificación end-to-end sobre el artefacto construido

El preview de Vercel **no es alcanzable desde el contenedor**: la política de
red del entorno rechaza el CONNECT a `*.vercel.app`
(`gateway answered 403 to CONNECT`, mismo bloqueo documentado para
`*.supabase.co` y `beisjoven.com`), y el deployment está bajo SSO
(`ssoProtection: all_except_custom_domains`), así que el fetch por MCP recibe
la redirección a `vercel.com/sso-api` en vez de la página. Ver "Pendiente del
CEO" abajo.

Sustituto ejercitado, siguiendo el patrón de `CLAUDE.md` (mock PostgREST local
con datos reales obtenidos por MCP): se levantó **la función SSR/ISR ya
construida** (`.vercel/output/functions/_isr.func/dist/server/entry.mjs`, el
mismo artefacto que Vercel despliega) contra un mock de PostgREST en
`127.0.0.1:54321`, con el artículo real 734 (publicado) y una fila
despublicada de prueba. No es `astro dev`: es el bundle de producción.

Dos shims declarados: (1) `fetch` a `<host>/404.html` servido desde
`.vercel/output/static` — en Vercel lo sirve el CDN, aquí no hay CDN; (2) HEAD
a Supabase Storage → 200, para que `ensureOgImage` tome su fast path sin salir
a la red. Ninguno toca la ruta ni la query bajo prueba.

Medición pareada, mismo mock, mismo harness — sólo cambia el código:

| Caso | Antes (código de `HEAD~1`) | Después |
| --- | --- | --- |
| `/articulo/beisbol-mexico-panama-jcc-2026` (publicado) | 200, nota completa | **200, sin cambios** |
| `/articulo/qa-bug-pub-01-no-publicar` (`publicado = false`) | **200 con el contenido íntegro** | **404**, página de marca, cero fuga |
| `/articulo/slug-que-no-existe-999` | 302 → 404 en `/404` | **404** en la URL pedida |
| `/evento/no-existe-999` | 302 → 404 en `/404` | **404** en la URL pedida |
| `/` (portada) | — | 200 |
| `/sitemap.xml` | — | 200, cero ocurrencias del despublicado |

La fuga se comprobó buscando un centinela dentro del cuerpo del despublicado:
1 ocurrencia antes, 0 después. `npm run build` y `npm test` (46 tests) en
verde; la guarda de regresión se validó quitando el filtro a mano — falla
apuntando a `src/lib/supabase.ts:157`.

### Pendiente del CEO (no ejecutable desde aquí)

1. Ejecutar `supabase/qa/BUG-PUB-01-datos-prueba.sql` (bloque 1) — prod tiene
   0 despublicados, así que sin esa fila el caso negativo no existe en la DB.
   **No se creó ni se mutó ningún dato**: doctrina Nivel 3.
2. Tras el merge y pasada la ventana ISR de 60 s, confirmar en prod:
   ```
   curl -o /dev/null -s -w "%{http_code}\n" https://beisjoven.com/articulo/qa-bug-pub-01-no-publicar   # 404
   curl -o /dev/null -s -w "%{http_code}\n" https://beisjoven.com/articulo/beisbol-mexico-panama-jcc-2026  # 200
   curl -o /dev/null -s -w "%{http_code}\n" https://beisjoven.com/articulo/slug-que-no-existe-999      # 404
   ```
3. Ejecutar el bloque 3 del SQL para borrar la fila de prueba.
