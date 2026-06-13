// ============================================================
// sync-standings — Edge Function (Deno)
// Auto-updates league standings from statsapi.mlb.com (the same MLB
// Advanced Media backend that powers milb.com, where LMB is hosted).
//
// Strategy: the public site reads standings ONLY from Postgres
// (ligas/equipos/posiciones), so the UI is fully decoupled from this
// sync. This function (run on a nightly schedule, or invoked manually)
// fetches the live standings and upserts them via the service role.
//
// ACTIVATION CHECKLIST (the "extra steps" — UI works on placeholders
// until these are done):
//   1. Confirm each league's statsapi sportId in `ligas.external_sport_id`
//      (MLB = 1, confirmed; LMB Mexican League sportId must be verified
//      against https://statsapi.mlb.com/api/v1/sports).
//   2. Invoke once and inspect the JSON summary + logs.
//   3. When real data lands, clear the placeholder teams for that league
//      (the ones with external_id IS NULL) to avoid duplicates.
//   4. Schedule nightly via Supabase pg_cron (see scheduling note at end).
//
// Invoke:  POST /functions/v1/sync-standings           → all active leagues
//          POST /functions/v1/sync-standings?liga=mlb  → one league
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// MLB league/division ids → Spanish labels.
const MLB_CONFERENCIA: Record<number, string> = { 103: 'Americana', 104: 'Nacional' };
const MLB_DIVISION: Record<number, string> = {
  200: 'Oeste', 201: 'Este', 202: 'Centro', // AL West / East / Central
  203: 'Oeste', 204: 'Este', 205: 'Centro', // NL West / East / Central
};

interface Liga {
  id: number;
  slug: string;
  external_sport_id: number | null;
  external_league_ids: string | null;
  temporada_actual: string | null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// "W3" → "G3" (ganados), "L2" → "P2" (perdidos).
function streakToEs(code: string | undefined): string | null {
  if (!code) return null;
  return code.replace(/^W/, 'G').replace(/^L/, 'P');
}

// deno-lint-ignore no-explicit-any
async function syncLiga(supabase: any, liga: Liga) {
  if (!liga.external_sport_id) {
    return { liga: liga.slug, ok: false, skipped: 'sin external_sport_id' };
  }
  const season = liga.temporada_actual || `${new Date().getFullYear()}`;
  const params = new URLSearchParams({
    sportId: String(liga.external_sport_id),
    season,
    standingsTypes: 'regularSeason',
  });
  if (liga.external_league_ids) params.set('leagueId', liga.external_league_ids);

  const apiUrl = `https://statsapi.mlb.com/api/v1/standings?${params.toString()}`;
  const resp = await fetch(apiUrl, { headers: { Accept: 'application/json' } });
  if (!resp.ok) throw new Error(`statsapi ${resp.status} for ${apiUrl}`);
  const payload = await resp.json();
  const records = payload.records || [];

  let teams = 0;
  let rows = 0;
  for (const rec of records) {
    const conferencia = MLB_CONFERENCIA[rec.league?.id] ?? null;
    const division = MLB_DIVISION[rec.division?.id] ?? null;
    for (const tr of rec.teamRecords || []) {
      const externalId = String(tr.team?.id ?? '');
      if (!externalId) continue;

      const { data: eq, error: eqErr } = await supabase
        .from('equipos')
        .upsert(
          {
            liga_id: liga.id,
            nombre: tr.team?.name ?? `Equipo ${externalId}`,
            nombre_corto: tr.team?.teamName ?? null,
            abreviatura: tr.team?.abbreviation ?? null,
            division,
            conferencia,
            external_id: externalId,
            activo: true,
          },
          { onConflict: 'liga_id,external_id' },
        )
        .select('id')
        .maybeSingle();
      if (eqErr || !eq) {
        console.error(`[sync-standings] equipos upsert ${liga.slug}/${externalId}:`, eqErr?.message);
        continue;
      }
      teams++;

      const wins = Number(tr.wins ?? 0);
      const losses = Number(tr.losses ?? 0);
      const pct = parseFloat(tr.winningPercentage ?? '0') ||
        (wins + losses > 0 ? wins / (wins + losses) : 0);
      const { error: posErr } = await supabase.from('posiciones').upsert(
        {
          equipo_id: eq.id,
          temporada: season,
          jj: wins + losses,
          jg: wins,
          jp: losses,
          pct: Number(pct.toFixed(3)),
          gb: String(tr.gamesBack ?? '-'),
          racha: streakToEs(tr.streak?.streakCode),
          orden: parseInt(tr.divisionRank ?? '0', 10) || 0,
        },
        { onConflict: 'equipo_id,temporada' },
      );
      if (posErr) {
        console.error(`[sync-standings] posiciones upsert ${liga.slug}/${externalId}:`, posErr.message);
        continue;
      }
      rows++;
    }
  }
  return { liga: liga.slug, ok: true, teams, rows, season };
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ ok: false, error: 'Missing SUPABASE_URL / SERVICE_ROLE_KEY' }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const onlyLiga = new URL(req.url).searchParams.get('liga');
  const { data: ligas, error } = await supabase.from('ligas').select('*').eq('activa', true);
  if (error) return jsonResponse({ ok: false, error: error.message }, 500);

  const summary = [];
  for (const liga of (ligas as Liga[]).filter((l) => !onlyLiga || l.slug === onlyLiga)) {
    try {
      summary.push(await syncLiga(supabase, liga));
    } catch (e) {
      console.error(`[sync-standings] ${liga.slug} failed:`, e);
      summary.push({ liga: liga.slug, ok: false, error: String(e) });
    }
  }
  return jsonResponse({ ok: true, ranAt: new Date().toISOString(), summary });
});

// ----------------------------------------------------------------
// Nightly scheduling (run once in the SQL editor after activation):
//
//   select cron.schedule(
//     'sync-standings-nightly', '15 9 * * *',  -- 09:15 UTC ≈ 03:15 CT
//     $$ select net.http_post(
//          url     := 'https://yulkbjpotfmwqkzzfegg.functions.supabase.co/sync-standings',
//          headers := jsonb_build_object(
//            'Content-Type','application/json',
//            'Authorization','Bearer ' || current_setting('app.service_role_key', true)
//          )
//        ) $$
//   );
//
// (Requires the pg_cron + pg_net extensions, both available on Supabase.)
// ----------------------------------------------------------------
