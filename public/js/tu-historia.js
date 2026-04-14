// ==================== TU HISTORIA — Submission Form ====================
// Handles client-side validation, photo uploads, rate limiting,
// honeypot anti-spam, and submission to historias_enviadas.

(function () {
  'use strict';

  const MAX_FILES = 5;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const RATE_LIMIT_KEY = 'tu_historia_submissions';
  const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24h
  const RATE_LIMIT_MAX = 3;

  // RFC 4122 v4 UUID (crypto-based when available, fallback otherwise)
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

  // ==================== STATE ====================

  const state = {
    files: [], // { id, file, previewUrl, progress, status }
    submitting: false,
  };

  // ==================== DOM ====================

  const form = document.getElementById('th-form');
  if (!form) return;

  const successPanel = document.getElementById('th-success');
  const successSubtext = document.getElementById('th-success-subtext');
  const errorBanner = document.getElementById('th-error');
  const rateLimitBanner = document.getElementById('th-rate-limit');
  const submitBtn = document.getElementById('th-submit');
  const submitLabel = document.getElementById('th-submit-label');
  const submitSpinner = document.getElementById('th-submit-spinner');
  const resetBtn = document.getElementById('th-reset');

  const fileInput = document.getElementById('th-fotos');
  const filesError = document.getElementById('th-fotos-error');
  const filesPreview = document.getElementById('th-fotos-preview');

  const menoresWrapper = document.getElementById('th-menores-wrapper');
  const menoresCheckbox = document.getElementById('th-auth-menores');
  const menoresNote = document.getElementById('th-menores-note');

  // Character counters
  bindCounter('th-titulo', 'th-titulo-count', 200);
  bindCounter('th-descripcion', 'th-descripcion-count', 3000);

  function bindCounter(inputId, counterId, max) {
    const input = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    if (!input || !counter) return;
    const update = () => {
      const len = input.value.length;
      counter.textContent = `${len} / ${max}`;
      counter.classList.toggle('text-rojo', len >= max);
    };
    input.addEventListener('input', update);
    update();
  }

  // ==================== REAL-TIME SUBMIT GATING ====================

  function isFormComplete() {
    var nombre = form.elements.nombre.value.trim();
    var email = form.elements.email.value.trim();
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var relacion = form.elements.relacion.value;
    var categoria = form.elements.categoria_sugerida.value;
    var titulo = form.elements.titulo.value.trim();
    var descripcion = form.elements.descripcion.value.trim();
    var ciudad = form.elements.ciudad_estado.value.trim();
    var authGeneral = form.elements.autorizacion_general.checked;
    return (
      nombre.length >= 3 &&
      emailRe.test(email) &&
      relacion !== '' &&
      categoria !== '' &&
      titulo.length > 0 &&
      descripcion.length > 0 &&
      ciudad.length > 0 &&
      authGeneral
    );
  }

  function updateSubmitState() {
    submitBtn.disabled = !isFormComplete();
  }

  ['th-nombre', 'th-email', 'th-relacion', 'th-categoria', 'th-titulo', 'th-descripcion', 'th-ciudad', 'th-auth-general'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateSubmitState);
      el.addEventListener('change', updateSubmitState);
    }
  });

  // ==================== FILE HANDLING ====================

  fileInput.addEventListener('change', (e) => {
    const newFiles = Array.from(e.target.files || []);
    addFiles(newFiles);
    // Reset the input so the same file can be re-selected if removed.
    fileInput.value = '';
  });

  // ==================== DRAG AND DROP ====================

  (function() {
    var dndStyle = document.createElement('style');
    dndStyle.textContent = '.th-dnd-over{border-style:solid!important;background-color:rgba(70,130,180,0.1)!important;border-color:#4682b4!important;}';
    document.head.appendChild(dndStyle);
  })();

  var fotosLabel = document.getElementById('th-fotos-label');
  if (fotosLabel) {
    fotosLabel.addEventListener('dragover', function(e) {
      e.preventDefault();
      fotosLabel.classList.add('th-dnd-over');
    });
    fotosLabel.addEventListener('dragleave', function() {
      fotosLabel.classList.remove('th-dnd-over');
    });
    fotosLabel.addEventListener('drop', function(e) {
      e.preventDefault();
      fotosLabel.classList.remove('th-dnd-over');
      var droppedFiles = Array.from(e.dataTransfer.files || []);
      addFiles(droppedFiles);
    });
  }

  function addFiles(newFiles) {
    filesError.textContent = '';
    filesError.classList.add('hidden');

    const errors = [];
    for (const file of newFiles) {
      if (state.files.length >= MAX_FILES) {
        errors.push(`Máximo ${MAX_FILES} fotos. Se ignoraron algunos archivos.`);
        break;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" no es una imagen válida (JPG, PNG o WebP).`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" excede el límite de 5MB.`);
        continue;
      }
      state.files.push({
        id: uuidv4(),
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: 'pending',
      });
    }

    if (errors.length) {
      filesError.textContent = errors.join(' ');
      filesError.classList.remove('hidden');
    }

    renderPreview();
    updateMenoresVisibility();
  }

  function removeFile(id) {
    const idx = state.files.findIndex((f) => f.id === id);
    if (idx === -1) return;
    URL.revokeObjectURL(state.files[idx].previewUrl);
    state.files.splice(idx, 1);
    renderPreview();
    updateMenoresVisibility();
  }

  function renderPreview() {
    if (state.files.length === 0) {
      filesPreview.innerHTML = '';
      filesPreview.classList.add('hidden');
      return;
    }
    filesPreview.classList.remove('hidden');
    filesPreview.innerHTML = state.files
      .map(
        (f) => `
        <div class="relative rounded-lg overflow-hidden border border-gris-border bg-gris-bg" data-file-id="${f.id}">
          <img src="${f.previewUrl}" alt="" class="w-full h-28 object-cover" />
          <button type="button" class="th-remove-file absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white text-sm flex items-center justify-center" aria-label="Eliminar foto" data-file-id="${f.id}">
            ×
          </button>
          <div class="px-2 py-1 text-[11px] text-gris-text truncate" title="${escapeHtml(f.file.name)}">${escapeHtml(f.file.name)}</div>
          <div class="th-progress-wrap h-1 bg-gris-border ${f.status === 'pending' ? 'hidden' : ''}">
            <div class="th-progress-bar h-full bg-steel-blue transition-all" style="width: ${f.progress}%"></div>
          </div>
        </div>
      `
      )
      .join('');

    filesPreview.querySelectorAll('.th-remove-file').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.submitting) return;
        removeFile(btn.getAttribute('data-file-id'));
      });
    });
  }

  function updateFileProgress(id, progress, status) {
    const file = state.files.find((f) => f.id === id);
    if (!file) return;
    file.progress = progress;
    if (status) file.status = status;
    const el = filesPreview.querySelector(`[data-file-id="${id}"]`);
    if (!el) return;
    const wrap = el.querySelector('.th-progress-wrap');
    const bar = el.querySelector('.th-progress-bar');
    if (wrap) wrap.classList.remove('hidden');
    if (bar) bar.style.width = `${progress}%`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // ==================== MINOR CONSENT VISIBILITY ====================

  function updateMenoresVisibility() {
    if (state.files.length > 0) {
      menoresWrapper.classList.remove('hidden');
    } else {
      menoresWrapper.classList.add('hidden');
      menoresCheckbox.checked = false;
      menoresNote.classList.add('hidden');
    }
  }

  menoresCheckbox.addEventListener('change', updateNoteVisibility);
  function updateNoteVisibility() {
    // The note only acts as a gentle reminder *after* a validation
    // attempt; it's cleared when the box is checked.
    if (menoresCheckbox.checked) {
      menoresNote.classList.add('hidden');
    }
  }

  // ==================== VALIDATION ====================

  function setFieldError(fieldId, message) {
    const msgEl = form.querySelector(`.th-error-msg[data-for="${fieldId}"]`);
    const field = document.getElementById(fieldId);
    if (message) {
      if (msgEl) {
        msgEl.textContent = message;
        msgEl.classList.remove('hidden');
      }
      if (field) field.classList.add('border-rojo');
    } else {
      if (msgEl) {
        msgEl.textContent = '';
        msgEl.classList.add('hidden');
      }
      if (field) field.classList.remove('border-rojo');
    }
  }

  function validate() {
    let firstInvalid = null;
    const mark = (id, msg) => {
      setFieldError(id, msg);
      if (msg && !firstInvalid) firstInvalid = document.getElementById(id);
    };

    const nombre = form.elements.nombre.value.trim();
    if (nombre.length < 3) mark('th-nombre', 'Ingresa tu nombre completo (mínimo 3 caracteres).');
    else mark('th-nombre', '');

    const email = form.elements.email.value.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) mark('th-email', 'Ingresa un email válido.');
    else mark('th-email', '');

    const relacion = form.elements.relacion.value;
    if (!relacion) mark('th-relacion', 'Selecciona tu relación con la historia.');
    else mark('th-relacion', '');

    const categoria = form.elements.categoria_sugerida.value;
    if (!categoria) mark('th-categoria', 'Selecciona una categoría.');
    else mark('th-categoria', '');

    const titulo = form.elements.titulo.value.trim();
    if (!titulo) mark('th-titulo', 'Escribe un título o tema.');
    else if (titulo.length > 200) mark('th-titulo', 'Máximo 200 caracteres.');
    else mark('th-titulo', '');

    const descripcion = form.elements.descripcion.value.trim();
    if (!descripcion) mark('th-descripcion', 'Cuéntanos qué pasó.');
    else if (descripcion.length > 3000) mark('th-descripcion', 'Máximo 3000 caracteres.');
    else mark('th-descripcion', '');

    const ciudad = form.elements.ciudad_estado.value.trim();
    if (!ciudad) mark('th-ciudad', 'Ingresa ciudad y estado.');
    else mark('th-ciudad', '');

    const authGeneral = form.elements.autorizacion_general.checked;
    if (!authGeneral) mark('th-auth-general', 'Debes aceptar los términos para enviar tu historia.');
    else mark('th-auth-general', '');

    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  // ==================== RATE LIMIT ====================

  function getRecentSubmissions() {
    try {
      const raw = localStorage.getItem(RATE_LIMIT_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      const cutoff = Date.now() - RATE_LIMIT_WINDOW;
      return arr.filter((ts) => typeof ts === 'number' && ts > cutoff);
    } catch (e) {
      return [];
    }
  }

  function recordSubmission() {
    try {
      const recent = getRecentSubmissions();
      recent.push(Date.now());
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
    } catch (e) {
      // Storage not available — ignore.
    }
  }

  function isRateLimited() {
    return getRecentSubmissions().length >= RATE_LIMIT_MAX;
  }

  // Show banner on load if already rate limited.
  if (isRateLimited()) {
    rateLimitBanner.classList.remove('hidden');
  }

  // ==================== SUBMIT ====================

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.submitting) return;

    errorBanner.classList.add('hidden');

    // Honeypot
    const honeypot = form.elements.website && form.elements.website.value;
    if (honeypot) {
      // Fake success — do not write to DB.
      console.warn('[tu-historia] Honeypot triggered. Silent-success.');
      showSuccess(form.elements.permitir_credito && form.elements.permitir_credito.checked);
      return;
    }

    // Rate limit
    if (isRateLimited()) {
      rateLimitBanner.classList.remove('hidden');
      rateLimitBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!validate()) return;

    // Warn (non-blocking) if photos attached but minors consent missing.
    if (state.files.length > 0 && !menoresCheckbox.checked) {
      menoresNote.classList.remove('hidden');
    }

    state.submitting = true;
    setSubmitBusy(true);

    const submissionId = uuidv4();

    try {
      // 1. Upload photos (if any)
      const photoPaths = [];
      for (const fileItem of state.files) {
        try {
          updateFileProgress(fileItem.id, 10, 'uploading');
          const path = await window.SupabaseHistorias.subirFotoHistoria(
            submissionId,
            fileItem.file
          );
          updateFileProgress(fileItem.id, 100, 'done');
          photoPaths.push(path);
        } catch (err) {
          console.error('[tu-historia] Upload failed for', fileItem.file.name, err);
          updateFileProgress(fileItem.id, 0, 'error');
          throw new Error('photo-upload-failed');
        }
      }

      // 2. Insert submission row
      const payload = {
        id: submissionId,
        nombre: form.elements.nombre.value.trim(),
        email: form.elements.email.value.trim(),
        telefono: form.elements.telefono.value.trim() || null,
        relacion: form.elements.relacion.value,
        categoria_sugerida: form.elements.categoria_sugerida.value,
        titulo: form.elements.titulo.value.trim(),
        descripcion: form.elements.descripcion.value.trim(),
        liga_organizacion: form.elements.liga_organizacion.value.trim() || null,
        ciudad_estado: form.elements.ciudad_estado.value.trim(),
        fotos: photoPaths,
        autorizacion_general: form.elements.autorizacion_general.checked,
        autorizacion_menores:
          state.files.length > 0 ? menoresCheckbox.checked : null,
        permitir_credito: form.elements.permitir_credito.checked,
      };

      await window.SupabaseHistorias.enviarHistoria(payload);

      recordSubmission();
      if (isRateLimited()) rateLimitBanner.classList.remove('hidden');

      showSuccess(payload.permitir_credito);
    } catch (err) {
      console.error('[tu-historia] Submission failed:', err);
      errorBanner.classList.remove('hidden');
      errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      state.submitting = false;
      setSubmitBusy(false);
    }
  });

  function setSubmitBusy(busy) {
    submitBtn.disabled = busy;
    if (busy) {
      submitLabel.textContent = 'Enviando...';
      submitSpinner.classList.remove('hidden');
    } else {
      submitLabel.textContent = 'Enviar mi historia';
      submitSpinner.classList.add('hidden');
    }
  }

  function showSuccess(withCredit) {
    form.classList.add('hidden');
    errorBanner.classList.add('hidden');
    if (withCredit) {
      successSubtext.textContent =
        'Nuestro equipo editorial la revisará. Si tu historia se publica, aparecerá en beisjoven.com con tu crédito como colaborador.';
    } else {
      successSubtext.textContent =
        'Nuestro equipo editorial la revisará. Si tu historia se publica, aparecerá en beisjoven.com.';
    }
    successPanel.classList.remove('hidden');
    successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  resetBtn.addEventListener('click', () => {
    // Clear form
    form.reset();
    // Clear files
    for (const f of state.files) URL.revokeObjectURL(f.previewUrl);
    state.files = [];
    renderPreview();
    updateMenoresVisibility();
    // Reset counters
    document.getElementById('th-titulo-count').textContent = '0 / 200';
    document.getElementById('th-descripcion-count').textContent = '0 / 3000';
    // Clear error states
    form.querySelectorAll('.th-error-msg').forEach((el) => {
      el.textContent = '';
      el.classList.add('hidden');
    });
    form.querySelectorAll('.border-rojo').forEach((el) => el.classList.remove('border-rojo'));
    filesError.textContent = '';
    filesError.classList.add('hidden');
    errorBanner.classList.add('hidden');
    // Reset default-checked credit box
    const credito = document.getElementById('th-credito');
    if (credito) credito.checked = true;
    // Swap panels
    successPanel.classList.add('hidden');
    form.classList.remove('hidden');
    updateSubmitState();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
