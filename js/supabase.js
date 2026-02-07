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
    
    async getArticulosDestacados(limite = 5) {
        const { data, error } = await supabaseClient
            .from('articulos')
            .select(`
                *,
                categoria:categorias(*),
                autor:autores(*)
            `)
            .eq('publicado', true)
            .eq('destacado', true)
            .order('fecha', { ascending: false })
            .limit(limite);
        
        if (error) {
            console.error('Error cargando artículos destacados:', error);
            return [];
        }
        return data;
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
            .limit(limite);
        
        if (error) {
            console.error('Error buscando artículos:', error);
            return [];
        }
        return data;
    },
    
    // ==================== VIDEOS ====================
    
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
    
    // Listar todas las imágenes
    async listarImagenes() {
        const { data, error } = await supabaseClient
            .storage
            .from(this.BUCKET)
            .list('', {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' }
            });
        
        if (error) {
            console.error('Error listando imágenes:', error);
            return [];
        }
        
        // Agregar URLs públicas
        return data.map(archivo => ({
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
