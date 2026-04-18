// TagPicker — single source of truth for the bulk tag modal.
// Classic IIFE (matches window.TiptapEditor / window.supabaseClient patterns),
// loaded via <script is:inline src="/js/tag-picker.js"> in admin/index.astro.
//
// Root cause for ADMIN35-02-FIX: the bulk path was already architecturally
// correct (admin.js calls window.TagPicker.open directly, never renders the
// modal HTML itself). The real defect was inside tag-picker.js: every
// checkbox 'change' handler replaced listEl.innerHTML, destroying the input
// that had just fired the event and clobbering the native checked toggle.
// The editor's tag UI (_initTagInput) is an inline pill+typeahead and does
// NOT share this modal, so it was never affected. Fix: render once, mutate
// the internal selection Set in place, and only re-render on search input.

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
    //   title            string    — modal title
    //   articleCount?    number    — appended to title when provided
    //   allTags          array     — [{id, nombre}], the full catalogue
    //   availableTagIds? Set<id>   — restricts displayed tags (quitar mode)
    //   preselectedIds?  Set<id>   — pre-checked on open
    //   allowCreate      boolean   — show "Crear nuevo" row
    //   onConfirm        function(Set<id>, Array<{id,nombre}>)
    //   onCancel?        function
    function open(options) {
        close(); // avoid duplicates

        var allTags = (options.allTags || []).slice();
        var availableIds = options.availableTagIds || null;
        var allowCreate = options.allowCreate !== false;
        var onConfirm = options.onConfirm || function() {};
        var onCancel = options.onCancel || function() {};
        var title = options.title || 'Seleccionar tags';
        if (typeof options.articleCount === 'number') {
            title += ' (' + options.articleCount + ')';
        }

        var selected = new Set();
        if (options.preselectedIds) {
            options.preselectedIds.forEach(function(id) { selected.add(id); });
        }

        function displayTags() {
            if (!availableIds) return allTags;
            return allTags.filter(function(t) { return availableIds.has(t.id); });
        }

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
                '.bj-tp-item{display:flex;align-items:center;gap:12px;padding:11px 20px;cursor:pointer;font-size:0.95rem;color:#111;min-height:44px;box-sizing:border-box;}',
                '.bj-tp-item:hover{background:#f3f4f6;}',
                '.bj-tp-item input[type=checkbox]{width:18px;height:18px;accent-color:#1B2A4A;cursor:pointer;flex-shrink:0;pointer-events:none;}',
                '.bj-tp-create{color:#C8102E;font-weight:600;}',
                '#bj-tp-empty{padding:24px 20px;color:#6b7280;font-size:0.9rem;text-align:center;}',
                '#bj-tp-footer{display:flex;gap:10px;padding:12px 16px;border-top:1px solid #e5e7eb;}',
                '#bj-tp-cancel{flex:1;padding:12px;border:1px solid #d1d5db;background:#fff;border-radius:8px;font-size:0.95rem;cursor:pointer;font-family:inherit;min-height:44px;}',
                '#bj-tp-confirm{flex:2;padding:12px;background:#1B2A4A;color:#fff;border:none;border-radius:8px;font-size:0.95rem;font-weight:600;cursor:pointer;font-family:inherit;min-height:44px;}',
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
                    '<button id="bj-tp-close" type="button" aria-label="Cerrar">✕</button>' +
                '</div>' +
                '<div id="bj-tp-search-wrap">' +
                    '<input id="bj-tp-search" type="search" placeholder="Buscar tag..." autocomplete="off">' +
                '</div>' +
                '<div id="bj-tp-list"></div>' +
                '<div id="bj-tp-footer">' +
                    '<button id="bj-tp-cancel" type="button">Cancelar</button>' +
                    '<button id="bj-tp-confirm" type="button" disabled>Confirmar</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(_overlay);

        var panelEl = _overlay.querySelector('#bj-tp-panel');
        var listEl = _overlay.querySelector('#bj-tp-list');
        var searchEl = _overlay.querySelector('#bj-tp-search');
        var confirmBtn = _overlay.querySelector('#bj-tp-confirm');
        var cancelBtn = _overlay.querySelector('#bj-tp-cancel');
        var closeBtn = _overlay.querySelector('#bj-tp-close');

        function updateConfirmBtn() {
            confirmBtn.disabled = selected.size === 0;
            confirmBtn.textContent = selected.size > 0
                ? 'Confirmar (' + selected.size + ')'
                : 'Confirmar';
        }

        // Render list items from the current query. Selection state lives in
        // the `selected` Set, so re-rendering on search keeps checks intact.
        function renderList(q) {
            q = (q || '').toLowerCase().trim();
            var tags = displayTags();
            var filtered = tags.filter(function(t) {
                return !q || t.nombre.toLowerCase().indexOf(q) !== -1;
            });

            var parts = filtered.map(function(tag) {
                var chk = selected.has(tag.id) ? ' checked' : '';
                return '<label class="bj-tp-item" data-id="' + tag.id + '">' +
                    '<input type="checkbox" data-id="' + tag.id + '"' + chk + '>' +
                    '<span>' + _escapeHtml(tag.nombre) + '</span>' +
                '</label>';
            });

            if (allowCreate && q) {
                var exactMatch = tags.some(function(t) {
                    return t.nombre.toLowerCase() === q || _makeSlug(t.nombre) === _makeSlug(q);
                });
                if (!exactMatch) {
                    parts.push(
                        '<div class="bj-tp-item bj-tp-create" id="bj-tp-create-item" data-name="' + _escapeHtml(q) + '">' +
                            'Crear tag: <strong>' + _escapeHtml(q) + '</strong>' +
                        '</div>'
                    );
                }
            }

            if (parts.length === 0) {
                listEl.innerHTML = q
                    ? '<div id="bj-tp-empty">Sin resultados para «' + _escapeHtml(q) + '».</div>'
                    : '<div id="bj-tp-empty">No hay tags disponibles.</div>';
                return;
            }

            listEl.innerHTML = parts.join('');
        }

        renderList('');
        updateConfirmBtn();

        // Single delegated handler on the list. A human click on a label row
        // produces TWO events: one on the label (or inner span) and one
        // synthetic click dispatched to the nested input by the browser. The
        // browser natively toggles the checkbox before either event fires.
        // We act ONLY on the input's event (e.target === cb) so the selection
        // Set is updated exactly once with the already-correct checked state.
        // Never mutate cb.checked here — the native toggle already ran.
        listEl.addEventListener('click', async function(e) {
            var createItem = e.target.closest('#bj-tp-create-item');
            if (createItem) {
                var name = createItem.dataset.name.trim();
                if (!name) return;
                createItem.textContent = 'Creando...';
                try {
                    var newTag = await SupabaseAPI.createTag(name, _makeSlug(name));
                    if (newTag) {
                        allTags.push(newTag);
                        if (availableIds) availableIds.add(newTag.id);
                        selected.add(newTag.id);
                        searchEl.value = '';
                        renderList('');
                        updateConfirmBtn();
                    } else {
                        createItem.textContent = 'Error al crear';
                    }
                } catch (err) {
                    console.error('[TagPicker] createTag failed:', err);
                    createItem.textContent = 'Error al crear';
                }
                return;
            }

            var label = e.target.closest('.bj-tp-item');
            if (!label || !label.dataset.id) return;
            var cb = label.querySelector('input[type=checkbox]');
            if (!cb) return;

            // Skip the label/span click; wait for the synthetic input click
            // which carries the already-toggled checked state.
            if (e.target !== cb) return;

            var id = cb.dataset.id;
            if (cb.checked) selected.add(id);
            else selected.delete(id);
            updateConfirmBtn();
        });

        searchEl.addEventListener('input', function() {
            renderList(this.value);
        });

        closeBtn.addEventListener('click', function() { close(); onCancel(); });
        cancelBtn.addEventListener('click', function() { close(); onCancel(); });

        _overlay.addEventListener('click', function(e) {
            if (e.target === _overlay) { close(); onCancel(); }
        });

        confirmBtn.addEventListener('click', function() {
            if (selected.size === 0) return;
            var validIds = new Set(Array.from(selected).filter(function(id) {
                return typeof id === 'string' && id.length === 36;
            }));
            if (validIds.size === 0) return;
            var tagObjs = allTags.filter(function(t) { return validIds.has(t.id); });
            close();
            onConfirm(validIds, tagObjs);
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
