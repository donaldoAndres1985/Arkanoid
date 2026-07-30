# CLAUDE.md

Este archivo brinda guía a Claude Code (claude.ai/code) al trabajar con código en este repositorio.

## Proyecto

Un clon de Arkanoid/Breakout construido con HTML, CSS y JavaScript puro — **cero dependencias, sin build step**. Los jugadores lo ejecutan directamente en el navegador.

**Estado actual:** este es un scaffold recién iniciado. Solo existen los assets (`assets/spritesheet-breakout.png`, `assets/spritesheet.js`, `assets/sounds/*.mp3`) — no hay `index.html`, no hay game loop, y no hay `package.json` todavía. Tampoco hay herramientas de build/lint/test que ejecutar porque aún no se ha escrito código fuente. Dado que el proyecto es JS vanilla sin dependencias, se espera que el setup final se mantenga libre de dependencias (sin bundler, sin framework) salvo que un spec indique lo contrario explícitamente.

Este directorio todavía no es un repositorio git. El flujo de specs descrito abajo espera ramas de git — si se invoca `/spec-impl`, hay que hacer `git init` primero o señalar que git no está disponible.

## Assets: referencia de sprites/sonidos

`assets/spritesheet.js` es la capa de lookup ya existente para `assets/spritesheet-breakout.png`. Léelo antes de dibujar cualquier cosa para que el código nuevo lo reutilice en lugar de recalcular coordenadas de sprites:

- `loadSpritesheet(cb)` — carga el PNG una sola vez (sobre un canvas offscreen) y encola callbacks hasta que esté listo.
- `drawSprite(ctx, name, x, y, w, h)` — dibuja por nombre lógico (`'paddle'`, `'ball'`, `'block_red'`, `'block_cyan'`, etc.) usando la tabla `SPRITES`. Colores de bloques: `gray`, `red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`.
- `drawFrame(ctx, frame, x, y, w, h)` — dibuja un objeto de frame crudo directamente, usado para animaciones.
- `EXPLOSION_FRAMES` — animación de explosión de 4 frames por color, junto con `EXPLOSION_DURATION` (150ms) para el timing.

Los sonidos están en `assets/sounds/` (`ball-bounce.mp3`, `break-sound.mp3`) sin loader todavía — conectarlos es trabajo futuro.

## Flujo de trabajo basado en specs

Este repo usa un flujo de specs de dos fases (instalado vía `skills-lock.json` desde `Klerith/fernando-skills`). **Prefiere este flujo sobre una implementación improvisada** al construir cualquier funcionalidad no trivial:

- **`/spec`** (`.agents/skills/spec/`) — un proceso guiado por preguntas que produce un archivo de spec en `specs/NN-slug.md` (numerado secuencialmente, ej. `01-mvp-arkanoid.md`). Nunca escribe código — solo el documento de spec, siguiendo la estructura de `.agents/skills/spec/template.md`. Los specs inician en estado `Draft` y deben pasarse manualmente a `Approved` por el usuario antes de implementarlos.
- **`/spec-impl NN-slug`** (`.agents/skills/spec-impl/`) — implementa únicamente un spec en estado `Approved`. Se rehúsa a ejecutarse sobre specs en `Draft`/`In review`/`Implemented`/`Obsolete`. Sobre un spec válido, crea/cambia a la rama `spec-NN-slug` (controlado por `AutoCreateBranch` en `specs/.spec-config.yml`, por defecto `true`), y luego implementa el plan **paso a paso**, pausando para revisión después de cada paso.

Convenciones clave de estos skills, si te piden trabajar directamente sobre un spec en lugar de usar los slash commands:
- El estado del spec se interpreta por significado entre idiomas (ej. `Approved`/`Aprobado` son equivalentes) — hay que igualarlo por posición/máquina de estados, no por string exacto.
- Nunca marques un spec como `Approved` tú mismo; esa transición es manual, la hace el humano.
- Al implementar, sigue el plan del spec exactamente — señala desacuerdos como observaciones en vez de desviarte silenciosamente. Los pedidos fuera de alcance durante la implementación se difieren a un nuevo spec, no se incluyen sobre la marcha.
- `specs/` y `specs/.spec-config.yml` todavía no existen — se crean la primera vez que se usa `/spec`.
