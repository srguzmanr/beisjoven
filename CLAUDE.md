# Beisjoven — Claude Code Guidelines

## Git Rules
- ALWAYS commit to `main`. Never create branches unless explicitly told to.
- Run `npx astro build` before every push. If it fails, fix it before pushing.
- Use conventional commit messages: `feat(TICKET): description`, `fix(TICKET): description`

## Before Writing Code
- Read every file you plan to modify BEFORE editing it.
- If modifying a function, read all callers of that function first.
- If adding to a save/publish flow, trace the entire flow from button click to database write.

## Self-Validation
- After modifying any save/publish/delete flow: write a temporary test script or use the browser console to verify the operation completes end-to-end. Do not assume it works.
- After modifying CSS/layout: describe what the page should look like at 375px and 1280px. If you cannot confirm visually, flag it for manual QA.
- After adding a new Supabase query: run it in isolation first (via supabase.js or a test script) to confirm it returns expected data.
- If you catch your own bug during self-check, fix it before committing.

## Error Handling
- Database operations (Supabase inserts, updates, deletes) must NEVER silently fail.
- Wrap non-critical operations (tag sync, analytics, etc.) in try/catch so they cannot block critical operations (article save, publish).
- Every catch block must log the error to console with context: `console.error('[syncTags] Failed:', error)`

## Architecture
- ONE component, ONE source of truth. Never build two implementations of the same feature.
- When replacing/rebuilding a feature, delete ALL old code first. No dead code.
- Supabase RLS: public SELECT, authenticated INSERT/UPDATE/DELETE (unless told otherwise).

## Stack
- Framework: Astro (SSG) + Tailwind CSS
- Backend: Supabase (DB, Auth, Storage)
- Editor: Tiptap 2.0 (Vite-bundled IIFE, window.TiptapEditor)
- Hosting: Vercel (production branch: main)
- Design tokens: Navy #1B2A4A, Red #C8102E, Gold #D4A843, White #FFFFFF
- Typography: Plus Jakarta Sans + Inter

## Mobile
- 76% of traffic is mobile. Everything must work at 375px.
- Touch targets: min 44px.
- Test grid layouts at 2 columns (mobile), 3 (tablet), 5 (desktop).

## What NOT To Do
- Do not install new dependencies without stating why.
- Do not change the Supabase project URL or anon key.
- Do not modify RLS policies without stating the change explicitly.
- Do not create .env files — use the existing .env.example pattern.
