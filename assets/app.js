/* ============================================================
   Joaquín Álvarez Mercado — comportamiento de la página
   Sin dependencias. Cada bloque es independiente: si algo falla,
   el resto sigue funcionando y el contenido ya está en el HTML.
============================================================ */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fino = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var ahorro = !!(navigator.connection && navigator.connection.saveData);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var idioma = function () { return document.documentElement.lang === 'en' ? 'en' : 'es'; };
  var locale = function () { return idioma() === 'en' ? 'en-US' : 'es-MX'; };
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function leer(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function seguro(nombre, fn) { try { fn(); } catch (e) { if (window.console) console.warn(nombre, e); } }

  /* ---------- idioma ---------- */
  seguro('idioma', function () {
    var b = $('[data-lang-toggle]');
    b.addEventListener('click', function () {
      var l = idioma() === 'en' ? 'es' : 'en';
      try { localStorage.setItem('idioma', l); } catch (e) {}
      window.setIdioma(l);
    });
  });

  /* ---------- cabecera ---------- */
  seguro('cabecera', function () {
    var top = $('[data-top]');
    var pinta = function () { top.classList.toggle('is-scrolled', window.scrollY > 8); };
    addEventListener('scroll', pinta, { passive: true });
    pinta();
  });

  /* ---------- reloj y fecha de los teléfonos ---------- */
  function pintaReloj() {
    var d = new Date();
    var h = d.getHours() % 12 || 12, m = String(d.getMinutes()).padStart(2, '0');
    $$('[data-reloj]').forEach(function (el) { el.textContent = h + ':' + m; });
    var f = d.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
    $$('[data-fecha]').forEach(function (el) { el.textContent = f; });
  }
  seguro('reloj', function () { pintaReloj(); setInterval(pintaReloj, 20000); });

  /* ============================================================
     LA MESA: las cosas caen al cargar y se pueden mover con el mouse
  ============================================================ */
  seguro('mesa', function () {
    var mesa = $('[data-mesa]');
    if (!mesa) return;
    var objs = $$('[data-obj]', mesa);

    // espera a que las fotos estén listas para que no caigan vacías
    var imgs = $$('img', mesa);
    var listas = Promise.all(imgs.map(function (i) {
      return i.decode ? i.decode().catch(function () {}) : Promise.resolve();
    }));
    var tope = new Promise(function (r) { setTimeout(r, 900); });
    Promise.race([listas, tope]).then(function () {
      requestAnimationFrame(function () {
        mesa.classList.add('is-set');
        setTimeout(function () { mesa.classList.add('is-ready'); }, reduce ? 0 : 1300);
      });
    });

    if (!fino) return;
    var z = 20;
    objs.forEach(function (obj) {
      var sx = 0, sy = 0, ox = 0, oy = 0, pid = null, movido = false, lim = null;

      obj.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 || e.pointerType !== 'mouse') return;
        pid = e.pointerId; sx = e.clientX; sy = e.clientY; movido = false;
        ox = parseFloat(obj.style.getPropertyValue('--dx')) || 0;
        oy = parseFloat(obj.style.getPropertyValue('--dy')) || 0;
        var m = mesa.getBoundingClientRect(), o = obj.getBoundingClientRect();
        var cx = o.left + o.width / 2, cy = o.top + o.height / 2;
        // el centro del objeto se queda dentro de la mesa
        lim = { x0: m.left + 24 - cx, x1: m.right - 24 - cx, y0: m.top + 24 - cy, y1: m.bottom - 24 - cy };
        obj.setPointerCapture(pid);
        obj.style.zIndex = ++z;
      });

      obj.addEventListener('pointermove', function (e) {
        if (pid === null || e.pointerId !== pid) return;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if (!movido && Math.abs(dx) + Math.abs(dy) < 6) return;
        if (!movido) { movido = true; obj.classList.add('is-held'); }
        dx = Math.max(lim.x0, Math.min(lim.x1, dx));
        dy = Math.max(lim.y0, Math.min(lim.y1, dy));
        obj.style.setProperty('--dx', (ox + dx) + 'px');
        obj.style.setProperty('--dy', (oy + dy) + 'px');
      });

      function soltar() {
        if (pid === null) return;
        pid = null;
        if (movido) {
          obj.classList.remove('is-held');
          // al soltarlo se acomoda con un ángulo un poco distinto, como en una mesa de verdad
          var r = parseFloat(getComputedStyle(obj).getPropertyValue('--r')) || 0;
          obj.style.setProperty('--r', (r + (Math.random() * 6 - 3)).toFixed(1) + 'deg');
          obj.addEventListener('click', function (ev) { ev.preventDefault(); }, { once: true, capture: true });
          mesa.classList.add('se-movio');
        }
      }
      obj.addEventListener('pointerup', soltar);
      obj.addEventListener('pointercancel', soltar);
      obj.addEventListener('dragstart', function (e) { e.preventDefault(); });
    });
  });

  /* ============================================================
     PARATU: una versión que funciona (se guarda en este navegador)
  ============================================================ */
  seguro('paratu', function () {
    var app = $('[data-app]');
    if (!app) return;
    var CLAVE = 'paratu-demo-v1';
    var TXT = {
      es: { manana: 'Mañana', ver: 'Para ver', p1: 'Prioridad 1', tetr: 'ya entré', folio: 'FOLIO', pagina: 'esta página',
        efectivo: 'Efectivo', tarjeta: 'Tarjeta', ahorros: 'Ahorros', vacio: 'Sin movimientos todavía. Anota uno arriba.',
        nada: 'Nada pendiente. Qué bien.', hoy: 'Hoy', nueva: 'Nueva' },
      en: { manana: 'Tomorrow', ver: 'To watch', p1: 'Priority 1', tetr: 'I got in', folio: 'FOLIO', pagina: 'this page',
        efectivo: 'Cash', tarjeta: 'Card', ahorros: 'Savings', vacio: 'No entries yet. Log one above.',
        nada: 'Nothing left to do. Nice.', hoy: 'Today', nueva: 'New' }
    };
    // mis pendientes reales, tal como estaban en mi teléfono
    function inicial() {
      return {
        tareas: [
          { id: 'parque', t: 'Ir al parque', meta: 'manana', dot: '' },
          { id: 'castle', t: 'Infinity Castle', meta: 'ver', dot: 'r' },
          { id: 'zapatero', t: 'Zapatero a sus zapatos', meta: 'p1', dot: 'b' },
          { id: 'tetr', t: 'Tetr entrada', hecha: true, pin: 'tetr' },
          { id: 'impi', t: 'Subir IMPI', hecha: true, pin: 'folio', href: '#folio' },
          { id: 'pagina', t: 'Página, quién soy', hecha: true, pin: 'pagina' },
          { id: 'pe', t: 'Private equity?', hecha: true },
          { id: 'video', t: 'Video?', hecha: true }
        ],
        cuenta: 'efectivo',
        saldos: { efectivo: 360, tarjeta: 800, ahorros: 100 },
        movs: []
      };
    }
    var st = leer(CLAVE) || inicial();
    var tipo = 'gasto';
    var T = function (k) { return TXT[idioma()][k] || k; };
    var dinero = function (n) { return '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); };
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

    function fila(tk) {
      var id = 'tk-' + tk.id;
      var meta = tk.meta ? '<small>' + esc(T(tk.meta)) + '</small>' : '';
      var pin = '';
      if (tk.pin) pin = tk.href
        ? '<a class="pin" href="' + tk.href + '">' + esc(T(tk.pin)) + '</a>'
        : '<span class="pin">' + esc(T(tk.pin)) + '</span>';
      return '<div class="task' + (tk.hecha ? ' is-done' : '') + '">' +
        '<input type="checkbox" id="' + id + '" data-id="' + esc(tk.id) + '"' + (tk.hecha ? ' checked' : '') + ' />' +
        '<label class="tt" for="' + id + '"><span>' + esc(tk.t) + '</span>' + meta + '</label>' + pin + '</div>';
    }
    function pintaTareas() {
      var pend = st.tareas.filter(function (t) { return !t.hecha; });
      var hechas = st.tareas.filter(function (t) { return t.hecha; });
      $('[data-pendientes]', app).innerHTML = pend.length ? pend.map(fila).join('') : '<p class="ui-date">' + T('nada') + '</p>';
      $('[data-hechas]', app).innerHTML = hechas.map(fila).join('');
      $('[data-proximo]', app).innerHTML = pend.slice(0, 3).map(function (tk) {
        return '<div class="ui-row"><i class="dot ' + (tk.dot || '') + '"></i><span>' +
          (tk.meta ? '<small>' + esc(T(tk.meta)) + '</small>' : '') + esc(tk.t) + '</span></div>';
      }).join('') || '<p class="ui-date">' + T('nada') + '</p>';
    }
    function pintaFinanzas() {
      $('[data-cuentas]', app).innerHTML = ['efectivo', 'tarjeta', 'ahorros'].map(function (c) {
        return '<button type="button" data-cuenta="' + c + '" aria-pressed="' + (st.cuenta === c) + '">' +
          esc(T(c)) + '<small>' + dinero(st.saldos[c]) + '</small></button>';
      }).join('');
      $('[data-movs]', app).innerHTML = st.movs.length ? st.movs.slice(0, 6).map(function (mv) {
        return '<div class="mov"><span>' + esc(mv.c) + '<small>' + esc(T(mv.a)) + '</small></span>' +
          '<span class="' + (mv.m < 0 ? 'neg' : 'pos') + '">' + (mv.m < 0 ? '−' : '+') + dinero(mv.m) + '</span></div>';
      }).join('') : '<p class="ui-date">' + T('vacio') + '</p>';
    }
    function pintaTodo() { pintaTareas(); pintaFinanzas(); }
    function persistir() { guardar(CLAVE, st); }

    // pestañas
    var tabs = $$('[data-tab]', app);
    function ir(vista, foco) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-tab') === vista;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && foco) t.focus();
      });
      $$('[data-view]', app).forEach(function (v) {
        var on = v.getAttribute('data-view') === vista;
        v.hidden = !on; v.classList.toggle('is-on', on);
      });
      $('.ui-body', app).scrollTop = 0;
    }
    tabs.forEach(function (t, i) {
      t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
      t.addEventListener('click', function () { ir(t.getAttribute('data-tab')); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        ir(tabs[(i + d + tabs.length) % tabs.length].getAttribute('data-tab'), true);
      });
    });
    $$('[data-ir]', app).forEach(function (b) {
      b.addEventListener('click', function () { ir(b.getAttribute('data-ir')); });
    });

    // tareas: marcar y agregar
    app.addEventListener('change', function (e) {
      var cb = e.target.closest && e.target.closest('input[type="checkbox"][data-id]');
      if (!cb) return;
      var tk = st.tareas.find(function (t) { return t.id === cb.getAttribute('data-id'); });
      if (!tk) return;
      tk.hecha = cb.checked;
      cb.closest('.task').classList.toggle('is-done', cb.checked);
      persistir();
      setTimeout(pintaTareas, reduce ? 0 : 380); // deja ver la palomita antes de moverla de lista
    });
    $('[data-add]', app).addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = $('input', e.currentTarget);
      var v = inp.value.trim();
      if (!v) { inp.focus(); return; }
      st.tareas.unshift({ id: 'n' + Date.now(), t: v, meta: '', dot: 'b' });
      inp.value = '';
      persistir(); pintaTareas();
    });

    // finanzas
    app.addEventListener('click', function (e) {
      var c = e.target.closest && e.target.closest('[data-cuenta]');
      if (c) { st.cuenta = c.getAttribute('data-cuenta'); persistir(); pintaFinanzas(); return; }
      var tb = e.target.closest && e.target.closest('[data-tipo]');
      if (tb) {
        tipo = tb.getAttribute('data-tipo');
        $$('[data-tipo]', app).forEach(function (b) { b.setAttribute('aria-pressed', String(b === tb)); });
      }
    });
    $('[data-gasto]', app).addEventListener('submit', function (e) {
      e.preventDefault();
      var mInp = $('[data-monto]', app), cInp = $('[data-concepto]', app);
      var monto = parseFloat(String(mInp.value).replace(/[^0-9.]/g, ''));
      if (!(monto > 0)) { mInp.focus(); return; }
      var concepto = cInp.value.trim() || (tipo === 'gasto' ? '—' : '+');
      var m = tipo === 'gasto' ? -monto : monto;
      st.saldos[st.cuenta] = Math.round((st.saldos[st.cuenta] + m) * 100) / 100;
      st.movs.unshift({ c: concepto, m: m, a: st.cuenta });
      persistir(); pintaFinanzas();
    });

    $('[data-reset]').addEventListener('click', function () {
      st = inicial(); persistir(); pintaTodo(); ir('hoy');
    });

    pintaTodo();
    document.addEventListener('idioma', pintaTodo);
  });

  /* ============================================================
     FOLIO: en computadora el objeto cambia en su lugar mientras bajas;
     en el teléfono se desliza de lado.
  ============================================================ */
  seguro('folio', function () {
    var seq = $('[data-folio]');
    if (!seq) return;
    var fotos = $$('.folio-stage img', seq);
    var pasos = $$('.folio-steps li', seq);
    var cabeza = $('.folio-head', seq);
    var cuenta = $('[data-folio-cuenta]', seq);
    var lista = $('.folio-steps', seq);
    function activa(n) {
      fotos.forEach(function (f) { f.classList.toggle('on', +f.getAttribute('data-paso') === n); });
      if (cuenta) cuenta.textContent = (n + 1) + ' / ' + pasos.length;
    }
    var escritorio = matchMedia('(min-width: 900px)');
    // computadora: el paso que cruza el centro de la pantalla manda
    var ioV = new IntersectionObserver(function (es) {
      if (!escritorio.matches) return;
      es.forEach(function (e) { if (e.isIntersecting) activa(+e.target.getAttribute('data-paso')); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    // teléfono: la tarjeta que ocupa la mayor parte del carrusel manda
    var ioH = new IntersectionObserver(function (es) {
      if (escritorio.matches) return;
      es.forEach(function (e) { if (e.isIntersecting) activa(+e.target.getAttribute('data-paso')); });
    }, { root: lista, threshold: 0.6 });
    pasos.forEach(function (p) { ioV.observe(p); ioH.observe(p); });
    if (cabeza) ioV.observe(cabeza);
  });

  /* ============================================================
     HABLEMOS DE NEGOCIOS
  ============================================================ */
  // Los posters de los videos se piden hasta que te acercas: son ~64 KB
  // que no necesita quien apenas está viendo la mesa.
  seguro('posters', function () {
    var vs = $$('video[data-poster]');
    function pon(v) { v.poster = v.getAttribute('data-poster'); v.removeAttribute('data-poster'); }
    if (!('IntersectionObserver' in window)) { vs.forEach(pon); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { pon(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '1200px 0px' });
    vs.forEach(function (v) { io.observe(v); });
  });

  // Las cinco aperturas arrancan juntas, una sola vez, cuando las ves.
  seguro('aperturas', function () {
    var ap = $('[data-aperturas]');
    if (!ap) return;
    var vids = $$('video', ap);
    var frase = $('[data-frase]', ap);
    var palabras = $$('span', frase);
    var btn = $('[data-otra]', ap);
    var cargado = false, visto = false;

    function cargar() {
      if (cargado) return;
      cargado = true;
      vids.forEach(function (v) { v.preload = 'auto'; v.load(); });
    }
    function listos() {
      return Promise.race([
        Promise.all(vids.map(function (v) {
          return v.readyState >= 3 ? Promise.resolve() : new Promise(function (r) { v.addEventListener('canplay', r, { once: true }); });
        })),
        new Promise(function (r) { setTimeout(r, 2500); })
      ]);
    }
    function reproducir() {
      cargar();
      listos().then(function () {
        vids.forEach(function (v) {
          try { v.currentTime = 0; } catch (e) {}
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        });
        if (reduce) return;
        frase.classList.add('is-playing');
        palabras.forEach(function (s) { s.classList.remove('on'); });
        [0, 330, 560].forEach(function (t, i) {
          setTimeout(function () { if (palabras[i]) palabras[i].classList.add('on'); }, t);
        });
        setTimeout(function () { frase.classList.remove('is-playing'); }, 1300);
      });
    }
    if (reduce) {
      btn.setAttribute('data-es', 'Reproducir'); btn.setAttribute('data-en', 'Play');
      btn.textContent = idioma() === 'en' ? 'Play' : 'Reproducir';
    }
    btn.addEventListener('click', reproducir);

    new IntersectionObserver(function (es, o) {
      if (es[0].isIntersecting) { if (!ahorro) cargar(); o.disconnect(); }
    }, { rootMargin: '600px 0px' }).observe(ap);

    new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting || visto || reduce || ahorro) return;
      visto = true;
      reproducir();
    }, { threshold: 0.55 }).observe($('.aperturas-fila', ap));
  });

  // El episodio de Trisol con los siete bloques de la fórmula
  seguro('formula', function () {
    var reel = $('[data-reel]');
    if (!reel) return;
    var ep = $('[data-episodio]', reel);
    var bloques = $$('[data-bloques] li');
    // [segundo en que empieza, bloque]: el mecanismo y la frase clave se alternan
    var TRAMOS = [[0, 0], [7.3, 1], [8.2, 2], [22.8, 3], [30.8, 4], [32.9, 3], [43.8, 4], [46.8, 5], [57, 6]];
    var actual = -1;
    function marca(i) {
      if (i === actual) return;
      actual = i;
      bloques.forEach(function (li, k) { li.classList.toggle('on', k === i); });
    }
    function arranca(t) {
      reel.classList.add('is-playing');
      ep.controls = true;
      var ir = function () { if (typeof t === 'number') { try { ep.currentTime = t; } catch (e) {} } };
      if (ep.readyState >= 1) ir(); else ep.addEventListener('loadedmetadata', ir, { once: true });
      var p = ep.play(); if (p && p.catch) p.catch(function () {});
    }
    $('[data-play]', reel).addEventListener('click', function () { arranca(); ep.focus({ preventScroll: true }); });
    ep.addEventListener('timeupdate', function () {
      var t = ep.currentTime, idx = 0;
      TRAMOS.forEach(function (s) { if (t >= s[0]) idx = s[1]; });
      marca(idx);
    });
    bloques.forEach(function (li, k) {
      $('button', li).addEventListener('click', function () {
        arranca(parseFloat(li.getAttribute('data-t')));
        marca(k);
        var r = reel.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight - 80) reel.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  });

  /* ============================================================
     ACUÑA SIN HUELLA: 13 cajas de 100 botellas se vuelven 13 árboles
  ============================================================ */
  seguro('canje', function () {
    var fig = $('[data-canje]');
    if (!fig) return;
    var fila = $('[data-slots]', fig);
    var NS = 'http://www.w3.org/2000/svg';
    // símbolos: una caja con 100 botellas (10 × 10) y un árbol
    var tapas = '', cuerpos = '';
    for (var r = 0; r < 10; r++) for (var c = 0; c < 10; c++) {
      var x = c * 6 + .8, y = r * 11 + .4;
      tapas += 'M' + (x + 1.3).toFixed(1) + ' ' + y.toFixed(1) + 'h1.8v2.2h-1.8z';
      cuerpos += 'M' + x.toFixed(1) + ' ' + (y + 2.2).toFixed(1) + 'h4.4v7.8h-4.4z';
    }
    var defs = document.createElementNS(NS, 'svg');
    defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
    defs.setAttribute('aria-hidden', 'true'); defs.style.position = 'absolute';
    defs.innerHTML =
      '<symbol id="caja" viewBox="0 0 60 110"><path fill="#4d8fc0" d="' + tapas + '"/><path fill="#b4d1e6" d="' + cuerpos + '"/></symbol>' +
      '<symbol id="arbol" viewBox="0 0 60 110"><rect x="27.5" y="66" width="5" height="44" rx="1.5" fill="#6d4c33"/>' +
      '<circle cx="30" cy="44" r="21" fill="#2f7d4a"/><circle cx="17" cy="58" r="13" fill="#3a9157"/>' +
      '<circle cx="43" cy="57" r="13.5" fill="#28703f"/><circle cx="30" cy="26" r="13" fill="#3a9157"/></symbol>';
    document.body.appendChild(defs);
    var html = '';
    for (var i = 0; i < 13; i++) {
      html += '<div class="slot" style="--i:' + i + '"><svg class="crate"><use href="#caja"/></svg><svg class="tree"><use href="#arbol"/></svg></div>';
    }
    fila.innerHTML = html;
    if (reduce) { fig.classList.add('is-planted'); return; }
    new IntersectionObserver(function (es, o) {
      if (es[0].isIntersecting) { fig.classList.add('is-planted'); o.disconnect(); }
    }, { threshold: 0.45 }).observe(fila);
  });

  /* ============================================================
     FOUNDERLYTICS: ¿cuánto ganas por hora de verdad?
  ============================================================ */
  seguro('calculadora', function () {
    var f = $('[data-calc]');
    if (!f) return;
    var inp = {};
    $$('[data-in]', f).forEach(function (i) { inp[i.getAttribute('data-in')] = i; });
    var out = $('[data-rate]', f);
    var nM = $('[data-nota-maria]', f), nT = $('[data-nota-tuya]', f), nP = $('[data-nota-pierdes]', f);
    var num = function (v) { return parseFloat(String(v).replace(/[^0-9.]/g, '')) || 0; };
    function calcula() {
      var ing = num(inp.ing.value), gas = num(inp.gas.value), hrs = num(inp.hrs.value);
      var tasa = hrs > 0 ? (ing - gas) / hrs : null;
      out.textContent = tasa === null ? '—' : (tasa < 0 ? '−$' : '$') + Math.abs(tasa).toFixed(2);
      var maria = ing === 1200 && gas === 680 && hrs === 80;
      nM.hidden = !maria;
      nP.hidden = maria || !(tasa !== null && tasa < 0);
      nT.hidden = maria || tasa === null || tasa < 0;
    }
    f.addEventListener('input', calcula);
    f.addEventListener('submit', function (e) { e.preventDefault(); });
    calcula();
  });

  /* ============================================================
     HABLEMOS: copiar el correo y la hora donde estoy
  ============================================================ */
  seguro('copiar', function () {
    $$('[data-copiar]').forEach(function (b) {
      b.addEventListener('click', function () {
        var txt = b.getAttribute('data-copiar');
        var ok = function () {
          b.classList.add('is-ok');
          b.textContent = idioma() === 'en' ? 'Copied' : 'Copiado';
          setTimeout(function () {
            b.classList.remove('is-ok');
            b.textContent = idioma() === 'en' ? 'Copy' : 'Copiar';
          }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(ok, function () { location.href = 'mailto:' + txt; });
        } else {
          location.href = 'mailto:' + txt;
        }
      });
    });
  });

  function pintaHora() {
    var el = $('[data-hora]');
    if (!el) return;
    var tz = el.getAttribute('data-tz'), lugar = el.getAttribute('data-lugar');
    var partes, hora = '', h = 0;
    try {
      var fmt = new Intl.DateTimeFormat(locale(), { hour: 'numeric', minute: '2-digit', timeZone: tz });
      hora = fmt.format(new Date());
      partes = fmt.formatToParts(new Date());
      h = +((partes.find(function (p) { return p.type === 'hour'; }) || {}).value);
    } catch (e) { el.textContent = idioma() === 'en' ? "I'm in " + lugar + '.' : 'Estoy en ' + lugar + '.'; return; }
    var fin = /\.$/.test(hora) ? '' : '.'; // "p.m." ya trae su punto
    el.textContent = idioma() === 'en'
      ? "I'm in " + lugar + ", where it's " + hora + fin
      : 'Estoy en ' + lugar + '; allá ' + (h === 1 ? 'es la ' : 'son las ') + hora + fin;
  }
  seguro('hora', function () { pintaHora(); setInterval(pintaHora, 30000); });

  /* ============================================================
     PIE: la versión de esta página va a la par de mi edad
  ============================================================ */
  var NACIMIENTO = new Date(2008, 8, 20); // 20 de septiembre de 2008
  function pintaVersion() {
    var b = $('[data-version]'), nota = $('[data-version-nota]');
    if (!b) return;
    var ahora = new Date();
    var edad = (ahora - NACIMIENTO) / (365.2425 * 864e5);
    b.textContent = 'v' + edad.toFixed(2);
    var prox = new Date(ahora.getFullYear(), 8, 20);
    if (prox <= ahora) prox.setFullYear(prox.getFullYear() + 1);
    var sig = Math.floor(edad) + 1;
    var fecha = prox.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
    nota.textContent = idioma() === 'en'
      ? 'This page is on version ' + Math.floor(edad) + ', same as me. Version ' + sig + ' ships on ' + fecha + '.'
      : 'Esta página va en la versión ' + Math.floor(edad) + ', igual que yo. La ' + sig + ' sale el ' + fecha + '.';
    b.setAttribute('aria-label', idioma() === 'en' ? 'Page version' : 'Versión de la página');
  }
  seguro('version', function () {
    var b = $('[data-version]'), nota = $('[data-version-nota]');
    pintaVersion();
    b.addEventListener('click', function () {
      var abierto = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!abierto));
      nota.hidden = abierto;
    });
    $$('[data-anio]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  });

  document.addEventListener('idioma', function () {
    seguro('re-idioma', function () { pintaReloj(); pintaHora(); pintaVersion(); });
  });
})();
