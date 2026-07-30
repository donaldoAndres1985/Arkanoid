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

function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawBlocks();
  drawPaddle();
  drawBall();
}

loadSpritesheet(() => {
  render();
});
