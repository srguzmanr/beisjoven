// ==================== SUPABASE - CONEXIÓN ====================
// Configuración y cliente de Supabase para Beisjoven

const SUPABASE_URL = 'https://yulkbjpotfmwqkzzfegg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bGtianBvdGZtd3FrenpmZWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2OTk3NTYsImV4cCI6MjA4NTI3NTc1Nn0.PK8mq4CeQkTdurdJ1EV_GOkrY2X4SCsst8O1NnoBWAU';

// Crear cliente de Supabase (usando nombre diferente para evitar conflicto)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== API DE SUPABASE ====================

const SupabaseAPI = {
    
    // ==================== CATEGORÍAS ====================
    
    async getCategorias() {
        const { data, error } = await supabaseClient
            .from('categorias')
            .select('*')
            .order('id');
        
        if (error) {
            console.error('Error cargando categorías:', error);
            return [];
        }
        return data;
    },
    
    async getCategoriaBySlug(slug) {
        const { data, error } = await supabaseClient
            .from('categorias')
            .select('*')
            .eq('slug', slug)
            .single();
        
        if (error) {
            console.error('Error cargando categoría:', error);
            return null;
        }
        return data;
    },
    
    // ==================== AUTORES ====================
    
    async getAutores() {
        const { data, error } = await supabaseClient
            .from('autores')
            .select('*');
        
        if (error) {
            console.error('Error cargando autores:', error);
            return [];
        }
        return data;
    },
    
    async getAutorBySlug(slug) {
        const { data, error } = await supabaseClient
            .from('autores')
            .select('*')
            .eq('slug', slug)
            .single();
        
        if (error) {
            console.error('Error cargando autor:', error);
            return null;
        }
        return data;
    },
    
    // ==================== TAGS ====================

    async getTags() {
        console.log('[Tags] Fetching tags');
        const { data, error } = await supabaseClient
            .from('tags')
            .select('*')
            .order('nombre');
        if (error) { console.error('[Tags] Error cargando tags:', error); return []; }
        console.log('[Tags] Fetched:', (data || []).length, 'tags');
        return data || [];
    },

    async getTagsByArticuloId(articuloId) {
        const { data, error } = await supabaseClient
            .from('articulo_tags')
            .select('tag:tags(*)')
            .eq('articulo_id', articuloId);
        if (error) { console.error('Error cargando tags del artículo:', error); return []; }
        return (data || []).map(row => row.tag).filter(Boolean);
    },

    async syncArticuloTags(articuloId, tagIds) {
        // Delete all existing tag associations for this article, then re-insert
        await supabaseClient
            .from('articulo_tags')
            .delete()
            .eq('articulo_id', articuloId);
        if (!tagIds || tagIds.length === 0) return { success: true };
        const rows = tagIds.map(tag_id => ({ articulo_id: articuloId, tag_id }));
        const { error } = await supabaseClient
            .from('articulo_tags')
            .insert(rows);
        if (error) { console.error('Error sincronizando tags:', error); return { success: false, error: error.message }; }
        return { success: true };
    },

    // Devuelve { data, error } — el llamante SIEMPRE muestra el error al
    // usuario (doctrina: cero fallos silenciosos; el createTag mudo fue la
    // causa #2 del bug "crear tag con acento falla", EDITOR-20 F0 §4).
    async createTag(nombre, slug) {
        const { data, error } = await supabaseClient
            .from('tags')
            .insert([{ nombre: String(nombre).normalize('NFC'), slug }])
            .select()
            .single();
        if (error) {
            console.error('[createTag] Failed:', error);
            let msg = error.message;
            if (error.code === '23505') msg = 'Ya existe un tag con ese nombre o slug.';
            else if (error.code === '42501') msg = 'Sin permisos para crear tags. Cierra sesión y vuelve a entrar.';
            return { data: null, error: msg };
        }
        return { data, error: null };
    },

    // ==================== ARTÍCULOS ====================

    async getArticulos(limite = 10) {
        const { data, error } = await supabaseClient
            .from('articulos')
            .select(`
                *,
                categoria:categorias(*),
                autor:autores(*)
            `)
            .eq('publicado', true)
            .order('fecha', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limite);
        
        if (error) {
            console.error('Error cargando artículos:', error);
            return [];
        }
        return data;
    },
    
    async getArticulosCount() {
        const { count, error } = await supabaseClient
            .from('articulos')
            .select('*', { count: 'exact', head: true })
            .eq('publicado', true);

        if (error) {
            console.error('Error contando artículos:', error);
            return null;
        }
        return count;
    },

    async getArticuloBySlug(slug) {
        const { data, error } = await supabaseClient
            .from('articulos')
            .select(`
                *,
                categoria:categorias(*),
                autor:autores(*)
            `)
            .eq('slug', slug)
            .single();
        
        if (error) {
            console.error('Error cargando artículo:', error);
            return null;
        }
        return data;
    },
    
    async getArticulosByCategoria(categoriaSlug, limite = 10) {
        // Primero obtener la categoría
        const categoria = await this.getCategoriaBySlug(categoriaSlug);
        if (!categoria) return [];
        
        const { data, error } = await supabaseClient
            .from('articulos')
            .select(`
                *,
                categoria:categorias(*),
                autor:autores(*)
            `)
            .eq('categoria_id', categoria.id)
            .eq('publicado', true)
            .order('fecha', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limite);
        
        if (error) {
            console.error('Error cargando artículos por categoría:', error);
            return [];
        }
        return data;
    },
    
    async getMasLeidos(limite = 5) {
        const { data, error } = await supabaseClient
            .from('articulos')
            .select(`
                *,
                categoria:categorias(*),
                autor:autores(*)
            `)
            .eq('publicado', true)
            .order('vistas', { ascending: false }) 
            .order('fecha', { ascending: false })
            .limit(limite);
        
        if (error) {
            console.error('Error cargando más leídos:', error);
            return [];
        }
        return data;
    },
    
    async incrementVistas(articuloId) {
        const { error } = await supabaseClient
            .rpc('increment_vistas', { articulo_id: articuloId });
        if (error) {
            console.error('Error incrementando vistas:', error);
        }
    },

    async getArticulosByAutor(autorSlug, limite = 10) {
        const autor = await this.getAutorBySlug(autorSlug);
        if (!autor) return [];
        
        const { data, error } = await supabaseClient
            .from('articulos')
            .select(`
                *,
                categoria:categorias(*),
                autor:autores(*)
            `)
            .eq('autor_id', autor.id)
            .eq('publicado', true)
            .order('fecha', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limite);
        
        if (error) {
            console.error('Error cargando artículos por autor:', error);
            return [];
        }
        return data;
    },
    
    async buscarArticulos(query, limite = 20) {
        const { data, error } = await supabaseClient
            .from('articulos')
            .select(`
                *,
                categoria:categorias(*),
                autor:autores(*)
            `)
            .eq('publicado', true)
            .or(`titulo.ilike.%${query}%,extracto.ilike.%${query}%,contenido.ilike.%${query}%`)
            .order('fecha', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limite);
        
        if (error) {
            console.error('Error buscando artículos:', error);
            return [];
        }
        return data;
    },
    
    // ==================== PAGINACIÓN ====================
    
    async getArticulosByCategoriaPaginados(categoriaSlug, limite = 20, offset = 0) {
        const categoria = await this.getCategoriaBySlug(categoriaSlug);
        if (!categoria) return [];
        
        const { data, error } = await supabaseClient
            .from('articulos')
            .select(`
                *,
                categoria:categorias(*),
                autor:autores(*)
            `)
            .eq('categoria_id', categoria.id)
            .eq('publicado', true)
            .order('fecha', { ascending: false })
            .order('created_at', { ascending: false })
            .range(offset, offset + limite - 1);
        
        if (error) {
            console.error('Error cargando artículos paginados:', error);
            return [];
        }
        return data;
    },
    
    async contarArticulosByCategoria(categoriaSlug) {
        const categoria = await this.getCategoriaBySlug(categoriaSlug);
        if (!categoria) return 0;
        
        const { count, error } = await supabaseClient
            .from('articulos')
            .select('id', { count: 'exact', head: true })
            .eq('categoria_id', categoria.id)
            .eq('publicado', true);
        
        if (error) {
            console.error('Error contando artículos:', error);
            return 0;
        }
        return count;
    },

    async getArticulosPaginados(limite = 20, offset = 0) {
        const { data, error } = await supabaseClient
            .from('articulos')
            .select(`
                *,
                categoria:categorias(*),
                autor:autores(*)
            `)
            .eq('publicado', true)
            .order('fecha', { ascending: false })
            .order('created_at', { ascending: false })
            .range(offset, offset + limite - 1);
        
        if (error) {
            console.error('Error cargando artículos paginados:', error);
            return [];
        }
        return data;
    },

    async contarArticulos() {
        const { count, error } = await supabaseClient
            .from('articulos')
            .select('id', { count: 'exact', head: true })
            .eq('publicado', true);
        
        if (error) {
            console.error('Error contando artículos:', error);
            return 0;
        }
        return count;
    },

    // ==================== VIDEOS (PUBLIC) ====================
    
    async getVideos(limite = 10) {
        const { data, error } = await supabaseClient
            .from('videos')
            .select(`
                *,
                categoria:categorias(*)
            `)
            .eq('publicado', true)
            .order('fecha', { ascending: false })
            .limit(limite);
        
        if (error) {
            console.error('Error cargando videos:', error);
            return [];
        }
        return data;
    },
    
    async getVideoBySlug(slug) {
        const { data, error } = await supabaseClient
            .from('videos')
            .select(`
                *,
                categoria:categorias(*)
            `)
            .eq('slug', slug)
            .single();
        
        if (error) {
            console.error('Error cargando video:', error);
            return null;
        }
        return data;
    },
    
    async getVideosDestacados(limite = 4) {
        const { data, error } = await supabaseClient
            .from('videos')
            .select(`
                *,
                categoria:categorias(*)
            `)
            .eq('publicado', true)
            .eq('destacado', true)
            .order('fecha', { ascending: false })
            .limit(limite);
        
        if (error) {
            console.error('Error cargando videos destacados:', error);
            return [];
        }
        return data;
    },
    
    // ==================== STREAMS ====================
    
    async getStreams() {
        const { data, error } = await supabaseClient
            .from('streams')
            .select('*')
            .order('fecha_inicio', { ascending: false });
        
        if (error) {
            console.error('Error cargando streams:', error);
            return [];
        }
        return data;
    },
    
    async getStreamEnVivo() {
        const { data, error } = await supabaseClient
            .from('streams')
            .select('*')
            .eq('estado', 'en_vivo')
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            console.error('Error cargando stream en vivo:', error);
        }
        return data || null;
    },
    
    async getProximosStreams(limite = 5) {
        const { data, error } = await supabaseClient
            .from('streams')
            .select('*')
            .eq('estado', 'programado')
            .order('fecha_inicio', { ascending: true })
            .limit(limite);
        
        if (error) {
            console.error('Error cargando próximos streams:', error);
            return [];
        }
        return data;
    },
    
    async getStreamsFinalizados(limite = 10) {
        const { data, error } = await supabaseClient
            .from('streams')
            .select('*')
            .eq('estado', 'finalizado')
            .order('fecha_inicio', { ascending: false })
            .limit(limite);
        
        if (error) {
            console.error('Error cargando streams finalizados:', error);
            return [];
        }
        return data;
    }
};

// Exportar
window.SupabaseAPI = SupabaseAPI;

console.log('✅ Supabase conectado:', SUPABASE_URL);

// ==================== FUNCIONES CRUD PARA ADMIN ====================

const SupabaseAdmin = {
    
    // ==================== ARTÍCULOS ====================
    
    async crearArticulo(articulo) {
        const { data, error } = await supabaseClient
            .from('articulos')
            .insert([articulo])
            .select()
            .single();
        
        if (error) {
            console.error('Error creando artículo:', error);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    },
    
    async actualizarArticulo(id, cambios) {
        const { data, error } = await supabaseClient
            .from('articulos')
            .update(cambios)
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error('Error actualizando artículo:', error);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    },
    
    async eliminarArticulo(id) {
        const { error } = await supabaseClient
            .from('articulos')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error eliminando artículo:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    },
    
    // ==================== VIDEOS ====================
    
    async crearVideo(video) {
        const { data, error } = await supabaseClient
            .from('videos')
            .insert([video])
            .select()
            .single();
        
        if (error) {
            console.error('Error creando video:', error);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    },
    
    async eliminarVideo(id) {
        const { error } = await supabaseClient
            .from('videos')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error eliminando video:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    },
    
    // ==================== STREAMS ====================
    
    async crearStream(stream) {
        const { data, error } = await supabaseClient
            .from('streams')
            .insert([stream])
            .select()
            .single();
        
        if (error) {
            console.error('Error creando stream:', error);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    },
    
    async actualizarStream(id, cambios) {
        const { data, error } = await supabaseClient
            .from('streams')
            .update(cambios)
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error('Error actualizando stream:', error);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    },
    
    async eliminarStream(id) {
        const { error } = await supabaseClient
            .from('streams')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error eliminando stream:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    }
};

window.SupabaseAdmin = SupabaseAdmin;

// ==================== STORAGE - BIBLIOTECA DE MEDIOS ====================

const SupabaseStorage = {
    
    BUCKET: 'imagenes',
    
    // Subir imagen
    async subirImagen(archivo) {
        // Generar nombre único
        const extension = archivo.name.split('.').pop();
        const nombreUnico = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`;
        
        const { data, error } = await supabaseClient
            .storage
            .from(this.BUCKET)
            .upload(nombreUnico, archivo);
        
        if (error) {
            console.error('Error subiendo imagen:', error);
            return { success: false, error: error.message };
        }
        
        // Obtener URL pública
        const { data: urlData } = supabaseClient
            .storage
            .from(this.BUCKET)
            .getPublicUrl(nombreUnico);
        
        return { 
            success: true, 
            data: {
                nombre: nombreUnico,
                url: urlData.publicUrl,
                tipo: archivo.type,
                tamaño: archivo.size
            }
        };
    },
    
    // Listar todas las imágenes (pagina el bucket en lotes hasta agotarlo)
    async listarImagenes() {
        const BATCH = 100;
        const archivos = [];
        let offset = 0;

        while (true) {
            const { data, error } = await supabaseClient
                .storage
                .from(this.BUCKET)
                .list('', {
                    limit: BATCH,
                    offset: offset,
                    sortBy: { column: 'created_at', order: 'desc' }
                });

            if (error) {
                console.error(`[listarImagenes] Error listando imágenes (offset ${offset}):`, error);
                break;
            }

            archivos.push(...(data || []));
            if (!data || data.length < BATCH) break;
            offset += BATCH;
        }

        // Agregar URLs públicas
        return archivos.map(archivo => ({
            nombre: archivo.name,
            url: this.obtenerUrl(archivo.name),
            creado: archivo.created_at,
            tamaño: archivo.metadata?.size || 0
        }));
    },
    
    // Obtener URL pública de una imagen
    obtenerUrl(nombre) {
        const { data } = supabaseClient
            .storage
            .from(this.BUCKET)
            .getPublicUrl(nombre);
        return data.publicUrl;
    },
    
    // Eliminar imagen
    async eliminarImagen(nombre) {
        const { error } = await supabaseClient
            .storage
            .from(this.BUCKET)
            .remove([nombre]);
        
        if (error) {
            console.error('Error eliminando imagen:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    }
};

window.SupabaseStorage = SupabaseStorage;

// ==================== TU HISTORIA — COMMUNITY SUBMISSIONS ====================

// Admin-panel helpers only. The public submission flow (form + photos +
// emails) writes exclusively through POST /api/enviar-historia (SEC-02 P2) —
// no anon-key writes from the browser.
const SupabaseHistorias = {

    BUCKET: 'tu-historia',

    // Copia la foto principal de una historia al bucket público 'imagenes'
    // (SEC-02-FIX-01). El bucket tu-historia es privado desde SEC-02 P1 y el
    // admin no tiene service role en cliente, así que la copia (descarga +
    // strip EXIF con sharp + upload + metadata) la hace el servidor; aquí
    // solo se manda el access_token de la sesión y se recibe la URL pública
    // estable resultante. Lanza si falla — el llamante decide cómo degradar.
    async copiarFotoAImagenes(path, credito) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) throw new Error('No hay sesión activa');
        const res = await fetch('/api/copiar-foto-historia', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.access_token,
            },
            body: JSON.stringify({ path, credito: credito || null }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(body.error || 'No se pudo copiar la foto');
        }
        return body.url;
    },

    // Signed URL for a stored photo path (private bucket). Async.
    // Read is admin-only at the RLS layer (is_admin()); see the P1 storage
    // migration. Default TTL 1h — enough for an admin review session.
    async obtenerUrlFotoFirmada(path, expiresIn = 3600) {
        const { data, error } = await supabaseClient.storage
            .from(this.BUCKET)
            .createSignedUrl(path, expiresIn);
        if (error) {
            console.error('[obtenerUrlFotoFirmada] Failed:', error);
            throw error;
        }
        return data.signedUrl;
    },

    // Admin: list submissions, optionally filtered by estado.
    // Embeds the linked article's slug so the detail panel can build a
    // public-facing link for publicada submissions.
    async listarHistorias(estado = null, page = 0, limit = 20) {
        let query = supabaseClient
            .from('historias_enviadas')
            .select('*, articulo:articulos(slug)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(page * limit, (page + 1) * limit - 1);

        if (estado && estado !== 'todas') {
            query = query.eq('estado', estado);
        }

        const { data, error, count } = await query;
        if (error) {
            console.error('[listarHistorias] Failed:', error);
            throw error;
        }
        // Flatten the embedded slug onto the row for easy access in UI code.
        const rows = (data || []).map(r => ({
            ...r,
            articulo_slug: r.articulo ? r.articulo.slug : null
        }));
        return { data: rows, count: count || 0 };
    },

    // Admin: count submissions per estado (for filter-pill badges).
    async contarHistoriasPorEstado() {
        const { data, error } = await supabaseClient
            .from('historias_enviadas')
            .select('estado');
        if (error) {
            console.error('[contarHistoriasPorEstado] Failed:', error);
            return {};
        }
        const counts = {};
        for (const row of data || []) {
            counts[row.estado] = (counts[row.estado] || 0) + 1;
        }
        return counts;
    },

    // Admin: update a submission.
    async actualizarHistoria(id, updates) {
        const { data, error } = await supabaseClient
            .from('historias_enviadas')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('[actualizarHistoria] Failed:', error);
            throw error;
        }
        return data;
    },
};

window.SupabaseHistorias = SupabaseHistorias;
