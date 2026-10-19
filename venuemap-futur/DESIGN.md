# VenueMap FUTUR — interfaz

## Alcance y modo

Modo **Operate**: localizar una zona, entender su función, explorar el recinto y ensayar un recorrido. El modelo 3D, la geometría, los edificios, el terreno y el diseño de la página provienen del render creado en Claude para FUTUR 2026. La versión anterior del repositorio es la referencia funcional: todo lo que el usuario podía hacer sigue disponible, adaptado a este modelo.

Sedes por día, según la información del festival: Día 1 (viernes 13 de noviembre, 18:00 a 02:00) en Nave Lewis; Día 2 (sábado 14 de noviembre, 12:00 a 02:00) en La Grúa y Horno 3, dentro del Parque Fundidora.

## Modelo 3D

- three.js r128 servido desde `vendor/`, sin CDN. Renderizado bajo demanda: no hay bucle continuo; solo se dibuja al mover la cámara, cambiar de estado o durante la demostración.
- Las sombras se calculan una vez por día o ambiente (`shadowMap.autoUpdate = false`), porque la geometría es estática. Los árboles y faroles usan instancias.
- Todas las posiciones están en píxeles de los planos oficiales (`venue-data.js`); `cal` convierte el plano isométrico en coordenadas del modelo. No son coordenadas GPS ni metros.
- Arquitectura real investigada: Horno 3 con su estructura de acero, elevador inclinado, colector, estufas Cowper, chimenea y Galería del Acero circular; La Grúa con vigas de celosía, carro y rieles; naves con techo a dos aguas, linternilla y ventanales. Las proporciones son aproximadas.
- Los caminos visibles se generan con la misma red peatonal que usa la navegación (`navigation-data.js`): una ruta solo recorre lo que se ve como camino.
- Rótulos de edificios (NAVE LEWIS, HORNO 3, LA GRÚA) y nombres de zonas son etiquetas HTML proyectadas: participan en el control de solapamientos y ceden ante marcadores y controles.

## Composición

- Escritorio: FUTUR y fecha en la cabecera; días y ambiente a la derecha. Búsqueda y directorio en una columna de 288 px; el recinto flota sobre el cielo a la derecha; categorías bajo el mapa.
- Tableta y móvil: cabecera compacta, búsqueda con acceso al directorio y al plano; mapa central; categorías con desplazamiento horizontal. La ficha aparece abajo y los controles de zoom siguen disponibles.
- Horizontal corto: búsqueda en la cabecera, mapa apaisado y controles en fila.
- Encuadre inicial calculado con los vértices del modelo. En pantallas verticales la cámara elige, entre giros de 22,5°, el que mejor llena la pantalla, con preferencia por el ángulo del póster.
- «Ampliar mapa» activa Solo mapa: ocupa el viewport y oculta cabecera, directorio, fichas, filtros y textos. «Volver» o Escape restauran la vista anterior. No depende de la pantalla completa nativa.

## Sistema visual

| Rol | Valor |
| --- | --- |
| Cielo atardecer | `#b8592a` → `#a65d84` → `#4d5b93` → `#141c44` |
| Cielo noche | `#1b1747` → `#2e1f58` → `#18224f` → `#070a1b` |
| Panel | `#161f4b` |
| Control elevado | `#25316d` |
| Texto | `#ffffff`; secundario en paneles `#cfd5f2` |
| Activo | píldora blanca con texto `#1d2b6b` |
| Acento cálido | `#ffc48a`, solo sobre paneles (selección, avisos breves) |
| Ruta | línea `#208fe9` con borde blanco |
| Familia | Archivo (variable, servida localmente; ancho 100–125 %, peso 400–800) |
| Radios | píldoras en controles; 16 px en paneles |
| Objetivos táctiles | 44 px en controles principales y marcadores |

El cielo está oscurecido respecto al póster para que el texto blanco cumpla AA sobre él; el texto secundario atenuado solo se usa dentro de paneles. Los marcadores son círculos con borde blanco, como en el plano oficial; los colores por categoría se mantienen. La trama de semitono del póster es estática y casi imperceptible.

## Movimiento e interacción

- Ficha: transición interrumpible de opacidad y desplazamiento, 200–220 ms, `cubic-bezier(.23,1,.32,1)`.
- Botones: confirmación de pulsación de 140 ms con escala `.97`. Hover con movimiento solo para puntero preciso.
- «Centrar esta zona»: transición de cámara de 320 ms con curva de entrada y salida. Las teclas no animan.
- Cambio de ambiente: fundido del cielo de 240 ms. Los haces de luz de los escenarios son estáticos.
- Movimiento reducido: sin transiciones de cámara ni desplazamientos; la ficha conserva un fundido de 100 ms.
- Teclado sobre el mapa: flechas para rotar, `+`/`-` para zoom, `Inicio` para el encuadre completo. Escape cierra en orden: panel de rutas, demostración, Solo mapa, directorio y ficha.
- Un gesto puede empezar sobre un marcador: si el dedo se desplaza, gira o hace zoom; si no se mueve, selecciona.
- Plano en `<dialog>` nativo: foco protegido, cierre con Escape y retorno al botón de origen.
- Búsqueda con y sin acentos, por varias palabras y sinónimos de categoría; resultados vacíos recuperables; Enter abre el primer resultado.

## Navegación propia del festival

Flujo: elegir zona → «Cómo llegar» → revisar origen y destino → ver ruta → «Iniciar demo». Todo ocurre en el modelo de VenueMap, sin mapas, iframes ni enlaces externos.

- Grafo: los tramos de `navigation-data.js` se dividen en sus cruces y en los puntos de acceso de origen y destino; Dijkstra calcula el recorrido más corto. Los tramos que entran en el radio de una zona restringida no existen para el público, y Backstage no admite rutas.
- Las zonas tienen un punto de acceso propio cuando su marcador está sobre un edificio o escenario (por ejemplo, el frente de cada escenario).
- La línea, el destino y la persona simulada se dibujan dentro del modelo, sobre el terreno. Durante la demo, una flecha en el camino apunta en el sentido del recorrido.
- La demo activa Solo mapa con una cámara cercana que sigue el recorrido detrás de la flecha. Instrucciones de giro calculadas con el grafo; paso actual y total. Reproducción de 18 s, pausa, paso anterior y siguiente. Cualquier arrastre, zoom o tecla de exploración suspende el seguimiento; «Recentrar» lo retoma. «Opciones» abre el panel y pausa. Cerrar o Escape restauran la vista anterior y conservan la ruta; «Volver» también termina la demo. Cambiar de día o elegir otra zona elimina el recorrido.
- Movimiento reducido: la demo empieza pausada, sin reproducción automática; el avance manual y Recentrar siguen disponibles.
- Sin metros, tiempos de llegada ni calles inventadas. El distintivo de simulación permanece visible.

## Ubicación

«Mi ubicación» pide el permiso del navegador solo al pulsar su botón. Muestra el estado y la precisión aproximada; no coloca al usuario sobre el modelo porque falta calibración geográfica. Las coordenadas no se guardan, registran ni envían. El seguimiento se detiene al cerrar el panel, detenerlo, ocultar la página o salir. Estados cubiertos: lectura válida, imprecisa, antigua, permiso denegado, señal no disponible, tiempo agotado, API ausente y solicitud pendiente.

`navigation-data.js` declara `kind: 'concept-demo'` y `calibration: null`. Para habilitar orientación real hacen falta coordenadas verificadas del plano, caminos peatonales y accesos del festival.

## Aplicación de las skills

**Impeccable:** contexto del proyecto, modo Operate, piso de calidad y detector mecánico sobre la página construida (sin hallazgos tras ajustar el contraste del texto sobre el cielo y el tamaño mínimo en 320 px).

**Emil Kowalski / animate:** solo se anima lo que comunica estado o lugar (ficha, centrar zona, cambio de ambiente, seguimiento de cámara). Sin animación en acciones de teclado ni bucles decorativos; curvas y duraciones de su tabla; movimiento reducido incluido.

**Taste Skill:** orientada a páginas públicas; aquí solo se tomó el principio de marco estable del póster (FUTUR y sus herramientas permanecen mientras cambia el recinto). No se aplicaron composiciones de marketing a los controles del mapa.

## Límites

La reconstrucción es conceptual y no oficial. No es un sistema de orientación física ni de emergencias. Los planos integrados (`planos/`) son los suministrados para cada día y no sustituyen al plano oficial del organizador.
