/**
 * BEISJOVEN - Media Library Modal
 * ================================
 * 
 * Inline image picker for the article editor.
 * 
 * INSTALLATION:
 * 1. Add this file to js/media-library.js
 * 2. Add to index.html: <script src="js/media-library.js"></script>
 * 3. Call MediaLibrary.init() when admin panel loads
 * 4. See integration code at bottom of file
 */

const MediaLibrary = {
    // Supabase config
    supabaseUrl: 'https://yulkbjpotfmwqkzzfegg.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bGtianBvdGZtd3FrenpmZWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3NTk0MDUsImV4cCI6MjA1MzMzNTQwNX0.QKe_P8T0p6LFwGJL9bNziHaej1SvGtHNeaC_G6wXPmo',
    bucketName: 'imagenes',
    
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
                        <div id="ml-grid" class="ml-grid"></div>
                        <div id="ml-empty" class="ml-empty" style="display:none">
                            <p>📁 No hay imágenes</p>
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
                    background: white;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 800px;
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
                    border-bottom: 1px solid #e5e7eb;
                }
                .ml-header h3 {
                    margin: 0;
                    color: #1e3a5f;
                }
                .ml-close {
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: #6b7280;
                    line-height: 1;
                }
                .ml-close:hover { color: #1f2937; }
                .ml-toolbar {
                    display: flex;
                    gap: 10px;
                    padding: 12px 20px;
                    background: #f9fafb;
                    border-bottom: 1px solid #e5e7eb;
                }
                .ml-search {
                    flex: 1;
                    padding: 10px 14px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 14px;
                }
                .ml-search:focus {
                    outline: none;
                    border-color: #1e3a5f;
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
                    overflow-y: auto;
                    padding: 16px;
                    min-height: 250px;
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
                .ml-item:hover {
                    border-color: #1e3a5f;
                    transform: scale(1.03);
                }
                .ml-item img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
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
                }
                .ml-item:hover .ml-item-name { opacity: 1; }
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
                    border-top-color: #1e3a5f;
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
                    background: #f9fafb;
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
                .ml-uploading {
                    position: absolute;
                    inset: 0;
                    background: rgba(255,255,255,0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                @media (max-width: 600px) {
                    .ml-toolbar { flex-wrap: wrap; }
                    .ml-search { width: 100%; }
                    .ml-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); }
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
     * Close the modal
     */
    close() {
        this.isOpen = false;
        document.getElementById('media-library-modal').style.display = 'none';
        document.body.style.overflow = '';
    },
    
    /**
     * Load images from Supabase
     */
    async loadImages() {
        const loading = document.getElementById('ml-loading');
        const grid = document.getElementById('ml-grid');
        const empty = document.getElementById('ml-empty');
        
        loading.style.display = 'flex';
        grid.innerHTML = '';
        empty.style.display = 'none';
        
        try {
            const res = await fetch(
                `${this.supabaseUrl}/storage/v1/object/list/${this.bucketName}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.supabaseKey}`,
                        'apikey': this.supabaseKey
                    }
                }
            );
            
            if (!res.ok) throw new Error('Failed to load');
            
            const files = await res.json();
            
            this.allImages = files
                .filter(f => f.name && !f.name.startsWith('.') && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
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
     */
    renderImages(images) {
        const grid = document.getElementById('ml-grid');
        const empty = document.getElementById('ml-empty');
        const count = document.getElementById('ml-count');
        
        if (images.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'flex';
            count.textContent = '0 imágenes';
            return;
        }
        
        empty.style.display = 'none';
        count.textContent = `${images.length} imagen${images.length !== 1 ? 'es' : ''}`;
        
        grid.innerHTML = images.map(img => {
            const url = `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${img.name}`;
            return `
                <div class="ml-item" onclick="MediaLibrary.select('${url}')" title="${img.name}">
                    <img src="${url}" alt="${img.name}" loading="lazy">
                    <div class="ml-item-name">${img.name}</div>
                </div>
            `;
        }).join('');
    },
    
    /**
     * Filter images by search term
     */
    filter(term) {
        const filtered = term 
            ? this.allImages.filter(img => img.name.toLowerCase().includes(term.toLowerCase()))
            : this.allImages;
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
     * Upload a new image
     */
    async upload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Reset input
        event.target.value = '';
        
        // Show uploading state
        const grid = document.getElementById('ml-grid');
        const originalHTML = grid.innerHTML;
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;"><div class="ml-spinner"></div><p style="margin-top:12px;">Subiendo ${file.name}...</p></div>`;
        
        try {
            // Generate unique filename
            const ext = file.name.split('.').pop();
            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_{2,}/g, '_');
            const fileName = `${timestamp}-${safeName}`;
            
            const res = await fetch(
                `${this.supabaseUrl}/storage/v1/object/${this.bucketName}/${fileName}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.supabaseKey}`,
                        'apikey': this.supabaseKey,
                        'Content-Type': file.type
                    },
                    body: file
                }
            );
            
            if (!res.ok) throw new Error('Upload failed');
            
            // Reload images
            await this.loadImages();
            
        } catch (err) {
            console.error('Upload error:', err);
            alert('Error subiendo imagen. Intenta de nuevo.');
            grid.innerHTML = originalHTML;
        }
    }
};

/* ============================================
   INTEGRATION CODE
   ============================================
   
   In your admin.js, find where you render the article form
   and replace the image URL input with this:
   
   BEFORE (plain input):
   -----------------------------------------
   <label>URL de Imagen</label>
   <input type="text" id="articulo-imagen" placeholder="https://...">
   
   
   AFTER (with picker button):
   -----------------------------------------
   <label>Imagen del Artículo</label>
   <div style="display:flex;gap:8px;">
       <input type="text" id="articulo-imagen" placeholder="URL de la imagen..." style="flex:1" readonly>
       <button type="button" onclick="MediaLibrary.open(url => document.getElementById('articulo-imagen').value = url)" 
               style="padding:10px 16px;background:#1e3a5f;color:white;border:none;border-radius:8px;cursor:pointer;white-space:nowrap;">
           📷 Seleccionar
       </button>
   </div>
   <img id="articulo-imagen-preview" src="" style="max-width:200px;margin-top:8px;border-radius:8px;display:none;">
   
   
   Then add this to show preview when image is selected:
   -----------------------------------------
   MediaLibrary.open(url => {
       document.getElementById('articulo-imagen').value = url;
       const preview = document.getElementById('articulo-imagen-preview');
       preview.src = url;
       preview.style.display = 'block';
   });
   
   
   Initialize when admin panel loads:
   -----------------------------------------
   MediaLibrary.init();
   
*/
