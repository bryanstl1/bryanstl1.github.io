# VenueMap FUTUR — instrucciones del proyecto

Alcance: esta carpeta, `venuemap-futur/`. Conserva las funciones existentes del mapa, su navegación, filtros y controles. Los cambios en el media kit y SELLA requieren una solicitud aparte.

## Skills instaladas

Abre esta carpeta como directorio de trabajo para que el agente descubra las skills locales. Para cambios de interfaz, lee las instrucciones pertinentes antes de editar:

- `.agents/skills/emil-design-eng/SKILL.md`: decisiones de diseño y detalles de interacción.
- `.agents/skills/animate/SKILL.md`: construir movimiento funcional, accesible y ligero.
- `.agents/skills/impeccable/SKILL.md`: revisar y mejorar jerarquía, layout, tipografía y calidad de interfaz.
- `.agents/skills/design-taste-frontend/SKILL.md`: investigación de referencias y dirección visual para páginas públicas. No aplicar sus composiciones de marketing a los controles operativos del mapa.

Para usar las versiones de Claude Code, lee `CLAUDE.md`.

La instalación y su verificación no autorizan un rediseño. Cuando se solicite un cambio visual, sigue la petición concreta, respeta la identidad existente y verifica el resultado en móvil y escritorio, además de las funciones afectadas.

Consulta `DESIGN-SKILLS.md` para uso, requisitos, fuentes y revisiones.

## Estructura del mapa

- `index.html`: marcado de la página. Carga los scripts en este orden: `vendor/three.min.js`, `venue-data.js`, `navigation-data.js`, `scene3d.js`, `interface.js`, `navigation.js`, `app.js`.
- `venue-data.js`: geometría del modelo y zonas de cada día, en píxeles de los planos oficiales.
- `navigation-data.js`: red peatonal en las mismas coordenadas. Es a la vez los caminos que dibuja el modelo y el grafo de rutas; cualquier tramo nuevo debe evitar edificios, agua, escenarios y zonas restringidas.
- `scene3d.js`: modelo 3D con three.js, cámara, proyección y capa de ruta. Dibuja bajo demanda.
- `app.js`: estado, días, gestos, marcadores y selección. `interface.js`: directorio, búsqueda, filtros, planos, Solo mapa, teclado y ambiente. `navigation.js`: rutas, demostración guiada y ubicación.
- `vendor/`, `fonts/` y `planos/`: three.js r128, Archivo y los planos de referencia, servidos localmente.

Consulta `DESIGN.md` para el sistema visual y el comportamiento, y `UI-VALIDATION.md` para la última verificación.
