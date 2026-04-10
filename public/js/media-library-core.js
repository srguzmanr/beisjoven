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
    var _mobileMultiMode = false;

    // DOM refs — refreshed on each init()
    var _grid         = null;
    var _countEl      = null;
    var _loadMoreEl   = null;
    var _overlay      = null;   // modal overlay element (null in page mode)
    var _progressWrap = null;   // upload progress list container
    var _uploadInput  = null;   // hidden file input

    // ── Detail panel state ────────────────────────────────────────
    var _detailImg  = null;
    var _dpPanel    = null;
    var _dpBackdrop = null;
    var _saveTimers = {};

    // ── Filter state ──────────────────────────────────────────────
    var _searchQuery      = '';
    var _activeCategory   = 'todas';
    var _activeDateFilter = 'Todo';
    var _searchTimer      = null;

    // ── Filter constants ──────────────────────────────────────────
    // Single source of truth for categories — used by filter pills AND detail panel dropdown.
    var _CATEGORY_OPTIONS = [
        { key: 'wbc',       label: 'WBC 2026' },
        { key: 'mlb',       label: 'MLB' },
        { key: 'seleccion', label: 'Selección' },
        { key: 'softbol',   label: 'Softbol' },
        { key: 'juvenil',   label: 'Juvenil' },
        { key: 'ligas',     label: 'Ligas MX' },
    ];
    var _DATE_FILTERS = ['Todo', 'Este mes', 'Esta semana', 'Hoy'];

    // Filename keyword fallback when categoria metadata field is absent (indexed by key)
    var _CAT_KEYWORDS = {
        'wbc':       ['wbc'],
        'mlb':       ['mlb'],
        'seleccion': ['seleccion', 'selección', 'selecci\u00f3n'],
        'softbol':   ['softbol'],
        'juvenil':   ['juvenil'],
        'ligas':     ['ligas'],
    };

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
            '.mlc-thumb{position:relative;aspect-ratio:1/1;border-radius:8px;overflow:hidden;cursor:pointer;',
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
            /* Filters section */
            '.mlc-filters{padding:12px 16px;border-bottom:1px solid #e5e7eb;',
            'display:flex;flex-direction:column;gap:10px;flex-shrink:0}',
            /* Search bar */
            '.mlc-search-wrap{position:relative;display:flex;align-items:center}',
            '.mlc-search-input{width:100%;padding:8px 36px 8px 12px;border:1px solid #d1d5db;',
            'border-radius:8px;font-size:.9rem;font-family:inherit;outline:none;',
            'background:#fff;box-sizing:border-box}',
            '.mlc-search-input:focus{border-color:#C8102E;',
            'box-shadow:0 0 0 2px rgba(200,16,46,.1)}',
            '.mlc-search-clear{position:absolute;right:8px;background:none;border:none;',
            'cursor:pointer;color:#9ca3af;font-size:18px;line-height:1;padding:0;display:none}',
            '.mlc-search-clear:hover{color:#374151}',
            /* Pill rows — horizontal scroll on mobile */
            '.mlc-pill-row{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;',
            'scrollbar-width:none;padding-bottom:2px;flex-shrink:0}',
            '.mlc-pill-row::-webkit-scrollbar{display:none}',
            '.mlc-pill{white-space:nowrap;padding:5px 14px;border-radius:20px;',
            'border:1px solid #d1d5db;background:#f3f4f6;color:#374151;',
            'cursor:pointer;font-size:.8rem;font-weight:500;font-family:inherit;',
            'transition:background .15s,color .15s,border-color .15s;flex-shrink:0}',
            '.mlc-pill:hover{background:#e5e7eb}',
            '.mlc-pill.mlc-active{background:#C8102E;color:#fff;border-color:#C8102E}',
            /* ℹ info button on thumbnail */
            '.mlc-info-btn{position:absolute;top:5px;right:5px;width:24px;height:24px;',
            'border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;cursor:pointer;',
            'font-size:13px;font-weight:bold;line-height:24px;text-align:center;z-index:2;',
            'opacity:0;transition:opacity .15s;padding:0;font-family:serif}',
            '.mlc-thumb:hover .mlc-info-btn{opacity:1}',
            '@media(hover:none){.mlc-info-btn{opacity:.8}}',
            /* Detail panel backdrop */
            '.mlc-dp-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:10000}',
            /* Detail panel — side panel on desktop */
            '.mlc-dp{position:fixed;top:0;right:0;height:100%;width:360px;max-width:100%;',
            'background:#fff;box-shadow:-4px 0 24px rgba(0,0,0,.18);z-index:10001;',
            'display:flex;flex-direction:column;overflow:hidden;color-scheme:light;',
            'transform:translateX(100%);transition:transform .25s ease}',
            '.mlc-dp.mlc-dp-open{transform:translateX(0)}',
            /* Bottom sheet on mobile */
            '@media(max-width:600px){',
            '.mlc-dp{top:auto;bottom:0;left:0;right:0;width:100%;height:80vh;max-height:80vh;',
            'border-radius:16px 16px 0 0;box-shadow:0 -4px 24px rgba(0,0,0,.2);',
            'transform:translateY(100%)}',
            '.mlc-dp.mlc-dp-open{transform:translateY(0)}}',
            /* Panel header */
            '.mlc-dp-hdr{display:flex;justify-content:space-between;align-items:center;',
            'padding:14px 16px;border-bottom:1px solid #e5e7eb;flex-shrink:0}',
            '.mlc-dp-hdr span{font-weight:600;color:#1e293b;font-size:1rem}',
            '.mlc-dp-close{background:none;border:none;font-size:24px;cursor:pointer;',
            'color:#6b7280;line-height:1;padding:0}',
            '.mlc-dp-close:hover{color:#1e293b}',
            /* Panel scrollable body */
            '.mlc-dp-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px}',
            /* Preview */
            '.mlc-dp-preview{width:100%;aspect-ratio:16/9;background:#f3f4f6;border-radius:8px;',
            'overflow:hidden;margin-bottom:16px}',
            '.mlc-dp-preview img{width:100%;height:100%;object-fit:contain;display:block}',
            /* Metadata rows */
            '.mlc-dp-meta{margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid #e5e7eb}',
            '.mlc-dp-meta-row{display:flex;gap:8px;font-size:.82rem;margin-bottom:6px;align-items:baseline}',
            '.mlc-dp-meta-row span:first-child{color:#6b7280;flex-shrink:0;min-width:90px}',
            '.mlc-dp-meta-row span:last-child{color:#1e293b;word-break:break-all;font-weight:500}',
            /* Editable fields */
            '.mlc-dp-fields{margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid #e5e7eb}',
            '.mlc-dp-field{margin-bottom:12px}',
            '.mlc-dp-field label{display:block;font-size:.8rem;font-weight:600;color:#374151;margin-bottom:4px}',
            '.mlc-dp-field input,.mlc-dp-field textarea,.mlc-dp-field select{width:100%;padding:7px 10px;',
            'border:1px solid #d1d5db;border-radius:6px;font-size:.85rem;font-family:inherit;',
            'outline:none;box-sizing:border-box;background:#fff;color:#1e293b;resize:vertical}',
            '.mlc-dp-field input:focus,.mlc-dp-field textarea:focus,.mlc-dp-field select:focus{border-color:#C8102E;',
            'box-shadow:0 0 0 2px rgba(200,16,46,.1)}',
            '.mlc-dp-field textarea{min-height:72px}',
            '.mlc-dp-save-status{font-size:.75rem;color:#22c55e;margin-top:3px;min-height:1em;display:block}',
            /* Action buttons */
            '.mlc-dp-actions{display:flex;gap:10px;flex-wrap:wrap}',
            '.mlc-dp-copy-btn{flex:1;padding:9px 14px;background:#f3f4f6;border:1px solid #d1d5db;',
            'border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:500;color:#374151;font-family:inherit}',
            '.mlc-dp-copy-btn:hover{background:#e5e7eb}',
            '.mlc-dp-delete-btn{padding:9px 14px;background:#fee2e2;border:1px solid #fca5a5;',
            'border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:500;color:#dc2626;font-family:inherit}',
            '.mlc-dp-delete-btn:hover{background:#fecaca}',
            /* Delete confirmation box */
            '.mlc-dp-confirm{background:#fff3f3;border:1px solid #fca5a5;border-radius:10px;',
            'padding:14px;margin-top:10px;display:none}',
            '.mlc-dp-confirm p{margin:0 0 12px;font-size:.88rem;color:#374151}',
            '.mlc-dp-confirm-btns{display:flex;gap:8px}',
            '.mlc-dp-confirm-no{flex:1;padding:8px;background:#f3f4f6;border:1px solid #d1d5db;',
            'border-radius:7px;cursor:pointer;font-family:inherit;font-size:.85rem}',
            '.mlc-dp-confirm-yes{flex:1;padding:8px;background:#dc2626;color:#fff;border:none;',
            'border-radius:7px;cursor:pointer;font-family:inherit;font-size:.85rem;font-weight:600}',
            '.mlc-dp-confirm-yes:disabled{opacity:.5;cursor:default}',
            /* Upload zone (page mode only) */
            '.mlc-upload-zone{border:2px dashed #d1d5db;border-radius:10px;padding:18px 16px;',
            'margin-bottom:12px;text-align:center;transition:border-color .15s,background .15s;',
            'flex-shrink:0;background:#fafafa}',
            '.mlc-upload-zone.mlc-dz-hover{border-color:#C8102E;background:#fff5f5}',
            '.mlc-upload-zone-inner{display:flex;flex-direction:column;align-items:center;gap:5px}',
            '.mlc-upload-icon{font-size:1.8rem;color:#9ca3af;line-height:1}',
            '.mlc-upload-label{margin:0;font-size:.88rem;color:#6b7280}',
            '.mlc-upload-or{margin:0;font-size:.78rem;color:#9ca3af}',
            /* Upload button */
            '.mlc-btn-upload{padding:7px 18px;background:#fff;border:1px solid #C8102E;',
            'border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600;',
            'color:#C8102E;font-family:inherit;transition:background .15s,color .15s}',
            '.mlc-btn-upload:hover{background:#C8102E;color:#fff}',
            /* Gallery insert button */
            '.mlc-btn-gallery{padding:10px 16px;background:#1d4ed8;color:#fff;border:none;',
            'border-radius:8px;cursor:pointer;font-family:inherit;font-size:.85rem;font-weight:600}',
            '.mlc-btn-gallery:hover{background:#1e40af}',
            /* Mobile multi-select toggle */
            '.mlc-btn-ms-toggle{padding:8px 12px;background:#f3f4f6;border:1px solid #d1d5db;',
            'border-radius:8px;cursor:pointer;font-family:inherit;font-size:.82rem;color:#374151}',
            '.mlc-btn-ms-toggle.mlc-ms-active{background:#dbeafe;border-color:#93c5fd;color:#1d4ed8}',
            '@media(min-width:601px){.mlc-btn-ms-toggle{display:none!important}}',
            /* Upload progress list */
            '.mlc-upload-progress-list{display:none;margin-top:10px;text-align:left;',
            'max-height:150px;overflow-y:auto}',
            '.mlc-upload-item{display:flex;flex-direction:column;gap:3px;',
            'padding:5px 0;border-bottom:1px solid #f3f4f6}',
            '.mlc-upload-item:last-child{border-bottom:none}',
            '.mlc-upload-item-name{font-size:.76rem;color:#374151;white-space:nowrap;',
            'overflow:hidden;text-overflow:ellipsis}',
            '.mlc-upload-progress-bar{height:4px;background:#e5e7eb;border-radius:4px;overflow:hidden}',
            '.mlc-upload-progress-fill{height:100%;width:0%;background:#22c55e;',
            'border-radius:4px;transition:width .2s linear}',
            '.mlc-upload-progress-fill.mlc-up-error{background:#ef4444}',
            '.mlc-upload-item-status{font-size:.73rem}',
            '.mlc-upload-error{color:#ef4444}',
            '.mlc-upload-success{color:#22c55e}',
            /* Checkmark overlay on selected thumbnail */
            '.mlc-check{position:absolute;bottom:5px;left:5px;width:20px;height:20px;',
            'border-radius:50%;background:#2563eb;color:#fff;font-size:13px;',
            'display:none;align-items:center;justify-content:center;z-index:3;',
            'box-shadow:0 2px 4px rgba(0,0,0,.35);pointer-events:none;line-height:1}',
            '.mlc-thumb.mlc-selected .mlc-check{display:flex}',
            '.mlc-thumb.mlc-selected{border-color:#2563eb!important}',
        ].join('');
        document.head.appendChild(s);
    }

    // ── Strip diacritics for accent-insensitive comparison ────────
    function _normalizeStr(s) {
        return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // ── Apply all active filters and re-render ────────────────────
    function _applyFilters() {
        var query = _searchQuery.trim().toLowerCase();
        var now   = new Date();

        var filtered = _allImages.filter(function (img) {
            // 1. Search: filename / pie_de_foto / credito
            if (query) {
                var nombre    = (img.nombre    || '').toLowerCase();
                var pieDeFoto = (img.pieDeFoto || '').toLowerCase();
                var credito   = (img.credito   || '').toLowerCase();
                if (nombre.indexOf(query)    < 0 &&
                    pieDeFoto.indexOf(query) < 0 &&
                    credito.indexOf(query)   < 0) {
                    return false;
                }
            }

            // 2. Category filter — compare stored key directly (e.g. 'wbc', 'mlb')
            if (_activeCategory !== 'todas') {
                var imgCat = img.categoria || '';
                if (imgCat) {
                    if (imgCat !== _activeCategory) return false;
                } else {
                    // Fallback: keyword match in filename
                    var keywords = _CAT_KEYWORDS[_activeCategory] || [_activeCategory];
                    var nom = (img.nombre || '').toLowerCase();
                    if (!keywords.some(function (kw) { return nom.indexOf(kw) >= 0; })) {
                        return false;
                    }
                }
            }

            // 3. Date filter
            if (_activeDateFilter !== 'Todo' && img.fechaSubida) {
                var imgDate = new Date(img.fechaSubida);
                if (!isNaN(imgDate.getTime())) {
                    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    if (_activeDateFilter === 'Hoy') {
                        if (imgDate < today) return false;
                    } else if (_activeDateFilter === 'Esta semana') {
                        var weekAgo = new Date(today);
                        weekAgo.setDate(weekAgo.getDate() - 6);
                        if (imgDate < weekAgo) return false;
                    } else if (_activeDateFilter === 'Este mes') {
                        var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                        if (imgDate < monthStart) return false;
                    }
                }
            }

            return true;
        });

        _render(filtered);
    }

    // ── Build search bar + category/date pill rows ────────────────
    function _buildFilters(parent) {
        var section = document.createElement('div');
        section.className = 'mlc-filters';

        // ── Search bar ──
        var searchWrap = document.createElement('div');
        searchWrap.className = 'mlc-search-wrap';

        var searchInput = document.createElement('input');
        searchInput.type        = 'text';
        searchInput.className   = 'mlc-search-input';
        searchInput.placeholder = 'Buscar por nombre, pie de foto o crédito…';

        var clearBtn = document.createElement('button');
        clearBtn.type      = 'button';
        clearBtn.className = 'mlc-search-clear';
        clearBtn.innerHTML = '&times;';
        clearBtn.title     = 'Limpiar búsqueda';

        searchInput.addEventListener('input', function () {
            _searchQuery = searchInput.value;
            clearBtn.style.display = _searchQuery ? 'block' : 'none';
            clearTimeout(_searchTimer);
            _searchTimer = setTimeout(_applyFilters, 300);
        });

        clearBtn.addEventListener('click', function () {
            searchInput.value      = '';
            _searchQuery           = '';
            clearBtn.style.display = 'none';
            clearTimeout(_searchTimer);
            _applyFilters();
        });

        searchWrap.appendChild(searchInput);
        searchWrap.appendChild(clearBtn);
        section.appendChild(searchWrap);

        // ── Category pills — use _CATEGORY_OPTIONS (single source of truth) ──
        var catRow = document.createElement('div');
        catRow.className = 'mlc-pill-row';
        [{ key: 'todas', label: 'Todas' }].concat(_CATEGORY_OPTIONS).forEach(function (opt) {
            var btn = document.createElement('button');
            btn.type      = 'button';
            btn.className = 'mlc-pill' + (opt.key === _activeCategory ? ' mlc-active' : '');
            btn.textContent = opt.label;
            btn.addEventListener('click', function () {
                _activeCategory = opt.key;
                catRow.querySelectorAll('.mlc-pill').forEach(function (p) {
                    p.classList.toggle('mlc-active', p.textContent === opt.label);
                });
                _applyFilters();
            });
            catRow.appendChild(btn);
        });
        section.appendChild(catRow);

        // ── Date pills ──
        var dateRow = document.createElement('div');
        dateRow.className = 'mlc-pill-row';
        _DATE_FILTERS.forEach(function (df) {
            var btn = document.createElement('button');
            btn.type        = 'button';
            btn.className   = 'mlc-pill' + (df === _activeDateFilter ? ' mlc-active' : '');
            btn.textContent = df;
            btn.addEventListener('click', function () {
                _activeDateFilter = df;
                dateRow.querySelectorAll('.mlc-pill').forEach(function (p) {
                    p.classList.toggle('mlc-active', p.textContent === df);
                });
                _applyFilters();
            });
            dateRow.appendChild(btn);
        });
        section.appendChild(dateRow);

        parent.appendChild(section);
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
            var _hasFilters = _searchQuery || _activeCategory !== 'Todas' || _activeDateFilter !== 'Todo';
            var _emptyMsg   = _hasFilters
                ? 'No se encontraron imágenes con los filtros activos'
                : 'No hay imágenes disponibles';
            _grid.innerHTML = '<div class="mlc-empty">' + _emptyMsg + '</div>';
        } else {
            _grid.innerHTML = visible.map(function (img) {
                return (
                    '<div class="mlc-thumb" data-url="' + _esc(img.url) + '">' +
                    '<img src="' + _esc(img.url) + '" ' +
                         'alt="' + _esc(img.pieDeFoto || img.nombre || '') + '" ' +
                         'loading="lazy">' +
                    '<button class="mlc-info-btn" type="button" title="Ver detalles">&#8505;</button>' +
                    '<div class="mlc-check">&#10003;</div>' +
                    '</div>'
                );
            }).join('');

            // Attach click + error handlers (no inline event attrs)
            _grid.querySelectorAll('.mlc-thumb').forEach(function (thumb) {
                // Re-apply selection state from _selected array
                if (_mode === 'modal' && _selected.some(function (s) { return s.url === thumb.dataset.url; })) {
                    thumb.classList.add('mlc-selected');
                }
                thumb.addEventListener('click', function (e) {
                    _handleClick(thumb.dataset.url, e);
                });
                // ℹ button opens detail panel
                var infoBtn = thumb.querySelector('.mlc-info-btn');
                if (infoBtn) {
                    infoBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        var found = _allImages.find(function (i) { return i.url === thumb.dataset.url; });
                        if (found) _openDetail(found);
                    });
                }
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

    // ── Thumbnail click: select/deselect in modal ─────────────────
    function _handleClick(url, event) {
        if (_mode !== 'modal') return;

        var img = _allImages.find(function (i) { return i.url === url; }) ||
                  { url: url, nombre: '', pieDeFoto: '', credito: '' };

        var useMulti = _multiSelect || _mobileMultiMode ||
                       (event && (event.metaKey || event.ctrlKey));

        if (useMulti) {
            var idx = _selected.findIndex(function (s) { return s.url === url; });
            if (idx >= 0) {
                _selected.splice(idx, 1);
            } else {
                _selected.push(img);
            }
        } else {
            // Single select: replace selection with this image
            _selected = [img];
        }

        // Sync visual state of all visible thumbs
        if (_grid) {
            _grid.querySelectorAll('.mlc-thumb').forEach(function (el) {
                el.classList.toggle('mlc-selected',
                    _selected.some(function (s) { return s.url === el.dataset.url; }));
            });
        }

        _updateConfirmBtn();
    }

    // ── Update modal action buttons based on current selection ─────
    function _updateConfirmBtn() {
        var n = _selected.length;

        // "Seleccionar" button
        var selectBtn = document.getElementById('mlc-select-btn');
        if (selectBtn) {
            selectBtn.disabled = n === 0;
            if (_multiSelect && n > 0) {
                selectBtn.textContent = 'Seleccionar ' + n + ' foto' + (n !== 1 ? 's' : '');
            } else {
                selectBtn.textContent = 'Seleccionar';
            }
        }

        // "Insertar como Galería" button (only in multi-select mode, 2+ items)
        var galleryBtn = document.getElementById('mlc-gallery-btn');
        if (galleryBtn) {
            galleryBtn.style.display = (_multiSelect && n >= 2) ? 'inline-block' : 'none';
        }

        // Mobile multi-select toggle visual state
        var toggleBtn = document.getElementById('mlc-ms-toggle');
        if (toggleBtn) {
            toggleBtn.classList.toggle('mlc-ms-active', _mobileMultiMode);
            toggleBtn.textContent = _mobileMultiMode ? 'Multi ✓' : 'Multi';
        }
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
                    url:         img.url || img,
                    nombre:      nombre,
                    pieDeFoto:   meta.pie_de_foto  || '',
                    credito:     meta.credito_foto  || meta.credito || '',
                    categoria:   meta.categoria     || '',
                    fechaSubida: meta.created_at    || meta.fecha_subida || img.creado || '',
                    tamaño:      img.tamaño         || 0,
                };
            }).filter(function (img) {
                if (!img.url || !img.nombre) return false;
                if (img.url.endsWith('/') || img.nombre.startsWith('.')) return false;
                return /\.(jpe?g|png|gif|webp|svg|bmp|avif)$/i.test(img.nombre);
            });

            _applyFilters();

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
        // Filters: search bar + category pills + date pills
        _buildFilters(parent);

        // Page mode: full drag-and-drop upload zone
        if (_mode === 'page') {
            _buildUploadZone(parent);
        }

        var body = document.createElement('div');
        body.className = 'mlc-body';

        // Modal mode: progress list lives above the grid
        if (_mode === 'modal') {
            _progressWrap = document.createElement('div');
            _progressWrap.className = 'mlc-upload-progress-list';
            _progressWrap.style.display = 'none';
            body.appendChild(_progressWrap);
        }

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
        btnArea.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap';

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
        if (_uploadInput) { _uploadInput.remove(); _uploadInput = null; }
        document.body.style.overflow = '';
        _grid = _countEl = _loadMoreEl = _progressWrap = null;
        _selected = [];
        _mobileMultiMode = false;
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

        // Upload button (modal mode) + hidden file input
        var modalFileInput = document.createElement('input');
        modalFileInput.type = 'file';
        modalFileInput.accept = 'image/jpeg,image/png,image/gif,image/webp';
        modalFileInput.multiple = true;
        modalFileInput.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none';
        modalFileInput.addEventListener('change', function () {
            if (modalFileInput.files.length > 0) {
                _uploadFiles(modalFileInput.files);
                modalFileInput.value = '';
            }
        });
        document.body.appendChild(modalFileInput);
        _uploadInput = modalFileInput;

        var uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'mlc-btn-upload';
        uploadBtn.textContent = 'Subir';
        uploadBtn.addEventListener('click', function () { modalFileInput.click(); });
        btnArea.appendChild(uploadBtn);

        // Cancel button
        var cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'mlc-btn-cancel';
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.addEventListener('click', _close);
        btnArea.appendChild(cancelBtn);

        // Mobile multi-select toggle (multi-select mode only)
        if (_multiSelect) {
            var toggleBtn = document.createElement('button');
            toggleBtn.id = 'mlc-ms-toggle';
            toggleBtn.type = 'button';
            toggleBtn.className = 'mlc-btn-ms-toggle';
            toggleBtn.textContent = 'Multi';
            toggleBtn.title = 'Activar selección múltiple';
            toggleBtn.addEventListener('click', function () {
                _mobileMultiMode = !_mobileMultiMode;
                _updateConfirmBtn();
            });
            btnArea.appendChild(toggleBtn);
        }

        // "Insertar como Galería" button (multi-select, 2+ images, hidden by default)
        if (_multiSelect) {
            var galleryBtn = document.createElement('button');
            galleryBtn.id = 'mlc-gallery-btn';
            galleryBtn.type = 'button';
            galleryBtn.className = 'mlc-btn-gallery';
            galleryBtn.textContent = 'Insertar como Galería';
            galleryBtn.style.display = 'none';
            galleryBtn.addEventListener('click', function () {
                if (_selected.length >= 2 && _onSelect) _onSelect([].concat(_selected));
                _close();
            });
            btnArea.appendChild(galleryBtn);
        }

        // "Seleccionar" button — primary confirm
        var selectBtn = document.createElement('button');
        selectBtn.id = 'mlc-select-btn';
        selectBtn.type = 'button';
        selectBtn.className = 'mlc-btn-confirm';
        selectBtn.textContent = 'Seleccionar';
        selectBtn.disabled = true;
        selectBtn.addEventListener('click', function () {
            if (_selected.length === 0 || !_onSelect) return;
            if (_multiSelect) {
                _onSelect([].concat(_selected));
            } else {
                _onSelect(_selected[0]);
            }
            _close();
        });
        btnArea.appendChild(selectBtn);

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

    // ── Open detail panel for an image ───────────────────────────
    function _openDetail(img) {
        _detailImg = img;
        // Tear down any existing panel instantly
        if (_dpBackdrop) { _dpBackdrop.remove(); _dpBackdrop = null; }
        if (_dpPanel)    { _dpPanel.remove();    _dpPanel    = null; }
        _saveTimers = {};

        // Backdrop
        _dpBackdrop = document.createElement('div');
        _dpBackdrop.className = 'mlc-dp-backdrop';
        _dpBackdrop.addEventListener('click', _closeDetail);
        document.body.appendChild(_dpBackdrop);

        // Panel
        _dpPanel = document.createElement('div');
        _dpPanel.className = 'mlc-dp';
        _buildDetailPanel(_dpPanel, img);
        document.body.appendChild(_dpPanel);

        // Trigger CSS transition (next paint)
        requestAnimationFrame(function () {
            _dpPanel.classList.add('mlc-dp-open');
        });

        // Escape closes the panel
        var _escDp = function (e) {
            if (e.key === 'Escape') {
                _closeDetail();
                document.removeEventListener('keydown', _escDp);
            }
        };
        document.addEventListener('keydown', _escDp);
    }

    // ── Close detail panel ────────────────────────────────────────
    function _closeDetail() {
        if (_dpBackdrop) { _dpBackdrop.remove(); _dpBackdrop = null; }
        if (_dpPanel) {
            var p = _dpPanel;
            _dpPanel = null;
            p.classList.remove('mlc-dp-open');
            setTimeout(function () { if (p.parentNode) p.remove(); }, 280);
        }
        _detailImg  = null;
        _saveTimers = {};
    }

    // ── Build detail panel DOM ────────────────────────────────────
    function _buildDetailPanel(panel, img) {
        // Header
        var hdr = document.createElement('div');
        hdr.className = 'mlc-dp-hdr';
        var title = document.createElement('span');
        title.textContent = 'Detalles';
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'mlc-dp-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', _closeDetail);
        hdr.appendChild(title);
        hdr.appendChild(closeBtn);
        panel.appendChild(hdr);

        // Scrollable body
        var body = document.createElement('div');
        body.className = 'mlc-dp-body';
        panel.appendChild(body);

        // Preview
        var preview = document.createElement('div');
        preview.className = 'mlc-dp-preview';
        var previewImg = document.createElement('img');
        previewImg.src = img.url;
        previewImg.alt = img.nombre;
        previewImg.addEventListener('error', function () {
            previewImg.style.opacity = '0.4';
            previewImg.src = _PLACEHOLDER;
        });
        preview.appendChild(previewImg);
        body.appendChild(preview);

        // Metadata section
        var metaSection = document.createElement('div');
        metaSection.className = 'mlc-dp-meta';
        metaSection.appendChild(_metaRow('Nombre', img.nombre));

        // Dimensions — loaded asynchronously
        var dimsRow = _metaRow('Dimensiones', 'Cargando…');
        metaSection.appendChild(dimsRow);
        var tmpImg = new Image();
        tmpImg.onload = function () {
            dimsRow.querySelector('span:last-child').textContent =
                tmpImg.naturalWidth + ' × ' + tmpImg.naturalHeight + ' px';
        };
        tmpImg.onerror = function () {
            dimsRow.querySelector('span:last-child').textContent = 'N/A';
        };
        tmpImg.src = img.url;

        metaSection.appendChild(_metaRow('Tamaño', img.tamaño ? _formatBytes(img.tamaño) : 'N/A'));

        var dateText = 'N/A';
        if (img.fechaSubida) {
            var d = new Date(img.fechaSubida);
            if (!isNaN(d.getTime())) {
                dateText = d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
            }
        }
        metaSection.appendChild(_metaRow('Subida', dateText));
        body.appendChild(metaSection);

        // Editable fields
        var fieldsSection = document.createElement('div');
        fieldsSection.className = 'mlc-dp-fields';
        fieldsSection.appendChild(_editField(img, 'Pie de foto', 'pie_de_foto', img.pieDeFoto, 'textarea'));
        fieldsSection.appendChild(_editField(img, 'Crédito',     'credito',     img.credito,   'input'));
        fieldsSection.appendChild(_editField(img, 'Categoría',   'categoria',   img.categoria, 'select'));
        body.appendChild(fieldsSection);

        // Actions row
        var actions = document.createElement('div');
        actions.className = 'mlc-dp-actions';

        // Copy URL button
        var copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'mlc-dp-copy-btn';
        copyBtn.textContent = 'Copiar URL';
        copyBtn.addEventListener('click', function () {
            var doFeedback = function () {
                copyBtn.textContent = '¡Copiado!';
                setTimeout(function () { copyBtn.textContent = 'Copiar URL'; }, 2000);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(img.url).then(doFeedback).catch(function () {
                    _fallbackCopy(img.url);
                    doFeedback();
                });
            } else {
                _fallbackCopy(img.url);
                doFeedback();
            }
        });
        actions.appendChild(copyBtn);

        // Delete button + inline confirmation
        var deleteWrap = document.createElement('div');
        deleteWrap.style.cssText = 'width:100%;margin-top:4px';

        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'mlc-dp-delete-btn';
        deleteBtn.textContent = 'Eliminar';

        var confirmBox = document.createElement('div');
        confirmBox.className = 'mlc-dp-confirm';

        var confirmP = document.createElement('p');
        confirmP.textContent = '¿Eliminar esta imagen? Esta acción no se puede deshacer.';

        var confirmBtns = document.createElement('div');
        confirmBtns.className = 'mlc-dp-confirm-btns';

        var noBtn = document.createElement('button');
        noBtn.type = 'button';
        noBtn.className = 'mlc-dp-confirm-no';
        noBtn.textContent = 'Cancelar';
        noBtn.addEventListener('click', function () {
            confirmBox.style.display = 'none';
            deleteBtn.textContent = 'Eliminar';
        });

        var yesBtn = document.createElement('button');
        yesBtn.type = 'button';
        yesBtn.className = 'mlc-dp-confirm-yes';
        yesBtn.textContent = 'Sí, eliminar';
        yesBtn.addEventListener('click', function () {
            yesBtn.disabled = true;
            yesBtn.textContent = 'Eliminando…';
            _deleteImage(img);
        });

        confirmBtns.appendChild(noBtn);
        confirmBtns.appendChild(yesBtn);
        confirmBox.appendChild(confirmP);
        confirmBox.appendChild(confirmBtns);

        deleteBtn.addEventListener('click', function () {
            confirmBox.style.display = 'block';
            deleteBtn.textContent = '¿Eliminar?';
        });

        deleteWrap.appendChild(deleteBtn);
        deleteWrap.appendChild(confirmBox);
        actions.appendChild(deleteWrap);
        body.appendChild(actions);
    }

    // ── Metadata display row helper ───────────────────────────────
    function _metaRow(label, value) {
        var row = document.createElement('div');
        row.className = 'mlc-dp-meta-row';
        var l = document.createElement('span');
        l.textContent = label + ':';
        var v = document.createElement('span');
        v.textContent = value || '—';
        row.appendChild(l);
        row.appendChild(v);
        return row;
    }

    // ── Editable field helper ─────────────────────────────────────
    // type: 'input' | 'textarea' | 'select'
    // 'select' uses _CATEGORY_OPTIONS (single source of truth with filter pills)
    // and saves immediately on change.
    function _editField(img, label, field, initialValue, type) {
        var wrap = document.createElement('div');
        wrap.className = 'mlc-dp-field';
        var lbl = document.createElement('label');
        lbl.textContent = label;
        wrap.appendChild(lbl);

        var el;
        if (type === 'select') {
            el = document.createElement('select');
            var placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Categoría…';
            el.appendChild(placeholder);
            _CATEGORY_OPTIONS.forEach(function (opt) {
                var option = document.createElement('option');
                option.value = opt.key;
                option.textContent = opt.label;
                if (opt.key === (initialValue || '')) option.selected = true;
                el.appendChild(option);
            });
        } else {
            el = document.createElement(type === 'textarea' ? 'textarea' : 'input');
            if (type !== 'textarea') el.type = 'text';
            el.value = initialValue || '';
            el.placeholder = label + '…';
        }

        wrap.appendChild(el);
        var status = document.createElement('span');
        status.className = 'mlc-dp-save-status';
        wrap.appendChild(status);

        if (type === 'select') {
            // Dropdowns save immediately on change (no blur delay needed)
            el.addEventListener('change', function () {
                _saveMetaField(img, field, el.value, status);
            });
        } else {
            el.addEventListener('blur', function () {
                var val = el.value;
                clearTimeout(_saveTimers[field]);
                _saveTimers[field] = setTimeout(function () {
                    _saveMetaField(img, field, val, status);
                }, 300);
            });
        }
        return wrap;
    }

    // ── Format bytes ──────────────────────────────────────────────
    function _formatBytes(bytes) {
        if (!bytes) return '0 B';
        var k = 1024;
        var sizes = ['B', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // ── Clipboard fallback ────────────────────────────────────────
    function _fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* silent */ }
        ta.remove();
    }

    // ── Save a single metadata field to Supabase ──────────────────
    // Uses SELECT-then-UPDATE/INSERT to prevent duplicate rows regardless of
    // whether a unique constraint exists on imagenes_metadata.nombre.
    async function _saveMetaField(img, field, value, statusEl) {
        if (statusEl) statusEl.textContent = 'Guardando…';
        try {
            // Check if a row already exists for this image
            var checkResult = await supabaseClient
                .from('imagenes_metadata')
                .select('nombre')
                .eq('nombre', img.nombre)
                .maybeSingle();

            var payload = {};
            payload[field] = value || null;

            var result;
            if (checkResult.data) {
                // Row exists — UPDATE only the changed field, never INSERT a duplicate
                result = await supabaseClient
                    .from('imagenes_metadata')
                    .update(payload)
                    .eq('nombre', img.nombre);
            } else {
                // Row does not exist — INSERT new row
                payload.nombre = img.nombre;
                result = await supabaseClient
                    .from('imagenes_metadata')
                    .insert(payload);
            }

            if (result.error) throw result.error;

            // Keep local copy in sync
            if (field === 'pie_de_foto') img.pieDeFoto = value;
            else if (field === 'credito') img.credito   = value;
            else if (field === 'categoria') img.categoria = value;

            if (statusEl) {
                statusEl.textContent = 'Guardado ✓';
                setTimeout(function () { statusEl.textContent = ''; }, 2000);
            }
        } catch (err) {
            console.error('[MediaLibraryCore] save error:', err);
            if (statusEl) statusEl.textContent = 'Error al guardar';
        }
    }

    // ── Delete image from storage + metadata, update grid ─────────
    async function _deleteImage(img) {
        try {
            await Promise.all([
                SupabaseStorage.eliminarImagen(img.nombre),
                supabaseClient.from('imagenes_metadata').delete().eq('nombre', img.nombre),
            ]);
            // Remove from local arrays then refresh grid
            _allImages      = _allImages.filter(function (i) { return i.nombre !== img.nombre; });
            _filteredImages = _filteredImages.filter(function (i) { return i.nombre !== img.nombre; });
            _closeDetail();
            _applyFilters();
        } catch (err) {
            console.error('[MediaLibraryCore] delete error:', err);
        }
    }

    // ── Build drag-and-drop upload zone (page mode) ───────────────
    function _buildUploadZone(parent) {
        var zone = document.createElement('div');
        zone.className = 'mlc-upload-zone';

        var inner = document.createElement('div');
        inner.className = 'mlc-upload-zone-inner';
        inner.innerHTML =
            '<div class="mlc-upload-icon">&#8679;</div>' +
            '<p class="mlc-upload-label">Arrastra imágenes aquí</p>' +
            '<p class="mlc-upload-or">o</p>';

        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/jpeg,image/png,image/gif,image/webp';
        fileInput.multiple = true;
        fileInput.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none';
        fileInput.addEventListener('change', function () {
            if (fileInput.files.length > 0) {
                _uploadFiles(fileInput.files);
                fileInput.value = '';
            }
        });

        var uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'mlc-btn-upload';
        uploadBtn.textContent = 'Subir imágenes';
        uploadBtn.addEventListener('click', function () { fileInput.click(); });

        inner.appendChild(uploadBtn);
        inner.appendChild(fileInput);

        // Progress list (lives inside the zone for page mode)
        _progressWrap = document.createElement('div');
        _progressWrap.className = 'mlc-upload-progress-list';
        _progressWrap.style.display = 'none';

        zone.appendChild(inner);
        zone.appendChild(_progressWrap);

        // Drag-and-drop events
        zone.addEventListener('dragover', function (e) {
            e.preventDefault();
            zone.classList.add('mlc-dz-hover');
        });
        zone.addEventListener('dragleave', function (e) {
            if (!zone.contains(e.relatedTarget)) {
                zone.classList.remove('mlc-dz-hover');
            }
        });
        zone.addEventListener('drop', function (e) {
            e.preventDefault();
            zone.classList.remove('mlc-dz-hover');
            if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                _uploadFiles(e.dataTransfer.files);
            }
        });

        parent.appendChild(zone);
    }

    // ── Validate and upload multiple files with progress ──────────
    async function _uploadFiles(files) {
        var ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        var MAX_SIZE = 5 * 1024 * 1024; // 5 MB

        if (!_progressWrap) return;
        _progressWrap.style.display = 'block';
        _progressWrap.innerHTML = '';

        var queue = [];

        for (var i = 0; i < files.length; i++) {
            var file = files[i];

            var item = document.createElement('div');
            item.className = 'mlc-upload-item';

            var nameEl = document.createElement('span');
            nameEl.className = 'mlc-upload-item-name';
            nameEl.textContent = file.name;

            var barTrack = document.createElement('div');
            barTrack.className = 'mlc-upload-progress-bar';
            var fillEl = document.createElement('div');
            fillEl.className = 'mlc-upload-progress-fill';
            barTrack.appendChild(fillEl);

            var statusEl = document.createElement('span');
            statusEl.className = 'mlc-upload-item-status';

            item.appendChild(nameEl);
            item.appendChild(barTrack);
            item.appendChild(statusEl);
            _progressWrap.appendChild(item);

            if (ACCEPTED_TYPES.indexOf(file.type) < 0) {
                fillEl.classList.add('mlc-up-error');
                fillEl.style.width = '100%';
                statusEl.textContent = 'Tipo no permitido (JPG, PNG, GIF, WebP)';
                statusEl.className = 'mlc-upload-item-status mlc-upload-error';
                continue;
            }

            if (file.size > MAX_SIZE) {
                fillEl.classList.add('mlc-up-error');
                fillEl.style.width = '100%';
                statusEl.textContent = 'Tamaño máximo 5 MB';
                statusEl.className = 'mlc-upload-item-status mlc-upload-error';
                continue;
            }

            queue.push({ file: file, fillEl: fillEl, statusEl: statusEl });
        }

        for (var j = 0; j < queue.length; j++) {
            var q = queue[j];
            await _uploadSingleFile(q.file, q.fillEl, q.statusEl);
        }

        // Auto-hide after 4 s (errors stay visible 4 s then also hide)
        setTimeout(function () {
            if (_progressWrap) {
                _progressWrap.style.display = 'none';
                _progressWrap.innerHTML = '';
            }
        }, 4000);
    }

    // ── Upload one file, animate progress bar ─────────────────────
    async function _uploadSingleFile(file, fillEl, statusEl) {
        fillEl.style.width = '10%';

        // Animate progress while waiting for upload
        var pct = 10;
        var timer = setInterval(function () {
            pct = Math.min(pct + 8, 85);
            fillEl.style.width = pct + '%';
        }, 150);

        try {
            var result = await SupabaseStorage.subirImagen(file);
            clearInterval(timer);

            if (!result || !result.success) {
                fillEl.classList.add('mlc-up-error');
                fillEl.style.width = '100%';
                statusEl.textContent = 'Error: ' + ((result && result.error) || 'Error al subir');
                statusEl.className = 'mlc-upload-item-status mlc-upload-error';
                return;
            }

            fillEl.style.width = '100%';
            statusEl.textContent = '¡Subida!';
            statusEl.className = 'mlc-upload-item-status mlc-upload-success';

            _addImageToTop({
                url:         result.data.url,
                nombre:      result.data.nombre,
                pieDeFoto:   '',
                credito:     '',
                categoria:   '',
                fechaSubida: new Date().toISOString(),
                tamaño:      result.data.tamaño || file.size,
            });

        } catch (err) {
            clearInterval(timer);
            fillEl.classList.add('mlc-up-error');
            fillEl.style.width = '100%';
            statusEl.textContent = 'Error de conexión';
            statusEl.className = 'mlc-upload-item-status mlc-upload-error';
            console.error('[MediaLibraryCore] upload error:', err);
        }
    }

    // ── Prepend new image to top of grid ─────────────────────────
    function _addImageToTop(imgObj) {
        _allImages.unshift(imgObj);
        // Only prepend to _filteredImages if it passes current filters
        // Simplest: re-run filters (new images always appear under 'Todas' / 'Todo')
        _applyFilters();
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

            // Reset filter state on each open/init
            _searchQuery      = '';
            _activeCategory   = 'todas';
            _activeDateFilter = 'Todo';
            clearTimeout(_searchTimer);

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
