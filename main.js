const GRID_SIZE = 20;
const TICK_MS = 120;
const LEADERBOARD_KEY = "snake.leaderboard.v1";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const playerDisplay = document.getElementById("player-display");
const pauseBtn = document.getElementById("pause-btn");
const restartBtn = document.getElementById("restart-btn");
const leaderboardBody = document.getElementById("leaderboard-body");
const helpEl = document.getElementById("help");

const nameModal = document.getElementById("name-modal");
const nameInput = document.getElementById("player-name");
const nameError = document.getElementById("name-error");
const startBtn = document.getElementById("start-btn");

let cellSize = 20;
let boardPx = 400;
let state = null;
let intervalId = null;
let gameStarted = false;
let playerName = "";

const KEY_DIR = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
  W: "up",
  A: "left",
  S: "down",
  D: "right",
};

function resizeBoard() {
  const maxBoardPx = Math.min(window.innerWidth, window.innerHeight);
  const rawCell = Math.floor(maxBoardPx / GRID_SIZE);
  cellSize = Math.max(1, rawCell);
  boardPx = cellSize * GRID_SIZE;

  canvas.width = boardPx;
  canvas.height = boardPx;
  canvas.style.width = `${boardPx}px`;
  canvas.style.height = `${boardPx}px`;
}

function setControlsEnabled(enabled) {
  pauseBtn.disabled = !enabled;
  restartBtn.disabled = !enabled;
}

function renderLeaderboard(entries = loadLeaderboard()) {
  leaderboardBody.innerHTML = "";

  if (entries.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "empty";
    cell.textContent = "No scores yet.";
    row.appendChild(cell);
    leaderboardBody.appendChild(row);
    return;
  }

  entries.forEach((entry, index) => {
    const row = document.createElement("tr");
    const rankCell = document.createElement("td");
    rankCell.textContent = String(index + 1);
    const nameCell = document.createElement("td");
    nameCell.textContent = entry.name;
    const scoreCell = document.createElement("td");
    scoreCell.textContent = String(entry.score);
    row.appendChild(rankCell);
    row.appendChild(nameCell);
    row.appendChild(scoreCell);
    leaderboardBody.appendChild(row);
  });
}

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry) => entry && typeof entry.name === "string"
    );
  } catch (error) {
    return [];
  }
}

function saveLeaderboard(entries) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

function recordScore(score) {
  if (!playerName) {
    return;
  }
  const entries = loadLeaderboard();
  entries.push({ name: playerName, score, timestamp: Date.now() });
  entries.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.timestamp - b.timestamp;
  });
  const trimmed = entries.slice(0, 5);
  saveLeaderboard(trimmed);
  renderLeaderboard(trimmed);
}

function startGame() {
  const name = nameInput.value.trim();
  if (!name) {
    nameError.textContent = "Please enter your name.";
    return;
  }

  playerName = name;
  playerDisplay.textContent = playerName;
  nameError.textContent = "";
  nameModal.classList.add("hidden");
  helpEl.classList.add("hidden");
  gameStarted = true;
  setControlsEnabled(true);
  resetGame();

  if (!intervalId) {
    intervalId = setInterval(tick, TICK_MS);
  }
}

function resetGame() {
  if (!gameStarted) {
    return;
  }
  state = SnakeLogic.createInitialState({ gridSize: GRID_SIZE });
  render();
}

function togglePause() {
  if (!gameStarted) {
    return;
  }
  state = SnakeLogic.togglePause(state);
  render();
}

function tick() {
  if (!gameStarted || !state) {
    return;
  }
  const prevStatus = state.status;
  state = SnakeLogic.step(state);

  if (
    prevStatus === "playing" &&
    (state.status === "gameover" || state.status === "win")
  ) {
    recordScore(state.score);
  }

  render();
}

function render() {
  if (!state) {
    scoreEl.textContent = "0";
    statusEl.textContent = "";
    pauseBtn.textContent = "Pause";
    ctx.fillStyle = "#101010";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  scoreEl.textContent = String(state.score);

  if (state.status === "paused") {
    statusEl.textContent = "Paused";
  } else if (state.status === "gameover") {
    statusEl.textContent = "Game Over";
  } else if (state.status === "win") {
    statusEl.textContent = "You Win";
  } else {
    statusEl.textContent = "";
  }

  pauseBtn.textContent = state.status === "paused" ? "Resume" : "Pause";

  ctx.fillStyle = "#101010";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.food) {
    drawCell(state.food.x, state.food.y, "#e74c3c");
  }

  state.snake.forEach((segment, index) => {
    drawCell(segment.x, segment.y, index === 0 ? "#4caf50" : "#2e7d32");
  });
}

function drawCell(x, y, color) {
  const padding = Math.max(1, Math.floor(cellSize * 0.08));
  const size = cellSize - padding * 2;
  ctx.fillStyle = color;
  ctx.fillRect(
    x * cellSize + padding,
    y * cellSize + padding,
    size,
    size
  );
}

pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", resetGame);
startBtn.addEventListener("click", startGame);
nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    startGame();
  }
});
nameInput.addEventListener("input", () => {
  if (nameError.textContent) {
    nameError.textContent = "";
  }
});

window.addEventListener("keydown", (event) => {
  if (!gameStarted) {
    return;
  }

  const key = event.key;
  if (KEY_DIR[key]) {
    event.preventDefault();
    if (state && state.status === "playing") {
      state = SnakeLogic.queueDirection(state, KEY_DIR[key]);
    }
    return;
  }

  if (key === " " || key === "Spacebar" || key === "p" || key === "P") {
    event.preventDefault();
    togglePause();
    return;
  }

  if (key === "r" || key === "R") {
    event.preventDefault();
    resetGame();
  }
});

window.addEventListener("resize", () => {
  resizeBoard();
  render();
});

resizeBoard();
setControlsEnabled(false);
renderLeaderboard();
render();
