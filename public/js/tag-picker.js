// TagPicker — reusable modal for selecting/creating tags
// Used by bulk article actions (Agregar tag, Quitar tag).
// The inline pill-based tag picker in the article editor is a different
// UX pattern and remains in admin.js (_initTagInput).

const TagPicker = (function() {
    var _overlay = null;

    function _escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function _makeSlug(str) {
        return str.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    // options:
    //   allTags     — array of {id, nombre}
    //   filter      — optional array of tag IDs to restrict the list to
    //   allowCreate — boolean (show "Crear nuevo" option)
    //   onConfirm   — function(selectedTags: [{id, nombre}])
    //   title       — string (modal title)
    function open(options) {
        close(); // avoid duplicates

        var allTags = options.allTags || [];
        var filter = options.filter || null;
        var allowCreate = options.allowCreate !== false;
        var onConfirm = options.onConfirm || function() {};
        var title = options.title || 'Seleccionar tags';

        var displayTags = filter
            ? allTags.filter(function(t) { return filter.indexOf(t.id) !== -1; })
            : allTags;

        // selected is a Map of id → tag object so multi-select persists across search re-renders
        var selectedMap = {};

        // Inject styles once
        if (!document.getElementById('bj-tp-styles')) {
            var style = document.createElement('style');
            style.id = 'bj-tp-styles';
            style.textContent = [
                '#bj-tp-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:flex-end;justify-content:center;}',
                '#bj-tp-panel{background:#fff;color:#111;width:100%;max-width:520px;border-radius:16px 16px 0 0;display:flex;flex-direction:column;max-height:90vh;color-scheme:light;}',
                '#bj-tp-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px 12px;font-weight:600;font-size:1rem;border-bottom:1px solid #e5e7eb;}',
                '#bj-tp-close{background:none;border:none;font-size:18px;cursor:pointer;color:#666;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;}',
                '#bj-tp-search-wrap{padding:12px 16px;border-bottom:1px solid #e5e7eb;}',
                '#bj-tp-search{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:0.95rem;font-family:inherit;box-sizing:border-box;outline:none;}',
                '#bj-tp-search:focus{border-color:#1B2A4A;}',
                '#bj-tp-list{overflow-y:auto;flex:1;padding:6px 0;}',
                '.bj-tp-row{display:flex;align-items:center;gap:12px;padding:11px 20px;cursor:pointer;font-size:0.95rem;color:#111;user-select:none;-webkit-user-select:none;}',
                '.bj-tp-row:hover{background:#f3f4f6;}',
                '.bj-tp-row input[type=checkbox]{width:18px;height:18px;min-width:18px;accent-color:#1B2A4A;cursor:pointer;pointer-events:none;}',
                '.bj-tp-create{color:#C8102E;font-weight:600;}',
                '#bj-tp-empty{padding:24px 20px;color:#6b7280;font-size:0.9rem;text-align:center;}',
                '#bj-tp-footer{display:flex;gap:10px;padding:12px 16px;border-top:1px solid #e5e7eb;}',
                '#bj-tp-cancel{flex:1;padding:12px;border:1px solid #d1d5db;background:#fff;border-radius:8px;font-size:0.95rem;cursor:pointer;font-family:inherit;}',
                '#bj-tp-confirm{flex:2;padding:12px;background:#1B2A4A;color:#fff;border:none;border-radius:8px;font-size:0.95rem;font-weight:600;cursor:pointer;font-family:inherit;}',
                '#bj-tp-confirm:disabled{opacity:0.5;cursor:not-allowed;}',
                '@media(min-width:600px){#bj-tp-overlay{align-items:center;}#bj-tp-panel{border-radius:16px;max-height:80vh;}}'
            ].join('');
            document.head.appendChild(style);
        }

        _overlay = document.createElement('div');
        _overlay.id = 'bj-tp-overlay';
        _overlay.innerHTML =
            '<div id="bj-tp-panel">' +
                '<div id="bj-tp-header">' +
                    '<span>' + _escapeHtml(title) + '</span>' +
                    '<button id="bj-tp-close" aria-label="Cerrar">✕</button>' +
                '</div>' +
                '<div id="bj-tp-search-wrap">' +
                    '<input id="bj-tp-search" type="search" placeholder="Buscar tag..." autocomplete="off">' +
                '</div>' +
                '<div id="bj-tp-list"></div>' +
                '<div id="bj-tp-footer">' +
                    '<button id="bj-tp-cancel">Cancelar</button>' +
                    '<button id="bj-tp-confirm" disabled>Confirmar</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(_overlay);

        var listEl = document.getElementById('bj-tp-list');
        var searchEl = document.getElementById('bj-tp-search');
        var confirmBtn = document.getElementById('bj-tp-confirm');

        function selectedCount() {
            return Object.keys(selectedMap).length;
        }

        function isSelected(id) {
            return Object.prototype.hasOwnProperty.call(selectedMap, id);
        }

        function updateConfirmBtn() {
            var n = selectedCount();
            confirmBtn.disabled = n === 0;
            confirmBtn.textContent = n > 0 ? 'Confirmar (' + n + ')' : 'Confirmar';
        }

        // Renders (or re-renders for search) without touching selection state.
        // Each row has pointer-events:none on the checkbox so clicks land on the row
        // div, which is handled by the single delegated listener on listEl.
        function renderList(q) {
            q = (q || '').toLowerCase().trim();
            var filtered = displayTags.filter(function(t) {
                return !q || t.nombre.toLowerCase().indexOf(q) !== -1;
            });

            if (filtered.length === 0 && !q) {
                listEl.innerHTML = '<div id="bj-tp-empty">No hay tags disponibles.</div>';
                return;
            }

            var html = filtered.map(function(tag) {
                var chk = isSelected(tag.id) ? ' checked' : '';
                return '<div class="bj-tp-row" data-id="' + tag.id + '">' +
                    '<input type="checkbox"' + chk + ' tabindex="-1"> ' +
                    _escapeHtml(tag.nombre) +
                '</div>';
            }).join('');

            if (allowCreate && q) {
                var exactMatch = displayTags.some(function(t) {
                    return t.nombre.toLowerCase() === q || _makeSlug(t.nombre) === _makeSlug(q);
                });
                if (!exactMatch) {
                    html += '<div class="bj-tp-row bj-tp-create" data-create="' + _escapeHtml(q) + '">' +
                        'Crear tag: <strong>' + _escapeHtml(q) + '</strong>' +
                        '</div>';
                }
            }

            if (!html) {
                html = '<div id="bj-tp-empty">Sin resultados para «' + _escapeHtml(q) + '».</div>';
            }

            listEl.innerHTML = html;
        }

        // Single delegated click handler on the stable listEl container.
        // Fires for every click inside the list regardless of DOM re-renders.
        listEl.addEventListener('click', async function(e) {
            var row = e.target.closest('.bj-tp-row');
            if (!row) return;

            // "Crear nuevo" row
            var createName = row.dataset.create;
            if (createName !== undefined) {
                row.textContent = 'Creando...';
                try {
                    var newTag = await SupabaseAPI.createTag(createName, _makeSlug(createName));
                    if (newTag) {
                        allTags.push(newTag);
                        displayTags.push(newTag);
                        selectedMap[newTag.id] = newTag;
                        searchEl.value = '';
                        renderList('');
                        updateConfirmBtn();
                    }
                } catch (err) {
                    console.error('[TagPicker] createTag failed:', err);
                }
                return;
            }

            // Regular tag row — toggle selection in-place (no full re-render)
            var id = parseInt(row.dataset.id, 10);
            var tag = displayTags.find(function(t) { return t.id === id; });
            if (!tag) return;

            var cb = row.querySelector('input[type=checkbox]');
            if (isSelected(id)) {
                delete selectedMap[id];
                if (cb) cb.checked = false;
            } else {
                selectedMap[id] = tag;
                if (cb) cb.checked = true;
            }
            updateConfirmBtn();
        });

        renderList('');

        searchEl.addEventListener('input', function() {
            renderList(this.value);
        });

        document.getElementById('bj-tp-close').addEventListener('click', close);
        document.getElementById('bj-tp-cancel').addEventListener('click', close);

        _overlay.addEventListener('click', function(e) {
            if (e.target === _overlay) close();
        });

        confirmBtn.addEventListener('click', function() {
            var result = Object.values(selectedMap);
            close();
            onConfirm(result);
        });

        setTimeout(function() { searchEl.focus(); }, 50);
    }

    function close() {
        if (_overlay) {
            _overlay.remove();
            _overlay = null;
        }
    }

    return { open: open, close: close };
})();

if (typeof window !== 'undefined') window.TagPicker = TagPicker;
