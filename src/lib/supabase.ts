import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL || 'https://yulkbjpotfmwqkzzfegg.supabase.co';
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || 'build-placeholder';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client (for client-side and SSR with anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server client (for build-time fetches with service role key — bypasses RLS)
export const supabaseServer = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;

// ==================== TYPES ====================

export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  color: string;
}

export interface Autor {
  id: number;
  nombre: string;
  slug: string;
  avatar_url: string | null;
  bio: string | null;
}

export interface Articulo {
  id: number;
  titulo: string;
  slug: string;
  extracto: string;
  contenido: string;
  imagen_url: string;
  fecha: string;
  created_at: string;
  updated_at: string | null;
  publicado: boolean;
  destacado: boolean;
  es_wbc2026: boolean;
  vistas: number;
  categoria_id: number;
  autor_id: number;
  evento_id: number | null;
  pie_de_foto: string | null;
  foto_credito: string | null;
  kicker: string | null;
  photo_credit: string | null;
  imagen_portada_alt: string | null;
  hero_layout: string | null;
  categoria: Categoria;
  autor: Autor;
}

export interface Evento {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  imagen_url: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  sede: string | null;
  ciudad: string | null;
  categoria_id: number | null;
  activo: boolean;
  created_at: string;
  categoria?: Categoria;
}

export interface Tag {
  id: string;
  nombre: string;
  slug: string;
  created_at: string;
}

export interface Video {
  id: number;
  titulo: string;
  slug: string;
  descripcion: string;
  youtube_id: string;
  thumbnail_url: string | null;
  fecha: string;
  publicado: boolean;
  destacado: boolean;
  categoria_id: number;
  categoria: Categoria;
}

// ==================== QUERIES ====================

const ARTICLE_SELECT = `*, categoria:categorias(*), autor:autores(*)`;
const PAGE_SIZE = 1000;

/**
 * Fetch all rows from a query using pagination to bypass Supabase's 1000-row default limit.
 */
async function fetchAllPaginated<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const allRows: T[] = [];
  let page = 0;
  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data } = await buildQuery(from, to);
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return allRows;
}

export async function getArticulos(limite = 10) {
  const { data } = await supabaseServer
    .from('articulos')
    .select(ARTICLE_SELECT)
    .eq('publicado', true)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limite);
  return (data as Articulo[]) || [];
}

/** Fetch ALL published articles (paginated, no limit). Used for builds/sitemaps. */
export async function getAllArticulos() {
  return fetchAllPaginated<Articulo>((from, to) =>
    supabaseServer
      .from('articulos')
      .select(ARTICLE_SELECT)
      .eq('publicado', true)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to),
  );
}

export async function getArticuloBySlug(slug: string) {
  const { data } = await supabaseServer
    .from('articulos')
    .select(ARTICLE_SELECT)
    .eq('slug', slug)
    .single();
  return data as Articulo | null;
}

export async function getAllArticuloSlugs() {
  return (await fetchAllPaginated<{ slug: string }>((from, to) =>
    supabaseServer
      .from('articulos')
      .select('slug')
      .eq('publicado', true)
      .range(from, to),
  )).map((a) => a.slug);
}

export async function getArticulosByCategoria(categoriaSlug: string, limite = 10) {
  const cat = await getCategoriaBySlug(categoriaSlug);
  if (!cat) return [];
  const { data } = await supabaseServer
    .from('articulos')
    .select(ARTICLE_SELECT)
    .eq('categoria_id', cat.id)
    .eq('publicado', true)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limite);
  return (data as Articulo[]) || [];
}

export async function getArticulosByCategoriaPaginados(categoriaSlug: string, limite = 20, offset = 0) {
  const cat = await getCategoriaBySlug(categoriaSlug);
  if (!cat) return { articulos: [] as Articulo[], total: 0 };

  const [{ data }, { count }] = await Promise.all([
    supabaseServer
      .from('articulos')
      .select(ARTICLE_SELECT)
      .eq('categoria_id', cat.id)
      .eq('publicado', true)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limite - 1),
    supabaseServer
      .from('articulos')
      .select('id', { count: 'exact', head: true })
      .eq('categoria_id', cat.id)
      .eq('publicado', true),
  ]);
  return { articulos: (data as Articulo[]) || [], total: count || 0 };
}

export async function getArticulosDestacados(limite = 5) {
  const { data } = await supabaseServer
    .from('articulos')
    .select(ARTICLE_SELECT)
    .eq('publicado', true)
    .eq('destacado', true)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limite);
  return (data as Articulo[]) || [];
}

export async function getMasLeidos(limite = 5) {
  const { data } = await supabaseServer
    .from('articulos')
    .select(ARTICLE_SELECT)
    .eq('publicado', true)
    .order('vistas', { ascending: false })
    .order('fecha', { ascending: false })
    .limit(limite);
  return (data as Articulo[]) || [];
}

export async function getArticulosByAutor(autorSlug: string, limite = 20) {
  const autor = await getAutorBySlug(autorSlug);
  if (!autor) return [];
  const { data } = await supabaseServer
    .from('articulos')
    .select(ARTICLE_SELECT)
    .eq('autor_id', autor.id)
    .eq('publicado', true)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limite);
  return (data as Articulo[]) || [];
}

export async function getAllArticulosByAutor(autorSlug: string) {
  const autor = await getAutorBySlug(autorSlug);
  if (!autor) return [];
  return fetchAllPaginated<Articulo>((from, to) =>
    supabaseServer
      .from('articulos')
      .select(ARTICLE_SELECT)
      .eq('autor_id', autor.id)
      .eq('publicado', true)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to),
  );
}

export async function buscarArticulos(query: string, limite = 20) {
  const { data } = await supabase
    .from('articulos')
    .select(ARTICLE_SELECT)
    .eq('publicado', true)
    .or(`titulo.ilike.%${query}%,extracto.ilike.%${query}%`)
    .order('fecha', { ascending: false })
    .limit(limite);
  return (data as Articulo[]) || [];
}

export async function incrementVistas(articuloId: number) {
  await supabase.rpc('increment_vistas', { articulo_id: articuloId });
}

// ==================== WBC 2026 ====================

/** Fetch ALL published WBC 2026 articles (paginated). Used by getStaticPaths + paginate(). */
export async function getAllArticulosWbc2026() {
  return fetchAllPaginated<Articulo>((from, to) =>
    supabaseServer
      .from('articulos')
      .select(ARTICLE_SELECT)
      .eq('publicado', true)
      .eq('es_wbc2026', true)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to),
  );
}

export async function getAllArticulosByCategoria(categoriaSlug: string) {
  const cat = await getCategoriaBySlug(categoriaSlug);
  if (!cat) return [];
  return fetchAllPaginated<Articulo>((from, to) =>
    supabaseServer
      .from('articulos')
      .select(ARTICLE_SELECT)
      .eq('categoria_id', cat.id)
      .eq('publicado', true)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to),
  );
}

// ==================== CATEGORÍAS ====================

export async function getCategorias() {
  const { data } = await supabaseServer
    .from('categorias')
    .select('*')
    .order('id');
  return (data as Categoria[]) || [];
}

export async function getCategoriaBySlug(slug: string) {
  const { data } = await supabaseServer
    .from('categorias')
    .select('*')
    .eq('slug', slug)
    .single();
  return data as Categoria | null;
}

// ==================== AUTORES ====================

export async function getAutores() {
  const { data } = await supabaseServer
    .from('autores')
    .select('*');
  return (data as Autor[]) || [];
}

export async function getAutorBySlug(slug: string) {
  const { data } = await supabaseServer
    .from('autores')
    .select('*')
    .eq('slug', slug)
    .single();
  return data as Autor | null;
}

export async function getAllAutorSlugs() {
  const { data } = await supabaseServer
    .from('autores')
    .select('slug');
  return (data || []).map((a: { slug: string }) => a.slug);
}

// ==================== VIDEOS ====================

export async function getVideos(limite = 10) {
  const { data } = await supabaseServer
    .from('videos')
    .select('*, categoria:categorias(*)')
    .eq('publicado', true)
    .order('fecha', { ascending: false })
    .limit(limite);
  return (data as Video[]) || [];
}

export async function getVideosDestacados(limite = 4) {
  const { data } = await supabaseServer
    .from('videos')
    .select('*, categoria:categorias(*)')
    .eq('publicado', true)
    .eq('destacado', true)
    .order('fecha', { ascending: false })
    .limit(limite);
  return (data as Video[]) || [];
}

// ==================== TAGS ====================

export async function getTags() {
  const { data } = await supabaseServer
    .from('tags')
    .select('*')
    .order('nombre');
  return (data as Tag[]) || [];
}

export async function getTagBySlug(slug: string) {
  const { data } = await supabaseServer
    .from('tags')
    .select('*')
    .eq('slug', slug)
    .single();
  return data as Tag | null;
}

export async function getAllTagSlugs() {
  const { data } = await supabaseServer
    .from('tags')
    .select('slug');
  return (data || []).map((t: { slug: string }) => t.slug);
}

export async function getArticulosByTag(tagSlug: string, limite = 20) {
  const tag = await getTagBySlug(tagSlug);
  if (!tag) return [];
  const { data } = await supabaseServer
    .from('articulos')
    .select(`${ARTICLE_SELECT}, articulo_tags!inner(tag_id)`)
    .eq('articulo_tags.tag_id', tag.id)
    .eq('publicado', true)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limite);
  return (data as Articulo[]) || [];
}

export async function getAllArticulosByTag(tagSlug: string) {
  const tag = await getTagBySlug(tagSlug);
  if (!tag) return [];
  return fetchAllPaginated<Articulo>((from, to) =>
    supabaseServer
      .from('articulos')
      .select(`${ARTICLE_SELECT}, articulo_tags!inner(tag_id)`)
      .eq('articulo_tags.tag_id', tag.id)
      .eq('publicado', true)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to),
  );
}

export async function getTagsByArticuloId(articuloId: number) {
  const { data } = await supabaseServer
    .from('articulo_tags')
    .select('tag:tags(*)')
    .eq('articulo_id', articuloId);
  return ((data || []).map((row: any) => row.tag).filter(Boolean)) as Tag[];
}

/**
 * Replace all tag associations for an article.
 * Deletes existing rows then inserts the new set.
 * Used by admin panel on article save/publish.
 */
export async function syncArticuloTags(articuloId: number, tagIds: string[]): Promise<void> {
  const { error: delError } = await supabaseServer
    .from('articulo_tags')
    .delete()
    .eq('articulo_id', articuloId);
  if (delError) throw new Error(`[syncArticuloTags] delete failed: ${delError.message}`);
  if (tagIds.length === 0) return;
  const rows = tagIds.map((tag_id) => ({ articulo_id: articuloId, tag_id }));
  const { error: insError } = await supabaseServer
    .from('articulo_tags')
    .insert(rows);
  if (insError) throw new Error(`[syncArticuloTags] insert failed: ${insError.message}`);
}

/**
 * Three-tier related articles:
 * 1. Articles sharing the most tags (by overlap count, DESC)
 * 2. Same-category articles (by fecha DESC)
 * 3. Most-recent articles (final fallback)
 * Never includes the current article. Always returns up to `limite` articles.
 */
export async function getRelatedArticulos(
  articuloId: number,
  categoriaId: number,
  limite = 4,
): Promise<Articulo[]> {
  const collected: Articulo[] = [];
  const seenIds = new Set<number>([articuloId]);

  // Tier 1: tag overlap
  const { data: tagRows } = await supabaseServer
    .from('articulo_tags')
    .select('tag_id')
    .eq('articulo_id', articuloId);

  const tagIds = (tagRows || []).map((r: any) => r.tag_id as string);

  if (tagIds.length > 0) {
    const { data: sharedRows } = await supabaseServer
      .from('articulo_tags')
      .select('articulo_id')
      .in('tag_id', tagIds)
      .neq('articulo_id', articuloId);

    // Count shared tags per candidate article
    const countMap = new Map<number, number>();
    for (const row of sharedRows || []) {
      const id = row.articulo_id as number;
      countMap.set(id, (countMap.get(id) || 0) + 1);
    }

    const sortedIds = [...countMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .slice(0, limite);

    if (sortedIds.length > 0) {
      const { data: tagArticulos } = await supabaseServer
        .from('articulos')
        .select(ARTICLE_SELECT)
        .in('id', sortedIds)
        .eq('publicado', true);

      // Restore sort order from countMap ranking
      const articuloMap = new Map(
        (tagArticulos as Articulo[] || []).map((a) => [a.id, a]),
      );
      for (const id of sortedIds) {
        const a = articuloMap.get(id);
        if (a && !seenIds.has(a.id) && collected.length < limite) {
          collected.push(a);
          seenIds.add(a.id);
        }
      }
    }
  }

  // Tier 2: same-category fill
  if (collected.length < limite) {
    const { data: catArticulos } = await supabaseServer
      .from('articulos')
      .select(ARTICLE_SELECT)
      .eq('categoria_id', categoriaId)
      .eq('publicado', true)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limite * 3);

    for (const a of (catArticulos as Articulo[] || [])) {
      if (!seenIds.has(a.id) && collected.length < limite) {
        collected.push(a);
        seenIds.add(a.id);
      }
    }
  }

  // Tier 3: most-recent fallback
  if (collected.length < limite) {
    const { data: recentArticulos } = await supabaseServer
      .from('articulos')
      .select(ARTICLE_SELECT)
      .eq('publicado', true)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limite * 3);

    for (const a of (recentArticulos as Articulo[] || [])) {
      if (!seenIds.has(a.id) && collected.length < limite) {
        collected.push(a);
        seenIds.add(a.id);
      }
    }
  }

  return collected;
}

// ==================== EVENTOS ====================

const EVENTO_SELECT = `*, categoria:categorias(*)`;

export async function getEventoBySlug(slug: string) {
  const { data } = await supabaseServer
    .from('eventos')
    .select(EVENTO_SELECT)
    .eq('slug', slug)
    .single();
  return data as Evento | null;
}

export async function getAllEventoSlugs() {
  const { data } = await supabaseServer
    .from('eventos')
    .select('slug');
  return (data || []).map((e: { slug: string }) => e.slug);
}

export async function getEventosActivos() {
  const { data } = await supabaseServer
    .from('eventos')
    .select(EVENTO_SELECT)
    .eq('activo', true)
    .order('fecha_inicio', { ascending: false });
  return (data as Evento[]) || [];
}

export async function getArticulosByEvento(eventoId: number, limite = 50) {
  const { data } = await supabaseServer
    .from('articulos')
    .select(ARTICLE_SELECT)
    .eq('evento_id', eventoId)
    .eq('publicado', true)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limite);
  return (data as Articulo[]) || [];
}

// ==================== QUICK HITS ====================

export interface QuickHit {
  id: string;
  texto: string;
  url: string;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

export async function getQuickHitsActivos(limite = 3) {
  const { data } = await supabaseServer
    .from('quick_hits')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limite);
  return (data as QuickHit[]) || [];
}
