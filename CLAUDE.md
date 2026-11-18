# marta marketing digital — web

Sitio de la agencia "marta marketing digital". Objetivo: presentar la agencia, servicios, forma de trabajar y, sobre todo, el portfolio, para que potenciales clientes pidan una propuesta. Estética cuidada, moderna, creativa; nada de plantilla corporativa genérica.

## Stack
HTML + CSS + JS sin frameworks ni build.
- `index.html`: estructura. Al principio del body, un sprite SVG con el logo vectorizado del original: `#logo-fijo` (m, rta, MARKETING, DIGITAL) y `#logo-a` (la "a" cortada, aparte porque es el rodillo). viewBox del logo: `0 0 1256 352`.
- `css/styles.css`: todos los estilos, tokens en `:root`.
- `js/main.js`: motor de scroll (array `tareas`, una pasada por cuadro), `vidrio()` (filtro SVG de vidrio estriado por elemento), rodillo de la "a" (`window.marta.girar`), y cada sección.
- `img/a.svg`: la "a" cortada sola (favicon). `img/belen.jpg`: foto de Belén (recortada para sacar un neón azul).
- `portfolio/<marca>/`: material de la clienta ya comprimido. `mini/N.jpg` y `mini/v1.jpg` (480 px, carrusel), `fotos/N.jpg` (1600 px), `videos/N.mp4` (H.264, 540 px de ancho o 960 si es horizontal) + `videos/N.jpg` (portada del video). Los originales vinieron en un zip de 1,8 GB; no subir originales al repo.
- `fonts/`: acá van los .woff2 de Neutral Sans (todavía no están; se usa Geist de fallback).

## Identidad (manual de marca)
- Colores: naranja `#ff6205`, carbón `#2b2a2a` (se usa en lugar del negro), negro `#0c0c0c`, crema `#ffeed2`, blanco `#ffffff`, gris `#4d4d4d`.
- Combinaciones de logo permitidas ("Usos correctos"): naranja/negro/gris sobre blanco o crema; crema/blanco/naranja sobre gris o negro; negro/blanco sobre naranja; gris sobre negro. **No** crema sobre naranja.
- Tipografías: **Special Gothic Expanded One** (una sola variable) solo para tamaños grandes/destacados, nunca texto chico. **Neutral Sans** (Regular, Medium, Bold, Black) para todo lo demás: textos largos en regular minúscula; títulos medium/bold/black; ítems y palabras sueltas en regular chica con interletrado.
- Gesto de marca: guion bajo naranja `_` al final de títulos.
- Nada de rayas o guiones largos (—) delante de etiquetas ni como separadores: a la clienta le parecen "muy de IA". Para separar, usar `·`.
- Conceptos fotográficos: reflejo/espejo, "a través de" (vidrios, vidrio estriado, desenfoques, sombras), ambientes y personas, movimiento y acción. Fotos en B/N, con filtro naranja, o a color sin tonos que desentonen (evitar azules y colores vibrantes).
- Logo: "marta" en Special Gothic con la "a" cortada (pieza superior + cuenco) y "MARKETING ··· DIGITAL" debajo.

## Decisiones tomadas
- Se reinició el sitio (oct 2026) y se rehizo como una landing continua: inicio (una pantalla: intro + presentación) → servicios (sección simple, sin fotos) → portfolio (carrusel 3D) → sobre Marta (banda blanca, con Belén) → contacto (banda gris, WhatsApp/email/Instagram/LinkedIn, con pie). Servicios (nov 2026, pedido de la clienta): social media, branding y diseño, publicidad en Meta Ads. No hay sección Nosotros. Textos de cada sección: los pasó la clienta (nov 2026); no reescribirlos sin pedirlo.
- Inicio: al terminar la intro, sola (sin scroll), el logo completo se corre y se achica hasta `.logo-destino` (a la derecha; en celular, arriba) y al lado entra la presentación ("las ideas sin estrategia son puro humo. acá preferimos que pasen cosas_", bajada y CTA "Quiero estrategia, no humo ↗"), que queda como pantalla inicial. No separar la "a" del logo ni ponerle las esquinas del visor en la presentación: la clienta dijo que así no representa la marca. Tramos en `T` y `pintarInicio(u)` en main.js.
- Portfolio (nov 2026): título "si vamos a hablar de criterio, mejor mostrarlo_" y un carrusel circular en 3D (como el ejemplo que pasó la clienta) con piezas de cada marca; gira solo, se arrastra, se acelera con el scroll y tiene flechas. Al tocar una pieza se abre un `<dialog>` con los videos de esa marca (la clienta pidió solo videos en el detalle; las fotos se usan en el carrusel). Las marcas y cuántas fotos/videos tiene cada una están en `trabajos` en main.js. Se frena con el botón de pausa, con el mouse encima o con el foco adentro. Con teclado solo la pieza de adelante recibe el foco (las flechas pasan de marca y Enter abre). Las imágenes (`mini/N.jpg` y `mini/v1.jpg`, 480 px) se cargan recién cuando el carrusel se acerca. La posición de cada pieza la calcula `pintarAnillo()` en JS (no usar `preserve-3d`/`perspective` de CSS: en Safari las piezas se encimaban).
- Efecto vidrio (`.vidrio` > `.lente`): feDisplacementMap con un mapa en diente de sierra generado en canvas; `--franja` define el ancho de cada canal, `--g` la intensidad. Las estrías de brillo van en `.vidrio::after`.
- Header fijo en crema esmerilado (texto negro, logo naranja, CTA "Hablemos"): aparece pasada la portada, se esconde al bajar y vuelve al subir; barra de avance naranja y la sección actual subrayada en naranja.
- Colores por banda: inicio y portfolio en crema, servicios y sobre Marta en blanco, contacto en gris (crema y blanco encima). No queda ninguna banda negra. Naranja solo como acento y en botones con texto negro.
- Apertura (nov 2026, pedido de la clienta): el logo en crema sobre negro (como el manual) y solo gira la segunda "a" como tragamonedas; sin visor ni desenfoque. Después el fondo pasa a crema, el logo a naranja y se corre al costado con la presentación (clase `.oscuro` en `.inicio`). Un clic, Esc, la rueda o deslizar la saltean; con `prefers-reduced-motion` se muestra directo la presentación. La apertura se ve una vez por sesión (`sessionStorage` "marta-intro"). Al pasar el mouse por el logo la "a" vuelve a girar.
- Servicios: título "te ayudamos a elegir qué necesita tu marca y eso también es estrategia_", 3 filas grandes (número, nombre, descripción) que se llenan de naranja al pasar el mouse, CTA "Hablemos de tu marca ↗". La clienta pidió pocas imágenes y animaciones acá.
- Paleta (nov 2026, pedido de la clienta): salir del negro con naranja. El inicio va en crema (fondo crema, texto negro, destacado en gris) y el naranja queda solo como acento gráfico (la "a", guiones, fondo de botón; como texto sobre crema no llega al contraste). Las secciones que se rehagan siguen esta línea; las que todavía no se tocaron conservan el look oscuro.

## Pendientes
- Cuando haya dominio, poner la URL completa en `og:image` (hoy `img/compartir.jpg`, relativa: WhatsApp y Facebook necesitan la URL completa para mostrar la vista previa).
- SVG original del logo (el actual está vectorizado desde un PNG de 1667 px; coincide casi píxel a píxel, pero conviene el archivo del manual).
- Archivos de Neutral Sans en `fonts/`.
- Nombres reales de las marcas del portfolio (hoy figuran por rubro: Pastelería, Pizzería, etc.). LinkedIn: la clienta pasó el link del panel de admin; se usa el público (`/company/108857338/`), confirmar que abra bien.

## Vista previa publicada
Artifact: https://claude.ai/artifact/SuYF71AnkwPgani7xNJbM8
Para actualizarla: generar una página sin `<!doctype>/<html>/<head>/<body>` ni metas charset/viewport a partir de `index.html` (con `<meta name="claude:viewport-fit-sides" content="cover">` arriba) y publicarla con `url` = ese link, `root` = esta carpeta y `files` = css/styles.css, js/main.js, img/a.svg.

## Movimiento de textos
Atributos en el HTML (ver styles.css y `partir()` en main.js): `data-letras` (letra por letra desde abajo, desenfocado y con giro), `data-palabras` (palabra por palabra), `data-mov="abajo|izq|der"` (bloque entero desde ese lado, demora en `--d`), `data-deriva="1|-1"` (título que se corre de costado con el scroll). Fuera de `.inicio` se activan con IntersectionObserver (`.mov-on`) y se reinician al salir por abajo; dentro de `.inicio` los activa `.panel-on`. Las bandas con movimiento llevan `overflow: clip`. Cerca del final de la página usar `izq`/`der` (no `abajo`), si no el elemento nunca llega a entrar.

## Rendimiento
Los efectos de scroll son tareas que corren una vez por cuadro (`tareas`). Las posiciones se miden solo al cargar y al cambiar el tamaño (`medidores`); durante el scroll no se leen medidas, solo se escriben estilos. Evitar filtros SVG/blur grandes animados: preferir transform y opacity.

## UX/UI
Siempre aplicar reglas de UX/UI: contraste WCAG AA (4,5:1 texto normal, 3:1 texto grande y gráficos), áreas táctiles de 44px, foco visible, `prefers-reduced-motion`. Naranja sobre crema (2,6:1) solo en tamaños grandes; texto secundario sobre negro con crema ≥ 55 %; sobre naranja, negro ≥ 80 %.

## Idioma
Todo en español rioplatense (voseo).
