/**
 * BEISJOVEN - Rich Text Editor
 * =============================
 * 
 * Simple formatting toolbar for article content.
 * Uses contenteditable + stores HTML in a hidden textarea.
 * 
 * INSTALLATION:
 * 1. Add this file to js/rich-text-editor.js
 * 2. Add to index.html: <script src="js/rich-text-editor.js"></script>
 * 3. Replace your textarea with RichTextEditor.create()
 */

const RichTextEditor = {
    
    /**
     * Create a rich text editor
     * @param {string} containerId - ID of container element
     * @param {string} inputName - Name for the hidden input (for form submission)
     * @param {string} initialContent - Initial HTML content
     * @returns {Object} - Editor instance with getValue() and setValue() methods
     */
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
        
        // Toolbar button clicks
        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.rte-btn');
            if (!btn) return;
            
            e.preventDefault();
            editor.focus();
            
            const cmd = btn.dataset.cmd;
            const value = btn.dataset.value || null;
            
            if (cmd === 'insertImage') {
                // Save current selection before opening modal
                const sel = window.getSelection();
                const savedRange = sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;

                if (typeof MediaLibrary !== 'undefined') {
                    MediaLibrary.open((url) => {
                        editor.focus();
                        // Restore cursor position
                        if (savedRange) {
                            sel.removeAllRanges();
                            sel.addRange(savedRange);
                        }
                        // Insert image at cursor
                        const img = document.createElement('img');
                        img.src = url;
                        img.alt = 'Imagen del artículo';
                        img.style.cssText = 'max-width:100%;border-radius:8px;margin:12px 0;display:block;';

                        if (savedRange) {
                            savedRange.collapse(false);
                            savedRange.insertNode(img);
                            // Move cursor after image
                            savedRange.setStartAfter(img);
                            savedRange.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(savedRange);
                        } else {
                            editor.appendChild(img);
                        }
                        hiddenInput.value = editor.innerHTML;
                    });
                } else {
                    // Fallback: prompt for URL
                    const url = prompt('URL de la imagen:');
                    if (url) {
                        document.execCommand('insertHTML', false, `<img src="${url}" alt="Imagen" style="max-width:100%;border-radius:8px;margin:12px 0;display:block;">`);
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
            
            // Update hidden input
            hiddenInput.value = editor.innerHTML;
        });
        
        // Update hidden input on content change
        editor.addEventListener('input', () => {
            hiddenInput.value = editor.innerHTML;
        });
        
        // Handle paste - sanitize HTML, with mobile plain-text fallback
        editor.addEventListener('paste', (e) => {
            const html = e.clipboardData.getData('text/html');
            const plain = e.clipboardData.getData('text/plain');
            e.preventDefault();
            
            if (html && html.trim().length > 0) {
                // Rich paste: sanitize HTML
                const temp = document.createElement('div');
                temp.innerHTML = html;
                temp.querySelectorAll('*').forEach(el => {
                    el.removeAttribute('style');
                    el.removeAttribute('class');
                    el.removeAttribute('id');
                });
                const allowed = ['P','BR','STRONG','B','EM','I','U','H1','H2','H3','H4','UL','OL','LI','A','IMG','BLOCKQUOTE','DIV'];
                temp.querySelectorAll('*').forEach(el => {
                    if (!allowed.includes(el.tagName)) {
                        el.replaceWith(...el.childNodes);
                    }
                });
                temp.querySelectorAll('div').forEach(el => {
                    const p = document.createElement('p');
                    p.innerHTML = el.innerHTML;
                    el.replaceWith(p);
                });
                temp.querySelectorAll('p').forEach(el => {
                    if (!el.textContent.trim() && !el.querySelector('img')) {
                        el.remove();
                    }
                });
                document.execCommand('insertHTML', false, temp.innerHTML);
            } else if (plain) {
                // Plain text fallback (mobile): convert line breaks to paragraphs
                const paragraphs = plain.split(/\n\n+/);
                const htmlOut = paragraphs
                    .map(p => p.trim())
                    .filter(p => p.length > 0)
                    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
                    .join('');
                document.execCommand('insertHTML', false, htmlOut || plain);
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
        
        // Add styles if not already added
        this.addStyles();
        
        // Return editor instance
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
    
    /**
     * Add CSS styles
     */
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
            .rte-editor p {
                margin: 0.75em 0;
            }
            .rte-editor ul, .rte-editor ol {
                margin: 0.75em 0;
                padding-left: 1.5em;
            }
            .rte-editor li {
                margin: 0.25em 0;
            }
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
            .rte-hidden-input {
                display: none;
            }
            
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
                .rte-toolbar::-webkit-scrollbar {
                    display: none;
                }
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

/* ============================================
   INTEGRATION CODE
   ============================================
   
   In your admin.js article form, replace the textarea:
   
   BEFORE:
   -----------------------------------------
   <label>Contenido</label>
   <textarea id="articulo-contenido" rows="10"></textarea>
   
   
   AFTER:
   -----------------------------------------
   <label>Contenido</label>
   <div id="articulo-contenido-editor"></div>
   
   
   Then in your JavaScript, create the editor:
   -----------------------------------------
   // Create editor when showing the article form
   let contentEditor = null;
   
   function showArticleForm(article = null) {
       // ... your existing form setup code ...
       
       // Initialize rich text editor
       const initialContent = article ? article.contenido : '';
       contentEditor = RichTextEditor.create('articulo-contenido-editor', 'contenido', initialContent);
   }
   
   // When saving the article, get the content:
   function saveArticle() {
       const contenido = contentEditor.getValue();
       // ... save to Supabase ...
   }
   
   // When editing an existing article:
   function editArticle(article) {
       contentEditor.setValue(article.contenido);
   }
   
*/
