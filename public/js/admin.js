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

        // YOUTUBE-EDITOR-FIX: data-loss safety net.
        // Never overwrite an existing article with empty editor content.
        // If the editor failed to render (e.g. broken YouTube embed crashed
        // ProseMirror), getValue() returns '' or '<p></p>' — which would
        // wipe the good content already in Supabase.
        var editorHtml = (data.contenido || '').trim();
        var isEditorEmpty = !editorHtml || editorHtml === '<p></p>' || editorHtml === '<br>' || editorHtml === '<p><br></p>';
        if (isEditorEmpty && (this._editId || this._draftId)) {
            console.warn('[autosave] Skipped: editor empty but article exists (id=' + (this._editId || this._draftId) + ')');
            this._updateIndicator('unsaved');
            return;
        }

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

        // Update historias badge now that the final sidebar is in the DOM
        AdminComponents.updateHistoriasBadge();
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
    editor: async function({ params, query }) {
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

        // ?historia=<uuid> — prefill new articles from a Tu Historia submission
        let historiaSeed = null;
        // Reset any previous seed; we only want to mark the submission as
        // publicada when THIS editor session came from a historia link.
        // NOTE: the editor is registered with Router as a detached method
        // (Router.register('/admin/nuevo', AdminPages.editor)), so `this`
        // inside this function is NOT AdminPages. We must reference
        // AdminPages directly — otherwise we write to window/undefined and
        // saveArticle (which does use AdminPages.*) never sees the id.
        AdminPages._currentHistoriaSourceId = null;
        // Read the historia ID directly from the URL. We do this BEFORE the
        // seed fetch (and independent of its success) so the auto-transition
        // to publicada still fires even if loading the seed data fails, and
        // so that opening /admin/nuevo?historia=UUID in a fresh tab works —
        // the in-memory variable from the origin tab is gone at that point.
        const _urlParams = new URLSearchParams(window.location.search);
        const _urlHistoriaId = _urlParams.get('historia');
        if (!isEdit && _urlHistoriaId) {
            AdminPages._currentHistoriaSourceId = _urlHistoriaId;
            console.log('[editor] Seeded from historia:', _urlHistoriaId);
        }
        if (!isEdit && query && query.get && query.get('historia')) {
            const historiaId = query.get('historia');
            try {
                const { data, error } = await supabaseClient
                    .from('historias_enviadas')
                    .select('*')
                    .eq('id', historiaId)
                    .single();
                if (!error && data) {
                    historiaSeed = data;
                } else if (error) {
                    console.error('[editor] Failed to load historia seed:', error);
                }
            } catch (e) {
                console.error('[editor] Failed to load historia seed:', e);
            }
        }

        // Cargar categorías, autores y tags
        const [categorias, autores, allTags] = await Promise.all([
            SupabaseAPI.getCategorias(),
            SupabaseAPI.getAutores(),
            SupabaseAPI.getTags()
        ]);

        // Map categoria_sugerida slug → categoria_id (if we have a seed)
        let historiaCategoriaId = null;
        let historiaContentHtml = '';
        let historiaImagenUrl = '';
        let historiaCreditoFoto = '';
        if (historiaSeed) {
            const matchCat = categorias.find(c => c.slug === historiaSeed.categoria_sugerida);
            if (matchCat) historiaCategoriaId = matchCat.id;
            // Wrap descripcion text in paragraphs, preserving blank-line breaks
            const paragraphs = String(historiaSeed.descripcion || '')
                .split(/\n{2,}/)
                .map(p => p.trim())
                .filter(Boolean)
                .map(p => '<p>' + p.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</p>')
                .join('');
            historiaContentHtml = paragraphs || '<p></p>';
            // First photo → imagen principal
            if (historiaSeed.fotos && historiaSeed.fotos.length > 0) {
                historiaImagenUrl = SupabaseHistorias.obtenerUrlFoto(historiaSeed.fotos[0]);
            }
            // Credit opt-in → crédito fotográfico
            if (historiaSeed.permitir_credito && historiaSeed.nombre) {
                historiaCreditoFoto = 'Cortesía ' + historiaSeed.nombre;
            }
        }

        // Si es edición, cargar el artículo y sus tags
        let article = null;
        let articleTags = []; // array of tag objects already assigned to this article
        if (isEdit) {
            const { data, error } = await supabaseClient
                .from('articulos')
                .select('*')
                .eq('id', params.id)
                .single();

            if (data) {
                article = data;
                articleTags = await SupabaseAPI.getTagsByArticuloId(parseInt(params.id));
            }
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
                        <form id="article-form" class="article-form" novalidate>
                            <!-- 
                                FORM GRID: CSS Grid Areas
                                Desktop: 2 columnas (main izq, sidebar der)
                                Móvil: 1 columna en orden editorial
                                Orden móvil: título → extracto → meta → contenido → imagen → checks → acciones
                            -->
                            <div class="form-grid-new">

                                <div class="fg-titulo">
                                    <label for="title">Título *</label>
                                    <input type="text" id="title" value="${article?.titulo || (useDraft && draft ? draft.titulo : '') || (historiaSeed ? (historiaSeed.titulo || '').replace(/"/g, '&quot;') : '') || ''}" placeholder="Título de la noticia" oninput="AdminPages.autoSlug()">
                                </div>

                                <div class="fg-extracto">
                                    <label for="excerpt">Extracto *</label>
                                    <textarea id="excerpt" rows="3" placeholder="Breve descripción (aparece en tarjetas)">${article?.extracto || (useDraft && draft ? draft.extracto : '') || ''}</textarea>
                                    <div style="margin-top:8px;">
                                        <label for="slug" style="font-size:0.82rem;color:#6b7280;font-weight:500;margin-bottom:4px;">URL / Slug</label>
                                        <div style="display:flex;gap:6px;align-items:center;">
                                            <span style="font-size:0.8rem;color:#9ca3af;flex-shrink:0;">/articulo/</span>
                                            <input type="text" id="slug" value="${article?.slug || (useDraft && draft ? draft.slug : '') || ''}" placeholder="se-genera-del-titulo" style="flex:1;font-size:0.85rem !important;padding:8px 10px !important;min-height:auto !important;" oninput="AdminPages._slugManual=true">
                                        </div>
                                    </div>
                                </div>

                                <div class="fg-meta">
                                    <div class="fg-meta-row">
                                        <div class="form-group">
                                            <label for="category">Categoría *</label>
                                            <select id="category">
                                                <option value="">Seleccionar...</option>
                                                ${categorias.map(c => `
                                                    <option value="${c.id}" ${article?.categoria_id === c.id ? 'selected' : (useDraft && draft && draft.categoria_id == c.id ? 'selected' : (historiaCategoriaId === c.id ? 'selected' : ''))}>
                                                        ${c.nombre}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label for="author">Autor *</label>
                                            <select id="author">
                                                ${autores.map(a => `
                                                    <option value="${a.id}" ${article?.autor_id === a.id ? 'selected' : (useDraft && draft && draft.autor_id == a.id ? 'selected' : '')}>
                                                        ${a.nombre}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </div>
                                    </div>
                                    <div class="form-group" style="margin-top:14px;">
                                        <label>Etiquetas (Tags)</label>
                                        <div id="tag-pill-container" class="tag-pill-container"></div>
                                        <div style="position:relative;margin-top:6px;">
                                            <input type="text" id="tag-search-input" placeholder="Escribir para buscar o crear tag…" autocomplete="off">
                                            <div id="tag-suggestions" class="tag-suggestions" style="display:none;"></div>
                                        </div>
                                        <input type="hidden" id="selected-tag-ids" value="">
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
                                            <input type="url" id="image" value="${article?.imagen_url || (useDraft && draft ? draft.imagen_url : '') || historiaImagenUrl || ''}" placeholder="URL de la imagen..." style="flex:1;" readonly>
                                            <button type="button" class="btn-media-picker" onclick="openMediaPicker()">📷 Seleccionar</button>
                                        </div>
                                        <div id="image-preview" class="image-preview">
                                            ${(() => { const pi = article?.imagen_url || (useDraft && draft?.imagen_url) || historiaImagenUrl; return pi ? `<img src="${pi}" alt="Preview">` : '<span>Sin imagen</span>'; })()}
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="foto-pie">Pie de foto</label>
                                        <input type="text" id="foto-pie" value="${article?.pie_de_foto || (useDraft && draft ? draft.pie_de_foto : '') || ''}" placeholder="Descripción de la imagen principal">
                                    </div>
                                    <div class="form-group">
                                        <label for="foto-credito">Crédito fotográfico</label>
                                        <input type="text" id="foto-credito" value="${article?.foto_credito || (useDraft && draft ? draft.foto_credito : '') || historiaCreditoFoto || ''}" placeholder="Ej: Foto: Getty Images">
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
                                            btns += '<button type="button" class="btn btn-primary btn-block" data-action="save">Guardar Cambios</button>';
                                            if (_isAdmin) btns += '<button type="button" class="btn btn-outline btn-block" data-action="unpublish">Despublicar</button>';
                                        } else {
                                            if (_isAdmin) btns += '<button type="button" class="btn btn-primary btn-block" data-action="publish">Publicar</button>';
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
                /* Metadata accordion — mobile only */
                .metadata-accordion-toggle { display: none; }
                @media (max-width: 768px) {
                    .metadata-accordion-toggle {
                        display: flex; align-items: center; justify-content: space-between;
                        width: 100%; margin: 8px 16px 0; padding: 10px 14px;
                        background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px;
                        font-size: 0.9rem; font-weight: 600; color: #1e3a5f;
                        cursor: pointer; box-sizing: border-box;
                        touch-action: manipulation; -webkit-tap-highlight-color: transparent;
                    }
                    .metadata-accordion-toggle .acc-arrow { transition: transform 0.2s; font-size: 0.8rem; }
                    .metadata-accordion-toggle.open .acc-arrow { transform: rotate(180deg); }
                    .fg-extracto, .fg-meta, .fg-imagen, .fg-checks { overflow: hidden; }
                    .form-grid-new.accordion-closed .fg-extracto,
                    .form-grid-new.accordion-closed .fg-meta,
                    .form-grid-new.accordion-closed .fg-imagen,
                    .form-grid-new.accordion-closed .fg-checks { display: none; }
                }
                .admin-sticky-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999; background: #ffffff; padding: 10px 16px; box-shadow: 0 -2px 12px rgba(0,0,0,0.15); display: flex; gap: 10px; align-items: center; color-scheme: light; }
                .admin-sticky-bar .btn-publish { flex: 2; padding: 14px; background: #c4122e; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer; font-family: inherit; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
                .admin-sticky-bar .btn-cancel { flex: 1; padding: 14px; background: #f3f4f6; color: #374151; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit; text-decoration: none; text-align: center; display: flex; align-items: center; justify-content: center; touch-action: manipulation; }
                .admin-sticky-bar .btn-preview { width: 48px; height: 48px; background: #1e3a5f; color: white; border: none; border-radius: 8px; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
                .admin-sticky-bar .btn-draft { flex: 1; padding: 14px 8px; background: #f3f4f6; color: #374151; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; touch-action: manipulation; }
                .admin-sticky-bar .btn-unpublish { flex: 1; padding: 14px 8px; background: transparent; color: #6b7280; border: 2px solid #d1d5db; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; touch-action: manipulation; }
                .admin-sticky-bar .autosave-txt { font-size: 0.72rem; color: #9ca3af; flex-shrink: 0; }
                /* Tag pill input */
                .tag-pill-container { display: flex; flex-wrap: wrap; gap: 6px; min-height: 32px; }
                .tag-pill { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: #1B2A4A; color: white; border-radius: 9999px; font-size: 0.8rem; font-weight: 500; }
                .tag-pill button { background: none; border: none; color: white; cursor: pointer; font-size: 1rem; line-height: 1; padding: 0 0 0 2px; opacity: 0.75; }
                .tag-pill button:hover { opacity: 1; }
                .tag-suggestions { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 2px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; max-height: 200px; overflow-y: auto; margin-top: 2px; }
                .tag-suggestion-item { padding: 10px 14px; cursor: pointer; font-size: 0.9rem; color: #111827; }
                .tag-suggestion-item:hover, .tag-suggestion-item.active { background: #f3f4f6; }
                .tag-suggestion-item.create { color: #c4122e; font-weight: 600; }
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

        // ==================== BUTTON HANDLERS ====================
        // Attached IMMEDIATELY after DOM is ready (before editor/library init)
        // so a crash in TiptapEditor, MediaLibrary, or Autosave can never
        // prevent the Publicar/Guardar buttons from working.
        document.getElementById('article-form').addEventListener('submit', function(e) {
            e.preventDefault();
        });
        document.querySelectorAll('[data-action]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                AdminPages.saveArticle(isEdit ? parseInt(params.id) : null, this.getAttribute('data-action'));
            });
        });

        // ==================== EDITOR & LIBRARY INIT ====================
        // Wrapped in try/catch: a crash here must NEVER prevent the
        // Publicar/Guardar buttons from working (handlers already attached above).
        try {
            // Initialize Rich Text Editor
            const initialContent = article?.contenido || (useDraft && draft ? draft.contenido : '') || historiaContentHtml || '';

            if (typeof TiptapEditor !== 'undefined') {
                contentEditor = TiptapEditor.create(
                    'content-editor-container',
                    'content',
                    initialContent
                );
            } else if (typeof RichTextEditor !== 'undefined') {
                contentEditor = RichTextEditor.create(
                    'content-editor-container',
                    'content',
                    initialContent
                );
                setTimeout(initMarkdownImport, 300);
            } else {
                document.getElementById('content-editor-container').innerHTML = `
                    <textarea id="content" rows="15" placeholder="Escribe el contenido del artículo aquí...">${initialContent}</textarea>
                    <small>Puedes usar HTML básico: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;a&gt;</small>
                `;
            }

            // Reset slug manual flag so auto-slug works on new articles
            AdminPages._slugManual = !!(article?.slug);

            // Metadata accordion — mobile only
            if (window.innerWidth <= 768) {
                var formGrid = document.querySelector('.form-grid-new');
                var tituloEl = document.querySelector('.fg-titulo');
                if (formGrid && tituloEl) {
                    formGrid.classList.add('accordion-closed');
                    var accBtn = document.createElement('button');
                    accBtn.type = 'button';
                    accBtn.className = 'metadata-accordion-toggle';
                    accBtn.innerHTML = '<span>Metadatos &amp; Opciones</span><span class="acc-arrow">▼</span>';
                    accBtn.addEventListener('click', function() {
                        formGrid.classList.toggle('accordion-closed');
                        accBtn.classList.toggle('open', !formGrid.classList.contains('accordion-closed'));
                    });
                    tituloEl.insertAdjacentElement('afterend', accBtn);
                }
            }

            // MediaLibrary modal is available on demand via openMediaPicker() →
            // MediaLibrary.open(); no up-front init() call is needed.

            // Start autosave AFTER editor is initialized so connectEditor works
            Autosave.start(isEdit ? parseInt(params.id) : null);
            Autosave.connectEditor();
        } catch (initError) {
            console.error('[editor] Initialization error (buttons still work):', initError);
        }

        // Tag input — separate try/catch so editor/library crashes never block it
        try {
            AdminPages._initTagInput(allTags, articleTags);
        } catch (tagError) {
            console.error('[Tags] Init error:', tagError);
        }

        document.title = (isEdit ? 'Editar' : 'Nuevo Artículo') + ' - Beisjoven Admin';
    },

    // ==================== FUNCIONES AUXILIARES ====================

    _slugManual: false,

    // ==================== TAG INPUT ====================

    _initTagInput: function(allTags, initialTags) {
        console.log('[Tags] _initTagInput called, allTags:', allTags?.length, 'initialTags:', initialTags?.length);
        var self = this;
        // selectedTags: array of {id, nombre, slug}
        var selectedTags = initialTags ? initialTags.slice() : [];
        var pillContainer = document.getElementById('tag-pill-container');
        var searchInput = document.getElementById('tag-search-input');
        var suggestionsBox = document.getElementById('tag-suggestions');
        var hiddenInput = document.getElementById('selected-tag-ids');
        if (!pillContainer || !searchInput || !suggestionsBox || !hiddenInput) {
            console.error('[Tags] DOM elements missing:', { pillContainer: !!pillContainer, searchInput: !!searchInput, suggestionsBox: !!suggestionsBox, hiddenInput: !!hiddenInput });
            return;
        }

        var highlightIndex = -1; // keyboard navigation index
        var debounceTimer = null;

        function makeSlug(str) {
            return str.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[ñ]/g, 'n')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
        }

        function syncHidden() {
            hiddenInput.value = selectedTags.map(t => t.id).join(',');
        }

        function renderPills() {
            pillContainer.innerHTML = '';
            selectedTags.forEach(function(tag) {
                var pill = document.createElement('span');
                pill.className = 'tag-pill';
                pill.innerHTML = escapeHTML(tag.nombre) + '<button type="button" aria-label="Quitar tag">&times;</button>';
                pill.querySelector('button').addEventListener('click', function() {
                    selectedTags = selectedTags.filter(t => t.id !== tag.id);
                    renderPills();
                    syncHidden();
                });
                pillContainer.appendChild(pill);
            });
        }

        function updateHighlight() {
            var items = suggestionsBox.querySelectorAll('.tag-suggestion-item');
            items.forEach(function(el, i) {
                el.classList.toggle('active', i === highlightIndex);
            });
            // Scroll active item into view
            if (highlightIndex >= 0 && items[highlightIndex]) {
                items[highlightIndex].scrollIntoView({ block: 'nearest' });
            }
        }

        function showSuggestions(query) {
            var q = query.trim().toLowerCase();
            suggestionsBox.innerHTML = '';
            highlightIndex = -1;
            if (!q) { suggestionsBox.style.display = 'none'; return; }

            var filtered = allTags.filter(function(t) {
                return t.nombre.toLowerCase().includes(q) && !selectedTags.find(s => s.id === t.id);
            }).slice(0, 8);

            filtered.forEach(function(tag) {
                var item = document.createElement('div');
                item.className = 'tag-suggestion-item';
                item.textContent = tag.nombre;
                item.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    addTag(tag);
                });
                suggestionsBox.appendChild(item);
            });

            // "Crear: [text]" option if query doesn't exactly match an existing tag
            var exactMatch = allTags.find(t => t.nombre.toLowerCase() === q || t.slug === makeSlug(q));
            if (q && !exactMatch) {
                var createItem = document.createElement('div');
                createItem.className = 'tag-suggestion-item create';
                createItem.textContent = 'Crear: ' + query.trim();
                createItem.addEventListener('mousedown', async function(e) {
                    e.preventDefault();
                    var newTag = await SupabaseAPI.createTag(query.trim(), makeSlug(query.trim()));
                    if (newTag) {
                        allTags.push(newTag);
                        addTag(newTag);
                    }
                });
                suggestionsBox.appendChild(createItem);
            }

            suggestionsBox.style.display = suggestionsBox.children.length > 0 ? '' : 'none';
        }

        function addTag(tag) {
            if (selectedTags.find(t => t.id === tag.id)) return;
            selectedTags.push(tag);
            renderPills();
            syncHidden();
            searchInput.value = '';
            suggestionsBox.style.display = 'none';
            highlightIndex = -1;
        }

        function confirmHighlightedOrFirst() {
            var items = suggestionsBox.querySelectorAll('.tag-suggestion-item');
            var target = (highlightIndex >= 0 && items[highlightIndex]) ? items[highlightIndex] : items[0];
            if (target) target.dispatchEvent(new MouseEvent('mousedown'));
        }

        // Debounced input handler (200ms)
        searchInput.addEventListener('input', function() {
            var val = this.value;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
                showSuggestions(val);
            }, 200);
        });

        searchInput.addEventListener('keydown', function(e) {
            var items = suggestionsBox.querySelectorAll('.tag-suggestion-item');
            var visible = suggestionsBox.style.display !== 'none' && items.length > 0;

            // Arrow down
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (visible) {
                    highlightIndex = (highlightIndex + 1) % items.length;
                    updateHighlight();
                }
                return;
            }

            // Arrow up
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (visible) {
                    highlightIndex = highlightIndex <= 0 ? items.length - 1 : highlightIndex - 1;
                    updateHighlight();
                }
                return;
            }

            // Enter or Comma confirms selection — MUST NOT bubble to Publicar button
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                e.stopPropagation();
                if (e.key === ',') {
                    // Remove trailing comma from input value
                    searchInput.value = searchInput.value.replace(/,\s*$/, '');
                }
                if (visible) {
                    confirmHighlightedOrFirst();
                }
                return;
            }

            // Escape closes dropdown
            if (e.key === 'Escape') {
                suggestionsBox.style.display = 'none';
                highlightIndex = -1;
                return;
            }

            // Backspace on empty input removes last pill
            if (e.key === 'Backspace' && !searchInput.value) {
                if (selectedTags.length > 0) {
                    selectedTags.pop();
                    renderPills();
                    syncHidden();
                }
                return;
            }
        });

        searchInput.addEventListener('focus', function() {
            if (this.value.trim()) showSuggestions(this.value);
        });

        searchInput.addEventListener('blur', function() {
            // Delay to allow mousedown on suggestion items to fire first
            setTimeout(function() { suggestionsBox.style.display = 'none'; highlightIndex = -1; }, 150);
        });

        document.addEventListener('click', function(e) {
            if (!suggestionsBox.contains(e.target) && e.target !== searchInput) {
                suggestionsBox.style.display = 'none';
                highlightIndex = -1;
            }
        });

        // Expose getter for saveArticle
        AdminPages._getSelectedTagIds = function() {
            return selectedTags.map(t => t.id);
        };

        renderPills();
        syncHidden();
    },

    _getSelectedTagIds: function() { return []; },

    autoSlug: function() {
        // Only auto-fill if the user hasn't manually edited the slug field
        if (this._slugManual) return;
        const slugField = document.getElementById('slug');
        if (!slugField) return;
        const titleVal = document.getElementById('title').value;
        slugField.value = titleVal.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[ñ]/g, 'n')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    },

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
        // Stop autosave timer FIRST — prevents race where the 30s timer fires
        // during the Supabase await and sends publicado:false, overwriting our save.
        Autosave.stop();

        const titulo = document.getElementById('title').value.trim();
        const extracto = document.getElementById('excerpt').value.trim();
        const categoriaVal = document.getElementById('category').value;
        const autorVal = document.getElementById('author').value;

        // JS validation — replaces native HTML required attributes
        const errores = [];
        if (!titulo) errores.push('Título es requerido');
        if (!extracto) errores.push('Extracto es requerido');
        if (!categoriaVal) errores.push('Selecciona una categoría');
        if (!autorVal) errores.push('Selecciona un autor');
        if (errores.length > 0) {
            showToast(errores.join('. '), 'error');
            Autosave.start(editId);
            return;
        }

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

        const categoria_id = categoriaVal ? parseInt(categoriaVal) : null;
        const autor_id = autorVal ? parseInt(autorVal) : null;
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
        const trimmedContenido = (contenidoRaw || '').trim();
        const editorIsEmpty = !trimmedContenido || trimmedContenido === '<br>' || trimmedContenido === '<p></p>' || trimmedContenido === '<p><br></p>';
        if (editorIsEmpty) {
            // YOUTUBE-EDITOR-FIX: if we're editing an existing article and the editor
            // is empty, this is almost certainly an editor-render failure (e.g. broken
            // YouTube embed). Refuse to overwrite the saved content silently — make
            // the user explicitly confirm.
            if (editId) {
                const ok = confirm('El editor está vacío. ¿Guardar de todos modos? (Esto eliminará el contenido existente del artículo).');
                if (!ok) {
                    Autosave.start(editId);
                    return;
                }
            } else {
                showToast('El contenido del artículo es requerido', 'error');
                return;
            }
        }

        // C) Sanitizar contenido para prevenir XSS
        const contenido = sanitizeHtmlBasic(contenidoRaw);

        // Crear slug — use the slug field if filled, otherwise derive from title
        const slugFieldVal = (document.getElementById('slug')?.value || '').trim();
        const slug = slugFieldVal ||
            titulo.toLowerCase()
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
        let savedArticleId = null; // Captured on success; used for redirect

        console.log('[saveArticle] action:', action, '| editId:', editId, '| draftId:', Autosave.getDraftId());
        console.log('[saveArticle] payload:', JSON.stringify(articulo));

        if (editId) {
            // Editar existente
            result = await SupabaseAdmin.actualizarArticulo(editId, articulo);
            console.log('[saveArticle] actualizarArticulo result:', result);
            if (result.success) {
                try {
                    var _tagIds = AdminPages._getSelectedTagIds();
                    console.log('[Tags] Syncing:', _tagIds);
                    await SupabaseAPI.syncArticuloTags(editId, _tagIds);
                } catch (e) { console.error('[Tags] Sync error (non-fatal):', e); }
                Autosave.clear();
                showToast(toastMsg[action] || '✅ Artículo actualizado correctamente', 'success');
            } else {
                showToast('Error al guardar: ' + result.error, 'error');
                return;
            }
        } else if (Autosave.getDraftId()) {
            // Rule 8: manual save uses same draft ID from autosave
            var draftId = Autosave.getDraftId();
            result = await SupabaseAdmin.actualizarArticulo(draftId, articulo);
            console.log('[saveArticle] actualizarArticulo (draft ' + draftId + ') result:', result);
            if (result.success) {
                savedArticleId = draftId;
                try {
                    var _tagIds2 = AdminPages._getSelectedTagIds();
                    console.log('[Tags] Syncing:', _tagIds2);
                    await SupabaseAPI.syncArticuloTags(draftId, _tagIds2);
                } catch (e) { console.error('[Tags] Sync error (non-fatal):', e); }
                Autosave.clear();
                showToast(toastMsg[action] || '✅ Artículo guardado correctamente', 'success');
            } else {
                showToast('Error al guardar: ' + result.error, 'error');
                return;
            }
        } else {
            // No autosave draft exists — INSERT new article
            console.log('[saveArticle] crearArticulo — no draft ID, doing INSERT');
            result = await SupabaseAdmin.crearArticulo(articulo);
            console.log('[saveArticle] crearArticulo result:', result);
            if (result.success) {
                savedArticleId = result.data.id;
                try {
                    var _tagIds3 = AdminPages._getSelectedTagIds();
                    console.log('[Tags] Syncing:', _tagIds3);
                    await SupabaseAPI.syncArticuloTags(result.data.id, _tagIds3);
                } catch (e) { console.error('[Tags] Sync error (non-fatal):', e); }
                Autosave.clear();
                showToast(toastMsg[action] || '✅ Artículo guardado correctamente', 'success');
            } else {
                showToast('Error al guardar: ' + result.error, 'error');
                return;
            }
        }

        // Trigger Vercel rebuild only for publish and save (already published)
        // Drafts and unpublish do NOT trigger rebuild
        if (action === 'publish' || action === 'save') {
            AdminPages._triggerVercelRebuild();
        }

        // If this editor session was seeded from a Tu Historia submission,
        // mark that submission as publicada and link it to the new article.
        // Non-fatal: a failure here must not block the save.
        console.log('[saveArticle] historia check — editId:', editId, 'savedArticleId:', savedArticleId, 'sourceId:', AdminPages._currentHistoriaSourceId);
        if (!editId && savedArticleId && AdminPages._currentHistoriaSourceId) {
            var histId = AdminPages._currentHistoriaSourceId;
            AdminPages._currentHistoriaSourceId = null; // one-shot
            try {
                var histUpdated = await SupabaseHistorias.actualizarHistoria(histId, {
                    estado: 'publicada',
                    articulo_id: savedArticleId
                });
                console.log('[saveArticle] historia marked publicada:', histUpdated && histUpdated.id, 'estado:', histUpdated && histUpdated.estado);
            } catch (e) {
                console.error('[saveArticle] Failed to mark historia as publicada:', e);
                showToast('El artículo se guardó, pero no pude actualizar el estado del envío.', 'info', 4000);
            }
        }

        // New articles: redirect to the editor of the saved article so the user
        // can confirm content persisted and continue editing if needed.
        // Existing articles: back to articles list (unchanged behavior).
        var redirectPath = editId ? '/admin/articulos' : '/admin/editar/' + savedArticleId;
        setTimeout(function() { Router.navigate(redirectPath); }, 800);
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
        main.innerHTML =
            '<div class="admin-layout">' +
                AdminComponents.sidebar() +
                '<div class="admin-main">' +
                    AdminComponents.header('Biblioteca de Medios') +
                    '<div class="admin-content" id="ml-page-container"></div>' +
                '</div>' +
            '</div>';

        document.title = 'Medios - Beisjoven Admin';
        await MediaLibrary.renderPage('ml-page-container');
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
    },

    // ==================== TU HISTORIA — ADMIN REVIEW PANEL ====================

    _historiasState: {
        estado: 'nueva',
        page: 0,
        limit: 20,
        items: [],
        count: 0,
        counts: {},
        selectedId: null
    },

    _historiasEstados: [
        { key: 'todas',       label: 'Todas',        color: '#6B7280' },
        { key: 'nueva',       label: 'Nuevas',       color: '#D4A843' },
        { key: 'en_revision', label: 'En revisión',  color: '#2563EB' },
        { key: 'verificada',  label: 'Verificadas',  color: '#059669' },
        { key: 'publicada',   label: 'Publicadas',   color: '#1B2A4A' },
        { key: 'descartada',  label: 'Descartadas',  color: '#6B7280' }
    ],

    _historiasRelacionLabels: {
        entrenador: 'Entrenador/a',
        jugador: 'Jugador/a',
        padre_madre: 'Padre / Madre de familia',
        directivo_liga: 'Directivo/a de liga',
        periodista: 'Periodista',
        aficionado: 'Aficionado/a',
        otro: 'Otro'
    },

    _historiasCategoriaLabels: {
        juvenil: 'Juvenil',
        softbol: 'Softbol',
        'liga-mexicana': 'Ligas Mexicanas',
        mlb: 'MLB',
        seleccion: 'Selección',
        opinion: 'Opinión'
    },

    _historiaEstadoBadge: function(estado) {
        var cfg = this._historiasEstados.find(function(e) { return e.key === estado; });
        var color = cfg ? cfg.color : '#6B7280';
        var label = cfg ? cfg.label.replace(/s$/, '') : estado;
        // Map back for singular labels
        var map = { nueva: 'Nueva', en_revision: 'En revisión', verificada: 'Verificada', publicada: 'Publicada', descartada: 'Descartada' };
        label = map[estado] || estado;
        return '<span class="hist-estado-pill" style="background:' + color + ';">' + label + '</span>';
    },

    _relativeDate: function(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        var diff = Math.floor((Date.now() - d.getTime()) / 1000);
        if (diff < 60) return 'hace ' + diff + 's';
        if (diff < 3600) return 'hace ' + Math.floor(diff / 60) + ' min';
        if (diff < 86400) return 'hace ' + Math.floor(diff / 3600) + ' h';
        if (diff < 86400 * 7) return 'hace ' + Math.floor(diff / 86400) + ' d';
        return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    historias: async function(ctx) {
        if (!Auth.isLoggedIn()) {
            Router.navigate('/login');
            return;
        }

        var query = (ctx && ctx.query) || new URLSearchParams();
        var estadoParam = query.get('estado');
        if (estadoParam) this._historiasState.estado = estadoParam;
        this._historiasState.page = 0;

        var main = document.getElementById('main-content');
        main.innerHTML =
            '<div class="admin-layout">' +
                AdminComponents.sidebar() +
                '<div class="admin-main">' +
                    AdminComponents.header('Tu Historia — Envíos') +
                    '<div class="admin-content" id="historias-page-container"><p>Cargando envíos...</p></div>' +
                '</div>' +
            '</div>';

        AdminComponents.injectHistoriasStyles();
        document.title = 'Tu Historia — Beisjoven Admin';

        await this._renderHistoriasPage();
        // Refresh sidebar/tabs badges
        AdminComponents.updateHistoriasBadge();
    },

    _renderHistoriasPage: async function() {
        var container = document.getElementById('historias-page-container');
        if (!container) return;

        var state = this._historiasState;

        // Fetch counts + current page in parallel
        var countsPromise = SupabaseHistorias.contarHistoriasPorEstado();
        var estadoToQuery = state.estado === 'todas' ? null : state.estado;
        var dataPromise = SupabaseHistorias.listarHistorias(estadoToQuery, 0, state.limit);

        var counts, result;
        try {
            counts = await countsPromise;
            result = await dataPromise;
        } catch (e) {
            console.error('[historias] Load failed:', e);
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error al cargar envíos</h3><p>' + (e.message || 'Intenta recargar la página') + '</p></div>';
            return;
        }

        state.counts = counts;
        state.items = result.data;
        state.count = result.count;
        state.page = 0;

        var total = Object.values(counts).reduce(function(a, b) { return a + b; }, 0);
        var nuevasCount = counts.nueva || 0;

        var pillsHtml = this._historiasEstados.map(function(e) {
            var count = e.key === 'todas' ? total : (counts[e.key] || 0);
            var isActive = state.estado === e.key;
            return '<button type="button" class="hist-pill' + (isActive ? ' hist-pill-active' : '') +
                '" onclick="AdminPages._setHistoriaFilter(\'' + e.key + '\')">' +
                e.label + ' (' + count + ')' +
                '</button>';
        }).join('');

        container.innerHTML =
            '<div class="historias-header">' +
                '<div class="historias-total">Total: <strong>' + total + '</strong> envío' + (total === 1 ? '' : 's') + '</div>' +
                '<div class="historias-pills">' + pillsHtml + '</div>' +
            '</div>' +
            '<div id="historias-list-wrap"></div>' +
            '<div id="historias-detail-panel" class="hist-detail-panel" style="display:none;"></div>' +
            '<div id="historias-detail-backdrop" class="hist-detail-backdrop" style="display:none;" onclick="AdminPages.cerrarDetalleHistoria()"></div>';

        this._renderHistoriasList();
    },

    _setHistoriaFilter: function(key) {
        this._historiasState.estado = key;
        this._renderHistoriasPage();
    },

    _renderHistoriasList: function() {
        var wrap = document.getElementById('historias-list-wrap');
        if (!wrap) return;

        var state = this._historiasState;
        var items = state.items;
        var self = this;

        if (!items.length) {
            var msg = state.estado === 'nueva'
                ? 'No hay historias nuevas. ¡Buen trabajo!'
                : state.estado === 'todas'
                    ? 'Aún no hay envíos. Comparte beisjoven.com/tu-historia con la comunidad.'
                    : 'No hay envíos con este estado.';
            wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">📨</div><p>' + msg + '</p></div>';
            return;
        }

        function esc(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }

        // Desktop table
        var tableRows = items.map(function(h) {
            var fecha = new Date(h.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
            var catLabel = self._historiasCategoriaLabels[h.categoria_sugerida] || h.categoria_sugerida || '—';
            var titulo = h.titulo ? (h.titulo.length > 60 ? h.titulo.substring(0, 60) + '…' : h.titulo) : '(sin título)';
            return '<tr class="hist-row" onclick="AdminPages.abrirDetalleHistoria(\'' + h.id + '\')">' +
                '<td>' + fecha + '</td>' +
                '<td>' + esc(h.nombre) + '</td>' +
                '<td><span class="badge">' + esc(catLabel) + '</span></td>' +
                '<td>' + esc(titulo) + '</td>' +
                '<td>' + esc(h.ciudad_estado || '—') + '</td>' +
                '<td>' + self._historiaEstadoBadge(h.estado) + '</td>' +
            '</tr>';
        }).join('');

        // Mobile cards
        var cardsHtml = items.map(function(h) {
            var catLabel = self._historiasCategoriaLabels[h.categoria_sugerida] || h.categoria_sugerida || '—';
            return '<div class="hist-card" onclick="AdminPages.abrirDetalleHistoria(\'' + h.id + '\')">' +
                '<div class="hist-card-top">' +
                    self._historiaEstadoBadge(h.estado) +
                    '<span class="hist-card-date">' + self._relativeDate(h.created_at) + '</span>' +
                '</div>' +
                '<h4 class="hist-card-title">' + esc(h.titulo || '(sin título)') + '</h4>' +
                '<div class="hist-card-meta"><span>' + esc(h.nombre) + '</span><span class="badge">' + esc(catLabel) + '</span></div>' +
                '<div class="hist-card-meta"><small>' + esc(h.ciudad_estado || '') + '</small></div>' +
            '</div>';
        }).join('');

        var countDisplay = items.length + ' de ' + state.count;
        var hasMore = state.count > items.length;

        wrap.innerHTML =
            '<div class="hist-count">Mostrando ' + countDisplay + ' envío' + (state.count === 1 ? '' : 's') + '</div>' +
            '<div class="articles-table hide-mobile hist-table">' +
                '<table>' +
                    '<thead><tr>' +
                        '<th>Fecha</th>' +
                        '<th>Nombre</th>' +
                        '<th>Categoría</th>' +
                        '<th>Título</th>' +
                        '<th>Ciudad</th>' +
                        '<th>Estado</th>' +
                    '</tr></thead>' +
                    '<tbody>' + tableRows + '</tbody>' +
                '</table>' +
            '</div>' +
            '<div class="hist-cards show-mobile">' + cardsHtml + '</div>' +
            (hasMore ? '<div class="hist-load-more-wrap"><button type="button" class="btn btn-secondary" onclick="AdminPages._cargarMasHistorias()">Cargar más</button></div>' : '');
    },

    _cargarMasHistorias: async function() {
        var state = this._historiasState;
        state.page += 1;
        var estadoToQuery = state.estado === 'todas' ? null : state.estado;
        try {
            var result = await SupabaseHistorias.listarHistorias(estadoToQuery, state.page, state.limit);
            state.items = state.items.concat(result.data);
            state.count = result.count;
            this._renderHistoriasList();
        } catch (e) {
            console.error('[historias] Load more failed:', e);
            showToast('Error al cargar más: ' + e.message, 'error');
        }
    },

    abrirDetalleHistoria: function(id) {
        var historia = this._historiasState.items.find(function(h) { return h.id === id; });
        if (!historia) return;
        this._historiasState.selectedId = id;
        this._renderHistoriaDetalle(historia);
    },

    cerrarDetalleHistoria: function() {
        this._historiasState.selectedId = null;
        var panel = document.getElementById('historias-detail-panel');
        var backdrop = document.getElementById('historias-detail-backdrop');
        if (panel) panel.style.display = 'none';
        if (backdrop) backdrop.style.display = 'none';
        document.body.classList.remove('hist-detail-open');
    },

    // Checklist schema — kept in sync with the DB JSONB column.
    // Order here drives render order in the detail panel.
    _historiaChecklistItems: [
        { key: 'org_exists',         label: '¿La liga/organización existe?' },
        { key: 'second_source',      label: '¿Se confirmó con segunda fuente?' },
        { key: 'photos_match',       label: '¿Las fotos corresponden al evento?' },
        { key: 'sender_contactable', label: '¿El remitente es contactable?' },
        { key: 'enough_info',        label: '¿Información suficiente para un artículo?' }
    ],

    // Status-based dropdown options. Keys are the CURRENT status; values
    // are the set of statuses the admin may transition TO (including the
    // current one so the <select> has a valid selected option).
    _historiaAllowedTransitions: {
        nueva:       ['nueva', 'en_revision', 'descartada'],
        en_revision: ['nueva', 'en_revision', 'descartada'],
        verificada:  ['en_revision', 'verificada', 'descartada'],
        publicada:   ['publicada'],
        descartada:  ['nueva', 'descartada']
    },

    _historiaDefaultChecklist: function() {
        var out = {};
        this._historiaChecklistItems.forEach(function(it) { out[it.key] = false; });
        return out;
    },

    _normalizeChecklist: function(raw) {
        var defaults = this._historiaDefaultChecklist();
        if (!raw || typeof raw !== 'object') return defaults;
        Object.keys(defaults).forEach(function(k) {
            defaults[k] = raw[k] === true;
        });
        return defaults;
    },

    _renderHistoriaDetalle: function(h) {
        var panel = document.getElementById('historias-detail-panel');
        var backdrop = document.getElementById('historias-detail-backdrop');
        if (!panel) return;

        var self = this;
        function esc(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
        function escAttr(s) { return esc(s); }
        function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

        var relacionLabel = this._historiasRelacionLabels[h.relacion] || h.relacion;
        var catLabel = this._historiasCategoriaLabels[h.categoria_sugerida] || h.categoria_sugerida || '—';
        var createdAt = new Date(h.created_at).toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        var creditoTxt = h.permitir_credito ? 'Sí, desea ser mencionado/a' : 'No, envío anónimo';

        // Status-derived UI flags
        var estado = h.estado;
        var showChecklist = (estado === 'en_revision' || estado === 'verificada');
        var checklistReadOnly = (estado === 'verificada');
        var showCrearArticulo = (estado === 'verificada');
        var isTerminal = (estado === 'publicada' || estado === 'descartada');
        var selectDisabled = (estado === 'publicada');

        // Build dropdown options limited to allowed transitions
        var estadoMap = { nueva: 'Nueva', en_revision: 'En revisión', verificada: 'Verificada', publicada: 'Publicada', descartada: 'Descartada' };
        var allowed = this._historiaAllowedTransitions[estado] || [estado];
        var estadosOptions = allowed.map(function(key) {
            return '<option value="' + key + '"' + (estado === key ? ' selected' : '') + '>' + (estadoMap[key] || key) + '</option>';
        }).join('');

        var fotosHtml = '';
        if (h.fotos && h.fotos.length) {
            fotosHtml = '<div class="hist-fotos-grid">' +
                h.fotos.map(function(path) {
                    var url = SupabaseHistorias.obtenerUrlFoto(path);
                    return '<a href="' + escAttr(url) + '" target="_blank" rel="noopener" class="hist-foto-thumb">' +
                        '<img src="' + escAttr(url) + '" alt="Foto de la historia" loading="lazy">' +
                    '</a>';
                }).join('') +
            '</div>';
        } else {
            fotosHtml = '<p class="hist-empty-foto">Sin fotos adjuntas</p>';
        }

        // --- Checklist section ---
        var checklistHtml = '';
        if (showChecklist) {
            var checklist = this._normalizeChecklist(h.checklist);
            var itemsHtml = this._historiaChecklistItems.map(function(it) {
                var checked = checklist[it.key] ? ' checked' : '';
                var disabled = checklistReadOnly ? ' disabled' : '';
                return '<li' + (checklistReadOnly ? ' class="hist-checklist-done"' : '') + '>' +
                    '<label>' +
                        '<input type="checkbox" data-key="' + it.key + '"' + checked + disabled + '>' +
                        ' ' + esc(it.label) +
                    '</label>' +
                '</li>';
            }).join('');
            checklistHtml =
                '<section class="hist-section">' +
                    '<h3>Checklist de verificación</h3>' +
                    '<ul class="hist-checklist' + (checklistReadOnly ? ' hist-checklist-readonly' : '') + '">' +
                        itemsHtml +
                    '</ul>' +
                    '<div class="hist-checklist-status" id="hist-checklist-status-' + h.id + '"></div>' +
                '</section>';
        }

        // --- Action buttons ---
        var whatsappBtn = '';
        if (h.telefono && !isTerminal) {
            var waNum = String(h.telefono).replace(/[^0-9]/g, '');
            whatsappBtn = '<a href="https://wa.me/' + encodeURIComponent(waNum) + '" target="_blank" rel="noopener" class="btn btn-secondary hist-btn-wa">📱 Contactar por WhatsApp</a>';
        }
        var crearArticuloBtn = showCrearArticulo
            ? '<button type="button" id="hist-crear-btn" class="btn btn-primary hist-btn-crear" onclick="window.open(\'/admin/nuevo?historia=' + encodeURIComponent(h.id) + '\',\'_blank\')">✍️ Crear artículo</button>'
            : '';
        var reabrirBtn = (estado === 'descartada')
            ? '<button type="button" class="btn btn-secondary hist-btn-reabrir" onclick="AdminPages.cambiarEstadoHistoria(\'' + h.id + '\', \'nueva\')">↩️ Reabrir envío</button>'
            : '';

        // Link to the published article (only for publicada + articulo_id set)
        var publicadaInfoHtml = '';
        if (estado === 'publicada') {
            if (h.articulo_slug) {
                publicadaInfoHtml = '<div class="hist-publicada-info">' +
                    '<strong>Artículo publicado:</strong> ' +
                    '<a href="/articulo/' + encodeURIComponent(h.articulo_slug) + '" target="_blank" rel="noopener">Ver artículo →</a>' +
                '</div>';
            } else if (h.articulo_id) {
                publicadaInfoHtml = '<div class="hist-publicada-info">' +
                    '<strong>Artículo publicado:</strong> ' +
                    '<a href="/admin/editar/' + encodeURIComponent(h.articulo_id) + '">Abrir en el editor →</a>' +
                '</div>';
            } else {
                publicadaInfoHtml = '<div class="hist-publicada-info hist-publicada-info-muted">Este envío ya fue publicado.</div>';
            }
        }

        panel.innerHTML =
            '<div class="hist-detail-inner">' +
                '<div class="hist-detail-header">' +
                    '<div>' +
                        '<h2 class="hist-detail-titulo">' + esc(h.titulo || '(sin título)') + '</h2>' +
                        '<div class="hist-detail-subline">Enviado el ' + esc(createdAt) + '</div>' +
                    '</div>' +
                    '<button type="button" class="hist-close-btn" onclick="AdminPages.cerrarDetalleHistoria()" aria-label="Cerrar">✕</button>' +
                '</div>' +

                '<div class="hist-detail-estado-row">' +
                    '<label>Estado:</label>' +
                    '<select id="hist-estado-select"' + (selectDisabled ? ' disabled' : '') + ' onchange="AdminPages.cambiarEstadoHistoria(\'' + h.id + '\', this.value)">' +
                        estadosOptions +
                    '</select>' +
                    this._historiaEstadoBadge(estado) +
                '</div>' +

                publicadaInfoHtml +

                '<section class="hist-section">' +
                    '<h3>Datos del colaborador</h3>' +
                    '<dl class="hist-dl">' +
                        '<dt>Nombre</dt><dd>' + esc(h.nombre) + '</dd>' +
                        '<dt>Email</dt><dd><a href="mailto:' + escAttr(h.email) + '">' + esc(h.email) + '</a></dd>' +
                        (h.telefono ? '<dt>Teléfono</dt><dd><a href="tel:' + escAttr(h.telefono) + '">' + esc(h.telefono) + '</a></dd>' : '') +
                        '<dt>Relación</dt><dd>' + esc(relacionLabel) + '</dd>' +
                        '<dt>Crédito</dt><dd>' + esc(creditoTxt) + '</dd>' +
                    '</dl>' +
                '</section>' +

                '<section class="hist-section">' +
                    '<h3>La historia</h3>' +
                    '<dl class="hist-dl">' +
                        '<dt>Categoría sugerida</dt><dd><span class="badge">' + esc(catLabel) + '</span></dd>' +
                        (h.liga_organizacion ? '<dt>Liga / Organización</dt><dd>' + esc(h.liga_organizacion) + '</dd>' : '') +
                        '<dt>Ciudad y estado</dt><dd>' + esc(h.ciudad_estado) + '</dd>' +
                    '</dl>' +
                    '<div class="hist-descripcion"><h4>Descripción</h4><p>' + nl2br(h.descripcion) + '</p></div>' +
                '</section>' +

                '<section class="hist-section">' +
                    '<h3>Fotos</h3>' +
                    fotosHtml +
                '</section>' +

                checklistHtml +

                '<section class="hist-section">' +
                    '<h3>Notas editoriales</h3>' +
                    '<textarea id="hist-notas-' + h.id + '" class="hist-notas" placeholder="Notas internas del equipo editorial…" onblur="AdminPages._guardarNotasHistoria(\'' + h.id + '\')">' + esc(h.notas_editoriales || '') + '</textarea>' +
                    '<div class="hist-notas-status" id="hist-notas-status-' + h.id + '"></div>' +
                '</section>' +

                '<div class="hist-actions">' +
                    crearArticuloBtn +
                    reabrirBtn +
                    whatsappBtn +
                    '<button type="button" class="btn btn-secondary" onclick="AdminPages.cerrarDetalleHistoria()">Cerrar</button>' +
                '</div>' +
            '</div>';

        panel.style.display = 'block';
        if (backdrop) backdrop.style.display = 'block';
        document.body.classList.add('hist-detail-open');
        // Scroll panel to top
        panel.scrollTop = 0;

        // --- Wire checklist behavior (en_revision only; verificada is read-only) ---
        if (estado === 'en_revision') {
            var checkboxes = panel.querySelectorAll('.hist-checklist input[type="checkbox"]');
            checkboxes.forEach(function(cb) {
                cb.addEventListener('change', function() {
                    self._guardarChecklistHistoria(h.id);
                });
            });

            // On load: if all 5 are already checked (e.g. saved previously),
            // auto-transition to verificada immediately.
            var stored = self._normalizeChecklist(h.checklist);
            var allAlreadyChecked = self._historiaChecklistItems.every(function(it) {
                return stored[it.key] === true;
            });
            if (allAlreadyChecked) {
                self._guardarChecklistHistoria(h.id);
            }
        }
    },

    // Persist checklist state for a submission in en_revision. Debounced 500ms.
    // If all 5 items are checked, also transitions estado → verificada.
    _guardarChecklistHistoria: function(id) {
        clearTimeout(this._checklistDebounce);
        var self = this;
        this._checklistDebounce = setTimeout(function() {
            self._flushChecklistSave(id);
        }, 500);
    },

    _flushChecklistSave: async function(id) {
        var panel = document.getElementById('historias-detail-panel');
        if (!panel) return;
        var item = this._historiasState.items.find(function(h) { return h.id === id; });
        if (!item) return;

        var statusEl = document.getElementById('hist-checklist-status-' + id);
        var checklist = this._historiaDefaultChecklist();
        var boxes = panel.querySelectorAll('.hist-checklist input[type="checkbox"]');
        boxes.forEach(function(cb) {
            var key = cb.getAttribute('data-key');
            if (key && Object.prototype.hasOwnProperty.call(checklist, key)) {
                checklist[key] = !!cb.checked;
            }
        });

        var allChecked = this._historiaChecklistItems.every(function(it) {
            return checklist[it.key] === true;
        });
        var updates = { checklist: checklist };
        if (allChecked && item.estado === 'en_revision') {
            updates.estado = 'verificada';
        }

        try {
            if (statusEl) statusEl.textContent = 'Guardando…';
            var updated = await SupabaseHistorias.actualizarHistoria(id, updates);
            item.checklist = updated.checklist;
            if (updates.estado) item.estado = updated.estado;
            if (statusEl) {
                statusEl.textContent = '✓ Guardado';
                setTimeout(function() {
                    var s = document.getElementById('hist-checklist-status-' + id);
                    if (s) s.textContent = '';
                }, 2000);
            }

            // If estado changed, re-render detail + list + badge.
            if (updates.estado) {
                showToast('✅ Checklist completo — envío movido a Verificada');
                await this._renderHistoriasPage();
                AdminComponents.updateHistoriasBadge();
                var refreshed = this._historiasState.items.find(function(h) { return h.id === id; });
                if (refreshed) this._renderHistoriaDetalle(refreshed);
            }
        } catch (e) {
            console.error('[historias] Save checklist failed:', e);
            if (statusEl) statusEl.textContent = '⚠️ Error al guardar';
            showToast('Error al guardar checklist: ' + (e.message || e), 'error');
        }
    },

    _guardarNotasHistoria: async function(id) {
        var ta = document.getElementById('hist-notas-' + id);
        var statusEl = document.getElementById('hist-notas-status-' + id);
        if (!ta) return;
        clearTimeout(this._notasDebounce);
        var self = this;
        this._notasDebounce = setTimeout(async function() {
            try {
                if (statusEl) statusEl.textContent = 'Guardando…';
                await SupabaseHistorias.actualizarHistoria(id, { notas_editoriales: ta.value });
                if (statusEl) {
                    statusEl.textContent = '✓ Guardado';
                    setTimeout(function() { if (statusEl) statusEl.textContent = ''; }, 2000);
                }
                // Update cached item
                var item = self._historiasState.items.find(function(h) { return h.id === id; });
                if (item) item.notas_editoriales = ta.value;
            } catch (e) {
                console.error('[historias] Save notas failed:', e);
                if (statusEl) statusEl.textContent = '⚠️ Error al guardar';
                showToast('Error al guardar notas: ' + e.message, 'error');
            }
        }, 500);
    },

    cambiarEstadoHistoria: async function(id, nuevoEstado) {
        var item = this._historiasState.items.find(function(h) { return h.id === id; });
        if (!item) return;
        var estadoPrevio = item.estado;
        if (nuevoEstado === estadoPrevio) return;

        // Guardrails against invalid transitions (defence in depth — the
        // dropdown is already filtered by _historiaAllowedTransitions, but
        // callers like the Reabrir button bypass that).
        var allowed = this._historiaAllowedTransitions[estadoPrevio] || [];
        if (allowed.indexOf(nuevoEstado) === -1) {
            console.warn('[historias] Invalid transition', estadoPrevio, '→', nuevoEstado);
            var selX = document.getElementById('hist-estado-select');
            if (selX) selX.value = estadoPrevio;
            return;
        }

        var updates = { estado: nuevoEstado };

        // Descartada: prompt for reason and append to editorial notes.
        if (nuevoEstado === 'descartada') {
            var razon = prompt('Motivo para descartar este envío (se guardará en notas editoriales):');
            if (razon === null) {
                var sel = document.getElementById('hist-estado-select');
                if (sel) sel.value = estadoPrevio;
                return;
            }
            var notasActuales = item.notas_editoriales ? (item.notas_editoriales + '\n\n') : '';
            updates.notas_editoriales = notasActuales + '[DESCARTADO] ' + razon;
        }

        // verificada → en_revision via dropdown: reset checklist so the admin
        // has to re-verify. Otherwise the on-load auto-transition would kick
        // the submission straight back to verificada.
        if (estadoPrevio === 'verificada' && nuevoEstado === 'en_revision') {
            updates.checklist = this._historiaDefaultChecklist();
        }

        // Reabrir (descartada → nueva): also reset checklist so a reopened
        // submission starts fresh in triage.
        if (estadoPrevio === 'descartada' && nuevoEstado === 'nueva') {
            updates.checklist = this._historiaDefaultChecklist();
        }

        try {
            var updated = await SupabaseHistorias.actualizarHistoria(id, updates);
            item.estado = updated.estado;
            item.checklist = updated.checklist;
            if (updates.notas_editoriales) item.notas_editoriales = updated.notas_editoriales;

            showToast('✅ Estado actualizado');

            await this._renderHistoriasPage();
            AdminComponents.updateHistoriasBadge();
            var refreshed = this._historiasState.items.find(function(h) { return h.id === id; });
            if (refreshed) this._renderHistoriaDetalle(refreshed);
        } catch (e) {
            console.error('[historias] Status change failed:', e);
            showToast('Error al cambiar estado: ' + (e.message || e), 'error');
            var sel2 = document.getElementById('hist-estado-select');
            if (sel2) sel2.value = estadoPrevio;
        }
    }
};

// Componentes del Admin
const AdminComponents = {
    
    sidebar: function() {
        const user = Auth.getUser() || {};
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
                    <a href="/admin/historias" onclick="AdminComponents.closeSidebarMobile()" class="${currentPath.includes('/historias') ? 'active' : ''}">
                        📨 Tu Historia
                        <span class="nav-badge" id="nav-historias-badge-sidebar" style="display:none;"></span>
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
                '<a href="/admin/historias" onclick="AdminComponents.closeMoreMenu()">📨 Tu Historia <span class="nav-badge" id="nav-historias-badge-more" style="display:none;"></span></a>' +
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
    },

    // Count actionable submissions (nueva + en_revision + verificada) and
    // update sidebar + more-menu badges. Publicada and descartada are
    // terminal, so they don't need admin attention and aren't counted.
    updateHistoriasBadge: async function() {
        if (!Auth.isLoggedIn() || typeof SupabaseHistorias === 'undefined') return;
        try {
            var counts = await SupabaseHistorias.contarHistoriasPorEstado();
            var n = (counts.nueva || 0) + (counts.en_revision || 0) + (counts.verificada || 0);
            var els = [
                document.getElementById('nav-historias-badge-sidebar'),
                document.getElementById('nav-historias-badge-more')
            ];
            els.forEach(function(el) {
                if (!el) return;
                if (n > 0) {
                    el.textContent = n;
                    el.style.display = '';
                } else {
                    el.textContent = '';
                    el.style.display = 'none';
                }
            });
        } catch (e) {
            // Silent — badge is non-critical
            console.warn('[historias] Badge update failed:', e);
        }
    },

    // Inject CSS for the historias review panel (idempotent)
    injectHistoriasStyles: function() {
        if (document.getElementById('bj-historias-styles')) return;
        var style = document.createElement('style');
        style.id = 'bj-historias-styles';
        style.textContent = [
            '.nav-badge{display:inline-block;min-width:20px;padding:2px 7px;margin-left:6px;background:#C8102E;color:#fff;border-radius:10px;font-size:0.72rem;font-weight:700;text-align:center;line-height:1.3;}',
            '.historias-header{margin-bottom:16px;}',
            '.historias-total{color:#374151;font-size:0.95rem;margin-bottom:10px;}',
            '.historias-pills{display:flex;flex-wrap:wrap;gap:8px;}',
            '.hist-pill{padding:8px 14px;border-radius:9999px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:0.88rem;font-weight:600;cursor:pointer;font-family:inherit;min-height:40px;}',
            '.hist-pill:hover{background:#f3f4f6;}',
            '.hist-pill-active{background:#C8102E;color:#fff;border-color:#C8102E;}',
            '.hist-count{color:#6b7280;font-size:0.85rem;margin:14px 0 10px;}',
            '.hist-estado-pill{display:inline-block;padding:3px 10px;border-radius:9999px;color:#fff;font-size:0.75rem;font-weight:600;line-height:1.4;white-space:nowrap;}',
            '.hist-row{cursor:pointer;transition:background 0.15s;}',
            '.hist-row:hover{background:#f9fafb;}',
            '.hist-cards{display:none;flex-direction:column;gap:10px;}',
            '.hist-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.04);}',
            '.hist-card:active{background:#f9fafb;}',
            '.hist-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}',
            '.hist-card-date{color:#6b7280;font-size:0.78rem;}',
            '.hist-card-title{font-size:1rem;font-weight:700;color:#1B2A4A;margin:0 0 8px;}',
            '.hist-card-meta{display:flex;justify-content:space-between;align-items:center;gap:10px;color:#374151;font-size:0.85rem;margin-top:4px;}',
            '.hist-load-more-wrap{text-align:center;margin-top:20px;}',
            '.hist-detail-backdrop{position:fixed;inset:0;background:rgba(17,24,39,0.45);z-index:9998;}',
            '.hist-detail-panel{position:fixed;top:0;right:0;bottom:0;width:min(560px,100%);background:#fff;z-index:9999;box-shadow:-4px 0 20px rgba(0,0,0,0.15);overflow-y:auto;}',
            '.hist-detail-inner{padding:20px 22px 120px;}',
            '.hist-detail-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;}',
            '.hist-detail-titulo{font-size:1.35rem;font-weight:700;color:#1B2A4A;margin:0 0 4px;line-height:1.25;}',
            '.hist-detail-subline{color:#6b7280;font-size:0.82rem;}',
            '.hist-close-btn{background:#f3f4f6;border:none;width:40px;height:40px;border-radius:50%;font-size:1.1rem;cursor:pointer;color:#374151;flex-shrink:0;}',
            '.hist-detail-estado-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px;background:#f9fafb;border-radius:8px;margin-bottom:18px;}',
            '.hist-detail-estado-row label{font-weight:600;color:#374151;font-size:0.9rem;}',
            '.hist-detail-estado-row select{padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;font-size:0.9rem;min-height:40px;}',
            '.hist-detail-estado-row select:disabled{background:#f3f4f6;color:#9ca3af;cursor:not-allowed;}',
            '.hist-section{margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid #f3f4f6;}',
            '.hist-section:last-of-type{border-bottom:none;}',
            '.hist-section h3{font-size:0.95rem;font-weight:700;color:#1B2A4A;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.03em;}',
            '.hist-section h4{font-size:0.85rem;font-weight:600;color:#374151;margin:14px 0 6px;}',
            '.hist-dl{display:grid;grid-template-columns:130px 1fr;gap:8px 14px;font-size:0.9rem;}',
            '.hist-dl dt{color:#6b7280;font-weight:500;}',
            '.hist-dl dd{margin:0;color:#111827;word-break:break-word;}',
            '.hist-dl a{color:#C8102E;text-decoration:none;}',
            '.hist-dl a:hover{text-decoration:underline;}',
            '.hist-descripcion{margin-top:14px;padding:12px;background:#f9fafb;border-radius:8px;}',
            '.hist-descripcion p{margin:0;color:#111827;font-size:0.92rem;line-height:1.55;white-space:pre-wrap;}',
            '.hist-fotos-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}',
            '.hist-foto-thumb{display:block;border-radius:6px;overflow:hidden;aspect-ratio:4/3;background:#f3f4f6;}',
            '.hist-foto-thumb img{width:100%;height:100%;object-fit:cover;display:block;}',
            '.hist-empty-foto{color:#9ca3af;font-style:italic;font-size:0.9rem;margin:0;}',
            '.hist-checklist{list-style:none;padding:0;margin:0;}',
            '.hist-checklist li{padding:6px 0;}',
            '.hist-checklist label{display:flex;align-items:center;gap:10px;cursor:pointer;color:#374151;font-size:0.9rem;min-height:32px;}',
            '.hist-checklist input[type="checkbox"]{width:18px;height:18px;accent-color:#C8102E;}',
            '.hist-checklist-readonly label{cursor:default;color:#065F46;font-weight:600;}',
            '.hist-checklist-readonly input[type="checkbox"]{accent-color:#059669;opacity:1;}',
            '.hist-checklist-readonly li.hist-checklist-done{background:#ECFDF5;border-left:3px solid #059669;padding-left:10px;border-radius:4px;margin-bottom:4px;}',
            '.hist-checklist-status{font-size:0.78rem;color:#6b7280;margin-top:6px;min-height:16px;}',
            '.hist-publicada-info{background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:12px 14px;margin-bottom:18px;color:#065F46;font-size:0.9rem;}',
            '.hist-publicada-info a{color:#059669;font-weight:600;text-decoration:none;}',
            '.hist-publicada-info a:hover{text-decoration:underline;}',
            '.hist-publicada-info-muted{background:#F9FAFB;border-color:#E5E7EB;color:#6B7280;}',
            '.hist-btn-reabrir{background:#D4A843 !important;color:#1B2A4A !important;font-weight:700 !important;}',
            '.hist-notas{width:100%;min-height:90px;padding:10px 12px;border:2px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:0.92rem;resize:vertical;background:#fff;color:#111827;box-sizing:border-box;}',
            '.hist-notas:focus{outline:none;border-color:#C8102E;}',
            '.hist-notas-status{font-size:0.78rem;color:#6b7280;margin-top:4px;min-height:16px;}',
            '.hist-actions{display:flex;flex-direction:column;gap:8px;padding-top:8px;}',
            '.hist-actions .btn{width:100%;padding:12px;font-size:0.95rem;font-weight:600;border-radius:8px;text-align:center;text-decoration:none;display:block;border:none;font-family:inherit;cursor:pointer;}',
            '.hist-actions .btn-primary{background:#C8102E;color:#fff;}',
            '.hist-actions .btn-secondary{background:#f3f4f6;color:#374151;}',
            '.hist-btn-crear:disabled{opacity:0.45;cursor:not-allowed;}',
            '.hist-btn-wa{background:#25D366 !important;color:#fff !important;}',
            'body.hist-detail-open{overflow:hidden;}',
            '@media (max-width: 768px){',
                '.hist-table{display:none !important;}',
                '.hist-cards{display:flex !important;}',
                '.hist-detail-panel{width:100%;top:0;left:0;right:0;bottom:0;}',
                '.hist-detail-inner{padding:16px 14px 140px;}',
                '.hist-dl{grid-template-columns:110px 1fr;}',
                '.historias-pills{overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px;-webkit-overflow-scrolling:touch;}',
                '.hist-pill{flex-shrink:0;}',
            '}',
            '@media (min-width: 769px){',
                '.hist-cards{display:none !important;}',
            '}'
        ].join('');
        document.head.appendChild(style);
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
