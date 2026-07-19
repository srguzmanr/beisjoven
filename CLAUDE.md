# Beisjoven — Claude Code Guidelines

## Git Rules

- Claude Code runs in a harness that auto-creates a feature branch per session. Commit to whatever branch you are on — do NOT create additional branches, do NOT switch branches, do NOT try to push to main.
- Sergio clicks "Merge" in GitHub or VS Code after verifying the commit. That takes 2 seconds and preserves a clean commit-per-feature history.
- Do NOT create pull requests unless explicitly asked.
- Do NOT spend time explaining the branch situation in commit messages or chat — just commit and push to the current branch.
- Run `npx astro build` before every push. If it fails, fix it before pushing.
- Use conventional commit messages: `feat(TICKET): description`, `fix(TICKET): description`
- Push a main → Vercel despliega vía Git integration. Publicar contenido NO genera deploys: SSR+ISR sirve el contenido en ≤60s.

## Modelos y effort (era Fable)

- **Fable 5 high:** default de misión y de diagnóstico ambiguo.
- **Sonnet high:** tickets mecánicos y acotados (edición de un solo archivo, copy, ajustes puntuales).
- **xhigh / ultracode:** solo tras un diagnóstico NO CONCLUYENTE. Nunca el punto de partida.
- El effort controla los archivos que se leen + la verificación + la autonomía, no solo el thinking.
- Los niveles de effort NO portan entre modelos: "high" en Sonnet ≠ "high" en Fable.

## Producción y SQL — doctrina de 3 niveles

Supersede cualquier regla binaria previa ("Code nunca escribe a prod").

- **Nivel 1 — Lecturas (SELECT) vía MCP:** libres. Consulta prod cuando lo necesites.
- **Nivel 2 — Verificación con rollback (`BEGIN` → prueba → `ROLLBACK`):** permitida SOLO si se declara en el plan antes de ejecutar y se reporta en la entrega. Nunca DDL, nunca sobre migraciones, nunca fuera de transacción.
- **Nivel 3 — Escrituras persistentes (`INSERT`/`UPDATE`/`DELETE` reales, migraciones, DDL):** Code propone archivos SQL; Sergio los ejecuta en el SQL Editor. Sin excepciones — el MCP `apply_migration` está PROHIBIDO.

Corolarios:

- **"Merged al repo" ≠ "aplicada en prod".** Reporta ambos estados por archivo de migración en cada entrega.
- **"Success. No rows returned" en el SQL Editor = éxito normal** para `UPDATE`/`DELETE`/DDL. No es un error.
- Migraciones idempotentes: `DROP ... IF EXISTS` + `CREATE`, con las queries de verificación embebidas como comentarios al final del archivo.

## Licencia de Mejora (diseño e implementación)

- Los artefactos canónicos (Bible, prototipos, specs del PM) son baseline aprobado, NO techo. Code puede proponer mejoras por encima del spec.
- Toda mejora se lista en el reporte ANTES de implementar, con: qué cambia, por qué es superior, y referencia de práctica actual.
- Guardrails no negociables:
  - Tokens de marca intactos.
  - WCAG AA — AA gana sobre la letra del spec cuando chocan.
  - Sin regresión LCP/CLS.
  - Cero dependencias nuevas.
  - `prefers-reduced-motion` respetado.
  - Prohibidos gimmicks: kinetic type, 3D, scrolljacking, parallax.
- Referencia estética: sobriedad tipográfica de medios serios. 76% del tráfico es móvil (375/412).
- Toda desviación del Bible se documenta en el mensaje de commit para la errata.

## Roles y autenticación (fundado en SEC-ROLES-01)

Detalle completo y matriz de permisos: `docs/SEC-ROLES-01.md`.

- Roles: `app_metadata.role ∈ {superadmin, periodista}`. NUNCA uses `user_metadata` para autorización.
- Helpers de DB: `is_superadmin()`, `is_periodista()`. `is_admin()` = alias de `is_superadmin()` (compatibilidad); políticas nuevas pueden usar cualquiera de los dos.
- Una sola cuenta con rol: Sergio = superadmin. `hola@beisjoven.com` es buzón, no credencial. `admin@beisjoven.com` no existe. Signup público: OFF.
- Rol `periodista`: solo fundación. Sus políticas RLS y UI se implementan en Editor 2.0 con la matriz aprobada en `docs/SEC-ROLES-01.md`. No crees cuentas periodista ni implementes sus policies antes.
- Tras cualquier cambio de rol o de políticas gated por rol: el JWT activo queda obsoleto → logout/login ANTES de diagnosticar "el panel se rompió".

## Seguridad y RLS — reglas de trabajo

- Antes de tocar RLS: inventario completo de `pg_policies` (todas las tablas, no solo lo reportado en el ticket) — los hallazgos nuevos aparecen en los inventarios completos (caso `eventos`).
- Políticas de storage SIEMPRE scoped por `bucket_id`. Nunca dropees políticas globales de `storage.objects` sin verificar efectos en los demás buckets.
- Sincronización de estados cross-tabla: triggers `SECURITY DEFINER` en la DB, no lógica de cliente — el cliente solo cubre el camino que se acuerda de llamar (lección Williamsport).
- El bucket `tu-historia` se escribe y borra SOLO vía service role (endpoint `enviar-historia`). Existen triggers de máquina de estados historia↔artículo sobre `articulos` — el panel NO debe duplicar esa lógica.
- El egress del contenedor bloquea `*.supabase.co` y `beisjoven.com`. Las verificaciones negativas se hacen simulando roles a nivel RLS (`SET LOCAL ROLE` + JWT sintético, como Nivel 2 declarado); la verificación visual de prod queda del lado del CEO.

## Erratas del Bible (registradas; pendientes de consolidar en el Bible)

- Header móvil usa el lockup (mark+wordmark sin tagline) — supersede "mark-only mobile" de §3.0.
- §6.4 watch-metric (chips empujaban categorías fuera de pantalla a 375) → RESUELTO en DESIGN-HF-02: peek 40–60% del último item + chevron de descubribilidad + auto-scroll del tab activo.
- Tagline vigente: "Somos el futuro del beis". El asset con el tagline legacy "El Rostro del béisbol juvenil en México" está fuera de circulación — no lo uses.
- Orden real del footer de artículo (verificado en `src/pages/articulo/[...slug].astro`): Tags → ShareButtons → Artículos relacionados → AdSlot `article-footer`. No existe NewsletterCTA en la página de artículo.
- `NewsletterBlock` es homepage-only (solo `src/pages/index.astro` lo consume).

## Before Writing Code

- Read every file you plan to modify BEFORE editing it.
- If modifying a function, read all callers of that function first.
- If adding to a save/publish flow, trace the entire flow from button click to database write.
- If a ticket references specific files, read those files first even if you think you know what's in them.

## Self-Validation

- After modifying any save/publish/delete flow: write a temporary test script or use the browser console to verify the operation completes end-to-end. Do not assume it works.
- After modifying CSS/layout: describe what the page should look like at 375px and 1280px. If you cannot confirm visually, flag it for manual QA.
- After adding a new Supabase query: run it in isolation first (via supabase.js or a test script) to confirm it returns expected data.
- If you catch your own bug during self-check, fix it before committing.

## Error Handling

- Database operations (Supabase inserts, updates, deletes) must NEVER silently fail.
- Every Supabase call must check `.error` and handle it explicitly — show user-facing feedback AND log to console.
- Wrap non-critical operations (tag sync, analytics, etc.) in try/catch so they cannot block critical operations (article save, publish).
- Every catch block must log the error to console with context: `console.error('[syncTags] Failed:', error)`
- Fallo de una dependencia externa → mensaje accionable al usuario. Nunca una UI muda: si Supabase/Turnstile/Storage falla, el usuario debe ver qué pasó y qué hacer.

## Race Conditions

- Before any save/publish operation, stop the autosave timer. Resume it only after the operation completes.
- Never fire two concurrent Supabase writes to the same row. Await the first before starting the second.
- After a successful INSERT of a new article, redirect to `/admin/editar/:id` (the saved article), never to `/admin/articulos` (the list) or a blank form.

## Architecture

- ONE component, ONE source of truth. Never build two implementations of the same feature.
- When replacing/rebuilding a feature, delete ALL old code first. No dead code.
- Supabase RLS: public SELECT, authenticated INSERT/UPDATE/DELETE (unless told otherwise).

## Stack

- Framework: Astro (SSR + ISR) en Vercel + Tailwind CSS
- Backend: Supabase (DB, Auth, Storage) — project: yulkbjpotfmwqkzzfegg
- Editor: Tiptap 2.0 (Vite-bundled IIFE, window.TiptapEditor)
- Hosting: Vercel (production branch: main)
- Design tokens: Navy #1B2A4A, Red #C8102E, Gold #D4A843, White #FFFFFF
- Typography: Plus Jakarta Sans + Inter

## Frontend (estado post DESIGN-HF-01/02)

- `Header.astro` y `Footer.astro` son los componentes canónicos del sistema. Consumen tokens spec (#1B2A4A / #C8102E / #D4A843, `tokens.css`); los tokens legacy (#1b3557, #e83646) están en extinción — los componentes nuevos JAMÁS los consumen.
- Estados hover SIEMPRE bajo `@media (hover: hover) and (pointer: fine)`; feedback touch vía `:active`. El bug sticky-hover está resuelto — no lo reintroduzcas.
- Verificación visual estándar: Playwright a 375/412/768/1280 en home/artículo/categoría, mock PostgREST local con datos reales obtenidos vía MCP (solo SELECT), screenshots antes/después.
- El punto de inserción de QuickHitsBar / LIVE strip está documentado como comentario en `Header.astro` — su wiring quedó desbloqueado por SEC-03.

## Mobile

- 76% of traffic is mobile. Everything must work at 375px.
- Touch targets: min 44px.
- Test grid layouts at 2 columns (mobile), 3 (tablet), 5 (desktop).

## Lecciones de debugging

- **403 `text/plain` desde un endpoint JSON** = un middleware cortó antes de llegar a tu handler. Verifica la capa del framework (Astro `checkOrigin`, `security.allowedDomains`) antes de debuggear la capa de la app.
- **QA local debe ejercitar el camino de producción:** las features condicionadas a env vars se validan CON la variable poblada (mock fiel si hace falta), no con la rama deshabilitada.
- **ISR 60s: el navegador no es la verdad post-deploy.** Para verificar estado tras un deploy o publicación, consulta la DB por SQL; no diagnostiques con lo que renderiza el navegador dentro de la ventana de revalidación.
- **Vercel `get_runtime_logs` filtrado por path con cero resultados = la función no está deployada**, no un problema de permisos.
- **`storage.objects` NO acepta `DELETE` directo por SQL** — Supabase lo bloquea con el trigger `protect_delete()`. Los borrados de storage van vía Storage API (service-role en código) o el Dashboard. Implicación: cualquier flujo que borre fotos (p. ej. "Descartada" en el admin de historias) usa Storage API, no SQL.

## What NOT To Do

- Do NOT create branches or switch branches — commit to the session's current branch.
- Do not install new dependencies without stating why.
- Do not change the Supabase project URL or anon key.
- Do not modify RLS policies without stating the change explicitly.
- Do not create .env files — use the existing .env.example pattern.
- Do not include QA steps, time estimates, or commentary in commit messages — keep them technical and concise.
