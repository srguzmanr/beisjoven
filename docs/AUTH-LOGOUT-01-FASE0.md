# AUTH-LOGOUT-01 — Fase 0: Diagnóstico del logout parcial

**Fecha:** 2026-07-19 · **Reportado por:** CEO tras el deploy de PR-1 (EDITOR-20)
**Síntoma:** "Cerrar sesión" requiere dos clics; el primero solo hace desaparecer
un par de opciones del menú lateral.

## Veredicto en una línea

El bug es una **race condition preexistente** entre el interceptor global de clicks
del Router SPA y el handler asíncrono de logout. **EDITOR-20 F7 NO lo introdujo ni
lo expuso** — el flujo completo (link `href="#"`, interceptor, gating `isAdmin` del
sidebar) data de BJ-008 (`fb04b0c`), muy anterior. Además existe un **segundo
defecto real de seguridad**: `Auth.logout()` ignora el error de `signOut()`, con lo
que un fallo de red produce exactamente el "logout que miente" que teme el ticket.

## Flujo actual del control "Cerrar sesión"

Hay **dos puntos de logout** y ambos convergen en el mismo handler — no divergen:

- Sidebar desktop: `admin.js:4223` — `<a href="#" onclick="AdminPages.logout(); return false;">`
- Sheet "más" del tab bar móvil: `admin.js:4297` — idéntico markup.

`AdminPages.logout()` (`admin.js:2946`):

```js
logout: async function() {
    Autosave.stop();
    await Auth.logout();          // → supabaseClient.auth.signOut(); currentUser = null
    Router.navigate('/login');
}
```

`Auth.logout()` (`auth.js:71`) hace `await supabaseClient.auth.signOut()` **sin leer
el `{ error }` que retorna** (supabase-js v2 no lanza: retorna el error).

## Qué pasa en el primer clic (anatomía de la race)

1. El `onclick` inline arranca `AdminPages.logout()`, que se suspende en el `await`
   de `signOut()` (request de red a `/auth/v1/logout`). `return false` cancela el
   default del `<a>`, pero **no detiene la propagación**.
2. El click burbujea hasta el listener global del Router (`router.js:16-25`). Para
   `href="#"`, `link.href` resuelve a la URL actual + `#` → pasa todos los filtros →
   `Router.navigate(rutaAdminActual)`: **re-navega a la misma página admin**.
3. El handler de esa página (todas siguen el patrón render-loading → `await` fetch →
   render final) pasa su guard `isLoggedIn()` (la sesión aún vive) y lanza sus
   queries a Supabase.
4. `signOut()` resuelve: dispara `SIGNED_OUT` → `currentUser = null` → `Auth.logout`
   retorna → `Router.navigate('/login')` **renderiza el login correctamente**.
5. …pero el fetch del paso 3 seguía en vuelo. Al resolver, el handler zombie hace
   `main.innerHTML = layout admin` y **aplasta el login** con un render fantasma del
   panel. Como `currentUser` ya es `null`, `isAdmin()` es `false` → el sidebar se
   renderiza **sin 📹 Videos ni 👥 Usuarios** ("el par de opciones que desaparecen")
   y con el user-block vacío. La URL queda en `/login`; el contenido dice admin.

**En el primer clic la sesión SÍ se invalida** (server-side y localStorage): el
panel que se ve después es un fantasma sin token detrás — la UI miente en la
dirección inversa a la temida ("dentro" sin sesión). Los datos visibles ya se
habían fetcheado con el token aún vivo.

## Qué pasa en el segundo clic

La URL ya es `/login`. El mismo interceptor del Router ahora re-navega a `/login` →
`AdminPages.login()` renderiza el formulario. Sin queries admin en vuelo, no hay
fantasma que lo aplaste. Por eso "el segundo clic sí funciona".

## ¿Fue F7 (EDITOR-20)?

**No.** Evidencia:

- El diff de F7 (`9954bd6`) en el flujo de logout es nulo: solo cambió `_mapUser`
  (rol desde `app_metadata`, sin default) y labels de copy. `AdminPages.logout`,
  `Auth.logout` y el Router quedaron intactos.
- El gating `${isAdmin ? ...}` de Videos/Usuarios en sidebar y more-menu data de
  BJ-008 (`fb04b0c`), igual que el link `href="#"`.
- El síntoma visible sería idéntico pre-F7: en el render fantasma `currentUser` es
  `null`, y el `isAdmin()` viejo (`currentUser && role === 'admin'`) también daba
  falsy con `currentUser = null`. La race es puramente de timing (logout-request vs
  queries del panel) y no depende del origen del rol.

Conclusión: coincidencia temporal con el deploy de PR-1, no causalidad.

## Defecto adicional encontrado (el riesgo real de seguridad)

`Auth.logout()` ignora el `{ error }` de `signOut()`. En supabase-js v2, si el POST
a `/logout` falla con un error de red (no 401/403/404), **la sesión local NO se
borra y no se emite `SIGNED_OUT`** — pero `Auth.logout` pone `currentUser = null` y
el flujo navega a `/login` igualmente. Resultado: **formulario de login en pantalla
con refresh token vivo en localStorage**; al recargar, `Auth.init()` restaura la
sesión. Ese es exactamente el escenario "iPhone en evento en vivo con red inestable"
del ticket. Hoy es silencioso; el fix lo hace visible y no-mentiroso.

## Hallazgo colateral (mismo bug del Router)

`admin.js:504` ("+ Nuevo Artículo" del dashboard) también es `href="#"` con
`Router.navigate()` inline: hoy provoca **doble navegación/render** de `/admin/nuevo`
(la inline y la del interceptor). El fix del Router lo corrige de paso.

## Fix propuesto (Fase 1)

1. **`router.js`** — el interceptor global ignora links cuyo `href` literal empieza
   por `#`: son controles JS, no navegación SPA. Mata la re-navegación fantasma en
   ambos puntos de logout y la doble navegación de `admin.js:504`.
2. **`auth.js`** — `Auth.logout()` lee el `{ error }` de `signOut()` (y envuelve en
   try/catch por robustez). Con error: `console.error` con contexto + retorna
   `{ success: false, error }` **sin** tocar `currentUser` (nada de UI "fuera" con
   sesión viva). Con éxito: `{ success: true }`.
3. **`admin.js`** — `AdminPages.logout()`: guard de reentrada (evita dobles clics
   durante el request), y en éxito **navegación dura** `window.location.replace('/admin')`
   en lugar de `Router.navigate('/login')`: descarga el documento, matando cualquier
   handler/timer en vuelo (elimina la clase entera de renders fantasma en logout) y
   garantiza arranque limpio; sin sesión, el guard del dashboard lleva al login.
   En fallo: cierra el more-menu si está abierto y muestra `showToast(..., 'error')`
   accionable — el usuario ve que sigue dentro y puede reintentar.

Nota: `/login` no existe como ruta de servidor (redirect 301 → `/admin` en
`astro.config.mjs`); por eso la navegación dura apunta a `/admin` directamente.

## Verificación (plan)

Egress bloquea `*.supabase.co` → harness local: servidor estático sirviendo
`public/` + página réplica de `admin/index.astro` con `window.supabase.createClient`
mockeado (sesión seed en localStorage, `signOut` con latencia y fallo configurables,
query builder thenable). Playwright a 375 (logout vía tab bar → sheet "más") y 1280
(sidebar): repro pre-fix del fantasma, y post-fix: un clic → login, storage limpio,
`/admin` directo exige login; caso `signOut` fallido → toast visible y sesión/UI
consistentes.
