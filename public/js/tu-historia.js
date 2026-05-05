// ==================== TU HISTORIA — Submission Form (BJ-003a) ====================
// 3-step form: Tus datos / Tu historia / Revisión.
// Inline onBlur validation, lazy photo upload (uploaded only at final submit),
// autosave to localStorage every 5s, draft restore pill.
// Submit button has 5 explicit visual states — never the desaturated pink that
// previously read as "disabled, fix something".

(function () {
  'use strict';

  // ==================== CONSTANTS ====================

  const STORAGE_KEY = 'bj_tuhistoria_draft';
  const STORAGE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  const AUTOSAVE_DEBOUNCE = 5000;

  const MAX_FILES = 5;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per spec
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

  const RATE_LIMIT_KEY = 'tu_historia_submissions';
  const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000;
  const RATE_LIMIT_MAX = 3;

  const DESCRIPCION_MIN = 50;

  // Required field IDs per step. Step 3's only required is the general auth
  // checkbox — autorizacion_menores only appears when photos include minors.
  const REQUIRED_BY_STEP = {
    1: ['th-nombre', 'th-email', 'th-relacion', 'th-ciudad'],
    2: ['th-categoria', 'th-titulo', 'th-descripcion'],
    3: ['th-auth-general'],
  };

  // Scalar fields persisted to localStorage. File objects are intentionally
  // excluded — they aren't serializable and would bloat storage.
  const PERSISTED_FIELDS = [
    'nombre', 'email', 'telefono', 'relacion', 'ciudad_estado', 'liga_organizacion',
    'categoria_sugerida', 'titulo', 'descripcion', 'permitir_credito',
    'autorizacion_general', 'autorizacion_menores',
  ];

  const RELACION_LABELS = {
    entrenador: 'Entrenador/a',
    jugador: 'Jugador/a',
    padre_madre: 'Padre / Madre de familia',
    directivo_liga: 'Directivo/a de liga',
    periodista: 'Periodista',
    aficionado: 'Aficionado/a',
    otro: 'Otro',
  };

  const CATEGORIA_LABELS = {
    juvenil: 'Juvenil',
    softbol: 'Softbol',
    'liga-mexicana': 'Ligas Mexicanas',
    mlb: 'MLB',
    seleccion: 'Selección',
    opinion: 'Opinión',
  };

  // ==================== UTILITIES ====================

  function uuidv4() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function debounce(fn, delay) {
    let t = null;
    const debounced = (...args) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => { t = null; fn(...args); }, delay);
    };
    debounced.cancel = () => { if (t) { clearTimeout(t); t = null; } };
    return debounced;
  }

  function safeStorage() {
    try {
      const k = '__th_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return window.localStorage;
    } catch (_) {
      return null;
    }
  }

  // ==================== INIT ====================

  const form = document.getElementById('th-form');
  if (!form) return;

  try {
    init();
  } catch (err) {
    console.error('[TuHistoriaForm] init failed:', err);
  }

  function init() {
    const els = collectElements();
    const state = {
      currentStep: 1,
      files: [], // { id, file, previewUrl }
      submitting: false,
      submitted: false,
      restoredFileNames: [],
    };
    const storage = safeStorage();

    bindStepNavigation(els, state);
    bindFieldValidation(els, state);
    bindPhotoUpload(els, state);
    bindCounters(els);
    bindMenoresVisibility(els, state);
    bindAutosave(els, state, storage);
    bindDraftRestore(els, state, storage);
    bindSubmit(els, state, storage);

    // Initial UI sync
    renderPhotoGrid(els, state);
    updateStepUI(els, state);
    updateSubmitState(els, state);

    // Show rate-limit banner on load if applicable
    if (isRateLimited(storage)) {
      els.rateLimitBanner.classList.remove('hidden');
    }

    // Try to restore draft (shows pill if applicable)
    maybeShowDraftPill(els, storage);
  }

  // ==================== ELEMENT COLLECTION ====================

  function collectElements() {
    return {
      form,
      stepsList: document.getElementById('th-steps'),
      stepItems: Array.from(document.querySelectorAll('#th-steps .th-step')),
      stepLines: Array.from(document.querySelectorAll('#th-steps .th-step-line')),
      panels: Array.from(document.querySelectorAll('[data-step-content]')),
      nextButtons: Array.from(document.querySelectorAll('[data-step-next]')),
      prevButtons: Array.from(document.querySelectorAll('[data-step-prev]')),

      submitBtn: document.getElementById('th-submit'),
      submitLabel: document.getElementById('th-submit-label'),
      submitSpinner: document.getElementById('th-submit-spinner'),

      successPanel: document.getElementById('th-success'),
      successName: document.getElementById('th-success-name'),
      successEmail: document.getElementById('th-success-email'),
      errorBanner: document.getElementById('th-error'),
      rateLimitBanner: document.getElementById('th-rate-limit'),

      fileInput: document.getElementById('th-fotos'),
      photoGrid: document.getElementById('th-fotos-grid'),
      photoDropzone: document.getElementById('th-fotos-dropzone'),
      photoLimitMsg: document.getElementById('th-fotos-limit'),
      photoError: document.getElementById('th-fotos-error'),
      photoReadout: document.getElementById('th-fotos-readout'),

      menoresWrapper: document.getElementById('th-menores-wrapper'),
      menoresCheckbox: document.getElementById('th-auth-menores'),
      menoresNote: document.getElementById('th-menores-note'),

      authGeneral: document.getElementById('th-auth-general'),

      review: document.getElementById('th-review'),

      draftPill: document.getElementById('th-draft-pill'),
      draftRestoreBtn: document.getElementById('th-draft-restore'),
      draftDiscardBtn: document.getElementById('th-draft-discard'),

      tituloCount: document.getElementById('th-titulo-count'),
      descCount: document.getElementById('th-descripcion-count'),
    };
  }

  // ==================== STEP NAVIGATION ====================

  function bindStepNavigation(els, state) {
    els.nextButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        try {
          const target = parseInt(btn.getAttribute('data-step-next'), 10);
          goToStep(els, state, target, { validateCurrent: true });
        } catch (err) {
          console.error('[TuHistoriaForm] next-step failed:', err);
        }
      });
    });

    els.prevButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        try {
          const target = parseInt(btn.getAttribute('data-step-prev'), 10);
          goToStep(els, state, target, { validateCurrent: false });
        } catch (err) {
          console.error('[TuHistoriaForm] prev-step failed:', err);
        }
      });
    });

    // Click on a step number/label in the progress indicator: allow back-nav
    // to a completed (or earlier) step. Forward-nav blocked.
    els.stepItems.forEach((item) => {
      item.addEventListener('click', () => {
        try {
          const target = parseInt(item.getAttribute('data-step'), 10);
          if (target < state.currentStep) {
            goToStep(els, state, target, { validateCurrent: false });
          }
        } catch (err) {
          console.error('[TuHistoriaForm] step-click failed:', err);
        }
      });
      item.style.cursor = 'pointer';
    });
  }

  function goToStep(els, state, target, opts) {
    if (target === state.currentStep) return;
    if (target < 1 || target > 3) return;

    if (opts && opts.validateCurrent) {
      const ok = validateStep(els, state, state.currentStep, { showErrors: true });
      if (!ok) return;
    }

    state.currentStep = target;

    if (target === 3) {
      renderReview(els, state);
    }

    updateStepUI(els, state);
    updateSubmitState(els, state);

    // Scroll the form into view so the user lands on top of the new step.
    if (els.form && typeof els.form.scrollIntoView === 'function') {
      els.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function updateStepUI(els, state) {
    els.stepItems.forEach((item) => {
      const n = parseInt(item.getAttribute('data-step'), 10);
      let stateName = 'pending';
      if (n < state.currentStep) stateName = 'completed';
      else if (n === state.currentStep) stateName = 'current';
      item.setAttribute('data-state', stateName);
      item.setAttribute('aria-current', stateName === 'current' ? 'step' : 'false');
      const numEl = item.querySelector('.th-step-num');
      if (numEl) numEl.textContent = stateName === 'completed' ? '✓' : String(n);
    });

    els.stepLines.forEach((line, idx) => {
      // line at index 0 sits between step 1 and step 2; index 1 between 2 and 3
      const completed = state.currentStep > idx + 1;
      line.setAttribute('data-state', completed ? 'completed' : 'pending');
    });

    els.panels.forEach((panel) => {
      const n = parseInt(panel.getAttribute('data-step-content'), 10);
      if (n === state.currentStep) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
    });
  }

  // ==================== VALIDATION ====================

  function bindFieldValidation(els, state) {
    const ids = [
      ...REQUIRED_BY_STEP[1],
      ...REQUIRED_BY_STEP[2],
      ...REQUIRED_BY_STEP[3],
    ];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      el.addEventListener('blur', () => {
        try {
          validateField(id, { showErrors: true });
          updateSubmitState(els, state);
        } catch (err) {
          console.error('[TuHistoriaForm] blur-validation failed:', err);
        }
      });

      el.addEventListener('input', () => {
        try {
          // Clear error eagerly while typing once the field becomes valid.
          if (el.closest('.field')?.getAttribute('data-state') === 'error') {
            const result = validateField(id, { showErrors: false });
            if (result.valid) clearFieldError(id);
          }
          updateSubmitState(els, state);
        } catch (err) {
          console.error('[TuHistoriaForm] input-validation failed:', err);
        }
      });

      el.addEventListener('change', () => {
        try {
          validateField(id, { showErrors: true });
          updateSubmitState(els, state);
        } catch (err) {
          console.error('[TuHistoriaForm] change-validation failed:', err);
        }
      });
    });
  }

  function validateField(id, opts) {
    const el = document.getElementById(id);
    if (!el) return { valid: true };
    const wrapper = el.closest('.field');
    const showErrors = !!(opts && opts.showErrors);

    let valid = true;
    let message = '';
    const rawValue = el.type === 'checkbox' ? el.checked : el.value;

    if (el.dataset.required === 'true') {
      if (el.type === 'checkbox') {
        if (!el.checked) {
          valid = false;
          message = el.dataset.errorEmpty || 'Este campo es obligatorio';
        }
      } else {
        const v = String(rawValue || '').trim();
        if (!v) {
          valid = false;
          message = el.dataset.errorEmpty || 'Este campo es obligatorio';
        } else if (id === 'th-email') {
          const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!re.test(v)) {
            valid = false;
            message = el.dataset.errorFormat || 'Ingresa un correo válido';
          }
        } else if (id === 'th-nombre') {
          if (v.length < 3) {
            valid = false;
            message = el.dataset.errorMin || 'Mínimo 3 caracteres';
          }
        } else if (id === 'th-descripcion') {
          if (v.length < DESCRIPCION_MIN) {
            valid = false;
            message = el.dataset.errorMin || `Mínimo ${DESCRIPCION_MIN} caracteres`;
          } else if (el.maxLength > 0 && v.length > el.maxLength) {
            valid = false;
            message = el.dataset.errorMax || `Máximo ${el.maxLength} caracteres`;
          }
        } else if (id === 'th-titulo') {
          if (el.maxLength > 0 && v.length > el.maxLength) {
            valid = false;
            message = el.dataset.errorMax || `Máximo ${el.maxLength} caracteres`;
          }
        }
      }
    }

    if (showErrors && wrapper) {
      if (!valid) {
        applyFieldError(id, message);
      } else {
        clearFieldError(id);
      }
    }

    return { valid, message };
  }

  function applyFieldError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    const wrapper = el.closest('.field');
    if (!wrapper) return;
    wrapper.setAttribute('data-state', 'error');
    const hint = wrapper.querySelector('.hint');
    if (hint) {
      const textNode = hint.querySelector('[data-hint-text]');
      if (textNode) {
        textNode.textContent = message;
      } else {
        // Preserve auxiliary children (e.g., counter span) by only updating the
        // first text node.
        const firstChild = hint.firstChild;
        if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
          firstChild.nodeValue = message;
        } else {
          hint.textContent = message;
        }
      }
    }
  }

  function clearFieldError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const wrapper = el.closest('.field');
    if (!wrapper) return;
    wrapper.removeAttribute('data-state');
    const hint = wrapper.querySelector('.hint');
    if (!hint) return;
    const defaultText = hint.getAttribute('data-hint-default') || '';
    const textNode = hint.querySelector('[data-hint-text]');
    if (textNode) {
      textNode.textContent = defaultText;
    } else {
      const firstChild = hint.firstChild;
      if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
        firstChild.nodeValue = defaultText;
      } else if (defaultText) {
        hint.textContent = defaultText;
      }
    }
  }

  function validateStep(els, state, step, opts) {
    const ids = REQUIRED_BY_STEP[step] || [];
    let allValid = true;
    let firstInvalid = null;
    ids.forEach((id) => {
      const r = validateField(id, opts);
      if (!r.valid) {
        allValid = false;
        if (!firstInvalid) firstInvalid = document.getElementById(id);
      }
    });

    if (!allValid && opts && opts.showErrors && firstInvalid) {
      try {
        firstInvalid.focus({ preventScroll: false });
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (_) { /* focus may fail in some browsers */ }
    }
    return allValid;
  }

  // ==================== CHARACTER COUNTERS ====================

  function bindCounters(els) {
    const wire = (inputId, counterEl, max) => {
      const input = document.getElementById(inputId);
      if (!input || !counterEl) return;
      const update = () => {
        const len = input.value.length;
        counterEl.textContent = `${len} / ${max}`;
        counterEl.style.color = len >= max ? '#C8102E' : '';
      };
      input.addEventListener('input', update);
      update();
    };
    wire('th-titulo', els.tituloCount, 200);
    wire('th-descripcion', els.descCount, 3000);
  }

  // ==================== PHOTO UPLOAD ====================

  function bindPhotoUpload(els, state) {
    if (!els.fileInput) return;

    els.fileInput.addEventListener('change', (e) => {
      try {
        const newFiles = Array.from(e.target.files || []);
        addFiles(els, state, newFiles);
        els.fileInput.value = ''; // allow re-selecting the same file after a remove
      } catch (err) {
        console.error('[TuHistoriaForm] file-change failed:', err);
      }
    });

    // Large drop zone: click + drag-and-drop. Also reacts to global drag so
    // the user gets visual feedback the moment they drag a file into the page.
    if (els.photoDropzone) {
      try {
        els.photoDropzone.addEventListener('click', (e) => {
          e.preventDefault();
          if (state.submitting) return;
          els.fileInput.click();
        });
        els.photoDropzone.addEventListener('dragenter', (e) => {
          e.preventDefault();
          if (state.submitting) return;
          els.photoDropzone.classList.add('th-dnd-over');
        });
        els.photoDropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (state.submitting) return;
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
          els.photoDropzone.classList.add('th-dnd-over');
        });
        els.photoDropzone.addEventListener('dragleave', (e) => {
          // Only clear when the cursor leaves the zone itself, not when moving
          // between child elements.
          if (e.relatedTarget && els.photoDropzone.contains(e.relatedTarget)) return;
          els.photoDropzone.classList.remove('th-dnd-over');
        });
        els.photoDropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          els.photoDropzone.classList.remove('th-dnd-over');
          if (state.submitting) return;
          try {
            const dropped = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
            addFiles(els, state, dropped);
          } catch (err) {
            console.error('[TuHistoriaForm] dropzone-drop failed:', err);
          }
        });
      } catch (err) {
        console.error('[TuHistoriaForm] dropzone bind failed:', err);
      }
    }

    // Window-level drag listeners — activate the zone visually whenever a file
    // is being dragged anywhere on the page, so the affordance is obvious.
    try {
      let dragDepth = 0;
      const setGlobalDragOver = (on) => {
        if (state.submitting) return;
        if (state.files.length >= MAX_FILES) return;
        if (els.photoDropzone && !els.photoDropzone.hidden) {
          els.photoDropzone.classList.toggle('th-dnd-over', !!on);
        }
        const miniAdd = els.photoGrid && els.photoGrid.querySelector('#th-photo-add');
        if (miniAdd) miniAdd.classList.toggle('th-dnd-over', !!on);
      };
      const isFileDrag = (e) => {
        if (!e.dataTransfer) return false;
        const types = e.dataTransfer.types;
        if (!types) return false;
        return Array.prototype.indexOf.call(types, 'Files') !== -1;
      };
      window.addEventListener('dragenter', (e) => {
        if (!isFileDrag(e)) return;
        dragDepth++;
        setGlobalDragOver(true);
      });
      window.addEventListener('dragleave', (e) => {
        if (!isFileDrag(e)) return;
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) setGlobalDragOver(false);
      });
      window.addEventListener('dragover', (e) => {
        // Prevent the browser from opening the image if the user misses the zone.
        if (isFileDrag(e)) e.preventDefault();
      });
      window.addEventListener('drop', (e) => {
        if (isFileDrag(e)) {
          // If the drop is outside our zone, prevent the browser from
          // navigating to / opening the dropped file.
          const onZone = els.photoDropzone && els.photoDropzone.contains(e.target);
          const onMini = els.photoGrid && els.photoGrid.contains(e.target);
          if (!onZone && !onMini) e.preventDefault();
        }
        dragDepth = 0;
        setGlobalDragOver(false);
      });
    } catch (err) {
      console.error('[TuHistoriaForm] window-drag bind failed:', err);
    }
  }

  function addFiles(els, state, newFiles) {
    if (els.photoError) {
      els.photoError.textContent = '';
      els.photoError.classList.add('hidden');
    }

    const errors = [];
    for (const file of newFiles) {
      if (state.files.length >= MAX_FILES) {
        errors.push(`Máximo ${MAX_FILES} fotos. Se ignoraron archivos extra.`);
        break;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" no es una imagen válida (JPG, PNG, WebP o HEIC).`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" excede el límite de ${formatBytes(MAX_FILE_SIZE)}.`);
        continue;
      }
      let previewUrl = '';
      try {
        previewUrl = URL.createObjectURL(file);
      } catch (_) {
        previewUrl = '';
      }
      state.files.push({
        id: uuidv4(),
        file,
        previewUrl,
        progress: 0,
        status: 'pending',
      });
    }

    if (errors.length && els.photoError) {
      els.photoError.textContent = errors.join(' ');
      els.photoError.classList.remove('hidden');
    }

    state.restoredFileNames = []; // user has now picked real files
    renderPhotoGrid(els, state);
    updateMenoresVisibility(els, state);
  }

  function removeFile(els, state, id) {
    const idx = state.files.findIndex((f) => f.id === id);
    if (idx === -1) return;
    try {
      if (state.files[idx].previewUrl) URL.revokeObjectURL(state.files[idx].previewUrl);
    } catch (_) { /* ignore */ }
    state.files.splice(idx, 1);
    renderPhotoGrid(els, state);
    updateMenoresVisibility(els, state);
  }

  function renderPhotoGrid(els, state) {
    if (!els.photoGrid) return;

    const count = state.files.length;

    // Toggle large dropzone (only when 0 files), grid (when >=1 file),
    // limit message (when 5 files).
    if (els.photoDropzone) {
      els.photoDropzone.hidden = count > 0;
      if (count > 0) els.photoDropzone.classList.remove('th-dnd-over');
    }
    els.photoGrid.hidden = count === 0;
    if (els.photoLimitMsg) {
      els.photoLimitMsg.classList.toggle('hidden', count < MAX_FILES);
    }

    const slots = state.files.map((f) => `
      <div class="th-photo-slot" data-file-id="${escapeHtml(f.id)}">
        <img src="${escapeHtml(f.previewUrl)}" alt="${escapeHtml(f.file.name)}" />
        <button type="button" class="th-photo-remove" data-file-id="${escapeHtml(f.id)}" aria-label="Eliminar foto ${escapeHtml(f.file.name)}">×</button>
        ${f.status === 'uploading' || f.status === 'done' ? `
          <div class="th-photo-progress">
            <div class="th-photo-progress-bar" style="width:${f.progress}%"></div>
          </div>
        ` : ''}
      </div>
    `).join('');

    // Mini "+" slot at end of grid only when 1..(MAX-1) photos. At 0 photos
    // the large dropzone takes over; at MAX, no add affordance is shown.
    let addSlot = '';
    if (count > 0 && count < MAX_FILES) {
      addSlot = `
        <button type="button" class="th-photo-add" id="th-photo-add" aria-label="Agregar otra foto">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      `;
    }

    els.photoGrid.innerHTML = slots + addSlot;

    // Wire remove buttons
    els.photoGrid.querySelectorAll('.th-photo-remove').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (state.submitting) return;
        const id = btn.getAttribute('data-file-id');
        removeFile(els, state, id);
      });
    });

    // Wire add slot (click + drag-and-drop)
    const addBtn = els.photoGrid.querySelector('#th-photo-add');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (state.submitting) return;
        els.fileInput.click();
      });
      addBtn.addEventListener('dragover', (e) => {
        e.preventDefault();
        addBtn.classList.add('th-dnd-over');
      });
      addBtn.addEventListener('dragleave', () => {
        addBtn.classList.remove('th-dnd-over');
      });
      addBtn.addEventListener('drop', (e) => {
        e.preventDefault();
        addBtn.classList.remove('th-dnd-over');
        try {
          const dropped = Array.from(e.dataTransfer.files || []);
          addFiles(els, state, dropped);
        } catch (err) {
          console.error('[TuHistoriaForm] drop failed:', err);
        }
      });
    }

    // Readout
    if (els.photoReadout) {
      if (state.files.length === 0 && state.restoredFileNames.length > 0) {
        els.photoReadout.textContent = `Tu borrador tenía ${state.restoredFileNames.length} foto(s) — vuelve a subirlas si quieres incluirlas.`;
      } else if (state.files.length === 0) {
        els.photoReadout.textContent = '';
      } else {
        const totalSize = state.files.reduce((s, f) => s + f.file.size, 0);
        const formats = Array.from(new Set(state.files.map((f) => f.file.type.split('/')[1].toUpperCase()))).join(', ');
        els.photoReadout.textContent = `${state.files.length} de ${MAX_FILES} foto(s) · ${formatBytes(totalSize)} · ${formats}`;
      }
    }
  }

  function updateFileProgress(els, state, id, progress, status) {
    const file = state.files.find((f) => f.id === id);
    if (!file) return;
    file.progress = progress;
    if (status) file.status = status;
    const slot = els.photoGrid.querySelector(`[data-file-id="${id}"]`);
    if (!slot) return;
    let bar = slot.querySelector('.th-photo-progress-bar');
    if (!bar) {
      const wrap = document.createElement('div');
      wrap.className = 'th-photo-progress';
      wrap.innerHTML = `<div class="th-photo-progress-bar" style="width:${progress}%"></div>`;
      slot.appendChild(wrap);
      bar = wrap.querySelector('.th-photo-progress-bar');
    }
    if (bar) bar.style.width = `${progress}%`;
  }

  // ==================== MENORES VISIBILITY ====================

  function bindMenoresVisibility(els, state) {
    if (!els.menoresCheckbox) return;
    els.menoresCheckbox.addEventListener('change', () => {
      try {
        if (els.menoresCheckbox.checked && els.menoresNote) {
          els.menoresNote.classList.add('hidden');
        }
      } catch (err) {
        console.error('[TuHistoriaForm] menores-change failed:', err);
      }
    });
  }

  function updateMenoresVisibility(els, state) {
    if (!els.menoresWrapper) return;
    if (state.files.length > 0) {
      els.menoresWrapper.classList.remove('hidden');
    } else {
      els.menoresWrapper.classList.add('hidden');
      if (els.menoresCheckbox) els.menoresCheckbox.checked = false;
      if (els.menoresNote) els.menoresNote.classList.add('hidden');
    }
  }

  // ==================== AUTOSAVE ====================

  function bindAutosave(els, state, storage) {
    if (!storage) return;
    const save = debounce(() => {
      try {
        if (state.submitted) return;
        const draft = serializeDraft(els, state);
        if (!draft) return;
        storage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } catch (err) {
        console.error('[TuHistoriaForm] autosave failed:', err);
      }
    }, AUTOSAVE_DEBOUNCE);

    els.form.addEventListener('input', save);
    els.form.addEventListener('change', save);

    state._autosave = save;
  }

  function serializeDraft(els, state) {
    const data = {};
    PERSISTED_FIELDS.forEach((name) => {
      const el = els.form.elements[name];
      if (!el) return;
      if (el.type === 'checkbox') {
        data[name] = !!el.checked;
      } else {
        data[name] = el.value || '';
      }
    });

    // Don't store an empty draft.
    const hasContent = Object.entries(data).some(([k, v]) => {
      if (k === 'permitir_credito' && v === true) return false; // default
      if (typeof v === 'string') return v.trim().length > 0;
      if (typeof v === 'boolean') return v;
      return false;
    });
    if (!hasContent) return null;

    return {
      version: 1,
      ts: Date.now(),
      currentStep: state.currentStep,
      fileNames: state.files.map((f) => ({ name: f.file.name, size: f.file.size })),
      data,
    };
  }

  function bindDraftRestore(els, state, storage) {
    if (!els.draftRestoreBtn || !els.draftDiscardBtn) return;
    els.draftRestoreBtn.addEventListener('click', () => {
      try {
        const draft = readDraft(storage);
        if (!draft) {
          hideDraftPill(els);
          return;
        }
        applyDraft(els, state, draft);
        hideDraftPill(els);
      } catch (err) {
        console.error('[TuHistoriaForm] restore-draft failed:', err);
      }
    });
    els.draftDiscardBtn.addEventListener('click', () => {
      try {
        if (storage) storage.removeItem(STORAGE_KEY);
        hideDraftPill(els);
      } catch (err) {
        console.error('[TuHistoriaForm] discard-draft failed:', err);
      }
    });
  }

  function readDraft(storage) {
    if (!storage) return null;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (typeof parsed.ts !== 'number') return null;
      if (Date.now() - parsed.ts > STORAGE_TTL) {
        storage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function maybeShowDraftPill(els, storage) {
    const draft = readDraft(storage);
    if (!draft) return;
    if (!els.draftPill) return;
    els.draftPill.classList.remove('hidden');
  }

  function hideDraftPill(els) {
    if (els.draftPill) els.draftPill.classList.add('hidden');
  }

  function applyDraft(els, state, draft) {
    if (!draft || !draft.data) return;
    Object.entries(draft.data).forEach(([name, value]) => {
      const el = els.form.elements[name];
      if (!el) return;
      if (el.type === 'checkbox') {
        el.checked = !!value;
      } else {
        el.value = value || '';
      }
    });
    state.restoredFileNames = Array.isArray(draft.fileNames) ? draft.fileNames : [];
    state.currentStep = Math.max(1, Math.min(3, parseInt(draft.currentStep, 10) || 1));

    // Refresh dependent UI
    updateMenoresVisibility(els, state);
    renderPhotoGrid(els, state);
    if (state.currentStep === 3) renderReview(els, state);
    updateStepUI(els, state);

    // Trigger character counters
    const tEvent = new Event('input', { bubbles: true });
    const titulo = document.getElementById('th-titulo');
    const desc = document.getElementById('th-descripcion');
    if (titulo) titulo.dispatchEvent(tEvent);
    if (desc) desc.dispatchEvent(tEvent);

    updateSubmitState(els, state);
  }

  // ==================== REVIEW (STEP 3) ====================

  function renderReview(els, state) {
    if (!els.review) return;
    const f = els.form.elements;

    const get = (name) => {
      const el = f[name];
      if (!el) return '';
      return (el.value || '').trim();
    };

    const nombre = get('nombre');
    const email = get('email');
    const telefono = get('telefono');
    const relacion = get('relacion');
    const ciudad = get('ciudad_estado');
    const liga = get('liga_organizacion');
    const categoria = get('categoria_sugerida');
    const titulo = get('titulo');
    const descripcion = get('descripcion');
    const credito = f.permitir_credito && f.permitir_credito.checked;

    const empty = '<dd class="th-review-empty">— sin especificar —</dd>';

    const datosHtml = `
      <div class="th-review-section">
        <h3>Tus datos</h3>
        <dl>
          <dt>Nombre</dt>${nombre ? `<dd>${escapeHtml(nombre)}</dd>` : empty}
          <dt>Email</dt>${email ? `<dd>${escapeHtml(email)}</dd>` : empty}
          ${telefono ? `<dt>Teléfono</dt><dd>${escapeHtml(telefono)}</dd>` : ''}
          <dt>Relación</dt>${relacion ? `<dd>${escapeHtml(RELACION_LABELS[relacion] || relacion)}</dd>` : empty}
          <dt>Ciudad / Estado</dt>${ciudad ? `<dd>${escapeHtml(ciudad)}</dd>` : empty}
          ${liga ? `<dt>Liga / Organización</dt><dd>${escapeHtml(liga)}</dd>` : ''}
        </dl>
      </div>
    `;

    const photosHtml = state.files.length
      ? `
        <div class="th-review-section">
          <h3>Fotos</h3>
          <div class="th-review-photos">
            ${state.files.map((p) => `<img src="${escapeHtml(p.previewUrl)}" alt="${escapeHtml(p.file.name)}" />`).join('')}
          </div>
        </div>
      `
      : '';

    const historiaHtml = `
      <div class="th-review-section">
        <h3>Tu historia</h3>
        <dl>
          <dt>Categoría sugerida</dt>
          <dd>${categoria ? `<span class="th-review-chip">${escapeHtml(CATEGORIA_LABELS[categoria] || categoria)}</span>` : '— sin especificar —'}</dd>
          <dt>Título</dt>
          <dd>${titulo ? `<p class="th-review-title">${escapeHtml(titulo)}</p>` : '<span class="th-review-empty">— sin especificar —</span>'}</dd>
          <dt>Descripción</dt>
          <dd>${descripcion ? `<p class="th-review-desc">${escapeHtml(descripcion)}</p>` : '<span class="th-review-empty">— sin especificar —</span>'}</dd>
          <dt>Crédito</dt>
          <dd>${credito ? 'Sí, quiero aparecer como colaborador.' : 'No.'}</dd>
        </dl>
      </div>
      ${photosHtml}
    `;

    els.review.innerHTML = datosHtml + historiaHtml;
  }

  // ==================== SUBMIT BUTTON STATE ====================

  function updateSubmitState(els, state) {
    if (!els.submitBtn) return;

    if (state.submitting) {
      setSubmitState(els, 'loading');
      return;
    }

    if (state.submitted) {
      setSubmitState(els, 'success');
      return;
    }

    // Disabled unless we're on step 3 with all required step-3 fields valid
    // AND prior steps are complete (silent re-validation).
    const onLastStep = state.currentStep === 3;
    const step1Valid = REQUIRED_BY_STEP[1].every((id) => validateField(id, { showErrors: false }).valid);
    const step2Valid = REQUIRED_BY_STEP[2].every((id) => validateField(id, { showErrors: false }).valid);
    const step3Valid = REQUIRED_BY_STEP[3].every((id) => validateField(id, { showErrors: false }).valid);

    if (onLastStep && step1Valid && step2Valid && step3Valid) {
      setSubmitState(els, 'default');
    } else {
      setSubmitState(els, 'disabled');
    }
  }

  function setSubmitState(els, name) {
    const btn = els.submitBtn;
    btn.setAttribute('data-state', name);
    btn.disabled = (name === 'disabled' || name === 'loading');
    if (name === 'loading') {
      els.submitLabel.textContent = 'Enviando…';
      els.submitSpinner.classList.remove('hidden');
    } else if (name === 'success') {
      els.submitLabel.textContent = 'Enviado ✓';
      els.submitSpinner.classList.add('hidden');
    } else {
      els.submitLabel.textContent = 'Enviar mi historia';
      els.submitSpinner.classList.add('hidden');
    }
  }

  // ==================== RATE LIMIT ====================

  function getRecentSubmissions(storage) {
    if (!storage) return [];
    try {
      const raw = storage.getItem(RATE_LIMIT_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      const cutoff = Date.now() - RATE_LIMIT_WINDOW;
      return arr.filter((ts) => typeof ts === 'number' && ts > cutoff);
    } catch (_) {
      return [];
    }
  }

  function recordSubmission(storage) {
    if (!storage) return;
    try {
      const recent = getRecentSubmissions(storage);
      recent.push(Date.now());
      storage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
    } catch (_) { /* ignore */ }
  }

  function isRateLimited(storage) {
    return getRecentSubmissions(storage).length >= RATE_LIMIT_MAX;
  }

  // ==================== SUBMIT ====================

  function bindSubmit(els, state, storage) {
    els.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (state.submitting) return;

      els.errorBanner.classList.add('hidden');

      try {
        // Honeypot
        const honeypot = els.form.elements.website && els.form.elements.website.value;
        if (honeypot) {
          console.warn('[TuHistoriaForm] honeypot triggered — silent success');
          const f = els.form.elements;
          showSuccess(els, state, {
            nombre: (f.nombre.value || '').trim(),
            email: (f.email.value || '').trim(),
          }, storage);
          return;
        }

        if (isRateLimited(storage)) {
          els.rateLimitBanner.classList.remove('hidden');
          els.rateLimitBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }

        // Validate every step before submit
        const ok1 = validateStep(els, state, 1, { showErrors: true });
        const ok2 = validateStep(els, state, 2, { showErrors: true });
        const ok3 = validateStep(els, state, 3, { showErrors: true });
        if (!ok1) { goToStep(els, state, 1, { validateCurrent: false }); return; }
        if (!ok2) { goToStep(els, state, 2, { validateCurrent: false }); return; }
        if (!ok3) return;

        // If photos attached but minor consent missing, hint (non-blocking).
        if (state.files.length > 0 && els.menoresCheckbox && !els.menoresCheckbox.checked && els.menoresNote) {
          els.menoresNote.classList.remove('hidden');
        }

        state.submitting = true;
        if (state._autosave) state._autosave.cancel();
        updateSubmitState(els, state);

        const submissionId = uuidv4();

        // Lazy upload — only at submit time
        const photoPaths = [];
        for (const fileItem of state.files) {
          try {
            updateFileProgress(els, state, fileItem.id, 10, 'uploading');
            const path = await window.SupabaseHistorias.subirFotoHistoria(submissionId, fileItem.file);
            updateFileProgress(els, state, fileItem.id, 100, 'done');
            photoPaths.push(path);
          } catch (err) {
            console.error('[TuHistoriaForm] photo-upload failed:', err);
            updateFileProgress(els, state, fileItem.id, 0, 'error');
            throw new Error('photo-upload-failed');
          }
        }

        const f = els.form.elements;
        const payload = {
          id: submissionId,
          nombre: (f.nombre.value || '').trim(),
          email: (f.email.value || '').trim(),
          telefono: (f.telefono.value || '').trim() || null,
          relacion: f.relacion.value,
          categoria_sugerida: f.categoria_sugerida.value,
          titulo: (f.titulo.value || '').trim(),
          descripcion: (f.descripcion.value || '').trim(),
          liga_organizacion: (f.liga_organizacion.value || '').trim() || null,
          ciudad_estado: (f.ciudad_estado.value || '').trim(),
          fotos: photoPaths,
          autorizacion_general: f.autorizacion_general.checked,
          autorizacion_menores: state.files.length > 0 ? els.menoresCheckbox.checked : null,
          permitir_credito: f.permitir_credito.checked,
        };

        await window.SupabaseHistorias.enviarHistoria(payload);

        recordSubmission(storage);
        if (isRateLimited(storage)) els.rateLimitBanner.classList.remove('hidden');

        // Fire-and-forget email notification — never blocks success.
        // Sends BOTH the internal editorial notification AND the user confirmation.
        try {
          fetch('/api/notify-historia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre: payload.nombre,
              email: payload.email,
              titulo: payload.titulo,
              categoria: payload.categoria_sugerida,
              ciudad: payload.ciudad_estado,
            }),
          }).catch((err) => console.error('[notify-historia] email request failed:', err));
        } catch (err) {
          console.error('[notify-historia] dispatch failed:', err);
        }

        // Clear draft on successful submit
        try {
          if (storage) storage.removeItem(STORAGE_KEY);
        } catch (err) {
          console.error('[TuHistoriaForm] draft-clear failed:', err);
        }

        state.submitted = true;
        setSubmitState(els, 'success');

        // Brief success-state pause, then swap to the success panel.
        setTimeout(() => showSuccess(els, state, payload, storage), 600);
      } catch (err) {
        console.error('[TuHistoriaForm] submit failed:', err);
        els.errorBanner.classList.remove('hidden');
        els.errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } finally {
        if (!state.submitted) {
          state.submitting = false;
          updateSubmitState(els, state);
        }
      }
    });
  }

  function showSuccess(els, state, payload, storage) {
    els.form.classList.add('hidden');
    els.errorBanner.classList.add('hidden');
    if (els.draftPill) els.draftPill.classList.add('hidden');

    // Personalize: first name + email. Falls back to "amigo" if anything missing.
    const fullName = (payload && payload.nombre) ? String(payload.nombre).trim() : '';
    const firstName = fullName ? fullName.split(/\s+/)[0] : 'amigo';
    const email = (payload && payload.email) ? String(payload.email).trim() : '';

    if (els.successName) els.successName.textContent = firstName;
    if (els.successEmail) els.successEmail.textContent = email || 'tu correo';

    if (els.successPanel) {
      els.successPanel.classList.remove('hidden');
      els.successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
})();
