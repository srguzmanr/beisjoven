/**
 * BEISJOVEN - Article Preview Modal
 * ==================================
 * Shows article preview without leaving the admin panel.
 * Click title in article list → preview modal with full content.
 */

const ArticlePreview = {
    isOpen: false,

    /**
     * Initialize - inject modal HTML + styles into DOM
     */
    init() {
        if (document.getElementById('article-preview-modal')) return;

        const html = `
            <div id="article-preview-modal" class="ap-overlay" style="display:none;">
                <div class="ap-container">
                    <div class="ap-header">
                        <h3>👁️ Vista Previa</h3>
                        <button type="button" class="ap-close" onclick="ArticlePreview.close()">&times;</button>
                    </div>
                    <div class="ap-body" id="ap-body">
                        <div class="ap-loading">
                            <div class="ap-spinner"></div>
                            <p>Cargando artículo...</p>
                        </div>
                    </div>
                    <div class="ap-footer" id="ap-footer" style="display:none;">
                        <a id="ap-edit-btn" href="#" class="ap-btn ap-btn-primary">✏️ Editar</a>
                        <a id="ap-site-btn" href="#" target="_blank" class="ap-btn ap-btn-secondary">🌐 Ver en sitio</a>
                        <button type="button" class="ap-btn ap-btn-cancel" onclick="ArticlePreview.close()">Cerrar</button>
                    </div>
                </div>
            </div>

            <style>
                .ap-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.7);
                    z-index: 9998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .ap-container {
                    background: white;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 720px;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                }
                .ap-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    border-bottom: 1px solid #e5e7eb;
                    flex-shrink: 0;
                }
                .ap-header h3 {
                    margin: 0;
                    color: #1e3a5f;
                    font-family: 'Oswald', sans-serif;
                    font-size: 1.2rem;
                }
                .ap-close {
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: #6b7280;
                    line-height: 1;
                }
                .ap-close:hover { color: #1f2937; }
                .ap-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px;
                }
                .ap-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px;
                    color: #6b7280;
                }
                .ap-spinner {
                    width: 36px;
                    height: 36px;
                    border: 3px solid #e5e7eb;
                    border-top-color: #1e3a5f;
                    border-radius: 50%;
                    animation: ap-spin 0.8s linear infinite;
                }
                @keyframes ap-spin { to { transform: rotate(360deg); } }

                /* Article content styles */
                .ap-image {
                    width: 100%;
                    max-height: 300px;
                    object-fit: cover;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                .ap-category {
                    display: inline-block;
                    background: #c41e3a;
                    color: white;
                    padding: 4px 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-radius: 4px;
                    margin-bottom: 12px;
                }
                .ap-title {
                    font-family: 'Oswald', sans-serif;
                    font-size: 1.8rem;
                    line-height: 1.2;
                    color: #1a1a2e;
                    margin: 0 0 12px 0;
                }
                .ap-meta {
                    display: flex;
                    gap: 16px;
                    color: #6b7280;
                    font-size: 0.85rem;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                }
                .ap-excerpt {
                    font-size: 1.05rem;
                    color: #4b5563;
                    line-height: 1.6;
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #e5e7eb;
                    font-style: italic;
                }
                .ap-content {
                    font-size: 1rem;
                    line-height: 1.8;
                    color: #1a1a2e;
                }
                .ap-content p { margin-bottom: 16px; }
                .ap-content h3 {
                    font-family: 'Oswald', sans-serif;
                    font-size: 1.3rem;
                    margin: 24px 0 12px;
                    color: #1a1a2e;
                }
                .ap-content blockquote {
                    border-left: 4px solid #c41e3a;
                    margin: 20px 0;
                    padding: 12px 16px;
                    background: #f8f9fa;
                    border-radius: 0 8px 8px 0;
                    font-style: italic;
                    color: #1e3a5f;
                }
                .ap-content img {
                    max-width: 100%;
                    border-radius: 8px;
                    margin: 16px 0;
                }
                .ap-featured-badge {
                    display: inline-block;
                    background: #f4a024;
                    color: #1a1a2e;
                    padding: 3px 10px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    border-radius: 4px;
                    margin-left: 8px;
                }

                /* Footer */
                .ap-footer {
                    display: flex;
                    gap: 10px;
                    padding: 14px 20px;
                    border-top: 1px solid #e5e7eb;
                    background: #f9fafb;
                    border-radius: 0 0 12px 12px;
                    flex-shrink: 0;
                }
                .ap-btn {
                    padding: 10px 18px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 500;
                    text-decoration: none;
                    text-align: center;
                    transition: all 0.15s;
                }
                .ap-btn-primary {
                    background: #c41e3a;
                    color: white;
                }
                .ap-btn-primary:hover { background: #9a1830; }
                .ap-btn-secondary {
                    background: #1e3a5f;
                    color: white;
                }
                .ap-btn-secondary:hover { background: #2d4a6f; }
                .ap-btn-cancel {
                    background: #e5e7eb;
                    color: #374151;
                    margin-left: auto;
                }
                .ap-btn-cancel:hover { background: #d1d5db; }

                .ap-error {
                    text-align: center;
                    padding: 40px;
                    color: #ef4444;
                }

                @media (max-width: 600px) {
                    .ap-container { max-height: 90vh; }
                    .ap-body { padding: 16px; }
                    .ap-title { font-size: 1.4rem; }
                    .ap-footer { flex-wrap: wrap; }
                    .ap-btn { flex: 1; min-width: 80px; }
                    .ap-btn-cancel { margin-left: 0; }
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });

        // Close on overlay click
        document.getElementById('article-preview-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('ap-overlay')) this.close();
        });
    },

    /**
     * Open preview for an article by ID
     */
    async open(articleId) {
        this.init();
        this.isOpen = true;

        const modal = document.getElementById('article-preview-modal');
        const body = document.getElementById('ap-body');
        const footer = document.getElementById('ap-footer');

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        footer.style.display = 'none';

        // Show loading
        body.innerHTML = `
            <div class="ap-loading">
                <div class="ap-spinner"></div>
                <p>Cargando artículo...</p>
            </div>
        `;

        try {
            // Fetch article from Supabase
            const { data: article, error } = await window.supabase
                .from('articulos')
                .select('*, categoria:categorias(nombre), autor:autores(nombre)')
                .eq('id', articleId)
                .single();

            if (error || !article) throw new Error(error?.message || 'Artículo no encontrado');

            // Format date
            const fecha = new Date(article.fecha).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Render article
            body.innerHTML = `
                ${article.imagen_url ? `<img src="${article.imagen_url}" alt="${article.titulo}" class="ap-image">` : ''}
                <div>
                    <span class="ap-category">${article.categoria?.nombre || 'Sin categoría'}</span>
                    ${article.destacado ? '<span class="ap-featured-badge">⭐ Destacado</span>' : ''}
                </div>
                <h2 class="ap-title">${article.titulo}</h2>
                <div class="ap-meta">
                    <span>✍️ ${article.autor?.nombre || 'Sin autor'}</span>
                    <span>📅 ${fecha}</span>
                </div>
                ${article.extracto ? `<p class="ap-excerpt">${article.extracto}</p>` : ''}
                <div class="ap-content">${article.contenido || '<p>Sin contenido</p>'}</div>
            `;

            // Set footer links
            document.getElementById('ap-edit-btn').href = `/admin/editar/${article.id}`;
            document.getElementById('ap-edit-btn').onclick = (e) => {
                e.preventDefault();
                this.close();
                Router.navigate(`/admin/editar/${article.id}`);
            };
            document.getElementById('ap-site-btn').href = `/articulo/${article.slug}`;
            footer.style.display = 'flex';

        } catch (err) {
            console.error('Preview error:', err);
            body.innerHTML = `<div class="ap-error"><p>❌ Error cargando artículo</p><p>${err.message}</p></div>`;
            footer.style.display = 'none';
        }
    },

    /**
     * Close the modal
     */
    close() {
        this.isOpen = false;
        document.getElementById('article-preview-modal').style.display = 'none';
        document.body.style.overflow = '';
    }
};
