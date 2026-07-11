// ADS-TRACK-01 — first-party ad-event ingestion (impression / viewable / click).
// Write path is server-side ONLY (service role); the ad_eventos table has no
// anon/authenticated INSERT policies (SEC-06 doctrine). The endpoint is
// intentionally silent: malformed payloads, rate-limited callers and insert
// failures all answer 204 — a tracking beacon must never surface a 500 to the
// page. Failures are logged server-side instead. Non-POST methods → 405
// (ADS-TRACK-02; without ALL, Astro would answer 404 for them).
import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { validateAdEvent } from '@/lib/ad-event-validator.js';

export const prerender = false;

const MAX_BODY_BYTES = 2048;

// ADS-TRACK-02 — the insert only works with the service role. When the key is
// missing, supabaseServer silently falls back to the anon client and every
// insert dies in RLS with a misleading error; refuse loudly instead so the
// misconfiguration is unmissable in Vercel logs. Evaluated at Vite build time
// (inlined), same as the supabaseServer client itself — a key added in Vercel
// only takes effect on the next deploy, which is Vercel's env semantics anyway.
const serviceKeyPresent = Boolean(import.meta.env.SUPABASE_SERVICE_ROLE_KEY);
if (!serviceKeyPresent) {
  console.error('[ad-event] SUPABASE_SERVICE_ROLE_KEY is not set — events will be dropped');
}

// Soft per-IP rate limit (~60/min, fixed window), in-memory per warm serverless
// instance. A mitigation against runaway clients, not a security control: each
// Vercel instance keeps its own counters. The whole Map resets on window
// rotation so it cannot grow unbounded on long-lived instances.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
let windowStart = 0;
let hits = new Map<string, number>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (now - windowStart >= WINDOW_MS) {
    windowStart = now;
    hits = new Map();
  }
  const count = (hits.get(ip) ?? 0) + 1;
  hits.set(ip, count);
  return count > MAX_PER_WINDOW;
}

const noContent = () => new Response(null, { status: 204 });

export const POST: APIRoute = async ({ request }) => {
  try {
    // First hop of x-forwarded-for = client IP (Vercel sets it). Used only for
    // the in-memory counter — never stored (no PII in ad_eventos).
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimited(ip)) return noContent();

    const text = await request.text();
    if (!text || text.length > MAX_BODY_BYTES) return noContent();

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return noContent();
    }

    const payload = validateAdEvent(raw);
    if (!payload) return noContent();

    if (!serviceKeyPresent) return noContent();

    const ua = request.headers.get('user-agent') ?? '';
    const { error } = await supabaseServer.from('ad_eventos').insert({
      slot_id: payload.slot_id,
      anuncio_id: payload.anuncio_id,
      evento: payload.evento,
      path: payload.path,
      ua_movil: /Mobi|Android/i.test(ua),
    });
    if (error) console.error('[ad-event] insert failed:', error.message);
  } catch (err) {
    console.error('[ad-event] unexpected:', err);
  }
  return noContent();
};

export const ALL: APIRoute = () =>
  new Response(null, { status: 405, headers: { Allow: 'POST' } });
