# VenueMap FUTUR — interfaz

## Alcance y modo

Refinamiento de la interfaz existente. Modo **Operate**: localizar una zona, entender su función y explorar el recinto. Se conservan los dos días, sus diez puntos respectivos, las descripciones, los planos compartidos, la geometría y el visor Canvas 3D compatible.

La identidad sigue siendo FUTUR: fondo azul noche, texto claro y acento cálido. El modelo del recinto es el elemento dominante; la interfaz lo acompaña sin una portada intermedia.

## Composición

- Escritorio: identidad y días en la cabecera; búsqueda y directorio de zonas en una columna de 288 px; mapa a la derecha; categorías bajo el mapa.
- Tableta y móvil: cabecera compacta, búsqueda y acceso al directorio; mapa central; categorías con desplazamiento horizontal. La información seleccionada aparece abajo y mantiene los controles de zoom disponibles.
- Horizontal corto: búsqueda en la cabecera, mapa apaisado y controles horizontales.
- El encuadre inicial se ajusta a los vértices reales del modelo. Las etiquetas con conflictos visuales se ocultan; sus marcadores y entradas del directorio siguen disponibles.

## Sistema visual

| Rol | Valor |
| --- | --- |
| Fondo | `#0d1422` |
| Panel | `#151e2e` |
| Control elevado | `#202c40` |
| Texto | `#f5f4f0` |
| Texto secundario | `#b3b9c8` |
| Acento de acción y selección | `#ffb779` sobre `#291a13` |
| Familia | Sans del sistema; sin fuentes remotas |
| Espaciado | 4, 8, 12, 16, 24 y 32 px |
| Radios | 12 px en controles; 16 px en fichas; 20–24 px en mapa |
| Objetivos táctiles | 44 px en controles principales y marcadores |

Los colores semánticos de escenarios, comida, barras y servicios se conservan. Los iconos locales usan el mismo trazo SVG. Los textos de zonas y descripciones priman sobre los símbolos.

## Movimiento e interacción

- Ficha: transición interrumpible de opacidad y desplazamiento, 200–220 ms, `cubic-bezier(.23,1,.32,1)`.
- Botones: confirmación de pulsación de 140 ms con escala `.97`.
- Hover con movimiento solo para ratón o puntero preciso.
- Movimiento reducido: la ficha conserva una transición de opacidad de 100 ms y elimina el desplazamiento. No hay animaciones continuas del mapa.
- Flechas del teclado para rotar el mapa; `+`/`-` para zoom; `Inicio` para el encuadre completo.
- Plano en `<dialog>` nativo: foco protegido, cierre con Escape y retorno al botón de origen.
- Búsqueda con y sin acentos, resultados vacíos recuperables y estados `aria-pressed`.

## Aplicación de las skills

**Impeccable:** distribución por tarea, separación entre mapa y herramientas, adaptación estructural por tamaño, jerarquía y estados. Se usó su contexto, evaluación de layout y detector mecánico.

**Emil Kowalski:** las animaciones comunican selección o confirmación; se evitan esperas, bucles decorativos y dependencias de movimiento. La ficha usa transiciones interrumpibles y los gestos siguen controlando el visor directamente.

**Taste Skill:** investigación de referencias y marco visual. El sorteo produjo la dirección «The pinned poster», semilla `1050761360`, conservando paleta y tipo. Se tomó el principio de marco estable con contenido central cambiante: FUTUR y sus herramientas permanecen mientras cambia el día y el recinto. No se impuso la composición de una landing con scroll, fotografía o titulares sobre los controles del mapa, porque este es un producto operativo.

Referencias consultadas: [Woov](https://www.woovapp.com/es), [Dekmantel](https://dekmantelfestival.com/), y las notas de Taste sobre Revelatio Studio, Glitch&Grit y Builders Table. Se toma el principio de jerarquía y marco, sin copiar sus imágenes, textos ni activos.

## Límites

La reconstrucción continúa siendo conceptual y no oficial. No es un sistema de orientación física, rutas ni emergencias. La interfaz no añade datos de ubicación o de programa del evento. Los planos e imágenes integrados siguen siendo los suministrados originalmente.
