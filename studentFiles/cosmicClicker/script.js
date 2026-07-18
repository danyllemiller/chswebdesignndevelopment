// Cosmic Clicker — Chapter 10 Starter
// script.js

// ---------------------------------------------------------------
// STEP 1: Get the canvas and set up the drawing context
// ---------------------------------------------------------------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ---------------------------------------------------------------
// STEP 2: Game State Variables
// ---------------------------------------------------------------
let score = 0;
let timeLeft = 30;
let gameRunning = false;
let animationId;

// Array to hold active target objects
let targets = [];

// ---------------------------------------------------------------
// STEP 3: Target Class
// Each target is a circle the player must click
// ---------------------------------------------------------------
class Target {
    constructor() {
        // Give each target a random position and size
        this.radius = Math.random() * 20 + 15;
        this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
        this.y = Math.random() * (canvas.height - this.radius * 2) + this.radius;
        this.color = "#00e5ff";
        this.alive = true;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    // Check if a click (mx, my) hit this target
    isHit(mx, my) {
        const dist = Math.sqrt((mx - this.x) ** 2 + (my - this.y) ** 2);
        return dist <= this.radius;
    }
}

// ---------------------------------------------------------------
// STEP 4: Game Loop (requestAnimationFrame)
// ---------------------------------------------------------------
function gameLoop() {
    // Clear the canvas each frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all active targets
    targets.forEach(t => {
        if (t.alive) t.draw();
    });

    // Update HUD
    document.getElementById("score").textContent = score;

    if (gameRunning) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// ---------------------------------------------------------------
// STEP 5: Spawn targets on a timer
// ---------------------------------------------------------------
function spawnTarget() {
    if (!gameRunning) return;
    targets.push(new Target());
    // Remove old targets to keep the game clean
    if (targets.length > 8) targets.shift();
    setTimeout(spawnTarget, 800);
}

// ---------------------------------------------------------------
// STEP 6: Countdown Timer
// ---------------------------------------------------------------
function startCountdown() {
    const interval = setInterval(function () {
        timeLeft--;
        document.getElementById("timer").textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(interval);
            endGame();
        }
    }, 1000);
}

// ---------------------------------------------------------------
// STEP 7: Start the Game
// ---------------------------------------------------------------
function startGame() {
    score = 0;
    timeLeft = 30;
    targets = [];
    gameRunning = true;
    spawnTarget();
    startCountdown();
    gameLoop();
}

// ---------------------------------------------------------------
// STEP 8: End the Game
// ---------------------------------------------------------------
function endGame() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e6edf3";
    ctx.font = "bold 36px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("Game Over! Score: " + score, canvas.width / 2, canvas.height / 2);
}

// ---------------------------------------------------------------
// STEP 9: Click Detection
// ---------------------------------------------------------------
canvas.addEventListener("click", function (e) {
    if (!gameRunning) {
        startGame();
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    targets.forEach(t => {
        if (t.alive && t.isHit(mx, my)) {
            t.alive = false;
            score++;
        }
    });
});

// ---------------------------------------------------------------
// Draw the "Click to Start" screen
// ---------------------------------------------------------------
ctx.fillStyle = "#58a6ff";
ctx.font = "bold 28px Courier New";
ctx.textAlign = "center";
ctx.fillText("Click anywhere to start!", canvas.width / 2, canvas.height / 2);
