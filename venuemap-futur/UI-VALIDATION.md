# Validación de interfaz — 18 octubre 2026

Comprobación local en Chromium 153, mediante HTTP y capturas de navegador. No se afirma una prueba en un iPhone físico ni en Safari.

| Tamaño | Resultado |
| --- | --- |
| Escritorio 1440 × 900 | Correcto |
| Móvil 390 × 844 | Correcto |
| Móvil pequeño 320 × 568 | Correcto |
| Tableta 768 × 1024 | Correcto |
| Horizontal 844 × 390 | Correcto |

En cada tamaño se comprobaron ambos días, las ocho categorías, los recuentos de zonas, búsqueda sin acentos, búsqueda sin resultados y recuperación, selección desde el directorio, ficha de información, centrar zona, zoom, restablecer, rotación con puntero y teclado, apertura del plano, carga de sus imágenes y cierre con Escape. También se verificó que el día 2 muestra su propio plano y sus cuatro escenarios.

No hubo excepciones de JavaScript, solicitudes fallidas de activos ni desbordamiento horizontal del documento durante esos recorridos. Los controles principales mantienen objetivos de al menos 44 px, salvo los botones de día en horizontal corto, de 40 px de alto.

Se comprobó el gesto de pellizco con eventos táctiles reales de Chromium. Con `prefers-reduced-motion: reduce`, la ficha no tiene transformaciones y conserva solo una transición breve de opacidad. La vista también abre directamente desde el archivo HTML con sus dos archivos de interfaz locales.

## Revisión visual

| Antes | Después | Motivo |
| --- | --- | --- |
| Introducción y panel permanente sobre el mapa | Directorio lateral en escritorio; búsqueda compacta y ficha contextual en móvil | Dar prioridad al recinto |
| Controles pequeños y ocultos al seleccionar | Controles de 44 px disponibles con la ficha abierta | Mantener zoom y restauración accesibles |
| Iconos de varios estilos y emojis | SVG locales de trazo consistente | Unificar la interfaz sin dependencias remotas |
| El modelo se recorta según el tamaño | Encuadre inicial calculado con sus vértices | Adaptar la cámara a la pantalla |
| Plano en una capa sin foco protegido | Diálogo nativo con cierre y retorno de foco | Mejorar navegación con teclado |

## Integridad y detector

Se compararon con la versión anterior, sin diferencias, la construcción geométrica del recinto, los datos de los puntos de ambos días y las cinco imágenes integradas.

El detector de Impeccable no encontró errores; conservó una advertencia de texto de 11 px. Corresponde a metadatos y etiquetas secundarias de una interfaz compacta; los nombres de zonas, búsqueda y descripciones tienen mayor tamaño. Los avisos legales en móvil usan 10 px. No se añadieron dependencias de ejecución, fuentes ni imágenes externas.

Pendiente fuera de esta verificación: prueba en dispositivos físicos y Safari/iOS. El visor continúa siendo una reconstrucción conceptual no oficial.

## Modo Solo mapa

En los cinco tamaños anteriores se verificó que «Ampliar mapa» hace coincidir el rectángulo de la escena con todo el viewport; oculta los paneles, textos y filtros; mantiene el zoom; y deja visible el botón «Volver». Al salir se conserva el día, la selección y la cámara anterior. También se comprobaron activaciones repetidas, cierre con Escape, retorno del foco y ausencia de excepciones JavaScript. No se usa la API nativa de pantalla completa.
