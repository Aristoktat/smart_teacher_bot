const canvas = document.getElementById('marioCanvas');
const ctx = canvas.getContext('2d');
let marioGameRunning = false;
let marioScore = 0;

let cameraX = 0;
let lastGeneratedX = 800;

const player = {
    x: 50,
    y: 200,
    width: 30,
    height: 50,
    speed: 5,
    dx: 0,
    dy: 0,
    jumpPower: -12,
    gravity: 0.6,
    grounded: false
};

let platforms = [
    { x: 0, y: 350, width: 2000, height: 50, type: 'ground' },
    { x: 200, y: 250, width: 150, height: 20 },
    { x: 500, y: 180, width: 150, height: 20 }
];

let questionBlocks = [
    { x: 250, y: 150, width: 40, height: 40, active: true, color: '#f1c40f' }
];

let coins = [];

let enemies = [];
let powerups = [];
let isBig = false;
let fireballs = [];
let lastShootTime = 0;

function generateLevelSection(startX) {
    for (let i = 0; i < 5; i++) {
        let x = startX + i * 400 + Math.random() * 200;
        let y = 150 + Math.random() * 150;
        platforms.push({ x: x, y: y, width: 150, height: 20 });
        
        // Add Enemies
        if (Math.random() > 0.6) {
            enemies.push({ x: x + 50, y: y - 30, width: 30, height: 30, dx: -2, platform: platforms[platforms.length-1] });
        }

        // Add Spikes
        if (Math.random() > 0.4) {
            spikes.push({ x: x + 40, y: y - 15, width: 70, height: 15 });
        }
        
        // Question Blocks
        if (Math.random() > 0.5) {
            let bType = Math.random() > 0.8 ? 'mushroom' : 'question';
            questionBlocks.push({ x: x + 50, y: y - 80, width: 40, height: 40, active: true, color: '#f1c40f', type: bType });
        }
        
        for (let j = 0; j < 3; j++) {
            coins.push({ x: x + j * 40, y: y - 40, width: 20, height: 20, collected: false });
        }
    }
    lastGeneratedX = startX + 2000;
}

let activeBlock = null;

let marioLives = 3;
let spikes = [];

function initMario() {
    hideAll();
    document.getElementById('mario-area').style.display = 'block';
    canvas.width = 800;
    canvas.height = 400;
    marioGameRunning = true;
    marioScore = 0;
    marioLives = 3;
    isBig = false;
    cameraX = 0;
    player.x = 50;
    player.y = 200;
    player.dy = 0;
    player.width = 30;
    player.height = 50;
    platforms = [{ x: 0, y: 350, width: 2000, height: 50, type: 'ground' }];
    questionBlocks = [];
    coins = [];
    spikes = [];
    enemies = [];
    powerups = [];
    lastGeneratedX = 0;
    generateLevelSection(0);
    updateUI();
    requestAnimationFrame(updateMario);
}

function updateUI() {
    document.getElementById('mario-score').innerText = marioScore;
    let hearts = "";
    for(let i=0; i<marioLives; i++) hearts += "❤️";
    document.getElementById('mario-lives').innerText = hearts || "O'LDINGIZ 💀";
}

function die() {
    if (isBig) {
        isBig = false;
        player.height = 50;
        player.y -= 10;
        alert("Kichraydingiz! ✨");
        return;
    }
    marioLives--;
    updateUI();
    if (marioLives <= 0) {
        marioGameRunning = false;
        alert("O'yin tugadi! 💀 Jami ball: " + marioScore);
        showMain();
    } else {
        player.x = Math.max(0, cameraX);
        player.y = 100;
        player.dy = 0;
        alert("Bitta jon ketdi! ❤️");
    }
}

function updateMario() {
    if (!marioGameRunning) return;

    if (keys['ArrowLeft'] || keys['KeyA']) player.dx = -player.speed;
    else if (keys['ArrowRight'] || keys['KeyD']) player.dx = player.speed;
    else player.dx = 0;

    if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && player.grounded) {
        player.dy = player.jumpPower;
        player.grounded = false;
    }

    // Shooting (Fireball)
    if ((keys['ShiftLeft'] || keys['KeyF']) && Date.now() - lastShootTime > 300) {
        fireballs.push({ 
            x: player.x + (player.dx >= 0 ? player.width : 0), 
            y: player.y + player.height/2, 
            dx: player.dx >= 0 ? 8 : -8, 
            width: 10, height: 10 
        });
        lastShootTime = Date.now();
    }

    player.dy += player.gravity;
    player.x += player.dx;
    player.y += player.dy;

    if (player.x < 0) player.x = 0;
    
    // Fall off screen
    if (player.y > canvas.height + 100) {
        die();
    }

    if (player.x + 1000 > lastGeneratedX) {
        generateLevelSection(lastGeneratedX);
    }

    if (player.x > canvas.width / 2) {
        cameraX = player.x - canvas.width / 2;
    }

    player.grounded = false;

    platforms.forEach(p => {
        if (player.x < p.x + p.width && player.x + player.width > p.x &&
            player.y < p.y + p.height && player.y + player.height > p.y) {
            if (player.dy > 0 && player.y + player.height - player.dy <= p.y) {
                player.y = p.y - player.height;
                player.dy = 0;
                player.grounded = true;
            }
        }
    });

    // Fireballs
    fireballs.forEach((f, fIdx) => {
        f.x += f.dx;
        enemies.forEach((e, eIdx) => {
            if (f.x < e.x + e.width && f.x + f.width > e.x &&
                f.y < e.y + e.height && f.y + f.height > e.y) {
                enemies.splice(eIdx, 1);
                fireballs.splice(fIdx, 1);
                marioScore += 30;
                updateUI();
            }
        });
        if (f.x < cameraX || f.x > cameraX + 800) fireballs.splice(fIdx, 1);
    });

    // Aggressive Enemies
    enemies.forEach((e, idx) => {
        let dist = Math.abs(player.x - e.x);
        if (dist < 300) e.dx = (player.x < e.x) ? -4 : 4;
        else if (e.x < e.platform.x || e.x + e.width > e.platform.x + e.platform.width) e.dx *= -1;
        
        e.x += e.dx;

        if (player.x < e.x + e.width && player.x + player.width > e.x &&
            player.y < e.y + e.height && player.y + player.height > e.y) {
            if (player.dy > 0 && player.y + player.height - player.dy <= e.y) {
                enemies.splice(idx, 1);
                player.dy = -8;
                marioScore += 20;
                updateUI();
            } else {
                die();
            }
        }
    });

    // Powerups (Mushroom)
    powerups.forEach((p, idx) => {
        p.x += p.dx;
        p.dy += 0.5;
        p.y += p.dy;
        
        // Ground check for mushroom
        platforms.forEach(plat => {
            if (p.x < plat.x + plat.width && p.x + p.width > plat.x &&
                p.y + p.height > plat.y && p.y < plat.y + plat.height) {
                p.y = plat.y - p.height;
                p.dy = 0;
            }
        });

        if (player.x < p.x + p.width && player.x + player.width > p.x &&
            player.y < p.y + p.height && player.y + player.height > p.y) {
            powerups.splice(idx, 1);
            if (!isBig) {
                isBig = true;
                player.height = 70;
                player.y -= 20;
            }
            marioScore += 100;
            updateUI();
        }
    });

    // Spike collision
    spikes.forEach(s => {
        if (player.x < s.x + s.width && player.x + player.width > s.x &&
            player.y < s.y + s.height && player.y + player.height > s.y) {
            die();
        }
    });

    coins.forEach(c => {
        if (!c.collected && player.x < c.x + c.width && player.x + player.width > c.x &&
            player.y < c.y + c.height && player.y + player.height > c.y) {
            c.collected = true;
            marioScore += 10;
            updateUI();
        }
    });

    questionBlocks.forEach(b => {
        if (b.active && player.x < b.x + b.width && player.x + player.width > b.x &&
            player.y < b.y + b.height && player.y + player.height > b.y) {
            if (player.dy < 0 && player.y - player.dy >= b.y + b.height) {
                player.y = b.y + b.height;
                player.dy = 1;
                if (b.type === 'mushroom') {
                    powerups.push({ x: b.x, y: b.y - 40, width: 30, height: 30, dx: 2, dy: 0 });
                    b.active = false;
                } else {
                    showMarioQuestion(b);
                }
            }
        }
    });

    drawMario();
    requestAnimationFrame(updateMario);
}

function drawMario() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraX, 0);

    // Parallax Clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    for(let i=0; i<30; i++) {
        let cx = (i * 500) - (cameraX * 0.3); // Moves slower
        ctx.beginPath();
        ctx.arc(cx + 100, 80, 20, 0, Math.PI*2);
        ctx.arc(cx + 120, 80, 25, 0, Math.PI*2);
        ctx.arc(cx + 140, 80, 20, 0, Math.PI*2);
        ctx.fill();
    }

    // Platforms
    ctx.fillStyle = '#2ecc71';
    platforms.forEach(p => {
        if (p.x + p.width > cameraX && p.x < cameraX + 800) {
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(p.x, p.y, p.width, 5); // Grass top
            ctx.fillStyle = '#2ecc71';
        }
    });

    // Improved Enemies (Goombas)
    enemies.forEach(e => {
        if (e.x + e.width > cameraX && e.x < cameraX + 800) {
            ctx.fillStyle = '#964b00';
            ctx.beginPath();
            ctx.ellipse(e.x + e.width/2, e.y + e.height/2, e.width/2, e.height/2, 0, 0, Math.PI*2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(e.x + 8, e.y + 10, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(e.x + 22, e.y + 10, 4, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath(); ctx.arc(e.x + 8, e.y + 10, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(e.x + 22, e.y + 10, 2, 0, Math.PI*2); ctx.fill();
        }
    });

    // Fireballs
    ctx.fillStyle = '#ff4500';
    fireballs.forEach(f => {
        ctx.beginPath(); ctx.arc(f.x + f.width/2, f.y + f.height/2, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(f.x + f.width/2, f.y + f.height/2, 3, 0, Math.PI*2); ctx.fill();
    });

    // Powerups (Mushroom)
    ctx.fillStyle = '#e67e22';
    powerups.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x + p.width/2, p.y + p.height/2, 15, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(p.x + p.width/2, p.y + p.height/2 - 5, 5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#e67e22';
    });

    // Spikes, Coins, Blocks
    ctx.fillStyle = '#7f8c8d';
    spikes.forEach(s => {
        if (s.x + s.width > cameraX && s.x < cameraX + 800) {
            ctx.beginPath();
            ctx.moveTo(s.x, s.y + s.height); ctx.lineTo(s.x + s.width/4, s.y); ctx.lineTo(s.x + s.width/2, s.y + s.height);
            ctx.lineTo(s.x + 3*s.width/4, s.y); ctx.lineTo(s.x + s.width, s.y + s.height); ctx.fill();
        }
    });

    ctx.fillStyle = '#f1c40f';
    coins.forEach(c => {
        if (!c.collected && c.x + c.width > cameraX && c.x < cameraX + 800) {
            ctx.beginPath(); ctx.arc(c.x + c.width/2, c.y + c.height/2, 8, 0, Math.PI*2); ctx.fill();
        }
    });

    questionBlocks.forEach(b => {
        if (b.active && b.x + b.width > cameraX && b.x < cameraX + 800) {
            ctx.fillStyle = b.type === 'mushroom' ? '#e67e22' : b.color;
            ctx.fillRect(b.x, b.y, b.width, b.height);
            ctx.fillStyle = '#000'; ctx.font = '20px Arial'; ctx.fillText('?', b.x + 15, b.y + 25);
        }
    });

    // Mario (Dynamic Height)
    const px = player.x;
    const py = player.y;
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath(); ctx.arc(px + player.width/2, py + 10, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = isBig ? '#f1c40f' : '#e74c3c'; 
    ctx.fillRect(px + player.width/2 - 5, py + 20, 10, player.height - 20);
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(px + player.width/2 - 5, py + 25); ctx.lineTo(px, py + 35);
    ctx.moveTo(px + player.width/2 + 5, py + 25); ctx.lineTo(px + player.width, py + 35); ctx.stroke();
    ctx.strokeStyle = '#2980b9'; ctx.beginPath();
    ctx.moveTo(px + player.width/2 - 3, py + player.height - 10); ctx.lineTo(px + 5, py + player.height);
    ctx.moveTo(px + player.width/2 + 3, py + player.height - 10); ctx.lineTo(px + player.width - 5, py + player.height); ctx.stroke();

    ctx.restore();
}

async function showMarioQuestion(block) {
    activeBlock = block;
    marioGameRunning = false;
    
    const popup = document.getElementById('mario-question-popup');
    const word = document.getElementById('mario-word');
    const input = document.getElementById('mario-input');
    
    word.innerText = "Savol tayyorlanmoqda...";
    popup.style.display = 'block';
    input.value = "";
    input.focus();

    try {
        const data = await getGameData('mine');
        activeBlock.answer = data.a.toLowerCase().trim();
        word.innerText = data.q;
    } catch (e) {
        word.innerText = "Xato! Qaytadan urinib ko'ring.";
    }
}

function checkMarioAnswer() {
    const input = document.getElementById('mario-input').value.toLowerCase().trim();
    if (input === activeBlock.answer) {
        marioScore += 50;
        document.getElementById('mario-score').innerText = marioScore;
        activeBlock.active = false;
        alert("To'g'ri! 🍄 Ball: +50");
    } else {
        alert("Xato! ❌");
    }
    
    document.getElementById('mario-question-popup').style.display = 'none';
    marioGameRunning = true;
    requestAnimationFrame(updateMario);
}
