// Páginas del Panel de Administración - Conectado a Supabase
// UPDATED: Feb 15, 2026 - Copy URL, Mobile Upload Fix, Media Gallery Scroll, Autosave, Toast Notifications

// Global variable for rich text editor instance
let contentEditor = null;

// C) Sanitización básica para prevenir XSS
function sanitizeHtmlBasic(html) {
    if (!html) return '';
    // 1) Elimina tags <script>...</script>
    let clean = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    // 2) Elimina atributos on*="..." (onclick, onerror, etc.)
    clean = clean.replace(/\son\w+="[^"]*"/gi, '');
    clean = clean.replace(/\son\w+='[^']*'/gi, '');
    // 3) Elimina javascript: en href
    clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
    return clean;
}

// ==================== MEDIA LIBRARY PICKER ====================
function openMediaPicker() {
    MediaLibrary.open(function(imageUrl) {
        document.getElementById('image').value = imageUrl;
        AdminPages.previewImage();
    });
}

// ==================== TOAST NOTIFICATION SYSTEM ====================
function showToast(message, type, duration) {
    type = type || 'success';
    duration = duration || 2500;
    var existing = document.getElementById('bj-toast');
    if (existing) existing.remove();
    
    var toast = document.createElement('div');
    toast.id = 'bj-toast';
    var bg = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#0369a1';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:14px 24px;border-radius:10px;color:white;font-size:0.95rem;font-weight:500;z-index:10000;opacity:0;transform:translateY(12px);transition:opacity 0.3s,transform 0.3s;max-width:360px;box-shadow:0 4px 20px rgba(0,0,0,0.2);background:' + bg + ';';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(function() {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });
    
    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px)';
        setTimeout(function() { toast.remove(); }, 300);
    }, duration);
}

// ==================== AUTOSAVE SYSTEM ====================
var autosaveInterval = null;

var Autosave = {
    STORAGE_KEY: 'bj_article_draft',
    INTERVAL_MS: 30000,
    
    save: function() {
        try {
            var title = document.getElementById('title');
            var excerpt = document.getElementById('excerpt');
            var category = document.getElementById('category');
            var author = document.getElementById('author');
            var image = document.getElementById('image');
            var featured = document.getElementById('featured');
            
            var content = '';
            if (contentEditor) {
                content = contentEditor.getValue();
            } else {
                var contentEl = document.getElementById('content');
                if (contentEl) content = contentEl.value;
            }
            
            if (!title?.value?.trim() && !content?.trim()) return;
            
            var draft = {
                titulo: title?.value || '',
                extracto: excerpt?.value || '',
                contenido: content || '',
                categoria_id: category?.value || '',
                autor_id: author?.value || '',
                imagen_url: image?.value || '',
                destacado: featured?.checked || false,
                savedAt: new Date().toISOString()
            };
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(draft));
            
            var indicator = document.getElementById('autosave-indicator');
            if (indicator) {
                var timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                indicator.innerHTML = '✓ Borrador guardado ' + timeStr;
                indicator.style.color = '#16a34a';
            }
        } catch (e) {
            console.warn('Autosave failed:', e);
        }
    },
    
    load: function() {
        try {
            var raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) { return null; }
    },
    
    clear: function() { localStorage.removeItem(this.STORAGE_KEY); },
    
    start: function() {
        this.stop();
        var self = this;
        autosaveInterval = setInterval(function() { self.save(); }, this.INTERVAL_MS);
    },
    
    stop: function() {
        if (autosaveInterval) { clearInterval(autosaveInterval); autosaveInterval = null; }
    }
};

const AdminPages = {

    // ==================== LOGIN ====================
    login: function() {
        // Si ya está logueado, ir al dashboard
        if (Auth.isLoggedIn()) {
            Router.navigate('/admin');
            return;
        }

        const main = document.getElementById('main-content');
        main.innerHTML = `
            <div class="login-page">
                <div class="login-container">
                    <div class="login-header">
                        <div class="login-logo">⚾</div>
                        <h1>Beisjoven</h1>
                        <p>Panel de Administración</p>
                    </div>
                    
                    <form id="login-form" class="login-form">
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" placeholder="tu@email.com" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="password">Contraseña</label>
                            <input type="password" id="password" placeholder="••••••••" required>
                        </div>
                        
                        <div id="login-error" class="error-message" style="display: none;"></div>
                        
                        <button type="submit" class="btn btn-primary btn-block">
                            Iniciar Sesión
                        </button>
                    </form>
                    
                    <div class="login-help">
                        <a href="/" target="_blank" style="color: #6b7280; text-decoration: none;">← Ir al sitio</a>
                    </div>
                </div>
            </div>
        `;

        // Manejar submit del formulario
        document.getElementById('login-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('login-error');
            const btn = e.target.querySelector('button[type="submit"]');
            
            btn.disabled = true;
            btn.textContent = 'Iniciando sesión...';
            
            const result = await Auth.login(email, password);
            
            if (result.success) {
                Router.navigate('/admin');
            } else {
                errorDiv.textContent = result.error;
                errorDiv.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Iniciar Sesión';
            }
        });

        document.title = 'Login - Beisjoven Admin';
    },

    // ==================== DASHBOARD ====================
    dashboard: async function() {
        if (!Auth.isLoggedIn()) {
            Router.navigate('/login');
            return;
        }

        const user = Auth.getUser();
        const main = document.getElementById('main-content');
        
        // Mostrar loading
        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}
                <div class="admin-main">
                    ${AdminComponents.header('Dashboard')}
                    <div class="admin-content">
                        <p>Cargando...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Cargar datos de Supabase
        const [articulos, videos, categorias] = await Promise.all([
            SupabaseAPI.getArticulos(500),
            SupabaseAPI.getVideos(100),
            SupabaseAPI.getCategorias()
        ]);

        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}
                
                <div class="admin-main">
                    ${AdminComponents.header('Dashboard')}
                    
                    <div class="admin-content">
                        <div style="background: linear-gradient(135deg, #c41e3a 0%, #9a1830 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                            <div>
                                <h2 style="font-family: Oswald, sans-serif; font-size: 1.8rem; margin: 0 0 5px 0;">¡Hola, ${user.name}!</h2>
                                <p style="margin: 0; opacity: 0.9;">Bienvenido al panel de administración de Beisjoven</p>
                            </div>
                            <a href="#" onclick="Router.navigate('/admin/nuevo'); return false;" style="background: white; color: #c41e3a; padding: 12px 24px; border-radius: 25px; font-weight: 600; text-decoration: none; white-space: nowrap;">+ Nuevo Artículo</a>
                        </div>
                        
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-icon">📝</div>
                                <div class="stat-info">
                                    <span class="stat-number">${articulos.length}</span>
                                    <span class="stat-label">Artículos</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">📹</div>
                                <div class="stat-info">
                                    <span class="stat-number">${videos.length}</span>
                                    <span class="stat-label">Videos</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">📁</div>
                                <div class="stat-info">
                                    <span class="stat-number">${categorias.length}</span>
                                    <span class="stat-label">Categorías</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="admin-section">
                            <h3>Artículos Recientes</h3>
                            ${articulos.length > 0 ? `
                                <div class="articles-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Título</th>
                                                <th>Categoría</th>
                                                <th>Fecha</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${articulos.slice(0, 5).map(article => `
                                                <tr>
                                                    <td>
                                                        <a href="/articulo/${article.slug}" target="_blank">
                                                            ${article.titulo.substring(0, 50)}${article.titulo.length > 50 ? '...' : ''}
                                                        </a>
                                                    </td>
                                                    <td><span class="badge">${article.categoria?.nombre || 'N/A'}</span></td>
                                                    <td>${new Date(article.fecha).toLocaleDateString('es-MX')}</td>
                                                    <td>
                                                        <a href="/admin/editar/${article.id}" class="btn-small">Editar</a>
                                                        <button onclick="AdminPages.copyArticleUrl('${article.slug}', this)" class="btn-small btn-url" title="Copiar URL">🔗</button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : `
                                <div class="empty-state-small">
                                    <p>No hay artículos aún</p>
                                    <a href="/admin/nuevo" class="btn btn-primary">Crear primer artículo</a>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.title = 'Dashboard - Beisjoven Admin';
    },

    // ==================== LISTA DE ARTÍCULOS ====================
    articles: async function() {
        if (!Auth.isLoggedIn()) {
            Router.navigate('/login');
            return;
        }

        const main = document.getElementById('main-content');
        
        // Mostrar loading
        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}
                <div class="admin-main">
                    ${AdminComponents.header('Artículos')}
                    <div class="admin-content"><p>Cargando artículos...</p></div>
                </div>
            </div>
        `;
        
        // Cargar artículos de Supabase
        const articulos = await SupabaseAPI.getArticulos(500);

        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}
                
                <div class="admin-main">
                    ${AdminComponents.header('Artículos')}
                    
                    <div class="admin-content">
                        <div class="content-header">
                            <p>Total: ${articulos.length} artículos</p>
                            <a href="/admin/nuevo" class="btn btn-primary">+ Nuevo Artículo</a>
                        </div>
                        
                        ${articulos.length > 0 ? `
                            <div class="articles-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Título</th>
                                            <th>Categoría</th>
                                            <th>Destacado</th>
                                            <th>Fecha</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${articulos.map(article => `
                                            <tr>
                                                <td>
                                                    <a href="/articulo/${article.slug}" target="_blank">
                                                        ${article.titulo.substring(0, 60)}${article.titulo.length > 60 ? '...' : ''}
                                                    </a>
                                                </td>
                                                <td><span class="badge">${article.categoria?.nombre || 'N/A'}</span></td>
                                                <td>${article.destacado ? '⭐' : '-'}</td>
                                                <td>${new Date(article.fecha).toLocaleDateString('es-MX')}</td>
                                                <td class="actions-cell">
                                                    <a href="/admin/editar/${article.id}" class="btn-small">Editar</a>
                                                    <button onclick="AdminPages.copyArticleUrl('${article.slug}', this)" class="btn-small btn-url" title="Copiar URL">🔗 URL</button>
                                                    <button onclick="AdminPages.deleteArticle(${article.id})" class="btn-small btn-danger">Eliminar</button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : `
                            <div class="empty-state">
                                <div class="empty-icon">📝</div>
                                <h3>No hay artículos</h3>
                                <p>Crea tu primer artículo para comenzar</p>
                                <a href="/admin/nuevo" class="btn btn-primary">Crear Artículo</a>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;

        document.title = 'Artículos - Beisjoven Admin';
    },

    // ==================== CREAR/EDITAR ARTÍCULO ====================
    // UPDATED: Now uses Media Library picker + Rich Text Editor
    editor: async function({ params }) {
        if (!Auth.isLoggedIn()) {
            Router.navigate('/login');
            return;
        }

        const isEdit = params && params.id;
        const main = document.getElementById('main-content');
        
        // Stop any existing autosave
        Autosave.stop();
        
        // Reset editor reference
        contentEditor = null;
        
        // Mostrar loading
        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}
                <div class="admin-main">
                    ${AdminComponents.header(isEdit ? 'Editar Artículo' : 'Nuevo Artículo')}
                    <div class="admin-content"><p>Cargando...</p></div>
                </div>
            </div>
        `;
        
        // Cargar categorías y autores
        const [categorias, autores] = await Promise.all([
            SupabaseAPI.getCategorias(),
            SupabaseAPI.getAutores()
        ]);
        
        // Si es edición, cargar el artículo
        let article = null;
        if (isEdit) {
            const { data, error } = await supabaseClient
                .from('articulos')
                .select('*')
                .eq('id', params.id)
                .single();
            
            if (data) article = data;
        }
        
        // Check for saved draft (only for new articles)
        let draft = null;
        let useDraft = false;
        if (!isEdit) {
            draft = Autosave.load();
            if (draft) {
                const savedTime = new Date(draft.savedAt).toLocaleString('es-MX', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                });
                useDraft = confirm('📝 Se encontró un borrador guardado (' + savedTime + ').\n\n¿Deseas restaurarlo?');
                if (!useDraft) { Autosave.clear(); draft = null; }
            }
        }

        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}
                
                <div class="admin-main">
                    ${AdminComponents.header(isEdit ? 'Editar Artículo' : 'Nuevo Artículo')}
                    
                    <div class="admin-content">
                        <form id="article-form" class="article-form">
                            <div class="form-grid">
                                <div class="form-main">
                                    <div class="form-group">
                                        <label for="title">Título *</label>
                                        <input type="text" id="title" value="${article?.titulo || (useDraft && draft ? draft.titulo : '') || ''}" placeholder="Título de la noticia" required>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="excerpt">Extracto *</label>
                                        <textarea id="excerpt" rows="2" placeholder="Breve descripción (aparece en tarjetas)" required>${article?.extracto || (useDraft && draft ? draft.extracto : '') || ''}</textarea>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Contenido *</label>
                                        <div id="content-editor-container"></div>
                                    </div>
                                </div>
                                
                                <div class="form-sidebar">
                                    <div class="form-group">
                                        <label for="category">Categoría *</label>
                                        <select id="category" required>
                                            <option value="">Seleccionar...</option>
                                            ${categorias.map(c => `
                                                <option value="${c.id}" ${article?.categoria_id === c.id ? 'selected' : (useDraft && draft && draft.categoria_id == c.id ? 'selected' : '')}>                                                    ${c.nombre}
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="author">Autor *</label>
                                        <select id="author" required>
                                            ${autores.map(a => `
                                                <option value="${a.id}" ${article?.autor_id === a.id ? 'selected' : (useDraft && draft && draft.autor_id == a.id ? 'selected' : '')}>                                                    ${a.nombre}
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Imagen del Artículo</label>
                                        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                                            <input type="url" id="image" value="${article?.imagen_url || (useDraft && draft ? draft.imagen_url : '') || ''}" placeholder="URL de la imagen..." style="flex: 1;" readonly>
                                            <button type="button" class="btn-media-picker" onclick="openMediaPicker()">
                                                📷 Seleccionar
                                            </button>
                                        </div>
                                        <div id="image-preview" class="image-preview">
                                            ${(article?.imagen_url || (useDraft && draft?.imagen_url)) ? `<img src="${article?.imagen_url || draft.imagen_url}" alt="Preview">` : '<span>Sin imagen</span>'}
                                        </div>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="featured" ${article?.destacado ? 'checked' : (useDraft && draft?.destacado ? 'checked' : '')}>
                                            Artículo destacado
                                        </label>
                                    </div>
                                    
                                    <div class="form-actions">
                                        <button type="submit" class="btn btn-primary btn-block">
                                            ${isEdit ? 'Guardar Cambios' : 'Publicar Artículo'}
                                        </button>
                                        <a href="/admin/articulos" class="btn btn-secondary btn-block">Cancelar</a>
                                    </div>
                                    
                                    <!-- Autosave indicator -->
                                    <div id="autosave-indicator" style="text-align: center; font-size: 0.8rem; color: #9ca3af; margin-top: 12px;">
                                        ${isEdit ? '' : 'Auto-guardado cada 30 segundos'}
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Initialize Rich Text Editor
        const initialContent = article?.contenido || (useDraft && draft ? draft.contenido : '') || '';
        
        if (typeof RichTextEditor !== 'undefined') {
            contentEditor = RichTextEditor.create(
                'content-editor-container',
                'content',
                initialContent
            );
        } else {
            // Fallback to plain textarea if RichTextEditor not loaded
            document.getElementById('content-editor-container').innerHTML = `
                <textarea id="content" rows="15" placeholder="Escribe el contenido del artículo aquí..." required>${initialContent}</textarea>
                <small>Puedes usar HTML básico: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;a&gt;</small>
            `;
        }
        
        // Initialize Media Library
        if (typeof MediaLibrary !== 'undefined') {
            MediaLibrary.init();
        }
        
        // Start autosave for new articles
        if (!isEdit) {
            Autosave.start();
        }

        // Manejar submit
        document.getElementById('article-form').addEventListener('submit', function(e) {
            e.preventDefault();
            AdminPages.saveArticle(isEdit ? parseInt(params.id) : null);
        });

        document.title = (isEdit ? 'Editar' : 'Nuevo Artículo') + ' - Beisjoven Admin';
    },

    // ==================== FUNCIONES AUXILIARES ====================

    previewImage: function() {
        const url = document.getElementById('image').value;
        const preview = document.getElementById('image-preview');
        
        if (url) {
            preview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<span>Error al cargar imagen</span>'">`;
        } else {
            preview.innerHTML = '<span>Sin imagen</span>';
        }
    },

    // UPDATED: Gets content from Rich Text Editor if available
    saveArticle: async function(editId) {
        const titulo = document.getElementById('title').value.trim();
        const extracto = document.getElementById('excerpt').value.trim();
        
        // Get content from Rich Text Editor or fallback to textarea
        let contenidoRaw;
        if (contentEditor) {
            contenidoRaw = contentEditor.getValue();
        } else {
            const contentTextarea = document.getElementById('content');
            contenidoRaw = contentTextarea ? contentTextarea.value.trim() : '';
        }
        
        const categoria_id = parseInt(document.getElementById('category').value);
        const autor_id = parseInt(document.getElementById('author').value);
        const imagen_url = document.getElementById('image').value.trim() || 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800';
        const destacado = document.getElementById('featured').checked;
        
        // Validate content
        if (!contenidoRaw || contenidoRaw === '<br>' || contenidoRaw === '<p><br></p>') {
            showToast('El contenido del artículo es requerido', 'error');
            return;
        }
        
        // C) Sanitizar contenido para prevenir XSS
        const contenido = sanitizeHtmlBasic(contenidoRaw);
        
        // Crear slug
        const slug = titulo.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        
        const articulo = {
            titulo: sanitizeHtmlBasic(titulo),
            slug,
            extracto: sanitizeHtmlBasic(extracto),
            contenido,
            categoria_id,
            autor_id,
            imagen_url,
            destacado,
            publicado: true
        };
        
        let result;
        
        if (editId) {
            // Editar existente
            result = await SupabaseAdmin.actualizarArticulo(editId, articulo);
            if (result.success) {
                showToast('✅ Artículo actualizado correctamente');
            } else {
                showToast('Error: ' + result.error, 'error');
                return;
            }
        } else {
            // Crear nuevo
            result = await SupabaseAdmin.crearArticulo(articulo);
            if (result.success) {
                Autosave.stop();
                Autosave.clear();
                showToast('✅ Artículo publicado correctamente');
            } else {
                showToast('Error: ' + result.error, 'error');
                return;
            }
        }
        
        setTimeout(function() { Router.navigate('/admin/articulos'); }, 800);
    },

    // Copiar URL del artículo al portapapeles
    copyArticleUrl: async function(slug, btnElement) {
        const url = `https://beisjoven.com/articulo/${slug}`;
        
        try {
            // Clipboard API (funciona en HTTPS - Chrome, Safari, Firefox)
            await navigator.clipboard.writeText(url);
        } catch (err) {
            // Fallback para navegadores que no soporten Clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
        
        // Feedback visual
        if (btnElement) {
            const originalText = btnElement.innerHTML;
            btnElement.innerHTML = '✅ Copiada';
            btnElement.style.background = '#16a34a';
            btnElement.style.color = 'white';
            setTimeout(() => {
                btnElement.innerHTML = originalText;
                btnElement.style.background = '';
                btnElement.style.color = '';
            }, 1500);
        }
    },

    deleteArticle: async function(id) {
        if (confirm('¿Estás seguro de eliminar este artículo? Esta acción no se puede deshacer.')) {
            const result = await SupabaseAdmin.eliminarArticulo(id);
            
            if (result.success) {
                showToast('✅ Artículo eliminado');
                setTimeout(function() { Router.navigate('/admin/articulos'); }, 800);
            } else {
                showToast('Error: ' + result.error, 'error');
            }
        }
    },

    logout: async function() {
        Autosave.stop();
        await Auth.logout();
        Router.navigate('/login');
    },

    // ==================== BIBLIOTECA DE MEDIOS ====================
    medios: async function() {
        if (!Auth.isLoggedIn()) {
            Router.navigate('/login');
            return;
        }

        const main = document.getElementById('main-content');
        
        // Mostrar loading
        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}
                <div class="admin-main">
                    ${AdminComponents.header('Biblioteca de Medios')}
                    <div class="admin-content"><p>Cargando imágenes...</p></div>
                </div>
            </div>
        `;
        
        // Cargar imágenes
        const imagenes = await SupabaseStorage.listarImagenes();

        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}
                
                <div class="admin-main">
                    ${AdminComponents.header('Biblioteca de Medios')}
                    
                    <div class="admin-content">
                        <!-- Zona de subida -->
                        <div class="upload-zone" id="upload-zone">
                            <label for="file-input" class="upload-content">
                                <div class="upload-icon">📷</div>
                                <p><strong>Toca para subir</strong> o arrastra imágenes aquí</p>
                                <small>JPG, PNG, GIF • Máx 5MB</small>
                            </label>
                            <input type="file" id="file-input" accept="image/jpeg,image/png,image/gif,image/webp" multiple>
                            <div id="upload-progress" class="upload-progress" style="display: none;">
                                <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
                                <p id="progress-text">Subiendo...</p>
                            </div>
                        </div>
                        
                        <!-- Image count -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin: 16px 0 8px;">
                            <p style="color: #6b7280; font-size: 0.9rem; margin: 0;">
                                ${imagenes.length} imagen${imagenes.length !== 1 ? 'es' : ''} en la biblioteca
                            </p>
                        </div>
                        
                        <!-- Galería de imágenes - scrollable -->
                        <div class="media-gallery" id="media-gallery" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; max-height: 65vh; overflow-y: auto; padding: 4px; -webkit-overflow-scrolling: touch;">
                            ${imagenes.length > 0 ? imagenes.map(img => `
                                <div class="media-item" data-url="${img.url}" data-nombre="${img.nombre}" style="position: relative; border-radius: 8px; overflow: hidden; aspect-ratio: 1; background: #f3f4f6;">
                                    <img src="${img.url}" alt="${img.nombre}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                                    <div class="media-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; gap: 8px; opacity: 0; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'" ontouchstart="this.style.opacity='1'" ontouchend="setTimeout(function(el){el.style.opacity='0'}.bind(null,this), 2000)">
                                        <button style="background:white;border:none;border-radius:50%;width:40px;height:40px;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;" onclick="event.stopPropagation(); AdminPages.copiarUrl('${img.url}')" title="Copiar URL">📋</button>
                                        <button style="background:#dc2626;border:none;border-radius:50%;width:40px;height:40px;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;" onclick="event.stopPropagation(); AdminPages.eliminarImagen('${img.nombre}')" title="Eliminar">🗑️</button>
                                    </div>
                                </div>
                            `).join('') : `
                                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #9ca3af;">
                                    <p style="font-size: 2rem; margin-bottom: 8px;">🖼️</p>
                                    <p>No hay imágenes aún</p>
                                    <p>Sube tu primera imagen arriba</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Event listeners para subida
        const fileInput = document.getElementById('file-input');
        const uploadZone = document.getElementById('upload-zone');
        
        fileInput.addEventListener('change', (e) => AdminPages.subirArchivos(e.target.files));
        
        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            AdminPages.subirArchivos(e.dataTransfer.files);
        });

        document.title = 'Medios - Beisjoven Admin';
    },

    // Subir archivos
    subirArchivos: async function(files) {
        const progressDiv = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const uploadContent = document.querySelector('.upload-content');
        
        if (!files || files.length === 0) return;
        
        uploadContent.style.display = 'none';
        progressDiv.style.display = 'block';
        
        let subidas = 0;
        const total = files.length;
        
        for (const archivo of files) {
            // Validar tamaño (5MB máx)
            if (archivo.size > 5 * 1024 * 1024) {
                showToast(archivo.name + ' es muy grande (máx 5MB)', 'error');
                continue;
            }
            
            // Validar tipo
            if (!archivo.type.startsWith('image/')) {
                showToast(archivo.name + ' no es una imagen', 'error');
                continue;
            }
            
            progressText.textContent = `Subiendo ${subidas + 1} de ${total}...`;
            progressFill.style.width = `${(subidas / total) * 100}%`;
            
            const result = await SupabaseStorage.subirImagen(archivo);
            
            if (result.success) {
                subidas++;
            } else {
                showToast('Error subiendo ' + archivo.name + ': ' + result.error, 'error');
            }
        }
        
        progressFill.style.width = '100%';
        progressText.textContent = `✅ ${subidas} imagen(es) subida(s)`;
        
        // Recargar la página después de un momento
        setTimeout(() => {
            Router.navigate('/admin/medios');
        }, 1000);
    },

    // Copiar URL al portapapeles
    copiarUrl: async function(url) {
        try {
            await navigator.clipboard.writeText(url);
            showToast('✅ URL copiada al portapapeles');
        } catch (err) {
            var textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('✅ URL copiada al portapapeles');
        }
    },

    // Eliminar imagen
    eliminarImagen: async function(nombre) {
        if (!confirm('¿Eliminar esta imagen?')) return;
        
        const result = await SupabaseStorage.eliminarImagen(nombre);
        
        if (result.success) {
            showToast('✅ Imagen eliminada');
            setTimeout(function() { Router.navigate('/admin/medios'); }, 800);
        } else {
            showToast('Error: ' + result.error, 'error');
        }
    },

    // ==================== GESTIÓN DE VIDEOS ====================
    
    videosList: async function() {
        if (!Auth.isLoggedIn()) {
            Router.navigate('/login');
            return;
        }

        const main = document.getElementById('main-content');
        
        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}
                <div class="admin-main">
                    ${AdminComponents.header('Videos')}
                    <div class="admin-content"><p>Cargando videos...</p></div>
                </div>
            </div>
        `;
        
        const videos = await SupabaseAPI.getVideos(100);

        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}
                
                <div class="admin-main">
                    ${AdminComponents.header('Videos')}
                    
                    <div class="admin-content">
                        <div class="content-header">
                            <p>Total: ${videos.length} videos</p>
                            <a href="/admin/videos/nuevo" class="btn btn-primary">+ Nuevo Video</a>
                        </div>
                        
                        ${videos.length > 0 ? `
                            <div class="articles-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Thumbnail</th>
                                            <th>Título</th>
                                            <th>Categoría</th>
                                            <th>Fecha</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${videos.map(video => `
                                            <tr>
                                                <td>
                                                    <img src="${video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}" 
                                                         alt="${video.titulo}" 
                                                         style="width: 120px; height: 68px; object-fit: cover; border-radius: 4px;">
                                                </td>
                                                <td>
                                                    <a href="/video/${video.slug}" target="_blank">
                                                        ${video.titulo.substring(0, 50)}${video.titulo.length > 50 ? '...' : ''}
                                                    </a>
                                                </td>
                                                <td><span class="badge">${video.categoria?.nombre || 'N/A'}</span></td>
                                                <td>${new Date(video.fecha).toLocaleDateString('es-MX')}</td>
                                                <td class="actions-cell">
                                                    <a href="/admin/videos/editar/${video.id}" class="btn-small">Editar</a>
                                                    <button onclick="AdminPages.deleteVideo(${video.id})" class="btn-small btn-danger">Eliminar</button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : `
                            <div class="empty-state">
                                <div class="empty-icon">📹</div>
                                <h3>No hay videos</h3>
                                <p>Agrega tu primer video de YouTube</p>
                                <a href="/admin/videos/nuevo" class="btn btn-primary">Agregar Video</a>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;

        document.title = 'Videos - Beisjoven Admin';
    },

    // Editor de video (crear/editar)
    videoEditor: async function({ params }) {
        if (!Auth.isLoggedIn()) {
            Router.navigate('/login');
            return;
        }

        const isEdit = params && params.id;
        const main = document.getElementById('main-content');
        
        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}
                <div class="admin-main">
                    ${AdminComponents.header(isEdit ? 'Editar Video' : 'Nuevo Video')}
                    <div class="admin-content"><p>Cargando...</p></div>
                </div>
            </div>
        `;
        
        const categorias = await SupabaseAPI.getCategorias();
        
        let video = null;
        if (isEdit) {
            const { data } = await supabaseClient
                .from('videos')
                .select('*')
                .eq('id', params.id)
                .single();
            video = data;
        }

        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}
                
                <div class="admin-main">
                    ${AdminComponents.header(isEdit ? 'Editar Video' : 'Nuevo Video')}
                    
                    <div class="admin-content">
                        <form id="video-form" class="article-form">
                            <div class="form-grid">
                                <div class="form-main">
                                    <div class="form-group">
                                        <label for="titulo">Título del Video *</label>
                                        <input type="text" id="titulo" value="${video?.titulo || ''}" placeholder="Título del video" required>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="youtube_id">ID de YouTube *</label>
                                        <input type="text" id="youtube_id" value="${video?.youtube_id || ''}" placeholder="ej: dQw4w9WgXcQ" required onchange="AdminPages.previewYoutube()">
                                        <small>Es el código que aparece después de "v=" en la URL de YouTube</small>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="descripcion">Descripción</label>
                                        <textarea id="descripcion" rows="4" placeholder="Descripción del video (opcional)">${video?.descripcion || ''}</textarea>
                                    </div>
                                </div>
                                
                                <div class="form-sidebar">
                                    <div class="form-group">
                                        <label for="categoria">Categoría</label>
                                        <select id="categoria">
                                            <option value="">Sin categoría</option>
                                            ${categorias.map(c => `
                                                <option value="${c.id}" ${video?.categoria_id === c.id ? 'selected' : ''}>
                                                    ${c.nombre}
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Preview</label>
                                        <div id="youtube-preview" class="image-preview">
                                            ${video?.youtube_id 
                                                ? `<img src="https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg" alt="Preview">`
                                                : '<span>Ingresa un ID de YouTube</span>'}
                                        </div>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="destacado" ${video?.destacado ? 'checked' : ''}>
                                            Video destacado
                                        </label>
                                    </div>
                                    
                                    <div class="form-actions">
                                        <button type="submit" class="btn btn-primary btn-block">
                                            ${isEdit ? 'Guardar Cambios' : 'Agregar Video'}
                                        </button>
                                        <a href="/admin/videos" class="btn btn-secondary btn-block">Cancelar</a>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('video-form').addEventListener('submit', function(e) {
            e.preventDefault();
            AdminPages.saveVideo(isEdit ? parseInt(params.id) : null);
        });

        document.title = (isEdit ? 'Editar Video' : 'Nuevo Video') + ' - Beisjoven Admin';
    },

    // Preview de YouTube
    previewYoutube: function() {
        const youtubeId = document.getElementById('youtube_id').value.trim();
        const preview = document.getElementById('youtube-preview');
        
        if (youtubeId) {
            preview.innerHTML = `<img src="https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg" alt="Preview" onerror="this.parentElement.innerHTML='<span>ID inválido</span>'">`;
        } else {
            preview.innerHTML = '<span>Ingresa un ID de YouTube</span>';
        }
    },

    // Guardar video
    saveVideo: async function(editId) {
        const titulo = document.getElementById('titulo').value.trim();
        const youtube_id = document.getElementById('youtube_id').value.trim();
        const descripcion = document.getElementById('descripcion').value.trim();
        const categoria_id = document.getElementById('categoria').value ? parseInt(document.getElementById('categoria').value) : null;
        const destacado = document.getElementById('destacado').checked;
        
        // Crear slug
        const slug = titulo.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        
        const videoData = {
            titulo: sanitizeHtmlBasic(titulo),
            slug,
            youtube_id,
            descripcion: sanitizeHtmlBasic(descripcion),
            categoria_id,
            destacado,
            publicado: true,
            thumbnail_url: `https://img.youtube.com/vi/${youtube_id}/maxresdefault.jpg`
        };
        
        let result;
        
        if (editId) {
            const { data, error } = await supabaseClient
                .from('videos')
                .update(videoData)
                .eq('id', editId)
                .select()
                .single();
            
            result = error ? { success: false, error: error.message } : { success: true, data };
            
            if (result.success) {
                showToast('✅ Video actualizado correctamente');
            } else {
                showToast('Error: ' + result.error, 'error');
                return;
            }
        } else {
            const { data, error } = await supabaseClient
                .from('videos')
                .insert([videoData])
                .select()
                .single();
            
            result = error ? { success: false, error: error.message } : { success: true, data };
            
            if (result.success) {
                showToast('✅ Video agregado correctamente');
            } else {
                showToast('Error: ' + result.error, 'error');
                return;
            }
        }
        
        setTimeout(function() { Router.navigate('/admin/videos'); }, 800);
    },

    // Eliminar video
    deleteVideo: async function(id) {
        if (!confirm('¿Eliminar este video?')) return;
        
        const { error } = await supabaseClient
            .from('videos')
            .delete()
            .eq('id', id);
        
        if (error) {
            showToast('Error: ' + error.message, 'error');
        } else {
            showToast('✅ Video eliminado');
            setTimeout(function() { Router.navigate('/admin/videos'); }, 800);
        }
    }
};

// Componentes del Admin
const AdminComponents = {
    
    sidebar: function() {
        const user = Auth.getUser();
        const currentPath = window.location.pathname;
        
        return `
            <aside class="admin-sidebar">
                <div class="sidebar-header">
                    <a href="/" class="sidebar-logo">
                        <span class="logo-icon">⚾</span>
                        <span>Beisjoven</span>
                    </a>
                </div>
                
                <div class="sidebar-user">
                    <div class="user-avatar">${user.avatar || '👤'}</div>
                    <div class="user-info">
                        <span class="user-name">${user.name}</span>
                        <span class="user-role">${user.role === 'admin' ? 'Administrador' : 'Editor'}</span>
                    </div>
                </div>
                
                <nav class="sidebar-nav">
                    <a href="/admin" onclick="AdminComponents.closeSidebarMobile()" class="${currentPath === '/admin' ? 'active' : ''}">
                        📊 Dashboard
                    </a>
                    <a href="/admin/articulos" onclick="AdminComponents.closeSidebarMobile()" class="${currentPath.includes('/articulos') ? 'active' : ''}">
                        📝 Artículos
                    </a>
                    <a href="/admin/nuevo" onclick="AdminComponents.closeSidebarMobile()" class="${currentPath === '/admin/nuevo' ? 'active' : ''}">
                        ➕ Nuevo Artículo
                    </a>
                    <a href="/admin/videos" onclick="AdminComponents.closeSidebarMobile()" class="${currentPath.includes('/videos') ? 'active' : ''}">
                        📹 Videos
                    </a>
                    <a href="/admin/medios" onclick="AdminComponents.closeSidebarMobile()" class="${currentPath === '/admin/medios' ? 'active' : ''}">
                        🖼️ Medios
                    </a>
                    <hr>
                    <a href="/" target="_blank">
                        🌐 Ver sitio
                    </a>
                    <a href="#" onclick="AdminPages.logout(); return false;">
                        🚪 Cerrar sesión
                    </a>
                </nav>
            </aside>
        `;
    },
    
    header: function(title) {
        return `
            <header class="admin-header">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <button class="mobile-menu-toggle" onclick="AdminComponents.toggleSidebar()">☰</button>
                    <h1>${title}</h1>
                </div>
                <div class="header-actions">
                    <span class="current-date">${new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
            </header>
        `;
    },
    
    toggleSidebar: function() {
        var sidebar = document.querySelector('.admin-sidebar');
        if (!sidebar) return;
        
        var isOpen = sidebar.classList.contains('mobile-open');
        
        if (isOpen) {
            sidebar.classList.remove('mobile-open');
            var overlay = document.querySelector('.sidebar-overlay');
            if (overlay) overlay.remove();
        } else {
            sidebar.classList.add('mobile-open');
            var overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            overlay.onclick = function() { AdminComponents.toggleSidebar(); };
            sidebar.parentElement.appendChild(overlay);
        }
    },
    
    closeSidebarMobile: function() {
        var sidebar = document.querySelector('.admin-sidebar');
        if (sidebar && sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
            var overlay = document.querySelector('.sidebar-overlay');
            if (overlay) overlay.remove();
        }
    }
};

// Exportar
if (typeof window !== 'undefined') {
    window.AdminPages = AdminPages;
    window.AdminComponents = AdminComponents;
}
