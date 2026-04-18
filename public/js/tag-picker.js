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
        var filter = options.filter || null; // array of ids or null
        var allowCreate = options.allowCreate !== false;
        var onConfirm = options.onConfirm || function() {};
        var title = options.title || 'Seleccionar tags';

        var displayTags = filter
            ? allTags.filter(function(t) { return filter.indexOf(t.id) !== -1; })
            : allTags;

        var selected = []; // [{id, nombre}]

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
                '.bj-tp-item{display:flex;align-items:center;gap:12px;padding:11px 20px;cursor:pointer;font-size:0.95rem;color:#111;}',
                '.bj-tp-item:hover{background:#f3f4f6;}',
                '.bj-tp-item input[type=checkbox]{width:18px;height:18px;accent-color:#1B2A4A;cursor:pointer;flex-shrink:0;}',
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

        function isSelected(id) {
            return selected.some(function(t) { return t.id === id; });
        }

        function toggleTag(tag) {
            if (isSelected(tag.id)) {
                selected = selected.filter(function(t) { return t.id !== tag.id; });
            } else {
                selected.push(tag);
            }
            updateConfirmBtn();
        }

        function updateConfirmBtn() {
            confirmBtn.disabled = selected.length === 0;
            confirmBtn.textContent = selected.length > 0
                ? 'Confirmar (' + selected.length + ')'
                : 'Confirmar';
        }

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
                return '<label class="bj-tp-item">' +
                    '<input type="checkbox" data-id="' + tag.id + '"' + chk + '> ' +
                    _escapeHtml(tag.nombre) +
                '</label>';
            }).join('');

            // "Crear nuevo" option
            if (allowCreate && q) {
                var exactMatch = displayTags.some(function(t) {
                    return t.nombre.toLowerCase() === q || _makeSlug(t.nombre) === _makeSlug(q);
                });
                if (!exactMatch) {
                    html += '<div class="bj-tp-item bj-tp-create" id="bj-tp-create-item" data-name="' + _escapeHtml(q) + '">' +
                        'Crear tag: <strong>' + _escapeHtml(q) + '</strong>' +
                        '</div>';
                }
            }

            if (!html) {
                html = '<div id="bj-tp-empty">Sin resultados para «' + _escapeHtml(q) + '».</div>';
            }

            listEl.innerHTML = html;

            // Wire checkbox changes
            listEl.querySelectorAll('.bj-tp-item input[type=checkbox]').forEach(function(cb) {
                cb.addEventListener('change', function() {
                    var id = parseInt(this.dataset.id, 10);
                    var tag = displayTags.find(function(t) { return t.id === id; });
                    if (tag) toggleTag(tag);
                    // Re-render to keep check state consistent
                    renderList(searchEl.value);
                });
            });

            // Wire "Crear nuevo"
            var createItem = document.getElementById('bj-tp-create-item');
            if (createItem) {
                createItem.addEventListener('click', async function() {
                    var name = this.dataset.name.trim();
                    if (!name) return;
                    this.textContent = 'Creando...';
                    try {
                        var newTag = await SupabaseAPI.createTag(name, _makeSlug(name));
                        if (newTag) {
                            allTags.push(newTag);
                            displayTags.push(newTag);
                            selected.push(newTag);
                            searchEl.value = '';
                            renderList('');
                            updateConfirmBtn();
                        }
                    } catch (e) {
                        console.error('[TagPicker] createTag failed:', e);
                    }
                });
            }
        }

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
            var result = selected.slice();
            close();
            onConfirm(result);
        });

        // Focus search on open
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
