const shooterCanvas = document.getElementById('shooterCanvas');
const shooterCtx = shooterCanvas.getContext('2d');
let shooterGameRunning = false;
let shooterScore = 0;
let currentQuestion = null;
let asteroids = [];
let lasers = [];
let ship = { x: 400, y: 350, width: 40, height: 40 };
let shooterLastTime = 0;

function initShooter() {
    hideAll();
    document.getElementById('shooter-area').style.display = 'block';
    shooterCanvas.width = 800;
    shooterCanvas.height = 400;
    shooterGameRunning = true;
    shooterScore = 0;
    asteroids = [];
    lasers = [];
    ship.x = 380;
    document.getElementById('shooter-score').innerText = shooterScore;
    newShooterQuestion();
    requestAnimationFrame(updateShooter);
}

async function newShooterQuestion() {
    try {
        const data = await getGameData('mine');
        if (data && data.q && data.a) {
            currentQuestion = { q: data.q, a: data.a.toLowerCase().trim() };
            document.getElementById('shooter-question').innerText = `Tarjima qiling: ${currentQuestion.q}`;
            spawnAsteroids(); 
        }
    } catch (e) {
        console.error("Shooter Question Error:", e);
    }
}

function spawnAsteroids() {
    const commonWords = ["water", "book", "sun", "moon", "car", "house", "tree", "bird", "sky", "road", "city", "friend", "time", "life", "work", "school", "music", "food", "game", "fire"];
    
    // Shuffle common words and take 2
    let wrongWords = commonWords.filter(w => w !== currentQuestion.a).sort(() => Math.random() - 0.5).slice(0, 2);
    
    let words = [currentQuestion.a, ...wrongWords].sort(() => Math.random() - 0.5);

    asteroids = [];
    words.forEach((w, i) => {
        asteroids.push({
            x: 100 + i * 250,
            y: -50,
            word: w,
            width: 90,
            height: 45,
            speed: 1.5 + Math.random() * 1.5
        });
    });
}

function updateShooter(timestamp) {
    if (!shooterGameRunning) return;

    // Movement
    if (keys['ArrowLeft'] || keys['KeyA']) ship.x -= 8;
    if (keys['ArrowRight'] || keys['KeyD']) ship.x += 8;
    if (ship.x < 0) ship.x = 0;
    if (ship.x > shooterCanvas.width - ship.width) ship.x = shooterCanvas.width - ship.width;

    // Shoot (Upgrades based on score)
    if ((keys['Space'] || keys['KeyF']) && timestamp - shooterLastTime > 300) {
        if (shooterScore < 200) {
            // Single shot
            lasers.push({ x: ship.x + ship.width/2 - 2, y: ship.y, dy: -10 });
        } else if (shooterScore < 500) {
            // Double shot
            lasers.push({ x: ship.x + 10, y: ship.y + 10, dy: -10 });
            lasers.push({ x: ship.x + ship.width - 14, y: ship.y + 10, dy: -10 });
        } else {
            // Triple shot
            lasers.push({ x: ship.x + ship.width/2 - 2, y: ship.y, dy: -10 });
            lasers.push({ x: ship.x, y: ship.y + 20, dy: -10 });
            lasers.push({ x: ship.x + ship.width - 4, y: ship.y + 20, dy: -10 });
        }
        shooterLastTime = timestamp;
    }

    // Update Lasers
    lasers.forEach((l, i) => {
        l.y += l.dy;
        if (l.y < 0) lasers.splice(i, 1);
    });

    // Update Asteroids
    asteroids.forEach((a, ai) => {
        a.y += a.speed;
        
        // Check collision with lasers
        lasers.forEach((l, li) => {
            if (l.x < a.x + a.width && l.x + 5 > a.x && l.y < a.y + a.height && l.y + 10 > a.y) {
                lasers.splice(li, 1);
                if (a.word === currentQuestion.a) {
                    shooterScore += 50;
                    document.getElementById('shooter-score').innerText = shooterScore;
                    asteroids = [];
                    newShooterQuestion();
                } else {
                    shooterScore = Math.max(0, shooterScore - 10);
                    document.getElementById('shooter-score').innerText = shooterScore;
                    asteroids.splice(ai, 1);
                }
            }
        });

        if (a.y > shooterCanvas.height) {
            asteroids.splice(ai, 1);
            if (asteroids.length === 0) newShooterQuestion();
        }
    });

    drawShooter();
    requestAnimationFrame(updateShooter);
}

function drawShooter() {
    shooterCtx.clearRect(0, 0, shooterCanvas.width, shooterCanvas.height);

    // Stars background
    shooterCtx.fillStyle = "rgba(255, 255, 255, 0.5)";
    for(let i=0; i<60; i++) {
        let size = Math.random() * 3;
        shooterCtx.fillRect(Math.random() * 800, (Date.now()/20 + i*50) % 400, size, size);
    }

    // Airplane Draw (More detailed)
    const sx = ship.x;
    const sy = ship.y;
    
    // Body
    shooterCtx.fillStyle = "#bdc3c7";
    shooterCtx.beginPath();
    shooterCtx.moveTo(sx + 20, sy); // Nose
    shooterCtx.lineTo(sx + 10, sy + 40); // Body left
    shooterCtx.lineTo(sx + 30, sy + 40); // Body right
    shooterCtx.closePath();
    shooterCtx.fill();
    
    // Wings
    shooterCtx.fillStyle = "#7f8c8d";
    shooterCtx.fillRect(sx, sy + 15, 40, 8); // Main wing
    shooterCtx.fillRect(sx + 10, sy + 35, 20, 5); // Tail wing
    
    // Cockpit
    shooterCtx.fillStyle = "#3498db";
    shooterCtx.beginPath();
    shooterCtx.arc(sx + 20, sy + 15, 5, 0, Math.PI*2);
    shooterCtx.fill();

    // Lasers
    shooterCtx.fillStyle = "#ff4dff";
    shooterCtx.shadowBlur = 10;
    shooterCtx.shadowColor = "#ff4dff";
    lasers.forEach(l => shooterCtx.fillRect(l.x, l.y, 4, 15));
    shooterCtx.shadowBlur = 0;

    // Asteroids
    asteroids.forEach(a => {
        shooterCtx.fillStyle = "#576574";
        shooterCtx.beginPath();
        shooterCtx.roundRect(a.x, a.y, a.width, a.height, 10);
        shooterCtx.fill();
        shooterCtx.strokeStyle = "#2c3e50";
        shooterCtx.lineWidth = 2;
        shooterCtx.stroke();
        
        shooterCtx.fillStyle = "white";
        shooterCtx.font = "bold 16px Arial";
        shooterCtx.textAlign = "center";
        shooterCtx.fillText(a.word, a.x + a.width/2, a.y + a.height/2 + 5);
    });
}
