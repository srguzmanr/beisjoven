import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL || 'https://yulkbjpotfmwqkzzfegg.supabase.co';
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
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
