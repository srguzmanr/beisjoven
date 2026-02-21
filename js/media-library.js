/**
 * BEISJOVEN - Media Library Modal
 * ================================
 * v2.1 - Con metadatos (pie de foto, crédito, categoría)
 * Actualizado: Feb 2026
 */

const MediaLibrary = {
    isOpen: false,
    onSelectCallback: null,
    allImages: [],       // [{url, nombre, categoria, pieDeFoto, credito}]
    activeFilter: 'todas',

    // Etiquetas — agregar aquí cuando sea necesario
    TAGS: [
        { key: 'todas',     label: 'Todas' },
        { key: 'wbc',       label: 'WBC 2026' },
        { key: 'mlb',       label: 'MLB' },
        { key: 'seleccion', label: 'Selección' },
        { key: 'softbol',   label: 'Softbol' },
        { key: 'juvenil',   label: 'Juvenil' },
        { key: 'ligas',     label: 'Ligas MX' },
    ],

    // ── Cache ────────────────────────────────────────────────────
    _cache: null,          // { images, ts } — se invalida al subir/eliminar
    _cacheMaxAge: 60000,   // 60 segundos

    _cacheValid() {
        return this._cache && (Date.now() - this._cache.ts < this._cacheMaxAge);
    },

    _invalidateCache() {
        this._cache = null;
    },

    // ── Metadatos ────────────────────────────────────────────────
    async loadMetadata(nombres) {
        if (!nombres || nombres.length === 0) return {};
        try {
            const { data } = await supabaseClient
                .from('imagenes_metadata')
                .select('*')
                .in('nombre', nombres);
            const map = {};
            (data || []).forEach(m => { map[m.nombre] = m; });
            return map;
        } catch (e) { return {}; }
    },

    async saveMetadata(nombre, { categoria, pieDeFoto, credito }) {
        try {
            await supabaseClient
                .from('imagenes_metadata')
                .upsert({ nombre, categoria: categoria || null, pie_de_foto: pieDeFoto || null, credito: credito || null }, { onConflict: 'nombre' });
        } catch (e) { console.warn('saveMetadata error:', e); }
    },

    // ── Init modal ───────────────────────────────────────────────
    init() {
        if (document.getElementById('media-library-modal')) return;

        const categoriaOptions = this.TAGS
            .filter(t => t.key !== 'todas')
            .map(t => `<option value="${t.key}">${t.label}</option>`)
            .join('');

        const modalHTML = `
            <div id="media-library-modal" class="ml-overlay" style="display: none;">
                <div class="ml-container">
                    <div class="ml-header">
                        <h3>📷 Biblioteca de Medios</h3>
                        <button type="button" class="ml-close" onclick="MediaLibrary.close()">&times;</button>
                    </div>

                    <div class="ml-toolbar">
                        <input type="text" id="ml-search" class="ml-search" placeholder="Buscar imágenes..." oninput="MediaLibrary.filter(this.value)">
                        <button type="button" class="ml-upload-btn" onclick="document.getElementById('ml-upload-input').click()">
                            ⬆️ Subir
                        </button>
                        <input type="file" id="ml-upload-input" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none" onchange="MediaLibrary.upload(event)">
                    </div>

                    <div class="ml-filters" id="ml-filters">
                        ${this.TAGS.map(t => `<button type="button" class="ml-filter-btn ${t.key === 'todas' ? 'active' : ''}" data-key="${t.key}" onclick="MediaLibrary.setFilter('${t.key}')">${t.label}</button>`).join('')}
                    </div>

                    <div class="ml-body">
                        <div id="ml-loading" class="ml-loading">
                            <div class="ml-spinner"></div>
                            <p>Cargando...</p>
                        </div>
                        <div id="ml-grid" class="ml-grid"></div>
                        <div id="ml-empty" class="ml-empty" style="display:none">
                            <p>📁 No hay imágenes</p>
                        </div>
                    </div>

                    <!-- Panel de metadatos al subir -->
                    <div id="ml-meta-panel" style="display:none; padding: 16px 20px; background:#0f172a; border-top:1px solid #334155;">
                        <p style="color:#f1f5f9; font-size:14px; font-weight:600; margin:0 0 12px;">✅ Imagen subida — agrega los datos editoriales:</p>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                            <div>
                                <label style="color:#94a3b8; font-size:12px; display:block; margin-bottom:4px;">Categoría</label>
                                <select id="ml-meta-categoria" style="width:100%; padding:8px; border-radius:6px; background:#1e293b; color:#f1f5f9; border:1px solid #334155; font-size:13px;">
                                    <option value="">Sin categoría</option>
                                    ${categoriaOptions}
                                </select>
                            </div>
                            <div>
                                <label style="color:#94a3b8; font-size:12px; display:block; margin-bottom:4px;">Crédito fotográfico</label>
                                <input type="text" id="ml-meta-credito" placeholder="Ej: Foto: Getty Images" style="width:100%; padding:8px; border-radius:6px; background:#1e293b; color:#f1f5f9; border:1px solid #334155; font-size:13px; box-sizing:border-box;">
                            </div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="color:#94a3b8; font-size:12px; display:block; margin-bottom:4px;">Pie de foto</label>
                            <input type="text" id="ml-meta-pie" placeholder="Descripción de la imagen" style="width:100%; padding:8px; border-radius:6px; background:#1e293b; color:#f1f5f9; border:1px solid #334155; font-size:13px; box-sizing:border-box;">
                        </div>
                        <div style="display:flex; gap:8px; justify-content:flex-end;">
                            <button type="button" onclick="MediaLibrary.skipMetadata()" style="padding:8px 16px; background:#334155; color:#e2e8f0; border:none; border-radius:6px; cursor:pointer; font-size:13px;">Omitir</button>
                            <button type="button" onclick="MediaLibrary.confirmMetadata()" style="padding:8px 16px; background:#c41e3a; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600;">Guardar y continuar</button>
                        </div>
                    </div>

                    <div class="ml-footer">
                        <span id="ml-count">0 imágenes</span>
                        <button type="button" class="ml-cancel" onclick="MediaLibrary.close()">Cancelar</button>
                    </div>
                </div>
            </div>

            <style>
                .ml-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.7);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .ml-container {
                    background: #1e293b;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 800px;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                    overflow: hidden;
                }
                .ml-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    border-bottom: 1px solid #334155;
                    flex-shrink: 0;
                }
                .ml-header h3 { margin: 0; color: #c41e3a; }
                .ml-close {
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: #94a3b8;
                    line-height: 1;
                }
                .ml-close:hover { color: #f1f5f9; }
                .ml-toolbar {
                    display: flex;
                    flex-shrink: 0;
                    gap: 10px;
                    padding: 12px 20px;
                    background: #0f172a;
                    border-bottom: 1px solid #334155;
                }
                .ml-search {
                    flex: 1;
                    padding: 10px 14px;
                    border: 1px solid #334155 !important;
                    border-radius: 8px;
                    font-size: 14px;
                    background: #1e293b !important;
                    color: #f1f5f9 !important;
                    box-shadow: none !important;
                    -webkit-appearance: none !important;
                }
                .ml-search::placeholder { color: #64748b !important; }
                .ml-search:focus {
                    outline: none !important;
                    border-color: #c41e3a !important;
                    box-shadow: none !important;
                }
                .ml-upload-btn {
                    padding: 10px 16px;
                    background: #c41e3a;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    flex-shrink: 0;
                }
                .ml-upload-btn:hover { background: #a51830; }
                .ml-filters {
                    display: flex;
                    flex-shrink: 0;
                    gap: 6px;
                    padding: 10px 20px;
                    background: #0f172a;
                    border-bottom: 1px solid #334155;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                }
                .ml-filters::-webkit-scrollbar { display: none; }
                .ml-filter-btn {
                    padding: 6px 14px;
                    border-radius: 20px;
                    border: 1px solid #334155;
                    background: #1e293b;
                    color: #94a3b8;
                    font-size: 13px;
                    font-family: inherit;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.15s;
                    flex-shrink: 0;
                }
                .ml-filter-btn:hover { border-color: #c41e3a; color: #f1f5f9; }
                .ml-filter-btn.active { background: #c41e3a; border-color: #c41e3a; color: white; font-weight: 600; }
                .ml-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    min-height: 0;
                    -webkit-overflow-scrolling: touch;
                }
                .ml-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 12px;
                }
                .ml-item {
                    aspect-ratio: 1;
                    border-radius: 8px;
                    overflow: hidden;
                    cursor: pointer;
                    border: 3px solid transparent;
                    transition: all 0.15s;
                    position: relative;
                }
                .ml-item:hover { border-color: #c41e3a; transform: scale(1.03); }
                .ml-item img { width: 100%; height: 100%; object-fit: cover; }
                .ml-item-overlay {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(transparent, rgba(0,0,0,0.85));
                    padding: 20px 6px 6px;
                    opacity: 0;
                    transition: opacity 0.15s;
                }
                .ml-item:hover .ml-item-overlay { opacity: 1; }
                .ml-item-name {
                    color: white;
                    font-size: 10px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .ml-item-meta {
                    color: #94a3b8;
                    font-size: 9px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-top: 2px;
                }
                .ml-item-badge {
                    position: absolute;
                    top: 5px;
                    left: 5px;
                    background: #c41e3a;
                    color: white;
                    font-size: 9px;
                    padding: 2px 5px;
                    border-radius: 3px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .ml-loading, .ml-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    color: #94a3b8;
                }
                .ml-spinner {
                    width: 36px;
                    height: 36px;
                    border: 3px solid #334155;
                    border-top-color: #c41e3a;
                    border-radius: 50%;
                    animation: ml-spin 0.8s linear infinite;
                }
                @keyframes ml-spin { to { transform: rotate(360deg); } }
                .ml-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 20px;
                    border-top: 1px solid #334155;
                    background: #0f172a;
                    border-radius: 0 0 12px 12px;
                    flex-shrink: 0;
                }
                #ml-count { color: #94a3b8; font-size: 14px; }
                .ml-cancel {
                    padding: 10px 20px;
                    background: #334155;
                    color: #e2e8f0;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .ml-cancel:hover { background: #475569; }
                @media (max-width: 600px) {
                    .ml-overlay { padding: 10px; }
                    .ml-container { max-height: 93vh; }
                    .ml-toolbar { flex-wrap: wrap; }
                    .ml-search { width: 100%; }
                    .ml-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); }
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });

        document.getElementById('media-library-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('ml-overlay')) this.close();
        });
    },

    // ── Abrir modal ──────────────────────────────────────────────
    async open(callback) {
        this.init();
        this.onSelectCallback = callback;
        this.isOpen = true;
        this._pendingUploadNombre = null;

        document.getElementById('media-library-modal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.getElementById('ml-search').value = '';
        document.getElementById('ml-meta-panel').style.display = 'none';
        this.activeFilter = 'todas';
        document.querySelectorAll('.ml-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.key === 'todas');
        });

        await this.loadImages();
    },

    close() {
        this.isOpen = false;
        document.getElementById('media-library-modal').style.display = 'none';
        document.body.style.overflow = '';
        this._pendingUploadNombre = null;
    },

    // ── Cargar imágenes + metadatos ──────────────────────────────
    async loadImages(forceRefresh = false) {
        const loading = document.getElementById('ml-loading');
        const grid = document.getElementById('ml-grid');
        const empty = document.getElementById('ml-empty');

        // Servir desde caché si está vigente
        if (!forceRefresh && this._cacheValid()) {
            this.allImages = this._cache.images;
            this.renderImages(this.allImages);
            return;
        }

        loading.style.display = 'flex';
        grid.innerHTML = '';
        empty.style.display = 'none';

        try {
            if (typeof SupabaseStorage === 'undefined' || !SupabaseStorage.listarImagenes) {
                throw new Error('SupabaseStorage no disponible');
            }

            // Queries en paralelo — mitad del tiempo de espera
            const [rawImages, allMeta] = await Promise.all([
                SupabaseStorage.listarImagenes(),
                supabaseClient.from('imagenes_metadata').select('*').then(r => r.data || [])
            ]);

            const metaMap = {};
            allMeta.forEach(m => { metaMap[m.nombre] = m; });

            this.allImages = rawImages.map(img => {
                const nombre = img.nombre || img.url?.split('/').pop() || '';
                const meta = metaMap[nombre] || {};
                return {
                    url: img.url || img,
                    nombre,
                    categoria: meta.categoria || '',
                    pieDeFoto: meta.pie_de_foto || '',
                    credito: meta.credito || ''
                };
            });

            // Guardar en caché
            this._cache = { images: this.allImages, ts: Date.now() };

            loading.style.display = 'none';
            this.renderImages(this.allImages);

        } catch (err) {
            console.error('Media load error:', err);
            loading.style.display = 'none';
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#ef4444;">Error cargando imágenes</p>';
        }
    },

    // ── Renderizar grid ──────────────────────────────────────────
    renderImages(images) {
        const grid = document.getElementById('ml-grid');
        const empty = document.getElementById('ml-empty');
        const count = document.getElementById('ml-count');

        if (!images || images.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'flex';
            count.textContent = '0 imágenes';
            return;
        }

        empty.style.display = 'none';
        count.textContent = `${images.length} imagen${images.length !== 1 ? 'es' : ''}`;

        grid.innerHTML = images.map(img => {
            const tagLabel = this.TAGS.find(t => t.key === img.categoria)?.label || '';
            return `
                <div class="ml-item" onclick="MediaLibrary.select('${img.url}', '${img.nombre}')" title="${img.pieDeFoto || img.nombre}">
                    <img src="${img.url}" alt="${img.nombre}" loading="lazy">
                    ${tagLabel ? `<div class="ml-item-badge">${tagLabel}</div>` : ''}
                    <div class="ml-item-overlay">
                        <div class="ml-item-name">${img.pieDeFoto || img.nombre}</div>
                        ${img.credito ? `<div class="ml-item-meta">${img.credito}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    // ── Filtros ──────────────────────────────────────────────────
    setFilter(key) {
        this.activeFilter = key;
        document.querySelectorAll('.ml-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.key === key);
        });
        const searchTerm = document.getElementById('ml-search').value;
        this.filter(searchTerm);
    },

    filter(term) {
        let filtered = this.allImages;

        // Filtro por categoría (desde metadatos DB, con fallback a nombre de archivo)
        if (this.activeFilter && this.activeFilter !== 'todas') {
            filtered = filtered.filter(img => {
                if (img.categoria) return img.categoria === this.activeFilter;
                return img.nombre.toLowerCase().includes(this.activeFilter);
            });
        }

        // Filtro por búsqueda de texto
        if (term && term.trim()) {
            const t = term.toLowerCase();
            filtered = filtered.filter(img =>
                img.nombre.toLowerCase().includes(t) ||
                (img.pieDeFoto || '').toLowerCase().includes(t) ||
                (img.credito || '').toLowerCase().includes(t)
            );
        }

        this.renderImages(filtered);
    },

    // ── Seleccionar imagen ───────────────────────────────────────
    select(url, nombre) {
        const img = this.allImages.find(i => i.url === url) || { url, nombre, pieDeFoto: '', credito: '' };

        if (this.onSelectCallback) {
            this.onSelectCallback({
                url: img.url,
                nombre: img.nombre,
                pieDeFoto: img.pieDeFoto,
                credito: img.credito,
                categoria: img.categoria
            });
        }
        this.close();
    },

    // ── Subir imagen ─────────────────────────────────────────────
    async upload(event) {
        const file = event.target.files[0];
        if (!file) return;
        event.target.value = '';

        if (file.size > 5 * 1024 * 1024) {
            showToast('Imagen muy grande (máx 5MB)', 'error');
            return;
        }

        const grid = document.getElementById('ml-grid');
        const metaPanel = document.getElementById('ml-meta-panel');
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;"><div class="ml-spinner" style="margin:0 auto;"></div><p style="margin-top:12px;color:#94a3b8;">Subiendo...</p></div>`;

        try {
            if (typeof SupabaseStorage !== 'undefined' && SupabaseStorage.subirImagen) {
                const result = await SupabaseStorage.subirImagen(file);
                if (result.success) {
                    // Guardar el nombre para asociar metadatos
                    this._pendingUploadNombre = result.nombre || result.data?.nombre || file.name;

                    // Mostrar panel de metadatos
                    document.getElementById('ml-meta-categoria').value = this.activeFilter !== 'todas' ? this.activeFilter : '';
                    document.getElementById('ml-meta-pie').value = '';
                    document.getElementById('ml-meta-credito').value = '';
                    metaPanel.style.display = 'block';

                    // Cargar la galería actualizada de fondo
                    this._invalidateCache();
                    await this.loadImages();
                } else {
                    throw new Error(result.error || 'Error al subir');
                }
            }
        } catch (err) {
            console.error('Upload error:', err);
            showToast('Error subiendo imagen: ' + err.message, 'error');
            this._invalidateCache();
            await this.loadImages();
        }
    },

    // ── Guardar metadatos post-subida ────────────────────────────
    async confirmMetadata() {
        if (!this._pendingUploadNombre) {
            this.skipMetadata();
            return;
        }

        const categoria = document.getElementById('ml-meta-categoria').value;
        const pieDeFoto = document.getElementById('ml-meta-pie').value.trim();
        const credito = document.getElementById('ml-meta-credito').value.trim();

        await this.saveMetadata(this._pendingUploadNombre, { categoria, pieDeFoto, credito });

        // Actualizar en memoria también
        const img = this.allImages.find(i => i.nombre === this._pendingUploadNombre);
        if (img) { img.categoria = categoria; img.pieDeFoto = pieDeFoto; img.credito = credito; }

        this._pendingUploadNombre = null;
        document.getElementById('ml-meta-panel').style.display = 'none';
        showToast('✅ Imagen y datos guardados');
        this.filter(document.getElementById('ml-search').value);
    },

    skipMetadata() {
        this._pendingUploadNombre = null;
        document.getElementById('ml-meta-panel').style.display = 'none';
        this.filter(document.getElementById('ml-search').value);
    }
};
