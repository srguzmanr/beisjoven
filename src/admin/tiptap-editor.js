/**
 * BEISJOVEN - Tiptap Editor v1.0
 * ================================
 * Replaces the old contenteditable-based RichTextEditor with Tiptap.
 * Bundled via Vite into public/js/tiptap-editor.js as an IIFE.
 *
 * Exposes window.TiptapEditor with the same create() API so admin.js
 * can use it as a drop-in replacement.
 */

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Youtube from '@tiptap/extension-youtube';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { Node, mergeAttributes, Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model';
import { marked } from 'marked';

/* ================================================================
   CUSTOM EXTENSIONS — Twitter & Instagram embeds
   ================================================================ */

/**
 * Twitter/X embed node.
 * Stores the tweet URL and renders a blockquote that the Twitter
 * widget script will hydrate on the frontend.
 * Inside the editor it shows a styled placeholder block.
 */
const TwitterEmbed = Node.create({
  name: 'twitterEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      tweetId: { default: null },
      url: { default: null },
    };
  },

  parseHTML() {
    return [
      // New format: <div class="twitter-embed" data-tweet-id="...">
      {
        tag: 'div.twitter-embed[data-tweet-id]',
        getAttrs(dom) {
          return {
            tweetId: dom.getAttribute('data-tweet-id'),
            url: dom.getAttribute('data-tweet-url') || null,
          };
        },
      },
      // Legacy format: <div class="embed-container embed-twitter"><blockquote>
      {
        tag: 'div.embed-container.embed-twitter',
        getAttrs(dom) {
          const a = dom.querySelector('a[href]');
          if (!a) return false;
          const url = a.getAttribute('href') || '';
          const match = url.match(/status\/(\d+)/);
          return {
            tweetId: match ? match[1] : null,
            url,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const tweetId = node.attrs.tweetId || '';
    const url = node.attrs.url || '';
    return [
      'div',
      {
        class: 'twitter-embed',
        'data-tweet-id': tweetId,
        'data-tweet-url': url,
      },
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'tiptap-embed-preview tiptap-embed-twitter';
      dom.contentEditable = 'false';
      dom.innerHTML = `
        <div class="embed-badge">𝕏 Tweet</div>
        <div class="embed-url">${node.attrs.url || 'ID: ' + (node.attrs.tweetId || '')}</div>
      `;
      return { dom };
    };
  },
});

/**
 * Instagram embed node.
 */
const InstagramEmbed = Node.create({
  name: 'instagramEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      url: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.embed-container.embed-instagram',
        getAttrs(dom) {
          const a = dom.querySelector('a[href]');
          return a ? { url: a.getAttribute('href') } : false;
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const url = node.attrs.url || '';
    const clean = url.replace(/\/$/, '') + '/';
    return [
      'div',
      mergeAttributes(HTMLAttributes, { class: 'embed-container embed-instagram' }),
      ['blockquote', {
        class: 'instagram-media',
        'data-instgrm-permalink': clean,
        'data-instgrm-version': '14',
        style: 'max-width:540px; width:100%;',
      },
        ['a', { href: clean }, clean],
      ],
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'tiptap-embed-preview tiptap-embed-instagram';
      dom.contentEditable = 'false';
      dom.innerHTML = `
        <div class="embed-badge">📷 Instagram</div>
        <div class="embed-url">${node.attrs.url || ''}</div>
      `;
      return { dom };
    };
  },
});

/**
 * TikTok embed node.
 */
const TikTokEmbed = Node.create({
  name: 'tiktokEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      url: { default: null },
      videoId: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.embed-container.embed-social',
        getAttrs(dom) {
          const bq = dom.querySelector('blockquote.tiktok-embed');
          if (!bq) return false;
          return {
            url: bq.getAttribute('cite') || '',
            videoId: bq.getAttribute('data-video-id') || '',
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const url = node.attrs.url || '';
    const videoId = node.attrs.videoId || '';
    return [
      'div',
      mergeAttributes(HTMLAttributes, { class: 'embed-container embed-social' }),
      ['blockquote', {
        class: 'tiktok-embed',
        cite: url,
        'data-video-id': videoId,
      },
        ['a', { href: url }, url],
      ],
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'tiptap-embed-preview tiptap-embed-tiktok';
      dom.contentEditable = 'false';
      dom.innerHTML = `
        <div class="embed-badge">🎵 TikTok</div>
        <div class="embed-url">${node.attrs.url || ''}</div>
      `;
      return { dom };
    };
  },
});

/**
 * Figure node — wraps an image with an optional figcaption.
 * This preserves the <figure> + <figcaption> pattern from the old editor.
 */
const Figure = Node.create({
  name: 'figure',
  group: 'block',
  content: 'inline*',
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      class: { default: 'rte-figure' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        getAttrs(dom) {
          const img = dom.querySelector('img');
          return img ? {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            class: dom.getAttribute('class') || 'rte-figure',
          } : {};
        },
        contentElement: 'figcaption',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'figure',
      mergeAttributes(HTMLAttributes, { class: node.attrs.class || 'rte-figure' }),
      ['img', { src: node.attrs.src, alt: node.attrs.alt || '' }],
      ['figcaption', { class: 'rte-figcaption' }, 0],
    ];
  },
});


/**
 * Gallery node — a block of multiple images displayed as a grid.
 * Stores images as a JSON attribute and renders gallery HTML.
 */
const Gallery = Node.create({
  name: 'gallery',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML(element) {
          const figures = element.querySelectorAll('figure');
          return Array.from(figures).map(fig => {
            const img = fig.querySelector('img');
            const caption = fig.querySelector('figcaption');
            const creditSpan = caption?.querySelector('span');
            const captionText = caption ? caption.childNodes[0]?.textContent?.trim() || '' : '';
            return {
              url: img?.getAttribute('src') || '',
              alt: img?.getAttribute('alt') || '',
              caption: captionText,
              credit: creditSpan?.textContent?.trim() || '',
            };
          });
        },
        renderHTML(attributes) {
          return {}; // handled in renderHTML below
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.gallery[data-gallery]',
      },
    ];
  },

  renderHTML({ node }) {
    const images = node.attrs.images || [];
    const children = images.flatMap(img => [
      'figure', {},
      ['img', { src: img.url, alt: img.caption || img.alt || '', loading: 'lazy' }],
      ['figcaption', {},
        ...(img.caption ? [img.caption + ' '] : []),
        ...(img.credit ? [['span', {}, img.credit]] : []),
      ],
    ]);

    // Build the nested array structure for Tiptap renderHTML
    const figureNodes = images.map(img => {
      const figcaptionContent = [];
      if (img.caption) figcaptionContent.push(img.caption);
      if (img.caption && img.credit) figcaptionContent.push(' ');
      if (img.credit) figcaptionContent.push(['span', {}, img.credit]);

      return ['figure', {},
        ['img', { src: img.url, alt: img.caption || img.alt || '', loading: 'lazy' }],
        ['figcaption', {}, ...figcaptionContent],
      ];
    });

    return ['div', { class: 'gallery', 'data-gallery': 'true' }, ...figureNodes];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'tiptap-gallery-preview';
      dom.contentEditable = 'false';

      const images = node.attrs.images || [];
      dom.innerHTML = `
        <div class="gallery-preview-header">🖼️ Galería · ${images.length} foto${images.length !== 1 ? 's' : ''}</div>
        <div class="gallery-preview-grid">
          ${images.map(img => `
            <div class="gallery-preview-item">
              <img src="${img.url}" alt="${img.caption || ''}" loading="lazy" />
              ${img.caption ? `<span>${img.caption}</span>` : ''}
            </div>
          `).join('')}
        </div>
      `;
      return { dom };
    };
  },
});


/* ================================================================
   AUTO-EMBED PASTE PLUGIN
   Detects pasted YouTube/Twitter/Instagram/TikTok URLs on empty
   lines and converts them to embeds automatically.
   ================================================================ */

const EMBED_PATTERNS = [
  {
    name: 'youtube',
    test: /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)/,
  },
  {
    name: 'twitter',
    test: /(?:x\.com|twitter\.com)\/\w+\/status\/\d+/,
  },
  {
    name: 'instagram',
    test: /instagram\.com\/(p|reel)\/[\w-]+/,
  },
  {
    name: 'tiktok',
    test: /tiktok\.com\/@[\w.-]+\/video\/\d+/,
  },
];

function createAutoEmbedPlugin(editor) {
  return new Plugin({
    key: new PluginKey('autoEmbed'),
    props: {
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain')?.trim();
        if (!text || !text.startsWith('http') || text.includes(' ')) return false;

        // Check if cursor is in an empty paragraph
        const { $from } = view.state.selection;
        const node = $from.parent;
        if (node.type.name !== 'paragraph' || node.textContent.length > 0) return false;

        for (const pattern of EMBED_PATTERNS) {
          if (pattern.test.test(text)) {
            event.preventDefault();
            const url = text.split('?')[0]; // clean URL for twitter/ig

            if (pattern.name === 'youtube') {
              editor.chain().focus().deleteSelection().setYoutubeVideo({ src: text }).run();
            } else if (pattern.name === 'twitter') {
              const tweetIdMatch = text.match(/status\/(\d+)/);
              const cleanUrl = url.replace('twitter.com', 'x.com');
              editor.chain().focus().deleteSelection().insertContent({
                type: 'twitterEmbed',
                attrs: { tweetId: tweetIdMatch ? tweetIdMatch[1] : '', url: cleanUrl },
              }).run();
            } else if (pattern.name === 'instagram') {
              editor.chain().focus().deleteSelection().insertContent({
                type: 'instagramEmbed',
                attrs: { url },
              }).run();
            } else if (pattern.name === 'tiktok') {
              const videoIdMatch = text.match(/video\/(\d+)/);
              editor.chain().focus().deleteSelection().insertContent({
                type: 'tiktokEmbed',
                attrs: { url, videoId: videoIdMatch ? videoIdMatch[1] : '' },
              }).run();
            }
            return true;
          }
        }
        return false;
      },
    },
  });
}


/* ================================================================
   TOOLBAR
   ================================================================ */

function createToolbar(editor, container) {
  const toolbar = document.createElement('div');
  toolbar.className = 'tiptap-toolbar';

  const groups = [
    // Text formatting
    [
      { label: '<b>B</b>', title: 'Negrita (Ctrl+B)', action: () => editor.chain().focus().toggleBold().run(), active: () => editor.isActive('bold') },
      { label: '<i>I</i>', title: 'Cursiva (Ctrl+I)', action: () => editor.chain().focus().toggleItalic().run(), active: () => editor.isActive('italic') },
    ],
    // Headings
    [
      { label: 'H2', title: 'Titulo', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: () => editor.isActive('heading', { level: 2 }) },
      { label: 'H3', title: 'Subtitulo', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: () => editor.isActive('heading', { level: 3 }) },
    ],
    // Lists
    [
      { label: '•', title: 'Lista con vinetas', action: () => editor.chain().focus().toggleBulletList().run(), active: () => editor.isActive('bulletList') },
      { label: '1.', title: 'Lista numerada', action: () => editor.chain().focus().toggleOrderedList().run(), active: () => editor.isActive('orderedList') },
      { label: '❝', title: 'Cita', action: () => editor.chain().focus().toggleBlockquote().run(), active: () => editor.isActive('blockquote') },
    ],
    // Insert
    [
      { label: '🔗', title: 'Insertar enlace', action: () => handleLink(editor), active: () => editor.isActive('link') },
      { label: '🖼️', title: 'Insertar imagen', action: () => handleImage(editor), active: () => false },
      { label: '🖼️+', title: 'Insertar galería de fotos', action: () => handleGallery(editor), active: () => false },
      { label: '—', title: 'Separador horizontal', action: () => editor.chain().focus().setHorizontalRule().run(), active: () => false },
    ],
    // Embeds
    [
      { label: '▶', title: 'YouTube embed', action: () => handleYouTube(editor), active: () => false },
      { label: '𝕏', title: 'Twitter/X embed', action: () => handleTwitter(editor), active: () => false },
      { label: '📷', title: 'Instagram embed', action: () => handleInstagram(editor), active: () => false },
    ],
  ];

  groups.forEach((group, gi) => {
    group.forEach((btn) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'tiptap-btn';
      el.innerHTML = btn.label;
      el.title = btn.title;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        btn.action();
      });
      el._isActive = btn.active;
      toolbar.appendChild(el);
    });
    if (gi < groups.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'tiptap-separator';
      toolbar.appendChild(sep);
    }
  });

  // Update active states on selection/content change
  const updateActive = () => {
    toolbar.querySelectorAll('.tiptap-btn').forEach((el) => {
      if (el._isActive && el._isActive()) {
        el.classList.add('is-active');
      } else {
        el.classList.remove('is-active');
      }
    });
  };
  editor.on('selectionUpdate', updateActive);
  editor.on('transaction', updateActive);

  container.prepend(toolbar);
  return toolbar;
}


/* ================================================================
   TOOLBAR ACTION HANDLERS
   ================================================================ */

function handleLink(editor) {
  if (editor.isActive('link')) {
    editor.chain().focus().unsetLink().run();
    return;
  }
  const url = prompt('URL del enlace:', 'https://');
  if (url) {
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }
}

function handleImage(editor) {
  if (typeof window.MediaLibrary !== 'undefined') {
    window.MediaLibrary.open((result) => {
      const url = result.url || result;
      const credito = result.credito || '';
      const pieDeFoto = result.pieDeFoto || '';

      // Build figcaption content
      let captionContent = '';
      if (pieDeFoto && credito) {
        captionContent = pieDeFoto + ' ' + credito;
      } else if (credito) {
        captionContent = credito;
      } else if (pieDeFoto) {
        captionContent = pieDeFoto;
      }

      // Insert figure node
      editor.chain().focus().insertContent({
        type: 'figure',
        attrs: {
          src: url,
          alt: pieDeFoto || 'Imagen del articulo',
        },
        content: captionContent ? [{ type: 'text', text: captionContent }] : [],
      }).run();
    });
  } else {
    const url = prompt('URL de la imagen:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }
}

function handleYouTube(editor) {
  const url = prompt('URL del video de YouTube:');
  if (url && /(?:youtube\.com|youtu\.be)/.test(url)) {
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
  } else if (url) {
    alert('URL de YouTube no valida');
  }
}

function handleTwitter(editor) {
  const url = prompt('URL del tweet (x.com o twitter.com):');
  if (url && /(?:x\.com|twitter\.com)\/\w+\/status\/\d+/.test(url)) {
    const clean = url.split('?')[0];
    const tweetIdMatch = url.match(/status\/(\d+)/);
    editor.chain().focus().insertContent({
      type: 'twitterEmbed',
      attrs: { tweetId: tweetIdMatch ? tweetIdMatch[1] : '', url: clean },
    }).run();
  } else if (url) {
    alert('URL de Twitter/X no valida. Formato: https://x.com/usuario/status/123456');
  }
}

function handleInstagram(editor) {
  const url = prompt('URL del post de Instagram:');
  if (url && /instagram\.com\/(p|reel)\/[\w-]+/.test(url)) {
    const clean = url.split('?')[0];
    editor.chain().focus().insertContent({
      type: 'instagramEmbed',
      attrs: { url: clean },
    }).run();
  } else if (url) {
    alert('URL de Instagram no valida. Formato: https://instagram.com/p/XXXXX');
  }
}

function handleGallery(editor) {
  if (typeof window.MediaLibrary !== 'undefined' && window.MediaLibrary.openMulti) {
    window.MediaLibrary.openMulti((selected) => {
      if (!selected || selected.length === 0) return;
      const images = selected.map(img => ({
        url: img.url,
        alt: img.pieDeFoto || img.nombre || '',
        caption: img.pieDeFoto || '',
        credit: img.credito || '',
      }));
      editor.chain().focus().insertContent({
        type: 'gallery',
        attrs: { images },
      }).run();
    });
  } else {
    alert('La biblioteca de medios no está disponible. Recarga la página e intenta de nuevo.');
  }
}


/* ================================================================
   STYLES (injected once)
   ================================================================ */

function injectStyles() {
  if (document.getElementById('tiptap-editor-styles')) return;

  const style = document.createElement('style');
  style.id = 'tiptap-editor-styles';
  style.textContent = `
    /* Wrapper */
    .tiptap-wrapper {
      border: 1px solid #d1d5db;
      border-radius: 8px;
      overflow: hidden;
      background: white;
      position: relative;
    }

    /* Toolbar */
    .tiptap-toolbar {
      display: flex;
      flex-wrap: nowrap;
      gap: 4px;
      padding: 8px 10px;
      background: #f3f4f6;
      border-bottom: 1px solid #d1d5db;
      position: sticky;
      top: 0;
      z-index: 10;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .tiptap-toolbar::-webkit-scrollbar { display: none; }

    .tiptap-btn {
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
    .tiptap-btn:hover { background: #e5e7eb; border-color: #9ca3af; }
    .tiptap-btn:active { background: #d1d5db; }
    .tiptap-btn.is-active {
      background: #1e3a5f;
      color: white;
      border-color: #1e3a5f;
    }
    .tiptap-btn b { font-weight: 700; }
    .tiptap-btn i { font-style: italic; }

    .tiptap-separator {
      width: 1px;
      height: 24px;
      background: #d1d5db;
      margin: 4px 4px;
      flex-shrink: 0;
    }

    /* Editor content area */
    .tiptap-wrapper .tiptap {
      min-height: 300px;
      max-height: 600px;
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

    /* Placeholder */
    .tiptap p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: #9ca3af;
      pointer-events: none;
      height: 0;
    }

    /* Typography inside editor */
    .tiptap-wrapper .tiptap h2 {
      font-size: 1.5em;
      font-weight: 600;
      margin: 0.5em 0;
      color: #1e3a5f;
    }
    .tiptap-wrapper .tiptap h3 {
      font-size: 1.25em;
      font-weight: 600;
      margin: 0.5em 0;
      color: #1e3a5f;
    }
    .tiptap-wrapper .tiptap p { margin: 0.75em 0; }
    .tiptap-wrapper .tiptap ul,
    .tiptap-wrapper .tiptap ol {
      margin: 0.75em 0;
      padding-left: 1.5em;
    }
    .tiptap-wrapper .tiptap li { margin: 0.25em 0; }
    .tiptap-wrapper .tiptap a {
      color: #2563eb;
      text-decoration: underline;
      cursor: pointer;
    }
    .tiptap-wrapper .tiptap blockquote {
      border-left: 4px solid #1e3a5f;
      margin: 1em 0;
      padding: 0.5em 0 0.5em 1em;
      color: #4b5563;
      font-style: italic;
    }
    .tiptap-wrapper .tiptap hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 1.5em 0;
    }
    .tiptap-wrapper .tiptap img {
      max-width: 100%;
      border-radius: 8px;
      margin: 12px 0;
      display: block;
    }

    /* Figure with figcaption */
    .tiptap-wrapper .tiptap figure {
      margin: 20px 0;
      padding: 0;
      border: 2px dashed transparent;
      border-radius: 8px;
      transition: border-color 0.2s;
    }
    .tiptap-wrapper .tiptap figure:hover,
    .tiptap-wrapper .tiptap figure:focus-within {
      border-color: #e5e7eb;
    }
    .tiptap-wrapper .tiptap figure img {
      margin: 0;
      border-radius: 8px 8px 0 0;
    }
    .tiptap-wrapper .tiptap figcaption {
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

    /* YouTube embed in editor */
    .tiptap-wrapper .tiptap div[data-youtube-video] {
      margin: 16px 0;
      border-radius: 8px;
      overflow: hidden;
    }
    .tiptap-wrapper .tiptap div[data-youtube-video] iframe {
      width: 100%;
      aspect-ratio: 16/9;
      border: none;
    }

    /* Embed preview blocks (Twitter, Instagram, TikTok in editor) */
    .tiptap-embed-preview {
      margin: 16px 0;
      padding: 16px;
      border-radius: 8px;
      border: 2px dashed #d1d5db;
      background: #f9fafb;
      text-align: center;
      user-select: none;
    }
    .tiptap-embed-preview .embed-badge {
      font-weight: 700;
      font-size: 1.1rem;
      margin-bottom: 6px;
    }
    .tiptap-embed-preview .embed-url {
      font-size: 0.8rem;
      color: #6b7280;
      word-break: break-all;
    }
    .tiptap-embed-twitter { border-color: #1d9bf0; background: #f0f9ff; }
    .tiptap-embed-instagram { border-color: #e1306c; background: #fff0f5; }
    .tiptap-embed-tiktok { border-color: #010101; background: #f5f5f5; }

    /* Gallery preview in editor */
    .tiptap-gallery-preview {
      margin: 16px 0;
      border: 2px dashed #487699;
      border-radius: 8px;
      background: #f0f7ff;
      user-select: none;
    }
    .gallery-preview-header {
      font-weight: 700;
      font-size: 0.95rem;
      padding: 10px 14px;
      border-bottom: 1px solid #d1e3f0;
      color: #1b3557;
    }
    .gallery-preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 8px;
      padding: 10px;
    }
    .gallery-preview-item {
      aspect-ratio: 1;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
    }
    .gallery-preview-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      margin: 0;
    }
    .gallery-preview-item span {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
      color: white;
      font-size: 9px;
      padding: 12px 5px 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .tiptap-btn {
        width: 44px;
        height: 44px;
        font-size: 16px;
      }
      .tiptap-toolbar {
        gap: 6px;
        padding: 10px 12px;
      }
    }
    @media (max-width: 600px) {
      .tiptap-toolbar {
        padding: 6px;
        gap: 3px;
      }
      .tiptap-btn {
        width: 36px;
        height: 36px;
        font-size: 14px;
        min-width: 36px;
      }
      .tiptap-separator {
        height: 20px;
        margin: 8px 2px;
        min-width: 1px;
      }
      .tiptap-wrapper .tiptap {
        min-height: 200px;
        max-height: none;
        padding: 12px;
        font-size: 16px;
      }
    }
  `;
  document.head.appendChild(style);
}


/* ================================================================
   CUSTOM EXTENSION — Markdown + HTML Paste
   Intercepts paste events and handles:
   1. Raw HTML pasted as text/plain (starts with < and has tags)
      → strip inline styles, parse via DOMParser, insert as nodes
   2. Markdown pasted as text/plain (# headings, **bold**, etc.)
      → convert via `marked`, then insert as nodes
   3. Everything else → falls through to Tiptap's default handler
      (this preserves the Cmd+C from rendered HTML workflow)
   ================================================================ */

const MARKDOWN_PATTERN = /(^#{1,6}\s|^\*\s|^-\s|^\d+\.\s|\*\*|__|\[.*?\]\(.*?\)|^>\s)/m;

// Detect raw HTML: must start with < and contain at least one closing tag or self-closing tag
function looksLikeHtml(text) {
  const t = text.trim();
  if (!t.startsWith('<')) return false;
  return /<\/[a-z]/i.test(t) || /<[a-z][^>]*\/>/i.test(t);
}

// Strip inline styles from an HTML string, keeping semantic tags intact
function stripInlineStyles(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
  div.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'));
  return div.innerHTML;
}

const MarkdownPaste = Extension.create({
  name: 'markdownPaste',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownPaste'),
        props: {
          handlePaste(view, event) {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            // If the clipboard already has rich text/html (e.g. Cmd+C from rendered HTML),
            // let Tiptap handle it natively — this preserves the existing workflow.
            const richHtml = clipboardData.getData('text/html');
            if (richHtml && richHtml.trim().length > 0) return false;

            const text = clipboardData.getData('text/plain');
            if (!text || !text.trim()) return false;

            let htmlToInsert = null;

            if (looksLikeHtml(text)) {
              // Case 1: raw HTML source pasted as plain text
              htmlToInsert = stripInlineStyles(text.trim());
            } else if (MARKDOWN_PATTERN.test(text)) {
              // Case 2: raw markdown
              htmlToInsert = marked.parse(text, { breaks: true });
            }

            if (!htmlToInsert) return false;

            // Parse the HTML into ProseMirror nodes
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlToInsert;

            const parser = ProseMirrorDOMParser.fromSchema(view.state.schema);
            const slice = parser.parseSlice(tempDiv, { preserveWhitespace: false });

            view.dispatch(view.state.tr.replaceSelection(slice));
            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});


/* ================================================================
   MAIN: TiptapEditor.create()
   ================================================================ */

const TiptapEditor = {
  /**
   * Create a Tiptap editor instance.
   * @param {string} containerId - DOM id for the editor container
   * @param {string} inputName  - name for the hidden input (kept for compat)
   * @param {string} initialContent - HTML to load
   * @returns {{ getValue, setValue, getPlainText, focus, element, editor }}
   */
  create(containerId, inputName = 'content', initialContent = '') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('TiptapEditor: Container not found:', containerId);
      return null;
    }

    injectStyles();

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'tiptap-wrapper';

    const editorEl = document.createElement('div');
    editorEl.className = 'tiptap-editor-area';
    wrapper.appendChild(editorEl);

    // Hidden input for form compat
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = inputName;
    hiddenInput.className = 'tiptap-hidden-input';
    wrapper.appendChild(hiddenInput);

    container.innerHTML = '';
    container.appendChild(wrapper);

    // Initialize Tiptap
    const editor = new Editor({
      element: editorEl,
      extensions: [
        StarterKit.configure({
          horizontalRule: false, // we use the standalone extension
        }),
        HorizontalRule,
        Youtube.configure({
          controls: true,
          nocookie: true,
          modestBranding: true,
        }),
        Image.configure({
          inline: false,
          allowBase64: false,
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        }),
        Placeholder.configure({
          placeholder: 'Escribe el contenido del articulo...',
        }),
        TwitterEmbed,
        InstagramEmbed,
        TikTokEmbed,
        Figure,
        Gallery,
        MarkdownPaste,
      ],
      content: initialContent || '',
      editorProps: {
        attributes: {
          class: 'tiptap',
        },
      },
    });

    // Register the auto-embed paste plugin
    editor.registerPlugin(createAutoEmbedPlugin(editor));

    // Create toolbar
    createToolbar(editor, wrapper);

    // Sync hidden input on every change
    const syncInput = () => {
      hiddenInput.value = editor.getHTML();
    };
    editor.on('update', syncInput);
    syncInput(); // initial sync

    return {
      getValue: () => editor.getHTML(),
      setValue: (html) => {
        editor.commands.setContent(html || '');
        hiddenInput.value = editor.getHTML();
      },
      getPlainText: () => editor.getText(),
      focus: () => editor.commands.focus(),
      element: editorEl.querySelector('.tiptap'),
      editor, // expose raw editor for advanced usage
      destroy: () => editor.destroy(),
    };
  },
};

// Expose globally
window.TiptapEditor = TiptapEditor;
