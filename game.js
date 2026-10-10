const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GRAVITY = 0.52;
const LEVEL_WIDTH = 3500;
const PLAYER_START = { x: 110, y: 300 };

const keys = {};
const platforms = [];
const enemies = [];
const bullets = [];

let cameraX = 0;
let gameState = 'playing';

const player = {
  x: PLAYER_START.x,
  y: PLAYER_START.y,
  w: 34,
  h: 52,
  vx: 0,
  vy: 0,
  speed: 4.4,
  jumpStrength: 13.5,
  dir: 1,
  onGround: false,
  fireCooldown: 0,
  invulnerable: 0,
  lives: 3,
};

const goal = {
  x: LEVEL_WIDTH - 120,
  y: 180,
  w: 26,
  h: 160,
};

function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildLevel() {
  platforms.length = 0;
  enemies.length = 0;
  bullets.length = 0;

  // Ground
  platforms.push({ x: 0, y: HEIGHT - 52, w: LEVEL_WIDTH, h: 52, type: 'ground' });

  // Floating platforms
  const levelPlatforms = [
    { x: 320, y: 430, w: 180, h: 20 },
    { x: 620, y: 390, w: 170, h: 20 },
    { x: 880, y: 350, w: 150, h: 20 },
    { x: 1110, y: 440, w: 180, h: 20 },
    { x: 1490, y: 390, w: 160, h: 20 },
    { x: 1780, y: 340, w: 170, h: 20 },
    { x: 2090, y: 420, w: 180, h: 20 },
    { x: 2390, y: 360, w: 170, h: 20 },
    { x: 2720, y: 300, w: 200, h: 20 },
    { x: 3000, y: 430, w: 200, h: 20 },
  ];

  for (const p of levelPlatforms) platforms.push({ ...p, type: 'platform' });

  // Enemy turtles
  const enemyList = [
    { x: 620, y: HEIGHT - 52 - 30, w: 32, h: 30 },
    { x: 1170, y: HEIGHT - 52 - 30, w: 32, h: 30 },
    { x: 1810, y: HEIGHT - 52 - 30, w: 32, h: 30 },
    { x: 2430, y: HEIGHT - 52 - 30, w: 32, h: 30 },
    { x: 3090, y: HEIGHT - 52 - 30, w: 32, h: 30 },
  ];

  for (const enemy of enemyList) {
    enemies.push({
      ...enemy,
      alive: true,
      speed: 1.2 + Math.random() * 0.7,
      dir: -1,
      bob: Math.random() * 100,
      hp: 1,
    });
  }
}

function resetPlayer() {
  player.x = PLAYER_START.x;
  player.y = PLAYER_START.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.dir = 1;
  player.fireCooldown = 0;
  player.invulnerable = 0;
}

function resetGame() {
  player.lives = 3;
  buildLevel();
  resetPlayer();
  gameState = 'playing';
}

function fireBullet() {
  if (player.fireCooldown > 0 || gameState !== 'playing') return;

  player.fireCooldown = 220;
  bullets.push({
    x: player.x + (player.dir === 1 ? player.w + 8 : -8),
    y: player.y + player.h * 0.52,
    r: 5,
    vx: player.dir * 8.2,
    vy: 0,
    life: 90,
  });
}

function handleInput() {
  const left = keys['ArrowLeft'] || keys['KeyA'];
  const right = keys['ArrowRight'] || keys['KeyD'];
  const jump = keys['ArrowUp'] || keys['KeyW'] || keys['Space'];

  if (left && !right) {
    player.vx = -player.speed;
    player.dir = -1;
  } else if (right && !left) {
    player.vx = player.speed;
    player.dir = 1;
  } else {
    player.vx *= 0.72;
    if (Math.abs(player.vx) < 0.1) player.vx = 0;
  }

  if (jump && player.onGround) {
    player.vy = -player.jumpStrength;
    player.onGround = false;
  }
}

function updatePlayer() {
  const prevX = player.x;
  const prevY = player.y;

  handleInput();

  player.vy += GRAVITY;
  player.x += player.vx;

  for (const platform of platforms) {
    if (rectsIntersect(player, platform)) {
      if (prevX + player.w <= platform.x + 8 && player.vx > 0) {
        player.x = platform.x - player.w;
        player.vx = 0;
      } else if (prevX >= platform.x + platform.w - 8 && player.vx < 0) {
        player.x = platform.x + platform.w;
        player.vx = 0;
      }
    }
  }

  player.y += player.vy;
  player.onGround = false;

  for (const platform of platforms) {
    if (rectsIntersect(player, platform)) {
      if (prevY + player.h <= platform.y + 10 && player.vy >= 0) {
        player.y = platform.y - player.h;
        player.vy = 0;
        player.onGround = true;
      } else if (prevY >= platform.y + platform.h - 10 && player.vy < 0) {
        player.y = platform.y + platform.h;
        player.vy = 0;
      } else {
        if (player.x + player.w > platform.x && player.x < platform.x + platform.w) {
          player.vy = 0;
        }
      }
    }
  }

  player.x = clamp(player.x, 0, LEVEL_WIDTH - player.w);
  if (player.y > HEIGHT + 120) {
    damagePlayer();
    resetPlayer();
  }

  if (player.fireCooldown > 0) player.fireCooldown -= 1;
  if (player.invulnerable > 0) player.invulnerable -= 1;

  cameraX = clamp(player.x - WIDTH * 0.35, 0, LEVEL_WIDTH - WIDTH);
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    bullet.life -= 1;

    if (bullet.life <= 0 || bullet.x < 0 || bullet.x > LEVEL_WIDTH) {
      bullets.splice(i, 1);
      continue;
    }

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = bullet.x - (enemy.x + enemy.w / 2);
      const dy = bullet.y - (enemy.y + enemy.h / 2);
      const d = Math.hypot(dx, dy);

      if (d < 18) {
        enemy.alive = false;
        bullets.splice(i, 1);
        break;
      }
    }
  }
}

function updateEnemies() {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    enemy.x += enemy.speed * enemy.dir;
    const groundY = HEIGHT - 82;

    if (enemy.x <= 100 || enemy.x + enemy.w >= LEVEL_WIDTH - 100) {
      enemy.dir *= -1;
    }

    if (enemy.x < 0) enemy.x = 0;
    if (enemy.x + enemy.w > LEVEL_WIDTH) enemy.x = LEVEL_WIDTH - enemy.w;

    const enemyRect = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
    const playerRect = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (rectsIntersect(enemyRect, playerRect)) {
      if (player.invulnerable <= 0) {
        damagePlayer();
      }
    }

    enemy.y = groundY - enemy.h;
  }
}

function damagePlayer() {
  if (player.invulnerable > 0) return;

  player.lives -= 1;
  player.invulnerable = 120;

  if (player.lives <= 0) {
    gameState = 'gameover';
  }
}

function update() {
  if (gameState !== 'playing') return;

  updatePlayer();
  updateBullets();
  updateEnemies();

  if (player.x + player.w >= goal.x && player.y + player.h > goal.y) {
    gameState = 'win';
  }

  hud.textContent = `Düşmanlar: ${enemies.filter((enemy) => enemy.alive).length} | Can: ${player.lives}`;
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#8bd4ff');
  sky.addColorStop(0.45, '#d6f3ff');
  sky.addColorStop(0.46, '#d6f3ff');
  sky.addColorStop(1, '#7bb865');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Far hills
  for (let i = 0; i < 8; i++) {
    const x = ((i * 220) - (cameraX * 0.3)) % (WIDTH + 260) - 100;
    ctx.fillStyle = '#9fd38a';
    ctx.beginPath();
    ctx.moveTo(x, HEIGHT);
    ctx.lineTo(x + 90, 260);
    ctx.lineTo(x + 180, HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  // Trees
  for (let i = 0; i < 18; i++) {
    const x = ((i * 180) - cameraX * 0.6) % (WIDTH + 220) - 100;
    const trunkX = x + 30;

    ctx.fillStyle = '#3d5930';
    ctx.fillRect(trunkX, 320, 14, 60);

    ctx.fillStyle = '#468d4d';
    ctx.beginPath();
    ctx.arc(x + 36, 300, 34, 0, Math.PI * 2);
    ctx.arc(x + 16, 314, 24, 0, Math.PI * 2);
    ctx.arc(x + 58, 314, 26, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlatforms() {
  for (const platform of platforms) {
    const x = platform.x - cameraX;
    const y = platform.y;
    if (platform.type === 'ground') {
      ctx.fillStyle = '#4f7833';
      ctx.fillRect(x, y, platform.w, platform.h);
      ctx.fillStyle = '#5c9d41';
      ctx.fillRect(x, y, platform.w, 12);
      ctx.fillStyle = '#745136';
      for (let i = 0; i < platform.w; i += 42) {
        ctx.fillRect(x + i, y + 28, 12, 12);
      }
    } else {
      ctx.fillStyle = '#7a4e2f';
      ctx.fillRect(x, y, platform.w, platform.h);
      ctx.fillStyle = '#8f6440';
      ctx.fillRect(x, y, platform.w, 6);
    }
  }
}

function drawGoal() {
  const x = goal.x - cameraX;
  ctx.fillStyle = '#f0f4ff';
  ctx.fillRect(x, goal.y, 6, goal.h);
  ctx.fillStyle = '#ffec59';
  ctx.beginPath();
  ctx.moveTo(x + 6, goal.y + 10);
  ctx.lineTo(x + 48, goal.y + 25);
  ctx.lineTo(x + 6, goal.y + 45);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer() {
  const x = player.x - cameraX;
  const y = player.y;

  if (player.invulnerable > 0 && Math.floor(player.invulnerable / 8) % 2 === 0) {
    return;
  }

  // Body
  ctx.fillStyle = '#2d6ae0';
  ctx.fillRect(x, y + 12, player.w, player.h - 12);

  // Head
  ctx.fillStyle = '#f5d0a9';
  ctx.fillRect(x + 8, y, player.w - 16, 16);

  // Hair
  ctx.fillStyle = '#3c2612';
  ctx.fillRect(x + 7, y, player.w - 14, 6);

  // Eyes
  ctx.fillStyle = '#111';
  ctx.fillRect(x + 9, y + 6, 4, 4);
  ctx.fillRect(x + player.w - 13, y + 6, 4, 4);

  // Legs
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(x + 7, y + player.h - 2, 8, 8);
  ctx.fillRect(x + player.w - 15, y + player.h - 2, 8, 8);

  // Weapon
  ctx.fillStyle = '#4d4d53';
  const gunX = player.dir === 1 ? x + player.w : x - 10;
  ctx.fillRect(gunX, y + 20, 12, 6);
}

function drawBullets() {
  for (const bullet of bullets) {
    ctx.fillStyle = '#ffd333';
    ctx.beginPath();
    ctx.arc(bullet.x - cameraX, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const x = enemy.x - cameraX;
    const y = enemy.y;

    ctx.fillStyle = '#4c8a39';
    ctx.fillRect(x, y + 6, enemy.w, enemy.h - 6);
    ctx.fillStyle = '#2d5621';
    ctx.fillRect(x + 4, y + 12, enemy.w - 8, 10);
    ctx.fillStyle = '#123b14';
    ctx.fillRect(x + 7, y + 5, 6, 6);
    ctx.fillRect(x + enemy.w - 13, y + 5, 6, 6);

    ctx.fillStyle = '#f3f3f3';
    ctx.fillRect(x + 8, y + 20, 5, 5);
    ctx.fillRect(x + enemy.w - 13, y + 20, 5, 5);
  }
}

function drawStatus() {
  ctx.fillStyle = 'rgba(10,22,13,0.55)';
  ctx.fillRect(20, 18, 260, 46);
  ctx.fillStyle = '#e9ffe7';
  ctx.font = 'bold 22px Arial';
  ctx.fillText('Orman Parkuru', 34, 48);

  if (gameState === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('Kaybettin!', WIDTH / 2 - 120, HEIGHT / 2 - 20);
    ctx.font = '28px Arial';
    ctx.fillText('Tekrar başlamak için R', WIDTH / 2 - 150, HEIGHT / 2 + 30);
  }

  if (gameState === 'win') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('Parkuru Tamamladın!', WIDTH / 2 - 230, HEIGHT / 2 - 25);
    ctx.font = '28px Arial';
    ctx.fillText('Yeniden başlamak için R', WIDTH / 2 - 150, HEIGHT / 2 + 35);
  }
}

function render() {
  drawBackground();
  drawPlatforms();
  drawGoal();
  drawBullets();
  drawEnemies();
  drawPlayer();
  drawStatus();
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;

  if (event.code === 'KeyF' || event.code === 'KeyJ' || event.code === 'KeyK') {
    fireBullet();
  }

  if ((event.code === 'KeyR' || event.code === 'Enter') && (gameState === 'gameover' || gameState === 'win')) {
    resetGame();
  }

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

resetGame();
requestAnimationFrame(gameLoop);
