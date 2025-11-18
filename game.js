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

const MAX_STAMINA = 100;
const STAMINA_DECAY_RATE = 0.15;
const JUMP_STAMINA_COST = 2;
const CARROT_RECOVERY = 20;
const MONEY_PROBABILITY = 0.75; // chance to spawn money instead of carrot

let currentRecipient = defaultRecipient;
let gameState = 'playing'; // 'playing' | 'gameover' | 'cleared'
let horse;
let groundY;
let items = [];
let frameCount = 0;
let totalAmount = 0;
let itemTimer = 0;
let finalMessage = '';
let stamina = MAX_STAMINA;

const moneyColors = ['#f4b400', '#f0932b', '#d35400'];
const carrotBodyColor = '#ff8c42';
const carrotLeafColor = '#4caf50';

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
    onGround: true,
    jumpCount: 0,
    maxJumps: 2
  };
}

function resetGame() {
  gameState = 'playing';
  frameCount = 0;
  totalAmount = 0;
  itemTimer = 90;
  items = [];
  finalMessage = '';
  stamina = MAX_STAMINA;
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
    } else if (gameState === 'gameover' || gameState === 'cleared') {
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
  } else if (gameState === 'gameover' || gameState === 'cleared') {
    resetGame();
  }
}

function jump() {
  if (horse.jumpCount >= horse.maxJumps || stamina <= 0) return;
  horse.vy = -horse.jumpForce;
  horse.onGround = false;
  horse.jumpCount += 1;
  stamina = Math.max(0, stamina - JUMP_STAMINA_COST);
}

function updateHorse() {
  horse.vy += horse.gravity;
  horse.y += horse.vy;
  if (horse.y + horse.height >= groundY) {
    horse.y = groundY - horse.height;
    horse.vy = 0;
    horse.onGround = true;
    horse.jumpCount = 0;
  }
}

function spawnItem() {
  const width = canvas.width * 0.04;
  const height = canvas.height * 0.08;
  const baseY = groundY - height - Math.random() * horse.height;
  const values = [5, 50, 100, 500, 1000];
  const type = Math.random() < MONEY_PROBABILITY ? 'money' : 'carrot';
  const value = type === 'money' ? values[Math.floor(Math.random() * values.length)] : 0;
  items.push({
    type,
    x: canvas.width + width,
    y: baseY,
    width,
    height,
    value,
    speed: canvas.width * 0.004 + 3
  });
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
      if (item.type === 'money') {
        totalAmount += item.value;
        if (totalAmount === currentRecipient.targetAmount) {
          gameState = 'cleared';
          finalMessage = currentRecipient.message;
        } else if (totalAmount > currentRecipient.targetAmount) {
          gameState = 'gameover';
          finalMessage = 'お金を集めすぎてしまいました…。また挑戦してみてください。';
        }
      } else if (item.type === 'carrot') {
        stamina = Math.min(MAX_STAMINA, stamina + CARROT_RECOVERY);
      }
      return false;
    }
    return true;
  });
}

function update() {
  if (gameState !== 'playing') return;

  frameCount++;

  stamina = Math.max(0, stamina - STAMINA_DECAY_RATE);
  if (stamina <= 0) {
    gameState = 'gameover';
    finalMessage = '馬がバテてしまいました…。次は体力に気をつけて挑戦してみてください。';
    return;
  }

  updateHorse();
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

function drawItems() {
  items.forEach((item) => {
    ctx.save();
    if (item.type === 'money') {
      ctx.fillStyle = moneyColors[item.value % moneyColors.length];
      ctx.fillRect(item.x, item.y, item.width, item.height);
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.max(12, canvas.height * 0.03)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.value, item.x + item.width / 2, item.y + item.height / 2);
    } else {
      ctx.fillStyle = carrotBodyColor;
      ctx.beginPath();
      ctx.moveTo(item.x, item.y + item.height);
      ctx.lineTo(item.x + item.width / 2, item.y);
      ctx.lineTo(item.x + item.width, item.y + item.height);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = carrotLeafColor;
      ctx.fillRect(item.x + item.width * 0.35, item.y - item.height * 0.2, item.width * 0.3, item.height * 0.2);
    }
    ctx.restore();
  });
}

function drawHUD() {
  ctx.fillStyle = '#222';
  ctx.font = `${Math.max(16, canvas.height * 0.04)}px 'Noto Sans JP', sans-serif`;
  ctx.textAlign = 'right';
  const margin = 24;
  ctx.fillText(`MONEY: ${totalAmount}円`, canvas.width - margin, 40);
  ctx.fillText(`TARGET: ${currentRecipient.targetAmount}円`, canvas.width - margin, 80);
  ctx.textAlign = 'right';
  const staminaRatio = Math.max(0, stamina) / MAX_STAMINA;
  const staminaPercent = Math.round(staminaRatio * 100);
  ctx.fillText(`STAMINA: ${staminaPercent}%`, canvas.width - margin, 120);

  const barWidth = canvas.width * 0.25;
  const barHeight = 16;
  const barX = canvas.width - margin - barWidth;
  const barY = 140;
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = '#4caf50';
  ctx.fillRect(barX, barY, barWidth * staminaRatio, barHeight);
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
  drawItems();
  drawHUD();

  if (gameState === 'gameover') {
    const message = finalMessage || `集めた金額: ${totalAmount}円`;
    drawOverlay('GAME OVER', [message, 'Tap or Press Space to Retry']);
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

// Changes summary:
// - Added stamina system with decay/recovery plus double jump logic in jump(), updateHorse(), and update().
// - Replaced obstacle rules with money/carrot item handling in spawnItem(), updateItems(), and drawItems().
// - Updated HUD, overlays, and input handlers to support new win/lose conditions and retry flow.
