# SPEC 01 — MVP jugable de Arkanoid

> **Estado:** aprobado
> **Depende de:** Ninguno
> **Fecha:** 2026-07-30
> **Objetivo:** Un MVP jugable de Arkanoid en una sola pantalla, con paleta, pelota y bloques, controlable con mouse y teclado, que se gana rompiendo todos los bloques o se pierde al agotar las vidas, y se puede reiniciar sin recargar la página.

## Scope

**In:**

- Archivos `index.html`, `style.css`, `game.js` (nuevos), reutilizando `assets/spritesheet.js`, `assets/spritesheet-breakout.png` y `assets/sounds/*.mp3` ya existentes.
- Canvas de tamaño fijo 480x640 píxeles.
- Paleta controlada por mouse (sigue al cursor en cada `mousemove`) y por teclado (flechas izquierda/derecha).
- Pelota que rebota en paredes, paleta y bloques; el ángulo de rebote contra la paleta depende del punto de impacto.
- La pelota arranca moviéndose automáticamente al cargar la página (sin pantalla de "Presiona para empezar").
- Layout de bloques: 6 filas x 8 columnas, usando los colores disponibles en el spritesheet (`gray`, `red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`).
- 3 vidas. Cada bloque roto suma 10 puntos, puntaje mostrado en la parte superior del canvas.
- Condición de victoria: romper todos los bloques de la pantalla (un único nivel/pantalla).
- Condición de derrota: agotar las 3 vidas → Game Over.
- Mensaje superpuesto en el canvas para "Game Over" y "¡Ganaste!", con opción de reiniciar (tecla/click) sin recargar la página, reseteando vidas, puntaje y bloques.
- Sonidos: `ball-bounce.mp3` en rebote de pelota (paredes/paleta/bloques) y `break-sound.mp3` al romper un bloque.

**Out of scope (para futuros specs):**

- Persistencia de puntaje o high scores (localStorage, etc.) — el puntaje se pierde al recargar la página.
- Múltiples niveles o progresión entre pantallas.
- Power-ups.
- Pausa del juego.
- Versión responsive/móvil — el canvas es de tamaño fijo.
- Multijugador.

## Data model

```js
// game.js

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;

const BLOCK_ROWS = 6;
const BLOCK_COLS = 8;
const BLOCK_WIDTH = 60;   // CANVAS_WIDTH / BLOCK_COLS
const BLOCK_HEIGHT = 20;
const BLOCK_TOP_OFFSET = 40; // deja espacio arriba para el puntaje
const BLOCK_ROW_COLORS = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green'];

const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 14;
const PADDLE_SPEED = 8;   // px/frame al mover con teclado

const BALL_RADIUS = 7;
const BALL_SPEED = 5;     // magnitud de velocidad, px/frame

const POINTS_PER_BLOCK = 10;
const INITIAL_LIVES = 3;

// Estado global del juego
const state = {
  score: 0,
  lives: INITIAL_LIVES,
  status: 'playing', // 'playing' | 'gameover' | 'win'
  paddle: {
    x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    y: CANVAS_HEIGHT - 40,
  },
  ball: {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 60,
    dx: BALL_SPEED * 0.5,  // componente x inicial
    dy: -BALL_SPEED,       // sube al arrancar
  },
  blocks: [
    // { x, y, width, height, color, alive }
    // 48 bloques generados: BLOCK_ROWS x BLOCK_COLS
  ],
};
```

Convenciones:

- Origen de coordenadas: esquina superior izquierda.
- Velocidades en píxeles/frame, actualizadas dentro de un loop con `requestAnimationFrame`.
- Colisión pelota-bloque y pelota-paleta: detección por rectángulos (AABB) entre el bounding box de la pelota (`x - radius` .. `x + radius`) y cada rectángulo.
- El ángulo de rebote en la paleta se calcula según la posición relativa de impacto: `hitPos = (ball.x - paddle.x) / PADDLE_WIDTH` (0 a 1), que se traduce a un ángulo de salida (ej. extremos rebotan más horizontal, el centro más vertical).
- `state.blocks[i].alive = false` cuando un bloque se rompe (no se eliminan del array, para simplificar el render y el chequeo de victoria).
- Condición de victoria: todos los `blocks[i].alive === false`.
- Condición de derrota: `state.lives === 0` tras perder la pelota por el borde inferior.

## Implementation plan

1. Crear el esqueleto: `index.html` con un `<canvas>` de 480x640, `style.css` básico (centrar el canvas, fondo oscuro) y `game.js` vacío que solo pinta el canvas de un color de fondo. Test manual: abrir `index.html` en el navegador y ver el canvas centrado.
2. Cargar el spritesheet (`loadSpritesheet` de `assets/spritesheet.js`) y dibujar el estado inicial estático: paleta, pelota y los 48 bloques (6x8) en sus posiciones de `state`. Test manual: recargar y ver paleta, pelota y bloques dibujados correctamente, sin movimiento.
3. Implementar el movimiento de la paleta: listener de `mousemove` y de `keydown`/`keyup` para las flechas, actualizando `state.paddle.x` (clamped a los bordes del canvas). Test manual: mover el mouse y usar las flechas, ver que la paleta responde a ambos.
4. Implementar el loop principal con `requestAnimationFrame` y el movimiento de la pelota (`dx`/`dy`), con rebote en las paredes izquierda, derecha y superior. Test manual: la pelota rebota indefinidamente en las 3 paredes (todavía cae libremente por abajo).
5. Implementar la colisión pelota-paleta, calculando el ángulo de rebote según el punto de impacto (`hitPos`). Test manual: la pelota rebota en la paleta con ángulos distintos según dónde golpea.
6. Implementar la colisión pelota-bloques: al impactar un bloque vivo, marcarlo `alive = false`, sumar `POINTS_PER_BLOCK` al puntaje, rebotar la pelota y reproducir `break-sound.mp3`. Test manual: romper bloques, ver que desaparecen y el puntaje sube en la parte superior del canvas.
7. Implementar la pérdida de vida: cuando la pelota cruza el borde inferior, restar una vida y reposicionar pelota y paleta al centro (si `lives > 0`). Test manual: dejar caer la pelota y ver que resetea su posición y baja el contador de vidas.
8. Implementar las condiciones de fin: al llegar a `lives === 0` mostrar overlay "Game Over"; al quedar todos los bloques con `alive === false` mostrar overlay "¡Ganaste!". Detener la actualización del loop en ambos casos. Test manual: perder las 3 vidas y ver el mensaje; en otra partida, romper todos los bloques y ver el mensaje de victoria.
9. Implementar el reinicio: al presionar una tecla (Enter/Espacio) o hacer click sobre el overlay, resetear `state` por completo (score, lives, blocks, paddle, ball) y reanudar el loop. Test manual: tras Game Over o Victoria, reiniciar y verificar que todo vuelve al estado inicial.
10. Integrar el sonido `ball-bounce.mp3` en los rebotes contra paredes y paleta. Test manual: escuchar el sonido en cada rebote.

## Acceptance criteria

- [ ] El juego carga en el navegador sin errores en la consola, abriendo `index.html` directamente (sin servidor).
- [ ] La paleta se mueve al mover el mouse sobre el canvas y también con las flechas izquierda/derecha del teclado.
- [ ] La pelota se mueve automáticamente al cargar la página, sin requerir ninguna acción del jugador.
- [ ] La pelota rebota correctamente en las paredes izquierda, derecha y superior.
- [ ] La pelota rebota en la paleta con un ángulo distinto según el punto de impacto (no siempre el mismo ángulo).
- [ ] Al golpear un bloque vivo, este desaparece, suena `break-sound.mp3` y el puntaje sube exactamente 10 puntos.
- [ ] El puntaje se muestra en la parte superior del canvas y se actualiza en tiempo real.
- [ ] Cada rebote de la pelota en pared o paleta reproduce `ball-bounce.mp3`.
- [ ] Al caer la pelota por el borde inferior, se resta una vida y la pelota/paleta se reposicionan, si quedan vidas.
- [ ] Al llegar a 0 vidas, se muestra un overlay de "Game Over" sobre el canvas y el juego deja de actualizarse.
- [ ] Al romper los 48 bloques, se muestra un overlay de "¡Ganaste!" sobre el canvas y el juego deja de actualizarse.
- [ ] Desde cualquiera de los dos overlays, reiniciar (tecla o click) resetea vidas, puntaje, bloques, paleta y pelota al estado inicial, sin recargar la página.
- [ ] Recargar la página en cualquier momento pierde el puntaje (no hay persistencia).

## Decisions

- **Sí:** Canvas de tamaño fijo 480x640. Evita reescalar sprites y hace que 8 columnas de 60px calcen exacto con el ancho.
- **No:** Canvas responsive. Overengineering para un MVP.
- **Sí:** Separar en `index.html` + `style.css` + `game.js`. Mantiene cero dependencias pero es más legible que todo inline.
- **No:** Un único archivo HTML con todo inline. Menos mantenible a futuro.
- **Sí:** Mouse y teclado controlan la paleta simultáneamente, escribiendo ambos la misma posición X. Evita tener que definir un "modo" de control activo.
- **Sí:** Ángulo de rebote en la paleta según el punto de impacto. Se siente más jugable y es fiel al Arkanoid clásico.
- **No:** Rebote especular fijo (mismo ángulo siempre). Se siente plano y poco satisfactorio.
- **Sí:** Un solo nivel/pantalla para este MVP. Reduce el alcance; niveles múltiples quedan para un spec futuro.
- **No:** Persistencia de puntaje (localStorage). Fuera de alcance de este MVP.
- **Sí:** Overlay simple dentro del canvas para "Game Over" y "¡Ganaste!", sin recargar la página. Mejor UX que recargar y simple de implementar con canvas.
- **Sí:** Integrar los sonidos existentes (`ball-bounce.mp3`, `break-sound.mp3`) desde el MVP. Ya están en el repo y dan feedback inmediato sin costo extra.
- **No:** Pausa del juego. No se pidió explícitamente; se puede agregar en un spec futuro de controles.

## Risks

| Riesgo                                                                 | Mitigación                                                                                                   |
| ----------------------------------------------------------------------| ---------------------------------------------------------------------------------------------------------- |
| Los navegadores bloquean el audio autoplay sin interacción previa del usuario, y la pelota arranca sola al cargar | El primer rebote puede sonar silenciado hasta el primer click/tecla del usuario; es una limitación aceptada del navegador, no un bug del juego. |
| A velocidad alta la pelota podría "atravesar" la paleta o un bloque entre dos frames (tunneling) | `BALL_SPEED` se mantiene deliberadamente bajo (5 px/frame) para que la detección de colisión por AABB simple sea suficiente en este MVP. |
| La pelota podría quedar rebotando perfectamente horizontal (`dy` cercano a 0) y no volver a bajar | Al calcular el ángulo de rebote, se limita `dy` a un valor mínimo absoluto para evitar loops horizontales infinitos. |

## What is **not** in this spec

- Persistencia de puntaje o high scores.
- Múltiples niveles o progresión entre pantallas.
- Power-ups.
- Pausa del juego.
- Versión responsive/móvil.
- Multijugador.

Cada uno de estos, si se implementa, va en su propio spec.
