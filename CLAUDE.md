# marta marketing digital — web

Sitio de la agencia "marta marketing digital". Objetivo: presentar la agencia, servicios, forma de trabajar y, sobre todo, el portfolio, para que potenciales clientes pidan una propuesta. Estética cuidada, moderna, creativa; nada de plantilla corporativa genérica.

## Stack
HTML + CSS + JS sin frameworks ni build.
- `index.html`: estructura. Al principio del body, un sprite SVG con el logo vectorizado del original: `#logo-fijo` (m, rta, MARKETING, DIGITAL) y `#logo-a` (la "a" cortada, aparte porque es el rodillo). viewBox del logo: `0 0 1256 352`.
- `css/styles.css`: todos los estilos, tokens en `:root`.
- `js/main.js`: motor de scroll (array `tareas`, una pasada por cuadro), `vidrio()` (filtro SVG de vidrio estriado por elemento), rodillo de la "a" (`window.marta.girar`), `foco()` reutilizable y cada sección.
- `img/a.svg`: la "a" cortada sola (favicon).
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
- Se reinició el sitio (oct 2026) y se rehizo como una landing continua: inicio (una pantalla: intro + presentación) → servicios (sección simple, sin fotos) → proyectos (pantalla fija de 650vh) → cinta → equipo → contacto (con pie). Servicios (nov 2026, pedido de la clienta): social media, branding y diseño, publicidad en Meta Ads. No hay sección Nosotros. Las secciones que siguen a servicios se van a rehacer: no pulirlas.
- Inicio: al terminar la intro, sola (sin scroll), el logo completo se corre y se achica hasta `.logo-destino` (a la derecha; en celular, arriba) y al lado entra la presentación ("las ideas sin estrategia son puro humo. acá preferimos que pasen cosas_", bajada y CTA "Quiero estrategia, no humo ↗"), que queda como pantalla inicial. No separar la "a" del logo ni ponerle las esquinas del visor en la presentación: la clienta dijo que así no representa la marca. Tramos en `T` y `pintarInicio(u)` en main.js.
- Proyectos: un proyecto por pantalla de scroll; en cada cambio la foto que se va se deshace en canales de vidrio estriado y la nueva aparece desde el vidrio (franjas con `--g`/`--o`, solo transform y opacity), con el título reflejado abajo (concepto reflejo). Equipo enfoca cada retrato al llegar al centro.
- Efecto vidrio (`.vidrio` > `.lente`): feDisplacementMap con un mapa en diente de sierra generado en canvas; `--franja` define el ancho de cada canal, `--g` la intensidad. Las estrías de brillo van en `.vidrio::after`.
- Header fijo con vidrio esmerilado: aparece pasada la portada, se esconde al bajar y vuelve al subir; barra de avance naranja.
- Colores por banda: negro/carbón con naranja y crema; equipo en crema con negro y naranja; cinta y contacto en naranja solo con negro y blanco. 
- Efecto "foco" (`.foco` + `.foco-escena` + `.foco-blur` + `.visor`): la escena está desenfocada, un visor con esquinas naranjas la recorre, se frena en un objetivo y se abre hasta un marco. Se usa en la portada y en servicios.
- Portada: pantalla borrosa → visor con esquinas naranjas recorre la pantalla → se frena en el logo → la "a" gira como tragamonedas → el visor se expande y todo queda nítido → queda la pantalla con el logo naranja centrado sobre negro (no hay header ni hero). Al pasar el mouse la "a" vuelve a girar. Se salta con clic/Esc (va directo al estado final); con `prefers-reduced-motion` se muestra el estado final.
- Servicios: título "te ayudamos a elegir qué necesita tu marca y eso también es estrategia_", 3 filas grandes (número, nombre, descripción) que se llenan de naranja al pasar el mouse, CTA "Hablemos de tu marca ↗". La clienta pidió pocas imágenes y animaciones acá.
- Paleta (nov 2026, pedido de la clienta): salir del negro con naranja. El inicio va en crema (fondo crema, texto negro, destacado en gris) y el naranja queda solo como acento gráfico (la "a", guiones, fondo de botón; como texto sobre crema no llega al contraste). Las secciones que se rehagan siguen esta línea; las que todavía no se tocaron conservan el look oscuro.

## Pendientes
- SVG original del logo (el actual está vectorizado desde un PNG de 1667 px; coincide casi píxel a píxel, pero conviene el archivo del manual).
- Archivos de Neutral Sans en `fonts/`.
- Fotos reales: las de `img/ejemplos/` son de ejemplo (Unsplash vía picsum.photos, en B/N) para proyectos; los retratos del equipo siguen siendo placeholders CSS. También casos, nombres, email e Instagram reales.
- Conectar el formulario (Formspree o backend).

## Vista previa publicada
Artifact: https://claude.ai/artifact/SuYF71AnkwPgani7xNJbM8
Para actualizarla: generar una página sin `<!doctype>/<html>/<head>/<body>` ni metas charset/viewport a partir de `index.html` (con `<meta name="claude:viewport-fit-sides" content="cover">` arriba) y publicarla con `url` = ese link, `root` = esta carpeta y `files` = css/styles.css, js/main.js, img/a.svg.

## Movimiento de textos
Atributos en el HTML (ver styles.css y `partir()` en main.js): `data-letras` (letra por letra desde abajo, desenfocado y con giro), `data-palabras` (palabra por palabra), `data-mov="abajo|izq|der"` (bloque entero desde ese lado, demora en `--d`), `data-deriva="1|-1"` (título que se corre de costado con el scroll). Fuera de `.inicio` se activan con IntersectionObserver (`.mov-on`) y se reinician al salir por abajo; dentro de `.inicio` y `.proy` los activan `.panel-on` y `.proy-capa.activo`. Las bandas con movimiento llevan `overflow: clip`. Cerca del final de la página usar `izq`/`der` (no `abajo`), si no el elemento nunca llega a entrar.

## Rendimiento
Los efectos de scroll son tareas que corren una vez por cuadro (`tareas`). Las posiciones se miden solo al cargar y al cambiar el tamaño (`medidores`); durante el scroll no se leen medidas, solo se escriben estilos. Evitar filtros SVG/blur grandes animados: preferir transform y opacity.

## UX/UI
Siempre aplicar reglas de UX/UI: contraste WCAG AA (4,5:1 texto normal, 3:1 texto grande y gráficos), áreas táctiles de 44px, foco visible, `prefers-reduced-motion`. Naranja sobre crema (2,6:1) solo en tamaños grandes; texto secundario sobre negro con crema ≥ 55 %; sobre naranja, negro ≥ 80 %.

## Idioma
Todo en español rioplatense (voseo).
