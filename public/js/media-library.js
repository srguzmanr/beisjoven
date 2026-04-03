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
    _pendingUploads: [],  // queue of nombres to edit metadata
    _pendingIdx: 0,
    _multiSelect: false,  // multi-select mode for gallery
    _selected: [],        // selected images in multi-select mode

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
                        <input type="file" id="ml-upload-input" accept="image/jpeg,image/png,image/gif,image/webp" multiple style="display:none" onchange="MediaLibrary.upload(event)">
                    </div>
                    <div style="padding:0 20px 6px;background:#f8fafc;">
                        <small style="color:#6b7280;font-size:11px;">JPG, PNG, GIF, WebP · Máx 5 MB por imagen · Puedes seleccionar varias a la vez</small>
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
                    <div id="ml-meta-panel" style="display:none; padding: 16px 20px; background:#f8fafc; border-top:1px solid #e5e7eb;">
                        <p style="color:#1e293b; font-size:14px; font-weight:600; margin:0 0 4px;">✅ <span id="ml-meta-title">Imagen subida</span></p>
                        <p style="color:#9ca3af; font-size:11px; margin:0 0 12px;" id="ml-meta-queue-info"></p>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                            <div>
                                <label style="color:#6b7280; font-size:12px; display:block; margin-bottom:4px;">Categoría</label>
                                <select id="ml-meta-categoria" style="width:100%; padding:8px; border-radius:6px; background:#ffffff; color:#1e293b; border:1px solid #d1d5db; font-size:13px;">
                                    <option value="">Sin categoría</option>
                                    ${categoriaOptions}
                                </select>
                            </div>
                            <div>
                                <label style="color:#6b7280; font-size:12px; display:block; margin-bottom:4px;">Crédito fotográfico</label>
                                <input type="text" id="ml-meta-credito" placeholder="Ej: Foto: Getty Images" style="width:100%; padding:8px; border-radius:6px; background:#ffffff; color:#1e293b; border:1px solid #d1d5db; font-size:13px; box-sizing:border-box;">
                            </div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="color:#6b7280; font-size:12px; display:block; margin-bottom:4px;">Pie de foto</label>
                            <input type="text" id="ml-meta-pie" placeholder="Descripción de la imagen" style="width:100%; padding:8px; border-radius:6px; background:#ffffff; color:#1e293b; border:1px solid #d1d5db; font-size:13px; box-sizing:border-box;">
                        </div>
                        <div style="display:flex; gap:8px; justify-content:flex-end;">
                            <button type="button" onclick="MediaLibrary.skipMetadata()" style="padding:8px 16px; background:#e5e7eb; color:#374151; border:none; border-radius:6px; cursor:pointer; font-size:13px;">Omitir</button>
                            <button type="button" id="ml-meta-save-btn" onclick="MediaLibrary.confirmMetadata()" style="padding:8px 16px; background:#c41e3a; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600;">Guardar y continuar</button>
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
                    background: #ffffff;
                    border-radius: 12px;
                    border: 1px solid #e5e7eb;
                    width: 100%;
                    max-width: 800px;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.25);
                    overflow: hidden;
                }
                .ml-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    border-bottom: 1px solid #e5e7eb;
                    flex-shrink: 0;
                }
                .ml-header h3 { margin: 0; color: #c41e3a; }
                .ml-close {
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: #6b7280;
                    line-height: 1;
                }
                .ml-close:hover { color: #1e293b; }
                .ml-toolbar {
                    display: flex;
                    flex-shrink: 0;
                    gap: 10px;
                    padding: 12px 20px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e5e7eb;
                }
                .ml-search {
                    flex: 1;
                    padding: 10px 14px;
                    border: 1px solid #d1d5db !important;
                    border-radius: 8px;
                    font-size: 14px;
                    background: #ffffff !important;
                    color: #1e293b !important;
                    box-shadow: none !important;
                    -webkit-appearance: none !important;
                }
                .ml-search::placeholder { color: #9ca3af !important; }
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
                    background: #f8fafc;
                    border-bottom: 1px solid #e5e7eb;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                }
                .ml-filters::-webkit-scrollbar { display: none; }
                .ml-filter-btn {
                    padding: 6px 14px;
                    border-radius: 20px;
                    border: 1px solid #d1d5db;
                    background: #ffffff;
                    color: #6b7280;
                    font-size: 13px;
                    font-family: inherit;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.15s;
                    flex-shrink: 0;
                }
                .ml-filter-btn:hover { border-color: #c41e3a; color: #1e293b; }
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
                    color: #cbd5e1;
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
                    color: #6b7280;
                }
                .ml-spinner {
                    width: 36px;
                    height: 36px;
                    border: 3px solid #e5e7eb;
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
                    border-top: 1px solid #e5e7eb;
                    background: #f8fafc;
                    border-radius: 0 0 12px 12px;
                    flex-shrink: 0;
                }
                #ml-count { color: #6b7280; font-size: 14px; }
                .ml-cancel {
                    padding: 10px 20px;
                    background: #e5e7eb;
                    color: #374151;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .ml-cancel:hover { background: #d1d5db; }
                @media (max-width: 600px) {
                    .ml-overlay { padding: 0; align-items: flex-end; }
                    .ml-container { max-height: 95vh; border-radius: 12px 12px 0 0; }
                    .ml-toolbar { flex-wrap: wrap; }
                    .ml-search { width: 100%; }
                    .ml-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); }
                    .ml-footer { flex-shrink: 0; padding-bottom: calc(12px + env(safe-area-inset-bottom)); }
                    #ml-meta-panel { flex-shrink: 0 !important; padding: 10px 16px !important; }
                    #ml-meta-panel p { margin: 0 0 6px !important; font-size: 13px !important; }
                    #ml-meta-panel label { margin-bottom: 2px !important; }
                    #ml-meta-panel input, #ml-meta-panel select { padding: 6px !important; font-size: 12px !important; }
                    #ml-meta-panel button { padding: 6px 12px !important; font-size: 12px !important; }
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
        this._multiSelect = false;
        this._selected = [];
        this.isOpen = true;
        this._pendingUploads = [];
        this._pendingIdx = 0;

        document.getElementById('media-library-modal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.getElementById('ml-search').value = '';
        document.getElementById('ml-meta-panel').style.display = 'none';
        this._updateMultiSelectUI();
        this.activeFilter = 'todas';
        document.querySelectorAll('.ml-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.key === 'todas');
        });

        await this.loadImages();
    },

    /**
     * Open in multi-select mode for gallery.
     * Callback receives an array of image objects.
     */
    async openMulti(callback) {
        this.init();
        this.onSelectCallback = callback;
        this._multiSelect = true;
        this._selected = [];
        this.isOpen = true;
        this._pendingUploads = [];
        this._pendingIdx = 0;

        document.getElementById('media-library-modal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.getElementById('ml-search').value = '';
        document.getElementById('ml-meta-panel').style.display = 'none';
        this._updateMultiSelectUI();
        this.activeFilter = 'todas';
        document.querySelectorAll('.ml-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.key === 'todas');
        });

        await this.loadImages();
    },

    _updateMultiSelectUI() {
        const footer = document.querySelector('.ml-footer');
        if (!footer) return;
        // Remove existing confirm button if any
        const existing = document.getElementById('ml-confirm-multi');
        if (existing) existing.remove();
        if (this._multiSelect) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'ml-confirm-multi';
            btn.style.cssText = 'padding:10px 20px;background:#c41e3a;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;';
            btn.textContent = 'Agregar 0 fotos';
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.onclick = () => MediaLibrary.confirmMultiSelect();
            footer.appendChild(btn);
        }
    },

    _updateMultiCount() {
        const btn = document.getElementById('ml-confirm-multi');
        if (!btn) return;
        const n = this._selected.length;
        btn.textContent = `Agregar ${n} foto${n !== 1 ? 's' : ''}`;
        btn.disabled = n === 0;
        btn.style.opacity = n === 0 ? '0.5' : '1';
    },

    _toggleMultiItem(url) {
        const idx = this._selected.findIndex(s => s.url === url);
        if (idx >= 0) {
            this._selected.splice(idx, 1);
        } else {
            const img = this.allImages.find(i => i.url === url) || { url, nombre: '', pieDeFoto: '', credito: '' };
            this._selected.push({ url: img.url, nombre: img.nombre, pieDeFoto: img.pieDeFoto, credito: img.credito });
        }
        // Update visual selection state
        document.querySelectorAll('.ml-item').forEach(el => {
            const itemUrl = el.getAttribute('data-url');
            const isSelected = this._selected.some(s => s.url === itemUrl);
            el.style.borderColor = isSelected ? '#c41e3a' : 'transparent';
            const check = el.querySelector('.ml-multi-check');
            if (check) check.style.display = isSelected ? 'flex' : 'none';
        });
        this._updateMultiCount();
    },

    confirmMultiSelect() {
        if (this._selected.length > 0 && this.onSelectCallback) {
            this.onSelectCallback([...this._selected]);
        }
        this.close();
    },

    close() {
        this.isOpen = false;
        this._multiSelect = false;
        this._selected = [];
        document.getElementById('media-library-modal').style.display = 'none';
        document.body.style.overflow = '';
        this._pendingUploads = [];
        this._pendingIdx = 0;
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
            }).filter(img => {
                if (!img.url || !img.nombre) return false;
                if (img.url.endsWith('/') || img.nombre.startsWith('.')) return false;
                if (!/\.(jpe?g|png|gif|webp|svg|bmp|avif)$/i.test(img.nombre)) return false;
                return true;
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

        // Filter out broken images (no valid URL, empty names, folders, placeholders)
        images = (images || []).filter(img => {
            if (!img.url || !img.nombre) return false;
            if (img.url.endsWith('/') || img.nombre.startsWith('.')) return false;
            // Filter folder entries (no file extension)
            if (!/\.(jpe?g|png|gif|webp|svg|bmp|avif)$/i.test(img.nombre)) return false;
            return true;
        });

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
            const clickAction = this._multiSelect
                ? `MediaLibrary._toggleMultiItem('${img.url}')`
                : `MediaLibrary.select('${img.url}', '${img.nombre}')`;
            const isSelected = this._multiSelect && this._selected.some(s => s.url === img.url);
            return `
                <div class="ml-item" data-url="${img.url}" onclick="${clickAction}" title="${img.pieDeFoto || img.nombre}" style="border-color:${isSelected ? '#c41e3a' : 'transparent'}">
                    <img src="${img.url}" alt="${img.nombre}" loading="lazy">
                    ${tagLabel ? `<div class="ml-item-badge">${tagLabel}</div>` : ''}
                    ${this._multiSelect ? `<div class="ml-multi-check" style="display:${isSelected ? 'flex' : 'none'};position:absolute;top:5px;right:5px;width:24px;height:24px;background:#c41e3a;border-radius:50%;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:bold;">✓</div>` : ''}
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

    // ── Seleccionar imagen (single-select mode) ────────────────
    select(url, nombre) {
        if (this._multiSelect) return; // handled by _toggleMultiItem
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

    // ── Subir imagen(es) ───────────────────────────────────────────
    async upload(event) {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        if (!files.length) return;

        // Validate all files first
        const valid = [];
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                showToast(file.name + ' es muy grande (máx 5MB)', 'error');
                continue;
            }
            if (!file.type.startsWith('image/')) {
                showToast(file.name + ' no es una imagen', 'error');
                continue;
            }
            valid.push(file);
        }
        if (!valid.length) return;

        const grid = document.getElementById('ml-grid');
        const metaPanel = document.getElementById('ml-meta-panel');

        // Upload all files with progress
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;"><div class="ml-spinner" style="margin:0 auto;"></div><p style="margin-top:12px;color:#6b7280;" id="ml-upload-progress">Subiendo 1 de ${valid.length}...</p></div>`;

        this._pendingUploads = [];
        let uploaded = 0;

        for (const file of valid) {
            const progEl = document.getElementById('ml-upload-progress');
            if (progEl) progEl.textContent = `Subiendo ${uploaded + 1} de ${valid.length}...`;

            try {
                if (typeof SupabaseStorage !== 'undefined' && SupabaseStorage.subirImagen) {
                    const result = await SupabaseStorage.subirImagen(file);
                    if (result.success) {
                        const nombre = result.nombre || result.data?.nombre || file.name;
                        this._pendingUploads.push(nombre);
                        uploaded++;
                    } else {
                        showToast('Error subiendo ' + file.name, 'error');
                    }
                }
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
        }

        // Refresh gallery
        this._invalidateCache();
        await this.loadImages();

        // Start metadata queue if there are uploads
        if (this._pendingUploads.length > 0) {
            this._pendingIdx = 0;
            this._showMetaForCurrent();
        }
    },

    // ── Mostrar panel de metadatos para imagen actual en cola ────
    _showMetaForCurrent() {
        const panel = document.getElementById('ml-meta-panel');
        const nombre = this._pendingUploads[this._pendingIdx];
        if (!nombre) { panel.style.display = 'none'; return; }

        const total = this._pendingUploads.length;
        const current = this._pendingIdx + 1;
        const remaining = total - current;

        document.getElementById('ml-meta-title').textContent = nombre.length > 40 ? nombre.substring(0, 40) + '...' : nombre;
        document.getElementById('ml-meta-queue-info').textContent = total > 1
            ? `Imagen ${current} de ${total}` + (remaining > 0 ? ` · ${remaining} más por editar` : '')
            : 'Agrega los datos editoriales:';
        document.getElementById('ml-meta-save-btn').textContent = remaining > 0 ? 'Guardar → siguiente' : 'Guardar y cerrar';

        // Pre-fill category from active filter
        document.getElementById('ml-meta-categoria').value = this.activeFilter !== 'todas' ? this.activeFilter : '';
        document.getElementById('ml-meta-pie').value = '';
        document.getElementById('ml-meta-credito').value = '';
        panel.style.display = 'block';

        // Focus pie de foto for fast editing
        setTimeout(() => document.getElementById('ml-meta-pie').focus(), 100);
    },

    // ── Guardar metadatos post-subida ────────────────────────────
    async confirmMetadata() {
        const nombre = this._pendingUploads[this._pendingIdx];
        if (!nombre) { this.skipMetadata(); return; }

        const categoria = document.getElementById('ml-meta-categoria').value;
        const pieDeFoto = document.getElementById('ml-meta-pie').value.trim();
        const credito = document.getElementById('ml-meta-credito').value.trim();

        await this.saveMetadata(nombre, { categoria, pieDeFoto, credito });

        // Update in memory
        const img = this.allImages.find(i => i.nombre === nombre);
        if (img) { img.categoria = categoria; img.pieDeFoto = pieDeFoto; img.credito = credito; }

        showToast('✅ Datos guardados', 'success', 1200);
        this._advanceQueue();
    },

    skipMetadata() {
        this._advanceQueue();
    },

    _advanceQueue() {
        this._pendingIdx++;
        if (this._pendingIdx < this._pendingUploads.length) {
            this._showMetaForCurrent();
        } else {
            // Queue finished
            this._pendingUploads = [];
            this._pendingIdx = 0;
            document.getElementById('ml-meta-panel').style.display = 'none';
            this.filter(document.getElementById('ml-search').value);
        }
    }
};

// Expose globally so bundled scripts (Tiptap IIFE) can access it
window.MediaLibrary = MediaLibrary;
