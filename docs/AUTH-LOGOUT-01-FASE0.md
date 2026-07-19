# AUTH-LOGOUT-01 — Fase 0: Diagnóstico del logout parcial

Fecha: 2026-07-19 · Estado: diagnóstico CONCLUYENTE

## Flujo real del control "Cerrar sesión"

Hay **dos puntos de logout** y ambos convergen en el mismo handler (no divergen):

- Desktop: sidebar (`AdminComponents.sidebar()`, `admin.js:4223`) — `<a href="#" onclick="AdminPages.logout(); return false;">`
- Móvil: sheet "Mas" de la bottom tab bar (`AdminComponents.bottomTabBar()`, `admin.js:4297`) — misma estructura.

Cadena: `AdminPages.logout()` → `Autosave.stop()` → `await Auth.logout()` →
`supabaseClient.auth.signOut()` (error **ignorado**) → `currentUser = null` →
`Router.navigate('/login')`.

## Causa raíz del doble clic: carrera de renders provocada por el Router

El bug NO está en `signOut()` (en el camino feliz la sesión SÍ se invalida al
primer clic). Está en que **el mismo clic dispara dos navegaciones concurrentes**:

1. El `onclick` inline arranca el logout asíncrono. `return false` cancela el
   default del `<a>`, pero **no detiene la propagación** del evento.
2. El clic burbujea hasta el interceptor global del Router (`router.js:16-25`),
   que no distingue enlaces de acción: para `href="#"`, `new URL(link.href).pathname`
   es **la ruta actual** → `Router.navigate('/admin/...')` re-ejecuta el handler
   de la página actual con la sesión todavía viva.
3. Ese handler pinta su shell y se queda en `await` de sus queries (el dashboard
   hace 6). Mientras tanto `signOut()` termina, `Router.navigate('/login')` pinta
   el login… y **el render tardío del handler viejo sobreescribe `#main-content`**
   con el layout admin otra vez.
4. En ese render fantasma `Auth.getUser()` ya es `null` → `isAdmin()` es `false`
   → el sidebar se pinta **sin 📹 Videos ni 👥 Usuarios** ("desaparecen un par de
   opciones"). El segundo clic "funciona" porque con `isLoggedIn() === false` los
   guards redirigen a `/login` sin render lento que compita.

Estado real tras el primer clic (camino feliz): **la sesión ya está revocada y el
storage limpio** — la UI muestra un panel fantasma renderizado con SELECTs
públicos. Es lo inverso a lo temido, pero igual de grave como señal.

## El agujero de seguridad real: signOut() fallido es silencioso

`Auth.logout()` ignora el `{ error }` que devuelve `signOut()`. En supabase-js v2,
si la llamada al servidor falla por red (escenario iPhone en evento en vivo), el
cliente **NO borra la sesión local** y devuelve el error. Resultado con el código
actual: `currentUser = null` + redirect a `/login` con el token intacto en
`localStorage` (`sb-yulkbjpotfmwqkzzfegg-auth-token`) y el refresh token válido en
el servidor. **UI dice "fuera", sesión viva** — exactamente el escenario del
ticket, y hoy es 100% silencioso.

## ¿Lo introdujo F7 (EDITOR-20)?

**No. Lo expuso.** `git blame`:

- El handler de logout y el interceptor del Router no cambiaron en EDITOR-20.
- El gating `isAdmin` del sidebar (Videos/Usuarios) ya existía antes de F7, y
  `isAdmin()` ya devolvía `false` con `currentUser === null` antes y después.
- La carrera de renders existía antes de F7 con el mismo desenlace visual. Lo que
  cambió la percepción: F7 (`9954bd6`) tocó rol/labels del sidebar y el CEO
  verificó el panel tras el deploy de PR-1, encontrando el comportamiento.

## Hallazgo adicional (móvil)

`AdminComponents.injectBottomTabs()` hace `return` temprano si
`!Auth.isLoggedIn()` **antes** de remover las barras existentes → tras el logout,
la bottom tab bar del panel sobrevive montada encima de `/login`.

## Hallazgo de la verificación: la carrera tiene DOS gatillos

La verificación E2E (ver abajo) demostró que la re-navegación del Router es el
gatillo determinista, pero no el único: **cualquier** handler de página async
aún en vuelo (queries pendientes) cuando se dispara el logout sobreescribe el
login con su render tardío — p. ej. clic en "Cerrar sesión" apenas cargando una
página. El fix debía cubrir ambos gatillos, no solo el del Router.

## Fix (Fase 1)

1. `router.js`: el interceptor de clicks ignora enlaces con `href` que empieza
   por `#` (enlaces de acción manejados por su propio `onclick`). Elimina la
   navegación espuria (gatillo determinista de la carrera).
2. `router.js` (`handleRoute`): al navegar, `#main-content` se reemplaza por un
   nodo fresco — los handlers viejos aún en vuelo escriben en un nodo
   desconectado del DOM, sin efecto visible. Neutraliza el segundo gatillo para
   TODAS las rutas, no solo el logout.
3. `auth.js`: `logout()` captura el error de `signOut()`; si el servidor no
   confirma, **borra a mano las claves `sb-*-auth-token`** del storage (logout
   local garantizado, independiente de versión de supabase-js) y devuelve
   `{ success, error }`.
4. `admin.js`: `AdminPages.logout()` con guard anti-reentrada, redirect a
   `/login` y, si la revocación remota falló, toast de error visible (nunca
   silencioso). `injectBottomTabs()` remueve las barras viejas antes de los
   early-returns.
5. Colaterales preexistentes de la misma familia (handlers viejos), expuestos
   por la verificación: `_wireArticulosFilters()` aborta sin crash si el DOM de
   filtros ya no existe; `_syncUrlFromState()` ya no hace `replaceState` si el
   usuario dejó `/admin/articulos` (reescribía la entrada de historial de la
   página nueva y rompía el botón atrás).

## Verificación ejecutada

Egress a Supabase bloqueado en el contenedor → Playwright contra el build
estático con cliente Supabase stubbeado fiel a supabase-js v2 (incluido el
detalle de que un error de red NO limpia la sesión local). 24 checks, todos ✓:

- Desktop 1280, un clic: login visible, sin layout admin residual, token fuera
  de localStorage, sin render fantasma tardío, `/admin` directa exige login.
- Móvil 375 vía bottom tabs → "Mas": ídem + barras móviles removidas en login.
- signOut fallido (red inestable): toast de error visible + token borrado del
  dispositivo de todos modos.
- Doble clic rápido: un solo `signOut()` (guard anti-reentrada).
- Regresión de navegación normal: dashboard ↔ artículos ↔ medios + botón atrás,
  sin errores JS.

Verificación visual final en prod queda del lado del CEO.
