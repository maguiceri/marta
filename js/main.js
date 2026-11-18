(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const COPIAS = 9;     // copias de la "a" en el rodillo
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const html = document.documentElement;

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 4);
  const pausa = ms => new Promise(r => setTimeout(r, ms));

  // ---------- scroll ----------
  // cada efecto ligado al scroll es una tarea; corren todas juntas una vez por cuadro
  const tareas = [];
  let pedido = false;
  const correrTareas = () => { pedido = false; for (const t of tareas) t(); };
  const pedir = () => { if (!pedido) { pedido = true; requestAnimationFrame(correrTareas); } };
  addEventListener("scroll", pedir, { passive: true });
  addEventListener("resize", pedir);

  // ---------- vidrio estriado ----------
  // Por cada .vidrio se crea un filtro SVG: un feDisplacementMap con un mapa en diente de sierra
  // (una rampa por franja) corre los píxeles de costado dentro de cada franja, como un vidrio acanalado.
  // El mapa se hace una sola vez (uno por ancho de franja), más grande que cualquier pantalla,
  // así el filtro no se rehace cuando el elemento cambia de tamaño.
  const defs = document.querySelector(".sprite defs");
  const MAPA = 4096;
  const mapas = {};
  let nVidrio = 0;

  function mapaVidrio(ancho, franja) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(ancho));
    c.height = 1;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(c.width, 1);
    for (let x = 0; x < c.width; x++) {
      const i = x * 4;
      img.data[i] = Math.round(255 * (x % franja) / franja);
      img.data[i + 1] = 128;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  // devuelve una función que pone la intensidad (0 nítido, 1 todo a través del vidrio)
  function vidrio(caja, maximo = 60) {
    const lente = caja.querySelector(".lente");
    const id = `vidrio-${++nVidrio}`;
    const filtro = document.createElementNS(SVG_NS, "filter");
    const mapa = document.createElementNS(SVG_NS, "feImage");
    const desplazar = document.createElementNS(SVG_NS, "feDisplacementMap");
    const attrs = (el, o) => { for (const k in o) el.setAttribute(k, o[k]); };
    const franja = parseFloat(getComputedStyle(caja).getPropertyValue("--franja")) || 26;
    mapas[franja] ??= mapaVidrio(MAPA, franja);
    attrs(filtro, { id, primitiveUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" });
    attrs(mapa, { x: 0, y: 0, width: MAPA, height: MAPA, preserveAspectRatio: "none", result: "mapa", href: mapas[franja] });
    attrs(desplazar, { in: "SourceGraphic", in2: "mapa", xChannelSelector: "R", yChannelSelector: "G", scale: 0 });
    filtro.append(mapa, desplazar);
    defs.append(filtro);

    let antes = -1;
    return g => {
      g = reduce ? 0 : Math.round(clamp01(g) * 100) / 100;
      if (g === antes) return;
      antes = g;
      caja.style.setProperty("--g", g);
      desplazar.setAttribute("scale", g * maximo);
      if (g > 0) lente.style.setProperty("--vidrio", `url(#${id})`);
      else lente.style.removeProperty("--vidrio");
    };
  }

  // ---------- rodillo de la "a" ----------
  // el .strip ya trae la "a" visible; se agregan copias hacia abajo, a una distancia data-paso (unidades del SVG)
  function armarRodillo(strip) {
    const paso = +strip.dataset.paso;
    for (let i = 1; i < COPIAS; i++) {
      const use = document.createElementNS(SVG_NS, "use");
      use.setAttribute("href", "#logo-a");
      use.setAttribute("y", i * paso);
      strip.appendChild(use);
    }
  }

  // gira el rodillo hacia abajo y frena con un pequeño rebote sobre la "a" final
  function girar(strip, duracion = 1100) {
    if (!strip || strip.dataset.girando || reduce) return Promise.resolve();
    const paso = +strip.dataset.paso;
    strip.dataset.girando = "1";
    strip.classList.add("girando");
    setTimeout(() => strip.classList.remove("girando"), duracion * .72);
    const anim = strip.animate([
      { transform: `translateY(${-(COPIAS - 1) * paso}px)`, easing: "cubic-bezier(.45, 0, .25, 1)" },
      { transform: `translateY(${paso * .13}px)`, offset: .84, easing: "cubic-bezier(.3, 0, .3, 1)" },
      { transform: "translateY(0)" }
    ], { duration: duracion });
    return anim.finished.then(() => { delete strip.dataset.girando; });
  }

  document.querySelectorAll(".strip").forEach(armarRodillo);
  window.marta = { girar };

  // ---------- portada ----------
  // Al abrir: el logo en crema sobre negro y solo gira la segunda "a", como una tragamonedas.
  // Después "inicio" corre el logo al costado, pasa el fondo a crema y muestra la presentación.
  // La apertura se ve una vez por sesión; un clic, Esc, la rueda o deslizar la saltean.
  const portada = document.getElementById("portada");
  const logo = portada.querySelector(".portada-logo");
  const stripLogo = logo.querySelector(".strip");
  const inicioEl = document.getElementById("inicio");
  const intro = { fin: false };
  let alTerminarIntro = () => {};   // lo define "inicio": arranca la presentación

  function terminarIntro() {
    if (intro.fin) return;
    intro.fin = true;
    html.classList.remove("intro-on");
    alTerminarIntro();
    pedir();
  }

  let introVista = false;
  try { introVista = sessionStorage.getItem("marta-intro") === "1"; sessionStorage.setItem("marta-intro", "1"); } catch (_) {}
  if (reduce || introVista) {
    inicioEl.classList.remove("oscuro");
    terminarIntro();
  } else {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    scrollTo(0, 0);
    html.classList.add("intro-on");
    inicioEl.addEventListener("click", terminarIntro, { once: true });
    addEventListener("wheel", terminarIntro, { passive: true, once: true });
    addEventListener("touchmove", terminarIntro, { passive: true, once: true });
    (async () => {
      if (document.fonts?.ready) await Promise.race([document.fonts.ready, pausa(500)]);
      await pausa(400);
      if (intro.fin) return;
      await girar(stripLogo, 1100);
      await pausa(350);
      terminarIntro();
    })();
  }

  // ---------- medidas ----------
  // Las posiciones se miden al cargar y al cambiar el tamaño, nunca durante el scroll:
  // así cada cuadro solo escribe estilos y no obliga al navegador a recalcular la página.
  const medidores = [];
  const medirTodo = () => { for (const m of medidores) m(); pedir(); };
  // posición en el documento sin contar transforms (offsetTop no los incluye)
  const topDoc = el => { let y = 0; for (let e = el; e; e = e.offsetParent) y += e.offsetTop; return y; };
  let vh = innerHeight;   // alto de la pantalla, lo usan todos los efectos de scroll
  medidores.push(() => { vh = innerHeight; });

  // ---------- inicio: portada → presentación ----------
  // Cuando termina la intro, sola (sin scroll): el logo se corre y se achica hasta .logo-destino
  // y al lado entra la presentación, que queda como pantalla inicial. El avance u va de 0 a FIN.
  const inicio = document.getElementById("inicio");
  const destino = inicio.querySelector(".logo-destino");
  const T = { datos: [0, .4], viaje: [0, .9], panel: [.35, 1.05] };
  const FIN = 1.05, DURACION = 1200;   // ms de la animación completa
  const tramo = (u, [a, b]) => clamp01((u - a) / (b - a));

  let desde, hasta, uActual = 0;
  // posición del logo al centro (sin transform) y del destino, relativas a la pantalla
  medidores.push(() => {
    const antes = logo.style.transform;
    logo.style.transform = "none";
    desde = logo.getBoundingClientRect();
    logo.style.transform = antes;
    const panelOn = inicio.classList.contains("panel-on");
    inicio.classList.add("panel-on");           // .logo-destino solo se puede medir con el panel visible
    hasta = destino.getBoundingClientRect();
    inicio.classList.toggle("panel-on", panelOn);
    if (intro.fin) pintarInicio(uActual);
  });

  function pintarInicio(u) {
    uActual = u;
    inicio.classList.toggle("panel-on", u > T.panel[0]);
    inicio.style.setProperty("--f", tramo(u, T.datos).toFixed(3));
    inicio.classList.toggle("sin-datos", tramo(u, T.datos) * 1.5 >= 1);
    inicio.style.setProperty("--panel", easeOut(tramo(u, T.panel)).toFixed(3));
    const t = easeInOut(tramo(u, T.viaje));
    const k = lerp(1, hasta.width / desde.width, t);
    logo.style.transform = u > 0 ? `translate(${lerp(0, hasta.left - desde.left, t).toFixed(1)}px, ${lerp(0, hasta.top - desde.top, t).toFixed(1)}px) scale(${k.toFixed(4)})` : "";
  }

  function presentar() {
    inicio.classList.remove("oscuro");     // fondo y logo pasan a crema y naranja mientras el logo se corre
    if (reduce) return pintarInicio(FIN);
    const t0 = performance.now();
    const paso = now => {
      const u = Math.min(FIN, (now - t0) / DURACION * FIN);
      pintarInicio(u);
      if (u < FIN) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }
  alTerminarIntro = presentar;
  // si la intro ya terminó antes de llegar acá (movimiento reducido o ya vista en la sesión),
  // se muestra la presentación cuando ya hay medidas
  if (intro.fin) requestAnimationFrame(() => reduce ? pintarInicio(FIN) : presentar());
  // al pasar el mouse, la "a" del logo vuelve a girar
  logo.addEventListener("mouseenter", () => { if (intro.fin) girar(stripLogo, 900); });

  // ---------- portfolio ----------
  // Carrusel circular en 3D. Las piezas salen de "trabajos" (carpetas en portfolio/<id>/:
  // mini/N.jpg para el carrusel, fotos/N.jpg y videos/N.mp4 + N.jpg para el visor).
  // Gira solo, se puede arrastrar, se acelera con el scroll y al tocar una pieza abre el visor.
  const trabajos = [
    { id: "pasteleria", nombre: "Pastelería", fotos: 8, videos: 6 },
    { id: "pizzeria", nombre: "Pizzería", fotos: 3, videos: 3 },
    { id: "patagonia", nombre: "Patagonia", fotos: 3, videos: 3 },
    { id: "estetica", nombre: "Estética", fotos: 3, videos: 3 },
    { id: "farmacia", nombre: "Farmacia", fotos: 2, videos: 2 },
    { id: "focacceria", nombre: "Focaccería", fotos: 1, videos: 1 },
    { id: "perfumeria", nombre: "Perfumería", fotos: 1, videos: 1 },
    { id: "gym", nombre: "Gym", fotos: 1, videos: 1 },
    { id: "eventos", nombre: "Eventos", fotos: 1, videos: 1 },
    { id: "siglo21", nombre: "Siglo 21", fotos: 1, videos: 1 },
  ];
  const rutaMarca = t => `portfolio/${t.id}`;

  // piezas del carrusel: primero una foto de cada marca, después un video de cada una y después
  // una segunda foto de las que tienen más; así las piezas de una misma marca no quedan juntas
  const piezas = [
    ...trabajos.map(t => ({ t, img: `${rutaMarca(t)}/mini/1.jpg`, video: false })),
    ...trabajos.filter(t => t.videos).map(t => ({ t, img: `${rutaMarca(t)}/mini/v1.jpg`, video: true })),
    ...trabajos.filter(t => t.fotos > 1).map(t => ({ t, img: `${rutaMarca(t)}/mini/2.jpg`, video: false })),
  ];
  const carrusel = document.getElementById("carrusel");
  const anillo = document.getElementById("anillo");
  const PASO = 360 / piezas.length;
  piezas.forEach((pz, i) => {
    const li = document.createElement("li");
    li.className = "pieza" + (pz.video ? " video" : "");
    const b = document.createElement("button");
    b.type = "button";
    b.tabIndex = i === 0 ? 0 : -1;               // solo la pieza de adelante recibe el foco (ver "teclado")
    b.dataset.img = pz.img;                      // la imagen se carga cuando el carrusel se acerca (abajo)
    b.setAttribute("aria-label", `Ver trabajos de ${pz.t.nombre}`);
    b.innerHTML = `<span class="marca" aria-hidden="true">${pz.t.nombre}</span>`;
    b.addEventListener("click", () => { if (!arrastro) abrirTrabajos(pz.t); });
    b.addEventListener("focus", () => { objetivo = cercano(-i * PASO); });
    li.append(b);
    anillo.append(li);
  });

  // las imágenes se piden recién cuando el carrusel está por aparecer
  const cargarPiezas = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    cargarPiezas.disconnect();
    anillo.querySelectorAll("button[data-img]").forEach(b => { b.style.backgroundImage = `url("${b.dataset.img}")`; });
  }, { rootMargin: "800px 0px" });
  cargarPiezas.observe(carrusel);

  // el radio sale del ancho de las piezas, para que queden pegadas pero sin encimarse
  const elPiezas = [...anillo.children];
  const botones = elPiezas.map(li => li.firstChild);
  let frente = 0;
  let radio = 600;
  const INCLINA = .11;   // cuánto bajan las de adelante y suben las de atrás (fracción del radio)
  medidores.push(() => {
    const ancho = elPiezas[0].offsetWidth, alto = elPiezas[0].offsetHeight;
    radio = (ancho + 16) * piezas.length / (2 * Math.PI);
    // la de atrás queda más arriba y más chica (k = 4/5), la de adelante más abajo y más grande (k = 4/3)
    const arriba = (radio * INCLINA + alto / 2) * 4 / 5, abajo = (radio * INCLINA + alto / 2) * 4 / 3;
    carrusel.style.height = `${Math.round(arriba + abajo + 40)}px`;
    carrusel.style.setProperty("--centro", `${Math.round(arriba + 20)}px`);
    pintarAnillo();
  });

  // ubica cada pieza en el círculo. La cámara está a 4 radios: las de adelante se ven apenas
  // más grandes y más abajo, las de atrás más chicas, más arriba y espejadas (como en el ejemplo).
  function pintarAnillo() {
    const camara = radio * 4;
    let masCerca = -Infinity, nuevoFrente = frente;
    elPiezas.forEach((el, i) => {
      const a = (giro + i * PASO) * Math.PI / 180;
      const x = radio * Math.sin(a), z = radio * Math.cos(a);
      const k = camara / (camara - z);
      const y = z * INCLINA;
      // el giro de cada pieza es un scaleX plano (cos del ángulo; negativo = espejada atrás) y no un
      // rotateY: con transformaciones 3D Safari ordena las piezas por su cuenta e ignora el z-index
      el.style.transform = `translate(${(x * k).toFixed(1)}px, ${(y * k).toFixed(1)}px) scale(${k.toFixed(3)}) scaleX(${Math.cos(a).toFixed(3)})`;
      el.style.zIndex = Math.round(z + radio * 2);
      el.style.opacity = z < 0 ? .8 : 1;
      if (z > masCerca) { masCerca = z; nuevoFrente = i; }
    });
    // teclado: el Tab entra solo por la pieza de adelante (no por las 25)
    if (nuevoFrente !== frente) {
      botones[frente].tabIndex = -1;
      botones[nuevoFrente].tabIndex = 0;
      frente = nuevoFrente;
    }
  }
  let giro = 0, extra = 0, objetivo = null, arrastre = null, arrastro = false, corriendo = false, tAntes = 0;
  // se frena con el botón de pausa, con el mouse encima o con el foco adentro (pauta: todo lo que se mueve solo se tiene que poder frenar)
  let pausado = false, encima = false, conFoco = false;
  const BASE = reduce ? 0 : 8;                       // grados por segundo
  const cercano = g => giro + ((((g - giro) % 360) + 540) % 360 - 180);   // mismo ángulo por el camino más corto
  function cuadro(t) {
    const dt = Math.min(.05, (t - tAntes) / 1000);
    tAntes = t;
    if (objetivo !== null) {
      giro += (objetivo - giro) * Math.min(1, dt * 6);
      if (Math.abs(objetivo - giro) < .05) objetivo = null;
    } else if (!arrastre) {
      giro += ((pausado || encima || conFoco ? 0 : BASE) + extra) * dt;
    }
    extra *= Math.pow(.08, dt);                       // el impulso se apaga en un par de segundos
    pintarAnillo();
    if (corriendo) requestAnimationFrame(cuadro);
  }
  // solo gira mientras está en pantalla
  new IntersectionObserver(([e]) => {
    corriendo = e.isIntersecting;
    if (corriendo) requestAnimationFrame(t => { tAntes = t; cuadro(t); });
  }).observe(carrusel);

  // arrastrar para girar; si se arrastró, el clic no abre la pieza
  carrusel.addEventListener("pointerdown", e => {
    arrastre = { x: e.clientX, giro, t: performance.now(), v: 0 };
    arrastro = false; objetivo = null;
  });
  addEventListener("pointermove", e => {
    if (!arrastre) return;
    const dx = e.clientX - arrastre.x;
    if (Math.abs(dx) > 6 && !arrastro) { arrastro = true; carrusel.classList.add("arrastrando"); }
    const nuevo = arrastre.giro + dx * .25, ahora = performance.now();
    arrastre.v = (nuevo - giro) / Math.max(1, ahora - arrastre.t) * 1000;
    arrastre.t = ahora;
    giro = nuevo;
  });
  addEventListener("pointerup", () => {
    if (!arrastre) return;
    if (arrastro && !reduce) extra = Math.max(-240, Math.min(240, arrastre.v)) - BASE;
    arrastre = null;
    carrusel.classList.remove("arrastrando");
    setTimeout(() => { arrastro = false; }, 0);
  });
  carrusel.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") encima = true; });
  carrusel.addEventListener("pointerleave", () => { encima = false; });
  carrusel.addEventListener("focusin", () => { conFoco = true; });
  carrusel.addEventListener("focusout", () => { conFoco = false; });
  const botonPausa = document.getElementById("pausa");
  botonPausa.hidden = reduce;                         // con movimiento reducido ya está quieto
  botonPausa.addEventListener("click", () => {
    pausado = !pausado;
    botonPausa.setAttribute("aria-pressed", pausado);
    botonPausa.textContent = pausado ? "Seguir" : "Pausar";
  });
  // teclado: las flechas pasan a la marca de al lado y le dan el foco
  carrusel.addEventListener("keydown", e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const n = botones.length, i = (frente + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
    botones[i].focus({ preventScroll: true });
  });
  // flechas: una pieza por vez
  document.querySelectorAll(".girar").forEach(b => b.addEventListener("click", () => {
    objetivo = (objetivo ?? giro) - +b.dataset.sentido * PASO;
    if (reduce) { giro = objetivo; objetivo = null; pintarAnillo(); }
  }));
  // el scroll le da un empujón
  let yCarrusel = scrollY;
  if (!reduce) tareas.push(() => {
    if (corriendo) extra = Math.max(-200, Math.min(200, extra + (scrollY - yCarrusel) * .6));
    yCarrusel = scrollY;
  });

  // visor: todos los videos y fotos de una marca
  const visorTrab = document.getElementById("trabajos");
  const grillaTrab = document.getElementById("trabGrilla");
  function abrirTrabajos(t) {
    document.getElementById("trab-titulo").textContent = t.nombre.toLowerCase();
    const r = rutaMarca(t);
    const videos = Array.from({ length: t.videos }, (_, k) =>
      `<video src="${r}/videos/${k + 1}.mp4" poster="${r}/videos/${k + 1}.jpg" controls playsinline preload="metadata"></video>`);
    grillaTrab.innerHTML = videos.join("");   // la clienta pidió que el detalle muestre solo videos
    visorTrab.showModal();
  }
  document.getElementById("trabCerrar").addEventListener("click", () => visorTrab.close());
  visorTrab.addEventListener("click", e => { if (e.target === visorTrab) visorTrab.close(); });
  // al cerrar se vacía, así se cortan los videos y las descargas
  visorTrab.addEventListener("close", () => { grillaTrab.innerHTML = ""; });

  // ---------- movimiento de textos ----------
  // [data-letras] entra letra por letra y [data-palabras] palabra por palabra (ver styles.css).
  // Los títulos quedan con su texto completo en aria-label y las letras se ocultan al lector de pantalla.
  function partir(el, tipo) {
    const titulo = el.closest("h1, h2, h3");
    if (tipo === "letras" && titulo && !titulo.hasAttribute("aria-label")) titulo.setAttribute("aria-label", titulo.textContent.replace(/\s+/g, " ").trim());
    let i = 0;
    const recorrer = nodo => [...nodo.childNodes].forEach(n => {
      if (n.nodeType === 1) return recorrer(n);
      if (n.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(parte => {
        if (!parte) return;
        if (!parte.trim()) return frag.append(" ");
        const pal = document.createElement("span");
        pal.className = "pal";
        if (tipo === "letras") {
          for (const ch of parte) {
            const l = document.createElement("span");
            l.className = "l";
            l.style.setProperty("--i", i++);
            l.textContent = ch;
            pal.append(l);
          }
          if (titulo) pal.setAttribute("aria-hidden", "true");
        } else {
          pal.classList.add("w");
          pal.style.setProperty("--i", i++);
          pal.textContent = parte;
        }
        frag.append(pal);
      });
      n.replaceWith(frag);
    });
    recorrer(el);
  }

  if (!reduce) {
    html.classList.add("mov");
    document.querySelectorAll("[data-letras]").forEach(el => partir(el, "letras"));
    document.querySelectorAll("[data-palabras]").forEach(el => partir(el, "palabras"));
    // fuera del inicio, cada bloque entra al aparecer y se reinicia al salir por abajo
    const verMov = new IntersectionObserver(entradas => entradas.forEach(e => {
      if (e.isIntersecting) e.target.classList.add("mov-on");
      else if (e.boundingClientRect.top > 0) e.target.classList.remove("mov-on");
    }), { rootMargin: "0px 0px -4% 0px" });   // poco margen: lo del pie tiene que llegar a activarse
    document.querySelectorAll("[data-letras], [data-palabras], [data-mov]").forEach(el => { if (!el.closest(".inicio")) verMov.observe(el); });

    // títulos que derivan de costado según dónde estén en la pantalla
    const derivas = [...document.querySelectorAll("[data-deriva]")].map(el => ({ el, sentido: +el.dataset.deriva, top: 0 }));
    medidores.push(() => derivas.forEach(d => { d.top = topDoc(d.el); }));
    tareas.push(() => derivas.forEach(d => {
      const c = (d.top - scrollY - vh / 2) / vh;
      if (Math.abs(c) < 1.5) d.el.style.setProperty("--dv", (c * d.sentido * 120).toFixed(1));
    }));
  }

  // ---------- header ----------
  // aparece pasada la portada, se esconde al bajar y vuelve al subir; marca la sección actual
  const top = document.getElementById("top");
  const menuBtn = document.getElementById("menuBtn");
  const navLinks = [...top.querySelectorAll(".nav a")];
  const destinos = navLinks.map(a => ({ el: document.querySelector(a.getAttribute("href")), top: 0 }));
  let altoDoc = 1;
  medidores.push(() => { destinos.forEach(d => { d.top = d.el ? topDoc(d.el) : Infinity; }); altoDoc = html.scrollHeight; });
  let yAntes = 0;
  tareas.push(() => {
    const y = scrollY;
    const bajando = y > yAntes + 2, subiendo = y < yAntes - 2;
    if (y < vh * .75) top.classList.remove("visible");
    else if (subiendo) top.classList.add("visible");
    else if (bajando && !top.classList.contains("open")) top.classList.remove("visible");
    yAntes = y;
    top.style.setProperty("--avance", (y / Math.max(1, altoDoc - vh)).toFixed(4));
    let actual = -1;
    destinos.forEach((d, i) => { if (d.top - y < vh * .5) actual = i; });
    navLinks.forEach((a, i) => a.toggleAttribute("aria-current", i === actual && !a.classList.contains("btn")));
  });

  addEventListener("resize", medirTodo);
  document.fonts?.ready.then(medirTodo);
  addEventListener("load", medirTodo);

  const cerrarMenu = () => { top.classList.remove("open"); menuBtn.setAttribute("aria-expanded", false); menuBtn.textContent = "Menú"; };
  menuBtn.addEventListener("click", () => {
    const abierto = top.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", abierto);
    menuBtn.textContent = abierto ? "Cerrar" : "Menú";
  });
  navLinks.forEach(a => a.addEventListener("click", cerrarMenu));

  // ---------- contacto: copiar email ----------
  const copiar = document.getElementById("copiar"), mail = document.getElementById("mail");
  const seleccionar = () => getSelection().selectAllChildren(mail);
  copiar.addEventListener("click", () => {
    try {
      navigator.clipboard.writeText(mail.textContent).then(() => {
        copiar.textContent = "Copiado";
        setTimeout(() => copiar.textContent = "Copiar", 1800);
      }, seleccionar);
    } catch (_) { seleccionar(); }
  });

  document.getElementById("anio").textContent = new Date().getFullYear();

  addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    terminarIntro();
    cerrarMenu();
  });

  medirTodo();
  correrTareas();
})();
