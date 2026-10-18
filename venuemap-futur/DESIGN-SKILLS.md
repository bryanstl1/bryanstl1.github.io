# Skills de diseño de VenueMap FUTUR

Instalación local del proyecto para Claude Code y Codex. Abre la carpeta `venuemap-futur` como directorio de trabajo. Los archivos publicados del media kit, SELLA y VenueMap no se modifican con esta instalación.

## Skills disponibles

| Familia | Skill | Uso |
| --- | --- | --- |
| Emil Kowalski | `emil-design-eng` | Decisiones de interfaz, detalles y animaciones. |
| Emil Kowalski | `animate` | Implementar animaciones con curvas, duración y movimiento reducido. |
| Impeccable | `impeccable` | Revisar y mejorar jerarquía, layout, tipografía y acabado. |
| Taste Skill | `design-taste-frontend` | Dirección visual y referencias de sitios reales para páginas públicas. |

Codex descubre las skills en `.agents/skills/`. Claude Code las encuentra en `.claude/skills/`; las de Emil y Taste enlazan a la copia compartida. Impeccable conserva su versión oficial para cada herramienta.

## Uso

Desde la raíz del repositorio:

```bash
cd venuemap-futur
claude
# O bien:
codex
```

Reinicia la sesión si estaba abierta antes de la instalación. En Claude Code puedes invocar `/emil-design-eng`, `/animate`, `/impeccable critique`, `/impeccable polish` o `/design-taste-frontend`. En Codex usa `$emil-design-eng`, `$animate`, `$impeccable` o `$design-taste-frontend`.

Si trabajas desde una conversación web conectada a GitHub, pide explícitamente que lea `venuemap-futur/CLAUDE.md` y las rutas de las skills indicadas en él; tener un enlace al repositorio no equivale a instalarlas globalmente en Claude.

Prompt de ejemplo, para ejecutar cuando se quiera mejorar el diseño:

> Trabaja únicamente en venuemap-futur. Lee AGENTS.md y las skills instaladas. Usa Impeccable para jerarquía y layout, emil-design-eng y animate para movimiento funcional, y Taste para investigar referencias y dar dirección a las páginas públicas. Conserva las funciones del mapa. Comprueba el resultado en móvil y escritorio antes de terminar.

Taste v2 está orientada a páginas públicas; no fuerces sus composiciones de marketing sobre los controles del mapa. Para esos controles usa Impeccable y Emil.

## Requisitos de las herramientas

- Taste incluye todos sus scripts, bibliotecas y referencias. Sus scripts necesitan Node.js 22 o superior y Chrome, Edge o Chromium; buscar imágenes requiere internet.
- Impeccable incluye sus lanzadores y archivos de apoyo. El motor se descarga en la primera ejecución si no está disponible; necesita conexión para esa descarga.
- Esta es una instalación de skills. No activa hooks automáticos ni modifica el diseño de la web. El uso de las skills se hace en la herramienta de desarrollo.

## Fuentes y versiones

Se conservan los archivos oficiales sin modificar y las licencias en `skill-licenses/`.

| Proyecto | Revisión fijada |
| --- | --- |
| [Emil Kowalski](https://github.com/emilkowalski/skills) | `2d228630ba1446365f614a108cb8252f1feda202` |
| [Impeccable](https://github.com/pbakaus/impeccable) | `08d5b470495d242ca0470f4aeae1956c3a074f83` |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | `f624f37a8c650b9cc550253104925efe4c8de246` |

Estas revisiones quedan fijadas en Git; no se actualizan automáticamente.
