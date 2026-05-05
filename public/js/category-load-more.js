// BJ-006: Category page "Cargar más artículos" load-more handler.
// Requires window.supabase (Supabase CDN) loaded before this script.
(function () {
  var SB_URL = 'https://yulkbjpotfmwqkzzfegg.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bGtianBvdGZtd3FrenpmZWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2OTk3NTYsImV4cCI6MjA4NTI3NTc1Nn0.PK8mq4CeQkTdurdJ1EV_GOkrY2X4SCsst8O1NnoBWAU';

  var grid = document.getElementById('articles-grid');
  var btn  = document.getElementById('load-more-btn');
  var link = document.getElementById('next-page-link');
  var wrap = document.getElementById('load-more-container');
  if (!grid || !btn) return;

  var db         = window.supabase.createClient(SB_URL, SB_KEY);
  var catSlug    = grid.dataset.categorySlug;
  var catName    = grid.dataset.categoryName;
  var pageSize   = parseInt(grid.dataset.pageSize, 10);
  var offset     = parseInt(grid.dataset.nextOffset, 10);
  var totalPages = parseInt(grid.dataset.totalPages, 10);
  var loadedPage = parseInt(grid.dataset.currentPage, 10);
  var lastBucket = grid.dataset.lastBucket;
  var busy       = false;

  var MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var DIA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  var CATS = {
    mlb:            'var(--cat-mlb)',
    'liga-mexicana':'var(--cat-liga-mexicana)',
    seleccion:      'var(--cat-seleccion)',
    softbol:        'var(--cat-softbol)',
    juvenil:        'var(--cat-juvenil)',
    opinion:        'var(--cat-opinion)'
  };

  function bucket(s) {
    if (!s) return 'Sin fecha';
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var p = s.split('T')[0].split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var n = Math.round((t - d) / 86400000);
    if (n === 0) return 'Hoy';
    if (n === 1) return 'Ayer';
    if (n <= 6)  return DIA[d.getDay()] + ' ' + d.getDate() + ' ' + MES[d.getMonth()];
    return d.getDate() + ' ' + MES[d.getMonth()] + ' ' + d.getFullYear();
  }

  function relDate(s) {
    var ms = Date.now() - new Date(s).getTime();
    var m  = Math.floor(ms / 60000);
    var h  = Math.floor(m / 60);
    var dy = Math.floor(h / 24);
    if (m < 60)  return 'hace ' + m + ' min';
    if (h < 24)  return 'hace ' + h + 'h';
    if (dy < 7)  return 'hace ' + dy + 'd';
    var d = new Date(s);
    return d.getDate() + ' ' + MES[d.getMonth()] + ' ' + d.getFullYear();
  }

  function esc(s) {
    var e = document.createElement('div');
    e.textContent = s || '';
    return e.innerHTML;
  }

  function mkDivider(label) {
    var w = document.createElement('div');
    w.className = 'col-span-full';
    w.style.cssText = 'margin:32px 0 20px;padding-bottom:8px;border-bottom:1px solid var(--rule)';
    var h = document.createElement('h3');
    h.className = 'uppercase font-semibold text-navy';
    h.style.cssText = 'font-size:11px;line-height:1;letter-spacing:0.08em;font-family:var(--font-body)';
    h.textContent = label;
    w.appendChild(h);
    return w;
  }

  function mkCard(a) {
    var cs = (a.categoria || {}).slug  || '';
    var cn = (a.categoria || {}).nombre || '';
    var bg = CATS[cs] || 'var(--navy)';
    var fg = cs === 'juvenil' ? 'var(--navy)' : '#fff';
    var href = '/articulo/' + a.slug;
    var el = document.createElement('article');
    el.className = 'group bg-white rounded-lg overflow-hidden border border-gris-border/60 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer';
    el.innerHTML =
      '<a href="' + href + '" class="block overflow-hidden">' +
        '<div class="aspect-[16/9] overflow-hidden">' +
          '<img src="' + esc(a.imagen_url || '') + '" alt="' + esc(a.titulo) + '" loading="lazy"' +
            ' class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"/>' +
        '</div></a>' +
      '<div class="p-4">' +
        (cs
          ? '<a href="/categoria/' + cs + '" class="inline-block font-bold uppercase rounded-sm' +
              ' transition-opacity hover:opacity-80 text-[10px] px-1.5 py-0.5"' +
              ' style="letter-spacing:0.05em;background:' + bg + ';color:' + fg + '">' + esc(cn) + '</a>'
          : '') +
        '<a href="' + href + '"><h3 class="font-bold text-[#111827] mt-2 mb-1.5 line-clamp-2' +
          ' group-hover:text-rojo transition-colors duration-300 leading-snug">' + esc(a.titulo) + '</h3></a>' +
        (a.extracto
          ? '<p class="text-sm text-[#6b7280] line-clamp-2 mb-2">' + esc(a.extracto) + '</p>'
          : '') +
        '<div class="flex items-center gap-2 text-xs text-[#9ca3af]">' +
          (a.autor && a.autor.nombre
            ? '<span>' + esc(a.autor.nombre) + '</span><span>&middot;</span>'
            : '') +
          '<span>' + esc(a.fecha ? relDate(a.fecha) : '') + '</span>' +
        '</div>' +
      '</div>';
    return el;
  }

  async function loadMore() {
    if (busy) return;
    busy = true;
    btn.textContent = 'Cargando...';
    btn.disabled = true;

    try {
      var cr = await db.from('categorias').select('id').eq('slug', catSlug).single();
      if (cr.error) throw cr.error;

      var r = await db
        .from('articulos')
        .select('*, categoria:categorias(*), autor:autores(*)')
        .eq('categoria_id', cr.data.id)
        .eq('publicado', true)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (r.error) throw r.error;

      var arts = r.data || [];
      arts.forEach(function (a) {
        var b = bucket(a.fecha);
        if (b !== lastBucket) {
          grid.appendChild(mkDivider(b));
          lastBucket = b;
        }
        grid.appendChild(mkCard(a));
      });

      loadedPage++;
      offset += pageSize;

      if (loadedPage < totalPages && arts.length > 0) {
        if (link) {
          link.href = '/categoria/' + catSlug + '/' + (loadedPage + 1);
          link.textContent = 'Página ' + loadedPage + ' de ' + totalPages + ' · Ver siguiente página';
        }
        btn.textContent = 'Cargar más artículos';
        btn.disabled = false;
      } else {
        wrap.innerHTML = '<p class="text-sm text-gris-muted text-center py-2">Has visto todos los artículos de ' + esc(catName) + '</p>';
      }
    } catch (err) {
      console.error('[CategoryLoadMore] fetch:', err);
      btn.textContent = 'Cargar más artículos';
      btn.disabled = false;
    }

    busy = false;
  }

  btn.addEventListener('click', loadMore);
})();
