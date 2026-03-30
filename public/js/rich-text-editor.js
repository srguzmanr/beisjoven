/**
 * BEISJOVEN - Rich Text Editor
 * =============================
 *
 * Simple formatting toolbar for article content.
 * Uses contenteditable + stores HTML in a hidden textarea.
 * Supports paste from: rich text (desktop), Markdown (Claude/iOS), plain text.
 *
 * v2.1 — Fixed mobile paste (iOS Safari) using Selection/Range API
 *         instead of deprecated document.execCommand('insertHTML').
 *         Added detection of "visual markdown" patterns from Claude chat.
 */

const RichTextEditor = {

    create(containerId, inputName = 'content', initialContent = '') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('RichTextEditor: Container not found:', containerId);
            return null;
        }

        // Create editor HTML
        container.innerHTML = `
            <div class="rte-wrapper">
                <div class="rte-toolbar">
                    <button type="button" class="rte-btn" data-cmd="bold" title="Negrita (Ctrl+B)"><b>B</b></button>
                    <button type="button" class="rte-btn" data-cmd="italic" title="Cursiva (Ctrl+I)"><i>I</i></button>
                    <button type="button" class="rte-btn" data-cmd="underline" title="Subrayado (Ctrl+U)"><u>U</u></button>
                    <span class="rte-separator"></span>
                    <button type="button" class="rte-btn" data-cmd="formatBlock" data-value="h2" title="Título">H2</button>
                    <button type="button" class="rte-btn" data-cmd="formatBlock" data-value="h3" title="Subtítulo">H3</button>
                    <button type="button" class="rte-btn" data-cmd="formatBlock" data-value="p" title="Párrafo">¶</button>
                    <span class="rte-separator"></span>
                    <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Lista con viñetas">•</button>
                    <button type="button" class="rte-btn" data-cmd="insertOrderedList" title="Lista numerada">1.</button>
                    <span class="rte-separator"></span>
                    <button type="button" class="rte-btn rte-btn-link" data-cmd="createLink" title="Insertar enlace">🔗</button>
                    <button type="button" class="rte-btn" data-cmd="unlink" title="Quitar enlace">⛓️‍💥</button>
                    <span class="rte-separator"></span>
                    <button type="button" class="rte-btn rte-btn-image" data-cmd="insertImage" title="Insertar imagen desde biblioteca">🖼️</button>
                    <span class="rte-separator"></span>
                    <button type="button" class="rte-btn" data-cmd="removeFormat" title="Limpiar formato">✕</button>
                </div>
                <div class="rte-editor" contenteditable="true" data-placeholder="Escribe el contenido del artículo..."></div>
                <input type="hidden" name="${inputName}" class="rte-hidden-input">
            </div>
        `;

        const editor = container.querySelector('.rte-editor');
        const hiddenInput = container.querySelector('.rte-hidden-input');
        const toolbar = container.querySelector('.rte-toolbar');

        // Set initial content
        editor.innerHTML = initialContent;
        hiddenInput.value = initialContent;

        // Guardar selección al perder foco (crítico iOS — contenteditable pierde selección al tocar toolbar)
        let savedRange = null;
        editor.addEventListener('blur', () => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                savedRange = sel.getRangeAt(0).cloneRange();
            }
        });
        // En touch: guardar antes de que el tap llegue al botón
        toolbar.addEventListener('touchstart', (e) => {
            const btn = e.target.closest('.rte-btn');
            if (!btn) return;
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                savedRange = sel.getRangeAt(0).cloneRange();
            }
        }, { passive: true });

        // Toolbar button clicks
        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.rte-btn');
            if (!btn) return;

            e.preventDefault();
            // Restaurar selección antes de ejecutar (fix iOS)
            editor.focus();
            if (savedRange) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(savedRange);
            }

            const cmd = btn.dataset.cmd;
            const value = btn.dataset.value || null;

            if (cmd === 'insertImage') {
                const sel = window.getSelection();
                const savedRange = sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;

                if (typeof MediaLibrary !== 'undefined') {
                    MediaLibrary.open((result) => {
                        // Acepta string (backward compat) o {url, pieDeFoto, credito}
                        const url      = result.url      || result;
                        const credito  = result.credito  || '';
                        const pieDeFoto = result.pieDeFoto || '';

                        editor.focus();
                        if (savedRange) {
                            sel.removeAllRanges();
                            sel.addRange(savedRange);
                        }

                        // Construir <figure> con <figcaption> editable
                        const figure = document.createElement('figure');
                        figure.className = 'rte-figure';

                        const img = document.createElement('img');
                        img.src = url;
                        img.alt = pieDeFoto || 'Imagen del artículo';

                        const figcaption = document.createElement('figcaption');
                        figcaption.contentEditable = 'true';
                        figcaption.className = 'rte-figcaption';
                        figcaption.setAttribute('data-placeholder', 'Escribe el pie de foto...');

                        // Precargar: pie de foto (editable) + crédito (separado con |)
                        if (pieDeFoto && credito) {
                            // Pie editable | crédito en span
                            figcaption.innerHTML = pieDeFoto + ' <span class="foto-credito-inline" contenteditable="false">' + credito + '</span>';
                        } else if (credito) {
                            figcaption.innerHTML = '<span class="foto-credito-inline" contenteditable="false">' + credito + '</span>';
                        }
                        // Si no hay nada, queda vacío con placeholder para que el periodista escriba

                        figure.appendChild(img);
                        figure.appendChild(figcaption);

                        if (savedRange) {
                            savedRange.collapse(false);
                            savedRange.insertNode(figure);
                        } else {
                            editor.appendChild(figure);
                        }

                        // Posicionar cursor al inicio del figcaption para escribir de inmediato
                        const range = document.createRange();
                        range.selectNodeContents(figcaption);
                        range.collapse(true); // al inicio
                        sel.removeAllRanges();
                        sel.addRange(range);
                        figcaption.focus();

                        hiddenInput.value = editor.innerHTML;
                    });
                } else {
                    const url = prompt('URL de la imagen:');
                    if (url) {
                        document.execCommand('insertHTML', false,
                            '<figure class="rte-figure"><img src="' + url + '" alt="Imagen"><figcaption class="rte-figcaption" contenteditable="true" data-placeholder="Escribe el pie de foto..."></figcaption></figure>');
                    }
                }
                hiddenInput.value = editor.innerHTML;
                return;
            } else if (cmd === 'createLink') {
                const url = prompt('URL del enlace:', 'https://');
                if (url) {
                    document.execCommand(cmd, false, url);
                }
            } else if (cmd === 'formatBlock') {
                document.execCommand(cmd, false, `<${value}>`);
            } else {
                document.execCommand(cmd, false, value);
            }

            hiddenInput.value = editor.innerHTML;
        });

        // Update hidden input on content change
        editor.addEventListener('input', () => {
            hiddenInput.value = editor.innerHTML;
        });

        // ====================================================
        // PASTE HANDLER — v2.1 (mobile-compatible)
        // ====================================================
        // Uses Selection/Range API for HTML insertion instead of
        // deprecated document.execCommand('insertHTML'), which
        // fails silently on iOS Safari contenteditable.
        // ====================================================
        editor.addEventListener('paste', (e) => {
            e.preventDefault();

            const html = e.clipboardData.getData('text/html');
            const plain = e.clipboardData.getData('text/plain');

            let insertContent = '';

            if (html && html.trim().length > 0) {
                // Priority 1: Rich HTML paste (desktop browsers, some Android)
                insertContent = RichTextEditor._sanitizeHTML(html);
            } else if (plain) {
                if (RichTextEditor._hasMarkdown(plain)) {
                    // Priority 2: Markdown syntax detected (Claude artifacts, code blocks)
                    insertContent = RichTextEditor._markdownToHTML(plain);
                } else if (RichTextEditor._hasVisualFormatting(plain)) {
                    // Priority 3: "Visual markdown" — rendered text from Claude chat on iOS
                    // Has • bullets, — dashes, quoted text, but no # or ** markers
                    insertContent = RichTextEditor._visualTextToHTML(plain);
                } else {
                    // Priority 4: Plain text — convert line breaks to paragraphs
                    insertContent = RichTextEditor._plainTextToHTML(plain);
                }
            }

            if (insertContent) {
                RichTextEditor._insertHTMLAtCursor(insertContent, editor);
            }

            hiddenInput.value = editor.innerHTML;
        });

        // Keyboard shortcuts
        editor.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        document.execCommand('bold', false, null);
                        break;
                    case 'i':
                        e.preventDefault();
                        document.execCommand('italic', false, null);
                        break;
                    case 'u':
                        e.preventDefault();
                        document.execCommand('underline', false, null);
                        break;
                }
                hiddenInput.value = editor.innerHTML;
            }
        });

        // Add styles
        this.addStyles();

        return {
            getValue: () => editor.innerHTML,
            setValue: (html) => {
                editor.innerHTML = html;
                hiddenInput.value = html;
            },
            getPlainText: () => editor.innerText,
            focus: () => editor.focus(),
            element: editor
        };
    },

    // ==================== PASTE: HTML INSERTION ====================

    /**
     * Insert HTML at the current cursor position using Selection/Range API.
     * This is the mobile-safe replacement for document.execCommand('insertHTML').
     * Works on iOS Safari, Chrome Android, and all desktop browsers.
     */
    _insertHTMLAtCursor(html, editorElement) {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) {
            // No selection/cursor — append to end of editor
            editorElement.innerHTML += html;
            return;
        }

        const range = sel.getRangeAt(0);

        // Make sure cursor is inside the editor
        if (!editorElement.contains(range.commonAncestorContainer)) {
            editorElement.innerHTML += html;
            return;
        }

        // Delete any selected text first
        range.deleteContents();

        // Parse the HTML string into DOM nodes
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Create a document fragment with all the parsed nodes
        const frag = document.createDocumentFragment();
        let lastNode = null;
        while (temp.firstChild) {
            lastNode = frag.appendChild(temp.firstChild);
        }

        // Insert the fragment at the cursor
        range.insertNode(frag);

        // Move cursor to end of inserted content
        if (lastNode) {
            const newRange = document.createRange();
            newRange.setStartAfter(lastNode);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
    },

    // ==================== PASTE: HTML SANITIZER ====================

    /**
     * Sanitize HTML from rich paste (Google Docs, desktop browsers, Claude chat)
     */
    _sanitizeHTML(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Remove all inline styles, classes, and IDs
        temp.querySelectorAll('*').forEach(el => {
            el.removeAttribute('style');
            el.removeAttribute('class');
            el.removeAttribute('id');
            el.removeAttribute('data-sourcepos');
            el.removeAttribute('dir');
        });

        // Whitelist of allowed tags
        const allowed = [
            'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U',
            'H1', 'H2', 'H3', 'H4',
            'UL', 'OL', 'LI',
            'A', 'IMG', 'BLOCKQUOTE',
            'DIV', 'SPAN', 'CODE', 'PRE'
        ];

        temp.querySelectorAll('*').forEach(el => {
            if (!allowed.includes(el.tagName)) {
                el.replaceWith(...el.childNodes);
            }
        });

        // Convert <div> to <p> (common in clipboard HTML)
        temp.querySelectorAll('div').forEach(el => {
            const p = document.createElement('p');
            p.innerHTML = el.innerHTML;
            el.replaceWith(p);
        });

        // Convert <span> to bare text (spans are just wrappers)
        temp.querySelectorAll('span').forEach(el => {
            el.replaceWith(...el.childNodes);
        });

        // Remove empty paragraphs (but keep ones with images)
        temp.querySelectorAll('p').forEach(el => {
            if (!el.textContent.trim() && !el.querySelector('img')) {
                el.remove();
            }
        });

        return temp.innerHTML;
    },

    // ==================== PASTE: MARKDOWN DETECTION ====================

    /**
     * Detect if text contains Markdown syntax patterns
     * (from Claude artifacts, .md files, or raw markdown sources)
     */
    _hasMarkdown(text) {
        return /(?:^|\n)\s{0,3}#{1,4}\s/.test(text)    ||  // # Headers
               /\*\*[^*]+\*\*/.test(text)               ||  // **bold**
               /(?<!\*)\*[^*\n]+\*(?!\*)/.test(text)     ||  // *italic*
               /^>\s/m.test(text)                        ||  // > blockquote
               /^\s*[-*+•·]\s/m.test(text)                ||  // - list items (incl. • · from chat)
               /^\s*\d+\.\s/m.test(text)                 ||  // 1. ordered list
               /^---\s*$/m.test(text);                       // --- horizontal rule
    },

    /**
     * Detect "visual formatting" — rendered text from Claude chat on iOS.
     * This text has no markdown syntax but has visual structure like:
     * - Bullet character (•) at start of lines
     * - Em dash (—) separating items
     * - Short ALL-CAPS or title-case lines that look like headings
     * - Quoted text with " marks
     */
    _hasVisualFormatting(text) {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 3) return false;

        let score = 0;

        // • bullet characters or similar
        if (/^\s*[•·▪▸►‣]\s/m.test(text)) score += 2;

        // Short lines that look like section headers (under 80 chars, no period at end)
        const shortHeaderLines = lines.filter(l => {
            const t = l.trim();
            return t.length > 3 && t.length < 80 && !t.endsWith('.') && !t.endsWith(':') && !t.startsWith('•') && !t.startsWith('·') && !t.startsWith('-');
        });
        if (shortHeaderLines.length >= 2) score += 1;

        // Em dashes used as separators
        if (/\s—\s/.test(text)) score += 1;

        // Quoted text with " " or regular quotes with attribution
        if (/[""][^""]+[""]/.test(text) || /"[^"]+"\s*[-—]/.test(text)) score += 1;

        // Multiple blank lines between sections (paragraph structure)
        const blankLineCount = (text.match(/\n\s*\n/g) || []).length;
        if (blankLineCount >= 2) score += 1;

        return score >= 2;
    },

    // ==================== PASTE: MARKDOWN → HTML ====================

    /**
     * Convert Markdown to HTML
     */
    _markdownToHTML(md) {
        let html = '';
        const lines = md.split('\n');
        let inList = false;
        let listType = '';
        let inBlockquote = false;
        let blockquoteLines = [];

        const closeList = () => {
            if (inList) {
                html += `</${listType}>`;
                inList = false;
                listType = '';
            }
        };

        const closeBlockquote = () => {
            if (inBlockquote) {
                const content = blockquoteLines.join('<br>');
                html += `<blockquote>${content}</blockquote>`;
                inBlockquote = false;
                blockquoteLines = [];
            }
        };

        const inlineFormat = (text) => {
            // Bold: **text**
            text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            // Italic: *text* (but not inside bold)
            text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
            // Links: [text](url)
            text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
            return text;
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Skip horizontal rules (---)
            if (/^---+\s*$/.test(trimmed)) {
                closeList();
                closeBlockquote();
                continue;
            }

            // Empty line
            if (trimmed === '') {
                closeList();
                closeBlockquote();
                continue;
            }

            // Headers: # ## ### ####
            const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
            if (headerMatch) {
                closeList();
                closeBlockquote();
                const level = headerMatch[1].length;
                const tag = `h${level}`;
                html += `<${tag}>${inlineFormat(headerMatch[2])}</${tag}>`;
                continue;
            }

            // Blockquote: > text
            const bqMatch = trimmed.match(/^>\s*(.*)$/);
            if (bqMatch) {
                closeList();
                inBlockquote = true;
                blockquoteLines.push(inlineFormat(bqMatch[1]));
                continue;
            } else if (inBlockquote) {
                closeBlockquote();
            }

            // Unordered list: - item, * item, + item, • item, · item
            const ulMatch = trimmed.match(/^[-*+•·]\s+(.+)$/);
            if (ulMatch) {
                closeBlockquote();
                if (!inList || listType !== 'ul') {
                    closeList();
                    html += '<ul>';
                    inList = true;
                    listType = 'ul';
                }
                html += `<li>${inlineFormat(ulMatch[1])}</li>`;
                continue;
            }

            // Ordered list: 1. item
            const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
            if (olMatch) {
                closeBlockquote();
                if (!inList || listType !== 'ol') {
                    closeList();
                    html += '<ol>';
                    inList = true;
                    listType = 'ol';
                }
                html += `<li>${inlineFormat(olMatch[1])}</li>`;
                continue;
            }

            // Regular paragraph — or heading heuristic for chat-copied text
            closeList();
            closeBlockquote();

            // Heading heuristic: short line, no period at end, not a data line,
            // appears after a blank line or at start, followed by content.
            // This catches "Sección Final" or "Pitchers Confirmados" from chat copy.
            const isShort = trimmed.length >= 3 && trimmed.length < 80;
            const noPeriod = !trimmed.endsWith('.') && !trimmed.endsWith(':') && !trimmed.endsWith('!') && !trimmed.endsWith('?');
            const noSeparator = !trimmed.includes(' — ') || trimmed.split(' — ').length === 2 && trimmed.split(' — ')[0].length < 40;
            const prevIsBlank = (i === 0) || (lines[i - 1].trim() === '');
            const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
            const nextIsContentOrBlank = nextLine === '' || nextLine.length > trimmed.length;

            // Additional check: line should not look like a data/detail line
            // (data lines typically have numbers with parens, multiple — dashes, etc.)
            const looksLikeData = /\(\d+/.test(trimmed) && /—/.test(trimmed);

            if (isShort && noPeriod && prevIsBlank && nextIsContentOrBlank && !looksLikeData) {
                html += `<h3>${inlineFormat(trimmed)}</h3>`;
            } else {
                html += `<p>${inlineFormat(trimmed)}</p>`;
            }
        }

        closeList();
        closeBlockquote();
        return html;
    },

    // ==================== PASTE: VISUAL TEXT → HTML ====================

    /**
     * Convert "visually formatted" plain text to HTML.
     * This handles text copied from Claude's rendered chat output on iOS,
     * where there's no markdown syntax but the structure is visible:
     * - • bullets, — separators, "quoted" text, short header-like lines
     */
    _visualTextToHTML(text) {
        let html = '';
        const lines = text.split('\n');
        let inList = false;

        const closeList = () => {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();

            // Skip empty lines
            if (!trimmed) {
                closeList();
                continue;
            }

            // Bullet lines: • item, · item, ▪ item, etc.
            const bulletMatch = trimmed.match(/^[•·▪▸►‣]\s*(.+)$/);
            if (bulletMatch) {
                if (!inList) {
                    html += '<ul>';
                    inList = true;
                }
                html += `<li>${bulletMatch[1]}</li>`;
                continue;
            }

            // Detect header-like lines: short, no period, followed by content
            const isShortLine = trimmed.length >= 3 && trimmed.length < 80 &&
                !trimmed.endsWith('.') && !trimmed.endsWith(':') && !trimmed.endsWith('!') && !trimmed.endsWith('?');
            const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
            const nextIsContent = nextLine.length > trimmed.length || nextLine.startsWith('•') || nextLine.startsWith('·') || nextLine === '';
            const prevLine = (i > 0) ? lines[i - 1].trim() : '';
            const afterBlank = prevLine === '' || i === 0;
            const looksLikeData = /\(\d+/.test(trimmed) && /—/.test(trimmed);

            if (isShortLine && afterBlank && nextIsContent && !bulletMatch && !looksLikeData) {
                closeList();
                html += `<h3>${trimmed}</h3>`;
                continue;
            }

            // Quoted text: "something" — attribution
            const quoteMatch = trimmed.match(/^[""](.+)[""]\s*[-—]\s*(.+)$/);
            if (quoteMatch) {
                closeList();
                html += `<blockquote>"${quoteMatch[1]}" — ${quoteMatch[2]}</blockquote>`;
                continue;
            }

            // Regular paragraph
            closeList();
            html += `<p>${trimmed}</p>`;
        }

        closeList();
        return html;
    },

    // ==================== PASTE: PLAIN TEXT → HTML ====================

    /**
     * Convert plain text (no formatting at all) to HTML paragraphs
     */
    _plainTextToHTML(text) {
        const paragraphs = text.split(/\n\n+/);
        return paragraphs
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
            .join('');
    },

    // ==================== STYLES ====================

    addStyles() {
        if (document.getElementById('rte-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'rte-styles';
        styles.textContent = `
            .rte-wrapper {
                border: 1px solid #d1d5db;
                border-radius: 8px;
                overflow: hidden;
                background: white;
                position: relative;
            }
            .rte-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                padding: 8px 10px;
                background: #f3f4f6;
                border-bottom: 1px solid #d1d5db;
                position: sticky;
                top: 0;
                z-index: 10;
                -webkit-overflow-scrolling: touch;
            }
            .rte-btn {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: white;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                color: #374151;
                transition: all 0.15s;
                -webkit-appearance: none;
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
                user-select: none;
                -webkit-user-select: none;
                flex-shrink: 0;
            }
            @media (max-width: 768px) {
                .rte-btn {
                    width: 44px;
                    height: 44px;
                    font-size: 16px;
                }
                .rte-toolbar {
                    gap: 6px;
                    padding: 10px 12px;
                    overflow-x: auto;
                    flex-wrap: nowrap;
                }
            }
            .rte-btn:hover {
                background: #e5e7eb;
                border-color: #9ca3af;
            }
            .rte-btn:active {
                background: #d1d5db;
            }
            .rte-btn b { font-weight: 700; }
            .rte-btn i { font-style: italic; }
            .rte-btn u { text-decoration: underline; }
            .rte-separator {
                width: 1px;
                height: 24px;
                background: #d1d5db;
                margin: 4px 6px;
                flex-shrink: 0;
            }
            .rte-editor {
                min-height: 300px;
                max-height: 500px;
                overflow-y: auto;
                padding: 16px;
                font-size: 16px;
                line-height: 1.6;
                color: #1f2937;
                outline: none;
                -webkit-overflow-scrolling: touch;
                -webkit-user-select: text;
                user-select: text;
            }
            .rte-editor:empty:before {
                content: attr(data-placeholder);
                color: #9ca3af;
                pointer-events: none;
            }
            .rte-editor h2 {
                font-size: 1.5em;
                font-weight: 600;
                margin: 0.5em 0;
                color: #1e3a5f;
            }
            .rte-editor h3 {
                font-size: 1.25em;
                font-weight: 600;
                margin: 0.5em 0;
                color: #1e3a5f;
            }
            .rte-editor p { margin: 0.75em 0; }
            .rte-editor ul, .rte-editor ol {
                margin: 0.75em 0;
                padding-left: 1.5em;
            }
            .rte-editor li { margin: 0.25em 0; }
            .rte-editor a {
                color: #2563eb;
                text-decoration: underline;
            }
            .rte-editor blockquote {
                border-left: 4px solid #1e3a5f;
                margin: 1em 0;
                padding: 0.5em 0 0.5em 1em;
                color: #4b5563;
                font-style: italic;
            }
            .rte-editor img {
                max-width: 100%;
                border-radius: 8px;
                margin: 12px 0;
                display: block;
                cursor: default;
            }
            .rte-editor img:hover {
                outline: 2px solid #1e3a5f;
                outline-offset: 2px;
            }
            .rte-figure {
                margin: 20px 0;
                padding: 0;
                border: 2px dashed transparent;
                border-radius: 8px;
                transition: border-color 0.2s;
            }
            .rte-figure:hover, .rte-figure:focus-within {
                border-color: #e5e7eb;
            }
            .rte-figure img {
                margin: 0 0 0 0;
                border-radius: 8px 8px 0 0;
            }
            .rte-figcaption {
                padding: 8px 10px;
                font-size: 0.85rem;
                color: #6b7280;
                font-style: italic;
                background: #f9fafb;
                border-radius: 0 0 8px 8px;
                border-top: 1px solid #e5e7eb;
                outline: none;
                min-height: 1.4em;
                line-height: 1.4;
            }
            .rte-figcaption:empty:before {
                content: attr(data-placeholder);
                color: #d1d5db;
                pointer-events: none;
                font-style: italic;
            }
            .rte-figcaption:focus {
                background: #f0f9ff;
                border-top-color: #93c5fd;
            }
            .foto-credito-inline {
                font-style: normal;
                font-weight: 500;
                color: #9ca3af;
                font-size: 0.8rem;
                margin-left: 6px;
                cursor: default;
                user-select: none;
            }
            .rte-hidden-input { display: none; }

            /* Mobile */
            @media (max-width: 600px) {
                .rte-toolbar {
                    padding: 6px;
                    gap: 3px;
                    overflow-x: auto;
                    flex-wrap: nowrap;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                }
                .rte-toolbar::-webkit-scrollbar { display: none; }
                .rte-btn {
                    width: 34px;
                    height: 34px;
                    font-size: 13px;
                    min-width: 34px;
                }
                .rte-separator {
                    height: 20px;
                    margin: 7px 3px;
                    min-width: 1px;
                }
                .rte-editor {
                    min-height: 200px;
                    max-height: none;
                    padding: 12px;
                    font-size: 16px;
                }
            }
        `;
        document.head.appendChild(styles);
    }
};
