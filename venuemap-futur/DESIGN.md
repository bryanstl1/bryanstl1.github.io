# VenueMap FUTUR — interfaz

## Alcance y modo

Refinamiento de la interfaz existente. Modo **Operate**: localizar una zona, entender su función y explorar el recinto. Se conservan los dos días, sus diez puntos respectivos, las descripciones, los planos compartidos, la geometría y el visor Canvas 3D compatible.

La identidad sigue siendo FUTUR: fondo azul noche, texto claro y acento cálido. El modelo del recinto es el elemento dominante; la interfaz lo acompaña sin una portada intermedia.

## Composición

- Escritorio: identidad y días en la cabecera; búsqueda y directorio de zonas en una columna de 288 px; mapa a la derecha; categorías bajo el mapa.
- Tableta y móvil: cabecera compacta, búsqueda y acceso al directorio; mapa central; categorías con desplazamiento horizontal. La información seleccionada aparece abajo y mantiene los controles de zoom disponibles.
- Horizontal corto: búsqueda en la cabecera, mapa apaisado y controles horizontales.
- El encuadre inicial se ajusta a los vértices reales del modelo. Las etiquetas con conflictos visuales se ocultan; sus marcadores y entradas del directorio siguen disponibles.
- «Ampliar mapa» activa una vista de solo mapa que ocupa todo el viewport y oculta cabecera, directorio, fichas, filtros y textos. «Volver» o Escape restablecen la vista anterior. Los controles de zoom siguen disponibles; no se depende de la API nativa de pantalla completa.

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

La reconstrucción continúa siendo conceptual y no oficial. No es un sistema de orientación física ni emergencias. La interfaz no añade datos verificados del recinto ni del programa del evento. Los planos e imágenes integrados siguen siendo los suministrados originalmente.

## Ubicación y vista previa de rutas

- «Mi ubicación» solicita el permiso del navegador únicamente tras pulsar su botón. Muestra el estado de la señal y su precisión aproximada; no coloca al usuario sobre el modelo porque falta calibración geográfica. La aplicación no persiste ni transmite las coordenadas. El seguimiento se detiene al cerrar el panel, detenerlo expresamente o salir de la página.
- «Cómo llegar» permite elegir origen y destino, o partir de una zona seleccionada. Los caminos son los trazos del modelo conceptual, separados por día, sin coordenadas GPS. Un grafo divide sus intersecciones y calcula el recorrido más corto hasta un punto próximo al destino. Backstage queda excluido. No se muestran metros ni tiempos reales.
- La línea azul se proyecta con la cámara del mapa. El punto que recorre la línea es una persona simulada. El distintivo de simulación permanece visible, también en Solo mapa. La ficha de zona se oculta mientras hay una ruta para dejar espacio al recorrido.
- Un panel contextual separa Rutas y Mi ubicación. En móvil, los controles de simulación preceden al formulario; el panel se cierra al mostrar la ruta y puede reabrirse desde el distintivo. Avanzar y el deslizador permiten recorrer la demostración manualmente.
- La reproducción dura 18 segundos y actualiza solo la capa SVG. Se pausa al cerrar el panel o cambiar de pestaña. Con movimiento reducido, la reproducción automática queda desactivada y se mantienen los controles manuales.

Para habilitar orientación real hacen falta coordenadas verificadas del plano, caminos peatonales y accesos del festival. `navigation-data.js` declara esta versión como `concept-demo` y deja su calibración en `null`.

## Navegación dentro del modelo

La experiencia se inspira en una aplicación de navegación: elegir destino, revisar una ruta, iniciar un recorrido y recibir la próxima instrucción. Todo ocurre sobre el mapa propio de VenueMap, sin mapas, iframes, enlaces ni servicios externos añadidos.

Tras calcular una ruta, una ficha compacta muestra destino y «Iniciar demo». La demostración activa Solo mapa, acerca la cámara al camino y orienta una flecha en la dirección del recorrido. Una banda presenta el próximo giro calculado con los segmentos del grafo y el paso actual, sin inventar calles, metros ni tiempos de llegada. La etiqueta de simulación permanece visible.

La cámara sigue el punto simulado; cualquier gesto, zoom o tecla de exploración suspende el seguimiento. «Recentrar» permite retomarlo. Pausa, paso anterior y siguiente permanecen disponibles sobre el mapa. «Opciones» abre el panel y pausa la reproducción. Cerrar o Escape restablecen la vista anterior y conservan la ruta para revisarla; cambiar de día o seleccionar otra zona elimina el recorrido anterior. Volver desde Solo mapa también termina la demostración.

El terreno se actualiza bajo demanda, con seguimiento limitado a diez actualizaciones por segundo. Las instrucciones solo se actualizan cuando cambian. Con movimiento reducido, el recorrido comienza pausado, sin reproducción automática; el avance manual y el recentrado continúan disponibles.

La maqueta continúa sin calibración geográfica. El punto y las instrucciones pertenecen a una demostración del grafo conceptual; no se presentan como posición GPS ni guía física dentro del festival.
