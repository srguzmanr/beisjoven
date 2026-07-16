# Beisjoven — Claude Code Guidelines

## Git Rules

- Claude Code runs in a harness that auto-creates a feature branch per session. Commit to whatever branch you are on — do NOT switch branches, do NOT try to push to main.
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

## Race Conditions
- Before any save/publish operation, stop the autosave timer. Resume it only after the operation completes.
- Never fire two concurrent Supabase writes to the same row. Await the first before starting the second.
- After a successful INSERT of a new article, redirect to `/admin/editar/:id` (the saved article), never to `/admin/articulos` (the list) or a blank form.

## Producción y SQL (doctrina vigente 15-jul-2026)
Reemplaza la regla binaria "Code nunca escribe a prod". Tres niveles:
- **Nivel 1 — Lecturas (SELECT) vía MCP:** libres. Consulta prod cuando lo necesites.
- **Nivel 2 — Verificación con rollback (`BEGIN` → prueba → `ROLLBACK`):** permitida SOLO si se declara en el plan antes de ejecutar y se reporta en la entrega. Nunca DDL, nunca sobre migraciones, nunca fuera de transacción.
- **Nivel 3 — Escrituras persistentes (`INSERT`/`UPDATE`/`DELETE` reales, migraciones, DDL):** Code propone SQL plano; Sergio lo ejecuta en el SQL Editor. Sin excepciones — aplica también vía MCP `apply_migration`.

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

## Mobile
- 76% of traffic is mobile. Everything must work at 375px.
- Touch targets: min 44px.
- Test grid layouts at 2 columns (mobile), 3 (tablet), 5 (desktop).

## Lecciones operativas (sprint 15-16 jul)
- **403 `text/plain` desde un endpoint JSON** = un middleware cortó antes de llegar a tu handler. Verifica la capa del framework (Astro `checkOrigin`, `security.allowedDomains`) antes de debuggear la capa de la app.
- **QA local debe ejercitar el camino de producción:** las features condicionadas a env vars se validan CON la variable poblada (mock fiel si hace falta), no con la rama deshabilitada.
- **Fallo de una dependencia externa → mensaje accionable al usuario.** Nunca una UI muda: si Supabase/Turnstile/Storage falla, el usuario debe ver qué pasó y qué hacer.
- **`storage.objects` NO acepta `DELETE` directo por SQL** — Supabase lo bloquea con el trigger `protect_delete()`. Los borrados de storage van vía Storage API (service-role en código) o el Dashboard. Implicación: cualquier flujo que borre fotos (p. ej. "Descartada" en el admin de historias) usa Storage API, no SQL.
- **"Success. No rows returned" en el SQL Editor = éxito normal** para `UPDATE`/`DELETE`/DDL. No es un error.

## What NOT To Do
- Do NOT create branches. Commit to `main`.
- Do not install new dependencies without stating why.
- Do not change the Supabase project URL or anon key.
- Do not modify RLS policies without stating the change explicitly.
- Do not create .env files — use the existing .env.example pattern.
- Do not include QA steps, time estimates, or commentary in commit messages — keep them technical and concise.
