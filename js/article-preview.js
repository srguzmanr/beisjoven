/**
 * BEISJOVEN - Article Preview Modal
 * ==================================
 * Shows article preview without leaving the admin panel.
 * - ArticlePreview.open(id)       → preview de artículo publicado (lista de artículos)
 * - ArticlePreview.openDraft()    → preview del borrador actual en el editor
 */
const ArticlePreview = {
    isOpen: false,

    /** Initialize - inject modal HTML + styles into DOM */
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
                position: fixed; inset: 0; background: rgba(0,0,0,0.7);
                z-index: 9998; display: flex; align-items: center;
                justify-content: center; padding: 20px;
            }
            .ap-container {
                background: white; border-radius: 12px; width: 100%;
                max-width: 720px; max-height: 85vh; display: flex;
                flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                color-scheme: light;
            }
            .ap-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 16px 20px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
            }
            .ap-header h3 { margin: 0; color: #1e3a5f; font-family: 'Oswald', sans-serif; font-size: 1.2rem; }
            .ap-close { background: none; border: none; font-size: 28px; cursor: pointer; color: #6b7280; line-height: 1; padding: 0 4px; }
            .ap-close:hover { color: #1f2937; }
            .ap-body { flex: 1; overflow-y: auto; padding: 24px; background: white; color: #1a1a2e; }
            .ap-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #6b7280; }
            .ap-spinner { width: 36px; height: 36px; border: 3px solid #e5e7eb; border-top-color: #1e3a5f; border-radius: 50%; animation: ap-spin 0.8s linear infinite; }
            @keyframes ap-spin { to { transform: rotate(360deg); } }

            /* Article content */
            .ap-image { width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; display: block; }
            .ap-pie-de-foto { font-size: 0.82rem; color: #6b7280; margin-bottom: 20px; font-style: italic; }
            .ap-category { display: inline-block; background: #c41e3a; color: white; padding: 4px 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 4px; margin-bottom: 12px; }
            .ap-title { font-family: 'Oswald', sans-serif; font-size: 1.8rem; line-height: 1.2; color: #1a1a2e; margin: 0 0 12px 0; }
            .ap-meta { display: flex; gap: 16px; color: #6b7280; font-size: 0.85rem; margin-bottom: 16px; flex-wrap: wrap; }
            .ap-excerpt { font-size: 1.05rem; color: #4b5563; line-height: 1.6; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; font-style: italic; }
            .ap-content { font-size: 1rem; line-height: 1.8; color: #1a1a2e; }
            .ap-content p { margin-bottom: 16px; }
            .ap-content h2 { font-family: 'Oswald', sans-serif; font-size: 1.5rem; margin: 24px 0 12px; color: #1a1a2e; }
            .ap-content h3 { font-family: 'Oswald', sans-serif; font-size: 1.3rem; margin: 24px 0 12px; color: #1a1a2e; }
            .ap-content blockquote { border-left: 4px solid #c41e3a; margin: 20px 0; padding: 12px 16px; background: #f8f9fa; border-radius: 0 8px 8px 0; font-style: italic; color: #1e3a5f; }
            .ap-content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
            .ap-content figure { margin: 20px 0; }
            .ap-content figcaption { font-size: 0.82rem; color: #6b7280; font-style: italic; margin-top: 6px; }
            .ap-featured-badge { display: inline-block; background: #f4a024; color: #1a1a2e; padding: 3px 10px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; border-radius: 4px; margin-left: 8px; }
            .ap-wbc-badge { display: flex; align-items: center; gap: 8px; background: #1a3a6b; color: white; padding: 8px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 0.85rem; }
            .ap-draft-banner { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 8px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 0.85rem; font-weight: 600; text-align: center; }

            /* Footer */
            .ap-footer { display: flex; gap: 10px; padding: 14px 20px; border-top: 1px solid #e5e7eb; background: #f9fafb; border-radius: 0 0 12px 12px; flex-shrink: 0; }
            .ap-btn { padding: 10px 18px; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 500; text-decoration: none; text-align: center; transition: all 0.15s; font-family: inherit; }
            .ap-btn-primary { background: #c41e3a; color: white; }
            .ap-btn-primary:hover { background: #9a1830; }
            .ap-btn-secondary { background: #1e3a5f; color: white; }
            .ap-btn-secondary:hover { background: #2d4a6f; }
            .ap-btn-cancel { background: #e5e7eb; color: #374151; margin-left: auto; }
            .ap-btn-cancel:hover { background: #d1d5db; }
            .ap-error { text-align: center; padding: 40px; color: #ef4444; }

            @media (max-width: 600px) {
                .ap-overlay { padding: 0; align-items: flex-end; }
                .ap-container { max-height: 92vh; border-radius: 16px 16px 0 0; }
                .ap-body { padding: 16px; }
                .ap-title { font-size: 1.4rem; }
                .ap-footer { flex-wrap: wrap; }
                .ap-btn { flex: 1; min-width: 80px; font-size: 0.85rem; padding: 12px 10px; }
                .ap-btn-cancel { margin-left: 0; }
            }
        </style>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });

        document.getElementById('article-preview-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('ap-overlay')) this.close();
        });
    },

    /** Render article HTML shared between open() and openDraft() */
    _renderArticle(article, isDraft = false) {
        const fecha = article.fecha
            ? new Date(article.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
            : new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

        return `
            ${isDraft ? '<div class="ap-draft-banner">⚠️ Vista previa del borrador — no publicado aún</div>' : ''}
            ${article.es_wbc2026 ? '<div class="ap-wbc-badge">⚾ Cobertura presentada por <strong>Caja Inmaculada</strong></div>' : ''}
            ${article.imagen_url ? `<img src="${article.imagen_url}" alt="${article.titulo}" class="ap-image">` : ''}
            ${article.pie_de_foto ? `<p class="ap-pie-de-foto">${article.pie_de_foto}${article.foto_credito ? ' — ' + article.foto_credito : ''}</p>` : ''}
            <div>
                <span class="ap-category">${article.categoria || 'Sin categoría'}</span>
                ${article.destacado ? '<span class="ap-featured-badge">⭐ Destacado</span>' : ''}
            </div>
            <h2 class="ap-title">${article.titulo || 'Sin título'}</h2>
            <div class="ap-meta">
                <span>✍️ ${article.autor || 'Redacción Beisjoven'}</span>
                <span>📅 ${fecha}</span>
            </div>
            ${article.extracto ? `<p class="ap-excerpt">${article.extracto}</p>` : ''}
            <div class="ap-content">${article.contenido || '<p>Sin contenido</p>'}</div>
        `;
    },

    /**
     * Preview del borrador actual en el editor
     * Lee directamente del formulario sin necesidad de guardar
     */
    openDraft() {
        this.init();
        this.isOpen = true;

        const modal = document.getElementById('article-preview-modal');
        const body = document.getElementById('ap-body');
        const footer = document.getElementById('ap-footer');

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Leer datos del formulario actual
        const titulo = document.getElementById('title')?.value || '';
        const extracto = document.getElementById('excerpt')?.value || '';
        const imagen_url = document.getElementById('image')?.value || '';
        const pie_de_foto = document.getElementById('foto-pie')?.value || '';
        const foto_credito = document.getElementById('foto-credito')?.value || '';
        const destacado = document.getElementById('featured')?.checked || false;
        const es_wbc2026 = document.getElementById('es_wbc2026')?.checked || false;

        // Contenido del RTE
        const rteEditor = document.querySelector('.rte-editor');
        const contenido = rteEditor ? rteEditor.innerHTML : (document.getElementById('content')?.value || '');

        // Categoría — buscar el texto del option seleccionado
        const catSelect = document.getElementById('category');
        const categoria = catSelect?.options[catSelect.selectedIndex]?.text || '';

        // Autor
        const authorSelect = document.getElementById('author');
        const autor = authorSelect?.options[authorSelect.selectedIndex]?.text || '';

        body.innerHTML = this._renderArticle({
            titulo, extracto, imagen_url, pie_de_foto, foto_credito,
            destacado, es_wbc2026, contenido, categoria, autor,
            fecha: new Date().toISOString()
        }, true);

        // Footer solo con Cerrar en modo borrador
        footer.innerHTML = `
            <button type="button" class="ap-btn ap-btn-cancel" style="margin-left:0;flex:1;" onclick="ArticlePreview.close()">
                ← Volver al editor
            </button>
        `;
        footer.style.display = 'flex';
    },

    /**
     * Preview de artículo publicado por ID (desde lista de artículos)
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

        body.innerHTML = `
            <div class="ap-loading">
                <div class="ap-spinner"></div>
                <p>Cargando artículo...</p>
            </div>
        `;

        try {
            const { data: article, error } = await supabaseClient
                .from('articulos')
                .select('*, categoria:categorias(nombre), autor:autores(nombre)')
                .eq('id', articleId)
                .single();

            if (error || !article) throw new Error(error?.message || 'Artículo no encontrado');

            body.innerHTML = this._renderArticle({
                ...article,
                categoria: article.categoria?.nombre,
                autor: article.autor?.nombre,
                pie_de_foto: article.pie_de_foto,
                foto_credito: article.foto_credito,
                es_wbc2026: article.es_wbc2026
            });

            footer.innerHTML = `
                <a id="ap-edit-btn" href="/admin/editar/${article.id}" class="ap-btn ap-btn-primary">✏️ Editar</a>
                <a href="/articulo/${article.slug}" target="_blank" class="ap-btn ap-btn-secondary">🌐 Ver en sitio</a>
                <button type="button" class="ap-btn ap-btn-cancel" onclick="ArticlePreview.close()">Cerrar</button>
            `;
            document.getElementById('ap-edit-btn').addEventListener('click', (e) => {
                e.preventDefault();
                this.close();
                Router.navigate(`/admin/editar/${article.id}`);
            });
            footer.style.display = 'flex';

        } catch (err) {
            console.error('Preview error:', err);
            body.innerHTML = `<div class="ap-error"><p>❌ Error cargando artículo</p><p>${err.message}</p></div>`;
        }
    },

    /** Close the modal */
    close() {
        this.isOpen = false;
        const modal = document.getElementById('article-preview-modal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
    }
};
