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
  function seguro(nombre, fn) { try { fn(); } catch (e) { if (window.console) console.warn(nombre, e); } }

  /* ---------- idioma ---------- */
  seguro('idioma', function () {
    $('[data-lang-toggle]').addEventListener('click', function () {
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

  /* ---------- reloj y fecha del teléfono de la mesa ---------- */
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

    // la entrada (las cosas cayendo) la dispara el script en línea del HTML

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
        }
      }
      obj.addEventListener('pointerup', soltar);
      obj.addEventListener('pointercancel', soltar);
      obj.addEventListener('dragstart', function (e) { e.preventDefault(); });
    });
  });

  /* ============================================================
     HABLEMOS DE NEGOCIOS: las cinco aperturas arrancan juntas,
     una sola vez, cuando las ves.
  ============================================================ */
  // Los posters se piden hasta que te acercas.
  seguro('posters', function () {
    var vs = $$('video[data-poster]');
    function pon(v) { v.poster = v.getAttribute('data-poster'); v.removeAttribute('data-poster'); }
    if (!('IntersectionObserver' in window)) { vs.forEach(pon); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { pon(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '1200px 0px' });
    vs.forEach(function (v) { io.observe(v); });
  });

  seguro('aperturas', function () {
    var ap = $('[data-aperturas]');
    if (!ap) return;
    var vids = $$('video', ap);
    var frase = $('[data-frase]', ap);
    var palabras = $$('span', frase);
    var btn = $('[data-otra]', ap);
    var fila = $('.aperturas-fila', ap);
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
    }, { threshold: 0.55 }).observe(fila);
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

  /* ============================================================
     FILAS QUE SE ABREN: si llegas a FOLIO o a Paratu desde el índice
     o desde la mesa, la fila se abre sola.
  ============================================================ */
  function abreDestino(hash) {
    if (!hash || hash.length < 2) return;
    var el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el && el.tagName === 'DETAILS') el.open = true;
  }
  seguro('filas', function () {
    // en fase de burbuja: si arrastraste un objeto de la mesa, el clic ya viene cancelado
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented) return;
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (a) abreDestino(a.getAttribute('href'));
    });
    addEventListener('hashchange', function () { abreDestino(location.hash); });
    abreDestino(location.hash);
  });

  /* ============================================================
     PÁGINAS WEB: la palabra "aplicaciones" resalta la página de la app.
     Un solo escucha en el documento: el botón vive en un texto que se
     reemplaza al cambiar de idioma.
  ============================================================ */
  seguro('resaltar', function () {
    var t = null, activa = null;
    function quitar() {
      if (!activa) return;
      activa.parentElement.classList.remove('hay-resaltado');
      activa.classList.remove('is-resaltado');
      $$('[data-resalta]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      activa = null;
    }
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-resalta]');
      if (!btn) return;
      var tarjeta = document.getElementById(btn.getAttribute('aria-controls'));
      if (!tarjeta) return;
      clearTimeout(t);
      if (activa === tarjeta) { quitar(); return; }
      quitar();
      activa = tarjeta;
      tarjeta.parentElement.classList.add('hay-resaltado');
      tarjeta.classList.add('is-resaltado');
      btn.setAttribute('aria-pressed', 'true');
      // en el teléfono la tira se desliza hasta la tarjeta; la página solo se mueve si hace falta
      tarjeta.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
      t = setTimeout(quitar, 4500);
    });
  });

  function pintaHora() {
    var el = $('[data-hora]');
    if (!el) return;
    var tz = el.getAttribute('data-tz'), lugar = el.getAttribute('data-lugar');
    var hora = '', h = 0;
    try {
      var fmt = new Intl.DateTimeFormat(locale(), { hour: 'numeric', minute: '2-digit', timeZone: tz });
      hora = fmt.format(new Date());
      h = +((fmt.formatToParts(new Date()).find(function (p) { return p.type === 'hour'; }) || {}).value);
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

  // Media kit: se abre en un visor; sin <dialog>, el enlace abre el PDF
  seguro('kit', function () {
    var kit = $('[data-kit]');
    if (!kit || !kit.showModal) return;
    $$('[data-kit-abrir]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); kit.showModal(); });
    });
    $('[data-kit-cerrar]', kit).addEventListener('click', function () { kit.close(); });
    kit.addEventListener('click', function (e) { if (e.target === kit) kit.close(); });
  });

  document.addEventListener('idioma', function () {
    seguro('re-idioma', function () { pintaReloj(); pintaHora(); pintaVersion(); });
  });
})();
