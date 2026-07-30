# SPEC 02 — Animación de destrucción de bloques

> **Estado:** aprobado
> **Depende de:** 01-mvp-arkanoid
> **Fecha:** 2026-07-30
> **Objetivo:** Al romper un bloque, en lugar de desaparecer instantáneamente, se reproduce en su lugar la animación de explosión de 4 frames ya presente en el spritesheet (según el color del bloque) antes de desvanecerse por completo.

## Scope

**In:**

- Al romper un bloque (`checkBlockCollisions` en `game.js`), además de marcar `block.alive = false` (sin cambios en la física/colisión existente), se agrega una entrada a un nuevo array `state.explosions[]` con la posición, tamaño y color del bloque roto.
- En cada frame del loop de render, se dibujan las explosiones activas usando `EXPLOSION_FRAMES` y `drawFrame()` (ya existentes en `assets/spritesheet.js`), calculando el frame correspondiente (0–3) según el tiempo transcurrido desde su inicio, dentro de la ventana de `EXPLOSION_DURATION` (150ms).
- La explosión se dibuja escalada al tamaño del bloque (`BLOCK_WIDTH` x `BLOCK_HEIGHT` = 60x20), en la misma posición donde estaba el bloque.
- Las explosiones expiradas (>150ms desde su inicio) se remueven de `state.explosions[]` en cada frame.
- Soporta múltiples explosiones simultáneas sin límite (ej. si el jugador rompe varios bloques en sucesión rápida).
- `break-sound.mp3` sigue sonando exactamente igual que hoy, en el momento del impacto (sin cambios).
- `resetGame()` limpia `state.explosions[]` al reiniciar la partida.

**Out of scope (para futuros specs):**

- Cambiar cuándo el bloque deja de colisionar con la pelota o de contar para la condición de victoria — el bloque se remueve de la física de inmediato, igual que hoy; la explosión es puramente visual y no bloquea nada.
- Efectos de partículas, screen shake u otros efectos visuales adicionales más allá del sprite de 4 frames ya existente en el spritesheet.
- Ajustar la duración o velocidad de la animación — se usa `EXPLOSION_DURATION` (150ms) tal cual está definida en `assets/spritesheet.js`.
- Sonido nuevo o distinto para la explosión — se mantiene `break-sound.mp3` sin cambios.
- Animaciones para otros eventos del juego (pelota, paleta, pérdida de vida, game over/victoria).

## Data model

```js
// game.js

const state = {
  // ...campos existentes (score, lives, status, paddle, ball, blocks) sin cambios
  explosions: [
    // { x, y, color, startTime }
  ],
};
```

Convenciones:

- Cada entrada de `state.explosions[]` tiene la forma `{ x, y, color, startTime }`:
  - `x`, `y`: esquina superior izquierda del bloque roto (mismas coordenadas que tenía el bloque).
  - `color`: uno de los colores del spritesheet (`gray`, `red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`), usado para indexar `EXPLOSION_FRAMES[color]`.
  - `startTime`: timestamp (`performance.now()` o el mismo valor de tiempo usado por `requestAnimationFrame`) del momento en que se creó la explosión.
- En `checkBlockCollisions`, al romper un bloque se hace `state.explosions.push({ x: block.x, y: block.y, color: block.color, startTime: <ahora> })`.
- En el render, para cada explosión se calcula `elapsed = now - startTime` y `frameIndex = Math.min(3, Math.floor(elapsed / (EXPLOSION_DURATION / 4)))`, y se dibuja `EXPLOSION_FRAMES[color][frameIndex]` con `drawFrame(ctx, frame, x, y, BLOCK_WIDTH, BLOCK_HEIGHT)`.
- Una explosión se considera expirada y se filtra del array cuando `elapsed >= EXPLOSION_DURATION`. El filtrado ocurre una vez por frame, antes o durante el render.
- `resetGame()` reinicia `state.explosions = []`.

## Implementation plan

1. Agregar `explosions: []` a `state` en `game.js`, y limpiar el array (`state.explosions = []`) dentro de `resetGame()`. Test manual: recargar el juego y jugar una partida normal; no hay cambios visibles ni errores en consola.
2. En `checkBlockCollisions`, justo donde se marca `block.alive = false`, agregar `state.explosions.push({ x: block.x, y: block.y, color: block.color, startTime: performance.now() })`. Test manual: romper un bloque; con el debugger o un `console.log` temporal, confirmar que `state.explosions` recibe una nueva entrada (el bloque sigue desapareciendo instantáneamente, todavía sin animación visible).
3. Implementar `drawExplosions()`: para cada entrada en `state.explosions`, calcular `elapsed` desde `startTime`, obtener `frameIndex` (0–3) según `EXPLOSION_DURATION`, y dibujar con `drawFrame(ctx, EXPLOSION_FRAMES[color][frameIndex], x, y, BLOCK_WIDTH, BLOCK_HEIGHT)`; filtrar del array las entradas con `elapsed >= EXPLOSION_DURATION`. Llamar `drawExplosions()` desde `render()`, después de `drawBlocks()`. Test manual: romper un bloque y ver la animación de 4 frames reproducirse en su lugar durante ~150ms antes de desvanecerse por completo.
4. Probar el caso de múltiples explosiones simultáneas: romper varios bloques en sucesión rápida (o casi al mismo tiempo) y confirmar que cada uno anima de forma independiente, sin errores de consola ni explosiones que queden "pegadas" en pantalla más allá de los 150ms.

## Acceptance criteria

- [ ] Al romper un bloque, en lugar de desaparecer instantáneamente se reproduce en su lugar una animación de 4 frames antes de desvanecerse por completo.
- [ ] La animación usa los frames correspondientes al color del bloque roto (`EXPLOSION_FRAMES[color]`).
- [ ] La animación dura aproximadamente `EXPLOSION_DURATION` (150ms) y luego desaparece sin dejar rastro.
- [ ] La animación se dibuja escalada al tamaño del bloque (60x20), en la misma posición donde estaba el bloque.
- [ ] Romper varios bloques en sucesión rápida muestra varias animaciones de explosión simultáneas e independientes, sin errores en consola.
- [ ] `break-sound.mp3` sigue sonando en el momento del impacto, sin cambios respecto al comportamiento actual.
- [ ] El puntaje, la detección de colisión y la condición de victoria (todos los bloques rotos) siguen funcionando exactamente igual que antes de este spec.
- [ ] Al reiniciar el juego (Game Over/Victoria → reinicio), no quedan explosiones "colgadas" de la partida anterior.

## Decisions

- **Sí:** El bloque se remueve de la física (colisión/victoria) al instante del impacto, igual que hoy; la explosión es puramente visual y se dibuja "encima" sin afectar el gameplay. Mantiene el spec pequeño y no toca la lógica de colisión ya probada del MVP.
- **No:** Bloque en estado "muriendo" que sigue bloqueando la pelota hasta que termina la animación. Añade complejidad (¿sigue colisionando? ¿cuenta para victoria?) sin beneficio claro para este spec.
- **Sí:** Array independiente `state.explosions[]` con `{x, y, color, startTime}`, desacoplado de `state.blocks`. Más simple de recorrer, dibujar y expirar en el render loop; no mezcla el concepto de "bloque vivo" con "animación en curso".
- **No:** Guardar la explosión como campo dentro de cada bloque. Complicaría el chequeo de victoria y el ciclo de vida del bloque.
- **Sí:** Escalar la animación al tamaño del bloque (60x20) en vez de dibujarla a su resolución nativa (32x16). Consistente visualmente con el bloque que reemplaza.
- **Sí:** Reutilizar `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` y `drawFrame()` ya existentes en `assets/spritesheet.js` sin modificarlos. Ya están listos para este uso exacto.
- **No:** Sonido nuevo o distinto para la explosión. `break-sound.mp3` ya cubre el feedback de audio; fuera de alcance cambiarlo.
- **Sí:** Sin límite de explosiones simultáneas. El volumen de bloques (48 máximo) y la duración corta (150ms) hacen improbable un problema de rendimiento; no vale la pena una cola o límite artificial.

## What is **not** in this spec

- Cambiar cuándo el bloque deja de colisionar con la pelota o de contar para la condición de victoria.
- Efectos de partículas, screen shake u otros efectos visuales adicionales.
- Ajustar la duración o velocidad de la animación.
- Sonido nuevo o distinto para la explosión.
- Animaciones para otros eventos del juego (pelota, paleta, pérdida de vida, game over/victoria).

Cada uno de estos, si se implementa, va en su propio spec.
