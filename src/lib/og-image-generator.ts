import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yulkbjpotfmwqkzzfegg.supabase.co';
const BUCKET = 'imagenes';
const STORAGE_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

/** Returns the Supabase Storage path for the -og.jpg variant of a given image URL. */
function deriveOgStoragePath(imageUrl: string): string | null {
  if (!imageUrl.startsWith(STORAGE_PREFIX)) return null;
  const originalPath = imageUrl.slice(STORAGE_PREFIX.length).split('?')[0];
  const withoutExt = originalPath.replace(/\.[^/.]+$/, '');
  return `${withoutExt}-og.jpg`;
}

/**
 * Ensures a 1200×630 center-cropped JPEG exists in Supabase Storage alongside
 * the original article image. Runs on demand at request time (SSR + ISR): the
 * fast path is a cheap HEAD check for an already-generated variant; the slow
 * path (download + Sharp + upload) only runs once per image, then the result is
 * served from Storage and the page is cached by ISR. `sharp` is imported
 * dynamically so a load failure degrades to the original image instead of
 * breaking article rendering.
 *
 * Returns the public URL of the -og.jpg file, or null if generation is not
 * possible (non-Supabase URL, missing service key, download/upload failure).
 * The caller should fall back to the original imagen_url on null.
 */
export async function ensureOgImage(imageUrl: string | null | undefined): Promise<string | null> {
  if (!imageUrl) return null;

  const ogPath = deriveOgStoragePath(imageUrl);
  if (!ogPath) return null;

  const ogUrl = `${STORAGE_PREFIX}${ogPath}`;

  // Fast path: skip generation if the file already exists
  try {
    const check = await fetch(ogUrl, { method: 'HEAD' });
    if (check.ok) return ogUrl;
  } catch {
    // Network error — fall through and attempt generation
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.warn('[og-image] SUPABASE_SERVICE_ROLE_KEY not set — skipping OG image generation');
    return null;
  }

  try {
    const { default: sharp } = await import('sharp');
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${imageUrl}`);
    const originalBuffer = Buffer.from(await res.arrayBuffer());

    const cropped = await sharp(originalBuffer)
      .resize(1200, 630, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 85 })
      .toBuffer();

    const supabase = createClient(SUPABASE_URL, serviceKey);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(ogPath, cropped, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      console.error(`[og-image] Upload failed for ${ogPath}:`, error.message);
      return null;
    }

    console.log(`[og-image] Generated ${ogUrl}`);
    return ogUrl;
  } catch (err) {
    console.error(`[og-image] Failed to generate OG image for ${imageUrl}:`, err);
    return null;
  }
}
