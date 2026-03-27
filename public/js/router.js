// Router SPA para Beisjoven
// Maneja la navegación sin recargar la página

const Router = {
    routes: {},
    currentRoute: null,
    
    // Registrar una ruta
    register: function(path, handler) {
        this.routes[path] = handler;
    },
    
    // Inicializar el router
    init: function() {
        // Manejar clicks en enlaces
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (link && link.href.startsWith(window.location.origin)) {
                const url = new URL(link.href);
                if (!url.pathname.includes('.') && !link.hasAttribute('data-external') && link.getAttribute('target') !== '_blank') {
                    e.preventDefault();
                    this.navigate(url.pathname + url.search);
                }
            }
        });
        
        // Manejar botones de navegación del navegador
        window.addEventListener('popstate', () => {
            this.handleRoute(window.location.pathname + window.location.search);
        });
        
        // Cargar ruta inicial
        this.handleRoute(window.location.pathname + window.location.search);
    },
    
    // Navegar a una ruta
    navigate: function(path) {
        window.history.pushState({}, '', path);
        this.handleRoute(path);
        window.scrollTo(0, 0);
    },
    
    // Manejar una ruta
    handleRoute: function(fullPath) {
        const [path, queryString] = fullPath.split('?');
        const params = new URLSearchParams(queryString || '');
        
        // Encontrar la ruta que coincide
        let handler = null;
        let routeParams = {};
        
        for (const [routePath, routeHandler] of Object.entries(this.routes)) {
            const match = this._matchRoute(routePath, path);
            if (match) {
                handler = routeHandler;
                routeParams = match;
                break;
            }
        }
        
        if (handler) {
            this.currentRoute = path;
            handler({ params: routeParams, query: params });
        } else {
            // Ruta no encontrada - mostrar 404
            this._render404();
        }
        
        // Actualizar navegación activa
        this._updateActiveNav(path);
    },
    
    // Coincidir ruta con patrón (soporta :param)
    _matchRoute: function(pattern, path) {
        const patternParts = pattern.split('/').filter(Boolean);
        const pathParts = path.split('/').filter(Boolean);
        
        if (patternParts.length !== pathParts.length) {
            return null;
        }
        
        const params = {};
        
        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                params[patternParts[i].slice(1)] = pathParts[i];
            } else if (patternParts[i] !== pathParts[i]) {
                return null;
            }
        }
        
        return params;
    },
    
    // Actualizar enlace activo en la navegación
    _updateActiveNav: function(path) {
        document.querySelectorAll('nav a').forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === path || (path.startsWith(href) && href !== '/')) {
                link.classList.add('active');
            } else if (path === '/' && href === '/') {
                link.classList.add('active');
            }
        });
    },
    
    // Renderizar página 404
    _render404: function() {
        const main = document.getElementById('main-content');
        if (main) {
            main.innerHTML = `
                <div class="error-page">
                    <div class="container">
                        <h1>404</h1>
                        <h2>Página no encontrada</h2>
                        <p>Lo sentimos, la página que buscas no existe o ha sido movida.</p>
                        <a href="/" class="btn btn-primary">Volver al inicio</a>
                    </div>
                </div>
            `;
        }
    }
};

// Exportar
if (typeof window !== 'undefined') {
    window.Router = Router;
}
