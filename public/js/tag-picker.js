// PickerModal — shared bottom-sheet picker for tags and categorías.
// Supports mode: 'multi' (checkboxes, any number) or 'single' (radio, exactly one).
// Backward-compatible alias `window.TagPicker` preserved — defaults to multi mode.
//
// Styles are driven by admin theme tokens (var(--admin-*)), so the modal picks
// up [data-theme="dark"] automatically. No `color-scheme:light` lock.

const PickerModal = (function() {
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

    // Forma plegada para comparar (EDITOR-20 F3): NFC → minúsculas → sin
    // diacríticos. La búsqueda es insensible a acentos y mayúsculas.
    function _fold(str) {
        return String(str || '')
            .normalize('NFC')
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    // options:
    //   mode?            'multi' | 'single'   (default 'multi')
    //   title            string
    //   articleCount?    number                appended to title
    //   items | allTags  Array<{id,nombre}>    catalogue
    //   availableTagIds? Set<id>               restricts displayed items
    //   preselectedIds?  Set<id> | id          pre-checked on open
    //   allowCreate      boolean               "Crear nuevo" row (multi only)
    //   confirmLabel?    string                default "Confirmar"
    //   onConfirm        function(Set<id>, Array<{id,nombre}>)
    //   onCancel?        function
    function open(options) {
        close();

        var mode = options.mode === 'single' ? 'single' : 'multi';
        var items = (options.items || options.allTags || []).slice();
        var availableIds = options.availableTagIds || null;
        var allowCreate = mode === 'multi' && options.allowCreate !== false;
        var onConfirm = options.onConfirm || function() {};
        var onCancel = options.onCancel || function() {};
        var confirmBase = options.confirmLabel || 'Confirmar';
        var title = options.title || 'Seleccionar';
        if (typeof options.articleCount === 'number') {
            title += ' (' + options.articleCount + ')';
        }

        var selected = new Set();
        if (options.preselectedIds) {
            if (options.preselectedIds instanceof Set) {
                options.preselectedIds.forEach(function(id) { selected.add(id); });
            } else {
                selected.add(options.preselectedIds);
            }
        }

        function displayItems() {
            if (!availableIds) return items;
            return items.filter(function(t) { return availableIds.has(t.id); });
        }

        if (!document.getElementById('bj-tp-styles')) {
            var style = document.createElement('style');
            style.id = 'bj-tp-styles';
            style.textContent = [
                '#bj-tp-overlay{position:fixed;inset:0;background:var(--admin-modal-overlay,rgba(0,0,0,0.6));z-index:10001;display:flex;align-items:flex-end;justify-content:center;}',
                '#bj-tp-panel{background:var(--admin-surface);color:var(--admin-text);width:100%;max-width:520px;border-radius:16px 16px 0 0;display:flex;flex-direction:column;max-height:90vh;box-shadow:var(--admin-shadow-lg,0 8px 32px rgba(0,0,0,0.2));}',
                '#bj-tp-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px 12px;font-weight:600;font-size:1rem;border-bottom:1px solid var(--admin-border);color:var(--admin-text);}',
                '#bj-tp-close{background:none;border:none;font-size:18px;cursor:pointer;color:var(--admin-text-muted);min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;}',
                '#bj-tp-search-wrap{padding:12px 16px;border-bottom:1px solid var(--admin-border);}',
                '#bj-tp-search{width:100%;padding:10px 12px;border:1px solid var(--admin-input-border);border-radius:8px;font-size:0.95rem;font-family:inherit;box-sizing:border-box;outline:none;background:var(--admin-input-bg);color:var(--admin-input-text);}',
                '#bj-tp-search::placeholder{color:var(--admin-input-placeholder);}',
                '#bj-tp-search:focus{border-color:var(--admin-badge-accent,#1B2A4A);}',
                '#bj-tp-list{overflow-y:auto;flex:1;padding:6px 0;}',
                '.bj-tp-item{display:flex;align-items:center;gap:12px;padding:11px 20px;cursor:pointer;font-size:0.95rem;color:var(--admin-text);min-height:44px;box-sizing:border-box;}',
                '.bj-tp-item:hover{background:var(--admin-surface-2);}',
                '.bj-tp-item[aria-selected="true"]{background:var(--admin-surface-3);}',
                '.bj-tp-item input[type=checkbox],.bj-tp-item input[type=radio]{width:18px;height:18px;accent-color:var(--admin-badge-accent,#1B2A4A);cursor:pointer;flex-shrink:0;pointer-events:none;}',
                '.bj-tp-create{color:var(--admin-accent,#C8102E);font-weight:600;}',
                '#bj-tp-empty{padding:24px 20px;color:var(--admin-text-muted);font-size:0.9rem;text-align:center;}',
                '#bj-tp-footer{display:flex;gap:10px;padding:12px 16px;border-top:1px solid var(--admin-border);}',
                '#bj-tp-cancel{flex:1;padding:12px;border:1px solid var(--admin-border);background:var(--admin-surface-3);color:var(--admin-text);border-radius:8px;font-size:0.95rem;cursor:pointer;font-family:inherit;min-height:44px;}',
                '#bj-tp-confirm{flex:2;padding:12px;background:var(--admin-badge-accent,#1B2A4A);color:var(--admin-badge-accent-text,#fff);border:none;border-radius:8px;font-size:0.95rem;font-weight:600;cursor:pointer;font-family:inherit;min-height:44px;}',
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
                    '<input id="bj-tp-search" type="search" placeholder="Buscar..." autocomplete="off">' +
                '</div>' +
                '<div id="bj-tp-list"></div>' +
                '<div id="bj-tp-footer">' +
                    '<button id="bj-tp-cancel" type="button">Cancelar</button>' +
                    '<button id="bj-tp-confirm" type="button" disabled>' + _escapeHtml(confirmBase) + '</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(_overlay);

        var listEl = _overlay.querySelector('#bj-tp-list');
        var searchEl = _overlay.querySelector('#bj-tp-search');
        var confirmBtn = _overlay.querySelector('#bj-tp-confirm');
        var cancelBtn = _overlay.querySelector('#bj-tp-cancel');
        var closeBtn = _overlay.querySelector('#bj-tp-close');

        function updateConfirmBtn() {
            if (mode === 'single') {
                confirmBtn.disabled = selected.size !== 1;
                confirmBtn.textContent = confirmBase;
            } else {
                confirmBtn.disabled = selected.size === 0;
                confirmBtn.textContent = selected.size > 0
                    ? confirmBase + ' (' + selected.size + ')'
                    : confirmBase;
            }
        }

        function renderList(q) {
            var raw = (q || '').normalize('NFC').trim();
            q = _fold(raw);
            var list = displayItems();
            var filtered = list.filter(function(t) {
                return !q || _fold(t.nombre).indexOf(q) !== -1;
            });

            var inputType = mode === 'single' ? 'radio' : 'checkbox';
            var parts = filtered.map(function(it) {
                var on = selected.has(it.id);
                var chk = on ? ' checked' : '';
                var ariaSel = on ? ' aria-selected="true"' : '';
                return '<label class="bj-tp-item" data-id="' + it.id + '"' + ariaSel + '>' +
                    '<input type="' + inputType + '" name="bj-tp-choice" data-id="' + it.id + '"' + chk + '>' +
                    '<span>' + _escapeHtml(it.nombre) + '</span>' +
                '</label>';
            });

            if (allowCreate && raw) {
                // "Crear" solo se omite ante match exacto plegado — que ya es
                // visible como opción arriba. Nunca supresión silenciosa.
                var exactMatch = list.some(function(t) {
                    return _fold(t.nombre) === q;
                });
                if (!exactMatch) {
                    parts.push(
                        '<div class="bj-tp-item bj-tp-create" id="bj-tp-create-item" data-name="' + _escapeHtml(raw) + '">' +
                            'Crear tag: <strong>' + _escapeHtml(raw) + '</strong>' +
                        '</div>'
                    );
                }
            }

            if (parts.length === 0) {
                listEl.innerHTML = q
                    ? '<div id="bj-tp-empty">Sin resultados para «' + _escapeHtml(q) + '».</div>'
                    : '<div id="bj-tp-empty">No hay opciones disponibles.</div>';
                return;
            }

            listEl.innerHTML = parts.join('');
        }

        renderList('');
        updateConfirmBtn();

        listEl.addEventListener('click', async function(e) {
            var createItem = e.target.closest('#bj-tp-create-item');
            if (createItem) {
                var name = createItem.dataset.name.trim();
                if (!name) return;
                createItem.textContent = 'Creando...';
                try {
                    var res = await SupabaseAPI.createTag(name, _makeSlug(name));
                    if (res && res.data) {
                        items.push(res.data);
                        if (availableIds) availableIds.add(res.data.id);
                        selected.add(res.data.id);
                        searchEl.value = '';
                        renderList('');
                        updateConfirmBtn();
                    } else {
                        var msg = (res && res.error) || 'error desconocido';
                        createItem.textContent = '⚠ ' + msg;
                        if (typeof showToast === 'function') {
                            showToast('No se pudo crear el tag «' + name + '»: ' + msg, 'error', 5000);
                        }
                    }
                } catch (err) {
                    console.error('[PickerModal] createTag failed:', err);
                    createItem.textContent = '⚠ Error al crear';
                    if (typeof showToast === 'function') {
                        showToast('No se pudo crear el tag: ' + (err.message || err), 'error', 5000);
                    }
                }
                return;
            }

            var label = e.target.closest('.bj-tp-item');
            if (!label || !label.dataset.id) return;
            var input = label.querySelector('input[type=checkbox],input[type=radio]');
            if (!input) return;

            // For multi (checkbox): trust the native toggle on the input click only.
            // For single (radio): label click counts; manage selection manually.
            if (mode === 'multi') {
                if (e.target !== input) return;
                var id = input.dataset.id;
                if (input.checked) selected.add(id);
                else selected.delete(id);
                label.setAttribute('aria-selected', input.checked ? 'true' : 'false');
            } else {
                var chosen = input.dataset.id;
                selected.clear();
                selected.add(chosen);
                // Re-render to reflect single selection (radio group state + aria)
                renderList(searchEl.value);
            }
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
            if (mode === 'single') {
                if (selected.size !== 1) return;
                var chosenId = Array.from(selected)[0];
                var obj = items.find(function(t) { return String(t.id) === String(chosenId); });
                close();
                onConfirm(new Set([chosenId]), obj ? [obj] : []);
                return;
            }
            if (selected.size === 0) return;
            var validIds = new Set(Array.from(selected).filter(function(id) {
                return typeof id === 'string' && id.length === 36;
            }));
            if (validIds.size === 0) return;
            var tagObjs = items.filter(function(t) { return validIds.has(t.id); });
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

if (typeof window !== 'undefined') {
    window.PickerModal = PickerModal;
    // Backward-compat alias — existing callers use window.TagPicker.
    window.TagPicker = PickerModal;
}
