// API de servicios para Beisjoven
// Simula las llamadas a una API REST real

const API = {
    // ==================== ARTÍCULOS ====================
    
    // Obtener todos los artículos
    getArticles: function(options = {}) {
        let articles = [...DB.articles];
        
        // Filtrar por categoría
        if (options.categoryId) {
            articles = articles.filter(a => a.categoryId === options.categoryId);
        }
        
        // Filtrar por categoría slug
        if (options.categorySlug) {
            const category = DB.categories.find(c => c.slug === options.categorySlug);
            if (category) {
                articles = articles.filter(a => a.categoryId === category.id);
            }
        }
        
        // Solo destacados
        if (options.featured) {
            articles = articles.filter(a => a.featured === true);
        }
        
        // Ordenar
        if (options.orderBy === 'views') {
            articles.sort((a, b) => b.views - a.views);
        } else {
            // Por defecto ordenar por fecha
            articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        }
        
        // Limitar resultados
        if (options.limit) {
            articles = articles.slice(0, options.limit);
        }
        
        // Agregar información relacionada
        return articles.map(article => this._enrichArticle(article));
    },
    
    // Obtener artículo por slug
    getArticleBySlug: function(slug) {
        const article = DB.articles.find(a => a.slug === slug);
        if (!article) return null;
        return this._enrichArticle(article);
    },
    
    // Obtener artículo por ID
    getArticleById: function(id) {
        const article = DB.articles.find(a => a.id === id);
        if (!article) return null;
        return this._enrichArticle(article);
    },
    
    // Enriquecer artículo con datos relacionados
    _enrichArticle: function(article) {
        return {
            ...article,
            category: DB.categories.find(c => c.id === article.categoryId),
            author: DB.authors.find(a => a.id === article.authorId),
            formattedDate: this._formatDate(article.publishedAt),
            readTime: this._calculateReadTime(article.content)
        };
    },
    
    // Buscar artículos
    searchArticles: function(query) {
        const searchTerm = query.toLowerCase();
        return DB.articles
            .filter(a => 
                a.title.toLowerCase().includes(searchTerm) ||
                a.excerpt.toLowerCase().includes(searchTerm) ||
                a.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            )
            .map(article => this._enrichArticle(article));
    },
    
    // Artículos relacionados
    getRelatedArticles: function(articleId, limit = 4) {
        const article = DB.articles.find(a => a.id === articleId);
        if (!article) return [];
        
        return DB.articles
            .filter(a => a.id !== articleId && a.categoryId === article.categoryId)
            .slice(0, limit)
            .map(a => this._enrichArticle(a));
    },
    
    // ==================== CATEGORÍAS ====================
    
    getCategories: function() {
        return DB.categories.map(category => ({
            ...category,
            articleCount: DB.articles.filter(a => a.categoryId === category.id).length
        }));
    },
    
    getCategoryBySlug: function(slug) {
        return DB.categories.find(c => c.slug === slug);
    },
    
    // ==================== EQUIPOS ====================
    
    getTeams: function() {
        return DB.teams.map(team => ({
            ...team,
            pct: (team.wins / (team.wins + team.losses)).toFixed(3)
        })).sort((a, b) => parseFloat(b.pct) - parseFloat(a.pct));
    },
    
    getTeamBySlug: function(slug) {
        return DB.teams.find(t => t.slug === slug);
    },
    
    // ==================== VIDEOS ====================
    
    getVideos: function(options = {}) {
        let videos = [...DB.videos];
        
        if (options.featured) {
            videos = videos.filter(v => v.featured === true);
        }
        
        if (options.categoryId) {
            videos = videos.filter(v => v.categoryId === options.categoryId);
        }
        
        videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        
        if (options.limit) {
            videos = videos.slice(0, options.limit);
        }
        
        return videos.map(video => ({
            ...video,
            category: DB.categories.find(c => c.id === video.categoryId),
            formattedViews: this._formatViews(video.views),
            timeAgo: this._timeAgo(video.publishedAt)
        }));
    },
    
    getVideoBySlug: function(slug) {
        const video = DB.videos.find(v => v.slug === slug);
        if (!video) return null;
        return {
            ...video,
            category: DB.categories.find(c => c.id === video.categoryId),
            formattedViews: this._formatViews(video.views)
        };
    },
    
    // ==================== AUTORES ====================
    
    getAuthors: function() {
        return DB.authors;
    },
    
    getAuthorBySlug: function(slug) {
        const author = DB.authors.find(a => a.slug === slug);
        if (!author) return null;
        return {
            ...author,
            articles: DB.articles
                .filter(a => a.authorId === author.id)
                .map(a => this._enrichArticle(a))
        };
    },
    
    // ==================== UTILIDADES ====================
    
    _formatDate: function(dateString) {
        const date = new Date(dateString);
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('es-MX', options);
    },
    
    _timeAgo: function(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        const intervals = [
            { label: 'año', seconds: 31536000 },
            { label: 'mes', seconds: 2592000 },
            { label: 'semana', seconds: 604800 },
            { label: 'día', seconds: 86400 },
            { label: 'hora', seconds: 3600 },
            { label: 'minuto', seconds: 60 }
        ];
        
        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                const plural = count > 1 ? (interval.label === 'mes' ? 'es' : 's') : '';
                return `Hace ${count} ${interval.label}${plural}`;
            }
        }
        
        return 'Hace un momento';
    },
    
    _formatViews: function(views) {
        if (views >= 1000000) {
            return (views / 1000000).toFixed(1) + 'M';
        }
        if (views >= 1000) {
            return (views / 1000).toFixed(1) + 'K';
        }
        return views.toString();
    },
    
    _calculateReadTime: function(content) {
        const wordsPerMinute = 200;
        const text = content.replace(/<[^>]*>/g, '');
        const words = text.split(/\s+/).length;
        const minutes = Math.ceil(words / wordsPerMinute);
        return `${minutes} min de lectura`;
    },
    
    // ==================== ESTADÍSTICAS (para admin) ====================
    
    getStats: function() {
        return {
            totalArticles: DB.articles.length,
            totalVideos: DB.videos.length,
            totalViews: DB.articles.reduce((sum, a) => sum + a.views, 0),
            totalCategories: DB.categories.length,
            articlesByCategory: DB.categories.map(cat => ({
                name: cat.name,
                count: DB.articles.filter(a => a.categoryId === cat.id).length
            }))
        };
    }
};

// Exportar
if (typeof window !== 'undefined') {
    window.API = API;
}
