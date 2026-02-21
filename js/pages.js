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
        
        const PAGE_SIZE = 20;
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
                        <p>${totalArticulos} artículos</p>
                    </header>
                    
                    <div class="two-column">
                        <div>
                            ${articles.length > 0 
                                ? `<div class="articles-list" id="category-articles-list">
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
        
        // Pagination: "Cargar más" button
        var catOffset = articulosCategoria.length;
        var catSlug = params.slug;
        var catTotal = totalArticulos;
        
        if (catOffset < catTotal) {
            var listEl = document.getElementById('category-articles-list');
            if (listEl) {
                var container = document.createElement('div');
                container.id = 'load-more-container';
                container.style.cssText = 'text-align:center;padding:2rem 0;';
                
                var btn = document.createElement('button');
                btn.className = 'btn btn-primary';
                btn.style.minWidth = '200px';
                btn.textContent = 'Cargar más artículos';
                
                var counter = document.createElement('p');
                counter.style.cssText = 'margin-top:0.5rem;color:#888;font-size:0.85rem;';
                counter.textContent = 'Mostrando ' + catOffset + ' de ' + catTotal;
                
                container.appendChild(btn);
                container.appendChild(counter);
                listEl.parentNode.insertBefore(container, listEl.nextSibling);
                
                btn.addEventListener('click', async function() {
                    btn.disabled = true;
                    btn.textContent = 'Cargando...';
                    
                    var newData = await SupabaseAPI.getArticulosByCategoriaPaginados(catSlug, PAGE_SIZE, catOffset);
                    catOffset += newData.length;
                    
                    if (newData.length > 0) {
                        var newHtml = newData.map(function(a) {
                            return Components.articleCardHorizontal(adaptArticle(a));
                        }).join('');
                        listEl.insertAdjacentHTML('beforeend', newHtml);
                    }
                    
                    if (catOffset < catTotal) {
                        btn.disabled = false;
                        btn.textContent = 'Cargar más artículos';
                        counter.textContent = 'Mostrando ' + catOffset + ' de ' + catTotal;
                    } else {
                        container.innerHTML = '';
                        var done = document.createElement('p');
                        done.style.cssText = 'color:#888;font-size:0.85rem;padding:1rem 0;';
                        done.textContent = 'Mostrando todos los ' + catTotal + ' artículos';
                        container.appendChild(done);
                    }
                });
            }
        }
    },
    
    // ==================== PÁGINA DE ARTÍCULO ====================
    // ==================== WBC 2026 HELPERS ====================
    _wbcBadge: function() {
        return `<div class="wbc-badge-presentado">
            <img src="https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/public/imagenes/beisjoven-og-default.png" 
                 alt="Caja Inmaculada" class="wbc-ci-logo-badge"
                 onerror="this.style.display='none'">
            <span>Cobertura presentada por <strong>Caja Inmaculada</strong></span>
        </div>`;
    },

    _wbcInlineBanner: function() {
        return `<div class="wbc-banner-inline">
            <img src="https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/public/imagenes/beisjoven-og-default.png"
                 alt="Caja Inmaculada — Presentado por" class="wbc-banner-img"
                 onerror="this.parentElement.style.display='none'">
        </div>`;
    },

    _injectWbcBannerAfterParagraph3: function(htmlContent) {
        // Inject inline banner after 3rd <p> tag
        let count = 0;
        return htmlContent.replace(/<\/p>/g, (match) => {
            count++;
            if (count === 3) {
                return '</p>' + Pages._wbcInlineBanner();
            }
            return match;
        });
    },

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
            } : { name: 'Redacción', slug: 'redaccion' }
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
                        ${article.es_wbc2026 ? Pages._wbcBadge() : ''}
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
                        <div id="article-image-credit"></div>
                    </figure>
                    
                    <div class="article-body">
                        <div class="article-content">
                            ${article.es_wbc2026 ? Pages._injectWbcBannerAfterParagraph3(renderContent(article.content)) : renderContent(article.content)}
                            
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
        
        document.title = `${article.title} - Beisjoven`;
        updateMetaTags({
            title: `${article.title} - Beisjoven`,
            description: article.excerpt,
            image: article.image,
            url: `https://beisjoven.com/articulo/${article.slug}`,
            type: 'article'
        });
        
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
    wbc2026: async function() {
        const main = document.getElementById('main-content');
        main.innerHTML = '<div class="loader"><div class="loader-spinner"></div><p>Cargando...</p></div>';

        // Inyectar CSS del hub — viaja con el JS para evitar desync de caché
        if (!document.getElementById('bj-wbc-hub-styles')) {
            const style = document.createElement('style');
            style.id = 'bj-wbc-hub-styles';
            style.textContent = `/* ================================================================
   WBC 2026 HUB — Beisjoven Media
   Diseño: Tournament hub editorial con energía de broadcast
   Paleta: Navy #0f2044 / Rojo #c4122e / Oro #f0a500 / Blanco
   ================================================================ */

/* ── Variables ──────────────────────────────────────────────── */
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
    --mex-white:  #ffffff;
    --mex-red:    #ce1126;
    background: var(--wbc-light);
    min-height: 100vh;
}

/* ── Franja tricolor México ─────────────────────────────────── */
.wbc-tricolor {
    display: flex;
    height: 5px;
    width: 100%;
}
.wbc-tricolor-verde  { flex: 1; background: var(--mex-green); }
.wbc-tricolor-blanco { flex: 1; background: var(--mex-white); border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
.wbc-tricolor-rojo   { flex: 1; background: var(--mex-red); }

/* ── Hero Banner ────────────────────────────────────────────── */
.wbc-hero-banner {
    position: relative;
    background: var(--wbc-navy);
    min-height: 420px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.wbc-hero-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.18;
    filter: saturate(0.5);
}
.wbc-hero-placeholder .wbc-hero-img { display: none; }

/* Textura diagonal sutil */
.wbc-hero-banner::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
        repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 40px,
            rgba(255,255,255,0.015) 40px,
            rgba(255,255,255,0.015) 41px
        );
    pointer-events: none;
}

/* Acento rojo diagonal en esquina */
.wbc-hero-banner::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--mex-green) 33.3%, var(--mex-white) 33.3%, var(--mex-white) 66.6%, var(--mex-red) 66.6%);
}

.wbc-hero-overlay {
    position: relative;
    z-index: 2;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px 0 56px;
}
.wbc-hero-overlay .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 20px;
}

/* Badge WBC */
.wbc-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(240,165,0,0.15);
    border: 1px solid rgba(240,165,0,0.4);
    color: var(--wbc-gold);
    padding: 6px 16px;
    border-radius: 100px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    font-family: 'Oswald', sans-serif;
}

.wbc-hero-title {
    font-family: 'Oswald', sans-serif;
    font-size: clamp(2.4rem, 7vw, 4rem);
    font-weight: 700;
    color: var(--wbc-white);
    line-height: 1.05;
    letter-spacing: -0.5px;
    margin: 0;
}
.wbc-hero-title span {
    color: var(--wbc-gold);
}

.wbc-hero-subtitle {
    font-family: 'Open Sans', sans-serif;
    font-size: 1.05rem;
    color: rgba(255,255,255,0.65);
    margin: 0;
    letter-spacing: 0.3px;
}

/* Strip del sponsor debajo del hero */
.wbc-sponsor-strip {
    background: var(--wbc-navy2);
    border-top: 1px solid rgba(255,255,255,0.08);
    padding: 14px 0;
    text-align: center;
}
.wbc-sponsor-strip .container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
}
.wbc-sponsor-label {
    font-family: 'Open Sans', sans-serif;
    font-size: 0.78rem;
    color: rgba(255,255,255,0.5);
    text-transform: uppercase;
    letter-spacing: 1px;
}
.wbc-sponsor-name {
    font-family: 'Oswald', sans-serif;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--wbc-gold);
    letter-spacing: 0.5px;
}
.wbc-sponsor-divider {
    width: 1px;
    height: 16px;
    background: rgba(255,255,255,0.2);
}
/* Placeholder para logo CI — se reemplaza con <img> cuando llegue el asset */
.wbc-sponsor-logo-placeholder {
    background: rgba(240,165,0,0.12);
    border: 1px dashed rgba(240,165,0,0.3);
    color: var(--wbc-gold);
    font-size: 0.72rem;
    padding: 4px 12px;
    border-radius: 4px;
    font-family: 'Open Sans', sans-serif;
}

/* ── Layout principal ───────────────────────────────────────── */
.wbc-layout {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 28px;
    padding: 28px 0 48px;
    align-items: start;
}

/* ── Sidebar ────────────────────────────────────────────────── */
.wbc-sidebar {
    display: flex;
    flex-direction: column;
    gap: 20px;
    position: sticky;
    top: 16px;
}
.wbc-sidebar-card {
    background: var(--wbc-white);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 8px rgba(0,0,0,0.07);
}
.wbc-sidebar-header {
    background: var(--wbc-navy);
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 10px;
}
.wbc-sidebar-header h3 {
    font-family: 'Oswald', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: var(--wbc-white);
    margin: 0;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}
.wbc-sidebar-header-icon {
    font-size: 1.1rem;
}
.wbc-sidebar-body { padding: 16px; }

/* ── Calendario — lista de partidos ────────────────────────── */
.wbc-game-list {
    display: flex;
    flex-direction: column;
    gap: 0;
}
.wbc-game-item {
    display: grid;
    grid-template-columns: 64px 1fr auto;
    align-items: center;
    gap: 0 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f3f4f6;
}
.wbc-game-item:last-child { border-bottom: none; }
.wbc-game-item.wbc-game-final { /* Cuartos */ }

.wbc-game-date {
    text-align: center;
}
.wbc-game-date-day {
    font-family: 'Oswald', sans-serif;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--wbc-navy);
    line-height: 1.1;
    display: block;
}
.wbc-game-date-mes {
    font-size: 0.72rem;
    color: var(--wbc-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: block;
}

.wbc-game-info {}
.wbc-game-matchup {
    font-family: 'Oswald', sans-serif;
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--wbc-text);
    line-height: 1.2;
    display: block;
}
.wbc-game-matchup strong { color: var(--wbc-red); }
.wbc-game-detail {
    font-size: 0.73rem;
    color: var(--wbc-muted);
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
}

.wbc-tv-badge {
    display: inline-block;
    background: var(--wbc-navy);
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Oswald', sans-serif;
    letter-spacing: 0.3px;
}
.wbc-tv-badge.tv-fox   { background: #000; }
.wbc-tv-badge.tv-fs1   { background: #003087; }
.wbc-tv-badge.tv-tubi  { background: #fa4b18; }
.wbc-tv-badge.tv-tbd   { background: #6b7280; }

.wbc-resultado-badge {
    font-family: 'Oswald', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--wbc-muted);
    text-align: right;
    min-width: 32px;
}
.wbc-resultado-badge.pendiente { color: #d1d5db; font-size: 0.72rem; }

.wbc-calendar-note {
    font-size: 0.72rem;
    color: var(--wbc-muted);
    margin: 12px 0 0;
    padding-top: 10px;
    border-top: 1px solid #f3f4f6;
    line-height: 1.5;
}

/* ── Posiciones placeholder ─────────────────────────────────── */
.wbc-posiciones-pending {
    text-align: center;
    padding: 24px 16px;
    color: var(--wbc-muted);
    font-size: 0.85rem;
    line-height: 1.6;
}
.wbc-posiciones-pending strong {
    display: block;
    font-family: 'Oswald', sans-serif;
    font-size: 1rem;
    color: var(--wbc-navy);
    margin-bottom: 4px;
}

/* ── Sección de artículos ───────────────────────────────────── */
.wbc-articles {}
.wbc-section-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 3px solid var(--wbc-red);
}
.wbc-section-title {
    font-family: 'Oswald', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--wbc-navy);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.wbc-article-count {
    font-size: 0.82rem;
    color: var(--wbc-muted);
    font-family: 'Open Sans', sans-serif;
}

/* Empty state */
.wbc-empty-state {
    text-align: center;
    padding: 64px 24px;
    background: var(--wbc-white);
    border-radius: 12px;
    box-shadow: 0 1px 8px rgba(0,0,0,0.06);
}
.wbc-empty-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 16px;
}
.wbc-empty-state h3 {
    font-family: 'Oswald', sans-serif;
    font-size: 1.3rem;
    color: var(--wbc-navy);
    margin: 0 0 8px;
}
.wbc-empty-state p {
    color: var(--wbc-muted);
    font-size: 0.9rem;
    margin: 0;
    line-height: 1.6;
}

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
    .wbc-hero-banner { min-height: 280px; }
    .wbc-hero-overlay { padding: 32px 0 40px; }
    .wbc-hero-title { font-size: 2rem; }

    .wbc-layout {
        grid-template-columns: 1fr;
        gap: 20px;
        padding: 20px 0 40px;
    }
    .wbc-sidebar { position: static; }

    /* Calendario compacto en móvil */
    .wbc-game-item {
        grid-template-columns: 52px 1fr auto;
        gap: 0 10px;
        padding: 10px 0;
    }
    .wbc-game-date-day { font-size: 1rem; }
}

@media (max-width: 480px) {
    .wbc-sponsor-strip .container { flex-direction: column; gap: 6px; }
    .wbc-sponsor-divider { display: none; }
}
`;
            document.head.appendChild(style);
        }

        updateMetaTags({
            title: 'Cobertura WBC 2026 — Beisjoven Media',
            description: 'Cobertura exclusiva del Clásico Mundial de Béisbol 2026. Pool B Houston. Presentado por Caja Inmaculada.',
            image: 'https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/public/imagenes/beisjoven-og-default.png',
            type: 'website'
        });

        // Fetch artículos WBC
        let articles = [];
        try {
            const { data, error } = await window.supabase
                .from('articulos')
                .select('id, titulo, slug, extracto, imagen_url, categoria, fecha_publicacion, autor')
                .eq('es_wbc2026', true)
                .eq('publicado', true)
                .order('fecha_publicacion', { ascending: false })
                .limit(50);
            if (!error && data) articles = data;
        } catch(e) { console.error('WBC fetch error:', e); }

        // Calendario Pool B — datos estáticos
        const calendario = [
            { fecha: 'Jue 6 mar', hora: 'TBD CT', partido: 'México vs Gran Bretaña', tv: 'FS1', resultado: '—' },
            { fecha: 'Sáb 8 mar', hora: 'TBD CT', partido: 'México vs Brasil', tv: 'FS1', resultado: '—' },
            { fecha: 'Dom 9 mar', hora: 'TBD CT', partido: 'México vs EUA', tv: 'FOX', resultado: '—' },
            { fecha: 'Mar 11 mar', hora: 'TBD CT', partido: 'México vs Italia', tv: 'Tubi', resultado: '—' },
            { fecha: '13–14 mar', hora: 'TBD', partido: 'Cuartos de Final', tv: 'TBD', resultado: '—' },
        ];

        // Helper para clase de TV badge
        const tvClass = (tv) => {
            if (tv === 'FOX') return 'tv-fox';
            if (tv === 'FS1') return 'tv-fs1';
            if (tv === 'Tubi') return 'tv-tubi';
            return 'tv-tbd';
        };

        // Parsear fecha para mostrar día y mes separados
        const parseFecha = (f) => {
            // Ej: "Jue 6 mar" → { dia: "6 mar", semana: "Jue" }
            const parts = f.split(' ');
            if (parts.length >= 3) return { semana: parts[0], dia: parts[1], mes: parts[2] };
            return { semana: '', dia: f, mes: '' };
        };

        const calendarioRows = calendario.map(j => {
            const f = parseFecha(j.fecha);
            const esFinal = j.partido.includes('Cuartos');
            return `
            <div class="wbc-game-item${esFinal ? ' wbc-game-final' : ''}">
                <div class="wbc-game-date">
                    <span class="wbc-game-date-day">${esFinal ? '13-14' : f.dia}</span>
                    <span class="wbc-game-date-mes">${esFinal ? 'mar' : f.mes}</span>
                </div>
                <div class="wbc-game-info">
                    <span class="wbc-game-matchup">${esFinal ? j.partido : j.partido.replace('México', '<strong>México</strong>')}</span>
                    <div class="wbc-game-detail">
                        <span>${j.hora}</span>
                        <span class="wbc-tv-badge ${tvClass(j.tv)}">${j.tv}</span>
                    </div>
                </div>
                <div class="wbc-resultado-badge ${j.resultado === '—' ? 'pendiente' : ''}">${j.resultado}</div>
            </div>`;
        }).join('');

        // Article cards
        const articleCards = articles.length > 0
            ? articles.map(a => {
                const fecha = new Date(a.fecha_publicacion).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' });
                return `
                <article class="article-card">
                    <a href="/articulo/${a.slug}" class="article-card-link">
                        <div class="article-card-image">
                            <img src="${a.imagen_url || ''}" alt="${a.titulo}" loading="lazy">
                            <span class="article-card-category cat-${(a.categoria||'').toLowerCase()}">${a.categoria || ''}</span>
                        </div>
                        <div class="article-card-content">
                            <h3 class="article-card-title">${a.titulo}</h3>
                            ${a.extracto ? `<p class="article-card-excerpt">${a.extracto}</p>` : ''}
                            <div class="article-card-meta">
                                <span>${a.autor || 'Redacción Beisjoven'}</span>
                                <span>${fecha}</span>
                            </div>
                        </div>
                    </a>
                </article>`;
            }).join('')
            : '<p class="wbc-empty">Los artículos de cobertura aparecerán aquí en cuanto comience el torneo.</p>';

        const articleCount = articles.length;

        main.innerHTML = `
            <div class="wbc-hub">

                <!-- Franja tricolor superior -->
                <div class="wbc-tricolor">
                    <div class="wbc-tricolor-verde"></div>
                    <div class="wbc-tricolor-blanco"></div>
                    <div class="wbc-tricolor-rojo"></div>
                </div>

                <!-- Hero banner -->
                <div class="wbc-hero-banner">
                    <img src="https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/public/imagenes/beisjoven-og-default.png"
                         alt="Cobertura WBC 2026"
                         class="wbc-hero-img"
                         onerror="this.parentElement.classList.add('wbc-hero-placeholder')">
                    <div class="wbc-hero-overlay">
                        <div class="container">
                            <div class="wbc-hero-badge">⚾ Clásico Mundial de Béisbol 2026</div>
                            <h1 class="wbc-hero-title">México en el<br><span>WBC 2026</span></h1>
                            <p class="wbc-hero-subtitle">Pool B · Houston, Texas · 6–14 de marzo</p>
                        </div>
                    </div>
                </div>

                <!-- Strip del sponsor -->
                <div class="wbc-sponsor-strip">
                    <div class="container">
                        <span class="wbc-sponsor-label">Cobertura exclusiva presentada por</span>
                        <div class="wbc-sponsor-divider"></div>
                        <span class="wbc-sponsor-name">Caja Inmaculada</span>
                        <div class="wbc-sponsor-logo-placeholder">Logo CI</div>
                    </div>
                </div>

                <div class="container">
                    <div class="wbc-layout">

                        <!-- Sidebar: Calendario + Posiciones -->
                        <aside class="wbc-sidebar">

                            <div class="wbc-sidebar-card">
                                <div class="wbc-sidebar-header">
                                    <span class="wbc-sidebar-header-icon">📅</span>
                                    <h3>Calendario Pool B</h3>
                                </div>
                                <div class="wbc-sidebar-body">
                                    <div class="wbc-game-list">
                                        ${calendarioRows}
                                    </div>
                                    <p class="wbc-calendar-note">Horas en tiempo del Centro (CT).<br>Resultados se actualizan tras cada juego.</p>
                                </div>
                            </div>

                            <div class="wbc-sidebar-card">
                                <div class="wbc-sidebar-header">
                                    <span class="wbc-sidebar-header-icon">📊</span>
                                    <h3>Posiciones Pool B</h3>
                                </div>
                                <div class="wbc-posiciones-pending">
                                    <strong>Disponible el 6 de marzo</strong>
                                    La tabla de posiciones aparecerá al inicio del torneo.
                                </div>
                            </div>

                        </aside>

                        <!-- Grid de artículos -->
                        <main class="wbc-articles">
                            <div class="wbc-section-header">
                                <h2 class="wbc-section-title">Toda la Cobertura</h2>
                                ${articleCount > 0 ? `<span class="wbc-article-count">${articleCount} artículo${articleCount !== 1 ? 's' : ''}</span>` : ''}
                            </div>
                            ${articleCount > 0
                                ? `<div class="articles-grid">${articleCards}</div>`
                                : `<div class="wbc-empty-state">
                                    <span class="wbc-empty-icon">⚾</span>
                                    <h3>La cobertura comienza el 6 de marzo</h3>
                                    <p>Aquí encontrarás todas las notas, crónicas y análisis<br>de la participación de México en el WBC 2026.</p>
                                   </div>`
                            }
                        </main>

                    </div>
                </div>

            </div>
        `;
    },

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
                                    <span class="contacto-icon">✉️</span>
                                    <div>
                                        <strong>Email</strong><br>
                                        <a href="mailto:contacto@beisjoven.com">contacto@beisjoven.com</a>
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
                                
                                <div class="contacto-item">
                                    <span class="contacto-icon">📍</span>
                                    <div>
                                        <strong>Ubicación</strong><br>
                                        Ciudad Obregón, Sonora, México
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
