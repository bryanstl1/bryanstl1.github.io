# Validación de interfaz — 18 octubre 2026

Integración del modelo 3D y el diseño creados en Claude con las funciones de la versión anterior. Comprobación local por HTTP en Chromium 141 (Playwright, WebGL por SwiftShader), con capturas revisadas a mano. No se afirma una prueba en un iPhone físico ni en Safari.

| Tamaño | Resultado |
| --- | --- |
| Escritorio 1440 × 900 | Correcto |
| Móvil 390 × 844 | Correcto |
| Móvil pequeño 320 × 568 | Correcto |
| Tableta 768 × 1024 | Correcto |
| Horizontal 844 × 390 | Correcto |
| Móvil 390 × 844 con movimiento reducido | Correcto |

## Funciones comprobadas en cada tamaño

- Ambos días: directorio completo, marcadores visibles, `aria-pressed` de días y categorías.
- Las ocho categorías: recuento del directorio y del mapa; el mapa solo muestra la categoría elegida.
- Búsqueda con y sin acentos («bano», «baños», «medico», «MÉDICO»), por varias palabras («barra pista»), sin resultados y recuperación con «Mostrar todas las zonas», y botón de limpiar.
- Selección desde el directorio y desde un marcador del mapa; ficha visible; «Centrar esta zona» lleva la cámara a la zona; cierre de la ficha.
- Cámara: acercar, alejar, restablecer, flechas, `+`/`-`, `Inicio`, arrastre, rueda y pellizco con eventos táctiles reales de Chromium.
- Planos de referencia de ambos días: apertura, imagen cargada y propia de cada día, cierre con Escape y retorno del foco al botón, también cuando se abrió con un toque.
- Solo mapa: ocupa todo el viewport, oculta paneles y conserva el zoom; Escape y «Volver» restauran día, selección y cámara.
- Ambiente nocturno y vuelta al atardecer.
- Objetivos táctiles de al menos 40 px (44 px en controles principales) y sin desbordamiento horizontal.
- Sin errores de JavaScript ni solicitudes a otros dominios. three.js, la fuente y los planos se sirven desde la carpeta del proyecto. También abre directamente desde el archivo HTML.

## Navegación

- Matriz de rutas: 824 de 824 pares dirigidos de zonas públicas (ambos días) tienen recorrido, y ningún tramo entra en el radio de una zona restringida. Backstage no admite ruta.
- Red peatonal validada aparte contra el modelo: ningún tramo cruza naves, bloques, agua, canales, escenarios, piezas de Horno 3 ni patas de La Grúa; ninguno sale del terreno; cada zona pública queda a menos de 40 px del plano de su camino.
- Flujo completo en cada tamaño: «Cómo llegar» desde la ficha, ficha de ruta con origen y destino, revisión en el panel, cambio de destino y «Ver ruta de prueba», «Iniciar demo».
- Demostración: Solo mapa automático, flecha orientada en el modelo, instrucción de giro y paso actual, cámara cercana, avance de la reproducción y seguimiento de cámara, pausa, paso siguiente y anterior, exploración manual que suspende el seguimiento y «Recentrar» que lo retoma.
- «Opciones» abre el panel y pausa; Escape lo cierra; un segundo Escape termina la demo, vuelve a la vista completa y conserva la ruta. «Volver» y la X también terminan la demo. Una demo iniciada dentro de Solo mapa conserva ese modo.
- Elegir otra zona o cambiar de día elimina el recorrido del modelo y de la interfaz.
- Los controles de la demo, la instrucción, el zoom y «Volver» no se superponen en ningún tamaño.
- Con movimiento reducido la demo empieza pausada y sin reproducción automática; los pasos manuales funcionan.

## Ubicación

GPS simulado mediante un reemplazo de la API del navegador: lectura válida con precisión de ±15 m, lectura imprecisa, lectura antigua, permiso denegado, señal no disponible, tiempo agotado, API ausente y solicitud pendiente; tras detener, una respuesta tardía se ignora. Ni la carga de la página, ni las rutas, ni la demo piden ubicación. Las coordenadas no aparecen en la interfaz ni se guardan en el almacenamiento local o de sesión, y no se coloca una posición sobre el modelo. Cerrar el panel detiene el seguimiento. No se solicitó ubicación real.

## Rendimiento

Carga lista en unos 0,75 s en local; cambio de día en unos 35 ms; un fotograma del modelo en unos 2 ms en este entorno. Sin bucle de animación continuo: el modelo se dibuja bajo demanda y las sombras se calculan una vez por día o ambiente. Peso total de la página sin comprimir: unos 0,9 MB, de los que three.js ocupa 0,6 MB (GitHub Pages lo sirve comprimido).

## Revisión visual y detector

Capturas de ficha, ruta, panel de rutas, demostración y ambiente nocturno en los cinco tamaños. Se corrigieron durante la revisión: etiquetas que quedaban bajo el zoom o salían por el borde (ahora pasan al otro lado o se ocultan), rótulos de edificios tapados por marcadores (ahora ceden), la cabecera en 320 px y el botón «Reproducir» recortado en pantalla pequeña.

El detector de Impeccable sobre `index.html` no encontró problemas tras subir a blanco el texto que va directamente sobre el cielo y fijar 11 px como tamaño mínimo.

Pendiente fuera de esta verificación: prueba en dispositivos físicos y en Safari/iOS. La validación cubre la interfaz y el recorrido conceptual; no certifica caminos, posiciones ni accesos reales del montaje del festival.
