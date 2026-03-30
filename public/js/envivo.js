// ==================== MÓDULO EN VIVO - BEISJOVEN ====================
// Sistema de streaming para transmisiones en vivo y replays
// Soporta: YouTube, Facebook Live, Vimeo

const EnVivo = {
    
    // ==================== DETECTAR PLATAFORMA ====================
    // Analiza la URL y determina qué servicio de streaming es
    detectPlatform: function(url) {
        if (!url) return null;
        
        // YouTube (varios formatos)
        // youtube.com/watch?v=ID, youtu.be/ID, youtube.com/live/ID
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return 'youtube';
        }
        
        // Facebook Live
        // facebook.com/video, facebook.com/watch, fb.watch
        if (url.includes('facebook.com') || url.includes('fb.watch')) {
            return 'facebook';
        }
        
        // Vimeo
        // vimeo.com/ID, player.vimeo.com
        if (url.includes('vimeo.com')) {
            return 'vimeo';
        }
        
        return null;
    },
    
    // ==================== EXTRAER ID DEL VIDEO ====================
    // Obtiene el identificador único del video según la plataforma
    extractVideoId: function(url, platform) {
        if (!url || !platform) return null;
        
        try {
            switch (platform) {
                case 'youtube':
                    // Formato: youtube.com/watch?v=VIDEO_ID
                    if (url.includes('watch?v=')) {
                        const urlParams = new URLSearchParams(new URL(url).search);
                        return urlParams.get('v');
                    }
                    // Formato: youtu.be/VIDEO_ID
                    if (url.includes('youtu.be/')) {
                        return url.split('youtu.be/')[1].split('?')[0];
                    }
                    // Formato: youtube.com/live/VIDEO_ID
                    if (url.includes('/live/')) {
                        return url.split('/live/')[1].split('?')[0];
                    }
                    // Formato: youtube.com/embed/VIDEO_ID
                    if (url.includes('/embed/')) {
                        return url.split('/embed/')[1].split('?')[0];
                    }
                    break;
                    
                case 'facebook':
                    // Facebook requiere la URL completa para el embed
                    return encodeURIComponent(url);
                    
                case 'vimeo':
                    // Formato: vimeo.com/VIDEO_ID
                    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                    return vimeoMatch ? vimeoMatch[1] : null;
            }
        } catch (e) {
            console.error('Error extrayendo ID del video:', e);
        }
        
        return null;
    },
    
    // ==================== GENERAR EMBED ====================
    // Crea el iframe con el reproductor según la plataforma
    generateEmbed: function(url, options = {}) {
        const platform = this.detectPlatform(url);
        const videoId = this.extractVideoId(url, platform);
        
        if (!platform || !videoId) {
            return `
                <div class="envivo-error">
                    <span class="envivo-error-icon">⚠️</span>
                    <p>URL de streaming no válida</p>
                    <small>Formatos soportados: YouTube, Facebook Live, Vimeo</small>
                </div>
            `;
        }
        
        const width = options.width || '100%';
        const height = options.height || '100%';
        const autoplay = options.autoplay ? 1 : 0;
        
        switch (platform) {
            case 'youtube':
                return `
                    <iframe 
                        src="https://www.youtube.com/embed/${videoId}?autoplay=${autoplay}&rel=0&modestbranding=1"
                        width="${width}" 
                        height="${height}"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen
                        class="envivo-iframe"
                    ></iframe>
                `;
                
            case 'facebook':
                return `
                    <iframe 
                        src="https://www.facebook.com/plugins/video.php?href=${videoId}&show_text=false&autoplay=${autoplay}"
                        width="${width}" 
                        height="${height}"
                        frameborder="0"
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                        allowfullscreen
                        class="envivo-iframe"
                    ></iframe>
                `;
                
            case 'vimeo':
                return `
                    <iframe 
                        src="https://player.vimeo.com/video/${videoId}?autoplay=${autoplay}&title=0&byline=0&portrait=0"
                        width="${width}" 
                        height="${height}"
                        frameborder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowfullscreen
                        class="envivo-iframe"
                    ></iframe>
                `;
                
            default:
                return `
                    <div class="envivo-error">
                        <span class="envivo-error-icon">❌</span>
                        <p>Plataforma no soportada</p>
                    </div>
                `;
        }
    },
    
    // ==================== OBTENER ÍCONO DE PLATAFORMA ====================
    getPlatformIcon: function(platform) {
        const icons = {
            youtube: '▶️',
            facebook: '📘',
            vimeo: '🎬'
        };
        return icons[platform] || '📺';
    },
    
    // ==================== OBTENER NOMBRE DE PLATAFORMA ====================
    getPlatformName: function(platform) {
        const names = {
            youtube: 'YouTube',
            facebook: 'Facebook Live',
            vimeo: 'Vimeo'
        };
        return names[platform] || 'Desconocido';
    },
    
    // ==================== FORMATEAR FECHA ====================
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // ==================== FORMATEAR VISTAS ====================
    formatViews: function(views) {
        if (views >= 1000000) {
            return (views / 1000000).toFixed(1) + 'M';
        }
        if (views >= 1000) {
            return (views / 1000).toFixed(1) + 'K';
        }
        return views.toString();
    }
};

// ==================== API DE STREAMS ====================
// Extensión de la API para manejar streams

const StreamsAPI = {
    
    // Obtener todos los streams
    getStreams: function(options = {}) {
        let streams = [...(DB.streams || [])];
        
        // Filtrar por estado (live, upcoming, replay)
        if (options.status) {
            streams = streams.filter(s => s.status === options.status);
        }
        
        // Filtrar por categoría
        if (options.categoryId) {
            streams = streams.filter(s => s.categoryId === options.categoryId);
        }
        
        // Ordenar
        if (options.orderBy === 'date') {
            streams.sort((a, b) => new Date(b.scheduledAt || b.publishedAt) - new Date(a.scheduledAt || a.publishedAt));
        } else if (options.orderBy === 'views') {
            streams.sort((a, b) => (b.views || 0) - (a.views || 0));
        }
        
        // Limitar resultados
        if (options.limit) {
            streams = streams.slice(0, options.limit);
        }
        
        // Enriquecer con datos de categoría
        return streams.map(stream => ({
            ...stream,
            category: DB.categories.find(c => c.id === stream.categoryId) || null,
            platform: EnVivo.detectPlatform(stream.url),
            formattedDate: EnVivo.formatDate(stream.scheduledAt || stream.publishedAt),
            formattedViews: EnVivo.formatViews(stream.views || 0)
        }));
    },
    
    // Obtener stream activo (en vivo)
    getLiveStream: function() {
        const streams = this.getStreams({ status: 'live' });
        return streams[0] || null;
    },
    
    // Obtener próximos eventos
    getUpcomingStreams: function(limit = 5) {
        return this.getStreams({ status: 'upcoming', orderBy: 'date', limit });
    },
    
    // Obtener replays
    getReplayStreams: function(limit = 10) {
        return this.getStreams({ status: 'replay', orderBy: 'date', limit });
    },
    
    // Obtener stream por ID
    getStreamById: function(id) {
        const streams = this.getStreams();
        return streams.find(s => s.id === parseInt(id)) || null;
    }
};

// ==================== COMPONENTES DE EN VIVO ====================

const EnVivoComponents = {
    
    // Reproductor principal
    mainPlayer: function(stream) {
        if (!stream) {
            return `
                <div class="envivo-player envivo-no-stream">
                    <div class="envivo-placeholder">
                        <span class="envivo-placeholder-icon">📺</span>
                        <h3>No hay transmisión en vivo</h3>
                        <p>Mira los replays de eventos anteriores mientras tanto</p>
                    </div>
                </div>
            `;
        }
        
        const isLive = stream.status === 'live';
        const platform = EnVivo.detectPlatform(stream.url);
        
        return `
            <div class="envivo-player">
                <div class="envivo-player-wrapper">
                    ${EnVivo.generateEmbed(stream.url, { autoplay: isLive })}
                </div>
                <div class="envivo-player-info">
                    <div class="envivo-player-header">
                        ${isLive ? '<span class="envivo-live-badge">🔴 EN VIVO</span>' : ''}
                        <span class="envivo-platform-badge">
                            ${EnVivo.getPlatformIcon(platform)} ${EnVivo.getPlatformName(platform)}
                        </span>
                        ${stream.category ? `<span class="envivo-category-badge">${stream.category.icon} ${stream.category.name}</span>` : ''}
                    </div>
                    <h2 class="envivo-player-title">${stream.title}</h2>
                    <p class="envivo-player-description">${stream.description || ''}</p>
                    <div class="envivo-player-meta">
                        <span>📅 ${stream.formattedDate}</span>
                        ${stream.views ? `<span>👁 ${stream.formattedViews} vistas</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    },
    
    // Tarjeta de stream para galería
    streamCard: function(stream, size = 'normal') {
        const platform = stream.platform || EnVivo.detectPlatform(stream.url);
        const isLive = stream.status === 'live';
        const isUpcoming = stream.status === 'upcoming';
        
        return `
            <article class="envivo-card ${size === 'small' ? 'envivo-card-small' : ''}" 
                     onclick="EnVivoPages.playStream(${stream.id})"
                     role="button"
                     tabindex="0">
                <div class="envivo-card-thumbnail">
                    <img src="${stream.thumbnail}" alt="${stream.title}" loading="lazy">
                    <div class="envivo-card-overlay">
                        ${isLive ? '<span class="envivo-live-badge">🔴 EN VIVO</span>' : ''}
                        ${isUpcoming ? '<span class="envivo-upcoming-badge">📅 PRÓXIMO</span>' : ''}
                        ${!isLive && !isUpcoming && stream.duration ? `<span class="envivo-duration">${stream.duration}</span>` : ''}
                    </div>
                    <div class="envivo-card-platform">
                        ${EnVivo.getPlatformIcon(platform)}
                    </div>
                </div>
                <div class="envivo-card-content">
                    <h3 class="envivo-card-title">${stream.title}</h3>
                    <div class="envivo-card-meta">
                        ${stream.category ? `<span>${stream.category.icon} ${stream.category.name}</span>` : ''}
                        <span>📅 ${stream.formattedDate}</span>
                    </div>
                    ${stream.views && !isUpcoming ? `<span class="envivo-card-views">👁 ${stream.formattedViews}</span>` : ''}
                </div>
            </article>
        `;
    },
    
    // Sección de próximos eventos
    upcomingSection: function(streams) {
        if (!streams || streams.length === 0) return '';
        
        return `
            <section class="envivo-section envivo-upcoming">
                <h3 class="envivo-section-title">📅 Próximos Eventos</h3>
                <div class="envivo-upcoming-list">
                    ${streams.map(s => `
                        <div class="envivo-upcoming-item">
                            <div class="envivo-upcoming-date">
                                <span class="envivo-upcoming-day">${new Date(s.scheduledAt).getDate()}</span>
                                <span class="envivo-upcoming-month">${new Date(s.scheduledAt).toLocaleDateString('es-MX', { month: 'short' })}</span>
                            </div>
                            <div class="envivo-upcoming-info">
                                <h4>${s.title}</h4>
                                <span>${s.category ? s.category.icon + ' ' + s.category.name : ''}</span>
                                <span>🕐 ${new Date(s.scheduledAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    },
    
    // Galería de replays
    replayGallery: function(streams) {
        if (!streams || streams.length === 0) {
            return `
                <div class="envivo-empty">
                    <span>📼</span>
                    <p>No hay replays disponibles todavía</p>
                </div>
            `;
        }
        
        return `
            <div class="envivo-gallery">
                ${streams.map(s => this.streamCard(s)).join('')}
            </div>
        `;
    }
};

// ==================== PÁGINAS DE EN VIVO ====================

const EnVivoPages = {
    
    // Página principal de En Vivo
    main: function() {
        const main = document.getElementById('main-content');
        
        // Obtener datos
        const liveStream = StreamsAPI.getLiveStream();
        const upcomingStreams = StreamsAPI.getUpcomingStreams(3);
        const replayStreams = StreamsAPI.getReplayStreams(8);
        
        // Si no hay stream en vivo, mostrar el último replay
        const mainStream = liveStream || (replayStreams[0] || null);
        const galleryStreams = liveStream ? replayStreams : replayStreams.slice(1);
        
        main.innerHTML = `
            ${Components.breadcrumb([
                { url: '/', text: 'Inicio' },
                { url: '/envivo', text: 'En Vivo' }
            ])}
            
            <section class="envivo-page">
                <div class="container">
                    <header class="envivo-header">
                        <h1>📺 En Vivo</h1>
                        <p>Transmisiones en vivo y replays de eventos deportivos</p>
                    </header>
                    
                    <div class="envivo-layout">
                        <div class="envivo-main">
                            ${EnVivoComponents.mainPlayer(mainStream)}
                            
                            <section class="envivo-section">
                                <h3 class="envivo-section-title">📼 Replays Disponibles</h3>
                                ${EnVivoComponents.replayGallery(galleryStreams)}
                            </section>
                        </div>
                        
                        <aside class="envivo-sidebar">
                            ${EnVivoComponents.upcomingSection(upcomingStreams)}
                            
                            <section class="envivo-section">
                                <h3 class="envivo-section-title">ℹ️ Información</h3>
                                <div class="envivo-info-box">
                                    <p>¿Eres productor y quieres transmitir tu evento en Beisjoven?</p>
                                    <a href="/contacto" class="btn btn-secondary">Contáctanos</a>
                                </div>
                            </section>
                        </aside>
                    </div>
                </div>
            </section>
        `;
        
        document.title = 'En Vivo - Beisjoven';
    },
    
    // Cambiar el stream en el reproductor principal
    playStream: function(streamId) {
        const stream = StreamsAPI.getStreamById(streamId);
        if (!stream) return;
        
        // Actualizar reproductor principal
        const playerContainer = document.querySelector('.envivo-main');
        if (playerContainer) {
            const playerHTML = EnVivoComponents.mainPlayer(stream);
            const gallerySection = playerContainer.querySelector('.envivo-section');
            playerContainer.innerHTML = playerHTML + (gallerySection ? gallerySection.outerHTML : '');
            
            // Scroll al reproductor
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
};

// ==================== EXPORTAR ====================

if (typeof window !== 'undefined') {
    window.EnVivo = EnVivo;
    window.StreamsAPI = StreamsAPI;
    window.EnVivoComponents = EnVivoComponents;
    window.EnVivoPages = EnVivoPages;
}
