# SPEC 03 — Niveles múltiples y HUD de vidas

> **Estado:** aprobado
> **Depende de:** 01-mvp-arkanoid, 02-block-destruction-animation
> **Fecha:** 2026-07-30
> **Objetivo:** Al romper todos los bloques de un nivel, el juego avanza automáticamente al siguiente de 3 niveles (cada uno con un patrón de huecos distinto y la pelota 15% más rápida que el anterior), mostrando un overlay breve de "Nivel completado" y un HUD de vidas restantes con íconos de pelota, hasta mostrar "¡Ganaste!" al completar el nivel 3.

## Scope

**In:**

- Progresión de 3 niveles: al quedar todos los bloques de `state.blocks` con `alive === false`, en vez de mostrar el overlay de "¡Ganaste!" directamente, se avanza al siguiente nivel (excepto tras el nivel 3, donde sí se muestra "¡Ganaste!").
- 3 layouts de bloques hardcodeados en `game.js`, cada uno con un patrón de huecos distinto (mismo grid de 6 filas x 8 columnas, pero con posiciones específicas sin bloque).
- Velocidad de la pelota +15% acumulado por nivel: nivel 1 = `BALL_SPEED` base, nivel 2 = `BALL_SPEED * 1.15`, nivel 3 = `BALL_SPEED * 1.30`.
- Overlay "Nivel X completado" que se muestra automáticamente y desaparece solo tras ~1.5s, tras lo cual el juego continúa con el siguiente nivel (bloques nuevos, pelota y paleta reposicionadas al centro).
- Puntaje y vidas se mantienen acumulados entre niveles (no se reinician al pasar de nivel; solo se reinician con `resetGame()` al perder todas las vidas o reiniciar partida completa).
- HUD de vidas: se dibujan tantos íconos del sprite `ball` como vidas restantes, en la esquina superior derecha del canvas (opuesta al puntaje, que sigue en la esquina superior izquierda).
- `resetGame()` vuelve siempre al nivel 1 con el layout y velocidad base.

**Out of scope (para futuros specs):**

- Sonido de rebote en paredes: ya está implementado desde el MVP (`game.js:174-188`), no requiere cambios.
- Persistencia del nivel alcanzado o high scores entre sesiones (localStorage, etc.).
- Más de 3 niveles, o niveles generados/aleatorios.
- Power-ups o cambios de tamaño de paleta.
- Pausa del juego.
- Indicador visual de "nivel actual" en el HUD (ej. "Nivel 2/3") — no fue pedido explícitamente.

## Data model

```js
// game.js

const LEVEL_COUNT = 3;
const BALL_SPEED_INCREMENT = 0.15; // +15% acumulado de velocidad por nivel
const LEVEL_COMPLETE_DURATION = 1500; // ms que dura el overlay "Nivel X completado"
const LIFE_ICON_SIZE = 16; // tamaño del ícono de vida (sprite 'ball' es 16x16 nativo)

// Cada layout es una grilla BLOCK_ROWS x BLOCK_COLS (6x8): 1 = bloque presente, 0 = hueco.
const LEVEL_LAYOUTS = [
  // Nivel 1: grid completo, sin huecos (igual al MVP actual)
  [
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
  ],
  // Nivel 2: hueco en forma de diamante al centro
  [
    [1,1,1,1,1,1,1,1],
    [1,1,1,0,0,1,1,1],
    [1,1,0,0,0,0,1,1],
    [1,1,0,0,0,0,1,1],
    [1,1,1,0,0,1,1,1],
    [1,1,1,1,1,1,1,1],
  ],
  // Nivel 3: patrón de tablero de ajedrez
  [
    [1,0,1,0,1,0,1,0],
    [0,1,0,1,0,1,0,1],
    [1,0,1,0,1,0,1,0],
    [0,1,0,1,0,1,0,1],
    [1,0,1,0,1,0,1,0],
    [0,1,0,1,0,1,0,1],
  ],
];

const state = {
  // ...campos existentes (score, paddle, ball, blocks, explosions) sin cambios estructurales
  lives: INITIAL_LIVES,
  status: 'playing', // 'playing' | 'gameover' | 'win' | 'level-complete'
  level: 1,                    // nivel actual, 1..LEVEL_COUNT
  levelCompleteStartTime: null, // timestamp de inicio del overlay "Nivel X completado"; null si no aplica
};
```

Convenciones:

- `generateBlocks(level)`: reemplaza la generación fija de bloques del MVP; recorre `LEVEL_LAYOUTS[level - 1]` y crea una entrada en `state.blocks` solo donde el valor de la celda es `1`, usando `BLOCK_ROW_COLORS[row]` para el color (misma lógica de color por fila que hoy, ignorando columnas en `0`).
- `getBallSpeedForLevel(level)`: retorna `BALL_SPEED * (1 + BALL_SPEED_INCREMENT * (level - 1))`. Se usa al inicializar/reposicionar la pelota en `resetGame()` y al avanzar de nivel.
- Al detectar que todos los bloques vivos llegaron a `alive === false` (mismo chequeo que hoy disparaba "win"): si `state.level < LEVEL_COUNT`, se pasa a `status = 'level-complete'` y `levelCompleteStartTime = performance.now()`; si `state.level === LEVEL_COUNT`, se pasa a `status = 'win'` (comportamiento actual, sin cambios).
- En el loop principal, si `status === 'level-complete'` y `performance.now() - levelCompleteStartTime >= LEVEL_COMPLETE_DURATION`, se ejecuta el avance: `state.level += 1`, `state.blocks = generateBlocks(state.level)`, se limpia `state.explosions`, se reposicionan pelota/paleta al centro con la nueva velocidad (`getBallSpeedForLevel(state.level)`), y `status` vuelve a `'playing'`. Puntaje y vidas no se tocan.
- Overlay "Nivel X completado" se dibuja mientras `status === 'level-complete'`, mostrando `state.level` (el nivel recién completado).
- `drawLives()`: dibuja `state.lives` íconos del sprite `ball` (`drawSprite(ctx, 'ball', x, y, LIFE_ICON_SIZE, LIFE_ICON_SIZE)`) en fila, alineados a la esquina superior derecha del canvas, con un pequeño margen entre íconos. Se llama desde `render()` junto a `drawScore()`.
- `resetGame()` reinicia `state.level = 1`, regenera bloques con `generateBlocks(1)`, resetea velocidad de pelota a `getBallSpeedForLevel(1)` (= `BALL_SPEED` base) y `levelCompleteStartTime = null`, además de los campos existentes (score, lives, explosions, etc.).

## Implementation plan

1. Agregar las constantes de nivel (`LEVEL_COUNT`, `BALL_SPEED_INCREMENT`, `LEVEL_COMPLETE_DURATION`, `LIFE_ICON_SIZE`, `LEVEL_LAYOUTS`) y los campos `level: 1` y `levelCompleteStartTime: null` a `state`, sin usarlos todavía en la lógica del juego. Test manual: recargar y jugar una partida normal; no hay cambios visibles ni errores en consola.
2. Reemplazar `createBlocks()` por `generateBlocks(level)`, que recorre `LEVEL_LAYOUTS[level - 1]` y crea un bloque solo donde la celda es `1`. Usar `state.blocks = generateBlocks(1)` en la inicialización y en `resetGame()`. Test manual: recargar y ver el nivel 1 (grid completo de 48 bloques, igual que antes, porque el layout 1 no tiene huecos).
3. Implementar `getBallSpeedForLevel(level)` y usarlo en `resetBallAndPaddle()` (en vez de `BALL_SPEED` fijo) y en `checkPaddleCollision()` (magnitud del rebote según `state.level`). Test manual: jugar el nivel 1; la velocidad de la pelota se siente igual que antes (nivel 1 = velocidad base, sin cambio todavía perceptible).
4. Modificar `checkWinCondition()`: cuando todos los bloques están `alive === false`, si `state.level < LEVEL_COUNT` se pasa a `status = 'level-complete'` y `levelCompleteStartTime = performance.now()`; si `state.level === LEVEL_COUNT`, se mantiene el comportamiento actual (`status = 'win'`). Test manual: en el nivel 1, romper todos los bloques; el juego se congela (loop deja de actualizar) sin mensaje visible todavía — esto se resuelve en el paso 6.
5. Implementar el avance de nivel: en `loop()`, cuando `status === 'level-complete'` y ya transcurrió `LEVEL_COMPLETE_DURATION` desde `levelCompleteStartTime`, incrementar `state.level`, regenerar `state.blocks` con `generateBlocks(state.level)`, limpiar `state.explosions`, llamar `resetBallAndPaddle()` (con la nueva velocidad del nivel) y volver `status` a `'playing'`. Test manual: romper todos los bloques del nivel 1; tras ~1.5s el juego se reanuda automáticamente con un nuevo patrón de bloques y la pelota más rápida (aunque todavía sin overlay visible).
6. Dibujar el overlay "Nivel X completado" en `drawOverlay()` cuando `status === 'level-complete'`, mostrando el número de nivel recién superado. Test manual: romper todos los bloques del nivel 1 y ver el mensaje "Nivel 1 completado" superpuesto durante ~1.5s antes de que continúe el nivel 2.
7. Implementar `drawLives()`: dibuja `state.lives` íconos del sprite `ball` en fila, alineados a la esquina superior derecha del canvas. Llamarla desde `render()` junto a `drawScore()`. Test manual: recargar el juego y ver 3 pelotas pequeñas en la esquina superior derecha; perder una vida y ver que baja a 2.
8. Actualizar `resetGame()` para resetear `state.level = 1` y `state.levelCompleteStartTime = null` además de los campos existentes. Test manual: llegar a Game Over o a "¡Ganaste!" tras varios niveles, reiniciar, y confirmar que vuelve al nivel 1 con velocidad base y HUD de vidas en 3.
9. Prueba end-to-end: jugar los 3 niveles seguidos sin perder vidas, confirmando que el patrón de bloques cambia en cada nivel, la pelota se siente progresivamente más rápida, el puntaje y las vidas se mantienen acumulados entre niveles, y que al completar el nivel 3 se muestra el overlay final "¡Ganaste!" (no "Nivel 3 completado").

## Acceptance criteria

- [ ] El juego arranca en el nivel 1, con el grid completo de 48 bloques (sin huecos) y la pelota a su velocidad base.
- [ ] Al romper todos los bloques del nivel 1, se muestra un overlay "Nivel 1 completado" durante ~1.5 segundos y luego el juego continúa automáticamente, sin requerir tecla ni click.
- [ ] El nivel 2 usa el layout con hueco en forma de diamante al centro, y la pelota se mueve un 15% más rápido que en el nivel 1.
- [ ] El nivel 3 usa el layout en patrón de tablero de ajedrez, y la pelota se mueve un 30% más rápido que la velocidad base (15% acumulado sobre el nivel 2).
- [ ] El puntaje y las vidas restantes se mantienen (no se reinician) al pasar de un nivel a otro.
- [ ] Al romper todos los bloques del nivel 3, se muestra el overlay "¡Ganaste!" (no "Nivel 3 completado"), y el juego deja de actualizarse.
- [ ] Las vidas restantes se muestran en todo momento en la esquina superior derecha del canvas, como íconos del sprite de pelota (uno por vida), y se actualizan al perder una vida.
- [ ] El puntaje sigue mostrándose en la esquina superior izquierda, sin cambios de posición respecto al MVP.
- [ ] Perder todas las vidas en cualquier nivel (1, 2 o 3) muestra el overlay "Game Over" existente, sin diferencias respecto al comportamiento actual.
- [ ] Reiniciar la partida (tecla/click sobre "Game Over" o "¡Ganaste!") vuelve siempre al nivel 1, con el layout y la velocidad base, puntaje en 0 y 3 vidas.
- [ ] La detección de colisión pelota-bloque, el sonido `break-sound.mp3`, las explosiones y el sonido de rebote en paredes/paleta siguen funcionando exactamente igual que antes en cada nivel.
- [ ] No hay errores en la consola del navegador durante una partida completa de los 3 niveles.

## Decisions

- **Sí:** 3 niveles fijos, hardcodeados como grids de 6x8 en `LEVEL_LAYOUTS`. Simple, predecible y suficiente para el alcance pedido; evita generación procedural innecesaria.
- **No:** Niveles generados aleatoriamente o en cantidad infinita. No fue lo pedido y complica la condición de victoria final.
- **Sí:** Dificultad combinada — patrones de bloques con huecos distintos por nivel + pelota 15% más rápida acumulado por nivel. Da variedad visual y de física sin rediseñar la paleta ni introducir power-ups.
- **No:** Cambiar el tamaño de la paleta o agregar power-ups como fuente de dificultad. Fuera del alcance pedido.
- **Sí:** Puntaje y vidas se mantienen acumulados entre niveles; solo se resetean con `resetGame()` completo. Se siente como una partida continua, no como 3 partidas separadas.
- **No:** Reiniciar las vidas en cada nivel. Rompería la sensación de progresión y no fue lo pedido.
- **Sí:** Overlay "Nivel X completado" auto-avanza tras `LEVEL_COMPLETE_DURATION` (1.5s) sin requerir input. Mantiene el ritmo de juego, consistente con que la pelota ya arranca sola sin pantalla de "Presiona para empezar" (decisión del MVP).
- **No:** Requerir tecla/click para avanzar de nivel. Rompe el ritmo y no aporta valor sobre el auto-avance.
- **Sí:** Reutilizar el sprite `ball` ya existente para el HUD de vidas (convención clásica de Arkanoid), en vez de agregar un asset nuevo. Cero dependencias nuevas, consistente con "cero dependencias, sin build step" del proyecto.
- **No:** Ícono de corazón. No existe ese sprite en `assets/spritesheet-breakout.png` y agregar un asset nuevo está fuera de alcance.
- **Sí:** HUD de vidas incluido en este mismo spec aunque es una carencia del MVP, porque ahora las vidas se acumulan entre niveles y verlas es más relevante que antes.
- **No:** Sonido de rebote en paredes. Ya está implementado desde el MVP (`game.js:174-188`); no requiere cambios en este spec.
- **Sí:** El nivel 1 usa el mismo grid completo que el MVP actual (sin huecos), para no cambiar la experiencia de arranque del juego.

## Risks

| Riesgo | Mitigación |
|---|---|
| El HUD de vidas (pelotas pequeñas) podría verse muy similar a la pelota real en juego, generando confusión visual | El ícono se dibuja fijo en la esquina superior derecha, fuera del área de juego, en una fila horizontal — la separación de posición evita ambigüedad. |
| Con `BALL_SPEED_INCREMENT` acumulado, en el nivel 3 la pelota es notablemente más rápida y podría "atravesar" bloques/paleta en patrones con huecos angostos (checkerboard) | El incremento se mantiene moderado (+15% por nivel, +30% máximo en nivel 3) para no salir del régimen donde la detección AABB simple sigue siendo confiable, según el mismo riesgo de tunneling ya aceptado en el MVP. |
| El overlay de "Nivel X completado" con auto-avance podría sentirse muy rápido o muy lento según el jugador | Se usa un valor fijo de 1.5s, consistente con el timing ya usado para explosiones (150ms) escalado a un mensaje legible; ajustable a futuro si se pide explícitamente. |

## What is **not** in this spec

- Sonido de rebote en paredes (ya implementado en el MVP).
- Persistencia del nivel alcanzado o high scores entre sesiones.
- Más de 3 niveles, o niveles generados/aleatorios.
- Power-ups o cambios de tamaño de paleta.
- Pausa del juego.
- Indicador de "Nivel X/3" en el HUD.

Cada uno de estos, si se implementa, va en su propio spec.
