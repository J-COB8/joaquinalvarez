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

  // para lo que se mueve con el scroll
  var raiz = document.documentElement;
  var mov = raiz.classList.contains('mov');
  function lim(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function suave(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function sale(t) { return 1 - Math.pow(1 - t, 3); }
  function alturaCabeza() { var c = $('[data-top]'); return c ? c.offsetHeight : 56; }
  function docTop(el) { return el.getBoundingClientRect().top + scrollY; }

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

  // El reel del teléfono de la mesa: quieto si se piden menos animaciones
  seguro('reel', function () {
    var v = $('.reel-video');
    if (v && matchMedia('(prefers-reduced-motion: reduce)').matches) { v.removeAttribute('autoplay'); v.pause(); }
  });

  // Media kit: se abre en un visor; sin <dialog>, el enlace abre el PDF
  seguro('kit', function () {
    var kit = $('[data-kit]');
    if (!kit || !kit.showModal) return;
    $$('[data-kit-abrir]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.defaultPrevented) return; // en la mesa: lo acabas de arrastrar, no abrir
        e.preventDefault(); kit.showModal();
      });
    });
    $('[data-kit-cerrar]', kit).addEventListener('click', function () { kit.close(); });
    kit.addEventListener('click', function (e) { if (e.target === kit) kit.close(); });
    // El enlace para compartir es la página propia: /media-kit
    var enlace = $('[data-kit-enlace]', kit), url = 'https://joaquinalvarezmercado.vercel.app/media-kit';
    enlace.addEventListener('click', function () {
      if (navigator.share && matchMedia('(pointer:coarse)').matches) {
        navigator.share({ title: 'Media kit · Joaquín Álvarez Mercado', url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          enlace.classList.add('is-ok');
          setTimeout(function () { enlace.classList.remove('is-ok'); }, 1600);
        });
      }
    });
    // joaquinalvarezmercado.vercel.app/#media-kit también lo abre
    if (location.hash === '#media-kit') kit.showModal();
  });

  /* ============================================================
     LA INTRO: el título empieza enorme, como un cartel (en el teléfono,
     una palabra por renglón). Mientras bajas, cada palabra vuela a su
     lugar y el marcatextos la va pintando; cuando el título llega, cae
     la mesa y aparece lo demás. El inicio se queda fijo durante la pista.
  ============================================================ */
  seguro('intro', function () {
    if (!mov) return;
    var intro = $('[data-intro]');
    if (!intro) return;
    var hero = $('.hero', intro), h1 = $('.hero-title', hero), capa = $('.t-bandas', h1);
    var cue = $('.cue-intro', hero), mesa = $('[data-mesa]', hero);
    var aparecen = [$('.hero-sub', hero), $('.indice', hero)];
    var pals = [], bandas = [], geo = null, mesaHecha = false, pend = false;
    var altoVista = innerHeight, anchoVista = raiz.clientWidth;

    // cada palabra en su propia caja, para moverla sola
    function partir() {
      $$('.t-l', h1).forEach(function (l) {
        var txt = l.textContent.trim();
        l.textContent = '';
        txt.split(/\s+/).forEach(function (p, i) {
          if (i) l.appendChild(document.createTextNode(' '));
          var w = document.createElement('span');
          w.className = 'w'; w.textContent = p; l.appendChild(w);
        });
      });
      pals = $$('.w', h1);
      capa.textContent = '';
      bandas = pals.map(function () { var b = document.createElement('i'); capa.appendChild(b); return b; });
    }

    function medir() {
      pals.forEach(function (w) { w.style.transform = ''; });
      var cab = alturaCabeza();
      var fs = parseFloat(getComputedStyle(h1).fontSize);
      var hR = h1.getBoundingClientRect(), heroR = hero.getBoundingClientRect();
      var nat = pals.map(function (w) { var r = w.getBoundingClientRect(); return { x: r.left - hR.left, y: r.top - hR.top, w: r.width, h: r.height }; });
      var mismo = function (a, b) { return a && b && Math.abs(a.y - b.y) < fs * .3; };
      var esp = .26 * fs;
      for (var i = 0; i < nat.length - 1; i++) if (mismo(nat[i], nat[i + 1])) { esp = nat[i + 1].x - nat[i].x - nat[i].w; break; }

      // franjas del marcatextos: una por palabra (con su espacio), así juntas
      // forman la del renglón; del alto del renglón para que queden pegadas
      var pad = .09 * fs, alto = .95 * fs;
      var franjas = nat.map(function (n, i) {
        var x0 = n.x - (mismo(nat[i - 1], n) ? 0 : pad);
        var x1 = mismo(n, nat[i + 1]) ? nat[i + 1].x : n.x + n.w + pad;
        return { x: x0, y: n.y + n.h / 2 - alto / 2, w: x1 - x0 + .6, h: alto };
      });
      franjas.forEach(function (f, i) {
        var b = bandas[i].style;
        b.left = f.x + 'px'; b.top = f.y + 'px'; b.width = f.w + 'px'; b.height = f.h + 'px';
      });

      // el cartel: renglones a todo lo ancho, centrados en la pantalla.
      // En computadora, una oración por renglón; en el teléfono, una palabra
      // (o dos, si la primera es muy corta, como "I make").
      var gut = parseFloat(getComputedStyle(hero).paddingLeft) || 16;
      var x0 = heroR.left + gut, anchoDisp = heroR.width - 2 * gut;
      var arriba = cab + 16, altoDisp = Math.max(120, altoVista - 76 - arriba);
      var oraciones = $$('.t-l', h1).map(function (l) { return $$('.w', l).map(function (w) { return pals.indexOf(w); }); });
      var renglones = [];
      if (raiz.clientWidth >= 720) renglones = oraciones;
      else oraciones.forEach(function (o) {
        var desde = renglones.length, cur = [];
        o.forEach(function (i) {
          cur.push(i);
          var letras = cur.map(function (j) { return pals[j].textContent; }).join('').replace(/[^0-9A-Za-zÀ-ÿ]/g, '').length;
          if (letras >= 4) { renglones.push(cur); cur = []; }
        });
        if (cur.length) {
          if (renglones.length > desde) renglones[renglones.length - 1] = renglones[renglones.length - 1].concat(cur);
          else renglones.push(cur);
        }
      });
      var sMax = raiz.clientWidth >= 720 ? 3.2 : 3.6;
      var info = renglones.map(function (r) {
        var ancho = r.reduce(function (a, i, k) { return a + nat[i].w + (k ? esp : 0); }, 0);
        return { r: r, s: Math.min(anchoDisp / ancho, sMax) };
      });
      var total = info.reduce(function (a, l) { return a + .92 * fs * l.s; }, 0);
      var f = total > altoDisp ? altoDisp / total : 1;
      var y = arriba + (altoDisp - total * f) / 2;
      // mientras la intro está fija, el inicio queda pegado bajo la cabecera
      var h1Top = cab + (hR.top - heroR.top);
      var ini = [];
      info.forEach(function (l) {
        var s = l.s * f, x = x0;
        l.r.forEach(function (i) {
          ini[i] = { dx: x - (hR.left + nat[i].x), dy: y - (h1Top + nat[i].y), s: s };
          x += (nat[i].w + esp) * s;
        });
        y += .92 * fs * s;
      });
      geo = { ini: ini, nat: nat, franjas: franjas };
    }

    function progreso() {
      var pista = intro.offsetHeight - hero.offsetHeight;
      if (pista <= 0) return 1;
      return lim((scrollY - (docTop(intro) - alturaCabeza())) / pista);
    }

    // el título no salta directo a donde va el scroll: lo sigue cuadro por
    // cuadro con suavidad, así se ve fluido aunque el teléfono mande los
    // eventos de scroll disparejos
    var actual = null, tAnt = 0;
    function paso(t) {
      var meta = progreso();
      if (actual === null) actual = meta;
      var dt = tAnt ? Math.min(64, t - tAnt) : 16.7;
      tAnt = t;
      actual += (meta - actual) * (1 - Math.pow(.78, dt / 16.7));
      if (Math.abs(meta - actual) < .0006) actual = meta;
      var quieto = actual === meta;
      raiz.classList.toggle('intro-mueve', !quieto);
      pintar(actual, !quieto);
      if (!quieto) requestAnimationFrame(paso);
      else { pend = false; tAnt = 0; }
    }
    function aplicar() { if (geo) pintar(actual = progreso()); }

    function pintar(p, moviendo) {
      var tr = moviendo ? 'translate3d(' : 'translate(', z = moviendo ? 'px,0)' : 'px)';
      pals.forEach(function (w, i) {
        var g = geo.ini[i];
        if (!g) return;
        var k = 1 - suave(lim((p - .035 * i) / .6));
        var s = 1 + (g.s - 1) * k;
        w.style.transform = k < .0005 ? '' : tr + (g.dx * k).toFixed(2) + 'px,' + (g.dy * k).toFixed(2) + z + ' scale(' + s.toFixed(4) + ')';
        // su franja la sigue y se pinta de izquierda a derecha
        var f = geo.franjas[i], n = geo.nat[i];
        var d = sale(lim((p - .4 - .05 * i) / .24));
        var tx = g.dx * k + (f.x - n.x) * (s - 1), ty = g.dy * k + (f.y - n.y) * (s - 1);
        bandas[i].style.transform = tr + tx.toFixed(2) + 'px,' + ty.toFixed(2) + z + ' scale(' + (s * d).toFixed(4) + ',' + s.toFixed(4) + ')';
      });
      var o = lim((p - .62) / .28);
      aparecen.forEach(function (el) {
        if (!el) return;
        el.style.opacity = o;
        el.style.transform = o >= 1 ? '' : 'translateY(' + ((1 - o) * 24).toFixed(1) + 'px)';
      });
      if (cue) cue.style.opacity = String(1 - lim(p / .06));
      // la mesa: solo cuando el título ya casi se acomodó, para que las
      // palabras grandes nunca pasen por encima (ni de ida ni de regreso)
      var om = lim((p - .8) / .15);
      mesa.style.opacity = om;
      mesa.style.visibility = om > 0 ? '' : 'hidden';
      if (!mesaHecha && p >= .8) {
        mesaHecha = true;
        mesa.classList.add('is-set');
        setTimeout(function () { mesa.classList.add('is-ready'); }, 1300);
      }
      // mientras se mueve, cada palabra en su propia capa (más fluido)
    }
    function pedir() { if (!pend && geo) { pend = true; requestAnimationFrame(paso); } }

    // arranca ya, sin esperar a la tipografía; cuando llega, se vuelve a medir
    partir();
    raiz.classList.add('intro-listo');
    medir(); aplicar();
    addEventListener('scroll', pedir, { passive: true });
    var t = null;
    var remedir = function () { clearTimeout(t); t = setTimeout(function () { medir(); aplicar(); }, 60); };
    // solo si cambia el ancho (girar el teléfono): al hacer scroll en el
    // teléfono la barra del navegador aparece y se esconde, y eso también
    // dispara resize; volver a medir ahí hacía que el texto brincara
    addEventListener('resize', function () {
      if (raiz.clientWidth === anchoVista) return;
      anchoVista = raiz.clientWidth; altoVista = innerHeight;
      remedir();
    });
    if (document.fonts) {
      if (document.fonts.ready) document.fonts.ready.then(remedir);
      if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', remedir);
    }
    document.addEventListener('idioma', function () { partir(); medir(); aplicar(); });
  });

  /* ============================================================
     RUMBO: la cabecera dice en qué sección estás, y el marcatextos
     de abajo avanza con tu lectura.
  ============================================================ */
  seguro('rumbo', function () {
    var cab = $('[data-top]'), prog = $('[data-prog]'), sec = $('[data-tn-sec]');
    if (!cab || !prog || !sec) return;
    var marcas = $$('[data-etiqueta]').map(function (el) { return { el: el, sec: el.closest('section') }; });
    var actual = null, pend = false;
    function aplicar() {
      pend = false;
      var max = raiz.scrollHeight - innerHeight;
      prog.style.transform = 'scaleX(' + (max > 0 ? lim(scrollY / max) : 0).toFixed(4) + ')';
      var linea = innerHeight * .4, hay = null;
      marcas.forEach(function (m) { if (m.sec && m.sec.getBoundingClientRect().top <= linea) hay = m; });
      if (hay === actual) return;
      actual = hay;
      cab.classList.toggle('con-sec', !!hay);
      if (hay) {
        sec.textContent = hay.el.textContent.trim();
        sec.classList.remove('pega'); void sec.offsetWidth; sec.classList.add('pega');
      }
    }
    function pedir() { if (!pend) { pend = true; requestAnimationFrame(aplicar); } }
    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', pedir);
    document.addEventListener('idioma', function () { actual = null; aplicar(); });
    aplicar();
  });

  /* ============================================================
     AL APARECER: las cintas de sección se desenrollan y se pegan,
     las fotos caen sobre la mesa, las filas suben y "Hablemos." se
     marca. Una sola vez cada cosa.
  ============================================================ */
  seguro('aparecer', function () {
    if (!mov || !('IntersectionObserver' in window)) return;
    $$('[data-entra]').forEach(function (c) {
      Array.prototype.forEach.call(c.children, function (h, i) { h.style.setProperty('--d', Math.min(i, 8) * 85 + 'ms'); });
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add(e.target.classList.contains('cinta-sec') ? 'is-pegada' : 'is-dentro');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .15 });
    $$('.cinta-sec, [data-entra], .hablemos-t').forEach(function (el) { io.observe(el); });
  });

  /* ============================================================
     AHORA: mientras bajas, las fotos se reparten sobre la mesa una por
     una (en el teléfono, en un montón). La escena se queda fija.
  ============================================================ */
  seguro('ahora', function () {
    var sec = $('[data-ahora]');
    if (!sec) return;
    var fotos = $$('.impresa', sec);
    // que ya estén cargadas cuando lleguen volando: se piden en segundo plano
    // un poco después de cargar la página, o antes si te acercas
    var pedirFotos = function () { fotos.forEach(function (li) { var im = $('img', li); if (im) im.loading = 'eager'; }); };
    addEventListener('load', function () { setTimeout(pedirFotos, 1500); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es, o) {
        if (!es[0].isIntersecting) return;
        fotos.forEach(function (li) { var im = $('img', li); if (im) im.loading = 'eager'; });
        o.disconnect();
      }, { rootMargin: '1600px 0px' }).observe(sec);
    }
    if (!mov) return;
    var escena = $('.ahora-escena', sec), cuenta = $('[data-cuenta]', sec);
    var N = fotos.length, pend = false;
    raiz.classList.add('ahora-listo');
    // de qué lado llega cada foto y cuánto gira mientras cae
    var semillas = fotos.map(function (li, i) {
      return {
        x: (i % 2 ? 1 : -1) * (24 + (i * 17) % 22),
        g: (i % 2 ? 1 : -1) * (14 + (i * 11) % 14),
        r: parseFloat(li.style.getPropertyValue('--r')) || 0
      };
    });
    function progreso() {
      var pista = sec.offsetHeight - escena.offsetHeight;
      if (pista <= 0) return 1;
      return lim((scrollY - (docTop(sec) - alturaCabeza())) / pista);
    }
    function aplicar() {
      pend = false;
      var p = progreso(), paso = .86 / N, dur = 1.5 / N, puestas = 0, vh = innerHeight;
      fotos.forEach(function (li, i) {
        var q = lim((p - i * paso) / dur), k = 1 - sale(q), s = semillas[i];
        if (q >= .6) puestas++;
        li.style.visibility = q <= 0 ? 'hidden' : '';
        li.style.transform = k < .0008 ? '' : 'translate(' + (s.x * k).toFixed(2) + 'vw,' + (k * vh * .95).toFixed(1) + 'px) rotate(' + (s.r + s.g * k).toFixed(2) + 'deg) scale(' + (1 + .14 * k).toFixed(3) + ')';
      });
      if (cuenta) cuenta.textContent = puestas + ' / ' + N;
    }
    function pedir() { if (!pend) { pend = true; requestAnimationFrame(aplicar); } }
    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', pedir);
    aplicar();
  });

  document.addEventListener('idioma', function () {
    seguro('re-idioma', function () { pintaReloj(); pintaHora(); pintaVersion(); });
  });
})();
