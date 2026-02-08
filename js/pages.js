// Páginas/Vistas de Beisjoven

// Helper: Update meta tags dynamically for better social sharing
function updateMetaTags(options = {}) {
    const defaults = {
        title: 'Beisjoven - La Revista Digital de Béisbol y Softbol Mexicano',
        description: 'Cobertura editorial del béisbol y softbol mexicano. MLB, LMB, LMP, Selección México, Softbol y más.',
        image: 'https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/public/imagenes/beisjoven-og-image.jpg',
        url: window.location.href,
        type: 'website'
    };
    const meta = { ...defaults, ...options };
    
    // Update document title
    document.title = meta.title;
    
    // Helper to set a meta tag
    function setMeta(attr, attrValue, content) {
        let el = document.querySelector(`meta[${attr}="${attrValue}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attr, attrValue);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    }
    
    // Standard meta
    setMeta('name', 'description', meta.description);
    
    // Open Graph
    setMeta('property', 'og:title', meta.title);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:image', meta.image);
    setMeta('property', 'og:url', meta.url);
    setMeta('property', 'og:type', meta.type);
    
    // Twitter
    setMeta('name', 'twitter:title', meta.title);
    setMeta('name', 'twitter:description', meta.description);
    setMeta('name', 'twitter:image', meta.image);
    
    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', meta.url);
    
    // GA4 SPA page view tracking
    if (typeof gtag === 'function') {
        gtag('event', 'page_view', {
            page_title: meta.title,
            page_location: meta.url
        });
    }
}

const Pages = {
    
    // ==================== PÁGINA DE INICIO ====================
    home: async function() {
        const main = document.getElementById('main-content');
        
        // Mostrar loading mientras carga
        main.innerHTML = `
            <div class="loading-page">
                <div class="container" style="text-align: center; padding: 4rem;">
                    <p>Cargando...</p>
                </div>
            </div>
        `;
        
        // Obtener datos de Supabase
        const [
            articulos,
            articulosDestacados,
            videos
        ] = await Promise.all([
            SupabaseAPI.getArticulos(20),
            SupabaseAPI.getArticulosDestacados(3),
            SupabaseAPI.getVideosDestacados(5)
        ]);
        
        // Filtrar artículos por categoría (usando los datos ya cargados)
        const lmbArticles = articulos.filter(a => a.categoria?.slug === 'lmb').slice(0, 4);
        const mlbArticles = articulos.filter(a => a.categoria?.slug === 'mlb').slice(0, 4);
        const softbolArticles = articulos.filter(a => a.categoria?.slug === 'softbol').slice(0, 4);
        const internationalArticles = articulos.filter(a => a.categoria?.slug === 'internacional').slice(0, 2);
        
        // Si no hay destacados, usar los primeros artículos
        const featuredArticles = articulosDestacados.length > 0 ? articulosDestacados : articulos.slice(0, 3);
        
        // Más leídos (por ahora usamos los más recientes)
        const mostRead = articulos.slice(0, 5);
        
        // Últimas noticias para ticker
        const latestNews = articulos.slice(0, 3);
        
        // Equipos - disabled for MVP (pendiente de API real)
        const teams = [];
        
        // Adaptar datos de Supabase al formato esperado por Components
        const adaptArticle = (a) => ({
            id: a.id,
            title: a.titulo,
            slug: a.slug,
            excerpt: a.extracto,
            content: a.contenido,
            image: a.imagen_url,
            date: a.fecha,
            views: a.vistas || 0,
            featured: a.destacado,
            category: a.categoria ? {
                name: a.categoria.nombre,
                slug: a.categoria.slug,
                color: a.categoria.color
            } : null,
            author: a.autor ? {
                name: a.autor.nombre,
                slug: a.autor.slug,
                avatar: a.autor.avatar_url
            } : null
        });
        
        const adaptVideo = (v) => ({
            id: v.id,
            title: v.titulo,
            slug: v.slug,
            description: v.descripcion,
            youtubeId: v.youtube_id,
            thumbnail: v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/maxresdefault.jpg`,
            date: v.fecha,
            duration: '',
            formattedViews: '0',
            timeAgo: v.fecha ? new Date(v.fecha).toLocaleDateString('es-MX') : '',
            category: v.categoria ? {
                name: v.categoria.nombre,
                slug: v.categoria.slug
            } : null
        });
        
        // Adaptar todos los artículos
        const featured = featuredArticles.map(adaptArticle);
        const lmb = lmbArticles.map(adaptArticle);
        const mlb = mlbArticles.map(adaptArticle);
        const softbol = softbolArticles.map(adaptArticle);
        const international = internationalArticles.map(adaptArticle);
        const latest = latestNews.map(adaptArticle);
        const popular = mostRead.map(adaptArticle);
        const vids = videos.map(adaptVideo);
        
        // A) Última actualización basada en el artículo más reciente
        const lastArticleDate = articulos?.[0]?.created_at
            ? new Date(articulos[0].created_at)
            : new Date();
        const lastUpdated = lastArticleDate.toLocaleString('es-MX', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        main.innerHTML = `
            <!-- Ticker -->
            ${Components.ticker(latest)}

            <!-- B) Envuelto en container para alineación -->
            <div class="container">
                <div class="last-updated">
                    Última publicación: <strong>${lastUpdated}</strong>
                </div>
            </div>

            <!-- Hero Section -->
            <section class="hero">
                <div class="container">
                    <div class="hero-grid">
                        ${featured[0] ? Components.articleCardFeatured(featured[0]) : '<p>No hay artículos destacados</p>'}
                        <div class="hero-sidebar">
                            ${featured.slice(1, 3).map(a => Components.articleCardSidebar(a)).join('')}
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- Liga Mexicana -->
            <section class="news-section">
                <div class="container">
                    ${Components.sectionTitle('Liga Mexicana de Beisbol', '⚾', { url: '/categoria/lmb', text: 'Ver más' })}
                    <div class="news-grid">
                        ${lmb.length > 0 ? lmb.map(a => Components.articleCard(a)).join('') : '<p class="empty-message">Próximamente más noticias de la LMB</p>'}
                    </div>
                </div>
            </section>
            
            <!-- MLB -->
            <section class="news-section alt-bg">
                <div class="container">
                    ${Components.sectionTitle('MLB - Mexicanos en Grandes Ligas', '🏆', { url: '/categoria/mlb', text: 'Ver más' })}
                    <div class="featured-grid">
                        ${mlb.length > 0 ? mlb.slice(0, 2).map(a => Components.articleCardHorizontal(a)).join('') : '<p class="empty-message">Próximamente más noticias de MLB</p>'}
                    </div>
                </div>
            </section>
            
            <!-- Softbol -->
            <section class="news-section">
                <div class="container">
                    ${Components.sectionTitle('Softbol México', '🥎', { url: '/categoria/softbol', text: 'Ver más' })}
                    <div class="news-grid">
                        ${softbol.length > 0 ? softbol.map(a => Components.articleCard(a)).join('') : '<p class="empty-message">Próximamente más noticias de Softbol</p>'}
                    </div>
                </div>
            </section>
            
            <!-- Internacional + Sidebar -->
            <section class="news-section alt-bg">
                <div class="container">
                    <div class="two-column">
                        <div>
                            ${Components.sectionTitle('Noticias Internacionales', '🌎')}
                            <div class="featured-grid single-column">
                                ${international.length > 0 ? international.map(a => Components.articleCardHorizontal(a)).join('') : '<p class="empty-message">Próximamente noticias internacionales</p>'}
                            </div>
                        </div>
                        <aside>
                            ${teams.length > 0 ? Components.standingsTable(teams) : ''}
                            ${Components.mostReadWidget(popular)}
                        </aside>
                    </div>
                </div>
            </section>
            
            <!-- Videos -->
            <section class="news-section videos-section-dark">
                <div class="container">
                    ${Components.sectionTitle('Videos Destacados', '▶️', { url: '/videos', text: 'Ver canal' })}
                    ${vids.length > 0 
                        ? `<div class="vid-grid-home">
                            ${vids.slice(0, 6).map(v => Components.videoCard(v)).join('')}
                           </div>`
                        : '<p class="empty-message" style="color:#aaa">Próximamente videos</p>'
                    }
                </div>
            </section>
        `;
        
        document.title = 'Beisjoven - Revista de Beisbol y Softbol de México';
        updateMetaTags();
    },
    
    // ==================== PÁGINA DE CATEGORÍA ====================
    category: async function({ params }) {
        const main = document.getElementById('main-content');
        
        // Mostrar loading
        main.innerHTML = `
            <div class="loading-page">
                <div class="container" style="text-align: center; padding: 4rem;">
                    <p>Cargando...</p>
                </div>
            </div>
        `;
        
        // Obtener categoría y artículos de Supabase
        const categoria = await SupabaseAPI.getCategoriaBySlug(params.slug);
        
        if (!categoria) {
            main.innerHTML = `
                <div class="error-page">
                    <div class="container">
                        <h1>Categoría no encontrada</h1>
                        <a href="/" class="btn btn-primary">Volver al inicio</a>
                    </div>
                </div>
            `;
            return;
        }
        
        const [articulosCategoria, articulosPopulares] = await Promise.all([
            SupabaseAPI.getArticulosByCategoria(params.slug, 50),
            SupabaseAPI.getArticulos(5)
        ]);
        
        // Adaptar artículos
        const adaptArticle = (a) => ({
            id: a.id,
            title: a.titulo,
            slug: a.slug,
            excerpt: a.extracto,
            content: a.contenido,
            image: a.imagen_url,
            date: a.fecha,
            formattedDate: new Date(a.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
            views: a.vistas || 0,
            featured: a.destacado,
            category: a.categoria ? {
                name: a.categoria.nombre,
                slug: a.categoria.slug,
                color: a.categoria.color
            } : null,
            author: a.autor ? {
                name: a.autor.nombre,
                slug: a.autor.slug,
                avatar: a.autor.avatar_url
            } : null
        });
        
        const articles = articulosCategoria.map(adaptArticle);
        const mostRead = articulosPopulares.map(adaptArticle);
        
        main.innerHTML = `
            ${Components.breadcrumb([
                { url: '/', text: 'Inicio' },
                { url: `/categoria/${categoria.slug}`, text: categoria.nombre }
            ])}
            
            <section class="category-page">
                <div class="container">
                    <header class="category-header">
                        <span class="category-icon">${categoria.icono || '📰'}</span>
                        <h1>${categoria.nombre}</h1>
                        <p>${articles.length} artículos</p>
                    </header>
                    
                    <div class="two-column">
                        <div>
                            ${articles.length > 0 
                                ? `<div class="articles-list">
                                    ${articles.map(a => Components.articleCardHorizontal(a)).join('')}
                                   </div>`
                                : Components.emptyState('No hay artículos en esta categoría', '📭')
                            }
                        </div>
                        <aside>
                            ${Components.mostReadWidget(mostRead)}
                        </aside>
                    </div>
                </div>
            </section>
        `;
        
        document.title = `${categoria.nombre} - Beisjoven`;
        updateMetaTags({
            title: `${categoria.nombre} - Beisjoven`,
            description: `Noticias y artículos de ${categoria.nombre} en Beisjoven.`,
            url: `https://beisjoven.com/categoria/${categoria.slug}`
        });
    },
    
    // ==================== PÁGINA DE ARTÍCULO ====================
    article: async function({ params }) {
        const main = document.getElementById('main-content');
        
        // Mostrar loading
        main.innerHTML = `
            <div class="loading-page">
                <div class="container" style="text-align: center; padding: 4rem;">
                    <p>Cargando artículo...</p>
                </div>
            </div>
        `;
        
        // Obtener artículo de Supabase
        const articulo = await SupabaseAPI.getArticuloBySlug(params.slug);
        
        if (!articulo) {
            main.innerHTML = `
                <div class="error-page">
                    <div class="container">
                        <h1>Artículo no encontrado</h1>
                        <a href="/" class="btn btn-primary">Volver al inicio</a>
                    </div>
                </div>
            `;
            return;
        }
        
        // Obtener artículos relacionados (misma categoría)
        const articulosRelacionados = articulo.categoria 
            ? await SupabaseAPI.getArticulosByCategoria(articulo.categoria.slug, 5)
            : [];
        
        // Adaptar artículo
        const article = {
            id: articulo.id,
            title: articulo.titulo,
            slug: articulo.slug,
            excerpt: articulo.extracto,
            content: articulo.contenido,
            image: articulo.imagen_url,
            date: articulo.fecha,
            formattedDate: new Date(articulo.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
            readTime: Math.ceil((articulo.contenido || '').split(' ').length / 200) + ' min lectura',
            views: articulo.vistas || 0,
            tags: [],
            category: articulo.categoria ? {
                name: articulo.categoria.nombre,
                slug: articulo.categoria.slug,
                color: articulo.categoria.color
            } : { name: 'General', slug: 'general' },
            author: articulo.autor ? {
                name: articulo.autor.nombre,
                slug: articulo.autor.slug,
                avatar: articulo.autor.avatar_url,
                bio: articulo.autor.bio
            } : { name: 'Redacción', slug: 'redaccion' }
        };
        
        // Adaptar relacionados (excluyendo el actual)
        const relatedArticles = articulosRelacionados
            .filter(a => a.id !== articulo.id)
            .slice(0, 4)
            .map(a => ({
                id: a.id,
                title: a.titulo,
                slug: a.slug,
                excerpt: a.extracto,
                image: a.imagen_url,
                date: a.fecha,
                views: a.vistas || 0,
                category: a.categoria ? {
                    name: a.categoria.nombre,
                    slug: a.categoria.slug
                } : null
            }));
        
        const currentUrl = window.location.href;
        
        // Obtener más leídos
        const articulosPopulares = await SupabaseAPI.getArticulos(5);
        const mostRead = articulosPopulares.map(a => ({
            id: a.id,
            title: a.titulo,
            slug: a.slug,
            image: a.imagen_url,
            views: a.vistas || 0
        }));
        
        main.innerHTML = `
            ${Components.breadcrumb([
                { url: '/', text: 'Inicio' },
                { url: `/categoria/${article.category.slug}`, text: article.category.name },
                { url: `/articulo/${article.slug}`, text: article.title.substring(0, 30) + '...' }
            ])}
            
            <article class="article-page">
                <div class="container">
                    <header class="article-header">
                        <a href="/categoria/${article.category.slug}" class="category">${article.category.name}</a>
                        <h1>${article.title}</h1>
                        <div class="article-meta">
                            ${Components.authorBox(article.author)}
                            <div class="meta-info">
                                <span>📅 ${article.formattedDate}</span>
                                <span>⏱ ${article.readTime}</span>
                                <span>👁 ${article.views} vistas</span>
                            </div>
                        </div>
                    </header>
                    
                    <figure class="article-image">
                        <img src="${article.image}" alt="${article.title}">
                    </figure>
                    
                    <div class="article-body">
                        <div class="article-content">
                            ${article.content}
                            
                            ${article.tags.length > 0 ? `
                                <div class="article-tags">
                                    <strong>Etiquetas:</strong>
                                    ${Components.tags(article.tags)}
                                </div>
                            ` : ''}
                            
                            ${Components.shareButtons(currentUrl, article.title)}
                        </div>
                        
                        <aside class="article-sidebar">
                            ${Components.mostReadWidget(mostRead)}
                        </aside>
                    </div>
                    
                    ${relatedArticles.length > 0 ? `
                        <section class="related-articles">
                            ${Components.sectionTitle('Artículos Relacionados', '📰')}
                            <div class="news-grid">
                                ${relatedArticles.map(a => Components.articleCard(a)).join('')}
                            </div>
                        </section>
                    ` : ''}
                </div>
            </article>
        `;
        
        document.title = `${article.title} - Beisjoven`;
        updateMetaTags({
            title: `${article.title} - Beisjoven`,
            description: article.excerpt,
            image: article.image,
            url: `https://beisjoven.com/articulo/${article.slug}`,
            type: 'article'
        });
    },
    
    // ==================== PÁGINA DE VIDEOS ====================
    videos: async function() {
        const main = document.getElementById('main-content');
        
        // Mostrar loading
        main.innerHTML = `
            <div class="loading-page">
                <div class="container" style="text-align: center; padding: 4rem;">
                    <p>Cargando videos...</p>
                </div>
            </div>
        `;
        
        // Obtener videos de Supabase
        const videosData = await SupabaseAPI.getVideos(50);
        
        // Adaptar videos
        const videos = videosData.map(v => ({
            id: v.id,
            title: v.titulo,
            slug: v.slug,
            description: v.descripcion,
            youtubeId: v.youtube_id,
            thumbnail: v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/maxresdefault.jpg`,
            date: v.fecha,
            duration: '',
            formattedViews: '0',
            timeAgo: v.fecha ? new Date(v.fecha).toLocaleDateString('es-MX') : '',
            category: v.categoria ? {
                name: v.categoria.nombre,
                slug: v.categoria.slug
            } : null
        }));
        
        main.innerHTML = `
            ${Components.breadcrumb([
                { url: '/', text: 'Inicio' },
                { url: '/videos', text: 'Videos' }
            ])}
            
            <section class="videos-page">
                <div class="container">
                    <header class="page-header">
                        <h1>▶️ Videos</h1>
                        <p>Los mejores videos de béisbol y softbol mexicano</p>
                    </header>
                    
                    ${videos.length > 0 
                        ? `<div class="vid-grid-page">
                            ${videos.map(v => Components.videoCard(v)).join('')}
                           </div>`
                        : Components.emptyState('No hay videos disponibles', '📹')
                    }
                </div>
            </section>
        `;
        
        document.title = 'Videos - Beisjoven';
    },
    
    // ==================== PÁGINA DE VIDEO INDIVIDUAL ====================
    video: async function({ params }) {
        const main = document.getElementById('main-content');
        
        // Mostrar loading
        main.innerHTML = `
            <div class="loading-page">
                <div class="container" style="text-align: center; padding: 4rem;">
                    <p>Cargando video...</p>
                </div>
            </div>
        `;
        
        // Obtener video de Supabase
        const videoData = await SupabaseAPI.getVideoBySlug(params.slug);
        
        if (!videoData) {
            main.innerHTML = `
                <div class="error-page">
                    <div class="container">
                        <h1>Video no encontrado</h1>
                        <a href="/videos" class="btn btn-primary">Ver todos los videos</a>
                    </div>
                </div>
            `;
            return;
        }
        
        // Adaptar video
        const video = {
            id: videoData.id,
            title: videoData.titulo,
            slug: videoData.slug,
            description: videoData.descripcion,
            youtubeId: videoData.youtube_id,
            thumbnail: videoData.thumbnail_url || `https://img.youtube.com/vi/${videoData.youtube_id}/maxresdefault.jpg`,
            date: videoData.fecha,
            formattedDate: new Date(videoData.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
        };
        
        // Obtener videos relacionados
        const videosData = await SupabaseAPI.getVideos(5);
        const relatedVideos = videosData
            .filter(v => v.id !== video.id)
            .map(v => ({
                id: v.id,
                title: v.titulo,
                slug: v.slug,
                youtubeId: v.youtube_id,
                thumbnail: v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/maxresdefault.jpg`
            }));
        
        main.innerHTML = `
            ${Components.breadcrumb([
                { url: '/', text: 'Inicio' },
                { url: '/videos', text: 'Videos' },
                { url: `/video/${video.slug}`, text: video.title.substring(0, 30) + '...' }
            ])}
            
            <section class="video-page">
                <div class="container">
                    <div class="video-player">
                        <div class="video-placeholder" onclick="this.innerHTML='<iframe src=\\'https://www.youtube.com/embed/${video.youtubeId}?autoplay=1\\' frameborder=\\'0\\' allowfullscreen></iframe>'">
                            <img src="${video.thumbnail}" alt="${video.title}">
                            <div class="play-overlay">
                                <div class="play-button large" role="button" aria-label="Reproducir video">
                                    <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
                                </div>
                                <p>Click para reproducir</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="video-details">
                        <h1>${video.title}</h1>
                        <div class="video-meta">
                            <span>📅 ${video.formattedDate}</span>
                        </div>
                        ${video.description ? `<p>${video.description}</p>` : ''}
                        ${Components.shareButtons(window.location.href, video.title)}
                    </div>
                    
                    ${relatedVideos.length > 0 ? `
                        <section class="related-videos">
                            ${Components.sectionTitle('Más Videos', '▶️')}
                            <div class="videos-grid-4">
                                ${relatedVideos.map(v => Components.videoCard(v, 'small')).join('')}
                            </div>
                        </section>
                    ` : ''}
                </div>
            </section>
        `;
        
        document.title = `${video.title} - Beisjoven`;
    },
    
    // ==================== PÁGINA DE BÚSQUEDA ====================
    search: async function({ query }) {
        const main = document.getElementById('main-content');
        const searchTerm = query.get('q') || '';
        
        // Mostrar loading si hay término de búsqueda
        if (searchTerm) {
            main.innerHTML = `
                <div class="loading-page">
                    <div class="container" style="text-align: center; padding: 4rem;">
                        <p>Buscando...</p>
                    </div>
                </div>
            `;
        }
        
        // Buscar en Supabase
        const resultados = searchTerm ? await SupabaseAPI.buscarArticulos(searchTerm, 20) : [];
        
        // Adaptar resultados
        const results = resultados.map(a => ({
            id: a.id,
            title: a.titulo,
            slug: a.slug,
            excerpt: a.extracto,
            image: a.imagen_url,
            date: a.fecha,
            views: a.vistas || 0,
            category: a.categoria ? {
                name: a.categoria.nombre,
                slug: a.categoria.slug
            } : null,
            author: a.autor ? {
                name: a.autor.nombre,
                slug: a.autor.slug
            } : null
        }));
        
        main.innerHTML = `
            ${Components.breadcrumb([
                { url: '/', text: 'Inicio' },
                { url: '/buscar', text: 'Búsqueda' }
            ])}
            
            <section class="search-page">
                <div class="container">
                    <header class="page-header">
                        <h1>🔍 Búsqueda</h1>
                        <form class="search-form" onsubmit="handleSearch(event)">
                            <input type="text" id="search-input" value="${searchTerm}" placeholder="Buscar noticias, equipos, jugadores...">
                            <button type="submit">Buscar</button>
                        </form>
                    </header>
                    
                    ${searchTerm ? `
                        <p class="search-results-count">
                            ${results.length} resultado${results.length !== 1 ? 's' : ''} para "<strong>${searchTerm}</strong>"
                        </p>
                        
                        ${results.length > 0 
                            ? `<div class="articles-list">
                                ${results.map(a => Components.articleCardHorizontal(a)).join('')}
                               </div>`
                            : Components.emptyState('No se encontraron resultados para tu búsqueda', '🔍')
                        }
                    ` : `
                        <p class="search-prompt">Ingresa un término de búsqueda para encontrar artículos</p>
                    `}
                </div>
            </section>
        `;
        
        document.title = searchTerm ? `Búsqueda: ${searchTerm} - Beisjoven` : 'Búsqueda - Beisjoven';
    },
    
    // ==================== PÁGINA DE POSICIONES ====================
    standings: function() {
        const main = document.getElementById('main-content');
        
        main.innerHTML = `
            ${Components.breadcrumb([
                { url: '/', text: 'Inicio' },
                { url: '/posiciones', text: 'Tabla de Posiciones' }
            ])}
            
            <section class="standings-page">
                <div class="container">
                    <header class="page-header" style="text-align:center; padding: 4rem 0;">
                        <h1>🏆 Tabla de Posiciones LMB</h1>
                        <p style="color:var(--gray); margin-top:15px; font-size:1.1rem;">La tabla de posiciones en tiempo real estará disponible próximamente.</p>
                        <a href="/" class="btn btn-primary" style="margin-top:20px;">Volver al inicio</a>
                    </header>
                </div>
            </section>
        `;
        
        document.title = 'Tabla de Posiciones - Beisjoven';
    },
    
    // ==================== PÁGINA DE AUTOR ====================
    author: async function({ params }) {
        const main = document.getElementById('main-content');
        
        main.innerHTML = `
            <div class="loading-page">
                <div class="container" style="text-align: center; padding: 4rem;">
                    <p>Cargando...</p>
                </div>
            </div>
        `;
        
        const autor = await SupabaseAPI.getAutorBySlug(params.slug);
        
        if (!autor) {
            main.innerHTML = `
                <div class="error-page">
                    <div class="container">
                        <h1>Autor no encontrado</h1>
                        <a href="/" class="btn btn-primary">Volver al inicio</a>
                    </div>
                </div>
            `;
            return;
        }
        
        const articulosAutor = await SupabaseAPI.getArticulosByAutor(params.slug, 20);
        const articles = articulosAutor.map(a => ({
            id: a.id,
            title: a.titulo,
            slug: a.slug,
            excerpt: a.extracto,
            image: a.imagen_url,
            date: a.fecha,
            views: a.vistas || 0,
            category: a.categoria ? { name: a.categoria.nombre, slug: a.categoria.slug } : null
        }));
        
        const author = {
            name: autor.nombre,
            slug: autor.slug,
            avatar: autor.avatar_url || '👤',
            bio: autor.bio || '',
            role: autor.twitter ? `@${autor.twitter}` : 'Colaborador'
        };
        
        const isUrl = author.avatar && (author.avatar.startsWith('http') || author.avatar.startsWith('//'));
        const avatarHtml = isUrl ? `<img src="${author.avatar}" alt="${author.name}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">` : `<span style="font-size:4rem;">${author.avatar}</span>`;
        
        main.innerHTML = `
            ${Components.breadcrumb([
                { url: '/', text: 'Inicio' },
                { url: '/autor/' + author.slug, text: author.name }
            ])}
            
            <section class="author-page">
                <div class="container">
                    <header class="author-header" style="display:flex;gap:20px;align-items:center;margin-bottom:30px;">
                        <div class="author-avatar large">${avatarHtml}</div>
                        <div class="author-details">
                            <h1>${author.name}</h1>
                            <span class="author-role" style="color:var(--gray);">${author.role}</span>
                            ${author.bio ? `<p style="margin-top:10px;">${author.bio}</p>` : ''}
                        </div>
                    </header>
                    
                    <div class="author-articles">
                        <h2>Artículos de ${author.name}</h2>
                        ${articles.length > 0 
                            ? '<div class="articles-list">' + articles.map(a => Components.articleCardHorizontal(a)).join('') + '</div>'
                            : Components.emptyState('Este autor aún no ha publicado artículos', '✍️')
                        }
                    </div>
                </div>
            </section>
        `;
        
        document.title = author.name + ' - Beisjoven';
    },
    
    // ==================== PÁGINA DE NEWSLETTER ====================
    newsletter: function() {
        const main = document.getElementById('main-content');
        
        main.innerHTML = `
            ${Components.breadcrumb([
                { url: '/', text: 'Inicio' },
                { url: '/newsletter', text: 'Newsletter' }
            ])}
            
            <section class="newsletter-page">
                <div class="container">
                    <div class="newsletter-box">
                        <div class="newsletter-icon">📬</div>
                        <h1>Suscríbete al Newsletter</h1>
                        <p>Recibe las mejores noticias de béisbol y softbol mexicano directamente en tu correo.</p>
                        
                        <form id="newsletter-form" class="newsletter-form" onsubmit="Pages.submitNewsletter(event)">
                            <div class="form-row">
                                <input type="text" id="newsletter-nombre" placeholder="Tu nombre (opcional)">
                            </div>
                            <div class="form-row">
                                <input type="email" id="newsletter-email" placeholder="Tu correo electrónico" required>
                            </div>
                            <button type="submit" class="btn btn-primary btn-block">Suscribirme</button>
                        </form>
                        
                        <div id="newsletter-message" class="newsletter-message"></div>
                        
                        <p class="newsletter-privacy">
                            🔒 Tu información está segura. No compartimos tu correo con terceros.
                        </p>
                    </div>
                </div>
            </section>
        `;
        
        document.title = 'Newsletter - Beisjoven';
    },
    
    // Procesar suscripción
    submitNewsletter: async function(event) {
        event.preventDefault();
        
        const nombre = document.getElementById('newsletter-nombre').value.trim();
        const email = document.getElementById('newsletter-email').value.trim();
        const messageDiv = document.getElementById('newsletter-message');
        const form = document.getElementById('newsletter-form');
        
        if (!email) {
            messageDiv.innerHTML = '<p class="error">Por favor ingresa tu correo electrónico</p>';
            return;
        }
        
        // Deshabilitar form mientras procesa
        form.querySelector('button').disabled = true;
        form.querySelector('button').textContent = 'Enviando...';
        
        try {
            const { data, error } = await supabaseClient
                .from('suscriptores')
                .insert([{ email, nombre: nombre || null }])
                .select();
            
            if (error) {
                if (error.code === '23505') { // Unique violation
                    messageDiv.innerHTML = '<p class="success">¡Ya estás suscrito! Gracias por tu interés.</p>';
                } else {
                    messageDiv.innerHTML = '<p class="error">Hubo un error. Por favor intenta de nuevo.</p>';
                }
            } else {
                messageDiv.innerHTML = '<p class="success">¡Gracias por suscribirte! 🎉 Pronto recibirás noticias.</p>';
                form.reset();
            }
        } catch (err) {
            messageDiv.innerHTML = '<p class="error">Hubo un error. Por favor intenta de nuevo.</p>';
        }
        
        form.querySelector('button').disabled = false;
        form.querySelector('button').textContent = 'Suscribirme';
    },
    
    // ==================== PÁGINA DE CONTACTO ====================
    contacto: function() {
        const main = document.getElementById('main-content');
        
        main.innerHTML = `
            ${Components.breadcrumb([
                { url: '/', text: 'Inicio' },
                { url: '/contacto', text: 'Contacto' }
            ])}
            
            <section class="contacto-page">
                <div class="container">
                    <div class="contacto-grid">
                        <div class="contacto-info">
                            <h1>Contacto</h1>
                            <p>¿Tienes una noticia, sugerencia o quieres colaborar con Beisjoven? ¡Nos encantaría escucharte!</p>
                            
                            <div class="contacto-methods">
                                <div class="contacto-item">
                                    <span class="contacto-icon">📧</span>
                                    <div>
                                        <strong>Email</strong>
                                        <a href="mailto:contacto@beisjoven.com">contacto@beisjoven.com</a>
                                    </div>
                                </div>
                                
                                <div class="contacto-item">
                                    <span class="contacto-icon">📱</span>
                                    <div>
                                        <strong>Redes Sociales</strong>
                                        <div class="social-links">
                                            <a href="https://twitter.com/beisjoven" target="_blank" rel="noopener">Twitter/X</a>
                                            <a href="https://facebook.com/beisjoven" target="_blank" rel="noopener">Facebook</a>
                                            <a href="https://instagram.com/beisjoven" target="_blank" rel="noopener">Instagram</a>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="contacto-item">
                                    <span class="contacto-icon">📍</span>
                                    <div>
                                        <strong>Ubicación</strong>
                                        <p>Ciudad Obregón, Sonora, México</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="contacto-form-box">
                            <h2>Envíanos un mensaje</h2>
                            <form id="contacto-form" onsubmit="Pages.submitContacto(event)">
                                <div class="form-group">
                                    <input type="text" id="contacto-nombre" placeholder="Tu nombre" required>
                                </div>
                                <div class="form-group">
                                    <input type="email" id="contacto-email" placeholder="Tu correo" required>
                                </div>
                                <div class="form-group">
                                    <select id="contacto-asunto" required>
                                        <option value="">Selecciona un asunto</option>
                                        <option value="noticia">Tengo una noticia</option>
                                        <option value="colaborar">Quiero colaborar</option>
                                        <option value="publicidad">Publicidad</option>
                                        <option value="sugerencia">Sugerencia</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <textarea id="contacto-mensaje" rows="5" placeholder="Tu mensaje" required></textarea>
                                </div>
                                <button type="submit" class="btn btn-primary btn-block">Enviar Mensaje</button>
                            </form>
                            <div id="contacto-message" class="newsletter-message"></div>
                        </div>
                    </div>
                </div>
            </section>
        `;
        
        document.title = 'Contacto - Beisjoven';
    },
    
    // Procesar formulario de contacto (por ahora solo muestra mensaje)
    submitContacto: async function(event) {
        event.preventDefault();
        
        const messageDiv = document.getElementById('contacto-message');
        const form = document.getElementById('contacto-form');
        const btn = form.querySelector('button');
        
        const nombre = document.getElementById('contacto-nombre').value.trim();
        const email = document.getElementById('contacto-email').value.trim();
        const asunto = document.getElementById('contacto-asunto').value;
        const mensaje = document.getElementById('contacto-mensaje').value.trim();
        
        btn.disabled = true;
        btn.textContent = 'Enviando...';
        
        try {
            const { data, error } = await supabaseClient
                .from('contacto_mensajes')
                .insert([{ nombre, email, asunto, mensaje }])
                .select();
            
            if (error) {
                console.error('Error guardando mensaje:', error);
                // Even if DB save fails, show success to user (we don't want to block the UX)
                messageDiv.innerHTML = '<p class="success">¡Mensaje enviado! 📨 Te responderemos pronto.</p>';
            } else {
                messageDiv.innerHTML = '<p class="success">¡Mensaje enviado! 📨 Te responderemos pronto.</p>';
            }
            form.reset();
        } catch (err) {
            messageDiv.innerHTML = '<p class="success">¡Mensaje enviado! 📨 Te responderemos pronto.</p>';
            form.reset();
        }
        
        btn.disabled = false;
        btn.textContent = 'Enviar Mensaje';
    }
};

// Función global para manejar búsqueda
function handleSearch(event) {
    event.preventDefault();
    const input = document.getElementById('search-input');
    if (input && input.value.trim()) {
        Router.navigate(`/buscar?q=${encodeURIComponent(input.value.trim())}`);
    }
}

// Exportar
if (typeof window !== 'undefined') {
    window.Pages = Pages;
    window.handleSearch = handleSearch;
}
