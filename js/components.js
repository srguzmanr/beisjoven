// Componentes reutilizables para Beisjoven

const Components = {
    
    // ==================== TARJETA DE ARTÍCULO ====================
    articleCard: function(article, size = 'normal') {
        const sizeClass = size === 'small' ? 'news-card-small' : '';
        const dateStr = article.formattedDate || (article.date ? new Date(article.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
        const catSlug = article.category?.slug || 'general';
        const catName = article.category?.name || 'General';
        return `
            <article class="news-card ${sizeClass}">
                <a href="/articulo/${article.slug}" class="news-card-image">
                    <img src="${article.image}" alt="${article.title}" loading="lazy">
                </a>
                <div class="news-card-content">
                    <a href="/categoria/${catSlug}" class="category">${catName}</a>
                    <h3><a href="/articulo/${article.slug}">${article.title}</a></h3>
                    <div class="meta">
                        ${dateStr ? `<span>📅 ${dateStr}</span>` : ''}
                    </div>
                </div>
            </article>
        `;
    },
    
    // Tarjeta destacada (hero)
    articleCardFeatured: function(article) {
        const catSlug = article.category?.slug || 'general';
        const catName = article.category?.name || 'General';
        return `
            <article class="hero-main">
                <a href="/articulo/${article.slug}">
                    <img src="${article.image}" alt="${article.title}">
                </a>
                <div class="overlay">
                    <a href="/categoria/${catSlug}" class="category">${catName}</a>
                    <h2><a href="/articulo/${article.slug}">${article.title}</a></h2>
                    <p>${article.excerpt || ''}</p>
                </div>
            </article>
        `;
    },
    
    // Tarjeta sidebar hero
    articleCardSidebar: function(article) {
        const catSlug = article.category?.slug || 'general';
        const catName = article.category?.name || 'General';
        return `
            <article class="hero-sidebar-item">
                <a href="/articulo/${article.slug}">
                    <img src="${article.image}" alt="${article.title}">
                </a>
                <div class="overlay">
                    <a href="/categoria/${catSlug}" class="category">${catName}</a>
                    <h3><a href="/articulo/${article.slug}">${article.title}</a></h3>
                </div>
            </article>
        `;
    },
    
    // Tarjeta horizontal (featured)
    articleCardHorizontal: function(article) {
        const catSlug = article.category?.slug || 'general';
        const catName = article.category?.name || 'General';
        return `
            <article class="featured-card">
                <a href="/articulo/${article.slug}" class="featured-card-image">
                    <img src="${article.image}" alt="${article.title}">
                </a>
                <div class="featured-card-content">
                    <a href="/categoria/${catSlug}" class="category">${catName}</a>
                    <h3><a href="/articulo/${article.slug}">${article.title}</a></h3>
                    <p>${article.excerpt || ''}</p>
                </div>
            </article>
        `;
    },
    
    // ==================== TARJETA DE VIDEO — YouTube Style ====================
    videoCard: function(video) {
        // Auto-generate thumbnail from YouTube ID with fallback chain
        const youtubeId = video.youtubeId || '';
        const thumb = video.thumbnail || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
        const fallback = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
        const dateStr = video.timeAgo || (video.date ? new Date(video.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
        
        return `
            <article class="vid-card">
                <a href="/video/${video.slug}" class="vid-card-thumb">
                    <img src="${thumb}" alt="${video.title}" loading="lazy"
                         onerror="this.onerror=null;this.src='${fallback}'">
                    <div class="vid-card-play">
                        <svg viewBox="0 0 68 48" width="68" height="48">
                            <path d="M66.5 7.7c-.8-2.9-2.5-5.4-5.4-6.2C55.8.1 34 0 34 0S12.2.1 6.9 1.5C4 2.3 2.3 4.8 1.5 7.7.1 13 0 24 0 24s.1 11 1.5 16.3c.8 2.9 2.5 5.4 5.4 6.2C12.2 47.9 34 48 34 48s21.8-.1 27.1-1.5c2.9-.8 4.6-3.3 5.4-6.2C67.9 35 68 24 68 24s-.1-11-1.5-16.3z" fill="rgba(0,0,0,.75)"/>
                            <path d="M45 24L27 14v20" fill="#fff"/>
                        </svg>
                    </div>
                    ${video.duration ? `<span class="vid-card-duration">${video.duration}</span>` : ''}
                </a>
                <div class="vid-card-info">
                    <h3 class="vid-card-title"><a href="/video/${video.slug}">${video.title}</a></h3>
                    <div class="vid-card-meta">
                        ${video.category ? `<a href="/categoria/${video.category.slug}" class="vid-card-cat">${video.category.name}</a>` : ''}
                        ${dateStr ? `<span class="vid-card-date">${dateStr}</span>` : ''}
                    </div>
                </div>
            </article>
        `;
    },
    
    // ==================== TÍTULO DE SECCIÓN ====================
    sectionTitle: function(title, icon = '⚾', link = null) {
        return `
            <div class="section-title">
                <div class="icon">${icon}</div>
                <h2>${title}</h2>
                ${link ? `<a href="${link.url}" class="ver-mas">${link.text} →</a>` : ''}
            </div>
        `;
    },
    
    // ==================== TABLA DE POSICIONES ====================
    standingsTable: function(teams) {
        const rows = teams.map((team, index) => `
            <tr>
                <td>
                    <div class="team">
                        <span class="position">${index + 1}</span>
                        <a href="/equipo/${team.slug}">${team.name}</a>
                    </div>
                </td>
                <td>${team.wins}</td>
                <td>${team.losses}</td>
                <td>${team.pct}</td>
            </tr>
        `).join('');
        
        return `
            <div class="sidebar-widget">
                <h3 class="widget-title">🏆 Posiciones LMB 2025</h3>
                <table class="standings-table">
                    <thead>
                        <tr>
                            <th>Equipo</th>
                            <th>JG</th>
                            <th>JP</th>
                            <th>Pct</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
                <a href="/posiciones" class="widget-link">Ver tabla completa →</a>
            </div>
        `;
    },
    
    // ==================== WIDGET MÁS LEÍDOS ====================
    mostReadWidget: function(articles) {
        const items = articles.map((article, index) => `
            <li>
                <span class="number">${index + 1}</span>
                <a href="/articulo/${article.slug}">${article.title}</a>
            </li>
        `).join('');
        
        return `
            <div class="sidebar-widget">
                <h3 class="widget-title">📰 Lo Más Leído</h3>
                <ol class="most-read-list">
                    ${items}
                </ol>
            </div>
        `;
    },
    
    // ==================== TICKER DE NOTICIAS ====================
    ticker: function(articles) {
        const headlines = articles.map(a => a.title).join(' • ');
        return `
            <div class="ticker">
                <div class="container">
                    <div class="ticker-content">
                        <span class="ticker-label">🔴 Última Hora</span>
                        <span class="ticker-text">${headlines}</span>
                    </div>
                </div>
            </div>
        `;
    },
    
    // ==================== BREADCRUMB ====================
    breadcrumb: function(items) {
        const crumbs = items.map((item, index) => {
            if (index === items.length - 1) {
                return `<span class="current">${item.text}</span>`;
            }
            return `<a href="${item.url}">${item.text}</a>`;
        }).join(' <span class="separator">›</span> ');
        
        return `
            <nav class="breadcrumb">
                <div class="container">
                    ${crumbs}
                </div>
            </nav>
        `;
    },
    
    // ==================== PAGINACIÓN ====================
    pagination: function(currentPage, totalPages, baseUrl) {
        if (totalPages <= 1) return '';
        
        let pages = '';
        for (let i = 1; i <= totalPages; i++) {
            const active = i === currentPage ? 'active' : '';
            pages += `<a href="${baseUrl}?page=${i}" class="page-link ${active}">${i}</a>`;
        }
        
        return `
            <div class="pagination">
                ${currentPage > 1 ? `<a href="${baseUrl}?page=${currentPage - 1}" class="page-link">← Anterior</a>` : ''}
                ${pages}
                ${currentPage < totalPages ? `<a href="${baseUrl}?page=${currentPage + 1}" class="page-link">Siguiente →</a>` : ''}
            </div>
        `;
    },
    
    // ==================== LOADER ====================
    loader: function() {
        return `
            <div class="loader">
                <div class="loader-spinner"></div>
                <p>Cargando...</p>
            </div>
        `;
    },
    
    // ==================== MENSAJE VACÍO ====================
    emptyState: function(message, icon = '📭') {
        return `
            <div class="empty-state">
                <span class="icon">${icon}</span>
                <p>${message}</p>
            </div>
        `;
    },
    
    // ==================== TAGS ====================
    tags: function(tagList) {
        return tagList.map(tag => 
            `<a href="/buscar?q=${encodeURIComponent(tag)}" class="tag">${tag}</a>`
        ).join('');
    },
    
    // ==================== AUTOR ====================
    authorBox: function(author) {
        if (!author) return '';
        
        // Determinar si el avatar es una URL o un emoji
        const isUrl = author.avatar && (author.avatar.startsWith('http') || author.avatar.startsWith('//'));
        const avatarHtml = isUrl 
            ? `<img src="${author.avatar}" alt="${author.name}">`
            : (author.avatar || '👤');
        
        return `
            <div class="author-box">
                <div class="author-avatar">${avatarHtml}</div>
                <div class="author-info">
                    <a href="/autor/${author.slug || 'redaccion'}" class="author-name">${author.name || 'Redacción'}</a>
                    ${author.role ? `<span class="author-role">${author.role}</span>` : ''}
                </div>
            </div>
        `;
    },
    
    // ==================== SHARE BUTTONS ====================
    shareButtons: function(url, title) {
        const encodedUrl = encodeURIComponent(url);
        const encodedTitle = encodeURIComponent(title);
        
        return `
            <div class="share-buttons">
                <span>Compartir:</span>
                <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" rel="noopener" class="share-btn twitter"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener" class="share-btn facebook"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>
                <a href="https://wa.me/?text=${encodedTitle}%20${encodedUrl}" target="_blank" rel="noopener" class="share-btn whatsapp"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>
            </div>
        `;
    }
};

// Exportar
if (typeof window !== 'undefined') {
    window.Components = Components;
}
