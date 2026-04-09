/**
 * media-library-core.js — MediaLibraryCore
 * Grid + Loading + Pagination (foundation)
 * Ticket: ADMIN3-P3c-1
 *
 * Public API (window.MediaLibrary):
 *   renderPage(containerId)          — inline page mode (/admin/medios)
 *   open(callback)                   — modal, single-select
 *   openMulti(callback)              — modal, multi-select
 *   close()                          — close modal
 */

(function (global) {
    'use strict';

    // ── HTML-escape attribute values ──────────────────────────────
    function _esc(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    }

    // ── Broken-image placeholder (SVG data URI) ───────────────────
    var _PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
        '<rect width="100" height="100" fill="#e5e7eb" rx="4"/>' +
        '<text x="50" y="62" text-anchor="middle" font-family="sans-serif" font-size="36" fill="#9ca3af">?</text>' +
        '</svg>'
    );

    // ── Private state ─────────────────────────────────────────────
    var _allImages      = [];
    var _filteredImages = [];
    var _visibleCount   = 50;
    var _mode           = 'page';   // 'page' | 'modal'
    var _onSelect       = null;
    var _multiSelect    = false;
    var _selected       = [];

    // DOM refs — refreshed on each init()
    var _grid       = null;
    var _countEl    = null;
    var _loadMoreEl = null;
    var _overlay    = null;   // modal overlay element (null in page mode)

    // ── Inject CSS once ───────────────────────────────────────────
    function _injectStyles() {
        if (document.getElementById('mlc-styles')) return;
        var s = document.createElement('style');
        s.id = 'mlc-styles';
        s.textContent = [
            /* Modal overlay */
            '.mlc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;',
            'display:flex;align-items:center;justify-content:center;padding:20px;color-scheme:light}',
            /* Modal shell */
            '.mlc-modal{background:#fff;border-radius:12px;width:100%;max-width:900px;',
            'max-height:88vh;display:flex;flex-direction:column;overflow:hidden;',
            'box-shadow:0 20px 40px rgba(0,0,0,.3)}',
            /* Modal header */
            '.mlc-header{display:flex;justify-content:space-between;align-items:center;',
            'padding:16px 20px;border-bottom:1px solid #e5e7eb;flex-shrink:0}',
            '.mlc-header h3{margin:0;color:#c41e3a;font-size:1.1rem}',
            '.mlc-close{background:none;border:none;font-size:28px;cursor:pointer;',
            'color:#6b7280;line-height:1;padding:0}',
            '.mlc-close:hover{color:#1e293b}',
            /* Scrollable body */
            '.mlc-body{flex:1;overflow-y:auto;padding:16px;min-height:0;-webkit-overflow-scrolling:touch}',
            /* Grid — 5 col desktop, 3 tablet, 2 mobile */
            '.mlc-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}',
            '@media(max-width:768px){.mlc-grid{grid-template-columns:repeat(3,1fr)}}',
            '@media(max-width:480px){.mlc-grid{grid-template-columns:repeat(2,1fr)}}',
            /* Thumbnail — 1:1, object-fit cover */
            '.mlc-thumb{aspect-ratio:1/1;border-radius:8px;overflow:hidden;cursor:pointer;',
            'border:3px solid transparent;transition:border-color .15s,transform .15s;',
            'background:#f3f4f6}',
            '.mlc-thumb:hover{border-color:#c41e3a;transform:scale(1.03)}',
            '.mlc-thumb img{width:100%;height:100%;object-fit:cover;display:block}',
            '.mlc-thumb.mlc-selected{border-color:#c41e3a}',
            /* Skeleton placeholders */
            '.mlc-skeleton{aspect-ratio:1/1;border-radius:8px;',
            'background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);',
            'background-size:200% 100%;animation:mlc-shimmer 1.5s infinite}',
            '@keyframes mlc-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}',
            /* Empty state */
            '.mlc-empty{text-align:center;padding:40px;color:#6b7280;grid-column:1/-1}',
            /* Footer */
            '.mlc-footer{display:flex;justify-content:space-between;align-items:center;',
            'padding:12px 20px;border-top:1px solid #e5e7eb;background:#f8fafc;',
            'flex-shrink:0;gap:8px;flex-wrap:wrap}',
            '.mlc-count{color:#6b7280;font-size:14px}',
            /* Buttons */
            '.mlc-btn-load-more{padding:10px 28px;background:#f3f4f6;border:1px solid #d1d5db;',
            'border-radius:8px;cursor:pointer;font-size:.9rem;font-weight:500;',
            'color:#374151;font-family:inherit}',
            '.mlc-btn-load-more:hover{background:#e5e7eb}',
            '.mlc-btn-cancel{padding:10px 20px;background:#e5e7eb;color:#374151;border:none;',
            'border-radius:8px;cursor:pointer;font-family:inherit}',
            '.mlc-btn-cancel:hover{background:#d1d5db}',
            '.mlc-btn-confirm{padding:10px 20px;background:#c41e3a;color:#fff;border:none;',
            'border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600}',
            '.mlc-btn-confirm:disabled{opacity:.5;cursor:default}',
            /* Page-mode wrapper */
            '.mlc-page-wrap{display:flex;flex-direction:column;',
            'height:calc(100vh - 140px);min-height:400px;color-scheme:light}',
            '.mlc-page-wrap .mlc-body{flex:1;overflow-y:auto;min-height:0}',
            /* Mobile modal adjustments */
            '@media(max-width:600px){',
            '.mlc-overlay{padding:0;align-items:flex-end}',
            '.mlc-modal{max-height:95vh;border-radius:12px 12px 0 0}}',
        ].join('');
        document.head.appendChild(s);
    }

    // ── Skeleton placeholders HTML ────────────────────────────────
    function _skeletons(n) {
        var html = '';
        for (var i = 0; i < n; i++) html += '<div class="mlc-skeleton"></div>';
        return html;
    }

    // ── Render images into the grid ───────────────────────────────
    function _render(images, resetPage) {
        if (resetPage !== false) _visibleCount = 50;
        _filteredImages = images || [];

        if (!_grid) return;

        var total   = _filteredImages.length;
        var visible = _filteredImages.slice(0, _visibleCount);

        if (total === 0) {
            _grid.innerHTML = '<div class="mlc-empty">No hay imágenes disponibles</div>';
        } else {
            _grid.innerHTML = visible.map(function (img) {
                return (
                    '<div class="mlc-thumb" data-url="' + _esc(img.url) + '">' +
                    '<img src="' + _esc(img.url) + '" ' +
                         'alt="' + _esc(img.pieDeFoto || img.nombre || '') + '" ' +
                         'loading="lazy">' +
                    '</div>'
                );
            }).join('');

            // Attach click + error handlers (no inline event attrs)
            _grid.querySelectorAll('.mlc-thumb').forEach(function (thumb) {
                thumb.addEventListener('click', function () {
                    _handleClick(thumb.dataset.url);
                });
                var img = thumb.querySelector('img');
                img.addEventListener('error', function () {
                    img.onerror = null;
                    img.style.opacity = '0.4';
                    img.src = _PLACEHOLDER;
                });
            });
        }

        if (_countEl) {
            _countEl.textContent = 'Mostrando ' + visible.length + ' de ' + total + ' imágenes';
        }
        if (_loadMoreEl) {
            _loadMoreEl.style.display = total > _visibleCount ? 'inline-block' : 'none';
        }
    }

    // ── Thumbnail click: select (modal) or no-op (page) ──────────
    function _handleClick(url) {
        if (_mode !== 'modal') return;

        var img = _allImages.find(function (i) { return i.url === url; }) ||
                  { url: url, nombre: '', pieDeFoto: '', credito: '' };

        if (_multiSelect) {
            var idx = _selected.findIndex(function (s) { return s.url === url; });
            if (idx >= 0) {
                _selected.splice(idx, 1);
            } else {
                _selected.push(img);
            }
            _grid.querySelectorAll('.mlc-thumb').forEach(function (el) {
                el.classList.toggle('mlc-selected',
                    _selected.some(function (s) { return s.url === el.dataset.url; }));
            });
            _updateConfirmBtn();
        } else {
            if (_onSelect) _onSelect(img);
            _close();
        }
    }

    function _updateConfirmBtn() {
        var btn = document.getElementById('mlc-confirm-btn');
        if (!btn) return;
        var n = _selected.length;
        btn.textContent = 'Agregar ' + n + ' foto' + (n !== 1 ? 's' : '');
        btn.disabled = n === 0;
    }

    // ── Load images from Supabase ─────────────────────────────────
    async function _loadImages() {
        try {
            if (typeof SupabaseStorage === 'undefined' || !SupabaseStorage.listarImagenes) {
                throw new Error('SupabaseStorage no disponible');
            }

            var results = await Promise.all([
                SupabaseStorage.listarImagenes(),
                supabaseClient.from('imagenes_metadata').select('*')
            ]);
            var rawImages  = results[0];
            var metaResult = results[1];
            var metaMap    = {};

            (metaResult.data || []).forEach(function (m) { metaMap[m.nombre] = m; });

            _allImages = rawImages.map(function (img) {
                var nombre = img.nombre || (img.url && img.url.split('/').pop()) || '';
                var meta   = metaMap[nombre] || {};
                return {
                    url:       img.url || img,
                    nombre:    nombre,
                    pieDeFoto: meta.pie_de_foto || '',
                    credito:   meta.credito || '',
                };
            }).filter(function (img) {
                if (!img.url || !img.nombre) return false;
                if (img.url.endsWith('/') || img.nombre.startsWith('.')) return false;
                return /\.(jpe?g|png|gif|webp|svg|bmp|avif)$/i.test(img.nombre);
            });

            _render(_allImages);

        } catch (err) {
            console.error('[MediaLibraryCore] load error:', err);
            if (_grid) {
                _grid.innerHTML =
                    '<div class="mlc-empty" style="color:#ef4444">Error al cargar imágenes</div>';
            }
            if (_countEl) _countEl.textContent = '';
        }
    }

    // ── Load more ─────────────────────────────────────────────────
    function _loadMore() {
        _visibleCount += 50;
        _render(_filteredImages, false);
    }

    // ── Build shared body + footer, return button area div ────────
    function _buildBody(parent) {
        var body = document.createElement('div');
        body.className = 'mlc-body';

        _grid = document.createElement('div');
        _grid.className = 'mlc-grid';
        _grid.innerHTML = _skeletons(15);   // show skeletons immediately
        body.appendChild(_grid);
        parent.appendChild(body);

        var footer = document.createElement('div');
        footer.className = 'mlc-footer';

        _countEl = document.createElement('span');
        _countEl.className = 'mlc-count';
        footer.appendChild(_countEl);

        var btnArea = document.createElement('div');
        btnArea.style.cssText = 'display:flex;gap:8px;align-items:center';

        _loadMoreEl = document.createElement('button');
        _loadMoreEl.type = 'button';
        _loadMoreEl.className = 'mlc-btn-load-more';
        _loadMoreEl.textContent = 'Cargar más ▼';
        _loadMoreEl.style.display = 'none';
        _loadMoreEl.addEventListener('click', _loadMore);
        btnArea.appendChild(_loadMoreEl);

        footer.appendChild(btnArea);
        parent.appendChild(footer);

        return btnArea;   // callers can append more buttons here
    }

    // ── Close and tear down modal ─────────────────────────────────
    function _close() {
        if (_overlay) { _overlay.remove(); _overlay = null; }
        document.body.style.overflow = '';
        _grid = _countEl = _loadMoreEl = null;
        _selected = [];
    }

    // ── Page mode: build grid inside given container element ──────
    function _initPage(containerEl) {
        containerEl.innerHTML = '';
        var wrap = document.createElement('div');
        wrap.className = 'mlc-page-wrap';
        _buildBody(wrap);
        containerEl.appendChild(wrap);
        _loadImages();
    }

    // ── Modal mode: create overlay + modal shell, load images ─────
    function _initModal() {
        // Remove any existing overlay
        var existing = document.getElementById('mlc-overlay');
        if (existing) existing.remove();

        _overlay = document.createElement('div');
        _overlay.id = 'mlc-overlay';
        _overlay.className = 'mlc-overlay';
        _overlay.addEventListener('click', function (e) {
            if (e.target === _overlay) _close();
        });

        var modal = document.createElement('div');
        modal.className = 'mlc-modal';
        _overlay.appendChild(modal);

        // Header
        var header = document.createElement('div');
        header.className = 'mlc-header';
        var h3 = document.createElement('h3');
        h3.textContent = 'Biblioteca de Medios';
        var closeBtn = document.createElement('button');
        closeBtn.className = 'mlc-close';
        closeBtn.type = 'button';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', _close);
        header.appendChild(h3);
        header.appendChild(closeBtn);
        modal.appendChild(header);

        // Body, footer, load-more button
        var btnArea = _buildBody(modal);

        // Cancel button
        var cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'mlc-btn-cancel';
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.addEventListener('click', _close);
        btnArea.appendChild(cancelBtn);

        // Multi-select confirm button
        if (_multiSelect) {
            var confirmBtn = document.createElement('button');
            confirmBtn.id = 'mlc-confirm-btn';
            confirmBtn.type = 'button';
            confirmBtn.className = 'mlc-btn-confirm';
            confirmBtn.textContent = 'Agregar 0 fotos';
            confirmBtn.disabled = true;
            confirmBtn.addEventListener('click', function () {
                if (_selected.length > 0 && _onSelect) _onSelect([].concat(_selected));
                _close();
            });
            btnArea.appendChild(confirmBtn);
        }

        document.body.style.overflow = 'hidden';
        document.body.appendChild(_overlay);

        // Escape key closes modal
        var _escHandler = function (e) {
            if (e.key === 'Escape') {
                _close();
                document.removeEventListener('keydown', _escHandler);
            }
        };
        document.addEventListener('keydown', _escHandler);

        _loadImages();
    }

    // ── MediaLibraryCore (internal) ───────────────────────────────
    var MediaLibraryCore = {
        /**
         * @param {HTMLElement|null} containerEl  — target for page mode; ignored for modal
         * @param {object} options
         *   mode:        'page' | 'modal'
         *   onSelect:    function(img) | function(imgs[])
         *   multiSelect: boolean
         */
        init: function (containerEl, options) {
            var opts     = options || {};
            _mode        = opts.mode || 'page';
            _onSelect    = opts.onSelect || null;
            _multiSelect = !!opts.multiSelect;
            _selected    = [];
            _allImages   = [];
            _filteredImages = [];
            _visibleCount   = 50;

            _injectStyles();

            if (_mode === 'modal') {
                _initModal();
            } else {
                _initPage(containerEl);
            }
        },
        close: _close,
    };

    global.MediaLibraryCore = MediaLibraryCore;

    // ── window.MediaLibrary — public API used by admin.js + tiptap ─
    global.MediaLibrary = {
        /**
         * Render media library inline inside #containerId.
         * Called by AdminPages.medios() in admin.js.
         */
        renderPage: function (containerId) {
            var el = document.getElementById(containerId);
            if (!el) {
                console.warn('[MediaLibrary] renderPage: container not found:', containerId);
                return;
            }
            MediaLibraryCore.init(el, { mode: 'page' });
        },

        /**
         * Open modal in single-select mode.
         * Callback receives: { url, nombre, pieDeFoto, credito }
         * Called by tiptap-editor.js (insert image).
         */
        open: function (callback) {
            MediaLibraryCore.init(null, { mode: 'modal', onSelect: callback, multiSelect: false });
        },

        /**
         * Open modal in multi-select mode.
         * Callback receives: [{ url, nombre, pieDeFoto, credito }, ...]
         * Called by tiptap-editor.js (insert gallery).
         */
        openMulti: function (callback) {
            MediaLibraryCore.init(null, { mode: 'modal', onSelect: callback, multiSelect: true });
        },

        close: function () { _close(); },
    };

})(window);
