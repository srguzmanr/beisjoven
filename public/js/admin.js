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
    MediaLibrary.open(function(result) {
        // result puede ser {url, pieDeFoto, credito} o string (backward compat)
        const url = result.url || result;
        document.getElementById('image').value = url;
        // Autocompletar crédito si existe el campo
        if (result.credito) {
            const creditoEl = document.getElementById('foto-credito');
            if (creditoEl && !creditoEl.value) creditoEl.value = result.credito;
        }
        if (result.pieDeFoto) {
            const pieEl = document.getElementById('foto-pie');
            if (pieEl && !pieEl.value) pieEl.value = result.pieDeFoto;
        }
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
// ============================================================
// BJ-MOBILE-001 — Markdown Import para RTE Admin
// Agregar en js/admin.js después de que se inicialice el RTE
// ============================================================

function initMarkdownImport() {
// — 1. Convierte markdown a HTML —
function markdownToHtml(md) {
let html = md
// Saltos de línea dobles → párrafos
.split(/\n{2,}/)
.map(block => {
block = block.trim();
if (!block) return '';

    // ### H3
    if (/^###\s+/.test(block)) {
      return `<h3>${block.replace(/^###\s+/, '')}</h3>`;
    }
    // ## H2
    if (/^##\s+/.test(block)) {
      return `<h2>${block.replace(/^##\s+/, '')}</h2>`;
    }
    // # H1
    if (/^#\s+/.test(block)) {
      return `<h1>${block.replace(/^#\s+/, '')}</h1>`;
    }
    // Listas con - o *
    if (/^[-*]\s+/.test(block)) {
      const items = block
        .split('\n')
        .filter(l => /^[-*]\s+/.test(l.trim()))
        .map(l => `<li>${inlineMarkdown(l.replace(/^[-*]\s+/, '').trim())}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }
    // Listas numeradas
    if (/^\d+\.\s+/.test(block)) {
      const items = block
        .split('\n')
        .filter(l => /^\d+\.\s+/.test(l.trim()))
        .map(l => `<li>${inlineMarkdown(l.replace(/^\d+\.\s+/, '').trim())}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    }
    // Párrafo normal
    return `<p>${inlineMarkdown(block.replace(/\n/g, ' '))}</p>`;
  })
  .filter(Boolean)
  .join('');

return html;

}

// Inline: negritas, itálicas, código
function inlineMarkdown(text) {
return text
.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
.replace(/\*(.+?)\*/g, '<em>$1</em>')
.replace(/\*(.+?)\*/g, '<em>$1</em>')
.replace(/`(.+?)`/g, '<code>$1</code>');
}

// — 2. Crea el modal —
function createModal() {
// Evitar duplicados
if (document.getElementById('bj-md-modal')) return;

const overlay = document.createElement('div');
overlay.id = 'bj-md-modal';
overlay.innerHTML = `
  <div id="bj-md-panel">
    <div id="bj-md-header">
      <span>📋 Pegar Markdown</span>
      <button id="bj-md-close" aria-label="Cerrar">✕</button>
    </div>
    <textarea
      id="bj-md-textarea"
      placeholder="Pega aquí el markdown del artículo (## para títulos, ** para negritas)..."
      spellcheck="false"
    ></textarea>
    <div id="bj-md-footer">
      <button id="bj-md-cancel">Cancelar</button>
      <button id="bj-md-import">Importar al editor →</button>
    </div>
  </div>
`;

// Estilos inyectados (patrón establecido en el proyecto)
if (!document.getElementById('bj-md-styles')) {
  const style = document.createElement('style');
  style.id = 'bj-md-styles';
  style.textContent = `
    #bj-md-modal {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 9999;
      display: flex;
      align-items: flex-end;       /* Sheet desde abajo en móvil */
      justify-content: center;
      padding: 0;
      color-scheme: light;
    }
    #bj-md-panel {
      background: #fff;
      width: 100%;
      max-width: 680px;
      border-radius: 16px 16px 0 0;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      color-scheme: light;
    }
    #bj-md-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px 12px;
      font-weight: 600;
      font-size: 16px;
      color: #111;
      border-bottom: 1px solid #eee;
    }
    #bj-md-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #666;
      padding: 4px 8px;
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #bj-md-textarea {
      flex: 1;
      min-height: 280px;
      padding: 16px 20px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
      border: none;
      resize: none;
      outline: none;
      color: #222;
      background: #fafafa;
      -webkit-appearance: none;
      color-scheme: light;
    }
    #bj-md-footer {
      display: flex;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid #eee;
      padding-bottom: calc(16px + env(safe-area-inset-bottom));
    }
    #bj-md-cancel {
      flex: 1;
      padding: 14px;
      border: 1px solid #ddd;
      border-radius: 10px;
      background: #fff;
      font-size: 15px;
      cursor: pointer;
      color: #444;
      min-height: 44px;
    }
    #bj-md-import {
      flex: 2;
      padding: 14px;
      border: none;
      border-radius: 10px;
      background: #1a1a2e;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      min-height: 44px;
    }
    #bj-md-import:active {
      opacity: 0.85;
    }
    /* Desktop: modal centrado */
    @media (min-width: 680px) {
      #bj-md-modal {
        align-items: center;
      }
      #bj-md-panel {
        border-radius: 16px;
        max-height: 80vh;
        margin: 20px;
      }
    }
  `;
  document.head.appendChild(style);
}

document.body.appendChild(overlay);

// --- 3. Eventos del modal ---
const textarea  = overlay.querySelector('#bj-md-textarea');
const btnClose  = overlay.querySelector('#bj-md-close');
const btnCancel = overlay.querySelector('#bj-md-cancel');
const btnImport = overlay.querySelector('#bj-md-import');

const closeModal = () => overlay.remove();

btnClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);
overlay.addEventListener('click', e => {
  if (e.target === overlay) closeModal();
});

btnImport.addEventListener('click', () => {
  const md = textarea.value.trim();
  if (!md) return;

  const html = markdownToHtml(md);

  // Busca el contenteditable del RTE
  const editor = document.querySelector('[contenteditable="true"]');
  if (!editor) {
    alert('No se encontró el editor. Asegúrate de tener un artículo abierto.');
    return;
  }

  // Opción: reemplazar o agregar al final
  // Si el editor está vacío → reemplaza; si tiene contenido → pregunta
  const editorEmpty = editor.innerText.trim().length === 0;
  if (!editorEmpty) {
    const ok = confirm('El editor ya tiene contenido. ¿Reemplazarlo con el markdown importado?');
    if (!ok) return;
  }

  editor.innerHTML = html;

  // Dispara evento input para que el autosave y otros listeners detecten el cambio
  editor.dispatchEvent(new Event('input', { bubbles: true }));

  closeModal();
});

// Focus automático al textarea
setTimeout(() => textarea.focus(), 100);

}

// — 4. Agrega el botón a la toolbar —
function addImportButton() {
// Evitar duplicados
if (document.getElementById('bj-md-btn')) return;

// Busca la toolbar del RTE — ajusta el selector si es necesario
const toolbar = document.querySelector('.rte-toolbar, #rte-toolbar, .editor-toolbar, [class*="toolbar"]');

const btn = document.createElement('button');
btn.id = 'bj-md-btn';
btn.type = 'button';
btn.title = 'Importar desde Markdown';
btn.innerHTML = '📋 MD';
btn.style.cssText = `
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  min-height: 44px;
  min-width: 44px;
  color-scheme: light;
`;
btn.addEventListener('click', createModal);

if (toolbar) {
  toolbar.appendChild(btn);
} else {
  // Fallback: inserta el botón justo antes del contenteditable
  const editor = document.querySelector('[contenteditable="true"]');
  if (editor) {
    editor.parentNode.insertBefore(btn, editor);
  }
}

}

// Inicializa
addImportButton();
}

// Llama a la función después de que se monte el editor
// En admin.js, busca donde se inicializa el RTE y agrega:
// initMarkdownImport();
// O si el editor se monta con delay:
// setTimeout(initMarkdownImport, 500);
// ==================== AUTOSAVE SYSTEM ====================
// 8 RULES (from Admin 3.0 spec):
// 1. ONLY activates inside the article editor. Never on other screens.
// 2. Never saves if title AND content are both empty.
// 3. NEW articles → create record with publicado:false on first save, reuse ID after.
// 4. EXISTING articles → update the existing record. NEVER create a new one.
//    Does NOT touch the 'publicado' field — preserves current publish state.
// 5. Timer: 30 seconds of inactivity (resets on every keystroke).
// 6. Indicator: "Sin guardar" (gray) / "Guardando..." (yellow) / "Guardado HH:MM" (green) / "Error" (red, retry 10s).
// 7. beforeunload warning if dirty.
// 8. Does NOT interfere with manual Publicar/Guardar — both use the same article ID.

var Autosave = {
    STORAGE_KEY: 'bj_article_draft',
    INTERVAL_MS: 30000,
    RETRY_MS: 10000,
    _timer: null,
    _dirty: false,
    _saving: false,
    _editId: null,      // ID of article being edited (null = new)
    _draftId: null,      // ID of draft created by autosave (for new articles)
    _beforeUnloadHandler: null,
    _active: false,      // true only when inside the editor

    // Gather current form data
    _gatherData: function() {
        var title = document.getElementById('title');
        var excerpt = document.getElementById('excerpt');
        var category = document.getElementById('category');
        var author = document.getElementById('author');
        var image = document.getElementById('image');
        var featured = document.getElementById('featured');
        var pieFoto = document.getElementById('foto-pie');
        var fotoCredito = document.getElementById('foto-credito');
        var esWbc = document.getElementById('es_wbc2026');

        var content = '';
        if (contentEditor) {
            content = contentEditor.getValue();
        } else {
            var contentEl = document.getElementById('content');
            if (contentEl) content = contentEl.value;
        }

        return {
            titulo: title ? title.value : '',
            extracto: excerpt ? excerpt.value : '',
            contenido: content || '',
            categoria_id: category && category.value ? parseInt(category.value) : null,
            autor_id: author && author.value ? parseInt(author.value) : null,
            imagen_url: image ? image.value : '',
            destacado: featured ? featured.checked : false,
            pie_de_foto: pieFoto ? pieFoto.value : '',
            foto_credito: fotoCredito ? fotoCredito.value : '',
            es_wbc2026: esWbc ? esWbc.checked : false,
            savedAt: new Date().toISOString()
        };
    },

    // Update all autosave indicator elements
    _updateIndicator: function(status, timestamp) {
        var texts = {
            saving: 'Guardando...',
            saved: 'Guardado \u2713 ' + (timestamp || ''),
            unsaved: '\u25CF Sin guardar',
            error: '\u26A0 Error al guardar'
        };
        var colors = {
            saving: '#d97706',
            saved: '#16a34a',
            unsaved: '#6b7280',
            error: '#dc2626'
        };
        var ids = ['autosave-indicator', 'autosave-indicator-sticky'];
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el) {
                el.textContent = texts[status] || '';
                el.style.color = colors[status] || '#9ca3af';
            }
        }
    },

    // Save to Supabase + localStorage
    save: async function() {
        // Rule 1: only save when active (inside editor)
        if (!this._active) return;
        if (this._saving) return;

        var data = this._gatherData();

        // Rule 2: never save if title AND content are both empty
        if (!data.titulo.trim() && !data.contenido.trim()) return;

        this._saving = true;
        this._updateIndicator('saving');

        try {
            // Always save to localStorage as fallback
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));

            // Build Supabase payload — content fields only
            var payload = {
                titulo: data.titulo || 'Borrador sin titulo',
                extracto: data.extracto,
                contenido: data.contenido,
                categoria_id: data.categoria_id,
                autor_id: data.autor_id,
                imagen_url: data.imagen_url,
                destacado: data.destacado,
                pie_de_foto: data.pie_de_foto || null,
                foto_credito: data.foto_credito || null,
                es_wbc2026: data.es_wbc2026
            };

            if (this._editId) {
                // Rule 4: EXISTING article — update in place.
                // Crucially: do NOT include 'publicado' in the payload.
                // This prevents autosave from overwriting a published article's status.
                var slug = data.titulo.toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
                payload.slug = slug;

                await supabaseClient
                    .from('articulos')
                    .update(payload)
                    .eq('id', this._editId);
            } else {
                // Rule 3: NEW article — create with publicado:false, reuse ID
                payload.publicado = false;
                if (this._draftId) {
                    // Already have a draft — update it
                    await supabaseClient
                        .from('articulos')
                        .update(payload)
                        .eq('id', this._draftId);
                } else {
                    // First save — create the draft
                    payload.slug = 'borrador-' + Date.now();
                    // Track ownership
                    if (Auth.getUser()) {
                        payload.user_id = Auth.getUser().id;
                    }
                    var result = await supabaseClient
                        .from('articulos')
                        .insert([payload])
                        .select('id')
                        .single();
                    if (result.data) {
                        this._draftId = result.data.id;
                    }
                }
            }

            this._dirty = false;
            var timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            this._updateIndicator('saved', timeStr);
        } catch (e) {
            console.warn('Autosave failed:', e);
            this._updateIndicator('error');
            // Rule 6: retry on error after 10 seconds
            var self = this;
            if (this._timer) clearTimeout(this._timer);
            this._timer = setTimeout(function() { self.save(); }, this.RETRY_MS);
        } finally {
            this._saving = false;
        }
    },

    // Rule 5: Mark content as changed — resets the 30s debounce timer
    markDirty: function() {
        if (!this._active) return;
        this._dirty = true;
        this._updateIndicator('unsaved');
        this._resetTimer();
    },

    _resetTimer: function() {
        var self = this;
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(function() { self.save(); }, this.INTERVAL_MS);
    },

    // Attach input/change listeners to the editor form + Tiptap
    _attachListeners: function() {
        var self = this;
        var form = document.getElementById('article-form');
        if (!form) return;
        form.addEventListener('input', function() { self.markDirty(); });
        form.addEventListener('change', function() { self.markDirty(); });
        // Tiptap editor change events (deferred — editor may init after start())
        if (contentEditor && contentEditor.editor) {
            contentEditor.editor.on('update', function() { self.markDirty(); });
        }
    },

    // Connect to Tiptap after it's initialized (called from editor code)
    connectEditor: function() {
        if (!this._active) return;
        var self = this;
        if (contentEditor && contentEditor.editor) {
            contentEditor.editor.on('update', function() { self.markDirty(); });
        }
    },

    // Start autosave — call ONLY from within the article editor
    start: function(editId) {
        this.stop();
        this._active = true;    // Rule 1
        this._editId = editId || null;
        this._draftId = null;
        this._dirty = false;
        this._saving = false;
        this._attachListeners();

        // Rule 7: beforeunload warning
        var self = this;
        this._beforeUnloadHandler = function(e) {
            if (self._dirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', this._beforeUnloadHandler);
    },

    stop: function() {
        this._active = false;
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        if (this._beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this._beforeUnloadHandler);
            this._beforeUnloadHandler = null;
        }
        this._dirty = false;
    },

    load: function() {
        try {
            var raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) { return null; }
    },

    clear: function() {
        localStorage.removeItem(this.STORAGE_KEY);
        this._draftId = null;
    },

    // Rule 8: expose draft ID so manual save uses the same record
    getDraftId: function() { return this._draftId; },
    isDirty: function() { return this._dirty; }
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
        
        // Cargar datos de Supabase — use count:'exact' for real totals
        const [articulos, videos, categorias, totalCount, draftCount, weekCount] = await Promise.all([
            SupabaseAPI.getArticulos(10),
            SupabaseAPI.getVideos(100),
            SupabaseAPI.getCategorias(),
            supabaseClient.from('articulos').select('*', { count: 'exact', head: true }),
            supabaseClient.from('articulos').select('*', { count: 'exact', head: true }).eq('publicado', false),
            supabaseClient.from('articulos').select('*', { count: 'exact', head: true })
                .gte('fecha', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        ]);

        const totalArticulos = totalCount.count || 0;
        const totalBorradores = draftCount.count || 0;
        const totalSemana = weekCount.count || 0;

        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}

                <div class="admin-main">
                    ${AdminComponents.header('Dashboard')}

                    <div class="admin-content">
                        <div style="background: linear-gradient(135deg, #c41e3a 0%, #9a1830 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                            <div>
                                <h2 style="font-family: Oswald, sans-serif; font-size: 1.8rem; margin: 0 0 5px 0;">Hola, ${user.name}!</h2>
                                <p style="margin: 0; opacity: 0.9;">${user.role === 'admin' ? 'Administrador' : 'Editor'} — Panel de Beisjoven</p>
                            </div>
                            <a href="#" onclick="Router.navigate('/admin/nuevo'); return false;" style="background: white; color: #c41e3a; padding: 12px 24px; border-radius: 25px; font-weight: 600; text-decoration: none; white-space: nowrap;">+ Nuevo Articulo</a>
                        </div>

                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-icon">📝</div>
                                <div class="stat-info">
                                    <span class="stat-number">${totalArticulos}</span>
                                    <span class="stat-label">Articulos</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">📋</div>
                                <div class="stat-info">
                                    <span class="stat-number">${totalBorradores}</span>
                                    <span class="stat-label">Borradores</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">📅</div>
                                <div class="stat-info">
                                    <span class="stat-number">${totalSemana}</span>
                                    <span class="stat-label">Esta semana</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">📹</div>
                                <div class="stat-info">
                                    <span class="stat-number">${videos.length}</span>
                                    <span class="stat-label">Videos</span>
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

        // Show onboarding for new editors
        Onboarding.checkAndShow();
    },

    // ==================== LISTA DE ARTÍCULOS ====================
    articles: async function() {
        if (!Auth.isLoggedIn()) {
            Router.navigate('/login');
            return;
        }

        const main = document.getElementById('main-content');
        const isAdmin = Auth.isAdmin();
        const userId = Auth.getUser()?.id;

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

        // Admins see all articles (including drafts); editors see own + published
        // Use count:'exact' for real total (not capped at limit)
        let articulos = [];
        let totalArticulos = 0;
        if (isAdmin) {
            const { data, count } = await supabaseClient
                .from('articulos')
                .select('*, categoria:categorias(*), autor:autores(*)', { count: 'exact' })
                .order('created_at', { ascending: false });
            articulos = data || [];
            totalArticulos = count || articulos.length;
        } else {
            const { data, count } = await supabaseClient
                .from('articulos')
                .select('*, categoria:categorias(*), autor:autores(*)', { count: 'exact' })
                .or('publicado.eq.true,user_id.eq.' + userId)
                .order('created_at', { ascending: false });
            articulos = data || [];
            totalArticulos = count || articulos.length;
        }

        // Helper: can current user edit this article?
        function canEditArticle(article) {
            return isAdmin || article.user_id === userId;
        }

        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}

                <div class="admin-main">
                    ${AdminComponents.header('Artículos')}

                    <div class="admin-content">
                        <div class="content-header">
                            <p>Total: <span id="admin-article-count">${totalArticulos}</span> articulos</p>
                            <a href="/admin/nuevo" class="btn btn-primary">+ Nuevo Articulo</a>
                        </div>
                        <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                            <select id="admin-cat-filter" onchange="AdminPages._filterArticles()" style="padding:6px 10px;border-radius:6px;border:1px solid #d1d5db;font-size:0.85rem;background:#fff;cursor:pointer;">
                                <option value="">Todas las categorías</option>
                                ${[...new Set(articulos.map(a => a.categoria?.nombre).filter(Boolean))].sort().map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                            <select id="admin-wbc-filter" onchange="AdminPages._filterArticles()" style="padding:6px 10px;border-radius:6px;border:1px solid #d1d5db;font-size:0.85rem;background:#fff;cursor:pointer;">
                                <option value="">WBC: Todos</option>
                                <option value="wbc">Solo WBC 2026</option>
                                <option value="no-wbc">Sin WBC</option>
                            </select>
                        </div>

                        ${articulos.length > 0 ? `
                            <!-- Desktop table -->
                            <div class="articles-table hide-mobile">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Título</th>
                                            <th>Categoría</th>
                                            <th>Estado</th>
                                            <th>Fecha</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${articulos.map(article => `
                                            <tr data-cat="${article.categoria?.nombre || ''}" data-wbc="${article.es_wbc2026 ? 'wbc' : 'no-wbc'}">
                                                <td>
                                                    <a href="/articulo/${article.slug}" target="_blank">
                                                        ${article.titulo.substring(0, 60)}${article.titulo.length > 60 ? '...' : ''}
                                                    </a>
                                                </td>
                                                <td><span class="badge">${article.categoria?.nombre || 'N/A'}</span></td>
                                                <td>
                                                    <span class="badge ${article.publicado ? 'badge-published' : 'badge-draft'}">
                                                        ${article.publicado ? 'Publicado' : 'Borrador'}
                                                    </span>
                                                    ${article.destacado ? ' ⭐' : ''}
                                                </td>
                                                <td>${new Date(article.fecha || article.created_at).toLocaleDateString('es-MX')}</td>
                                                <td class="actions-cell">
                                                    ${canEditArticle(article) ? `<a href="/admin/editar/${article.id}" class="btn-small">Editar</a>` : ''}
                                                    ${article.publicado ? `<button onclick="AdminPages.copyArticleUrl('${article.slug}', this)" class="btn-small btn-url" title="Copiar URL">🔗 URL</button>` : ''}
                                                    ${isAdmin ? `<button onclick="AdminPages.deleteArticle(${article.id})" class="btn-small btn-danger">Eliminar</button>` : ''}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>

                            <!-- Mobile cards -->
                            <div class="articles-cards show-mobile">
                                ${articulos.map(article => `
                                    <div class="article-card-mobile" data-cat="${article.categoria?.nombre || ''}" data-wbc="${article.es_wbc2026 ? 'wbc' : 'no-wbc'}">
                                        <div class="acm-top">
                                            <span class="badge ${article.publicado ? 'badge-published' : 'badge-draft'}">${article.publicado ? 'Publicado' : 'Borrador'}</span>
                                            <span class="acm-date">${new Date(article.fecha || article.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                        <h4 class="acm-title">${article.titulo}</h4>
                                        <div class="acm-bottom">
                                            <span class="badge">${article.categoria?.nombre || 'N/A'}</span>
                                            ${article.destacado ? '<span>⭐</span>' : ''}
                                        </div>
                                        <div class="acm-actions">
                                            ${canEditArticle(article) ? `<a href="/admin/editar/${article.id}" class="acm-btn acm-btn-edit">Editar</a>` : ''}
                                            ${article.publicado ? `<button onclick="event.stopPropagation(); AdminPages.copyArticleUrl('${article.slug}', this)" class="acm-btn acm-btn-url">Copiar URL</button>` : ''}
                                            ${isAdmin ? `<button onclick="event.stopPropagation(); AdminPages.deleteArticle(${article.id})" class="acm-btn acm-btn-danger">Eliminar</button>` : ''}
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
                            <!-- 
                                FORM GRID: CSS Grid Areas
                                Desktop: 2 columnas (main izq, sidebar der)
                                Móvil: 1 columna en orden editorial
                                Orden móvil: título → extracto → meta → contenido → imagen → checks → acciones
                            -->
                            <div class="form-grid-new">

                                <div class="fg-titulo">
                                    <label for="title">Título *</label>
                                    <input type="text" id="title" value="${article?.titulo || (useDraft && draft ? draft.titulo : '') || ''}" placeholder="Título de la noticia" required>
                                </div>

                                <div class="fg-extracto">
                                    <label for="excerpt">Extracto *</label>
                                    <textarea id="excerpt" rows="3" placeholder="Breve descripción (aparece en tarjetas)" required>${article?.extracto || (useDraft && draft ? draft.extracto : '') || ''}</textarea>
                                </div>

                                <div class="fg-meta">
                                    <div class="fg-meta-row">
                                        <div class="form-group">
                                            <label for="category">Categoría *</label>
                                            <select id="category" required>
                                                <option value="">Seleccionar...</option>
                                                ${categorias.map(c => `
                                                    <option value="${c.id}" ${article?.categoria_id === c.id ? 'selected' : (useDraft && draft && draft.categoria_id == c.id ? 'selected' : '')}>
                                                        ${c.nombre}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label for="author">Autor *</label>
                                            <select id="author" required>
                                                ${autores.map(a => `
                                                    <option value="${a.id}" ${article?.autor_id === a.id ? 'selected' : (useDraft && draft && draft.autor_id == a.id ? 'selected' : '')}>
                                                        ${a.nombre}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="fg-contenido">
                                    <label>Contenido *</label>
                                    <div id="content-editor-container"></div>
                                </div>

                                <div class="fg-imagen">
                                    <div class="form-group">
                                        <label>Imagen principal</label>
                                        <div style="display:flex;gap:8px;margin-bottom:8px;">
                                            <input type="url" id="image" value="${article?.imagen_url || (useDraft && draft ? draft.imagen_url : '') || ''}" placeholder="URL de la imagen..." style="flex:1;" readonly>
                                            <button type="button" class="btn-media-picker" onclick="openMediaPicker()">📷 Seleccionar</button>
                                        </div>
                                        <div id="image-preview" class="image-preview">
                                            ${(article?.imagen_url || (useDraft && draft?.imagen_url)) ? `<img src="${article?.imagen_url || draft.imagen_url}" alt="Preview">` : '<span>Sin imagen</span>'}
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="foto-pie">Pie de foto</label>
                                        <input type="text" id="foto-pie" value="${article?.pie_de_foto || (useDraft && draft ? draft.pie_de_foto : '') || ''}" placeholder="Descripción de la imagen principal">
                                    </div>
                                    <div class="form-group">
                                        <label for="foto-credito">Crédito fotográfico</label>
                                        <input type="text" id="foto-credito" value="${article?.foto_credito || (useDraft && draft ? draft.foto_credito : '') || ''}" placeholder="Ej: Foto: Getty Images">
                                    </div>
                                </div>

                                <div class="fg-checks">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="featured" ${article?.destacado ? 'checked' : (useDraft && draft?.destacado ? 'checked' : '')}>
                                        Artículo destacado
                                    </label>
                                    <label class="checkbox-label wbc-check-label">
                                        <input type="checkbox" id="es_wbc2026" ${article?.es_wbc2026 ? 'checked' : (useDraft && draft?.es_wbc2026 ? 'checked' : '')}>
                                        <span>⚾ Cobertura WBC 2026 <small>(aparece en el hub WBC)</small></span>
                                    </label>
                                </div>

                                <div class="fg-acciones">
                                    ${(() => {
                                        const _isAdmin = Auth.isAdmin();
                                        const _isPublished = isEdit && article && article.publicado;
                                        let btns = '';
                                        if (_isPublished) {
                                            btns += '<button type="submit" class="btn btn-primary btn-block" data-action="save">Guardar Cambios</button>';
                                            if (_isAdmin) btns += '<button type="button" class="btn btn-outline btn-block" data-action="unpublish">Despublicar</button>';
                                        } else {
                                            if (_isAdmin) btns += '<button type="submit" class="btn btn-primary btn-block" data-action="publish">Publicar</button>';
                                            btns += '<button type="button" class="btn btn-secondary btn-block" data-action="draft">Guardar Borrador</button>';
                                        }
                                        return btns;
                                    })()}
                                    <a href="/admin/articulos" class="btn btn-secondary btn-block">Cancelar</a>
                                    <div id="autosave-indicator" style="text-align:center;font-size:0.8rem;color:#9ca3af;margin-top:8px;">
                                        Auto-guardado cada 30s
                                    </div>
                                </div>

                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Inyectar CSS crítico del editor — garantiza que esté disponible
        // independientemente del caché del CSS externo
        if (!document.getElementById('bj-editor-styles')) {
            const style = document.createElement('style');
            style.id = 'bj-editor-styles';
            style.textContent = `
                .form-grid-new { display: grid; grid-template-columns: 1fr 320px; grid-template-areas: "titulo imagen" "extracto imagen" "meta checks" "contenido acciones"; gap: 0 24px; max-width: 100%; }
                .fg-titulo { grid-area: titulo; padding-bottom: 20px; }
                .fg-extracto { grid-area: extracto; padding-bottom: 20px; }
                .fg-meta { grid-area: meta; padding-bottom: 20px; }
                .fg-contenido { grid-area: contenido; padding-bottom: 20px; }
                .fg-imagen { grid-area: imagen; background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); margin-bottom: 16px; }
                .fg-checks { grid-area: checks; background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); margin-bottom: 16px; }
                .fg-acciones { grid-area: acciones; background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
                .form-grid-new label { display: block; margin-bottom: 6px; font-weight: 600; color: #111827; font-size: 0.95rem; }
                .form-grid-new input[type="text"], .form-grid-new input[type="url"], .form-grid-new textarea, .form-grid-new select { width: 100%; padding: 12px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; font-family: inherit; box-sizing: border-box; background: #fff; color: #111827; }
                .form-grid-new input:focus, .form-grid-new textarea:focus, .form-grid-new select:focus { outline: none; border-color: #c4122e; }
                .fg-meta-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .form-grid-new .checkbox-label { display: flex; align-items: center; gap: 10px; padding: 10px 0; cursor: pointer; min-height: 44px; border-bottom: 1px solid #f3f4f6; }
                .form-grid-new .checkbox-label:last-child { border-bottom: none; }
                .form-grid-new .checkbox-label input[type="checkbox"] { width: 20px; height: 20px; flex-shrink: 0; cursor: pointer; accent-color: #c4122e; }
                .wbc-check-label { background: #fef3c7 !important; border: 1px solid #f59e0b !important; border-radius: 8px; padding: 10px 12px !important; margin-top: 4px; }
                .wbc-check-label small { font-size: 0.75rem; color: #92400e; display: block; }
                .fg-acciones .btn { width: 100%; padding: 14px; font-size: 1rem; border-radius: 8px; margin-bottom: 8px; cursor: pointer; text-align: center; display: block; text-decoration: none; border: none; font-family: inherit; font-weight: 600; }
                .fg-acciones .btn-primary { background: #c4122e; color: white; }
                .fg-acciones .btn-secondary { background: #f3f4f6; color: #374151; }
                .fg-acciones .btn-outline { background: transparent; color: #6b7280; border: 2px solid #d1d5db !important; }
                .btn-media-picker { padding: 10px 14px; background: #f3f4f6; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 0.9rem; white-space: nowrap; touch-action: manipulation; }
                .form-grid-new .image-preview { width: 100%; height: 150px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 8px 0; overflow: hidden; color: #9ca3af; }
                .form-grid-new .image-preview img { width: 100%; height: 100%; object-fit: cover; }
                @media (max-width: 768px) {
                    .form-grid-new { display: flex; flex-direction: column; gap: 0; padding-bottom: 80px; overflow: hidden; max-width: 100%; }
                    .fg-titulo { order: 1; padding: 16px 16px 0; }
                    .fg-extracto { order: 2; padding: 12px 16px 0; }
                    .fg-meta { order: 3; padding: 12px 16px 0; }
                    .fg-contenido { order: 4; padding: 12px 16px 0; }
                    .fg-imagen { order: 5; margin: 12px 16px 0; padding: 16px; box-shadow: none; border: 1px solid #e5e7eb; border-radius: 8px; }
                    .fg-checks { order: 6; margin: 12px 16px 0; padding: 16px; box-shadow: none; border: 1px solid #e5e7eb; border-radius: 8px; }
                    .fg-acciones { order: 7; display: none; }
                    .fg-meta-row { grid-template-columns: 1fr; gap: 12px; }
                    .form-grid-new input, .form-grid-new textarea, .form-grid-new select { font-size: 16px !important; min-height: 44px; }
                    .admin-main, .admin-content, .admin-layout { max-width: 100vw; overflow-x: hidden; }
                }
                .admin-sticky-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999; background: #ffffff; padding: 10px 16px; box-shadow: 0 -2px 12px rgba(0,0,0,0.15); display: flex; gap: 10px; align-items: center; color-scheme: light; }
                .admin-sticky-bar .btn-publish { flex: 2; padding: 14px; background: #c4122e; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer; font-family: inherit; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
                .admin-sticky-bar .btn-cancel { flex: 1; padding: 14px; background: #f3f4f6; color: #374151; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit; text-decoration: none; text-align: center; display: flex; align-items: center; justify-content: center; touch-action: manipulation; }
                .admin-sticky-bar .btn-preview { width: 48px; height: 48px; background: #1e3a5f; color: white; border: none; border-radius: 8px; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
                .admin-sticky-bar .btn-draft { flex: 1; padding: 14px 8px; background: #f3f4f6; color: #374151; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; touch-action: manipulation; }
                .admin-sticky-bar .btn-unpublish { flex: 1; padding: 14px 8px; background: transparent; color: #6b7280; border: 2px solid #d1d5db; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; touch-action: manipulation; }
                .admin-sticky-bar .autosave-txt { font-size: 0.72rem; color: #9ca3af; flex-shrink: 0; }
            `;
            document.head.appendChild(style);
        }

        // Sticky bar móvil — reemplaza .fg-acciones en pantallas pequeñas
        if (window.innerWidth <= 768) {
            const existingBar = document.getElementById('admin-sticky-bar');
            if (existingBar) existingBar.remove();
            const stickyBar = document.createElement('div');
            stickyBar.id = 'admin-sticky-bar';
            stickyBar.className = 'admin-sticky-bar';
            stickyBar.innerHTML = (() => {
                const _isAdmin = Auth.isAdmin();
                const _isPublished = isEdit && article && article.publicado;
                let html = '';
                if (_isPublished) {
                    html += '<button type="button" class="btn-publish" data-action="save">Guardar</button>';
                    if (_isAdmin) html += '<button type="button" class="btn-unpublish" data-action="unpublish">Despublicar</button>';
                } else {
                    if (_isAdmin) html += '<button type="button" class="btn-publish" data-action="publish">Publicar</button>';
                    html += '<button type="button" class="btn-draft" data-action="draft">Borrador</button>';
                }
                html += '<button type="button" class="btn-preview" onclick="ArticlePreview.openDraft()">👁️</button>';
                html += '<a href="/admin/articulos" class="btn-cancel">Cancelar</a>';
                if (!isEdit) html += '<span class="autosave-txt" id="autosave-indicator-sticky">Auto-guardado</span>';
                return html;
            })();
            document.body.appendChild(stickyBar);
        }

        // Initialize Rich Text Editor
        const initialContent = article?.contenido || (useDraft && draft ? draft.contenido : '') || '';
        
        if (typeof TiptapEditor !== 'undefined') {
            contentEditor = TiptapEditor.create(
                'content-editor-container',
                'content',
                initialContent
            );
        } else if (typeof RichTextEditor !== 'undefined') {
            // Legacy fallback
            contentEditor = RichTextEditor.create(
                'content-editor-container',
                'content',
                initialContent
            );
            setTimeout(initMarkdownImport, 300);
        } else {
            // Fallback to plain textarea
            document.getElementById('content-editor-container').innerHTML = `
                <textarea id="content" rows="15" placeholder="Escribe el contenido del artículo aquí..." required>${initialContent}</textarea>
                <small>Puedes usar HTML básico: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;a&gt;</small>
            `;
        }
        
        // Initialize Media Library
        if (typeof MediaLibrary !== 'undefined') {
            MediaLibrary.init();
        }
        
        // Start autosave AFTER editor is initialized so connectEditor works
        Autosave.start(isEdit ? parseInt(params.id) : null);
        Autosave.connectEditor();

        // Manejar submit del formulario (botón primario type="submit")
        document.getElementById('article-form').addEventListener('submit', function(e) {
            e.preventDefault();
            var primaryAction = (isEdit && article && article.publicado) ? 'save' : (Auth.isAdmin() ? 'publish' : 'draft');
            AdminPages.saveArticle(isEdit ? parseInt(params.id) : null, primaryAction);
        });

        // Manejar botones secundarios (type="button" con data-action)
        document.querySelectorAll('[data-action]').forEach(function(btn) {
            if (btn.type === 'button') {
                btn.addEventListener('click', function() {
                    AdminPages.saveArticle(isEdit ? parseInt(params.id) : null, this.getAttribute('data-action'));
                });
            }
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
    // action: 'publish' | 'draft' | 'save' | 'unpublish'
    saveArticle: async function(editId, action) {
        const titulo = document.getElementById('title').value.trim();
        const extracto = document.getElementById('excerpt').value.trim();
        const pie_de_foto = (document.getElementById('foto-pie')?.value || '').trim();
        const foto_credito = (document.getElementById('foto-credito')?.value || '').trim();
        const es_wbc2026 = document.getElementById('es_wbc2026')?.checked || false;
        
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
        // Imagen principal: (1) la que eligió el periodista, (2) primera img del cuerpo, (3) default BJ
        const IMAGEN_DEFAULT_BJ = 'https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/public/imagenes/beisjoven-og-default.png';
        let imagen_url = document.getElementById('image').value.trim();
        if (!imagen_url) {
            // Buscar primera imagen en el contenido
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = contenidoRaw;
            const primeraImg = tempDiv.querySelector('img');
            imagen_url = primeraImg ? primeraImg.src : IMAGEN_DEFAULT_BJ;
        }
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
            pie_de_foto: pie_de_foto || null,
            foto_credito: foto_credito || null,
            es_wbc2026,
            destacado,
            publicado: action === 'publish' || action === 'save'
        };

        // Track which auth user created the article
        if (!editId && !Autosave.getDraftId() && Auth.getUser()) {
            articulo.user_id = Auth.getUser().id;
        }

        var toastMsg = {
            publish: '✅ Artículo publicado correctamente',
            draft: '✅ Borrador guardado correctamente',
            save: '✅ Artículo actualizado correctamente',
            unpublish: '✅ Artículo despublicado correctamente'
        };

        let result;

        if (editId) {
            // Editar existente
            result = await SupabaseAdmin.actualizarArticulo(editId, articulo);
            if (result.success) {
                Autosave.stop();
                Autosave.clear();
                showToast(toastMsg[action] || '✅ Artículo actualizado correctamente', 'success');
            } else {
                showToast('Error: ' + result.error, 'error');
                return;
            }
        } else if (Autosave.getDraftId()) {
            // Rule 8: manual save uses same draft ID from autosave
            var draftId = Autosave.getDraftId();
            result = await SupabaseAdmin.actualizarArticulo(draftId, articulo);
            if (result.success) {
                Autosave.stop();
                Autosave.clear();
                showToast(toastMsg[action] || '✅ Artículo guardado correctamente', 'success');
            } else {
                showToast('Error: ' + result.error, 'error');
                return;
            }
        } else {
            // No autosave draft exists — create new
            result = await SupabaseAdmin.crearArticulo(articulo);
            if (result.success) {
                Autosave.stop();
                Autosave.clear();
                showToast(toastMsg[action] || '✅ Artículo guardado correctamente', 'success');
            } else {
                showToast('Error: ' + result.error, 'error');
                return;
            }
        }

        // Trigger Vercel rebuild only for publish and save (already published)
        // Drafts and unpublish do NOT trigger rebuild
        if (action === 'publish' || action === 'save') {
            AdminPages._triggerVercelRebuild();
        }

        setTimeout(function() { Router.navigate('/admin/articulos'); }, 800);
    },

    // Trigger a Vercel deploy so static pages regenerate with the new content
    _triggerVercelRebuild: function() {
        var hookUrl = window.VERCEL_DEPLOY_HOOK_URL || '';
        if (!hookUrl) {
            console.warn('Deploy hook URL not configured — set window.VERCEL_DEPLOY_HOOK_URL');
            return;
        }
        fetch(hookUrl, { method: 'POST' })
            .then(function() {
                showToast('El sitio se actualizará en ~2 minutos.');
            })
            .catch(function(err) {
                console.error('Rebuild trigger failed:', err);
            });
    },

    // Filtrar artículos por categoría y WBC (works on both table rows + mobile cards)
    _filterArticles: function() {
        const cat = document.getElementById('admin-cat-filter').value;
        const wbc = document.getElementById('admin-wbc-filter').value;
        // Filter both desktop rows and mobile cards
        const items = document.querySelectorAll('.articles-table tbody tr, .article-card-mobile');
        let visible = 0;
        items.forEach(item => {
            const matchCat = !cat || item.dataset.cat === cat;
            const matchWbc = !wbc || item.dataset.wbc === wbc;
            const show = matchCat && matchWbc;
            item.style.display = show ? '' : 'none';
            if (show) visible++;
        });
        // Divide by 2 since desktop + mobile both count
        const counter = document.getElementById('admin-article-count');
        if (counter) counter.textContent = Math.ceil(visible / 2);
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
        if (!Auth.isAdmin()) {
            showToast('Solo administradores pueden eliminar articulos', 'error');
            return;
        }
        if (confirm('¿Estás seguro de eliminar este artículo? Esta acción no se puede deshacer.')) {
            const result = await SupabaseAdmin.eliminarArticulo(id);

            if (result.success) {
                showToast('Articulo eliminado', 'success');
                setTimeout(function() { Router.navigate('/admin/articulos'); }, 800);
            } else {
                showToast('Error: ' + result.error, 'error');
            }
        }
    },

    // ==================== GESTIÓN DE USUARIOS (Admin only) ====================
    usuarios: async function() {
        if (!Auth.isLoggedIn()) { Router.navigate('/login'); return; }
        if (!Auth.isAdmin()) { Router.navigate('/admin'); return; }

        const main = document.getElementById('main-content');
        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}
                <div class="admin-main">
                    ${AdminComponents.header('Gestión de Usuarios')}
                    <div class="admin-content"><p>Cargando usuarios...</p></div>
                </div>
            </div>
        `;

        // Fetch users via Supabase auth admin (requires service_role or custom RPC)
        // For now, list from a users view or user_metadata approach
        let users = [];
        try {
            const { data } = await supabaseClient.rpc('get_admin_users');
            users = data || [];
        } catch (e) {
            // Fallback: show current user info only
            users = [];
        }

        main.innerHTML = `
            <div class="admin-layout">
                ${AdminComponents.sidebar()}
                <div class="admin-main">
                    ${AdminComponents.header('Gestión de Usuarios')}
                    <div class="admin-content">
                        <div class="content-header">
                            <h2>Usuarios del sistema</h2>
                            <button class="btn btn-primary" onclick="AdminPages._showCreateUserModal()">+ Nuevo Usuario</button>
                        </div>

                        <div class="admin-section">
                            <p style="color:#6b7280;font-size:0.9rem;margin-bottom:16px;">
                                Para crear usuarios, usa el panel de Supabase Authentication o la funcion <code>supabase.auth.admin.createUser()</code>.
                                Asigna el rol en <code>user_metadata.role</code> ("admin" o "editor").
                            </p>

                            ${users.length > 0 ? `
                            <div class="articles-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Email</th>
                                            <th>Rol</th>
                                            <th>Registro</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${users.map(u => `
                                            <tr>
                                                <td>${u.name || u.email}</td>
                                                <td>${u.email}</td>
                                                <td><span class="badge ${u.role === 'admin' ? 'badge-published' : 'badge-draft'}">${u.role === 'admin' ? 'Admin' : 'Editor'}</span></td>
                                                <td>${u.created_at ? new Date(u.created_at).toLocaleDateString('es-MX') : '-'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ` : `
                            <div class="users-guide">
                                <h4>Como crear un editor:</h4>
                                <ol style="color:#374151;line-height:1.8;padding-left:20px;">
                                    <li>Ve al <strong>Dashboard de Supabase</strong> → Authentication → Users</li>
                                    <li>Click <strong>"Add User"</strong></li>
                                    <li>Ingresa email y contrasena</li>
                                    <li>En <strong>User Metadata</strong>, agrega:<br>
                                        <code style="background:#f3f4f6;padding:4px 8px;border-radius:4px;font-size:0.85rem;">{ "role": "editor", "name": "Nombre" }</code>
                                    </li>
                                    <li>El nuevo editor podra crear articulos como borrador</li>
                                </ol>
                                <div style="margin-top:20px;padding:16px;background:#fef3c7;border-radius:8px;border:1px solid #f59e0b;">
                                    <strong>Permisos de Editor:</strong>
                                    <ul style="margin-top:8px;padding-left:20px;color:#92400e;">
                                        <li>Crear articulos (solo como borrador)</li>
                                        <li>Editar sus propios articulos</li>
                                        <li>Subir imagenes a la biblioteca</li>
                                        <li>NO puede publicar, eliminar ni editar articulos ajenos</li>
                                    </ul>
                                </div>
                            </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.title = 'Usuarios - Beisjoven Admin';
    },

    _showCreateUserModal: function() {
        showToast('Usa el Dashboard de Supabase para crear usuarios', 'info');
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

        // Enriquecer con metadatos
        let metaMap = {};
        try {
            const nombres = imagenes.map(function(img) { return img.nombre; });
            if (nombres.length > 0) {
                const metaResult = await supabaseClient
                    .from('imagenes_metadata')
                    .select('*')
                    .in('nombre', nombres);
                (metaResult.data || []).forEach(function(m) { metaMap[m.nombre] = m; });
            }
        } catch(e) {}

        main.innerHTML =
            '<div class="admin-layout">' +
                AdminComponents.sidebar() +
                '<div class="admin-main">' +
                    AdminComponents.header('Biblioteca de Medios') +
                    '<div class="admin-content">' +
                        '<div class="upload-zone" id="upload-zone">' +
                            '<label for="file-input" class="upload-content">' +
                                '<div class="upload-icon">📷</div>' +
                                '<p><strong>Toca para subir</strong> o arrastra imágenes aquí</p>' +
                                '<small>JPG, PNG, GIF • Máx 5MB</small>' +
                            '</label>' +
                            '<input type="file" id="file-input" accept="image/jpeg,image/png,image/gif,image/webp" multiple>' +
                            '<div id="upload-progress" class="upload-progress" style="display:none;">' +
                                '<div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>' +
                                '<p id="progress-text">Subiendo...</p>' +
                            '</div>' +
                        '</div>' +
                        '<div style="margin:16px 0 8px;">' +
                            '<p style="color:#6b7280;font-size:0.9rem;margin:0;">' + imagenes.length + ' imagen' + (imagenes.length !== 1 ? 'es' : '') + ' en la biblioteca</p>' +
                        '</div>' +
                        '<div class="media-gallery" id="media-gallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;padding:4px;">' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';

        // Render cards separately to avoid template literal nesting issues
        AdminPages.renderMediaCards(imagenes, metaMap);

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

    // Render tarjetas de la biblioteca de medios (separado para evitar template literal anidados)
    renderMediaCards: function(imagenes, metaMap) {
        const gallery = document.getElementById('media-gallery');
        if (!gallery) return;

        const categorias = [
            { key: 'wbc', label: 'WBC 2026' },
            { key: 'mlb', label: 'MLB' },
            { key: 'seleccion', label: 'Selección' },
            { key: 'softbol', label: 'Softbol' },
            { key: 'juvenil', label: 'Juvenil' },
            { key: 'ligas', label: 'Ligas MX' },
        ];

        if (imagenes.length === 0) {
            gallery.innerHTML =
                '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#9ca3af;">' +
                '<p style="font-size:2rem;margin-bottom:8px;">🖼️</p>' +
                '<p>No hay imágenes aún</p>' +
                '<p>Sube tu primera imagen arriba</p>' +
                '</div>';
            return;
        }

        const catOptions = categorias.map(function(c) {
            return '<option value="' + c.key + '">' + c.label + '</option>';
        }).join('');

        // Event delegation — evita problemas de escapado en onclick inline
        gallery.addEventListener('click', function(e) {
            const copyBtn = e.target.closest('.ml-copy-btn');
            const deleteBtn = e.target.closest('.ml-delete-btn');
            if (copyBtn) { e.stopPropagation(); AdminPages.copiarUrl(copyBtn.dataset.url); }
            if (deleteBtn) { e.stopPropagation(); AdminPages.eliminarImagen(deleteBtn.dataset.nombre); }
        });
        gallery.addEventListener('change', function(e) {
            const sel = e.target.closest('.ml-cat-select');
            if (sel) AdminPages.actualizarMeta(sel.dataset.nombre, 'categoria', sel.value);
        });
        gallery.addEventListener('blur', function(e) {
            const pie = e.target.closest('.ml-pie-input');
            const cred = e.target.closest('.ml-cred-input');
            if (pie) AdminPages.actualizarMeta(pie.dataset.nombre, 'pie_de_foto', pie.value);
            if (cred) AdminPages.actualizarMeta(cred.dataset.nombre, 'credito', cred.value);
        }, true);

        gallery.innerHTML = imagenes.map(function(img) {
            const meta = metaMap[img.nombre] || {};
            const catLabel = (categorias.find(function(c) { return c.key === meta.categoria; }) || {}).label || '';
            const badge = catLabel
                ? '<span style="position:absolute;top:6px;left:6px;background:#c41e3a;color:white;font-size:10px;padding:2px 7px;border-radius:4px;font-weight:700;">' + catLabel + '</span>'
                : '';
            const catOpts = '<option value="">Sin categoría</option>' +
                categorias.map(function(c) {
                    return '<option value="' + c.key + '"' + (meta.categoria === c.key ? ' selected' : '') + '>' + c.label + '</option>';
                }).join('');
            const nombre = img.nombre || '';
            const url = img.url || '';
            const pieDeFoto = (meta.pie_de_foto || '').replace(/"/g, '&quot;');
            const credito = (meta.credito || '').replace(/"/g, '&quot;');

            // Usar atributos data- para pasar nombre/url sin problemas de escapado
            const card = document.createElement('div');
            card.style.cssText = 'border-radius:10px;overflow:hidden;background:#f9fafb;border:1px solid #e5e7eb;display:flex;flex-direction:column;';
            card.innerHTML =
                '<div style="position:relative;aspect-ratio:16/9;overflow:hidden;background:#e5e7eb;">' +
                    '<img src="' + url + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">' +
                    badge +
                    '<div style="position:absolute;top:6px;right:6px;display:flex;gap:4px;">' +
                        '<button class="ml-copy-btn" data-url="' + url.replace(/"/g, '&quot;') + '" style="background:white;border:none;border-radius:50%;width:32px;height:32px;font-size:0.9rem;cursor:pointer;" title="Copiar URL">📋</button>' +
                        (Auth.isAdmin() ? '<button class="ml-delete-btn" data-nombre="' + nombre.replace(/"/g, '&quot;') + '" style="background:#dc2626;border:none;border-radius:50%;width:32px;height:32px;font-size:0.9rem;cursor:pointer;color:white;" title="Eliminar">🗑️</button>' : '') +
                    '</div>' +
                '</div>' +
                '<div style="padding:10px;flex:1;">' +
                    '<p style="font-size:11px;color:#9ca3af;margin:0 0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + nombre + '">' + nombre + '</p>' +
                    '<select class="ml-cat-select" data-nombre="' + nombre.replace(/"/g, '&quot;') + '" style="width:100%;padding:5px;font-size:12px;border:1px solid #d1d5db;border-radius:5px;margin-bottom:5px;color:#374151;">' + catOpts + '</select>' +
                    '<input type="text" class="ml-pie-input" data-nombre="' + nombre.replace(/"/g, '&quot;') + '" value="' + pieDeFoto + '" placeholder="Pie de foto..." style="width:100%;padding:5px;font-size:12px;border:1px solid #d1d5db;border-radius:5px;margin-bottom:5px;box-sizing:border-box;color:#374151;">' +
                    '<input type="text" class="ml-cred-input" data-nombre="' + nombre.replace(/"/g, '&quot;') + '" value="' + credito + '" placeholder="Crédito fotográfico..." style="width:100%;padding:5px;font-size:12px;border:1px solid #d1d5db;border-radius:5px;box-sizing:border-box;color:#374151;">' +
                '</div>';
            return card.outerHTML;
        }).join('');
    },

    // Actualizar metadatos de imagen desde página Medios
    actualizarMeta: async function(nombre, campo, valor) {
        try {
            const update = { nombre };
            update[campo] = valor || null;
            await supabaseClient
                .from('imagenes_metadata')
                .upsert(update, { onConflict: 'nombre' });
            showToast('✅ Guardado', 'success', 1200);
        } catch(e) {
            showToast('Error guardando metadato', 'error');
        }
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
        const isAdmin = Auth.isAdmin();

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
                    ${isAdmin ? `
                    <a href="/admin/videos" onclick="AdminComponents.closeSidebarMobile()" class="${currentPath.includes('/videos') ? 'active' : ''}">
                        📹 Videos
                    </a>` : ''}
                    <a href="/admin/medios" onclick="AdminComponents.closeSidebarMobile()" class="${currentPath === '/admin/medios' ? 'active' : ''}">
                        🖼️ Medios
                    </a>
                    ${isAdmin ? `
                    <hr>
                    <a href="/admin/usuarios" onclick="AdminComponents.closeSidebarMobile()" class="${currentPath === '/admin/usuarios' ? 'active' : ''}">
                        👥 Usuarios
                    </a>` : ''}
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
                    <h1>${title}</h1>
                </div>
                <div class="header-actions">
                    <span class="current-date">${new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
            </header>
        `;
    },

    // Bottom tab bar for mobile — replaces hamburger menu
    bottomTabBar: function() {
        var currentPath = window.location.pathname;
        var isAdmin = Auth.isAdmin();
        return '<nav class="admin-bottom-tabs" id="admin-bottom-tabs">' +
            '<a href="/admin" class="abt-tab' + (currentPath === '/admin' ? ' abt-active' : '') + '">' +
                '<span class="abt-icon">📊</span><span class="abt-label">Inicio</span>' +
            '</a>' +
            '<a href="/admin/articulos" class="abt-tab' + (currentPath.includes('/articulos') ? ' abt-active' : '') + '">' +
                '<span class="abt-icon">📝</span><span class="abt-label">Notas</span>' +
            '</a>' +
            '<a href="/admin/nuevo" class="abt-tab abt-tab-new' + (currentPath === '/admin/nuevo' ? ' abt-active' : '') + '">' +
                '<span class="abt-icon">➕</span><span class="abt-label">Nuevo</span>' +
            '</a>' +
            '<a href="/admin/medios" class="abt-tab' + (currentPath === '/admin/medios' ? ' abt-active' : '') + '">' +
                '<span class="abt-icon">🖼</span><span class="abt-label">Medios</span>' +
            '</a>' +
            '<button class="abt-tab" onclick="AdminComponents.toggleMoreMenu()">' +
                '<span class="abt-icon">☰</span><span class="abt-label">Mas</span>' +
            '</button>' +
        '</nav>' +
        '<div class="abt-more-menu" id="abt-more-menu" style="display:none;">' +
            '<div class="abt-more-overlay" onclick="AdminComponents.closeMoreMenu()"></div>' +
            '<div class="abt-more-sheet">' +
                (isAdmin ? '<a href="/admin/videos" onclick="AdminComponents.closeMoreMenu()">📹 Videos</a>' : '') +
                (isAdmin ? '<a href="/admin/usuarios" onclick="AdminComponents.closeMoreMenu()">👥 Usuarios</a>' : '') +
                '<a href="/" target="_blank">🌐 Ver sitio</a>' +
                '<a href="#" onclick="AdminPages.logout(); return false;">🚪 Cerrar sesion</a>' +
            '</div>' +
        '</div>';
    },

    // Inject bottom tab bar into the page (called after each page render)
    injectBottomTabs: function() {
        // Only on mobile
        if (window.innerWidth > 768) return;
        // Don't show on login page
        if (!Auth.isLoggedIn()) return;
        // Remove existing
        var existing = document.getElementById('admin-bottom-tabs');
        if (existing) existing.remove();
        var existingMore = document.getElementById('abt-more-menu');
        if (existingMore) existingMore.remove();
        // Inject
        var wrapper = document.createElement('div');
        wrapper.innerHTML = this.bottomTabBar();
        while (wrapper.firstChild) {
            document.body.appendChild(wrapper.firstChild);
        }
    },

    toggleMoreMenu: function() {
        var menu = document.getElementById('abt-more-menu');
        if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    },

    closeMoreMenu: function() {
        var menu = document.getElementById('abt-more-menu');
        if (menu) menu.style.display = 'none';
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

// ==================== ONBOARDING SYSTEM ====================
// Shows a welcome guide for new editors on their first login.
// Completion is stored in localStorage keyed by user ID.

var Onboarding = {
    STORAGE_PREFIX: 'bj_onboarding_done_',

    _isCompleted: function(userId) {
        return localStorage.getItem(this.STORAGE_PREFIX + userId) === 'true';
    },

    _markCompleted: function(userId) {
        localStorage.setItem(this.STORAGE_PREFIX + userId, 'true');
    },

    // Check and show onboarding if needed (call after dashboard renders)
    checkAndShow: function() {
        var user = Auth.getUser();
        if (!user) return;
        // Only show for editors, not admins
        if (user.role === 'admin') return;
        if (this._isCompleted(user.id)) return;

        this._showModal(user);
    },

    _showModal: function(user) {
        var self = this;
        var overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML =
            '<div class="onboarding-panel">' +
                '<h2>Bienvenido/a, ' + (user.name || 'Editor') + '!</h2>' +
                '<p class="ob-subtitle">Te preparamos una guia rapida para empezar a publicar en Beisjoven.</p>' +
                '<ul class="onboarding-steps">' +
                    '<li>' +
                        '<span class="ob-step-num">1</span>' +
                        '<div class="ob-step-text">' +
                            '<strong>Crea tu primer articulo</strong>' +
                            '<span>Ve a "Nuevo Articulo" en el menu lateral y escribe tu primera nota.</span>' +
                        '</div>' +
                    '</li>' +
                    '<li>' +
                        '<span class="ob-step-num">2</span>' +
                        '<div class="ob-step-text">' +
                            '<strong>Sube una imagen</strong>' +
                            '<span>Usa la Biblioteca de Medios para subir fotos. Las puedes insertar en tus articulos.</span>' +
                        '</div>' +
                    '</li>' +
                    '<li>' +
                        '<span class="ob-step-num">3</span>' +
                        '<div class="ob-step-text">' +
                            '<strong>Envia tu borrador</strong>' +
                            '<span>Tu articulo se guardara como borrador. Un administrador lo revisara y publicara.</span>' +
                        '</div>' +
                    '</li>' +
                '</ul>' +
                '<a href="https://docs.google.com/document/d/1_beisjoven_guia_estilo" target="_blank" class="ob-guide-link" rel="noopener">📖 Guia de estilo editorial</a>' +
                '<button class="ob-dismiss" id="ob-dismiss-btn">Empezar</button>' +
            '</div>';

        document.body.appendChild(overlay);

        document.getElementById('ob-dismiss-btn').addEventListener('click', function() {
            self._markCompleted(user.id);
            overlay.remove();
        });

        // Also dismiss on overlay click
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                self._markCompleted(user.id);
                overlay.remove();
            }
        });
    }
};

// Exportar
if (typeof window !== 'undefined') {
    window.AdminPages = AdminPages;
    window.AdminComponents = AdminComponents;
    window.Onboarding = Onboarding;
}
