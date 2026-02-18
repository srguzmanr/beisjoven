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
                <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" rel="noopener" class="share-btn twitter">𝕏</a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener" class="share-btn facebook">f</a>
                <a href="https://wa.me/?text=${encodedTitle}%20${encodedUrl}" target="_blank" rel="noopener" class="share-btn whatsapp">W</a>
            </div>
        `;
    }
};

// Exportar
if (typeof window !== 'undefined') {
    window.Components = Components;
}
