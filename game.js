const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

function getBallSpeedForLevel(level) {
  return BALL_SPEED * (1 + BALL_SPEED_INCREMENT * (level - 1));
}

function generateBlocks(level) {
  const layout = LEVEL_LAYOUTS[level - 1];
  const blocks = [];
  for (let row = 0; row < BLOCK_ROWS; row++) {
    for (let col = 0; col < BLOCK_COLS; col++) {
      if (!layout[row][col]) continue;
      blocks.push({
        x: col * BLOCK_WIDTH,
        y: BLOCK_TOP_OFFSET + row * BLOCK_HEIGHT,
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        color: BLOCK_ROW_COLORS[row],
        alive: true,
      });
    }
  }
  return blocks;
}

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
  blocks: generateBlocks(1),
  explosions: [],
  level: 1,                    // nivel actual, 1..LEVEL_COUNT
  levelCompleteStartTime: null, // timestamp de inicio del overlay "Nivel X completado"; null si no aplica
};

function drawBlocks() {
  state.blocks.forEach((block) => {
    if (!block.alive) return;
    drawSprite(ctx, `block_${block.color}`, block.x, block.y, block.width, block.height);
  });
}

function drawPaddle() {
  drawSprite(ctx, 'paddle', state.paddle.x, state.paddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
}

function drawBall() {
  drawSprite(
    ctx,
    'ball',
    state.ball.x - BALL_RADIUS,
    state.ball.y - BALL_RADIUS,
    BALL_RADIUS * 2,
    BALL_RADIUS * 2
  );
}

function drawExplosions() {
  const now = performance.now();
  state.explosions = state.explosions.filter((explosion) => {
    const elapsed = now - explosion.startTime;
    if (elapsed >= EXPLOSION_DURATION) return false;

    const frameIndex = Math.min(3, Math.floor(elapsed / (EXPLOSION_DURATION / 4)));
    const frame = EXPLOSION_FRAMES[explosion.color][frameIndex];
    drawFrame(ctx, frame, explosion.x, explosion.y, BLOCK_WIDTH, BLOCK_HEIGHT);
    return true;
  });
}

function drawScore() {
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Score: ${state.score}`, 10, BLOCK_TOP_OFFSET / 2);
}

function drawOverlay() {
  if (state.status === 'playing') return;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#fff';
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let message;
  if (state.status === 'gameover') {
    message = 'Game Over';
  } else if (state.status === 'level-complete') {
    message = `Nivel ${state.level} completado`;
  } else {
    message = '¡Ganaste!';
  }
  ctx.fillText(message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.restore();
}

function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawBlocks();
  drawExplosions();
  drawPaddle();
  drawBall();
  drawScore();
  drawOverlay();
}

function clampPaddleX(x) {
  return Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, x));
}

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  state.paddle.x = clampPaddleX(mouseX - PADDLE_WIDTH / 2);
});

document.addEventListener('keydown', (e) => {
  if (state.status === 'gameover' || state.status === 'win') {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      resetGame();
    }
    return;
  }

  if (state.status !== 'playing') return;

  if (e.key === 'ArrowLeft') {
    state.paddle.x = clampPaddleX(state.paddle.x - PADDLE_SPEED);
  } else if (e.key === 'ArrowRight') {
    state.paddle.x = clampPaddleX(state.paddle.x + PADDLE_SPEED);
  }
});

canvas.addEventListener('click', () => {
  if (state.status === 'gameover' || state.status === 'win') {
    resetGame();
  }
});

const ballBounceSound = new Audio('assets/sounds/ball-bounce.mp3');

function playBallBounceSound() {
  ballBounceSound.currentTime = 0;
  ballBounceSound.play().catch(() => {});
}

function updateBall() {
  const ball = state.ball;
  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x - BALL_RADIUS <= 0) {
    ball.x = BALL_RADIUS;
    ball.dx = -ball.dx;
    playBallBounceSound();
  } else if (ball.x + BALL_RADIUS >= CANVAS_WIDTH) {
    ball.x = CANVAS_WIDTH - BALL_RADIUS;
    ball.dx = -ball.dx;
    playBallBounceSound();
  }

  if (ball.y - BALL_RADIUS <= 0) {
    ball.y = BALL_RADIUS;
    ball.dy = -ball.dy;
    playBallBounceSound();
  }
}

const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60°: extremos de la paleta rebotan más horizontal
const MIN_DY_RATIO = 0.15; // evita que dy quede casi en 0 (rebote horizontal infinito)

function checkPaddleCollision() {
  const ball = state.ball;
  const paddle = state.paddle;

  if (ball.dy <= 0) return;

  const withinX = ball.x + BALL_RADIUS >= paddle.x && ball.x - BALL_RADIUS <= paddle.x + PADDLE_WIDTH;
  const withinY = ball.y + BALL_RADIUS >= paddle.y && ball.y - BALL_RADIUS <= paddle.y + PADDLE_HEIGHT;
  if (!withinX || !withinY) return;

  const hitPos = Math.max(0, Math.min(1, (ball.x - paddle.x) / PADDLE_WIDTH));
  const angle = (hitPos - 0.5) * 2 * MAX_BOUNCE_ANGLE;
  const speed = getBallSpeedForLevel(state.level);

  ball.dx = speed * Math.sin(angle);
  ball.dy = -speed * Math.cos(angle);

  const minDy = speed * MIN_DY_RATIO;
  if (Math.abs(ball.dy) < minDy) {
    ball.dy = -minDy;
  }

  ball.y = paddle.y - BALL_RADIUS;
  playBallBounceSound();
}

const breakSound = new Audio('assets/sounds/break-sound.mp3');

function playBreakSound() {
  breakSound.currentTime = 0;
  breakSound.play().catch(() => {});
}

function isCollidingWithBlock(ball, block) {
  return (
    ball.x + BALL_RADIUS > block.x &&
    ball.x - BALL_RADIUS < block.x + block.width &&
    ball.y + BALL_RADIUS > block.y &&
    ball.y - BALL_RADIUS < block.y + block.height
  );
}

function resolveBlockBounce(ball, block) {
  const overlapLeft = ball.x + BALL_RADIUS - block.x;
  const overlapRight = block.x + block.width - (ball.x - BALL_RADIUS);
  const overlapTop = ball.y + BALL_RADIUS - block.y;
  const overlapBottom = block.y + block.height - (ball.y - BALL_RADIUS);

  const minOverlapX = Math.min(overlapLeft, overlapRight);
  const minOverlapY = Math.min(overlapTop, overlapBottom);

  if (minOverlapX < minOverlapY) {
    ball.dx = -ball.dx;
  } else {
    ball.dy = -ball.dy;
  }
}

function checkBlockCollisions() {
  const ball = state.ball;
  for (const block of state.blocks) {
    if (!block.alive) continue;
    if (!isCollidingWithBlock(ball, block)) continue;

    block.alive = false;
    state.score += POINTS_PER_BLOCK;
    state.explosions.push({
      x: block.x,
      y: block.y,
      color: block.color,
      startTime: performance.now(),
    });
    resolveBlockBounce(ball, block);
    playBreakSound();
    break;
  }
}

function checkWinCondition() {
  if (!state.blocks.every((block) => !block.alive)) return;

  if (state.level < LEVEL_COUNT) {
    state.status = 'level-complete';
    state.levelCompleteStartTime = performance.now();
  } else {
    state.status = 'win';
  }
}

function resetBallAndPaddle() {
  const speed = getBallSpeedForLevel(state.level);
  state.paddle.x = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
  state.ball.x = CANVAS_WIDTH / 2;
  state.ball.y = CANVAS_HEIGHT - 60;
  state.ball.dx = speed * 0.5;
  state.ball.dy = -speed;
}

function resetGame() {
  state.score = 0;
  state.lives = INITIAL_LIVES;
  state.status = 'playing';
  state.blocks = generateBlocks(1);
  state.explosions = [];
  resetBallAndPaddle();
}

function checkBottomEdge() {
  const ball = state.ball;
  if (ball.y - BALL_RADIUS <= CANVAS_HEIGHT) return;

  state.lives -= 1;
  if (state.lives > 0) {
    resetBallAndPaddle();
  } else {
    state.status = 'gameover';
  }
}

function update() {
  updateBall();
  checkPaddleCollision();
  checkBlockCollisions();
  checkWinCondition();
  checkBottomEdge();
}

function advanceLevelIfReady() {
  if (performance.now() - state.levelCompleteStartTime < LEVEL_COMPLETE_DURATION) return;

  state.level += 1;
  state.blocks = generateBlocks(state.level);
  state.explosions = [];
  resetBallAndPaddle();
  state.levelCompleteStartTime = null;
  state.status = 'playing';
}

function loop() {
  if (state.status === 'playing') {
    update();
  } else if (state.status === 'level-complete') {
    advanceLevelIfReady();
  }
  render();
  requestAnimationFrame(loop);
}

loadSpritesheet(() => {
  requestAnimationFrame(loop);
});
