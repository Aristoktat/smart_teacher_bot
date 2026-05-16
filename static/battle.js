const battleCanvas = document.getElementById('battleCanvas');
const bCtx = battleCanvas.getContext('2d');
let playerHP = 100;
let enemyHP = 100;
let battleWins = 0;
let battleActive = false;
let battleQuestion = null;

let pX = 200;
let eX = 600;
let pState = 'idle'; // 'idle', 'forward', 'punch', 'back'
let eState = 'idle';
let punchTimer = 0;

function initBattle() {
    hideAll();
    document.getElementById('battle-area').style.display = 'block';
    battleCanvas.width = 800;
    battleCanvas.height = 300;
    playerHP = 100;
    enemyHP = 100;
    pX = 200;
    eX = 600;
    pState = 'idle';
    eState = 'idle';
    battleActive = true;
    updateBattleUI();
    newBattleQuestion();

    // Add Enter key listener for the input field
    const battleInput = document.getElementById('battle-input');
    battleInput.onkeydown = function(e) {
        if (e.key === 'Enter') {
            checkBattleAnswer();
        }
    };

    requestAnimationFrame(battleLoop);
}

function updateBattleUI() {
    document.getElementById('player-hp').style.width = playerHP + '%';
    document.getElementById('enemy-hp').style.width = enemyHP + '%';
    document.getElementById('battle-wins').innerText = battleWins;
}

async function newBattleQuestion() {
    try {
        const data = await getGameData('mine');
        battleQuestion = { q: data.q, a: data.a.toLowerCase().trim() };
        document.getElementById('battle-q').innerText = battleQuestion.q;
        document.getElementById('battle-input').value = "";
        document.getElementById('battle-input').focus();
    } catch (e) {
        console.error(e);
    }
}

let pAttackType = 0; // 0: straight, 1: jump, 2: uppercut
let eAttackType = 0;

function checkBattleAnswer() {
    if (!battleActive || (pState !== 'idle' && pState !== 'controllable') || eState !== 'idle') return;
    const inputEl = document.getElementById('battle-input');
    const val = inputEl.value.toLowerCase().trim();
    if (val === "") return; 

    if (val === battleQuestion.a) {
        document.getElementById('battle-q').innerText = "To'g'ri! Oldiga borib 'Space' tugmasi bilan uring!";
        pState = 'controllable';
        inputEl.blur(); // Focusni olib tashlash, klaviatura boshqaruvi uchun
    } else {
        document.getElementById('battle-q').innerText = "Xato! To'g'ri javob: " + battleQuestion.a;
        eAttackType = Math.floor(Math.random() * 3); 
        eState = 'forward';
    }
    
    inputEl.value = "";
}

function applyDamage(target) {
    if (target === 'enemy') {
        enemyHP -= 25;
        if (enemyHP <= 0) {
            enemyHP = 0;
            battleWins++;
            setTimeout(() => { alert("G'alaba! 🏆 Dushman mag'lub bo'ldi."); resetBattle(); }, 1000);
        } else {
            newBattleQuestion(); 
        }
    } else {
        playerHP -= 20;
        if (playerHP <= 0) {
            playerHP = 0;
            setTimeout(() => { alert("Mag'lubiyat... 💀 Yana urinib ko'ring."); initBattle(); }, 1000);
        } else {
            newBattleQuestion(); 
        }
    }
    updateBattleUI();
}

// Global keys tracking for battle (moved to script.js)

let lastPunchTime = 0;

function resetBattle() {
    enemyHP = 100;
    playerHP = 100;
    pX = 200;
    eX = 600;
    pState = 'idle';
    eState = 'idle';
    updateBattleUI();
    newBattleQuestion();
}

function battleLoop() {
    if (document.getElementById('battle-area').style.display === 'none') return;
    
    bCtx.clearRect(0, 0, battleCanvas.width, battleCanvas.height);
    
    // Draw Boxing Ring Background
    bCtx.fillStyle = "#2c3e50"; // Dark wall
    bCtx.fillRect(0, 0, 800, 200);
    
    // Ropes
    bCtx.strokeStyle = "#c0392b";
    bCtx.lineWidth = 4;
    bCtx.beginPath(); bCtx.moveTo(0, 100); bCtx.lineTo(800, 100); bCtx.stroke();
    bCtx.strokeStyle = "#eee";
    bCtx.beginPath(); bCtx.moveTo(0, 150); bCtx.lineTo(800, 150); bCtx.stroke();

    // Ring Floor
    bCtx.fillStyle = "#34495e";
    bCtx.beginPath();
    bCtx.moveTo(0, 200);
    bCtx.lineTo(800, 200);
    bCtx.lineTo(800, 300);
    bCtx.lineTo(0, 300);
    bCtx.fill();

    // Floor lines
    bCtx.strokeStyle = "#2c3e50";
    bCtx.lineWidth = 2;
    for(let i=0; i<800; i+=50) {
        bCtx.beginPath(); bCtx.moveTo(i, 200); bCtx.lineTo(i - 20, 300); bCtx.stroke();
    }

    // --- PLAYER ANIMATION STATE MACHINE ---
    if (pState === 'controllable') {
        // Yurish (A / D yoki Strelkalar)
        if (battleKeys['ArrowLeft'] || battleKeys['KeyA']) pX -= 8;
        if (battleKeys['ArrowRight'] || battleKeys['KeyD']) pX += 8;
        
        if (pX < 50) pX = 50;
        if (pX > eX - 50) pX = eX - 50; // Dushmanning ichiga kirib ketmaslik

        // Urish (Space)
        if (battleKeys['Space'] || battleKeys['KeyF']) {
            if (Date.now() - lastPunchTime > 500) {
                lastPunchTime = Date.now();
                pAttackType = Math.floor(Math.random() * 3);
                
                // Masofani tekshirish (150px gacha bo'lsa tegadi)
                if (Math.abs(eX - pX) < 150) {
                    pState = 'punch';
                    punchTimer = 20;
                    applyDamage('enemy'); 
                } else {
                    // Uzoqda bo'lsa havodan uradi (tegmaydi)
                    pState = 'whiff';
                    punchTimer = 15;
                }
            }
        }
    } else if (pState === 'whiff') {
        punchTimer--;
        if (punchTimer <= 0) pState = 'controllable'; // Yana boshqaruvga qaytadi
    } else if (pState === 'forward') {
        pX += 15; // Oldingi avtomatik harakat (agar kerak bo'lsa)
        if (pX >= 450) {
            pX = 450;
            pState = 'punch';
            punchTimer = 20; 
            applyDamage('enemy'); 
        }
    } else if (pState === 'punch') {
        punchTimer--;
        if (punchTimer <= 0) pState = 'back';
    } else if (pState === 'back') {
        pX -= 10; 
        if (pX <= 200) {
            pX = 200;
            pState = 'idle'; // Dastlabki holatga qaytadi
        }
    }

    // --- ENEMY ANIMATION STATE MACHINE ---
    if (eState === 'forward') {
        eX -= 15;
        if (eX <= 350) {
            eX = 350;
            eState = 'punch';
            punchTimer = 20;
            applyDamage('player');
        }
    } else if (eState === 'punch') {
        punchTimer--;
        if (punchTimer <= 0) eState = 'back';
    } else if (eState === 'back') {
        eX += 10;
        if (eX >= 600) {
            eX = 600;
            eState = 'idle';
        }
    }

    // Draw Player (Blue)
    drawFighter(pX, 150, '#3498db', pState, false, pAttackType);
    
    // Draw Enemy (Red)
    drawFighter(eX, 150, '#e74c3c', eState, true, eAttackType);

    requestAnimationFrame(battleLoop);
}

function drawFighter(x, y, color, state, flip, attackType = 0) {
    bCtx.save();
    
    if (flip) {
        bCtx.translate(x, y);
        bCtx.scale(-1, 1);
        bCtx.translate(-x, -y);
    }

    let isPunching = (state === 'punch' || state === 'whiff');
    
    // Dynamic height based on attack type
    if (isPunching) {
        if (attackType === 1) y -= 40; // Jump up
        if (attackType === 2) y += 20; // Crouch down
    }

    // Head
    bCtx.fillStyle = '#ffdbac';
    bCtx.beginPath(); bCtx.arc(x, y - 50, 18, 0, Math.PI*2); bCtx.fill();
    
    // Eyes (angry)
    bCtx.fillStyle = 'black';
    bCtx.beginPath(); bCtx.arc(x + 5, y - 55, 3, 0, Math.PI*2); bCtx.fill();
    bCtx.lineWidth = 2;
    bCtx.beginPath(); bCtx.moveTo(x + 2, y - 60); bCtx.lineTo(x + 10, y - 57); bCtx.stroke();

    // Body (Torso)
    bCtx.strokeStyle = color;
    bCtx.lineWidth = 15;
    bCtx.lineCap = 'round';
    bCtx.beginPath();
    
    if (isPunching && attackType === 2) {
        // Crouched body (leaning forward)
        bCtx.moveTo(x - 10, y - 20);
        bCtx.lineTo(x + 10, y + 20);
    } else {
        bCtx.moveTo(x, y - 30);
        bCtx.lineTo(x, y + 20);
    }
    bCtx.stroke();

    // Legs
    bCtx.lineWidth = 10;
    let legOffset = 0;
    if (state === 'forward' || state === 'back') {
        legOffset = Math.sin(Date.now() / 50) * 15; 
    }
    
    if (isPunching && attackType === 1) {
        // Jump kick/punch - legs tucked
        bCtx.beginPath(); bCtx.moveTo(x, y + 15); bCtx.lineTo(x - 20, y + 40); bCtx.stroke();
        bCtx.beginPath(); bCtx.moveTo(x, y + 15); bCtx.lineTo(x + 30, y + 30); bCtx.stroke();
    } else if (isPunching && attackType === 2) {
        // Crouched legs
        bCtx.beginPath(); bCtx.moveTo(x + 10, y + 15); bCtx.lineTo(x - 10, y + 40); bCtx.lineTo(x - 15, y + 60); bCtx.stroke();
        bCtx.beginPath(); bCtx.moveTo(x + 10, y + 15); bCtx.lineTo(x + 20, y + 40); bCtx.lineTo(x + 20, y + 60); bCtx.stroke();
    } else {
        // Normal legs
        bCtx.beginPath(); bCtx.moveTo(x, y + 15); bCtx.lineTo(x - 15 - legOffset, y + 60); bCtx.stroke();
        bCtx.beginPath(); bCtx.moveTo(x, y + 15); bCtx.lineTo(x + 20 + legOffset, y + 60); bCtx.stroke();
    }

    // Arms and Gloves
    bCtx.lineWidth = 8;
    
    if (isPunching) {
        if (attackType === 0) {
            // Straight Punch
            bCtx.beginPath(); bCtx.moveTo(x, y - 20); bCtx.lineTo(x - 20, y); bCtx.stroke();
            bCtx.beginPath(); bCtx.moveTo(x, y - 20); bCtx.lineTo(x + 60, y - 20); bCtx.stroke();
            bCtx.fillStyle = '#c0392b'; bCtx.beginPath(); bCtx.arc(x + 65, y - 20, 15, 0, Math.PI*2); bCtx.fill();
        } else if (attackType === 1) {
            // Jump Superman Punch (angled down)
            bCtx.beginPath(); bCtx.moveTo(x, y - 20); bCtx.lineTo(x - 20, y - 40); bCtx.stroke();
            bCtx.beginPath(); bCtx.moveTo(x, y - 20); bCtx.lineTo(x + 50, y + 10); bCtx.stroke();
            bCtx.fillStyle = '#c0392b'; bCtx.beginPath(); bCtx.arc(x + 55, y + 15, 15, 0, Math.PI*2); bCtx.fill();
        } else if (attackType === 2) {
            // Uppercut from crouch
            bCtx.beginPath(); bCtx.moveTo(x, y - 10); bCtx.lineTo(x - 20, y + 10); bCtx.stroke();
            bCtx.beginPath(); bCtx.moveTo(x, y - 10); bCtx.lineTo(x + 40, y - 40); bCtx.stroke();
            bCtx.fillStyle = '#c0392b'; bCtx.beginPath(); bCtx.arc(x + 45, y - 45, 15, 0, Math.PI*2); bCtx.fill();
        }
    } else {
        // Guard position
        bCtx.beginPath(); bCtx.moveTo(x, y - 20); bCtx.lineTo(x + 15, y); bCtx.lineTo(x + 20, y - 25); bCtx.stroke(); 
        bCtx.beginPath(); bCtx.moveTo(x, y - 20); bCtx.lineTo(x - 10, y + 10); bCtx.lineTo(x + 5, y - 15); bCtx.stroke(); 

        bCtx.fillStyle = '#c0392b';
        bCtx.beginPath(); bCtx.arc(x + 20, y - 25, 12, 0, Math.PI*2); bCtx.fill(); 
        bCtx.beginPath(); bCtx.arc(x + 5, y - 15, 12, 0, Math.PI*2); bCtx.fill(); 
    }

    bCtx.restore();
}
