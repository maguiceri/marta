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

  // ---------- foco ----------
  // Prepara la sección desenfocada. correr() hace el recorrido: el visor entra, pasa por dos puntos,
  // se frena en el objetivo, ejecuta alEnfocar() y se abre hasta el marco final.
  function foco(caja, { objetivo, alEnfocar = () => {}, marco = () => ({ x: 0, y: 0, w: caja.clientWidth, h: caja.clientHeight }), alTerminar = () => {} }) {
    const escena = caja.querySelector(".foco-escena");
    const capa = caja.querySelector(".foco-blur");
    const estado = { corriendo: false, saltado: false, fin: false };

    function ubicar(r) {
      for (const k of ["x", "y", "w", "h"]) caja.style.setProperty("--" + k, r[k] + "px");
    }
    function rel(el) {
      const a = el.getBoundingClientRect(), b = caja.getBoundingClientRect();
      return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
    }
    // mueve el visor de un rectángulo a otro
    function mover(a, b, ms, ease) {
      return new Promise(res => {
        const t0 = performance.now();
        const paso = now => {
          if (estado.saltado) return res();
          const t = Math.min(1, (now - t0) / ms), e = ease(t);
          ubicar({ x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), w: lerp(a.w, b.w, e), h: lerp(a.h, b.h, e) });
          t < 1 ? requestAnimationFrame(paso) : res();
        };
        requestAnimationFrame(paso);
      });
    }

    function terminar() {
      if (estado.fin) return;
      estado.fin = true;
      ubicar(marco());
      capa.remove();
      caja.classList.remove("foco-on");
      caja.classList.add("abriendo", "foco-listo");
      alTerminar();
    }

    function saltar() {
      if (!estado.corriendo || estado.saltado || estado.fin) return;
      estado.saltado = true;
      capa.animate([{ opacity: getComputedStyle(capa).opacity }, { opacity: 0 }], { duration: 300, fill: "forwards" }).finished.then(terminar);
    }

    async function correr() {
      if (estado.corriendo || estado.fin) return;
      estado.corriendo = true;
      if (reduce) return terminar();

      const vw = caja.clientWidth, vh = caja.clientHeight;
      const s = Math.round(Math.min(vw, vh) * .3);
      const l = rel(objetivo);
      const pad = Math.max(18, l.h * .22);
      const p0 = { x: -s * 1.2, y: vh * .2, w: s, h: s };
      const p2 = { x: vw * .1, y: vh * .58, w: s * .9, h: s * .9 };
      const enObjetivo = { x: l.x - pad, y: l.y - pad, w: l.w + pad * 2, h: l.h + pad * 2 };

      ubicar(p0);
      caja.classList.add("visor-on");
      await mover(p0, p2, 500, easeInOut);        if (estado.saltado) return;
      await mover(p2, enObjetivo, 550, easeOut);  if (estado.saltado) return;

      caja.classList.add("enfocado");
      await alEnfocar();                           if (estado.saltado) return;
      await pausa(60);

      // el visor se abre y todo queda nítido
      caja.classList.add("abriendo");
      await mover(enObjetivo, marco(), 450, easeInOut); if (estado.saltado) return;
      terminar();
    }

    if (reduce) terminar();
    else {
      const copia = escena.cloneNode(true);
      copia.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
      capa.appendChild(copia);
      capa.inert = true;
      caja.classList.add("foco-on");
      caja.addEventListener("click", saltar);
    }
    return { correr, saltar, estado };
  }

  // ---------- portada ----------
  const portada = document.getElementById("portada");
  const logo = portada.querySelector(".portada-logo");
  const stripLogo = logo.querySelector(".strip");

  let alTerminarIntro = () => {};   // lo define "inicio": arranca la presentación
  const intro = foco(portada, {
    objetivo: logo,
    alEnfocar: () => girar(stripLogo, 800),   // la "a" gira como una tragamonedas
    alTerminar: () => {
      html.classList.remove("intro-on");
      document.getElementById("saltar")?.remove();
      alTerminarIntro();
      pedir();
    }
  });

  if (!reduce) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    scrollTo(0, 0);
    html.classList.add("intro-on");
    document.getElementById("saltar").addEventListener("click", e => { e.stopPropagation(); intro.saltar(); });
    addEventListener("wheel", () => intro.saltar(), { passive: true, once: true });
    addEventListener("touchmove", () => intro.saltar(), { passive: true, once: true });
    (document.fonts?.ready ? Promise.race([document.fonts.ready, pausa(500)]) : Promise.resolve()).then(intro.correr);
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
    if (intro.estado.fin) pintarInicio(uActual);
  });

  function pintarInicio(u) {
    uActual = u;
    inicio.classList.toggle("panel-on", u > T.panel[0]);
    inicio.style.setProperty("--f", tramo(u, T.datos).toFixed(3));
    inicio.style.setProperty("--panel", easeOut(tramo(u, T.panel)).toFixed(3));
    const t = easeInOut(tramo(u, T.viaje));
    const k = lerp(1, hasta.width / desde.width, t);
    logo.style.transform = u > 0 ? `translate(${lerp(0, hasta.left - desde.left, t).toFixed(1)}px, ${lerp(0, hasta.top - desde.top, t).toFixed(1)}px) scale(${k.toFixed(4)})` : "";
  }

  function presentar() {
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
  // con prefers-reduced-motion la intro ya terminó antes de llegar acá: se muestra el final cuando ya hay medidas
  if (intro.estado.fin) requestAnimationFrame(() => pintarInicio(FIN));
  // al pasar el mouse, la "a" del logo vuelve a girar
  logo.addEventListener("mouseenter", () => { if (intro.estado.fin) girar(stripLogo, 900); });

  // ---------- proyectos ----------
  // Pantalla fija: cada capa es una foto a pantalla completa armada con franjas verticales.
  // En el cambio, la foto que se va se deshace en canales de vidrio estriado (cada franja amplía y
  // corre su pedazo) y la nueva aparece desde el vidrio hasta quedar nítida. El primero ya está abierto.
  const proy = document.getElementById("proyectos");
  let proyTop = 0;
  medidores.push(() => { proyTop = topDoc(proy); });
  const N = innerWidth < 760 ? 8 : 14;
  const ESCALON = .6;
  const capas = [...proy.querySelectorAll(".proy-capa")].map((capa, i) => {
    const foto = capa.querySelector(".proy-foto");
    const img = `url("${capa.dataset.img}")`;
    foto.style.setProperty("--n", N);
    foto.style.backgroundImage = img;
    const tiras = [];
    for (let k = 0; k < N; k++) {
      const d = document.createElement("div");
      d.className = "pv";
      d.style.setProperty("--j", k);
      const pedazo = document.createElement("i");
      pedazo.style.backgroundImage = img;
      d.append(pedazo);
      foto.append(d);
      tiras.push(d);
    }
    // orden en que se abren las franjas: izquierda a derecha, derecha a izquierda o desde el centro
    const orden = tiras.map((_, k) => { const x = k / (N - 1); return [x, 1 - x, Math.abs(x - .5) * 2][i % 3]; });
    return { capa, tiras, orden, antes: "" };
  });
  const escalon = (w, o) => clamp01(w * (1 + ESCALON) - o * ESCALON);

  function pintarCapa(i, entra, sale) {
    const c = capas[i];
    const clave = entra.toFixed(3) + "|" + sale.toFixed(3);
    if (clave === c.antes) return;
    c.antes = clave;
    const visible = entra > 0 && sale < 1;
    c.capa.classList.toggle("visible", visible);
    if (!visible) return;
    const quieta = entra >= 1 && sale <= 0;
    c.capa.classList.toggle("abierta", quieta);
    c.capa.style.setProperty("--s-capa", entra.toFixed(3));
    if (quieta) return;
    const ordenSale = capas[i + 1]?.orden ?? c.orden;
    c.tiras.forEach((d, k) => {
      const si = escalon(entra, c.orden[k]), so = escalon(sale, ordenSale[k]);
      d.style.setProperty("--g", Math.max(1 - si, so).toFixed(3));
      d.style.setProperty("--o", clamp01(si * 2).toFixed(3));
    });
  }

  tareas.push(() => {
    const u = (scrollY - proyTop) / vh;     // pantallas de scroll desde que la sección llegó arriba
    if (u < -1.2 || u > capas.length + 1) return;
    // el primero ya está abierto; cada siguiente entra en su pantalla de scroll
    const entra = capas.map((c, k) => k === 0 ? 1 : tramo(u, [k - 1 + .1, k - 1 + .8]));
    let activa = 0;
    capas.forEach((c, k) => {
      const sale = entra[k + 1] ?? 0;
      pintarCapa(k, reduce ? Math.round(entra[k]) : entra[k], reduce ? Math.round(sale) : sale);
      if (entra[k] > .7) activa = k;
    });
    capas.forEach((c, k) => c.capa.classList.toggle("activo", k === activa));
  });

  // ---------- cinta ----------
  const cinta = document.querySelector(".cinta-track");
  let mitadCinta = 1;
  medidores.push(() => { mitadCinta = cinta.scrollWidth / 2 || 1; });
  let yCinta = scrollY, quietaCinta;
  if (!reduce) tareas.push(() => {
    cinta.style.transform = `translate3d(${(-(scrollY * .35) % mitadCinta).toFixed(1)}px, 0, 0)`;
    // se inclina según la velocidad del scroll
    const v = scrollY - yCinta;
    yCinta = scrollY;
    cinta.style.setProperty("--sesgo", `${Math.max(-14, Math.min(14, -v * .25)).toFixed(1)}deg`);
    clearTimeout(quietaCinta);
    quietaCinta = setTimeout(() => cinta.style.setProperty("--sesgo", "0deg"), 120);
  });

  // ---------- equipo ----------
  // cada retrato se enfoca al llegar al centro de la pantalla; las columnas se mueven a distinto ritmo
  const personas = [...document.querySelectorAll(".persona")].map((el, k) => ({ el, k, v: vidrio(el.querySelector(".retrato"), 40), top: 0, alto: 0 }));
  medidores.push(() => personas.forEach(p => { p.top = topDoc(p.el); p.alto = p.el.offsetHeight; }));
  tareas.push(() => {
    const rango = innerWidth < 860 ? .25 : 1;   // en dos columnas casi no se desfasan
    personas.forEach(({ el, k, v, top, alto }) => {
      const r = top - scrollY;
      if (r + alto < -200 || r > vh + 200) return;
      const c = (r + alto / 2 - vh / 2) / vh;
      v(Math.abs(c) * 2 - .25);
      if (!reduce) el.style.setProperty("--py", `${(c * (k % 2 ? -60 : 30) * rango).toFixed(1)}px`);
    });
  });

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
    // fuera de las pantallas fijas (inicio y proyectos), cada bloque entra al aparecer y se reinicia al salir por abajo
    const verMov = new IntersectionObserver(entradas => entradas.forEach(e => {
      if (e.isIntersecting) e.target.classList.add("mov-on");
      else if (e.boundingClientRect.top > 0) e.target.classList.remove("mov-on");
    }), { rootMargin: "0px 0px -4% 0px" });   // poco margen: lo del pie tiene que llegar a activarse
    document.querySelectorAll("[data-letras], [data-palabras], [data-mov]").forEach(el => { if (!el.closest(".inicio, .proy")) verMov.observe(el); });

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

  // ---------- contacto: copiar email y formulario ----------
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

  // todavía no está conectado a ningún servicio de envío
  document.getElementById("form").addEventListener("submit", e => {
    e.preventDefault();
    const aviso = document.getElementById("aviso");
    const nombre = document.getElementById("f-nombre"), email = document.getElementById("f-email");
    if (!nombre.value.trim()) { aviso.textContent = "Escribí tu nombre para que sepamos a quién responder."; nombre.focus(); return; }
    if (!email.value || !email.checkValidity()) { aviso.textContent = "Revisá el email: necesitamos uno válido para responderte."; email.focus(); return; }
    aviso.textContent = "El formulario todavía no está conectado, así que la consulta no se envió.";
  });

  document.getElementById("anio").textContent = new Date().getFullYear();

  addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    intro.saltar();
    cerrarMenu();
  });

  medirTodo();
  correrTareas();
})();
