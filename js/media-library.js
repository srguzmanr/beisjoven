/**
 * BEISJOVEN - Media Library Modal
 * ================================
 * FIXED: Feb 11, 2026
 * - Uses data attributes + event delegation instead of inline onclick (fixes mobile tap issues)
 * - Added touch feedback for mobile
 * - Uses existing SupabaseStorage API
 */

const MediaLibrary = {
    isOpen: false,
    onSelectCallback: null,
    allImages: [],
    
    /**
     * Initialize the modal - call once when admin loads
     */
    init() {
        if (document.getElementById('media-library-modal')) return;
        
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
                        <input type="file" id="ml-upload-input" accept="image/*" style="display:none" onchange="MediaLibrary.upload(event)">
                    </div>
                    
                    <div class="ml-body">
                        <div id="ml-loading" class="ml-loading">
                            <div class="ml-spinner"></div>
                            <p>Cargando...</p>
                        </div>
                        <div class="ml-content">
                            <div class="ml-grid-wrap">
                                <div id="ml-grid" class="ml-grid"></div>
                                <div id="ml-empty" class="ml-empty" style="display:none">
                                    <p>📁 No hay imágenes</p>
                                </div>
                            </div>
                            <div id="ml-preview" class="ml-preview">
                                <p class="ml-preview-hint">Pasa el cursor sobre una imagen para previsualizarla</p>
                            </div>
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
                    background: var(--surface-card, white);
                    border-radius: 12px;
                    width: 100%;
                    max-width: 960px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                }
                .ml-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--border-subtle, #e5e7eb);
                }
                .ml-header h3 {
                    margin: 0;
                    color: var(--primary, #1e3a5f);
                }
                .ml-close {
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: var(--text-secondary, #6b7280);
                    line-height: 1;
                    padding: 4px 8px;
                }
                .ml-close:hover { color: var(--text-primary, #1f2937); }
                .ml-toolbar {
                    display: flex;
                    gap: 10px;
                    padding: 12px 20px;
                    background: var(--surface-elevated, #f9fafb);
                    border-bottom: 1px solid var(--border-subtle, #e5e7eb);
                }
                .ml-search {
                    flex: 1;
                    padding: 10px 14px;
                    border: 1px solid var(--form-border, #d1d5db);
                    border-radius: 8px;
                    font-size: 14px;
                    background: var(--form-bg, #fff);
                    color: var(--form-text, inherit);
                }
                .ml-search:focus {
                    outline: none;
                    border-color: var(--primary, #1e3a5f);
                }
                .ml-upload-btn {
                    padding: 10px 16px;
                    background: #1e3a5f;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                }
                .ml-upload-btn:hover { background: #2d4a6f; }
                .ml-body {
                    flex: 1;
                    overflow: hidden;
                    padding: 16px;
                    min-height: 250px;
                }
                .ml-content {
                    display: flex;
                    gap: 16px;
                    height: 100%;
                }
                .ml-grid-wrap {
                    flex: 1;
                    overflow-y: auto;
                    min-width: 0;
                    -webkit-overflow-scrolling: touch;
                }
                .ml-preview {
                    width: 220px;
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    border-left: 1px solid var(--border-subtle, #e5e7eb);
                    padding: 12px;
                    text-align: center;
                }
                .ml-preview img {
                    max-width: 100%;
                    max-height: 260px;
                    object-fit: contain;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                }
                .ml-preview-name {
                    margin-top: 10px;
                    font-size: 12px;
                    color: var(--text-secondary, #6b7280);
                    word-break: break-all;
                    line-height: 1.3;
                }
                .ml-preview-hint {
                    font-size: 13px;
                    color: var(--text-muted, #999);
                    padding: 20px 0;
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
                    /* FIX: ensure taps register on iOS */
                    -webkit-tap-highlight-color: rgba(30, 58, 95, 0.2);
                }
                .ml-item:hover,
                .ml-item:active {
                    border-color: var(--primary, #1e3a5f);
                    transform: scale(1.03);
                }
                /* Touch feedback for mobile */
                .ml-item.ml-tapped {
                    border-color: #e63946;
                    transform: scale(0.97);
                }
                .ml-item img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    /* FIX: prevent image from intercepting pointer events */
                    pointer-events: none;
                }
                .ml-item-name {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(transparent, rgba(0,0,0,0.8));
                    color: white;
                    padding: 20px 6px 6px;
                    font-size: 10px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    opacity: 0;
                    transition: opacity 0.15s;
                    /* FIX: prevent name overlay from intercepting pointer events */
                    pointer-events: none;
                }
                .ml-item:hover .ml-item-name { opacity: 1; }
                .ml-loading, .ml-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    color: var(--text-secondary, #6b7280);
                }
                .ml-spinner {
                    width: 36px;
                    height: 36px;
                    border: 3px solid var(--border-color, #e5e7eb);
                    border-top-color: var(--primary, #1e3a5f);
                    border-radius: 50%;
                    animation: ml-spin 0.8s linear infinite;
                }
                @keyframes ml-spin { to { transform: rotate(360deg); } }
                .ml-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 20px;
                    border-top: 1px solid var(--border-subtle, #e5e7eb);
                    background: var(--surface-elevated, #f9fafb);
                }
                #ml-count { color: var(--text-secondary, #6b7280); font-size: 14px; }
                .ml-cancel {
                    padding: 10px 20px;
                    background: var(--form-bg, #e5e7eb);
                    color: var(--text-primary, #374151);
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .ml-cancel:hover { background: var(--border-color, #d1d5db); }
                @media (max-width: 600px) {
                    .ml-overlay { padding: 10px; }
                    .ml-container { max-height: 90vh; }
                    .ml-toolbar { flex-wrap: wrap; }
                    .ml-search { width: 100%; }
                    .ml-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; }
                    .ml-preview { display: none !important; }
                    .ml-content { display: block; }
                    .ml-body { padding: 12px; }
                    .ml-header { padding: 14px 16px; }
                    .ml-footer { padding: 10px 16px; }
                }
            </style>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
        
        // Close on overlay click
        document.getElementById('media-library-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('ml-overlay')) this.close();
        });

        // FIX: Event delegation for image selection — works reliably on mobile
        // Uses data-url attribute instead of inline onclick with URL strings
        const grid = document.getElementById('ml-grid');
        grid.addEventListener('click', (e) => {
            const item = e.target.closest('.ml-item');
            if (!item) return;
            const url = item.getAttribute('data-url');
            if (url) this.select(url);
        });

        // Touch feedback for mobile
        grid.addEventListener('touchstart', (e) => {
            const item = e.target.closest('.ml-item');
            if (item) item.classList.add('ml-tapped');
        }, { passive: true });
        grid.addEventListener('touchend', (e) => {
            const item = e.target.closest('.ml-item');
            if (item) setTimeout(() => item.classList.remove('ml-tapped'), 150);
        }, { passive: true });

        // Preview on hover — desktop only (event delegation on grid)
        grid.addEventListener('mouseenter', (e) => {
            const item = e.target.closest('.ml-item');
            if (!item) return;
            const img = item.querySelector('img');
            const name = item.getAttribute('data-name') || '';
            if (img) this.showPreview(img.src, name);
        }, true);
        grid.addEventListener('mouseleave', (e) => {
            const item = e.target.closest('.ml-item');
            if (item) this.hidePreview();
        }, true);
    },
    
    /**
     * Open the modal
     * @param {Function} callback - receives selected image URL
     */
    async open(callback) {
        this.init();
        this.onSelectCallback = callback;
        this.isOpen = true;
        
        document.getElementById('media-library-modal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.getElementById('ml-search').value = '';
        
        await this.loadImages();
    },
    
    /**
     * Show image preview in the side panel (desktop only)
     */
    showPreview(url, name) {
        const panel = document.getElementById('ml-preview');
        if (!panel) return;
        panel.innerHTML = `
            <img src="${url}" alt="${name}">
            <p class="ml-preview-name">${name}</p>
        `;
    },

    /**
     * Reset preview panel to hint text
     */
    hidePreview() {
        const panel = document.getElementById('ml-preview');
        if (!panel) return;
        panel.innerHTML = '<p class="ml-preview-hint">Pasa el cursor sobre una imagen para previsualizarla</p>';
    },

    /**
     * Close the modal
     */
    close() {
        this.isOpen = false;
        document.getElementById('media-library-modal').style.display = 'none';
        document.body.style.overflow = '';
    },
    
    /**
     * Load images using existing SupabaseStorage API
     */
    async loadImages() {
        const loading = document.getElementById('ml-loading');
        const grid = document.getElementById('ml-grid');
        const empty = document.getElementById('ml-empty');
        
        loading.style.display = 'flex';
        grid.innerHTML = '';
        empty.style.display = 'none';
        
        try {
            if (typeof SupabaseStorage !== 'undefined' && SupabaseStorage.listarImagenes) {
                this.allImages = await SupabaseStorage.listarImagenes();
            } else {
                throw new Error('SupabaseStorage not available');
            }
            
            loading.style.display = 'none';
            this.renderImages(this.allImages);
            
        } catch (err) {
            console.error('Media load error:', err);
            loading.style.display = 'none';
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#ef4444;">Error cargando imágenes</p>';
        }
    },
    
    /**
     * Render image grid
     * FIX: Uses data-url attribute instead of inline onclick with URL string
     */
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
            const url = img.url || img;
            const name = img.nombre || url.split('/').pop();
            // FIX: data-url attribute instead of inline onclick — no URL escaping issues
            return `
                <div class="ml-item" data-url="${url}" data-name="${name}" title="${name}">
                    <img src="${url}" alt="${name}" loading="lazy">
                    <div class="ml-item-name">${name}</div>
                </div>
            `;
        }).join('');
    },
    
    /**
     * Filter images by search term
     */
    filter(term) {
        if (!term) {
            this.renderImages(this.allImages);
            return;
        }
        const filtered = this.allImages.filter(img => {
            const name = img.nombre || img.url || img;
            return name.toLowerCase().includes(term.toLowerCase());
        });
        this.renderImages(filtered);
    },
    
    /**
     * Select an image and close modal
     */
    select(url) {
        if (this.onSelectCallback) {
            this.onSelectCallback(url);
        }
        this.close();
    },
    
    /**
     * Upload a new image using existing SupabaseStorage
     */
    async upload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        event.target.value = '';
        
        if (file.size > 5 * 1024 * 1024) {
            alert('❌ Imagen muy grande (máx 5MB)');
            return;
        }
        
        const grid = document.getElementById('ml-grid');
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;"><div class="ml-spinner"></div><p style="margin-top:12px;">Subiendo...</p></div>`;
        
        try {
            if (typeof SupabaseStorage !== 'undefined' && SupabaseStorage.subirImagen) {
                const result = await SupabaseStorage.subirImagen(file);
                if (result.success) {
                    await this.loadImages();
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            } else {
                throw new Error('SupabaseStorage not available');
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('❌ Error subiendo imagen');
            await this.loadImages();
        }
    }
};
