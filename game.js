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

function createBlocks() {
  const blocks = [];
  for (let row = 0; row < BLOCK_ROWS; row++) {
    for (let col = 0; col < BLOCK_COLS; col++) {
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
  blocks: createBlocks(),
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

function drawScore() {
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Score: ${state.score}`, 10, BLOCK_TOP_OFFSET / 2);
}

function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawBlocks();
  drawPaddle();
  drawBall();
  drawScore();
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
  if (e.key === 'ArrowLeft') {
    state.paddle.x = clampPaddleX(state.paddle.x - PADDLE_SPEED);
  } else if (e.key === 'ArrowRight') {
    state.paddle.x = clampPaddleX(state.paddle.x + PADDLE_SPEED);
  }
});

function updateBall() {
  const ball = state.ball;
  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x - BALL_RADIUS <= 0) {
    ball.x = BALL_RADIUS;
    ball.dx = -ball.dx;
  } else if (ball.x + BALL_RADIUS >= CANVAS_WIDTH) {
    ball.x = CANVAS_WIDTH - BALL_RADIUS;
    ball.dx = -ball.dx;
  }

  if (ball.y - BALL_RADIUS <= 0) {
    ball.y = BALL_RADIUS;
    ball.dy = -ball.dy;
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

  ball.dx = BALL_SPEED * Math.sin(angle);
  ball.dy = -BALL_SPEED * Math.cos(angle);

  const minDy = BALL_SPEED * MIN_DY_RATIO;
  if (Math.abs(ball.dy) < minDy) {
    ball.dy = -minDy;
  }

  ball.y = paddle.y - BALL_RADIUS;
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
    resolveBlockBounce(ball, block);
    playBreakSound();
    break;
  }
}

function update() {
  updateBall();
  checkPaddleCollision();
  checkBlockCollisions();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

loadSpritesheet(() => {
  requestAnimationFrame(loop);
});
