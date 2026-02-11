// Páginas del Panel de Administración - Conectado a Supabase
// UPDATED: Feb 11, 2026 - Fixed mobile media picker image selection bug

// Global variable for rich text editor instance
let contentEditor = null;

// C) Sanitización básica para prevenir XSS
function sanitizeHtmlBasic(html) {
if (!html) return ‘’;
let clean = html.replace(/<script[\s\S]*?>[\s\S]*?</script>/gi, ‘’);
clean = clean.replace(/\son\w+=”[^”]*”/gi, ‘’);
clean = clean.replace(/\son\w+=’[^’]*’/gi, ‘’);
clean = clean.replace(/href\s*=\s*[”’]javascript:[^”’]*[”’]/gi, ‘href=”#”’);
return clean;
}

// ==================== MOBILE SIDEBAR TOGGLE ====================
function toggleSidebar() {
const sidebar = document.querySelector(’.admin-sidebar’);
const overlay = document.querySelector(’.sidebar-overlay’);
if (sidebar) {
sidebar.classList.toggle(‘open’);
if (overlay) overlay.classList.toggle(‘active’);
}
}

function closeSidebar() {
const sidebar = document.querySelector(’.admin-sidebar’);
const overlay = document.querySelector(’.sidebar-overlay’);
if (sidebar) sidebar.classList.remove(‘open’);
if (overlay) overlay.classList.remove(‘active’);
}

// ==================== MEDIA LIBRARY PICKER ====================
// FIX: Update BOTH desktop and mobile image fields + previews
function openMediaPicker() {
MediaLibrary.open(function(imageUrl) {
const desktopField = document.getElementById(‘image’);
const mobileField = document.getElementById(‘image-mobile’);
if (desktopField) desktopField.value = imageUrl;
if (mobileField) mobileField.value = imageUrl;
AdminPages.previewImage();
});
}

const AdminPages = {

```
// ==================== LOGIN ====================
// FIXED: async/await + loading state + mobile UX
login: function() {
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
                        <input type="email" id="email" placeholder="tu@email.com" required autocomplete="email" inputmode="email">
                    </div>
                    <div class="form-group">
                        <label for="password">Contraseña</label>
                        <input type="password" id="password" placeholder="••••••••" required autocomplete="current-password">
                    </div>
                    <div id="login-error" class="error-message" style="display: none;"></div>
                    <button type="submit" class="btn btn-primary btn-block" id="login-btn">
                        Iniciar Sesión
                    </button>
                </form>
                <div class="login-help">
                    <a href="/" style="color: #6b7280; text-decoration: none;">← Ir al sitio</a>
                </div>
            </div>
        </div>
    `;

    // FIXED: async handler with await + loading state
    document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');

        // Hide previous errors
        errorDiv.style.display = 'none';

        // Loading state
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-spinner"></span> Iniciando sesión...';

        try {
            const result = await Auth.login(email, password);

            if (result.success) {
                btn.innerHTML = '✅ ¡Bienvenido!';
                btn.style.background = '#16a34a';
                setTimeout(() => Router.navigate('/admin'), 600);
            } else {
                errorDiv.textContent = result.error;
                errorDiv.style.display = 'block';
                btn.disabled = false;
                btn.innerHTML = 'Iniciar Sesión';
                btn.style.background = '';
            }
        } catch (err) {
            errorDiv.textContent = 'Error de conexión. Intenta de nuevo.';
            errorDiv.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = 'Iniciar Sesión';
            btn.style.background = '';
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

    main.innerHTML = `
        <div class="admin-layout">
            ${AdminComponents.sidebar()}
            ${AdminComponents.sidebarOverlay()}
            <div class="admin-main">
                ${AdminComponents.header('Dashboard')}
                <div class="admin-content">
                    <p>Cargando...</p>
                </div>
            </div>
        </div>
    `;

    const [articulos, videos, categorias] = await Promise.all([
        SupabaseAPI.getArticulos(100),
        SupabaseAPI.getVideos(100),
        SupabaseAPI.getCategorias()
    ]);

    main.innerHTML = `
        <div class="admin-layout">
            ${AdminComponents.sidebar()}
            ${AdminComponents.sidebarOverlay()}
            <div class="admin-main">
                ${AdminComponents.header('Dashboard')}
                <div class="admin-content">

                    <div class="welcome-banner">
                        <div>
                            <h2 style="font-family: Oswald, sans-serif; font-size: 1.8rem; margin: 0 0 5px 0;">¡Hola, ${user.name}!</h2>
                            <p style="margin: 0; opacity: 0.9;">Bienvenido al panel de administración</p>
                        </div>
                        <a href="#" onclick="Router.navigate('/admin/nuevo'); return false;" class="welcome-btn">+ Nuevo Artículo</a>
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
                            <!-- Desktop table -->
                            <div class="articles-table desktop-only">
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
                                                    <a href="#" onclick="event.preventDefault(); ArticlePreview.open(${article.id})" class="preview-link">
                                                        ${article.titulo.substring(0, 50)}${article.titulo.length > 50 ? '...' : ''}
                                                    </a>
                                                </td>
                                                <td><span class="badge">${article.categoria?.nombre || 'N/A'}</span></td>
                                                <td>${new Date(article.fecha).toLocaleDateString('es-MX')}</td>
                                                <td>
                                                    <a href="/admin/editar/${article.id}" class="btn-small">Editar</a>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <!-- Mobile cards -->
                            <div class="article-cards mobile-only">
                                ${articulos.slice(0, 5).map(article => `
                                    <div class="article-card-mobile">
                                        <div class="article-card-header">
                                            <span class="badge">${article.categoria?.nombre || 'N/A'}</span>
                                            <span class="article-card-date">${new Date(article.fecha).toLocaleDateString('es-MX')}</span>
                                        </div>
                                        <h4 class="article-card-title">
                                            <a href="#" onclick="event.preventDefault(); ArticlePreview.open(${article.id})">
                                                ${article.titulo}
                                            </a>
                                        </h4>
                                        <div class="article-card-actions">
                                            <a href="/admin/editar/${article.id}" class="btn-small">✏️ Editar</a>
                                        </div>
                                    </div>
                                `).join('')}
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
    if (!Auth.isLoggedIn()) { Router.navigate('/login'); return; }

    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="admin-layout">
            ${AdminComponents.sidebar()}
            ${AdminComponents.sidebarOverlay()}
            <div class="admin-main">
                ${AdminComponents.header('Artículos')}
                <div class="admin-content"><p>Cargando artículos...</p></div>
            </div>
        </div>
    `;

    const articulos = await SupabaseAPI.getArticulos(100);

    main.innerHTML = `
        <div class="admin-layout">
            ${AdminComponents.sidebar()}
            ${AdminComponents.sidebarOverlay()}
            <div class="admin-main">
                ${AdminComponents.header('Artículos')}
                <div class="admin-content">
                    <div class="content-header">
                        <p>Total: ${articulos.length} artículos</p>
                        <a href="/admin/nuevo" class="btn btn-primary">+ Nuevo Artículo</a>
                    </div>

                    ${articulos.length > 0 ? `
                        <!-- Desktop table -->
                        <div class="articles-table desktop-only">
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
                                                <a href="#" onclick="event.preventDefault(); ArticlePreview.open(${article.id})" class="preview-link">
                                                    ${article.titulo.substring(0, 60)}${article.titulo.length > 60 ? '...' : ''}
                                                </a>
                                            </td>
                                            <td><span class="badge">${article.categoria?.nombre || 'N/A'}</span></td>
                                            <td>${article.destacado ? '⭐' : '-'}</td>
                                            <td>${new Date(article.fecha).toLocaleDateString('es-MX')}</td>
                                            <td class="actions-cell">
                                                <a href="/admin/editar/${article.id}" class="btn-small">Editar</a>
                                                <button onclick="AdminPages.deleteArticle(${article.id})" class="btn-small btn-danger">Eliminar</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        <!-- Mobile cards -->
                        <div class="article-cards mobile-only">
                            ${articulos.map(article => `
                                <div class="article-card-mobile">
                                    <div class="article-card-header">
                                        <span class="badge">${article.categoria?.nombre || 'N/A'}</span>
                                        <span class="article-card-date">${article.destacado ? '⭐ ' : ''}${new Date(article.fecha).toLocaleDateString('es-MX')}</span>
                                    </div>
                                    <h4 class="article-card-title">
                                        <a href="#" onclick="event.preventDefault(); ArticlePreview.open(${article.id})">
                                            ${article.titulo}
                                        </a>
                                    </h4>
                                    <div class="article-card-actions">
                                        <a href="/admin/editar/${article.id}" class="btn-small">✏️ Editar</a>
                                        <button onclick="AdminPages.deleteArticle(${article.id})" class="btn-small btn-danger">🗑️</button>
                                    </div>
                                </div>
                            `).join('')}
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
editor: async function({ params }) {
    if (!Auth.isLoggedIn()) { Router.navigate('/login'); return; }

    const isEdit = params && params.id;
    const main = document.getElementById('main-content');
    contentEditor = null;

    main.innerHTML = `
        <div class="admin-layout">
            ${AdminComponents.sidebar()}
            ${AdminComponents.sidebarOverlay()}
            <div class="admin-main">
                ${AdminComponents.header(isEdit ? 'Editar Artículo' : 'Nuevo Artículo')}
                <div class="admin-content"><p>Cargando...</p></div>
            </div>
        </div>
    `;

    const [categorias, autores] = await Promise.all([
        SupabaseAPI.getCategorias(),
        SupabaseAPI.getAutores()
    ]);

    let article = null;
    if (isEdit) {
        const { data } = await supabaseClient
            .from('articulos')
            .select('*')
            .eq('id', params.id)
            .single();
        if (data) article = data;
    }

    main.innerHTML = `
        <div class="admin-layout">
            ${AdminComponents.sidebar()}
            ${AdminComponents.sidebarOverlay()}
            <div class="admin-main">
                ${AdminComponents.header(isEdit ? 'Editar Artículo' : 'Nuevo Artículo')}
                <div class="admin-content">
                    <form id="article-form" class="article-form">
                        <div class="form-grid">
                            <div class="form-main">
                                <div class="form-group">
                                    <label for="title">Título *</label>
                                    <input type="text" id="title" value="${article?.titulo || ''}" placeholder="Título de la noticia" required>
                                </div>

                                <div class="form-group">
                                    <label for="excerpt">Extracto *</label>
                                    <textarea id="excerpt" rows="2" placeholder="Breve descripción (aparece en tarjetas)" required>${article?.extracto || ''}</textarea>
                                </div>

                                <!-- Mobile-only: meta fields inline before content -->
                                <div class="mobile-meta-fields mobile-only">
                                    <div class="form-row-inline">
                                        <div class="form-group">
                                            <label for="category-mobile">Categoría *</label>
                                            <select id="category-mobile" required>
                                                <option value="">Seleccionar...</option>
                                                ${categorias.map(c => `
                                                    <option value="${c.id}" ${article?.categoria_id === c.id ? 'selected' : ''}>
                                                        ${c.nombre}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label for="author-mobile">Autor *</label>
                                            <select id="author-mobile" required>
                                                ${autores.map(a => `
                                                    <option value="${a.id}" ${article?.autor_id === a.id ? 'selected' : ''}>
                                                        ${a.nombre}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>Imagen</label>
                                        <div style="display: flex; gap: 8px;">
                                            <input type="url" id="image-mobile" value="${article?.imagen_url || ''}" placeholder="URL..." style="flex: 1;" readonly>
                                            <button type="button" class="btn-media-picker" onclick="openMediaPicker()">📷</button>
                                        </div>
                                        <div id="image-preview-mobile" class="image-preview" style="margin-top: 8px;">
                                            ${article?.imagen_url ? `<img src="${article.imagen_url}" alt="Preview">` : '<span>Sin imagen</span>'}
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="featured-mobile" ${article?.destacado ? 'checked' : ''}>
                                            Artículo destacado
                                        </label>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>Contenido *</label>
                                    <div id="content-editor-container"></div>
                                </div>
                            </div>

                            <!-- Desktop sidebar -->
                            <div class="form-sidebar desktop-only">
                                <div class="form-card">
                                    <div class="form-group">
                                        <label for="category">Categoría *</label>
                                        <select id="category" required>
                                            <option value="">Seleccionar...</option>
                                            ${categorias.map(c => `
                                                <option value="${c.id}" ${article?.categoria_id === c.id ? 'selected' : ''}>
                                                    ${c.nombre}
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="author">Autor *</label>
                                        <select id="author" required>
                                            ${autores.map(a => `
                                                <option value="${a.id}" ${article?.autor_id === a.id ? 'selected' : ''}>
                                                    ${a.nombre}
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>
                                </div>
                                <div class="form-card">
                                    <div class="form-group">
                                        <label>Imagen del Artículo</label>
                                        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                                            <input type="url" id="image" value="${article?.imagen_url || ''}" placeholder="URL de la imagen..." style="flex: 1;" readonly>
                                            <button type="button" class="btn-media-picker" onclick="openMediaPicker()">
                                                📷 Seleccionar
                                            </button>
                                        </div>
                                        <div id="image-preview" class="image-preview">
                                            ${article?.imagen_url ? `<img src="${article.imagen_url}" alt="Preview">` : '<span>Sin imagen</span>'}
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="featured" ${article?.destacado ? 'checked' : ''}>
                                            Artículo destacado
                                        </label>
                                    </div>
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary btn-block">
                                        ${isEdit ? 'Guardar Cambios' : 'Publicar Artículo'}
                                    </button>
                                    <a href="/admin/articulos" class="btn btn-secondary btn-block">Cancelar</a>
                                </div>
                            </div>
                        </div>

                        <!-- Mobile sticky publish bar -->
                        <div class="mobile-publish-bar mobile-only">
                            <a href="/admin/articulos" class="btn btn-secondary">Cancelar</a>
                            <button type="submit" class="btn btn-primary">
                                ${isEdit ? '💾 Guardar' : '🚀 Publicar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Initialize Rich Text Editor
    if (typeof RichTextEditor !== 'undefined') {
        contentEditor = RichTextEditor.create(
            'content-editor-container',
            'content',
            article?.contenido || ''
        );
    } else {
        document.getElementById('content-editor-container').innerHTML = `
            <textarea id="content" rows="15" placeholder="Escribe el contenido del artículo aquí..." required>${article?.contenido || ''}</textarea>
            <small>Puedes usar HTML básico: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;a&gt;</small>
        `;
    }

    // Initialize Media Library
    if (typeof MediaLibrary !== 'undefined') {
        MediaLibrary.init();
    }

    // Sync mobile ↔ desktop fields
    AdminPages._syncFormFields();

    // Handle submit
    document.getElementById('article-form').addEventListener('submit', function(e) {
        e.preventDefault();
        AdminPages.saveArticle(isEdit ? parseInt(params.id) : null);
    });

    document.title = (isEdit ? 'Editar' : 'Nuevo Artículo') + ' - Beisjoven Admin';
},

// Sync mobile and desktop form fields
_syncFormFields: function() {
    const pairs = [
        ['category', 'category-mobile'],
        ['author', 'author-mobile'],
        ['image', 'image-mobile'],
        ['featured', 'featured-mobile']
    ];

    pairs.forEach(([desktopId, mobileId]) => {
        const desktop = document.getElementById(desktopId);
        const mobile = document.getElementById(mobileId);
        if (!desktop || !mobile) return;

        const isCheckbox = desktop.type === 'checkbox';

        desktop.addEventListener('change', () => {
            if (isCheckbox) mobile.checked = desktop.checked;
            else mobile.value = desktop.value;
        });

        mobile.addEventListener('change', () => {
            if (isCheckbox) desktop.checked = mobile.checked;
            else desktop.value = mobile.value;
        });
    });
},

// ==================== FUNCIONES AUXILIARES ====================
// FIX: Update both desktop and mobile image previews
previewImage: function() {
    const url = document.getElementById('image')?.value || document.getElementById('image-mobile')?.value;
    const imgHtml = url
        ? `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<span>Error al cargar imagen</span>'">`
        : '<span>Sin imagen</span>';
    const desktopPreview = document.getElementById('image-preview');
    const mobilePreview = document.getElementById('image-preview-mobile');
    if (desktopPreview) desktopPreview.innerHTML = imgHtml;
    if (mobilePreview) mobilePreview.innerHTML = imgHtml;
},

saveArticle: async function(editId) {
    const titulo = document.getElementById('title').value.trim();
    const extracto = document.getElementById('excerpt').value.trim();

    let contenidoRaw;
    if (contentEditor) {
        contenidoRaw = contentEditor.getValue();
    } else {
        const contentTextarea = document.getElementById('content');
        contenidoRaw = contentTextarea ? contentTextarea.value.trim() : '';
    }

    // Get values from whichever fields exist (mobile or desktop)
    const categoryEl = document.getElementById('category') || document.getElementById('category-mobile');
    const authorEl = document.getElementById('author') || document.getElementById('author-mobile');
    const imageEl = document.getElementById('image') || document.getElementById('image-mobile');
    const featuredEl = document.getElementById('featured') || document.getElementById('featured-mobile');

    const categoria_id = parseInt(categoryEl.value);
    const autor_id = parseInt(authorEl.value);
    const imagen_url = imageEl?.value?.trim() || 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800';
    const destacado = featuredEl?.checked || false;

    if (!contenidoRaw || contenidoRaw === '<br>' || contenidoRaw === '<p><br></p>') {
        alert('❌ El contenido del artículo es requerido');
        return;
    }

    const contenido = sanitizeHtmlBasic(contenidoRaw);

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
        result = await SupabaseAdmin.actualizarArticulo(editId, articulo);
        if (result.success) {
            alert('✅ Artículo actualizado correctamente');
        } else {
            alert('❌ Error: ' + result.error);
            return;
        }
    } else {
        result = await SupabaseAdmin.crearArticulo(articulo);
        if (result.success) {
            alert('✅ Artículo publicado correctamente');
        } else {
            alert('❌ Error: ' + result.error);
            return;
        }
    }

    Router.navigate('/admin/articulos');
},

deleteArticle: async function(id) {
    if (confirm('¿Estás seguro de eliminar este artículo? Esta acción no se puede deshacer.')) {
        const result = await SupabaseAdmin.eliminarArticulo(id);
        if (result.success) {
            alert('✅ Artículo eliminado');
            Router.navigate('/admin/articulos');
        } else {
            alert('❌ Error: ' + result.error);
        }
    }
},

logout: async function() {
    await Auth.logout();
    Router.navigate('/login');
},

// ==================== BIBLIOTECA DE MEDIOS ====================
medios: async function() {
    if (!Auth.isLoggedIn()) { Router.navigate('/login'); return; }

    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="admin-layout">
            ${AdminComponents.sidebar()}
            ${AdminComponents.sidebarOverlay()}
            <div class="admin-main">
                ${AdminComponents.header('Biblioteca de Medios')}
                <div class="admin-content"><p>Cargando imágenes...</p></div>
            </div>
        </div>
    `;

    const imagenes = await SupabaseStorage.listarImagenes();

    main.innerHTML = `
        <div class="admin-layout">
            ${AdminComponents.sidebar()}
            ${AdminComponents.sidebarOverlay()}
            <div class="admin-main">
                ${AdminComponents.header('Medios')}
                <div class="admin-content">
                    <div class="upload-zone" id="upload-zone">
                        <label for="file-input" class="upload-content">
                            <div class="upload-icon">📷</div>
                            <p><strong>Toca para subir</strong> o arrastra imágenes aquí</p>
                            <small>JPG, PNG, GIF • Máx 5MB</small>
                        </label>
                        <input type="file" id="file-input" accept="image/*" multiple capture="environment">
                        <div id="upload-progress" class="upload-progress" style="display: none;">
                            <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
                            <p id="progress-text">Subiendo...</p>
                        </div>
                    </div>

                    <div class="media-gallery" id="media-gallery">
                        ${imagenes.length > 0 ? imagenes.map(img => `
                            <div class="media-item" data-url="${img.url}" data-nombre="${img.nombre}" onclick="AdminPages.mediaItemAction('${img.url}', '${img.nombre}')">
                                <img src="${img.url}" alt="${img.nombre}" loading="lazy">
                                <div class="media-overlay">
                                    <button class="btn-icon" onclick="event.stopPropagation(); AdminPages.copiarUrl('${img.url}')" title="Copiar URL">📋</button>
                                    <button class="btn-icon btn-danger" onclick="event.stopPropagation(); AdminPages.eliminarImagen('${img.nombre}')" title="Eliminar">🗑️</button>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="empty-media">
                                <p>No hay imágenes aún</p>
                                <p>Sube tu primera imagen arriba</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Event listeners
    const fileInput = document.getElementById('file-input');
    const uploadZone = document.getElementById('upload-zone');

    fileInput.addEventListener('change', (e) => AdminPages.subirArchivos(e.target.files));

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        AdminPages.subirArchivos(e.dataTransfer.files);
    });

    document.title = 'Medios - Beisjoven Admin';
},

// Mobile-friendly media action (tap shows actions)
mediaItemAction: function(url, nombre) {
    if (window.innerWidth > 768) return; // Desktop uses hover overlay
    const action = confirm(`📷 ${nombre}\n\n¿Copiar URL al portapapeles?\n(Cancelar = ver opciones)`);
    if (action) {
        this.copiarUrl(url);
    }
},

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
        if (archivo.size > 5 * 1024 * 1024) {
            alert(`❌ ${archivo.name} es muy grande (máx 5MB)`);
            continue;
        }
        if (!archivo.type.startsWith('image/')) {
            alert(`❌ ${archivo.name} no es una imagen`);
            continue;
        }

        progressText.textContent = `Subiendo ${subidas + 1} de ${total}...`;
        progressFill.style.width = `${(subidas / total) * 100}%`;

        const result = await SupabaseStorage.subirImagen(archivo);
        if (result.success) {
            subidas++;
        } else {
            alert(`❌ Error subiendo ${archivo.name}: ${result.error}`);
        }
    }

    progressFill.style.width = '100%';
    progressText.textContent = `✅ ${subidas} imagen(es) subida(s)`;

    setTimeout(() => Router.navigate('/admin/medios'), 1000);
},

copiarUrl: function(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('✅ URL copiada al portapapeles');
    }).catch(() => {
        prompt('Copia esta URL:', url);
    });
},

eliminarImagen: async function(nombre) {
    if (!confirm('¿Eliminar esta imagen?')) return;

    const result = await SupabaseStorage.eliminarImagen(nombre);
    if (result.success) {
        alert('✅ Imagen eliminada');
        Router.navigate('/admin/medios');
    } else {
        alert('❌ Error: ' + result.error);
    }
},

// ==================== GESTIÓN DE VIDEOS ====================
videosList: async function() {
    if (!Auth.isLoggedIn()) { Router.navigate('/login'); return; }

    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="admin-layout">
            ${AdminComponents.sidebar()}
            ${AdminComponents.sidebarOverlay()}
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
            ${AdminComponents.sidebarOverlay()}
            <div class="admin-main">
                ${AdminComponents.header('Videos')}
                <div class="admin-content">
                    <div class="content-header">
                        <p>Total: ${videos.length} videos</p>
                        <a href="/admin/videos/nuevo" class="btn btn-primary">+ Nuevo Video</a>
                    </div>

                    ${videos.length > 0 ? `
                        <!-- Desktop table -->
                        <div class="articles-table desktop-only">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Thumbnail</th>
                                        <th>Título</th>
                                        <th>Categoría</th>
                                        <th>Destacado</th>
                                        <th>Fecha</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${videos.map(video => `
                                        <tr>
                                            <td>
                                                <img src="${video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}" alt="${video.titulo}" style="width: 120px; height: 68px; object-fit: cover; border-radius: 4px;">
                                            </td>
                                            <td>
                                                <a href="/video/${video.slug}" target="_blank">
                                                    ${video.titulo.substring(0, 50)}${video.titulo.length > 50 ? '...' : ''}
                                                </a>
                                            </td>
                                            <td><span class="badge">${video.categoria?.nombre || 'N/A'}</span></td>
                                            <td style="text-align: center;">
                                                <input type="checkbox" ${video.destacado ? 'checked' : ''} onchange="AdminPages.toggleVideoFeatured(${video.id}, this.checked)" style="width: 18px; height: 18px; cursor: pointer;">
                                            </td>
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
                        <!-- Mobile cards -->
                        <div class="article-cards mobile-only">
                            ${videos.map(video => `
                                <div class="article-card-mobile video-card-mobile">
                                    <img src="${video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}" alt="${video.titulo}" class="video-thumb-mobile">
                                    <div class="video-card-info">
                                        <div class="article-card-header">
                                            <span class="badge">${video.categoria?.nombre || 'N/A'}</span>
                                            <span class="article-card-date">${new Date(video.fecha).toLocaleDateString('es-MX')}</span>
                                        </div>
                                        <h4 class="article-card-title">${video.titulo}</h4>
                                        <div class="article-card-actions">
                                            <a href="/admin/videos/editar/${video.id}" class="btn-small">✏️ Editar</a>
                                            <button onclick="AdminPages.deleteVideo(${video.id})" class="btn-small btn-danger">🗑️</button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
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

videoEditor: async function({ params }) {
    if (!Auth.isLoggedIn()) { Router.navigate('/login'); return; }

    const isEdit = params && params.id;
    const main = document.getElementById('main-content');

    main.innerHTML = `
        <div class="admin-layout">
            ${AdminComponents.sidebar()}
            ${AdminComponents.sidebarOverlay()}
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
            ${AdminComponents.sidebarOverlay()}
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
                                    <small>Es el código que aparece después de "v=" en la URL</small>
                                </div>
                                <div class="form-group">
                                    <label for="descripcion">Descripción</label>
                                    <textarea id="descripcion" rows="4" placeholder="Descripción del video (opcional)">${video?.descripcion || ''}</textarea>
                                </div>
                            </div>
                            <div class="form-sidebar">
                                <div class="form-card">
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
                                            ${video?.youtube_id ? `<img src="https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg" alt="Preview">` : '<span>Ingresa un ID de YouTube</span>'}
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="destacado" ${video?.destacado ? 'checked' : ''}>
                                            Video destacado
                                        </label>
                                    </div>
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

previewYoutube: function() {
    const youtubeId = document.getElementById('youtube_id').value.trim();
    const preview = document.getElementById('youtube-preview');
    if (youtubeId) {
        preview.innerHTML = `<img src="https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg" alt="Preview" onerror="this.parentElement.innerHTML='<span>ID inválido</span>'">`;
    } else {
        preview.innerHTML = '<span>Ingresa un ID de YouTube</span>';
    }
},

toggleVideoFeatured: async function(videoId, isChecked) {
    const { error } = await supabaseClient
        .from('videos')
        .update({ destacado: isChecked })
        .eq('id', videoId);

    if (error) {
        alert('❌ Error al actualizar: ' + error.message);
    }
},

saveVideo: async function(editId) {
    const titulo = document.getElementById('titulo').value.trim();
    const youtube_id = document.getElementById('youtube_id').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const categoria_id = document.getElementById('categoria').value ? parseInt(document.getElementById('categoria').value) : null;
    const destacado = document.getElementById('destacado').checked;

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
            .from('videos').update(videoData).eq('id', editId).select().single();
        result = error ? { success: false, error: error.message } : { success: true, data };
        if (result.success) alert('✅ Video actualizado correctamente');
        else { alert('❌ Error: ' + result.error); return; }
    } else {
        const { data, error } = await supabaseClient
            .from('videos').insert([videoData]).select().single();
        result = error ? { success: false, error: error.message } : { success: true, data };
        if (result.success) alert('✅ Video agregado correctamente');
        else { alert('❌ Error: ' + result.error); return; }
    }

    Router.navigate('/admin/videos');
},

deleteVideo: async function(id) {
    if (!confirm('¿Eliminar este video?')) return;
    const { error } = await supabaseClient.from('videos').delete().eq('id', id);
    if (error) {
        alert('❌ Error: ' + error.message);
    } else {
        alert('✅ Video eliminado');
        Router.navigate('/admin/videos');
    }
}
```

};

// ==================== COMPONENTS ====================
const AdminComponents = {

```
sidebar: function() {
    const user = Auth.getUser();
    const currentPath = window.location.pathname;
    return `
        <aside class="admin-sidebar" id="admin-sidebar">
            <div class="sidebar-header">
                <a href="/" class="sidebar-logo">
                    <span class="logo-icon">⚾</span>
                    <span>Beisjoven</span>
                </a>
                <button class="sidebar-close mobile-only" onclick="closeSidebar()" aria-label="Cerrar menú">✕</button>
            </div>
            <div class="sidebar-user">
                <div class="user-avatar">${user.avatar || '👤'}</div>
                <div class="user-info">
                    <span class="user-name">${user.name}</span>
                    <span class="user-role">${user.role === 'admin' ? 'Administrador' : 'Editor'}</span>
                </div>
            </div>
            <nav class="sidebar-nav">
                <a href="/admin" onclick="closeSidebar()" class="${currentPath === '/admin' ? 'active' : ''}">
                    📊 Dashboard
                </a>
                <a href="/admin/articulos" onclick="closeSidebar()" class="${currentPath.includes('/articulos') ? 'active' : ''}">
                    📝 Artículos
                </a>
                <a href="/admin/nuevo" onclick="closeSidebar()" class="${currentPath === '/admin/nuevo' ? 'active' : ''}">
                    ➕ Nuevo Artículo
                </a>
                <a href="/admin/videos" onclick="closeSidebar()" class="${currentPath.includes('/videos') ? 'active' : ''}">
                    📹 Videos
                </a>
                <a href="/admin/medios" onclick="closeSidebar()" class="${currentPath === '/admin/medios' ? 'active' : ''}">
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

sidebarOverlay: function() {
    return `<div class="sidebar-overlay" onclick="closeSidebar()"></div>`;
},

header: function(title) {
    return `
        <header class="admin-header">
            <div class="header-left">
                <button class="hamburger-btn mobile-only" onclick="toggleSidebar()" aria-label="Abrir menú">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <h1>${title}</h1>
            </div>
            <div class="header-actions">
                <span class="current-date">${new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
        </header>
    `;
}
```

};

// Exportar
if (typeof window !== ‘undefined’) {
window.AdminPages = AdminPages;
window.AdminComponents = AdminComponents;
}