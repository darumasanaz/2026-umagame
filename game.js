// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const recipients = {
  hiko: {
    name: 'ひこさん',
    targetAmount: 505,
    message: 'ひこさん、ぴったりお年玉達成！今年もよろしくお願いします！'
  },
  taro: {
    name: 'たろうさん',
    targetAmount: 115,
    message: 'たろうさん、見事ジャストです！新年の運試し大成功！'
  },
  ume: {
    name: '梅子さん',
    targetAmount: 880,
    message: '梅子さん、福を抱えて新しい年も駆け抜けましょう！'
  }
};

const defaultRecipient = {
  name: 'ゲスト',
  targetAmount: 300,
  message: 'ぴったり達成！素敵な一年をお過ごしください。'
};

let currentRecipient = defaultRecipient;
let gameState = 'playing'; // 'playing' | 'gameover' | 'cleared'
let horse;
let groundY;
let obstacles = [];
let items = [];
let frameCount = 0;
let score = 0;
let totalAmount = 0;
let clearReady = false;
let obstacleTimer = 0;
let itemTimer = 0;
let finalMessage = '';

const moneyColors = ['#f4b400', '#f0932b', '#d35400'];

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  groundY = canvas.height * 0.78;
  if (horse) {
    horse.x = canvas.width * 0.2;
    horse.y = groundY - horse.height;
  }
}

function parseRecipient() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  currentRecipient = id && recipients[id] ? recipients[id] : defaultRecipient;
}

function initHorse() {
  const width = Math.max(40, canvas.width * 0.08);
  const height = Math.max(40, canvas.height * 0.18);
  horse = {
    x: canvas.width * 0.2,
    y: groundY - height,
    width,
    height,
    vy: 0,
    gravity: canvas.height * 0.0025,
    jumpForce: canvas.height * 0.04,
    onGround: true
  };
}

function resetGame() {
  gameState = 'playing';
  frameCount = 0;
  score = 0;
  totalAmount = 0;
  clearReady = false;
  obstacleTimer = 60;
  itemTimer = 90;
  obstacles = [];
  items = [];
  finalMessage = '';
  initHorse();
}

function start() {
  parseRecipient();
  resizeCanvas();
  initHorse();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('mousedown', handlePointer);
  window.addEventListener('touchstart', handlePointer, { passive: true });
  loop();
}

function handleKeyDown(e) {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    if (gameState === 'playing') {
      jump();
    } else if (gameState === 'gameover') {
      resetGame();
    }
  }
}

function handlePointer(e) {
  // Prevent multi-touch from firing twice
  if (e.type === 'touchstart') {
    e.preventDefault();
  }
  if (gameState === 'playing') {
    jump();
  } else if (gameState === 'gameover') {
    resetGame();
  }
}

function jump() {
  if (horse.onGround) {
    horse.vy = -horse.jumpForce;
    horse.onGround = false;
  }
}

function updateHorse() {
  horse.vy += horse.gravity;
  horse.y += horse.vy;
  if (horse.y + horse.height >= groundY) {
    horse.y = groundY - horse.height;
    horse.vy = 0;
    horse.onGround = true;
  }
}

function spawnObstacle() {
  const typeRand = Math.random();
  const baseSpeed = canvas.width * 0.005 + 4;
  let obstacle;
  if (typeRand < 0.4) {
    const width = canvas.width * 0.05;
    const height = canvas.height * 0.25;
    obstacle = {
      type: 'kadomatsu',
      x: canvas.width + width,
      y: groundY - height,
      width,
      height,
      speed: baseSpeed
    };
  } else if (typeRand < 0.65) {
    const width = canvas.width * 0.06;
    const height = canvas.height * 0.08;
    obstacle = {
      type: 'hane',
      x: canvas.width + width,
      y: groundY - horse.height * 0.7,
      width,
      height,
      speed: baseSpeed + 1
    };
  } else if (typeRand < 0.9) {
    const width = canvas.width * 0.08;
    const height = canvas.height * 0.12;
    const baseY = groundY - horse.height * 0.6;
    obstacle = {
      type: 'tai',
      x: canvas.width + width,
      y: baseY,
      width,
      height,
      baseY,
      amplitude: horse.height,
      angle: 0,
      waveSpeed: 0.08 + Math.random() * 0.1,
      speed: baseSpeed
    };
  } else {
    const width = canvas.width * 0.12;
    const height = canvas.height * 0.55;
    obstacle = {
      type: 'torii',
      x: canvas.width + width,
      y: groundY - height,
      width,
      height,
      speed: baseSpeed - 1
    };
  }
  obstacles.push(obstacle);
}

function spawnItem() {
  const width = canvas.width * 0.04;
  const height = canvas.height * 0.08;
  const baseY = groundY - height - Math.random() * horse.height;
  const values = [5, 50, 100, 500, 1000];
  const value = values[Math.floor(Math.random() * values.length)];
  items.push({
    x: canvas.width + width,
    y: baseY,
    width,
    height,
    value,
    speed: canvas.width * 0.004 + 3
  });
}

function updateObstacles() {
  obstacleTimer--;
  if (obstacleTimer <= 0) {
    spawnObstacle();
    obstacleTimer = 90 + Math.random() * 70;
  }

  obstacles = obstacles.filter((obstacle) => {
    obstacle.x -= obstacle.speed;
    if (obstacle.type === 'tai') {
      obstacle.angle += obstacle.waveSpeed;
      const minY = groundY - horse.height * 1.1;
      const maxY = groundY - obstacle.height - horse.height * 0.1;
      obstacle.y = obstacle.baseY + Math.sin(obstacle.angle) * obstacle.amplitude;
      obstacle.y = Math.max(minY, Math.min(obstacle.y, maxY));
    }

    if (obstacle.x + obstacle.width < 0) {
      return false;
    }

    if (checkCollision(horse, obstacle)) {
      if (obstacle.type === 'torii') {
        resolveToriiCollision();
      } else {
        gameState = 'gameover';
        finalMessage = '';
      }
      return false;
    }
    return true;
  });
}

  function resolveToriiCollision() {
    if (clearReady && totalAmount === currentRecipient.targetAmount) {
      gameState = 'cleared';
      finalMessage = currentRecipient.message;
    } else {
      gameState = 'gameover';
      finalMessage = 'まだ目標額に届いていません！お年玉を集め直しましょう。';
    }
  }

function updateItems() {
  if (gameState !== 'playing') return;

  itemTimer--;
  if (itemTimer <= 0) {
    spawnItem();
    itemTimer = 80 + Math.random() * 120;
  }

  items = items.filter((item) => {
    item.x -= item.speed;
    if (item.x + item.width < 0) return false;

    if (checkCollision(horse, item)) {
      totalAmount += item.value;
      if (totalAmount === currentRecipient.targetAmount) {
        clearReady = true;
      } else if (totalAmount > currentRecipient.targetAmount) {
        clearReady = false;
      }
      return false;
    }
    return true;
  });
}

function update() {
  if (gameState !== 'playing') return;

  frameCount++;
  score = Math.floor(frameCount / 2);

  updateHorse();
  updateObstacles();
  updateItems();
}

function drawBackground() {
  ctx.fillStyle = '#fdf5e6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#d35b1f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 5);
  ctx.lineTo(canvas.width, groundY + 5);
  ctx.stroke();
}

function drawHorse() {
  ctx.save();
  ctx.fillStyle = '#5c4033';
  ctx.fillRect(horse.x, horse.y, horse.width, horse.height);
  ctx.fillStyle = '#333';
  ctx.fillRect(
    horse.x + horse.width * 0.55,
    horse.y - horse.height * 0.35,
    horse.width * 0.35,
    horse.height * 0.35
  );
  ctx.restore();
}

function drawObstacles() {
  obstacles.forEach((obstacle) => {
    ctx.save();
    switch (obstacle.type) {
      case 'kadomatsu':
        ctx.fillStyle = '#2d8659';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.fillStyle = '#c47b28';
        ctx.fillRect(
          obstacle.x + obstacle.width * 0.15,
          obstacle.y + obstacle.height * 0.8,
          obstacle.width * 0.7,
          obstacle.height * 0.2
        );
        break;
      case 'hane':
        ctx.fillStyle = '#f25477';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(
          obstacle.x + obstacle.width * 0.2,
          obstacle.y + obstacle.height * 0.15,
          obstacle.width * 0.6,
          obstacle.height * 0.2
        );
        break;
      case 'tai':
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(
          obstacle.x + obstacle.width * 0.7,
          obstacle.y + obstacle.height * 0.3,
          obstacle.width * 0.2,
          obstacle.height * 0.2
        );
        break;
      case 'torii':
        ctx.fillStyle = '#b71c1c';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(
          obstacle.x - obstacle.width * 0.1,
          obstacle.y - obstacle.height * 0.05,
          obstacle.width * 1.2,
          obstacle.height * 0.15
        );
        break;
      default:
        break;
    }
    ctx.restore();
  });
}

function drawItems() {
  items.forEach((item) => {
    ctx.save();
    ctx.fillStyle = moneyColors[item.value % moneyColors.length];
    ctx.fillRect(item.x, item.y, item.width, item.height);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(12, canvas.height * 0.03)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.value, item.x + item.width / 2, item.y + item.height / 2);
    ctx.restore();
  });
}

function drawHUD() {
  ctx.fillStyle = '#222';
  ctx.font = `${Math.max(16, canvas.height * 0.04)}px 'Noto Sans JP', sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`MONEY: ${totalAmount}円`, 20, 40);
  ctx.fillText(`TARGET: ${currentRecipient.targetAmount}円`, 20, 80);
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE: ${score}`, canvas.width - 20, 40);
  if (clearReady) {
    ctx.fillStyle = '#d35b1f';
    ctx.textAlign = 'left';
    ctx.fillText('鳥居に入れば円満クリア！', 20, 120);
  }
}

function drawOverlay(title, body) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = `${Math.max(32, canvas.height * 0.07)}px 'Noto Sans JP', sans-serif`;
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 60);
  ctx.font = `${Math.max(20, canvas.height * 0.04)}px 'Noto Sans JP', sans-serif`;
  const lines = Array.isArray(body) ? body : String(body).split('\n');
  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, canvas.height / 2 + index * 32);
  });
}

function draw() {
  drawBackground();
  drawHorse();
  drawObstacles();
  drawItems();
  drawHUD();

  if (gameState === 'gameover') {
    drawOverlay('GAME OVER', [`集めた金額: ${totalAmount}円`, 'Tap or Press Space to Retry']);
  } else if (gameState === 'cleared') {
    const subtext = finalMessage || 'あけましておめでとうございます。今年もよろしくお願いします。';
    drawOverlay('おつかれさまでした！', [subtext]);
  }
}

function loop() {
  if (gameState === 'playing') {
    update();
  }
  draw();
  requestAnimationFrame(loop);
}

function checkCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

start();
