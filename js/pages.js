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
    
    // GA4 SPA page view tracking (skip admin/login)
    const path = window.location.pathname;
    if (typeof gtag === 'function' && !path.startsWith('/admin') && path !== '/login') {
        gtag('event', 'page_view', {
            page_title: meta.title,
            page_location: meta.url
        });
        // Key Events: category_browse
        if (path.startsWith('/categoria/')) {
            gtag('event', 'category_browse', { category: path.split('/')[2] });
        }
        // Key Events: contact_view
        if (path === '/contacto') {
            gtag('event', 'contact_view');
        }
    }
}

// ==================== MARKDOWN / CONTENT RENDERER ====================
// Detecta si el contenido es HTML legacy o markdown nuevo y renderiza apropiadamente.
// - HTML legacy (artículos migrados de Wix): pasa directo pero convierte ![alt](url) → <img>
// - Markdown nuevo (artículos escritos en admin): parsea headings, bold, italic, listas, imágenes
function renderContent(content) {
    if (!content) return '';

    // Detectar si es HTML (contiene etiquetas como <p>, <h2>, <strong>, etc.)
    const isHTML = /<[a-zA-Z][^>]*>/m.test(content);

    if (isHTML) {
        // Contenido HTML legacy: solo procesar imágenes markdown que puedan haberse escrito inline
        return content.replace(
            /!\[([^\]]*)\]\(([^)]+)\)/g,
            (_, alt, url) => `<figure class="article-inline-image"><img src="${url}" alt="${escapeHTML(alt)}" loading="lazy"><figcaption>${escapeHTML(alt)}</figcaption></figure>`
        );
    }

    // Contenido markdown nuevo: parseo completo
    let html = content;

    // 1. Imágenes: ![caption||credito](url) o ![caption](url) → <figure><img></figure>
    html = html.replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        (_, alt, url) => {
            const parts = alt.split('||');
            const caption = parts[0].trim();
            const credito = parts[1] ? parts[1].trim() : '';
            const figcaption = caption || credito
                ? `<figcaption>${caption ? escapeHTML(caption) : ''}${caption && credito ? ' ' : ''}${credito ? `<span class="foto-credito">${escapeHTML(credito)}</span>` : ''}</figcaption>`
                : '';
            return `<figure class="article-inline-image"><img src="${url}" alt="${escapeHTML(caption || alt)}" loading="lazy">${figcaption}</figure>`;
        }
    );

    // 2. Headings: ### H3, ## H2
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');

    // 3. Bold e italic: **bold**, *italic*
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 4. Links: [texto](url)
    html = html.replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );

    // 5. Párrafos: separar bloques por línea en blanco
    // Primero, dividir por doble salto de línea
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        block = block.trim();
        if (!block) return '';
        // No envolver en <p> si ya es un elemento bloque
        if (/^<(h[1-6]|figure|ul|ol|li|blockquote|div)/i.test(block)) return block;
        // Convertir saltos de línea simples dentro del párrafo
        block = block.replace(/\n/g, '<br>');
        return `<p>${block}</p>`;
    }).join('\n');

    return html;
}

// Helper: escape HTML para atributos
function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
        
        // Obtener datos de Supabase — fetch per category for reliable results
        const [
            articulos,
            articulosDestacados,
            masLeidos,
            ligaMexArticles,
            mlbArticles,
            seleccionArticles,
            softbolArticles,
            juvenilArticles,
            videos
        ] = await Promise.all([
            SupabaseAPI.getArticulos(10),
            SupabaseAPI.getArticulosDestacados(3),
            SupabaseAPI.getMasLeidos(5),
            SupabaseAPI.getArticulosByCategoria('liga-mexicana', 4),
            SupabaseAPI.getArticulosByCategoria('mlb', 4),
            SupabaseAPI.getArticulosByCategoria('seleccion', 4),
            SupabaseAPI.getArticulosByCategoria('softbol', 4),
            SupabaseAPI.getArticulosByCategoria('juvenil', 4),
            SupabaseAPI.getVideosDestacados(6)
        ]);
        
        // Si no hay destacados, usar los primeros artículos
        const featuredArticles = articulosDestacados.length > 0 ? articulosDestacados : articulos.slice(0, 3);
        
        // Más leídos (ordenados por vistas)
        const mostRead = masLeidos.length > 0 ? masLeidos : articulos.slice(0, 5);
        
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
        const ligaMex = ligaMexArticles.map(adaptArticle);
        const mlb = mlbArticles.map(adaptArticle);
        const seleccion = seleccionArticles.map(adaptArticle);
        const softbol = softbolArticles.map(adaptArticle);
        const juvenil = juvenilArticles.map(adaptArticle);
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
                    ${Components.sectionTitle('Ligas Mexicanas', '⚾', { url: '/categoria/liga-mexicana', text: 'Ver más' })}
                    <div class="news-grid">
                        ${ligaMex.length > 0 ? ligaMex.map(a => Components.articleCard(a)).join('') : '<p class="empty-message">Próximamente más noticias de las Ligas Mexicanas</p>'}
                    </div>
                </div>
            </section>
            
            <!-- MLB -->
            <section class="news-section alt-bg">
                <div class="container">
                    ${Components.sectionTitle('MLB', '🏆', { url: '/categoria/mlb', text: 'Ver más' })}
                    <div class="featured-grid">
                        ${mlb.length > 0 ? mlb.slice(0, 2).map(a => Components.articleCardHorizontal(a)).join('') : '<p class="empty-message">Próximamente más noticias de MLB</p>'}
                    </div>
                </div>
            </section>
            
            <!-- Softbol -->
            <section class="news-section">
                <div class="container">
                    ${Components.sectionTitle('Softbol', '🥎', { url: '/categoria/softbol', text: 'Ver más' })}
                    <div class="news-grid">
                        ${softbol.length > 0 ? softbol.map(a => Components.articleCard(a)).join('') : '<p class="empty-message">Próximamente más noticias de Softbol</p>'}
                    </div>
                </div>
            </section>
            
            <!-- Selección -->
            <section class="news-section alt-bg">
                <div class="container">
                    <div class="two-column">
                        <div>
                            ${Components.sectionTitle('Selección Mexicana', '🇲🇽', { url: '/categoria/seleccion', text: 'Ver más' })}
                            <div class="featured-grid single-column">
                                ${seleccion.length > 0 ? seleccion.slice(0, 2).map(a => Components.articleCardHorizontal(a)).join('') : '<p class="empty-message">Próximamente noticias de Selección</p>'}
                            </div>
                        </div>
                        <aside>
                            ${teams.length > 0 ? Components.standingsTable(teams) : ''}
                            ${Components.mostReadWidget(popular)}
                        </aside>
                    </div>
                </div>
            </section>
            
            <!-- Juvenil -->
            <section class="news-section">
                <div class="container">
                    ${Components.sectionTitle('Juvenil', '🌟', { url: '/categoria/juvenil', text: 'Ver más' })}
                    <div class="news-grid">
                        ${juvenil.length > 0 ? juvenil.map(a => Components.articleCard(a)).join('') : '<p class="empty-message">Próximamente más noticias juveniles</p>'}
                    </div>
                </div>
            </section>
            
            <!-- Videos -->
            <section class="news-section videos-section">
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
        
        document.title = 'Beisjoven - Revista de Béisbol y Softbol de México';
        updateMetaTags();
    },
    
    // ==================== PÁGINA DE CATEGORÍA ====================
    // Configuración de identidad visual por categoría
    _categoryConfig: {
        'mlb': {
            tagline: 'Mexicanos en las Grandes Ligas y el escenario mundial',
            accent: '#1a5276',
            image: null
        },
        'liga-mexicana': {
            tagline: 'LMB · LMP · Serie del Caribe · Todo el circuito mexicano',
            accent: '#c41e3a',
            image: null
        },
        'softbol': {
            tagline: 'Femenil, varonil y juvenil — el softbol tiene casa aquí',
            accent: '#b7950b',
            image: null
        },
        'seleccion': {
            tagline: 'Cuando México se pone el uniforme',
            accent: '#006847',
            image: null
        },
        'juvenil': {
            tagline: 'Del diamante local al colegial — el camino empieza aquí',
            accent: '#d35400',
            image: null
        },
        'opinion': {
            tagline: 'Análisis, contexto y las historias detrás del juego',
            accent: '#566573',
            image: null
        }
    },

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
        
        const PAGE_SIZE = 20;
        var catPage = 0;
        var catSlug = params.slug;

        const [articulosCategoria, articulosPopulares, totalArticulos] = await Promise.all([
            SupabaseAPI.getArticulosByCategoriaPaginados(params.slug, PAGE_SIZE, 0),
            SupabaseAPI.getMasLeidos(5),
            SupabaseAPI.contarArticulosByCategoria(params.slug)
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

        // Config de identidad visual
        const catConfig = Pages._categoryConfig[params.slug] || {
            tagline: '',
            accent: '#c41e3a',
            image: null
        };

        // Construir estilo del hero header
        const heroStyle = catConfig.image
            ? `background-image: linear-gradient(rgba(27,42,74,0.78), rgba(27,42,74,0.78)), url('${catConfig.image}'); background-size: cover; background-position: center;`
            : `background: linear-gradient(135deg, #1B2A4A 0%, ${catConfig.accent} 100%);`;

        main.innerHTML = `
            <section class="category-page">
                <header class="category-hero" style="${heroStyle}">
                    <div class="category-hero-inner">
                        <h1 class="category-hero-title">${categoria.nombre}</h1>
                        ${catConfig.tagline ? `<p class="category-hero-tagline">${catConfig.tagline}</p>` : ''}
                        <div class="category-hero-accent" style="background:${catConfig.accent};"></div>
                    </div>
                </header>

                <div class="container" style="padding-top:2.5rem;padding-bottom:2.5rem;">
                    <div class="two-column">
                        <div>
                            <div class="articles-list" id="category-articles-list">
                                ${articles.length > 0
                                    ? articles.map(a => Components.articleCardHorizontal(a)).join('')
                                    : Components.emptyState('No hay artículos en esta categoría', '📭')
                                }
                            </div>
                            <div id="category-pagination"></div>
                        </div>
                        <aside>
                            ${Components.mostReadWidget(mostRead)}
                        </aside>
                    </div>
                </div>
            </section>
        `;

        // Inyectar estilos del hero si no existen
        if (!document.getElementById('category-hero-styles')) {
            var s = document.createElement('style');
            s.id = 'category-hero-styles';
            s.textContent = `
                .category-hero {
                    width: 100%;
                    padding: 5rem 1.5rem 4rem;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }
                .category-hero-inner {
                    position: relative;
                    z-index: 1;
                    max-width: 700px;
                    margin: 0 auto;
                }
                .category-hero-title {
                    font-size: 2.8rem;
                    font-weight: 800;
                    color: #fff;
                    margin: 0 0 0.5rem;
                    letter-spacing: -0.5px;
                    text-transform: uppercase;
                }
                .category-hero-tagline {
                    font-size: 1rem;
                    color: rgba(255,255,255,0.82);
                    margin: 0 0 1.2rem;
                    font-weight: 400;
                    line-height: 1.5;
                }
                .category-hero-accent {
                    width: 48px;
                    height: 4px;
                    border-radius: 2px;
                    margin: 0 auto;
                }
                .category-pagination {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.4rem;
                    padding: 2rem 0 1rem;
                    flex-wrap: wrap;
                }
                .cat-page-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 38px;
                    height: 38px;
                    padding: 0 0.6rem;
                    border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.15);
                    background: transparent;
                    color: inherit;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: background 0.15s, color 0.15s;
                }
                .cat-page-btn:hover:not(:disabled) {
                    background: rgba(255,255,255,0.1);
                }
                .cat-page-btn.active {
                    background: #c41e3a;
                    border-color: #c41e3a;
                    color: #fff;
                    font-weight: 700;
                }
                .cat-page-btn:disabled {
                    opacity: 0.3;
                    cursor: default;
                }
                @media (max-width: 600px) {
                    .category-hero-title { font-size: 2rem; }
                    .category-hero-tagline { font-size: 0.9rem; }
                }
            `;
            document.head.appendChild(s);
        }
        
        document.title = `${categoria.nombre} - Beisjoven`;
        updateMetaTags({
            title: `${categoria.nombre} - Beisjoven`,
            description: `Noticias y artículos de ${categoria.nombre} en Beisjoven.`,
            url: `https://beisjoven.com/categoria/${categoria.slug}`
        });

        // Paginación numerada
        var catTotal = totalArticulos;
        var totalPages = Math.ceil(catTotal / PAGE_SIZE);

        function renderPagination(currentPage) {
            var paginationEl = document.getElementById('category-pagination');
            if (!paginationEl || totalPages <= 1) return;

            var html = '<div class="category-pagination">';

            // Flecha izquierda
            html += '<button class="cat-page-btn" id="cat-prev"' + (currentPage === 0 ? ' disabled' : '') + '>&#8592;</button>';

            // Números de página — mostrar máximo 5 números centrados en la página actual
            var start = Math.max(0, currentPage - 2);
            var end = Math.min(totalPages - 1, currentPage + 2);
            // Ajustar ventana para siempre mostrar 5 si hay suficientes páginas
            if (end - start < 4) {
                if (start === 0) end = Math.min(totalPages - 1, 4);
                else start = Math.max(0, end - 4);
            }

            if (start > 0) {
                html += '<button class="cat-page-btn" data-page="0">1</button>';
                if (start > 1) html += '<span style="padding:0 0.2rem;opacity:0.4;">…</span>';
            }

            for (var i = start; i <= end; i++) {
                html += '<button class="cat-page-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + (i + 1) + '</button>';
            }

            if (end < totalPages - 1) {
                if (end < totalPages - 2) html += '<span style="padding:0 0.2rem;opacity:0.4;">…</span>';
                html += '<button class="cat-page-btn" data-page="' + (totalPages - 1) + '">' + totalPages + '</button>';
            }

            // Flecha derecha
            html += '<button class="cat-page-btn" id="cat-next"' + (currentPage >= totalPages - 1 ? ' disabled' : '') + '>&#8594;</button>';

            html += '</div>';
            paginationEl.innerHTML = html;

            // Event listeners
            var prevBtn = document.getElementById('cat-prev');
            var nextBtn = document.getElementById('cat-next');
            if (prevBtn) prevBtn.addEventListener('click', function() { goToPage(currentPage - 1); });
            if (nextBtn) nextBtn.addEventListener('click', function() { goToPage(currentPage + 1); });

            paginationEl.querySelectorAll('.cat-page-btn[data-page]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    goToPage(parseInt(this.getAttribute('data-page')));
                });
            });
        }

        async function goToPage(page) {
            if (page < 0 || page >= totalPages) return;
            catPage = page;
            var offset = page * PAGE_SIZE;

            var listEl = document.getElementById('category-articles-list');
            if (listEl) {
                listEl.innerHTML = '<p style="padding:2rem;text-align:center;opacity:0.5;">Cargando...</p>';
            }

            var newData = await SupabaseAPI.getArticulosByCategoriaPaginados(catSlug, PAGE_SIZE, offset);
            var newArticles = newData.map(adaptArticle);

            if (listEl) {
                listEl.innerHTML = newArticles.length > 0
                    ? newArticles.map(function(a) { return Components.articleCardHorizontal(a); }).join('')
                    : Components.emptyState('No hay artículos en esta página', '📭');
            }

            renderPagination(catPage);

            // Scroll al inicio de la lista
            var hero = document.querySelector('.category-hero');
            if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        renderPagination(catPage);
    },
    
    // ==================== PÁGINA DE ARTÍCULO ====================
    // WBC sponsor helpers — activados. Contrato CI firmado.
    
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
        
        // Incrementar vistas (fire-and-forget, no bloquea la carga)
        SupabaseAPI.incrementVistas(articulo.id);
        
        // Obtener artículos relacionados (misma categoría)
        const articulosRelacionados = articulo.categoria 
            ? await SupabaseAPI.getArticulosByCategoria(articulo.categoria.slug, 7)
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
            } : { name: 'Redacción', slug: 'redaccion' },
            esWbc2026: !!articulo.es_wbc2026,
            pieDeFoto: articulo.pie_de_foto || '',
            fotoCredito: articulo.foto_credito || ''
        };
        
        // Adaptar relacionados (excluyendo el actual)
        const relatedArticles = articulosRelacionados
            .filter(a => a.id !== articulo.id)
            .slice(0, 5)
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
        const articulosPopulares = await SupabaseAPI.getMasLeidos(5);
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
                            </div>
                        </div>
                    </header>
                    
                    <figure class="article-image">
                        <img src="${article.image}" alt="${article.title}">
                        ${article.pieDeFoto || article.fotoCredito ? `
                        <figcaption class="article-image-caption">
                            ${article.pieDeFoto ? `<span class="foto-pie">${escapeHTML(article.pieDeFoto)}</span>` : ''}
                            ${article.fotoCredito ? `<span class="foto-credito">${escapeHTML(article.fotoCredito)}</span>` : ''}
                        </figcaption>` : ''}
                    </figure>

                    ${article.esWbc2026 ? `
                    <a href="https://www.cajainmaculada.com.mx/" target="_blank" rel="noopener sponsored" class="wbc-article-badge-ci">
                        <span class="wbc-article-badge-text">Presentado por</span>
                        <img src="https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/public/imagenes/ci-logo-horizontal.png"
                             alt="Caja Inmaculada" class="wbc-article-badge-logo"
                             onerror="this.parentElement.style.display='none'">
                    </a>` : ''}
                    
                    <div class="article-body">
                        <div class="article-content">
                            ${renderContent(article.content)}
                            
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
                        <div class="next-article-card">
                            <a href="/articulo/${relatedArticles[0].slug}" class="next-article-link">
                                <div class="next-article-label">Sigue leyendo ➜</div>
                                <div class="next-article-content">
                                    <img src="${relatedArticles[0].image}" alt="${relatedArticles[0].title}" loading="lazy">
                                    <div class="next-article-text">
                                        ${relatedArticles[0].category ? `<span class="category">${relatedArticles[0].category.name}</span>` : ''}
                                        <h3>${relatedArticles[0].title}</h3>
                                    </div>
                                </div>
                            </a>
                        </div>
                    ` : ''}
                    
                    ${relatedArticles.length > 1 ? `
                        <section class="related-articles">
                            ${Components.sectionTitle('Artículos Relacionados', '📰')}
                            <div class="news-grid">
                                ${relatedArticles.slice(1).map(a => Components.articleCard(a)).join('')}
                            </div>
                        </section>
                    ` : ''}
                </div>
            </article>
        `;
        
        // Inyectar estilos del badge CI si es artículo WBC y no están cargados
        if (article.esWbc2026 && !document.getElementById('bj-wbc-badge-styles')) {
            const badgeStyle = document.createElement('style');
            badgeStyle.id = 'bj-wbc-badge-styles';
            badgeStyle.textContent = `
.wbc-article-badge-ci {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    background: #F8F9FC; border-top: 3px solid #e83646;
    border-radius: 8px; padding: 16px 24px;
    margin: 16px 0; text-decoration: none; transition: background 0.2s;
}
.wbc-article-badge-ci:hover { background: #EEF0F5; }
.wbc-article-badge-text {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px; font-weight: 600; color: #1b3557;
    text-transform: uppercase; letter-spacing: 1px;
}
.wbc-article-badge-logo { height: 30px; width: auto; }
@media (max-width: 600px) {
    .wbc-article-badge-ci { padding: 14px 20px; }
    .wbc-article-badge-logo { height: 26px; }
}
@media (max-width: 360px) {
    .wbc-article-badge-ci { flex-direction: column; gap: 8px; }
}
@media (prefers-color-scheme: dark) {
    .wbc-article-badge-ci { background: #F0F1F5; }
}
`;
            document.head.appendChild(badgeStyle);
        }
        
        document.title = `${article.title} - Beisjoven`;
        updateMetaTags({
            title: `${article.title} - Beisjoven`,
            description: article.excerpt,
            image: article.image,
            url: `https://beisjoven.com/articulo/${article.slug}`,
            type: 'article'
        });

        // Inject JSON-LD NewsArticle structured data (Ticket 11)
        (function() {
            // Remove previous article JSON-LD if navigating between articles
            var prev = document.getElementById('bj-article-jsonld');
            if (prev) prev.remove();

            var jsonLd = {
                "@context": "https://schema.org",
                "@type": "NewsArticle",
                "headline": article.title,
                "description": article.excerpt || '',
                "image": article.image ? [article.image] : [],
                "datePublished": articulo.fecha || articulo.created_at,
                "dateModified": articulo.updated_at || articulo.fecha || articulo.created_at,
                "author": {
                    "@type": "Person",
                    "name": article.author.name,
                    "url": "https://beisjoven.com/autor/" + article.author.slug
                },
                "publisher": {
                    "@type": "Organization",
                    "name": "Beisjoven",
                    "logo": {
                        "@type": "ImageObject",
                        "url": "https://beisjoven.com/brand/logo-lockup.png"
                    }
                },
                "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": "https://beisjoven.com/articulo/" + article.slug
                },
                "url": "https://beisjoven.com/articulo/" + article.slug,
                "articleSection": article.category.name,
                "inLanguage": "es-MX"
            };

            var script = document.createElement('script');
            script.type = 'application/ld+json';
            script.id = 'bj-article-jsonld';
            script.textContent = JSON.stringify(jsonLd);
            document.head.appendChild(script);
        })();
        
        // Cargar metadatos de imagen principal (pie de foto + crédito)
        (async function() {
            try {
                const imageUrl = article.image;
                if (!imageUrl) return;
                const nombre = imageUrl.split('/').pop().split('?')[0];
                const { data: meta } = await supabaseClient
                    .from('imagenes_metadata')
                    .select('pie_de_foto, credito')
                    .eq('nombre', nombre)
                    .maybeSingle();
                
                const creditDiv = document.getElementById('article-image-credit');
                if (!creditDiv) return;
                
                const pieDeFoto = meta?.pie_de_foto || '';
                const credito = meta?.credito || '';
                
                if (pieDeFoto || credito) {
                    creditDiv.innerHTML = `
                        <figcaption class="article-image-caption">
                            ${pieDeFoto ? `<span class="foto-pie">${pieDeFoto}</span>` : ''}
                            ${credito ? `<span class="foto-credito">${credito}</span>` : ''}
                        </figcaption>
                    `;
                }
            } catch(e) {}
        })();

        // GA4 Key Events: scroll-based article read tracking
        if (typeof gtag === 'function') {
            // Clean up previous listener if any
            if (window._bjScrollHandler) {
                window.removeEventListener('scroll', window._bjScrollHandler);
            }
            const firedEvents = { read50: false, readComplete: false };
            window._bjScrollHandler = function() {
                const articleEl = document.querySelector('.article-content');
                if (!articleEl) return;
                const rect = articleEl.getBoundingClientRect();
                const articleTop = rect.top + window.scrollY;
                const articleHeight = articleEl.offsetHeight;
                const scrollPos = window.scrollY + window.innerHeight;
                const progress = (scrollPos - articleTop) / articleHeight;
                if (progress >= 0.5 && !firedEvents.read50) {
                    firedEvents.read50 = true;
                    gtag('event', 'article_read_50', {
                        article_slug: article.slug,
                        article_category: article.category.slug
                    });
                }
                if (progress >= 0.9 && !firedEvents.readComplete) {
                    firedEvents.readComplete = true;
                    gtag('event', 'article_read_complete', {
                        article_slug: article.slug,
                        article_category: article.category.slug
                    });
                    window.removeEventListener('scroll', window._bjScrollHandler);
                }
            };
            window.addEventListener('scroll', window._bjScrollHandler, { passive: true });
        }
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
                        <h1>📹 Videos</h1>
                        <p>Los mejores videos de beisbol y softbol mexicano</p>
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
                            <div class="vid-grid-related">
                                ${relatedVideos.map(v => Components.videoCard(v)).join('')}
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
    // ==================== HUB WBC 2026 ====================
    // ==================== HUB WBC 2026 ====================
    wbc2026: async function() {
        const main = document.getElementById('main-content');
        main.innerHTML = '<div class="loader"><div class="loader-spinner"></div><p>Cargando...</p></div>';

        // ── CSS inyectado para evitar desync de cache ─────────────────
        if (!document.getElementById('bj-wbc-hub-styles')) {
            const style = document.createElement('style');
            style.id = 'bj-wbc-hub-styles';
            style.textContent = `
/* ================================================================
   WBC 2026 HUB — Beisjoven Media  (v2 — una columna, mobile-first)
   Paleta: Navy #0f2044 / Rojo #c4122e / Verde México #006847
   ================================================================ */

.wbc-hub {
    --wbc-navy:   #0f2044;
    --wbc-navy2:  #1a3a6b;
    --wbc-red:    #c4122e;
    --wbc-gold:   #f0a500;
    --wbc-white:  #ffffff;
    --wbc-light:  #f4f6f9;
    --wbc-text:   #1a1a2e;
    --wbc-muted:  #6b7280;
    --mex-green:  #006847;
    --mex-red:    #ce1126;
    background: var(--wbc-light);
    min-height: 100vh;
}

/* Franja tricolor */
.wbc-tricolor { display: flex; height: 5px; width: 100%; }
.wbc-tricolor-verde  { flex:1; background: var(--mex-green); }
.wbc-tricolor-blanco { flex:1; background: #fff; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
.wbc-tricolor-rojo   { flex:1; background: var(--mex-red); }

/* Hero — rediseño Marketing 03-mar-2026 */
.wbc-hero-banner {
    position: relative;
    background: linear-gradient(180deg, #0D1B2A 0%, #1B2A4A 40%, #1B2A4A 70%, #0D1B2A 100%);
    padding: 48px 20px 16px;
    text-align: center;
    overflow: hidden;
}
.wbc-hero-banner::before {
    content: '';
    position: absolute;
    top: -50%; left: 50%;
    transform: translateX(-50%);
    width: 120%; height: 100%;
    background: radial-gradient(ellipse at center, rgba(212,168,67,0.06) 0%, transparent 70%);
    pointer-events: none;
}
.wbc-hero-banner::after {
    content: '';
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 0;
    background: none;
}
.wbc-hero-img {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover; opacity: 0.18; filter: saturate(0.5);
}
.wbc-hero-overlay {
    position: relative; z-index: 2;
    display: flex; flex-direction: column;
    align-items: center; text-align: center;
}
.wbc-hero-overlay .container {
    display: flex; flex-direction: column;
    align-items: center; text-align: center; gap: 0;
}
.wbc-hero-badge {
    display: inline-block;
    background: linear-gradient(135deg, #003C37 0%, #004D40 100%);
    color: #FFFFFF;
    font-family: system-ui, -apple-system, 'Oswald', sans-serif;
    font-weight: 800;
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 8px 20px;
    border-radius: 4px;
    border-left: 3px solid #FFC107;
    margin-bottom: 16px;
}
.wbc-hero-pre-title {
    font-family: system-ui, -apple-system, 'Open Sans', sans-serif;
    font-size: 28px;
    font-weight: 300;
    color: #FFFFFF;
    margin: 0;
    letter-spacing: 1px;
}
.wbc-hero-title {
    font-family: system-ui, -apple-system, 'Oswald', sans-serif;
    font-size: 72px;
    font-weight: 900;
    color: #D4A843;
    margin: 0;
    line-height: 1;
    letter-spacing: -1px;
    text-shadow: 0 2px 20px rgba(212, 168, 67, 0.3);
}
.wbc-hero-title span { color: #D4A843; }
.wbc-hero-subtitle {
    font-family: system-ui, -apple-system, 'Open Sans', sans-serif;
    font-size: 16px;
    font-weight: 400;
    color: #A0ACC3;
    margin: 16px 0 0;
    letter-spacing: 0.5px;
}
.wbc-hero-hashtag {
    font-family: system-ui, -apple-system, 'Oswald', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #D4A843;
    margin-top: 12px;
    letter-spacing: 2px;
}

/* ── Panel de admin (solo autenticado) ──────────────────── */
.wbc-admin-panel {
    background: #1e293b;
    border-bottom: 3px solid var(--wbc-gold);
}
.wbc-admin-panel .container { max-width: 720px; margin: 0 auto; padding: 0 16px; }
.wbc-admin-toggle {
    width: 100%; background: none; border: none; color: var(--wbc-gold);
    font-family: 'Oswald', sans-serif; font-size: 0.9rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 1px;
    padding: 12px 0; cursor: pointer; text-align: left; display: flex;
    align-items: center; gap: 8px;
}
.wbc-admin-toggle span { margin-left: auto; }
.wbc-admin-body { display: none; padding-bottom: 20px; }
.wbc-admin-body.open { display: block; }
.wbc-admin-section {
    background: rgba(255,255,255,0.05);
    border-radius: 8px; padding: 16px; margin-bottom: 12px;
}
.wbc-admin-section h4 {
    color: #94a3b8; font-family: 'Oswald', sans-serif;
    font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;
    margin: 0 0 12px;
}
.wbc-admin-input {
    width: 100%; box-sizing: border-box;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
    color: #fff; border-radius: 6px; padding: 10px 12px;
    font-size: 0.9rem; font-family: 'Open Sans', sans-serif;
    margin-bottom: 8px;
}
.wbc-admin-input::placeholder { color: rgba(255,255,255,0.35); }
.wbc-admin-btn {
    background: var(--wbc-gold); color: var(--wbc-navy);
    border: none; border-radius: 6px; padding: 10px 20px;
    font-family: 'Oswald', sans-serif; font-size: 0.9rem;
    font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    cursor: pointer; width: 100%;
}
.wbc-admin-btn:disabled { opacity: 0.5; cursor: default; }
.wbc-admin-status {
    font-size: 0.8rem; color: #4ade80; margin-top: 8px;
    min-height: 1.2em; font-family: 'Open Sans', sans-serif;
}
.wbc-admin-status.error { color: #f87171; }

/* Galeria admin: thumb list */
.wbc-admin-gallery-list {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 6px; margin-top: 12px;
}
.wbc-admin-gallery-item { position: relative; }
.wbc-admin-gallery-item img {
    width: 100%; aspect-ratio: 4/3; object-fit: cover;
    border-radius: 4px;
}
.wbc-admin-gallery-delete {
    position: absolute; top: 4px; right: 4px;
    background: rgba(0,0,0,0.7); color: #fff;
    border: none; border-radius: 50%; width: 22px; height: 22px;
    font-size: 12px; cursor: pointer; display: flex;
    align-items: center; justify-content: center; line-height: 1;
}

/* Posiciones editor */
.wbc-posiciones-editor-table { width: 100%; border-collapse: collapse; }
.wbc-posiciones-editor-table th {
    color: #94a3b8; font-size: 0.72rem; text-transform: uppercase;
    letter-spacing: 0.5px; padding: 4px 6px; text-align: center;
    font-family: 'Open Sans', sans-serif; font-weight: 600;
}
.wbc-posiciones-editor-table th:first-child { text-align: left; }
.wbc-posiciones-editor-table td { padding: 4px 4px; }
.wbc-posiciones-editor-table td:first-child { color: #e2e8f0; font-size: 0.85rem; font-family: 'Oswald', sans-serif; }
.wbc-pos-input {
    width: 44px; text-align: center; box-sizing: border-box;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
    color: #fff; border-radius: 4px; padding: 6px 4px;
    font-size: 0.9rem; font-family: 'Open Sans', sans-serif;
}

/* ── Contenido principal — una columna ─────────────────── */
.wbc-content {
    max-width: 900px; margin: 0 auto;
    padding: 24px 16px 48px;
}

/* ── Dashboard: calendario + posiciones lado a lado ──── */
.wbc-dashboard {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 24px;
}
.wbc-dashboard .wbc-card { margin-bottom: 0; }

/* ── Featured article card ─────────────────────────────── */
.wbc-featured {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 24px;
    height: 360px;
    display: block;
    text-decoration: none;
    transition: transform 0.2s;
}
.wbc-featured:hover { transform: scale(1.005); }
.wbc-featured img {
    width: 100%; height: 100%; object-fit: cover; object-position: center 20%; display: block;
}
.wbc-featured .wbc-featured-overlay {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: linear-gradient(transparent, rgba(0,0,0,0.9));
    padding: 32px 24px 24px; color: #fff;
}
.wbc-featured .wbc-featured-cat {
    background: #e83646; color: #fff; padding: 4px 12px;
    font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
    border-radius: 4px; display: inline-block; margin-bottom: 10px;
}
.wbc-featured .wbc-featured-title {
    font-family: 'Oswald', sans-serif; font-size: 1.8rem;
    font-weight: 700; line-height: 1.2; margin: 0 0 8px; color: #fff;
}
.wbc-featured:hover .wbc-featured-title { color: #D4A843; }
.wbc-featured .wbc-featured-excerpt {
    font-size: 0.9rem; opacity: 0.85; line-height: 1.4;
    max-width: 600px; margin: 0;
}

/* Tarjetas genéricas */
.wbc-card {
    background: var(--wbc-white);
    border-radius: 12px;
    box-shadow: 0 1px 8px rgba(0,0,0,0.07);
    margin-bottom: 24px;
    overflow: hidden;
}
.wbc-card-header {
    background: var(--wbc-navy);
    padding: 12px 18px;
    display: flex; align-items: center; gap: 10px;
}
.wbc-card-header h2 {
    font-family: 'Oswald', sans-serif; font-size: 1rem;
    font-weight: 600; color: var(--wbc-white); margin: 0;
    letter-spacing: 0.5px; text-transform: uppercase;
}
.wbc-card-icon { font-size: 1.1rem; }
.wbc-card-body { padding: 16px; }

/* ── Calendario ────────────────────────────────────────── */
.wbc-game-list { display: flex; flex-direction: column; }
.wbc-game-item {
    display: grid; grid-template-columns: 1fr auto;
    align-items: center; gap: 0 16px;
    padding: 16px 0; border-bottom: 1px solid #f3f4f6;
}
.wbc-game-item:last-child { border-bottom: none; }
.wbc-game-matchup {
    font-family: 'Oswald', sans-serif; font-size: 1rem;
    font-weight: 600; color: var(--wbc-text); line-height: 1.2; display: block;
}
.wbc-cal-mexico { color: #D4A843; }
.wbc-cal-record { font-size: 0.72em; opacity: 0.6; font-weight: 400; }
.wbc-game-cuarto-label {
    font-size: 0.7rem; color: var(--wbc-muted); display: block; margin-top: 2px;
    text-transform: uppercase; letter-spacing: 0.5px;
}
.wbc-game-right {
    text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
}
.wbc-game-hora {
    font-size: 0.78rem; color: var(--wbc-muted); display: block;
}
.wbc-game-tv {
    display: flex; align-items: center; gap: 5px;
    flex-wrap: wrap; justify-content: flex-end;
}
.wbc-game-resultado-inline {
    font-family: 'Oswald', sans-serif; font-size: 1.1rem;
    font-weight: 700; display: block;
}
.wbc-game-resultado-inline.ganado { color: var(--wbc-navy); }
.wbc-game-resultado-inline.perdido { color: var(--wbc-navy); }
.wbc-game-final-label {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 0.65rem; font-weight: 700; color: var(--wbc-muted);
    text-transform: uppercase; letter-spacing: 1px; display: block;
}
.wbc-game-played .wbc-game-matchup { color: var(--wbc-text); }

/* ── Slider tabs ──────────────────────────────────────── */
.wbc-cal-tabs-wrap {
    display: flex; align-items: center; gap: 4px;
    margin-bottom: 4px;
}
.wbc-cal-tabs {
    display: flex; gap: 4px; overflow-x: auto;
    -webkit-overflow-scrolling: touch; scrollbar-width: none;
    flex: 1; padding: 4px 0;
}
.wbc-cal-tabs::-webkit-scrollbar { display: none; }
.wbc-cal-tab {
    flex: 0 0 auto; background: none; border: 1px solid #e5e7eb;
    border-radius: 8px; padding: 8px 12px; cursor: pointer;
    text-align: center; transition: all 0.2s; min-width: 48px;
}
.wbc-cal-tab:hover { background: #f3f4f6; }
.wbc-cal-tab.active {
    background: var(--wbc-navy); border-color: var(--wbc-navy); color: white;
}
.wbc-cal-tab.active .wbc-cal-tab-day { color: white; }
.wbc-cal-tab.active .wbc-cal-tab-label { color: rgba(255,255,255,0.7); }
.wbc-cal-tab-mex { border-color: #D4A843; }
.wbc-cal-tab-mex.active { border-color: #D4A843; }
.wbc-cal-tab-day {
    font-family: 'Oswald', sans-serif; font-size: 1rem;
    font-weight: 700; color: var(--wbc-navy); display: block; line-height: 1.1;
}
.wbc-cal-tab-label {
    font-size: 0.6rem; color: var(--wbc-muted); text-transform: uppercase;
    letter-spacing: 0.3px; display: block;
}
.wbc-cal-arrow {
    background: none; border: 1px solid #e5e7eb; border-radius: 6px;
    width: 28px; height: 28px; font-size: 1.1rem; cursor: pointer;
    color: var(--wbc-navy); display: flex; align-items: center;
    justify-content: center; flex-shrink: 0;
}
.wbc-cal-arrow:disabled { opacity: 0.3; cursor: default; }
.wbc-cal-arrow:hover:not(:disabled) { background: #f3f4f6; }
.wbc-cal-day-header {
    font-family: 'Oswald', sans-serif; font-size: 0.85rem;
    font-weight: 600; color: var(--wbc-muted); text-transform: uppercase;
    letter-spacing: 1px; padding: 8px 0 4px; border-bottom: 2px solid #e5e7eb;
}
.wbc-tv-badge {
    display: inline-block; background: var(--wbc-navy); color: white;
    font-size: 0.68rem; font-weight: 700; padding: 3px 7px;
    border-radius: 4px; font-family: 'Oswald', sans-serif; letter-spacing: 0.3px;
}
.tv-fox   { background: #000; }
.tv-fs1   { background: #003087; }
.tv-tubi  { background: #fa4b18; }
.tv-tbd   { background: #6b7280; }
.tv-foxd  { background: #c41e3a; }
.tv-app   { background: #6B7280; }
.wbc-calendar-note {
    font-size: 0.7rem; color: var(--wbc-muted); margin: 12px 0 0;
    padding-top: 10px; border-top: 1px solid #f3f4f6; line-height: 1.5;
}

/* ── Posiciones ────────────────────────────────────────── */
.wbc-standings-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.wbc-standings-table th {
    font-family: 'Open Sans', sans-serif; font-weight: 600;
    padding: 8px 10px; border-bottom: 2px solid #e5e7eb;
    text-align: center; color: #6b7280;
    font-size: 0.73rem; text-transform: uppercase; letter-spacing: 0.5px;
}
.wbc-standings-table th:first-child { text-align: left; }
.wbc-standings-table td { padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: center; }
.wbc-standings-table td:first-child { text-align: left; font-weight: 600; color: var(--wbc-navy); }
.wbc-standings-row-mexico { background: rgba(206,17,38,0.04); }
.wbc-standings-row-mexico td:first-child { color: var(--wbc-red); }
.wbc-standings-table tr:last-child td { border-bottom: none; }
.wbc-standings-note { font-size: 0.7rem; color: var(--wbc-muted); margin: 10px 0 0; }

/* ── Artículos ─────────────────────────────────────────── */
.wbc-articles-header {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 20px; padding-bottom: 12px;
    border-bottom: 3px solid var(--wbc-red);
}
.wbc-articles-title {
    font-family: 'Oswald', sans-serif; font-size: 1.4rem;
    font-weight: 700; color: var(--wbc-navy); margin: 0;
    text-transform: uppercase; letter-spacing: 0.5px;
}
.wbc-article-count {
    font-size: 0.82rem; color: var(--wbc-muted);
    font-family: 'Open Sans', sans-serif;
}
.wbc-articles-ci {
    margin-left: auto;
    display: flex;
    align-items: center;
}
.wbc-articles-ci-logo {
    height: 22px;
    width: auto;
    opacity: 0.6;
    transition: opacity 0.2s;
}
.wbc-articles-ci:hover .wbc-articles-ci-logo { opacity: 1; }
.wbc-empty-state {
    text-align: center; padding: 48px 24px;
    background: var(--wbc-white); border-radius: 12px;
    box-shadow: 0 1px 8px rgba(0,0,0,0.06); margin-bottom: 24px;
}
.wbc-empty-icon { font-size: 2.5rem; display: block; margin-bottom: 12px; }
.wbc-empty-state h3 {
    font-family: 'Oswald', sans-serif; font-size: 1.2rem;
    color: var(--wbc-navy); margin: 0 0 8px;
}
.wbc-empty-state p { color: var(--wbc-muted); font-size: 0.88rem; margin: 0; line-height: 1.6; }

/* ── Galería ────────────────────────────────────────────── */
.wbc-gallery-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
.wbc-gallery-item { position: relative; }
.wbc-gallery-item img {
    width: 100%; aspect-ratio: 4/3; object-fit: cover;
    object-position: center top; border-radius: 6px; display: block;
}
.wbc-gallery-caption {
    font-size: 0.7rem; color: var(--wbc-muted);
    margin-top: 4px; line-height: 1.3;
}
.wbc-gallery-empty {
    font-size: 0.88rem; color: var(--wbc-muted);
    padding: 24px 0; text-align: center;
}
.wbc-gallery-hint {
    font-size: 0.72rem; color: var(--wbc-muted);
    text-align: center; margin-top: 10px; opacity: 0.7;
}
.wbc-gallery-more {
    display: block; margin: 12px auto 0; padding: 8px 24px;
    background: transparent; color: var(--wbc-muted);
    border: 1px solid var(--wbc-muted); border-radius: 20px;
    font-size: 0.78rem; cursor: pointer; transition: all 0.2s;
}
.wbc-gallery-more:hover {
    color: #D4A843; border-color: #D4A843;
}
.wbc-gallery-item img { cursor: pointer; transition: opacity 0.2s; }
.wbc-gallery-item img:hover { opacity: 0.85; }

/* ── Lightbox ─────────────────────────────────────────── */
.wbc-lightbox {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.92); display: flex;
    align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.25s ease;
    pointer-events: none;
}
.wbc-lightbox.active { opacity: 1; pointer-events: auto; }
.wbc-lightbox img {
    max-width: 92vw; max-height: 85vh; object-fit: contain;
    border-radius: 6px; user-select: none;
}
.wbc-lightbox-caption {
    position: absolute; bottom: 16px; left: 50%;
    transform: translateX(-50%); color: #e2e8f0;
    font-size: 0.82rem; text-align: center;
    max-width: 80vw; line-height: 1.4;
    text-shadow: 0 1px 4px rgba(0,0,0,0.7);
}
.wbc-lightbox-close {
    position: absolute; top: 16px; right: 20px;
    color: #fff; font-size: 2rem; cursor: pointer;
    background: none; border: none; line-height: 1;
    z-index: 10; opacity: 0.8;
}
.wbc-lightbox-close:hover { opacity: 1; }
.wbc-lightbox-nav {
    position: absolute; top: 50%; transform: translateY(-50%);
    color: #fff; font-size: 2.2rem; cursor: pointer;
    background: rgba(0,0,0,0.4); border: none;
    width: 44px; height: 44px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    opacity: 0.7; z-index: 10;
}
.wbc-lightbox-nav:hover { opacity: 1; background: rgba(0,0,0,0.6); }
.wbc-lightbox-prev { left: 12px; }
.wbc-lightbox-next { right: 12px; }
.wbc-lightbox-counter {
    position: absolute; top: 20px; left: 50%;
    transform: translateX(-50%); color: #94a3b8;
    font-size: 0.75rem;
}

/* ── Videos ─────────────────────────────────────────────── */
.wbc-video-item { margin-bottom: 16px; }
.wbc-video-item:last-child { margin-bottom: 0; }
.wbc-video-title {
    font-family: 'Oswald', sans-serif; font-size: 1rem;
    font-weight: 600; color: var(--wbc-navy); margin: 0 0 8px;
}
.wbc-video-embed {
    position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;
}
.wbc-video-embed iframe {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%; border-radius: 8px; border: none;
}
.wbc-yt-cta {
    display: block;
    text-align: center;
    padding: 14px 16px;
    font-family: 'Oswald', sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--wbc-navy);
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-top: 1px solid #E5E7EB;
    transition: color 0.2s;
}
.wbc-yt-cta:hover { color: #C8102E; }

/* ── CTA Redes ──────────────────────────────────────────── */
.wbc-social-cta {
    background: var(--wbc-navy); border-radius: 12px;
    padding: 28px 24px; text-align: center; margin-bottom: 24px;
}
.wbc-social-cta-eyebrow {
    font-family: 'Open Sans', sans-serif; font-size: 0.75rem;
    color: rgba(255,255,255,0.5); text-transform: uppercase;
    letter-spacing: 1.5px; margin: 0 0 8px;
}
.wbc-social-cta-title {
    font-family: 'Oswald', sans-serif; font-size: 1.3rem;
    font-weight: 700; color: #fff; margin: 0 0 20px;
}
.wbc-social-icons {
    display: flex; justify-content: center; gap: 12px;
}
.wbc-social-icon {
    display: flex; align-items: center; justify-content: center;
    width: 48px; height: 48px;
    background: rgba(255,255,255,0.1); border-radius: 50%;
    color: #fff; text-decoration: none;
    transition: background 0.2s, transform 0.15s;
}
.wbc-social-icon:hover { background: rgba(255,255,255,0.2); transform: scale(1.08); }
.wbc-social-icon svg { width: 22px; height: 22px; fill: currentColor; }

/* Articles grid spacing override dentro del hub */
.wbc-hub .articles-grid {
    display: flex;
    flex-direction: column;
    gap: 32px;
    margin-bottom: 32px;
}
.wbc-hub .article-card {
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 8px rgba(0,0,0,0.07);
    background: #ffffff;
    border: 1px solid #e5e7eb;
}
.wbc-hub .article-card-content {
    padding: 16px;
    background: #ffffff;
}
.wbc-hub .article-card-title {
    color: #111827 !important;
    font-size: 1.15rem;
    line-height: 1.4;
    margin-bottom: 8px;
}
.wbc-hub .article-card-excerpt {
    color: #374151 !important;
    font-size: 0.9rem;
    line-height: 1.5;
    margin-bottom: 8px;
}
.wbc-hub .article-card-meta {
    color: #6b7280 !important;
    font-size: 0.8rem;
}
.wbc-hub .article-card-category {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
@media (prefers-color-scheme: dark) {
    /* ── Hub background ── */
    .wbc-hub {
        background: #0f172a;
    }

    /* ── Cards / contenedores ── */
    .wbc-hub .wbc-card {
        background: #1e293b;
        border-color: #334155;
    }
    .wbc-hub .wbc-section-header {
        background: #1e3a5f;
    }

    /* ── Sección "Toda la Cobertura" ── */
    .wbc-hub .wbc-articles-section h2,
    .wbc-hub .wbc-articles-header {
        color: #f1f5f9 !important;
    }
    .wbc-hub .wbc-articles-title {
        color: #f1f5f9 !important;
    }
    .wbc-hub .wbc-article-count,
    .wbc-hub .wbc-articles-count {
        color: #94a3b8 !important;
    }
    .wbc-hub .wbc-empty-state {
        background: #1e293b !important;
        color: #94a3b8 !important;
    }

    /* ── Article cards ── */
    .wbc-hub .article-card,
    .wbc-hub .article-card-content {
        background: #1e293b !important;
        border-color: #334155;
    }
    .wbc-hub .article-card-title {
        color: #f1f5f9 !important;
    }
    .wbc-hub .article-card-excerpt {
        color: #cbd5e1 !important;
    }
    .wbc-hub .article-card-meta {
        color: #94a3b8 !important;
    }
    .wbc-hub .article-card-category {
        opacity: 0.9;
    }

    /* ── Calendario ── */
    .wbc-hub .wbc-game-item {
        border-color: #334155 !important;
    }
    .wbc-hub .wbc-game-matchup {
        color: #e2e8f0 !important;
    }
    .wbc-hub .wbc-game-hora {
        color: #94a3b8 !important;
    }
    .wbc-hub .wbc-game-resultado-inline.ganado {
        color: #FFFFFF !important;
    }
    .wbc-hub .wbc-game-resultado-inline.perdido {
        color: #FFFFFF !important;
    }
    .wbc-hub .wbc-game-final-label { color: #64748b !important; }
    .wbc-hub .wbc-game-cuarto-label { color: #64748b !important; }
    .wbc-hub .wbc-tv-badge.tv-tbd {
        background: #374151 !important;
        color: #9ca3af !important;
    }
    .wbc-hub .wbc-calendar-note {
        color: #475569;
    }
    .wbc-hub .wbc-cal-tab {
        border-color: #334155; color: #94a3b8;
    }
    .wbc-hub .wbc-cal-tab:hover { background: #1e293b; }
    .wbc-hub .wbc-cal-tab.active {
        background: #0f172a; border-color: #475569;
    }
    .wbc-hub .wbc-cal-tab-day { color: #e2e8f0; }
    .wbc-hub .wbc-cal-tab-mex { border-color: #D4A843; }
    .wbc-hub .wbc-cal-arrow {
        border-color: #334155; color: #94a3b8;
    }
    .wbc-hub .wbc-cal-arrow:hover:not(:disabled) { background: #1e293b; }
    .wbc-hub .wbc-cal-day-header {
        color: #64748b; border-color: #334155;
    }

    /* ── Posiciones ── */
    .wbc-hub .wbc-standings-table {
        background: transparent;
    }
    .wbc-hub .wbc-standings-table th {
        background: #1e3a5f;
        color: #94a3b8;
        border-color: #334155;
    }
    .wbc-hub .wbc-standings-table td {
        color: #e2e8f0;
        border-color: #334155;
        background: transparent;
    }
    .wbc-hub .wbc-standings-table tr.mexico-row td {
        background: rgba(196,18,46,0.15) !important;
        color: #fca5a5 !important;
    }
    .wbc-hub .wbc-standings-table tr:hover td {
        background: #263548;
    }
    .wbc-hub .wbc-standings-footer {
        color: #475569;
    }

    /* ── Galería y videos ── */
    .wbc-hub .wbc-gallery-empty,
    .wbc-hub .wbc-articles-empty {
        background: #1e293b;
        color: #94a3b8;
        border-color: #334155;
    }
    .wbc-hub .wbc-video-empty {
        color: #64748b;
    }
    .wbc-yt-cta { color: #e2e8f0; border-top-color: #334155; }
    .wbc-yt-cta:hover { color: #D4A843; }
    .wbc-hub .wbc-gallery-caption {
        color: #94a3b8;
    }

    /* ── Tricolor (mantener colores nacionales) ── */
    .wbc-tricolor-blanco {
        background: rgba(255,255,255,0.15) !important;
    }

    /* ── Sponsor strip — mantener fondo claro en dark mode (diseño aprobado) ── */
    .wbc-sponsor-strip {
        background: #F0F1F5;
        border-color: #C8102E;
    }
    .wbc-sponsor-label { color: #6B7280; }

    /* ── CI modules dark mode ── */
    .ci-branded-card { background: #1e293b; border-color: #334155; }
    .ci-branded-tagline { color: #94a3b8; }
    .ci-branded-message { color: #cbd5e1; }
    .ci-card-badge { border-color: #334155; }
    .ci-card-badge-text { color: #64748b; }
    .ci-card-badge-logo { opacity: 0.5; }
    .ci-closing { background: #1e293b; border: none; border-top: 3px solid #C8102E; }
    .ci-closing-text { color: #94a3b8; }
    .ci-closing-sub { color: #64748b; }
    /* Pagination dark mode */
    .wbc-page-btn { background: #1e293b; border-color: #334155; color: #e2e8f0; }
    .wbc-page-btn:hover:not(:disabled) { background: #334155; color: #fff; border-color: #475569; }
}
.wbc-hub .article-card-image {
    overflow: hidden;
}
.wbc-hub .article-card-image img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    object-position: center top;
}

/* ── Sponsor strip CI (separado del hero — regla Jurídico) ── */
.wbc-sponsor-strip {
    display: flex;
    text-decoration: none;
    background: #F8F9FC;
    padding: 20px 24px;
    align-items: center;
    justify-content: center;
    gap: 16px;
    border-top: 3px solid #C8102E;
    cursor: pointer;
    transition: background 0.2s;
}
.wbc-sponsor-strip:hover { background: #EEF0F5; }
.wbc-sponsor-label {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #6B7280;
}
.wbc-sponsor-divider {
    width: 1px;
    height: 28px;
    background: #D1D5DB;
}
.wbc-sponsor-logo {
    height: 36px;
    width: auto;
}

/* ── Logo WBC en hero (transparente, desde Mac de Sergio) ── */
.wbc-hero-logo {
    height: 80px;
    width: auto;
    opacity: 0.85;
    margin-bottom: 16px;
}

/* ── MÓDULO 2 — Tarjeta CI branded (después del art. 3) ── */
.ci-branded-card {
    display: block;
    text-decoration: none;
    background: #FFFFFF;
    border-radius: 12px;
    overflow: hidden;
    margin: 32px 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    border: 1px solid #E5E7EB;
    cursor: pointer;
    transition: box-shadow 0.2s;
}
.ci-branded-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}
.ci-branded-header {
    background: linear-gradient(135deg, #1B2A4A 0%, #2D3F6B 100%);
    padding: 10px 24px;
    border-bottom: 3px solid #C8102E;
}
.ci-branded-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #D4A843;
    text-decoration: none;
}
.ci-branded-body {
    padding: 32px 24px;
    text-align: center;
}
.ci-branded-logo {
    height: 60px;
    width: auto;
    margin-bottom: 12px;
}
.ci-branded-tagline {
    font-size: 13px;
    color: #6B7280;
    font-weight: 500;
    margin: 0 0 16px;
    text-decoration: none;
}
.ci-branded-divider {
    width: 40px;
    height: 2px;
    background: #C8102E;
    margin: 0 auto 16px;
}
.ci-branded-message {
    font-size: 14px;
    color: #374151;
    font-weight: 400;
    line-height: 1.5;
    max-width: 400px;
    margin: 0 auto;
    text-decoration: none;
}

/* ── MÓDULO 3 — Badge CI en article cards del hub ─────── */
.ci-card-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 10px;
    margin-top: 10px;
    border-top: 1px solid #F3F4F6;
}
.ci-card-badge-logo {
    height: 18px;
    width: auto;
    opacity: 0.7;
}
.ci-card-badge-text {
    font-size: 11px;
    color: #9CA3AF;
    font-weight: 500;
}

/* ── Paginación numerada WBC ───────────────────────────── */
.wbc-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 2rem 0 1rem;
    flex-wrap: wrap;
}
.wbc-page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 38px;
    height: 38px;
    padding: 0 0.6rem;
    border-radius: 6px;
    border: 1px solid #D1D5DB;
    background: #FFFFFF;
    color: var(--wbc-navy);
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.wbc-page-btn:hover:not(:disabled) {
    background: var(--wbc-navy);
    color: #FFFFFF;
    border-color: var(--wbc-navy);
}
.wbc-page-btn.active {
    background: #C8102E;
    border-color: #C8102E;
    color: #FFFFFF;
    font-weight: 700;
}
.wbc-page-btn:disabled {
    opacity: 0.3;
    cursor: default;
}

/* ── Scroll-to-top button ─────────────────────────────── */
#wbc-scroll-top {
    display: none;
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--wbc-navy);
    color: #D4A843;
    border: none;
    font-size: 1.2rem;
    font-weight: 700;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 999;
    transition: opacity 0.2s;
}
#wbc-scroll-top:hover { opacity: 0.85; }

/* ── MÓDULO 4 — Cierre CI (antes de social CTA) ────────── */
.ci-closing {
    display: block;
    text-decoration: none;
    text-align: center;
    padding: 40px 24px;
    background: #FFFFFF;
    border: none;
    border-top: 3px solid #C8102E;
    border-radius: 12px;
    margin-bottom: 24px;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    transition: box-shadow 0.2s;
}
.ci-closing:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
.ci-closing-text {
    font-size: 14px;
    color: #6B7280;
    font-weight: 400;
    margin: 0 0 16px;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-decoration: none;
}
.ci-closing-logo {
    height: 50px;
    width: auto;
    margin-bottom: 12px;
}
.ci-closing-sub {
    font-size: 12px;
    color: #9CA3AF;
    font-weight: 500;
    margin: 0;
    text-decoration: none;
}

/* Responsive */
@media (max-width: 768px) {
    .wbc-hero-title { font-size: 48px; }
    .wbc-hero-pre-title { font-size: 22px; }
    .wbc-hero-logo { height: 50px; }
}
@media (max-width: 600px) {
    .wbc-sponsor-strip { flex-direction: column; gap: 8px; }
    .wbc-sponsor-divider { width: 40px; height: 1px; }
    .wbc-dashboard { grid-template-columns: 1fr; }
    .wbc-featured { height: 280px; }
    .wbc-featured .wbc-featured-title { font-size: 1.3rem; }
    .wbc-featured .wbc-featured-excerpt { font-size: 0.82rem; }
    .wbc-featured .wbc-featured-overlay { padding: 24px 16px 16px; }
}
@media (max-width: 480px) {
    .wbc-gallery-grid { grid-template-columns: repeat(2, 1fr); }
    .wbc-admin-gallery-list { grid-template-columns: repeat(3, 1fr); }
}

/* ================================================================
   BRACKET ELIMINATORIO WBC 2026
   ================================================================ */
.wbc-bracket-section {
    margin: 0 0 24px;
    padding: 0;
}
.wbc-bracket-section h3 {
    font-family: 'Oswald', sans-serif;
    font-size: 1.3rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--wbc-red);
    margin: 0 0 6px;
}
.wbc-bracket-sponsor {
    font-size: 0.75rem;
    color: var(--wbc-muted);
    margin: 0 0 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}
.wbc-bracket-sponsor img {
    height: 18px;
    width: auto;
    vertical-align: middle;
}
.wbc-bkt-round-labels {
    display: grid;
    grid-template-columns: 1fr 20px 1fr 20px 1fr;
    margin-bottom: 8px;
}
.wbc-bkt-round-label {
    font-family: 'Oswald', sans-serif;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--wbc-muted);
    text-align: center;
    padding: 0 4px;
}
.wbc-bkt-round-spacer { width: 20px; }

/* ── Bracket grid ── */
.wbc-bkt-grid {
    display: grid;
    grid-template-columns: 1fr 20px 1fr 20px 1fr;
    grid-template-rows: repeat(4, auto);
    gap: 5px 0;
    align-items: stretch;
}
.wbc-bkt-qf1 { grid-column: 1; grid-row: 1; }
.wbc-bkt-qf2 { grid-column: 1; grid-row: 2; }
.wbc-bkt-qf3 { grid-column: 1; grid-row: 3; }
.wbc-bkt-qf4 { grid-column: 1; grid-row: 4; }
.wbc-bkt-conn1 { grid-column: 2; grid-row: 1 / 3; position: relative; }
.wbc-bkt-conn2 { grid-column: 2; grid-row: 3 / 5; position: relative; }
.wbc-bkt-sf1 { grid-column: 3; grid-row: 1 / 3; align-self: center; }
.wbc-bkt-sf2 { grid-column: 3; grid-row: 3 / 5; align-self: center; }
.wbc-bkt-conn3 { grid-column: 4; grid-row: 1 / 5; position: relative; }
.wbc-bkt-final { grid-column: 5; grid-row: 1 / 5; align-self: center; }

/* ── Conectores ── */
.wbc-bkt-connector {
    display: flex; align-items: stretch; justify-content: center; width: 20px;
}
.wbc-bkt-connector::before {
    content: ''; position: absolute; top: 25%; bottom: 25%; left: 50%;
    width: 1.5px; background: var(--wbc-navy2);
}
.wbc-bkt-connector::after {
    content: ''; position: absolute; top: 50%; left: 50%;
    width: 10px; height: 1.5px; background: var(--wbc-navy2);
}
.wbc-bkt-connector-final { width: 20px; display: flex; align-items: stretch; }
.wbc-bkt-connector-final::before {
    content: ''; position: absolute; top: 30%; bottom: 30%; left: 50%;
    width: 1.5px; background: var(--wbc-navy2);
}
.wbc-bkt-connector-final::after {
    content: ''; position: absolute; top: 50%; left: 50%;
    width: 10px; height: 1.5px; background: var(--wbc-navy2);
}

/* ── Matchup card ── */
.wbc-bkt-match {
    background: var(--wbc-white);
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.wbc-bkt-match.is-today {
    border-color: var(--wbc-red);
    box-shadow: 0 2px 8px rgba(196,18,46,0.15);
}
.wbc-bkt-match.is-tomorrow {
    border: 2px dashed var(--wbc-navy2);
}
.wbc-bkt-match.is-tbd {
    border: 2px dashed #d1d5db;
}
.wbc-bkt-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 4px 8px;
    background: var(--wbc-navy);
    font-size: 0.58rem; color: rgba(255,255,255,0.7);
}
.wbc-bkt-badge {
    font-family: 'Oswald', sans-serif; font-size: 0.55rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.06em;
    padding: 1px 6px; border-radius: 3px; white-space: nowrap;
}
.wbc-bkt-badge-live {
    background: var(--wbc-red); color: #fff;
    animation: wbc-bkt-pulse 1.5s ease-in-out infinite;
}
.wbc-bkt-badge-tomorrow { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.8); }
.wbc-bkt-badge-tbd { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
@keyframes wbc-bkt-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

.wbc-bkt-team {
    display: flex; align-items: center; padding: 5px 8px; gap: 6px;
    font-size: 0.78rem; color: var(--wbc-text); transition: opacity 0.2s;
}
.wbc-bkt-team + .wbc-bkt-team { border-top: 1px solid #f3f4f6; }
.wbc-bkt-team.is-winner { color: var(--wbc-navy); font-weight: 700; }
.wbc-bkt-team.is-loser { opacity: 0.35; }
.wbc-bkt-flag { font-size: 1rem; line-height: 1; flex-shrink: 0; }
.wbc-bkt-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wbc-bkt-seed { font-size: 0.55rem; color: var(--wbc-muted); font-family: monospace; flex-shrink: 0; }
.wbc-bkt-score {
    font-family: 'Oswald', sans-serif; font-size: 1rem; font-weight: 700;
    min-width: 20px; text-align: right; flex-shrink: 0; color: var(--wbc-navy);
}
.wbc-bkt-team.is-winner .wbc-bkt-score { color: var(--wbc-red); }
.wbc-bkt-score-dash { color: #d1d5db; }

.wbc-bkt-match.is-final .wbc-bkt-header { background: var(--wbc-navy); }
.wbc-bkt-match.is-final.is-tbd .wbc-bkt-team { color: var(--wbc-muted); font-style: italic; }

/* ── Nota México ── */
.wbc-bracket-mexico-note {
    margin-top: 16px; padding: 10px 14px;
    background: var(--wbc-white);
    border-left: 3px solid var(--wbc-navy2);
    border-radius: 0 8px 8px 0;
    font-size: 0.75rem; color: var(--wbc-muted); line-height: 1.5;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

/* ── Próximos juegos ── */
.wbc-bkt-upcoming {
    margin-top: 16px;
    background: var(--wbc-white);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.wbc-bkt-upcoming-header {
    background: var(--wbc-navy); padding: 8px 14px;
    font-family: 'Oswald', sans-serif; font-size: 0.8rem;
    color: var(--wbc-white); text-transform: uppercase; letter-spacing: 0.04em;
}
.wbc-bkt-upcoming-game {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-bottom: 1px solid #f3f4f6;
    font-size: 0.8rem; color: var(--wbc-text);
}
.wbc-bkt-upcoming-game:last-child { border-bottom: none; }
.wbc-bkt-upcoming-badge {
    font-family: 'Oswald', sans-serif; font-size: 0.6rem; font-weight: 700;
    text-transform: uppercase; padding: 2px 8px; border-radius: 3px;
    flex-shrink: 0; min-width: 60px; text-align: center;
}
.wbc-bkt-upcoming-badge.is-hoy { background: var(--wbc-red); color: #fff; }
.wbc-bkt-upcoming-badge.is-man { background: var(--wbc-navy); color: #fff; }
.wbc-bkt-upcoming-badge.is-tbd { background: #e5e7eb; color: var(--wbc-muted); }
.wbc-bkt-upcoming-teams { flex: 1; font-weight: 500; }
.wbc-bkt-upcoming-meta { font-size: 0.7rem; color: var(--wbc-muted); text-align: right; white-space: nowrap; }

/* ── Mobile bracket ── */
.wbc-bkt-mobile-round { display: none; }
@media (max-width: 699px) {
    .wbc-bkt-grid { display: flex; flex-direction: column; gap: 4px; }
    .wbc-bkt-connector, .wbc-bkt-connector-final { display: none; }
    .wbc-bkt-round-labels { display: none; }
    .wbc-bkt-mobile-round {
        display: block;
        font-family: 'Oswald', sans-serif; font-size: 0.7rem;
        text-transform: uppercase; letter-spacing: 0.08em;
        color: var(--wbc-red); margin: 12px 0 5px;
        padding-bottom: 3px; border-bottom: 1px solid rgba(196,18,46,0.15);
    }
    .wbc-bkt-mobile-round:first-child { margin-top: 0; }
}

/* ── Dark mode bracket ── */
@media (prefers-color-scheme: dark) {
    .wbc-bkt-match { background: #1e293b; border-color: #334155; }
    .wbc-bkt-match.is-today { border-color: var(--wbc-red); box-shadow: 0 2px 8px rgba(196,18,46,0.25); }
    .wbc-bkt-match.is-tomorrow { border-color: #475569; }
    .wbc-bkt-match.is-tbd { border-color: #334155; }
    .wbc-bkt-team { color: #e2e8f0; }
    .wbc-bkt-team + .wbc-bkt-team { border-color: #334155; }
    .wbc-bkt-team.is-winner { color: #fff; }
    .wbc-bkt-team.is-loser { opacity: 0.35; }
    .wbc-bkt-score { color: #e2e8f0; }
    .wbc-bkt-team.is-winner .wbc-bkt-score { color: #f87171; }
    .wbc-bkt-score-dash { color: #475569; }
    .wbc-bkt-match.is-final.is-tbd .wbc-bkt-team { color: #64748b; }
    .wbc-bkt-connector::before, .wbc-bkt-connector::after,
    .wbc-bkt-connector-final::before, .wbc-bkt-connector-final::after { background: #475569; }
    .wbc-bracket-mexico-note { background: #1e293b; border-color: #475569; color: #94a3b8; }
    .wbc-bkt-upcoming { background: #1e293b; }
    .wbc-bkt-upcoming-game { color: #e2e8f0; border-color: #334155; }
    .wbc-bkt-upcoming-meta { color: #94a3b8; }
    .wbc-bkt-upcoming-badge.is-tbd { background: #334155; color: #94a3b8; }
}
`;
            document.head.appendChild(style);
        }

        // ── Meta tags ──────────────────────────────────────────────────
        updateMetaTags({
            title: 'Cobertura WBC 2026 — Beisjoven Media',
            description: 'Cobertura editorial del Clásico Mundial de Béisbol 2026. Pool B Houston, 6-14 de marzo. Solo en Beisjoven.',
            image: 'https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/public/imagenes/wbc-hero-og-tag.png',
            type: 'website'
        });

        // ── Datos — Calendario Pool B COMPLETO ─────────────────────────
        // Horarios CDMX verificados. DST Houston inicia 8 mar.
        // 6-7 mar: CT = CDMX | 8+ mar: CDT = CDMX +1h
        // Resultados se cargan desde wbc_resultados en Supabase.
        const calDias = [
            { fecha: '6 mar', diaSem: 'Viernes', juegos: [
                { id: 1, local: 'México', visit: 'Gran Bretaña', hora: '12:00 p.m.', tv: ['FS1','FOX Dep'], resultado: '8-2', clases: 'ganado' },
                { id: 2, local: 'Estados Unidos', visit: 'Brasil', hora: '7:00 p.m.', tv: ['FS1','FOX Dep'], resultado: '15-5', clases: 'ganado' },
            ]},
            { fecha: '7 mar', diaSem: 'Sábado', juegos: [
                { id: 3, local: 'Brasil', visit: 'Italia', hora: '12:00 p.m.', tv: ['App'], resultado: '—', clases: 'pendiente' },
                { id: 4, local: 'Gran Bretaña', visit: 'Estados Unidos', hora: '7:00 p.m.', tv: ['FOX'], resultado: '—', clases: 'pendiente' },
            ]},
            { fecha: '8 mar', diaSem: 'Domingo', juegos: [
                { id: 5, local: 'Gran Bretaña', visit: 'Italia', hora: '11:00 a.m.', tv: ['Tubi'], resultado: '—', clases: 'pendiente' },
                { id: 6, local: 'Brasil', visit: 'México', hora: '6:00 p.m.', tv: ['FS1','FOX Dep'], resultado: '—', clases: 'pendiente' },
            ]},
            { fecha: '9 mar', diaSem: 'Lunes', juegos: [
                { id: 7, local: 'Brasil', visit: 'Gran Bretaña', hora: '11:00 a.m.', tv: ['Tubi'], resultado: '—', clases: 'pendiente' },
                { id: 8, local: 'México', visit: 'Estados Unidos', hora: '6:00 p.m.', tv: ['FOX','FOX Dep'], resultado: '—', clases: 'pendiente' },
            ]},
            { fecha: '10 mar', diaSem: 'Martes', juegos: [
                { id: 9, local: 'Italia', visit: 'Estados Unidos', hora: '7:00 p.m.', tv: ['FS1','FOX Dep'], resultado: '—', clases: 'pendiente' },
            ]},
            { fecha: '11 mar', diaSem: 'Miércoles', juegos: [
                { id: 10, local: 'Italia', visit: 'México', hora: '5:00 p.m.', tv: ['Tubi'], resultado: '—', clases: 'pendiente' },
            ]},
            { fecha: '13 mar', diaSem: 'Viernes', juegos: [
                { id: 11, local: '2do Pool A', visit: '1ro Pool B', hora: '6:00 p.m.', tv: ['FS1','FOX Dep'], resultado: '—', clases: 'pendiente', esCuarto: true },
            ]},
            { fecha: '14 mar', diaSem: 'Sábado', juegos: [
                { id: 12, local: '2do Pool B', visit: '1ro Pool A', hora: '1:00 p.m.', tv: ['FOX','FOX Dep'], resultado: '—', clases: 'pendiente', esCuarto: true },
            ]},
            { fecha: '15 mar', diaSem: 'Domingo', juegos: [
                { id: 13, local: 'Rep. Dominicana', visit: 'Estados Unidos', hora: '6:00 p.m.', tv: ['FS1'], resultado: '—', clases: 'pendiente', esSemi: true },
            ]},
            { fecha: '16 mar', diaSem: 'Lunes', juegos: [
                { id: 14, local: 'Italia', visit: 'Venezuela', hora: '6:00 p.m.', tv: ['FS1'], resultado: '—', clases: 'pendiente', esSemi: true },
            ]},
            { fecha: '17 mar', diaSem: 'Martes', juegos: [
                { id: 15, local: 'Ganador SF1', visit: 'Ganador SF2', hora: '6:00 p.m.', tv: ['FOX'], resultado: '—', clases: 'pendiente', esFinal: true },
            ]},
        ];

        const tvColor = { 'FOX': 'tv-fox', 'FS1': 'tv-fs1', 'Tubi': 'tv-tubi', 'FOX Dep': 'tv-foxd', 'App': 'tv-app', 'TBD': 'tv-tbd' };

        // calendarioContent se genera después del fetch de resultados

        // ── Datos estáticos — Posiciones iniciales ────────────────────
        // ACTUALIZAR estos valores después de cada juego.
        // Para editar: en el hub, loguearte como admin → panel Admin → sección Posiciones.
        let posicionesData = [
            { equipo: '🇺🇸 Estados Unidos', jj: 0, jg: 0, jp: 0 },
            { equipo: '🇲🇽 México',          jj: 0, jg: 0, jp: 0 },
            { equipo: '🇮🇹 Italia',          jj: 0, jg: 0, jp: 0 },
            { equipo: '🇬🇧 Gran Bretaña',    jj: 0, jg: 0, jp: 0 },
            { equipo: '🇧🇷 Brasil',           jj: 0, jg: 0, jp: 0 },
        ];

        // ── Fetch en paralelo — artículos WBC + galería + videos ──────
        let articles = [], galeria = [], videos = [];
        try {
            const [artRes, galRes, vidRes] = await Promise.all([
                supabaseClient
                    .from('articulos')
                    .select(`*, categoria:categorias(*), autor:autores(*)`)
                    .eq('es_wbc2026', true)
                    .eq('publicado', true)
                    .order('created_at', { ascending: false })
                    .limit(50),
                supabaseClient
                    .from('wbc_galeria')
                    .select('id, imagen_url, pie_de_foto, created_at')
                    .order('created_at', { ascending: false })
                    .limit(60),
                supabaseClient
                    .from('wbc_videos')
                    .select('id, titulo, youtube_url')
                    .order('id', { ascending: true })
                    .limit(3)
            ]);
            if (!artRes.error && artRes.data) articles = artRes.data;
            if (!galRes.error && galRes.data) galeria = galRes.data;
            window._wbcGaleria = galeria;
            if (!vidRes.error && vidRes.data) videos = vidRes.data;
        } catch(e) { console.error('WBC fetch error:', e); }

        // ── Intentar fetch de posiciones desde Supabase ───────────────
        try {
            const { data: posData, error: posErr } = await supabaseClient
                .from('wbc_posiciones')
                .select('equipo, jj, jg, jp, orden')
                .order('jg', { ascending: false })
                .order('jp', { ascending: true })
                .order('orden', { ascending: true });
            if (!posErr && posData && posData.length > 0) {
                posicionesData = posData;
            }
        } catch(e) { /* usa datos estáticos */ }

        // ── Fetch resultados del calendario desde Supabase ────────────
        // Helper: obtener todos los juegos flat
        function getAllGames() {
            const games = [];
            calDias.forEach(d => d.juegos.forEach(j => games.push(j)));
            return games;
        }
        try {
            const { data: resData, error: resErr } = await supabaseClient
                .from('wbc_resultados')
                .select('id, resultado, clases')
                .order('id', { ascending: true });
            if (!resErr && resData && resData.length > 0) {
                const allGames = getAllGames();
                resData.forEach(r => {
                    const game = allGames.find(g => g.id === r.id);
                    if (game) {
                        game.resultado = r.resultado || '—';
                        game.clases = r.clases || 'pendiente';
                    }
                });
            }
        } catch(e) { /* usa datos hardcodeados */ }

        // ── Determinar día default del slider ─────────────────────────
        function getDefaultDayIndex() {
            const now = new Date();
            const month = now.getMonth() + 1; // 1-indexed
            const day = now.getDate();
            if (month !== 3) return 0;
            const dayMap = { 6:0, 7:1, 8:2, 9:3, 10:4, 11:5, 12:5, 13:6, 14:7, 15:8, 16:9, 17:10 };
            return dayMap[day] !== undefined ? dayMap[day] : (day < 6 ? 0 : 10);
        }

        // ── Banderas y récords ────────────────────────────────────────
        const teamFlags = {
            'México': '🇲🇽', 'Estados Unidos': '🇺🇸', 'Italia': '🇮🇹',
            'Gran Bretaña': '🇬🇧', 'Brasil': '🇧🇷',
            'Rep. Dominicana': '🇩🇴', 'Venezuela': '🇻🇪',
            'Canadá': '🇨🇦', 'Puerto Rico': '🇵🇷',
            'Corea del Sur': '🇰🇷', 'Japón': '🇯🇵',
            '1ro Pool A': '', '2do Pool A': '', '1ro Pool B': '', '2do Pool B': '',
            'Ganador SF1': '🏆', 'Ganador SF2': '🏆'
        };
        function teamWithFlag(name) {
            const flag = teamFlags[name];
            return (flag ? flag + ' ' : '') + name;
        }
        function getRecord(name) {
            const row = posicionesData.find(r => r.equipo.includes(name));
            return row && row.jj > 0 ? ` <span class="wbc-cal-record">(${row.jg}-${row.jp})</span>` : '';
        }

        // ── BRACKET ELIMINATORIO — DATOS ────────────────────────────
        // CÓMO ACTUALIZAR:
        // 1. Cambiar score1/score2 del juego
        // 2. Cambiar status: 'completed' y winner: 'Nombre'
        // 3. Para la final: cambiar team1/team2 al nombre real
        const bracketFlags = {
            'Rep. Dominicana': '🇩🇴', 'Corea del Sur': '🇰🇷',
            'Estados Unidos': '🇺🇸', 'Canadá': '🇨🇦',
            'Italia': '🇮🇹', 'Puerto Rico': '🇵🇷',
            'Venezuela': '🇻🇪', 'Japón': '🇯🇵', 'México': '🇲🇽',
            'Ganador SF1': '🏆', 'Ganador SF2': '🏆'
        };
        const bracketData = {
            qf: [
                // ── QF1 · 13 mar · loanDepot Park, Miami ──
                { id:'QF1', date:'13 mar', venue:'Miami',
                  team1:'Rep. Dominicana', seed1:'D1', score1:10,
                  team2:'Corea del Sur',   seed2:'C2', score2:0,
                  winner:'Rep. Dominicana', status:'completed', note:'7 inn' },
                // ── QF2 · 13 mar · Daikin Park, Houston ──
                { id:'QF2', date:'13 mar', venue:'Houston',
                  team1:'Estados Unidos', seed1:'B2', score1:5,
                  team2:'Canadá',         seed2:'A1', score2:3,
                  winner:'Estados Unidos', status:'completed' },
                // ── QF3 · 14 mar · Daikin Park, Houston ──
                { id:'QF3', date:'14 mar', venue:'Houston',
                  team1:'Italia',      seed1:'B1', score1:8,
                  team2:'Puerto Rico', seed2:'A2', score2:6,
                  winner:'Italia', status:'completed' },
                // ── QF4 · 14 mar · loanDepot Park, Miami ──
                { id:'QF4', date:'14 mar', venue:'Miami',
                  team1:'Venezuela', seed1:'D2', score1:8,
                  team2:'Japón',     seed2:'C1', score2:5,
                  winner:'Venezuela', status:'completed' }
            ],
            sf: [
                // ── SF1 · 15 mar · loanDepot Park, Miami ──
                // ACTUALIZAR: score1, score2, winner, status:'completed'
                { id:'SF1', date:'15 mar', time:'8 PM ET / 6 PM CDMX', venue:'Miami',
                  team1:'Rep. Dominicana', seed1:'D1',
                  team2:'Estados Unidos',  seed2:'B2',
                  score1:null, score2:null, winner:null, status:'today' },
                // ── SF2 · 16 mar · loanDepot Park, Miami ──
                // ACTUALIZAR: status:'today' el 16 mar, luego 'completed'
                { id:'SF2', date:'16 mar', time:'8 PM ET / 6 PM CDMX', venue:'Miami',
                  team1:'Italia',    seed1:'B1',
                  team2:'Venezuela', seed2:'D2',
                  score1:null, score2:null, winner:null, status:'tomorrow' }
            ],
            // ── FINAL · 17 mar · loanDepot Park, Miami ──
            // ACTUALIZAR: team1/team2 con nombres reales, luego scores
            final: {
                id:'Final', date:'17 mar', time:'8 PM ET / 6 PM CDMX', venue:'Miami',
                team1:'Ganador SF1', seed1:'',
                team2:'Ganador SF2', seed2:'',
                score1:null, score2:null, winner:null, status:'tbd'
            }
        };

        function renderWBCBracket() {
            function bktFlag(name) { return bracketFlags[name] || ''; }
            function bktStatusClass(s) {
                if (s === 'today') return 'is-today';
                if (s === 'tomorrow') return 'is-tomorrow';
                if (s === 'tbd') return 'is-tbd';
                return '';
            }
            function bktBadge(s, time) {
                if (s === 'today') return '<span class="wbc-bkt-badge wbc-bkt-badge-live">HOY' + (time ? ' · ' + time : '') + '</span>';
                if (s === 'tomorrow') return '<span class="wbc-bkt-badge wbc-bkt-badge-tomorrow">MAÑANA' + (time ? ' · ' + time : '') + '</span>';
                if (s === 'tbd') return '<span class="wbc-bkt-badge wbc-bkt-badge-tbd">POR DEFINIR' + (time ? ' · ' + time : '') + '</span>';
                return '';
            }
            function bktTeamRow(name, seed, score, isWinner, isLoser, status) {
                let cls = 'wbc-bkt-team';
                if (isWinner) cls += ' is-winner';
                if (isLoser) cls += ' is-loser';
                const scoreDisplay = (status === 'completed' && score !== null)
                    ? score
                    : '<span class="wbc-bkt-score-dash">–</span>';
                const seedHtml = seed ? '<span class="wbc-bkt-seed">' + seed + '</span>' : '';
                return '<div class="' + cls + '">' +
                    '<span class="wbc-bkt-flag">' + bktFlag(name) + '</span>' +
                    '<span class="wbc-bkt-name">' + name + '</span>' +
                    seedHtml +
                    '<span class="wbc-bkt-score">' + scoreDisplay + '</span>' +
                    '</div>';
            }
            function bktMatchCard(g, extra) {
                const sc = bktStatusClass(g.status);
                const fc = extra || '';
                const w1 = g.winner === g.team1;
                const w2 = g.winner === g.team2;
                const done = g.status === 'completed';
                return '<div class="wbc-bkt-match ' + sc + ' ' + fc + '">' +
                    '<div class="wbc-bkt-header"><span>' + g.id + ' · ' + g.date + ' · ' + g.venue + (g.note ? ' · ' + g.note : '') + '</span>' + bktBadge(g.status, g.time) + '</div>' +
                    bktTeamRow(g.team1, g.seed1, g.score1, w1, done && !w1, g.status) +
                    bktTeamRow(g.team2, g.seed2, g.score2, w2, done && !w2, g.status) +
                    '</div>';
            }

            // ── Build upcoming games list from bracket data ──
            function bktUpcomingGames() {
                const games = [...bracketData.sf, bracketData.final].filter(g => g.status !== 'completed');
                if (games.length === 0) return '';
                let rows = '';
                games.forEach(function(g) {
                    let badgeCls = 'is-tbd';
                    let badgeText = g.date;
                    if (g.status === 'today') { badgeCls = 'is-hoy'; badgeText = 'HOY'; }
                    else if (g.status === 'tomorrow') { badgeCls = 'is-man'; badgeText = 'MAÑANA'; }
                    const teams = bktFlag(g.team1) + ' ' + g.team1 + ' vs ' + bktFlag(g.team2) + ' ' + g.team2;
                    const meta = (g.time || '') + ' · FS1 · loanDepot Park';
                    rows += '<div class="wbc-bkt-upcoming-game">' +
                        '<span class="wbc-bkt-upcoming-badge ' + badgeCls + '">' + badgeText + '</span>' +
                        '<span class="wbc-bkt-upcoming-teams">' + teams + '</span>' +
                        '<span class="wbc-bkt-upcoming-meta">' + meta + '</span>' +
                        '</div>';
                });
                return '<div class="wbc-bkt-upcoming">' +
                    '<div class="wbc-bkt-upcoming-header">📺 Próximos Juegos</div>' +
                    rows +
                '</div>';
            }

            return '<div class="wbc-bracket-section">' +
                '<h3>🏆 Fase Eliminatoria</h3>' +
                '<div class="wbc-bracket-sponsor">Cobertura presentada por <img src="' + ciLogoUrl + '" alt="Caja Inmaculada" loading="lazy"></div>' +
                '<div class="wbc-bkt-round-labels">' +
                    '<span class="wbc-bkt-round-label">Cuartos de Final</span><span class="wbc-bkt-round-spacer"></span>' +
                    '<span class="wbc-bkt-round-label">Semifinales</span><span class="wbc-bkt-round-spacer"></span>' +
                    '<span class="wbc-bkt-round-label">Final</span>' +
                '</div>' +
                '<div class="wbc-bkt-grid">' +
                    '<div class="wbc-bkt-mobile-round">Cuartos de Final</div>' +
                    '<div class="wbc-bkt-qf1">' + bktMatchCard(bracketData.qf[0]) + '</div>' +
                    '<div class="wbc-bkt-qf2">' + bktMatchCard(bracketData.qf[1]) + '</div>' +
                    '<div class="wbc-bkt-qf3">' + bktMatchCard(bracketData.qf[2]) + '</div>' +
                    '<div class="wbc-bkt-qf4">' + bktMatchCard(bracketData.qf[3]) + '</div>' +
                    '<div class="wbc-bkt-conn1 wbc-bkt-connector"></div>' +
                    '<div class="wbc-bkt-conn2 wbc-bkt-connector"></div>' +
                    '<div class="wbc-bkt-mobile-round">Semifinales</div>' +
                    '<div class="wbc-bkt-sf1">' + bktMatchCard(bracketData.sf[0]) + '</div>' +
                    '<div class="wbc-bkt-sf2">' + bktMatchCard(bracketData.sf[1]) + '</div>' +
                    '<div class="wbc-bkt-conn3 wbc-bkt-connector-final"></div>' +
                    '<div class="wbc-bkt-mobile-round">Final · 17 de marzo</div>' +
                    '<div class="wbc-bkt-final">' + bktMatchCard(bracketData.final, 'is-final') + '</div>' +
                '</div>' +
                bktUpcomingGames() +
                '<div class="wbc-bracket-mexico-note">' +
                    '🇲🇽 México fue eliminado en fase de grupos (Grupo B, Houston) con récord 2-2. ' +
                    'Italia venció a México 9-1 el 11 de marzo, asegurando el primer lugar del grupo. ' +
                    'Estados Unidos avanzó como segundo lugar.' +
                '</div>' +
            '</div>';
        }

        // ── Generar slider de calendario ─────────────────────────────
        function highlightMexico(text) {
            return text.replace(/🇲🇽\s*México/g, '<span class="wbc-cal-mexico">🇲🇽 México</span>');
        }

        function buildCalendarioSlider(activeIdx) {
            const tabs = calDias.map((d, i) => {
                const diaNum = d.fecha.split(' ')[0];
                const hasMex = d.juegos.some(j => j.local === 'México' || j.visit === 'México');
                return `<button class="wbc-cal-tab ${i === activeIdx ? 'active' : ''} ${hasMex ? 'wbc-cal-tab-mex' : ''}" onclick="wbcCalGoTo(${i})">
                    <span class="wbc-cal-tab-day">${diaNum}</span>
                    <span class="wbc-cal-tab-label">${d.diaSem.substring(0,3)}</span>
                </button>`;
            }).join('');

            const dia = calDias[activeIdx];
            const games = dia.juegos.map(j => {
                const badges = j.tv.map(t => `<span class="wbc-tv-badge ${tvColor[t] || 'tv-tbd'}">${t}</span>`).join(' ');
                const yaJugado = j.clases === 'ganado' || j.clases === 'perdido';
                const isKnockout = j.esCuarto || j.esSemi || j.esFinal;
                const localDisplay = teamWithFlag(j.local) + (isKnockout ? '' : getRecord(j.local));
                const visitDisplay = teamWithFlag(j.visit) + (isKnockout ? '' : getRecord(j.visit));
                const matchup = highlightMexico(`${localDisplay} vs ${visitDisplay}`);
                const rightContent = yaJugado
                    ? `<span class="wbc-game-final-label">FINAL</span>
                       <span class="wbc-game-resultado-inline ${j.clases}">${j.resultado}</span>`
                    : `<span class="wbc-game-hora">${j.hora} CDMX</span>
                       <div class="wbc-game-tv">${badges}</div>`;
                const roundLabel = j.esCuarto ? 'Cuartos de Final'
                    : j.esSemi ? 'Semifinal · loanDepot Park, Miami'
                    : j.esFinal ? 'Final · loanDepot Park, Miami'
                    : '';
                return `
                <div class="wbc-game-item ${yaJugado ? 'wbc-game-played' : ''}">
                    <div>
                        <span class="wbc-game-matchup">${matchup}</span>
                        ${roundLabel ? '<span class="wbc-game-cuarto-label">' + roundLabel + '</span>' : ''}
                    </div>
                    <div class="wbc-game-right">
                        ${rightContent}
                    </div>
                </div>`;
            }).join('');

            return `
            <div class="wbc-cal-tabs-wrap">
                <button class="wbc-cal-arrow" onclick="wbcCalGoTo(${Math.max(0, activeIdx - 1)})" ${activeIdx === 0 ? 'disabled' : ''}>‹</button>
                <div class="wbc-cal-tabs" id="wbc-cal-tabs">${tabs}</div>
                <button class="wbc-cal-arrow" onclick="wbcCalGoTo(${Math.min(calDias.length - 1, activeIdx + 1)})" ${activeIdx === calDias.length - 1 ? 'disabled' : ''}>›</button>
            </div>
            <div class="wbc-cal-day-header">${dia.diaSem} ${dia.fecha}</div>
            <div class="wbc-game-list">${games}</div>`;
        }

        let calCurrentIdx = getDefaultDayIndex();
        const calendarioContent = buildCalendarioSlider(calCurrentIdx);

        // ── CI Integration ───────────────────────────────────────────
        const ciLogoUrl = 'https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/public/imagenes/ci-logo-horizontal.png';

        const ciBrandedCard = `
            <a href="https://www.cajainmaculada.com.mx/" target="_blank" rel="noopener sponsored" class="ci-branded-card">
                <div class="ci-branded-header">
                    <span class="ci-branded-label">NUESTRO PATROCINADOR</span>
                </div>
                <div class="ci-branded-body">
                    <img src="${ciLogoUrl}" alt="Caja Inmaculada" class="ci-branded-logo">
                    <div class="ci-branded-divider"></div>
                    <p class="ci-branded-message">Caja Inmaculada respalda la cobertura de Beisjoven en el World Baseball Classic 2026</p>
                </div>
            </a>`;

        // ── Helpers de render ─────────────────────────────────────────
        const WBC_PAGE_SIZE = 6;

        function renderArticleCards(arts) {
            if (!arts.length) return `
                <div class="wbc-empty-state">
                    <span class="wbc-empty-icon">⚾</span>
                    <h3>La cobertura ya comenzó</h3>
                    <p>Los artículos aparecerán aquí conforme se publiquen.</p>
                </div>`;
            let cards = arts.map((a, i) => {
                const fecha = new Date(a.fecha).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' });
                const catNombre = a.categoria ? a.categoria.nombre : '';
                const catSlug = a.categoria ? a.categoria.slug : '';
                const autorNombre = a.autor ? a.autor.nombre : 'Redacción Beisjoven';
                const pageNum = Math.floor(i / WBC_PAGE_SIZE);
                const hidden = pageNum > 0 ? ' style="display:none"' : '';
                let card = `
                <article class="article-card wbc-art-item" data-wbc-page="${pageNum}"${hidden}>
                    <a href="/articulo/${a.slug}" class="article-card-link">
                        <div class="article-card-image">
                            <img src="${a.imagen_url || ''}" alt="${a.titulo}" loading="lazy">
                            <span class="article-card-category cat-${catSlug}">${catNombre}</span>
                        </div>
                        <div class="article-card-content">
                            <h3 class="article-card-title">${a.titulo}</h3>
                            ${a.extracto ? `<p class="article-card-excerpt">${a.extracto}</p>` : ''}
                            <div class="article-card-meta">
                                <span>${autorNombre}</span>
                                <span>${fecha}</span>
                            </div>
                            <div class="ci-card-badge">
                                <img src="${ciLogoUrl}" alt="CI" class="ci-card-badge-logo">
                                <span class="ci-card-badge-text">Presentado por Caja Inmaculada</span>
                            </div>
                        </div>
                    </a>
                </article>`;
                // Insertar tarjeta branded CI después del artículo 3 (posición fija, siempre visible)
                if (i === 2 && arts.length > 3) {
                    card += ciBrandedCard;
                }
                return card;
            }).join('');
            // Si hay 3 o menos artículos, poner tarjeta branded al final
            if (arts.length <= 3 && arts.length > 0) {
                cards += ciBrandedCard;
            }
            // Paginación numerada si hay más de 1 página
            const wbcTotalPages = Math.ceil(arts.length / WBC_PAGE_SIZE);
            const paginationHtml = wbcTotalPages > 1 ? `<div id="wbc-pagination"></div>` : '';
            return '<div class="articles-grid" id="wbc-articles-grid">' + cards + '</div>' + paginationHtml;
        }

        const WBC_GAL_PAGE = 6;
        function renderGallery(items) {
            if (!items.length) return '<p class="wbc-gallery-empty">Las fotos desde Houston aparecerán aquí.</p>';
            const cards = items.map((item, i) => `
                <div class="wbc-gallery-item" data-gal-idx="${i}"${i >= WBC_GAL_PAGE ? ' style="display:none"' : ''}>
                    <img src="${item.imagen_url}" alt="${item.pie_de_foto || 'Foto WBC 2026'}" loading="lazy" onclick="wbcLightboxOpen(${i})" data-lb-index="${i}">
                    ${item.pie_de_foto ? `<p class="wbc-gallery-caption">${item.pie_de_foto}</p>` : ''}
                </div>`).join('');
            const hasMore = items.length > WBC_GAL_PAGE;
            return '<div class="wbc-gallery-grid">' + cards + '</div>' +
                `<p class="wbc-gallery-hint">📸 Toca una foto para verla completa</p>` +
                (hasMore ? `<button class="wbc-gallery-more" id="wbc-gallery-more" onclick="wbcGalleryMore()">Ver más fotos (${items.length - WBC_GAL_PAGE} más)</button>` : '') +
                `<div class="wbc-lightbox" id="wbc-lightbox">
                    <button class="wbc-lightbox-close" onclick="wbcLightboxClose()">&times;</button>
                    <button class="wbc-lightbox-nav wbc-lightbox-prev" onclick="wbcLightboxNav(-1)">&#8249;</button>
                    <img id="wbc-lightbox-img" src="" alt="">
                    <button class="wbc-lightbox-nav wbc-lightbox-next" onclick="wbcLightboxNav(1)">&#8250;</button>
                    <p class="wbc-lightbox-caption" id="wbc-lightbox-caption"></p>
                    <span class="wbc-lightbox-counter" id="wbc-lightbox-counter"></span>
                </div>`;
        }

        function getYouTubeId(url) {
            if (!url) return null;
            const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
            return match ? match[1] : null;
        }

        function renderVideos(vids) {
            const slots = vids.filter(v => v.youtube_url && getYouTubeId(v.youtube_url));
            if (!slots.length) return '';
            return slots.map(v => {
                const ytId = getYouTubeId(v.youtube_url);
                return `
                <div class="wbc-video-item">
                    ${v.titulo ? `<p class="wbc-video-title">${v.titulo}</p>` : ''}
                    <div class="wbc-video-embed">
                        <iframe src="https://www.youtube.com/embed/${ytId}" allowfullscreen loading="lazy"></iframe>
                    </div>
                </div>`;
            }).join('');
        }

        function renderStandingsTable(rows) {
            const pct = r => {
                if (r.jj === 0) return '.000';
                const val = r.jg / r.jj;
                if (val === 1) return '1.000';
                return '.' + String(Math.round(val * 1000)).padStart(3, '0');
            };
            return `
            <table class="wbc-standings-table">
                <thead>
                    <tr>
                        <th>Equipo</th>
                        <th>JJ</th><th>JG</th><th>JP</th><th>%</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(r => {
                        const isMex = r.equipo && r.equipo.includes('xico');
                        return `<tr ${isMex ? 'class="wbc-standings-row-mexico"' : ''}>
                            <td>${r.equipo}</td>
                            <td>${r.jj}</td><td>${r.jg}</td><td>${r.jp}</td>
                            <td>${pct(r)}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            <p class="wbc-standings-note">Grupo B · Daikin Park, Houston TX · Actualizado al último juego jugado</p>`;
        }

        // ── Determinar si hay usuario autenticado ─────────────────────
        let isAdmin = false;
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            isAdmin = !!user;
        } catch(e) {}

        // ── Admin: panel de galeria (actualizable sin reload) ─────────
        function buildAdminGalleryItems(items) {
            if (!items.length) return '<p style="color:#94a3b8;font-size:0.8rem;">Sin fotos aun.</p>';
            return '<div class="wbc-admin-gallery-list">' + items.map(item => `
                <div class="wbc-admin-gallery-item">
                    <img src="${item.imagen_url}" alt="">
                    <button class="wbc-admin-gallery-delete" onclick="wbcDeletePhoto(${item.id}, this)">×</button>
                </div>`).join('') + '</div>';
        }

        const adminPanel = isAdmin ? `
        <div class="wbc-admin-panel">
            <div class="container">
                <button class="wbc-admin-toggle" onclick="wbcToggleAdmin(this)">
                    ⚙ Panel Admin WBC <span id="wbc-admin-toggle-icon">▼</span>
                </button>
                <div class="wbc-admin-body" id="wbc-admin-body">

                    <!-- Galería uploader -->
                    <div class="wbc-admin-section">
                        <h4>📷 Subir foto a la galería</h4>
                        <input type="file" accept="image/*" id="wbc-photo-input" class="wbc-admin-input" style="padding:6px;">
                        <input type="text" id="wbc-photo-caption" class="wbc-admin-input" placeholder="Pie de foto (opcional)">
                        <button class="wbc-admin-btn" id="wbc-upload-btn" onclick="wbcUploadPhoto()">Publicar foto</button>
                        <div class="wbc-admin-status" id="wbc-upload-status"></div>
                        <div id="wbc-admin-gallery-list">${buildAdminGalleryItems(galeria)}</div>
                    </div>

                    <!-- Videos -->
                    <div class="wbc-admin-section">
                        <h4>🎬 Videos (3 slots — pega URL de YouTube)</h4>
                        ${[1,2,3].map(n => {
                            const v = videos.find(x => x.id === n) || {};
                            return `
                            <input type="text" id="wbc-vid-titulo-${n}" class="wbc-admin-input" placeholder="Título del video ${n} (opcional)" value="${v.titulo || ''}">
                            <input type="text" id="wbc-vid-url-${n}" class="wbc-admin-input" placeholder="URL YouTube (vacío = slot oculto)" value="${v.youtube_url || ''}">`;
                        }).join('<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:8px 0;">')}
                        <button class="wbc-admin-btn" onclick="wbcSaveVideos()">Guardar videos</button>
                        <div class="wbc-admin-status" id="wbc-videos-status"></div>
                    </div>

                    <!-- Posiciones editor -->
                    <div class="wbc-admin-section">
                        <h4>📊 Actualizar posiciones</h4>
                        <table class="wbc-posiciones-editor-table">
                            <thead><tr><th>Equipo</th><th>JJ</th><th>JG</th><th>JP</th></tr></thead>
                            <tbody>
                                ${posicionesData.map((r, i) => `
                                <tr>
                                    <td>${r.equipo}</td>
                                    <td><input type="number" class="wbc-pos-input" id="pos-jj-${i}" value="${r.jj}" min="0" max="4"></td>
                                    <td><input type="number" class="wbc-pos-input" id="pos-jg-${i}" value="${r.jg}" min="0" max="4"></td>
                                    <td><input type="number" class="wbc-pos-input" id="pos-jp-${i}" value="${r.jp}" min="0" max="4"></td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                        <button class="wbc-admin-btn" style="margin-top:10px;" onclick="wbcSavePosiciones()">Guardar posiciones</button>
                        <div class="wbc-admin-status" id="wbc-posiciones-status"></div>
                    </div>

                    <!-- Resultados editor -->
                    <div class="wbc-admin-section">
                        <h4>⚾ Actualizar resultados (Pool B)</h4>
                        ${calDias.map(d => `
                        <div style="color:#64748b;font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:12px 0 6px;border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;">${d.fecha}</div>
                        ${d.juegos.map(j => `
                        <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                            <span style="color:#94a3b8;font-size:0.75rem;min-width:100px;white-space:nowrap;">${j.local.substring(0,3).toUpperCase()} vs ${j.visit.substring(0,3).toUpperCase()}</span>
                            <input type="text" id="res-score-${j.id}" class="wbc-admin-input" placeholder="8-2" value="${j.resultado !== '—' ? j.resultado : ''}" style="width:60px;flex:none;">
                            <select id="res-clases-${j.id}" class="wbc-admin-input" style="width:auto;flex:none;">
                                <option value="pendiente" ${j.clases === 'pendiente' ? 'selected' : ''}>—</option>
                                <option value="ganado" ${j.clases === 'ganado' ? 'selected' : ''}>W</option>
                                <option value="perdido" ${j.clases === 'perdido' ? 'selected' : ''}>L</option>
                            </select>
                        </div>`).join('')}`).join('')}
                        <button class="wbc-admin-btn" style="margin-top:10px;" onclick="wbcSaveResultados()">Guardar resultados</button>
                        <div class="wbc-admin-status" id="wbc-resultados-status"></div>
                    </div>

                </div>
            </div>
        </div>` : '';

        const videoSection = `
        <div class="wbc-card">
            <div class="wbc-card-header">
                <span class="wbc-card-icon">🎬</span>
                <h2>Video</h2>
            </div>
            <div class="wbc-card-body" id="wbc-video-display">
                ${videos.some(v => v.youtube_url && getYouTubeId(v.youtube_url))
                    ? renderVideos(videos)
                    : '<p class="wbc-video-empty" style="text-align:center;color:#6b7280;padding:20px 0;">Los videos aparecerán aquí. Agrega URLs de YouTube desde el panel admin.</p>'}
            </div>
            <a href="https://www.youtube.com/@BeisJoven" target="_blank" rel="noopener" class="wbc-yt-cta">
                Ver toda la cobertura en video →
            </a>
        </div>`;

        const articleCount = articles.length;

        // ── HTML principal ────────────────────────────────────────────
        main.innerHTML = `
        <div class="wbc-hub">

            <!-- Tricolor -->
            <div class="wbc-tricolor">
                <div class="wbc-tricolor-verde"></div>
                <div class="wbc-tricolor-blanco"></div>
                <div class="wbc-tricolor-rojo"></div>
            </div>

            <!-- Hero — rediseño Marketing 03-mar-2026 -->
            <div class="wbc-hero-banner">
<!-- Hero image: Sergio reemplaza el 6 de marzo con foto desde Daikin Park -->
                <div class="wbc-hero-overlay">
                    <div class="container">
                        <img src="https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/public/imagenes/wbc26-white.png"
                             alt="World Baseball Classic 2026"
                             class="wbc-hero-logo"
                             style="display:none"
                             onload="this.style.display='block';this.nextElementSibling.style.display='none'"
                             onerror="this.style.display='none'">
                        <span class="wbc-hero-badge">World Baseball Classic 2026 · Houston</span>
                        <p class="wbc-hero-pre-title">México en el</p>
                        <h1 class="wbc-hero-title">WBC 2026</h1>
                        <p class="wbc-hero-subtitle">Cobertura completa del Clásico Mundial de Béisbol 2026</p>
                        <p class="wbc-hero-hashtag">#EsMiSangre  #WorldBaseballClassic</p>
                    </div>
                </div>
            </div>

            <!-- Sponsor strip CI — separado del hero (regla Jurídico) -->
            <a href="https://www.cajainmaculada.com.mx/" target="_blank" rel="noopener sponsored" class="wbc-sponsor-strip">
                <span class="wbc-sponsor-label">Cobertura presentada por</span>
                <span class="wbc-sponsor-divider"></span>
                <img src="https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/public/imagenes/ci-logo-horizontal.png"
                     alt="Caja Inmaculada"
                     class="wbc-sponsor-logo"
                     onerror="this.style.display='none'">
            </a>

            <!-- Panel admin (solo autenticado) -->
            ${adminPanel}

            <!-- Contenido: una columna -->
            <div class="wbc-content" style="padding-top:24px;">

                <!-- Bracket eliminatorio (posición principal) -->
                ${renderWBCBracket()}

                <!-- Featured article -->
                ${articles.length > 0 ? `
                <a href="/articulo/${articles[0].slug}" class="wbc-featured">
                    <img src="${articles[0].imagen_url || articles[0].image || ''}" alt="${articles[0].titulo || ''}" loading="lazy">
                    <div class="wbc-featured-overlay">
                        <span class="wbc-featured-cat">${articles[0].categoria?.nombre || 'MLB'}</span>
                        <h3 class="wbc-featured-title">${articles[0].titulo || ''}</h3>
                        ${articles[0].extracto ? `<p class="wbc-featured-excerpt">${articles[0].extracto}</p>` : ''}
                    </div>
                </a>
                ` : ''}

                <!-- Artículos -->
                <div class="wbc-articles-header">
                    <h2 class="wbc-articles-title">Toda la Cobertura</h2>
                    ${articleCount > 0 ? `<span class="wbc-article-count">${articleCount} artículo${articleCount !== 1 ? 's' : ''}</span>` : ''}
                    <a href="https://www.cajainmaculada.com.mx/" target="_blank" rel="noopener sponsored" class="wbc-articles-ci">
                        <img src="${ciLogoUrl}" alt="Caja Inmaculada" class="wbc-articles-ci-logo">
                    </a>
                </div>
                ${renderArticleCards(articles.slice(1))}

                <!-- Galería -->
                <div class="wbc-card">
                    <div class="wbc-card-header">
                        <span class="wbc-card-icon">📷</span>
                        <h2>Galería desde Houston</h2>
                    </div>
                    <div class="wbc-card-body" id="wbc-galeria-display">
                        ${renderGallery(galeria)}
                    </div>
                </div>

                <!-- Videos -->
                ${videoSection}

                <!-- Calendario + Posiciones Grupo B -->
                <div class="wbc-card">
                    <div class="wbc-card-header">
                        <span class="wbc-card-icon">📅</span>
                        <h2>Calendario WBC 2026</h2>
                    </div>
                    <div class="wbc-card-body" id="wbc-calendario-display">
                        ${calendarioContent}
                        <p class="wbc-calendar-note">Horas CDMX. Grupo B en Houston, eliminatoria en Miami. FOX Dep = FOX Deportes.<br>Resultados se actualizan tras cada juego.</p>
                    </div>
                </div>
                <div class="wbc-card" id="wbc-posiciones-card">
                    <div class="wbc-card-header">
                        <span class="wbc-card-icon">📊</span>
                        <h2>Posiciones Grupo B</h2>
                    </div>
                    <div class="wbc-card-body" id="wbc-posiciones-display">
                        ${renderStandingsTable(posicionesData)}
                    </div>
                </div>

                <!-- MÓDULO 4 — Cierre CI -->
                <a href="https://www.cajainmaculada.com.mx/" target="_blank" rel="noopener sponsored" class="ci-closing">
                    <p class="ci-closing-text">Esta cobertura es posible gracias a</p>
                    <img src="${ciLogoUrl}"
                         alt="Caja Inmaculada" class="ci-closing-logo">
                    <p class="ci-closing-sub">Patrocinador exclusivo del sector financiero en Beisjoven</p>
                </a>

                <!-- CTA Redes -->
                <div class="wbc-social-cta">
                    <p class="wbc-social-cta-eyebrow">Cobertura en vivo</p>
                    <p class="wbc-social-cta-title">Síguenos en vivo desde Houston</p>
                    <div class="wbc-social-icons">
                        <a href="https://x.com/beisjoven" target="_blank" rel="noopener" class="wbc-social-icon" aria-label="X / Twitter">
                            <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>
                        <a href="https://instagram.com/beisjoven" target="_blank" rel="noopener" class="wbc-social-icon" aria-label="Instagram">
                            <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                        </a>
                        <a href="https://facebook.com/beisjoven" target="_blank" rel="noopener" class="wbc-social-icon" aria-label="Facebook">
                            <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>
                    </div>
                </div>

            </div><!-- /wbc-content -->
        </div><!-- /wbc-hub -->
        `;

        // ── Funciones globales del hub (admin) ────────────────────────
        // ── Paginación numerada WBC ───────────────────────────────────
        let wbcCurrentPage = 0;
        function wbcRenderPagination() {
            const pagEl = document.getElementById('wbc-pagination');
            if (!pagEl) return;
            const items = document.querySelectorAll('.wbc-art-item');
            const totalPages = Math.ceil(items.length / WBC_PAGE_SIZE);
            if (totalPages <= 1) { pagEl.innerHTML = ''; return; }

            let html = '<div class="wbc-pagination">';
            // Flecha izquierda
            html += `<button class="wbc-page-btn" id="wbc-prev"${wbcCurrentPage === 0 ? ' disabled' : ''}>&#8592;</button>`;
            // Números
            let start = Math.max(0, wbcCurrentPage - 2);
            let end = Math.min(totalPages - 1, wbcCurrentPage + 2);
            if (end - start < 4) {
                if (start === 0) end = Math.min(totalPages - 1, 4);
                else start = Math.max(0, end - 4);
            }
            if (start > 0) {
                html += '<button class="wbc-page-btn" data-wbc-pg="0">1</button>';
                if (start > 1) html += '<span style="padding:0 0.2rem;opacity:0.4;">…</span>';
            }
            for (let i = start; i <= end; i++) {
                html += `<button class="wbc-page-btn${i === wbcCurrentPage ? ' active' : ''}" data-wbc-pg="${i}">${i + 1}</button>`;
            }
            if (end < totalPages - 1) {
                if (end < totalPages - 2) html += '<span style="padding:0 0.2rem;opacity:0.4;">…</span>';
                html += `<button class="wbc-page-btn" data-wbc-pg="${totalPages - 1}">${totalPages}</button>`;
            }
            // Flecha derecha
            html += `<button class="wbc-page-btn" id="wbc-next"${wbcCurrentPage >= totalPages - 1 ? ' disabled' : ''}>&#8594;</button>`;
            html += '</div>';
            pagEl.innerHTML = html;

            // Event listeners
            const prev = document.getElementById('wbc-prev');
            const next = document.getElementById('wbc-next');
            if (prev) prev.addEventListener('click', () => wbcGoToPage(wbcCurrentPage - 1));
            if (next) next.addEventListener('click', () => wbcGoToPage(wbcCurrentPage + 1));
            pagEl.querySelectorAll('.wbc-page-btn[data-wbc-pg]').forEach(btn => {
                btn.addEventListener('click', () => wbcGoToPage(parseInt(btn.getAttribute('data-wbc-pg'))));
            });
        }

        function wbcGoToPage(page) {
            const items = document.querySelectorAll('.wbc-art-item');
            const totalPages = Math.ceil(items.length / WBC_PAGE_SIZE);
            if (page < 0 || page >= totalPages) return;
            wbcCurrentPage = page;
            // Show/hide articles
            items.forEach(item => {
                const itemPage = parseInt(item.getAttribute('data-wbc-page'));
                item.style.display = itemPage === page ? '' : 'none';
            });
            // Show/hide branded card (always visible on page 0 since it's after art 3)
            const brandedCard = document.querySelector('.ci-branded-card');
            if (brandedCard) brandedCard.style.display = page === 0 ? '' : 'none';
            // Re-render pagination
            wbcRenderPagination();
            // Scroll to articles section
            const header = document.querySelector('.wbc-articles-header');
            if (header) header.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Initialize pagination after render
        setTimeout(() => wbcRenderPagination(), 100);

        // ── Scroll-to-top button ─────────────────────────────────────
        (function() {
            const btn = document.createElement('button');
            btn.id = 'wbc-scroll-top';
            btn.innerHTML = '&#8593;';
            btn.setAttribute('aria-label', 'Volver al inicio');
            document.body.appendChild(btn);
            window.addEventListener('scroll', () => {
                btn.style.display = window.scrollY > 600 ? 'flex' : 'none';
            });
            btn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        })();

        window.wbcToggleAdmin = function(btn) {
            const body = document.getElementById('wbc-admin-body');
            const icon = document.getElementById('wbc-admin-toggle-icon');
            body.classList.toggle('open');
            icon.textContent = body.classList.contains('open') ? '▲' : '▼';
        };

        window.wbcUploadPhoto = async function() {
            const fileInput = document.getElementById('wbc-photo-input');
            const captionInput = document.getElementById('wbc-photo-caption');
            const statusEl = document.getElementById('wbc-upload-status');
            const btn = document.getElementById('wbc-upload-btn');
            const file = fileInput.files[0];
            if (!file) { statusEl.textContent = 'Selecciona una foto primero.'; statusEl.className = 'wbc-admin-status error'; return; }
            btn.disabled = true; statusEl.className = 'wbc-admin-status';
            statusEl.textContent = 'Subiendo...';
            try {
                const ext = file.name.split('.').pop();
                const filename = 'wbc2026/' + Date.now() + '.' + ext;
                const { error: upErr } = await supabaseClient.storage
                    .from('imagenes').upload(filename, file, { cacheControl: '3600', upsert: false });
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabaseClient.storage.from('imagenes').getPublicUrl(filename);
                const { error: dbErr } = await supabaseClient.from('wbc_galeria')
                    .insert({ imagen_url: publicUrl, pie_de_foto: captionInput.value.trim() || null });
                if (dbErr) throw dbErr;
                statusEl.textContent = '✓ Publicado';
                fileInput.value = ''; captionInput.value = '';
                // Refresh gallery
                const { data: fresh } = await supabaseClient.from('wbc_galeria')
                    .select('id, imagen_url, pie_de_foto').order('created_at', { ascending: false }).limit(60);
                if (fresh) {
                    window._wbcGaleria = fresh;
                    _galVisible = WBC_GAL_PAGE;
                    document.getElementById('wbc-galeria-display').innerHTML = renderGallery(fresh);
                    document.getElementById('wbc-admin-gallery-list').innerHTML = buildAdminGalleryItems(fresh);
                }
            } catch(e) {
                statusEl.textContent = 'Error: ' + (e.message || e);
                statusEl.className = 'wbc-admin-status error';
            }
            btn.disabled = false;
        };

        // ── Gallery "Ver más" ────────────────────────────────────────
        let _galVisible = WBC_GAL_PAGE;
        window.wbcGalleryMore = function() {
            const items = document.querySelectorAll('.wbc-gallery-item[data-gal-idx]');
            const total = items.length;
            const next = Math.min(_galVisible + WBC_GAL_PAGE, total);
            for (let i = _galVisible; i < next; i++) {
                items[i].style.display = '';
            }
            _galVisible = next;
            const btn = document.getElementById('wbc-gallery-more');
            if (_galVisible >= total) {
                btn.style.display = 'none';
            } else {
                btn.textContent = 'Ver más fotos (' + (total - _galVisible) + ' más)';
            }
        };

        // ── Lightbox ────────────────────────────────────────────────────
        let _lbIdx = 0;
        window.wbcLightboxOpen = function(idx) {
            const items = window._wbcGaleria || [];
            if (!items.length) return;
            _lbIdx = idx;
            _lbShow();
            const lb = document.getElementById('wbc-lightbox');
            lb.classList.add('active');
            document.body.style.overflow = 'hidden';
            // swipe support
            let tx = 0;
            lb._ts = function(e) { tx = e.touches[0].clientX; };
            lb._te = function(e) {
                const dx = e.changedTouches[0].clientX - tx;
                if (Math.abs(dx) > 50) wbcLightboxNav(dx < 0 ? 1 : -1);
            };
            lb.addEventListener('touchstart', lb._ts, { passive: true });
            lb.addEventListener('touchend', lb._te, { passive: true });
        };
        window.wbcLightboxClose = function() {
            const lb = document.getElementById('wbc-lightbox');
            lb.classList.remove('active');
            document.body.style.overflow = '';
            if (lb._ts) lb.removeEventListener('touchstart', lb._ts);
            if (lb._te) lb.removeEventListener('touchend', lb._te);
        };
        window.wbcLightboxNav = function(dir) {
            const items = window._wbcGaleria || [];
            if (!items.length) return;
            _lbIdx = (_lbIdx + dir + items.length) % items.length;
            _lbShow();
        };
        function _lbShow() {
            const items = window._wbcGaleria || [];
            const item = items[_lbIdx];
            if (!item) return;
            document.getElementById('wbc-lightbox-img').src = item.imagen_url;
            document.getElementById('wbc-lightbox-img').alt = item.pie_de_foto || 'Foto WBC 2026';
            const cap = document.getElementById('wbc-lightbox-caption');
            cap.textContent = item.pie_de_foto || '';
            cap.style.display = item.pie_de_foto ? '' : 'none';
            document.getElementById('wbc-lightbox-counter').textContent = (_lbIdx + 1) + ' / ' + items.length;
        }
        // close on Escape key
        document.addEventListener('keydown', function(e) {
            const lb = document.getElementById('wbc-lightbox');
            if (!lb || !lb.classList.contains('active')) return;
            if (e.key === 'Escape') wbcLightboxClose();
            if (e.key === 'ArrowLeft') wbcLightboxNav(-1);
            if (e.key === 'ArrowRight') wbcLightboxNav(1);
        });
        // close on backdrop click
        document.addEventListener('click', function(e) {
            const lb = document.getElementById('wbc-lightbox');
            if (e.target === lb) wbcLightboxClose();
        });

        window.wbcDeletePhoto = async function(id, btn) {
            if (!confirm('Eliminar esta foto?')) return;
            btn.disabled = true;
            const { error } = await supabaseClient.from('wbc_galeria').delete().eq('id', id);
            if (error) { alert('Error: ' + error.message); btn.disabled = false; return; }
            const { data: fresh } = await supabaseClient.from('wbc_galeria')
                .select('id, imagen_url, pie_de_foto').order('created_at', { ascending: false }).limit(60);
            if (fresh) {
                window._wbcGaleria = fresh;
                _galVisible = WBC_GAL_PAGE;
                document.getElementById('wbc-galeria-display').innerHTML = renderGallery(fresh);
                document.getElementById('wbc-admin-gallery-list').innerHTML = buildAdminGalleryItems(fresh);
            }
        };

        window.wbcSaveVideos = async function() {
            const statusEl = document.getElementById('wbc-videos-status');
            statusEl.className = 'wbc-admin-status'; statusEl.textContent = 'Guardando...';
            try {
                const upserts = [1,2,3].map(n => ({
                    id: n,
                    titulo: document.getElementById('wbc-vid-titulo-' + n).value.trim() || null,
                    youtube_url: document.getElementById('wbc-vid-url-' + n).value.trim() || null
                }));
                const { error } = await supabaseClient.from('wbc_videos').upsert(upserts, { onConflict: 'id' });
                if (error) throw error;
                statusEl.textContent = '✓ Videos guardados';
                // Refresh video section
                const { data: freshVids } = await supabaseClient.from('wbc_videos')
                    .select('id, titulo, youtube_url').order('id').limit(3);
                if (freshVids) {
                    const rendered = renderVideos(freshVids);
                    const displayEl = document.getElementById('wbc-video-display');
                    if (displayEl) {
                        displayEl.innerHTML = rendered || '<p class="wbc-video-empty" style="text-align:center;color:#6b7280;padding:20px 0;">Los videos aparecerán aquí. Agrega URLs de YouTube desde el panel admin.</p>';
                    }
                }
            } catch(e) { statusEl.textContent = 'Error: ' + (e.message || e); statusEl.className = 'wbc-admin-status error'; }
        };

        window.wbcSavePosiciones = async function() {
            const statusEl = document.getElementById('wbc-posiciones-status');
            statusEl.className = 'wbc-admin-status'; statusEl.textContent = 'Guardando...';
            try {
                const rows = posicionesData.map((r, i) => ({
                    equipo: r.equipo,
                    jj: parseInt(document.getElementById('pos-jj-' + i).value) || 0,
                    jg: parseInt(document.getElementById('pos-jg-' + i).value) || 0,
                    jp: parseInt(document.getElementById('pos-jp-' + i).value) || 0,
                    orden: i + 1
                }));
                const { error } = await supabaseClient.from('wbc_posiciones')
                    .upsert(rows, { onConflict: 'equipo' });
                if (error) throw error;
                statusEl.textContent = '✓ Posiciones actualizadas';
                // Re-sort and refresh display
                rows.sort((a,b) => b.jg - a.jg || a.jp - b.jp);
                posicionesData = rows;
                document.getElementById('wbc-posiciones-display').innerHTML = renderStandingsTable(rows);
                // Refresh calendar to update records
                const calEl = document.getElementById('wbc-calendario-display');
                if (calEl) {
                    calEl.innerHTML = buildCalendarioSlider(calCurrentIdx)
                        + '<p class="wbc-calendar-note">Horas CDMX. FOX Dep = FOX Deportes. App = Fox Sports App.<br>Resultados se actualizan tras cada juego.</p>';
                }
            } catch(e) { statusEl.textContent = 'Error: ' + (e.message || e); statusEl.className = 'wbc-admin-status error'; }
        };

        window.wbcSaveResultados = async function() {
            const statusEl = document.getElementById('wbc-resultados-status');
            statusEl.className = 'wbc-admin-status'; statusEl.textContent = 'Guardando...';
            try {
                const allGames = getAllGames();
                const upserts = allGames.map(j => ({
                    id: j.id,
                    resultado: document.getElementById('res-score-' + j.id).value.trim() || '—',
                    clases: document.getElementById('res-clases-' + j.id).value
                }));
                const { error } = await supabaseClient.from('wbc_resultados')
                    .upsert(upserts, { onConflict: 'id' });
                if (error) throw error;
                upserts.forEach(u => {
                    const game = allGames.find(g => g.id === u.id);
                    if (game) { game.resultado = u.resultado; game.clases = u.clases; }
                });
                const displayEl = document.getElementById('wbc-calendario-display');
                if (displayEl) {
                    displayEl.innerHTML = buildCalendarioSlider(calCurrentIdx)
                        + '<p class="wbc-calendar-note">Horas CDMX. FOX Dep = FOX Deportes. App = Fox Sports App.<br>Resultados se actualizan tras cada juego.</p>';
                }
                statusEl.textContent = '✓ Resultados actualizados';
            } catch(e) { statusEl.textContent = 'Error: ' + (e.message || e); statusEl.className = 'wbc-admin-status error'; }
        };

        // ── Slider navigation ─────────────────────────────────────────
        window.wbcCalGoTo = function(idx) {
            calCurrentIdx = idx;
            const displayEl = document.getElementById('wbc-calendario-display');
            if (displayEl) {
                displayEl.innerHTML = buildCalendarioSlider(calCurrentIdx)
                    + '<p class="wbc-calendar-note">Horas CDMX. FOX Dep = FOX Deportes. App = Fox Sports App.<br>Resultados se actualizan tras cada juego.</p>';
            }
            // Scroll active tab into view
            const activeTab = document.querySelector('.wbc-cal-tab.active');
            if (activeTab) activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        };

        // Swipe support for mobile
        (function() {
            let startX = 0;
            const el = document.getElementById('wbc-calendario-display');
            if (!el) return;
            el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
            el.addEventListener('touchend', e => {
                const diff = startX - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 50) {
                    if (diff > 0 && calCurrentIdx < calDias.length - 1) wbcCalGoTo(calCurrentIdx + 1);
                    else if (diff < 0 && calCurrentIdx > 0) wbcCalGoTo(calCurrentIdx - 1);
                }
            }, { passive: true });
        })();

    },

    contacto: function() {
        const main = document.getElementById('main-content');
        
        main.innerHTML = `
            <section class="contacto-page">
                <div class="container" style="max-width:680px; padding-top:3rem; padding-bottom:3rem;">
                    <h1 style="margin-bottom:0.5rem;">Contacto</h1>
                    <p style="margin-bottom:2.5rem; opacity:0.75;">¿Tienes una noticia, sugerencia o quieres colaborar con Beisjoven? ¡Nos encantaría escucharte!</p>
                    
                    <div class="contacto-methods">
                        <div class="contacto-item">
                            <span class="contacto-icon">✉️</span>
                            <div>
                                <strong>Email</strong><br>
                                <a href="mailto:hola@beisjoven.com">hola@beisjoven.com</a>
                            </div>
                        </div>

                        <div class="contacto-item">
                            <span class="contacto-icon" style="font-size:1.6rem; line-height:1;">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </span>
                            <div>
                                <strong>WhatsApp</strong><br>
                                <span style="font-size:0.9rem; opacity:0.8;">¿Tienes una historia de béisbol o softbol en tu comunidad? Escríbenos.</span><br>
                                <a href="https://wa.me/5255285967411" target="_blank" rel="noopener" style="margin-top:0.3rem; display:inline-block;">+52 55 2859 6741</a>
                            </div>
                        </div>
                        
                        <div class="contacto-item">
                            <span class="contacto-icon">🌐</span>
                            <div>
                                <strong>Redes Sociales</strong><br>
                                <a href="https://facebook.com/beisjoven" target="_blank" rel="noopener">Facebook</a> · 
                                <a href="https://twitter.com/beisjoven" target="_blank" rel="noopener">X (Twitter)</a> · 
                                <a href="https://instagram.com/beisjoven" target="_blank" rel="noopener">Instagram</a> · 
                                <a href="https://youtube.com/@beisjoven" target="_blank" rel="noopener">YouTube</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
        
        document.title = 'Contacto - Beisjoven';
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
