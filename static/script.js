const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
let currentMode = "";
let score = 0;
let currentData = {};
const keys = {};
const battleKeys = {};

const SYSTEM_PROMPT = "Rol: Sen maktab o'quvchilari uchun ingliz tilini oson va qiziqarli o'rgatuvchi yordamchisan. Javoblaring qisqa, sodda bo'lsin.";

async function callGemini(promptText, isJson = false) {
    let apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        apiKey = prompt("Google Gemini API kalitingizni kiriting:");
        if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
        else return; 
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const body = { contents: [{ parts: [{ text: SYSTEM_PROMPT + "\n\n" + promptText }] }] };

    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (!res.ok) {
        if(res.status === 400 || res.status === 403) {
            localStorage.removeItem('gemini_api_key');
            alert("API kaliti xato yoki yaroqsiz! Sahifani yangilab qaytadan kiriting.");
        }
        throw new Error("API Error");
    }

    const data = await res.json();
    let text = data.candidates[0].content.parts[0].text;
    
    if (isJson) {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(text);
    }
    return text;
}

const aiPrompts = {
    "game": "Generate a random English word and its Uzbek translation for a scramble game. Return ONLY JSON: {\"q\": \"WORD\", \"h\": \"UZBEK_HINT\", \"a\": \"WORD\"}",
    "quiz": "Generate a true or false fact about English grammar. Return ONLY JSON: {\"q\": \"FACT\", \"a\": \"true/false\"}",
    "translate": "Generate an English word and 3 Uzbek options (one correct). Return ONLY JSON: {\"q\": \"WORD\", \"a\": \"correct\", \"o\": [\"opt1\", \"opt2\", \"opt3\"]}",
    "emoji": "Generate a random emoji and its English name. Return ONLY JSON: {\"q\": \"EMOJI\", \"a\": \"name\"}",
    "mine": "Generate a RANDOM and UNIQUE English-to-Uzbek translation question. Return ONLY JSON: {\"q\": \"UZBEK_WORD\", \"a\": \"ENGLISH_WORD\"}"
};

async function getGameData(type) {
    try {
        const p = aiPrompts[type] || aiPrompts["game"];
        return await callGemini(p + " Random Seed: " + Math.random(), true);
    } catch(e) {
        console.error(e);
        const fallbacks = [{"q": "Quyosh", "a": "sun"}, {"q": "Suv", "a": "water"}, {"q": "Kitob", "a": "book"}];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

// --- UTILS ---
function hideAll() {
    document.querySelectorAll('.game-area').forEach(el => el.style.display = 'none');
    document.querySelector('.chat-container').style.display = 'none';
    document.querySelector('.prompt-grid').style.display = 'none';
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) mobileControls.style.display = 'none';
}
function showMain() {
    hideAll();
    document.querySelector('.chat-container').style.display = 'flex';
    document.querySelector('.prompt-grid').style.display = 'grid';
    if (typeof marioGameRunning !== 'undefined') marioGameRunning = false;
    if (typeof shooterGameRunning !== 'undefined') shooterGameRunning = false;
    if (typeof battleActive !== 'undefined') battleActive = false;
}

function checkMobileControls() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const mobileControls = document.getElementById('mobile-controls');
    if (isTouch && mobileControls) {
        mobileControls.style.display = 'flex';
    }
}

// --- GAMES DATA (Dynamic now) ---
const gameTypes = ['game', 'quiz', 'translate', 'emoji', 'odd', 'builder', 'hangman'];

function sendPrompt(type) {
    currentMode = type;
    if (type === 'minecraft') { toggleMinecraft(true); return; }
    if (type === 'mario') { initMario(); checkMobileControls(); return; }
    if (type === 'shooter') { initShooter(); checkMobileControls(); return; }
    if (type === 'battle') { initBattle(); checkMobileControls(); return; }
    if (gameTypes.includes(type)) {
        hideAll();
        document.getElementById('game-container').style.display = 'block';
        document.getElementById('game-title').innerText = type.toUpperCase();
        nextRound();
        return;
    }
    sendMessage(type === 'vocabulary' ? "Learn words" : "Explain grammar");
}

async function nextRound() {
    const display = document.getElementById('display-area');
    const options = document.getElementById('options-area');
    const input = document.getElementById('main-input');
    
    display.innerText = "Yuklanmoqda...";
    options.innerHTML = "";
    input.value = "";
    input.style.display = "block";

    try {
        currentData = await getGameData(currentMode);
        
        if (currentMode === 'game') {
            display.innerText = currentData.q.split('').sort(()=>.5-Math.random()).join('');
        } else if (currentMode === 'translate') {
            display.innerText = currentData.q;
            input.style.display = "none";
            currentData.o.forEach(opt => {
                const btn = document.createElement('button');
                btn.innerText = opt; btn.className="quiz-btn";
                btn.onclick = () => { input.value = opt; checkAnswer(); };
                options.appendChild(btn);
            });
        } else {
            display.innerText = currentData.q;
        }
        
        document.getElementById('hint-area').innerText = currentData.h || "";
    } catch (e) {
        display.innerText = "Xatolik! Qaytadan urinib ko'ring.";
    }
}

function checkAnswer() {
    const val = document.getElementById('main-input').value.toLowerCase().trim();
    if (val === currentData.a.toLowerCase()) {
        score += 10; document.getElementById('main-score').innerText = score;
        alert("To'g'ri! 🎉"); nextRound();
    } else alert("Xato! ❌");
}

// --- MINECRAFT ---
function toggleMinecraft(s) { 
    if(s){ hideAll(); document.getElementById('minecraft-area').style.display='block'; initMine(); }
    else showMain();
}
let currentMineBlock = null;
const blockTypes = [
    { type: 'grass', points: 5, difficulty: 'easy' },
    { type: 'dirt', points: 3, difficulty: 'easy' },
    { type: 'stone', points: 10, difficulty: 'medium' },
    { type: 'coal', points: 15, difficulty: 'medium' },
    { type: 'iron', points: 25, difficulty: 'hard' },
    { type: 'gold', points: 50, difficulty: 'hard' },
    { type: 'diamond', points: 100, difficulty: 'expert' }
];

function initMine() {
    const grid = document.getElementById('mine-grid'); 
    grid.innerHTML = "";
    document.getElementById('mine-question').style.display = 'none';
    
    // Create 15 random blocks
    for(let i=0; i<15; i++) {
        const config = blockTypes[Math.floor(Math.random() * blockTypes.length)];
        const b = document.createElement('div');
        b.className = `mine-block block-${config.type}`;
        b.dataset.points = config.points;
        b.dataset.type = config.type;
        
        b.onclick = () => startMining(b);
        grid.appendChild(b);
    }
}

async function startMining(block) {
    currentMineBlock = block;
    const qArea = document.getElementById('mine-question');
    const wordArea = document.getElementById('mine-word');
    const input = document.getElementById('mine-input');
    
    wordArea.innerText = "Yuklanmoqda...";
    qArea.style.display = 'block';
    input.value = "";
    input.focus();

    try {
        const data = await getGameData('mine');
        currentMineBlock.dataset.answer = data.a;
        wordArea.innerText = data.q;
    } catch (e) {
        wordArea.innerText = "AI xatosi, qaytadan bosing.";
    }
}

function checkMine() {
    const input = document.getElementById('mine-input').value.toLowerCase().trim();
    const answer = currentMineBlock.dataset.answer;
    
    if (input === answer) {
        score += parseInt(currentMineBlock.dataset.points);
        document.getElementById('main-score').innerText = score;
        
        // Add "mined" effect
        currentMineBlock.style.opacity = "0";
        currentMineBlock.style.transform = "scale(0)";
        setTimeout(() => {
            currentMineBlock.style.visibility = "hidden";
        }, 300);
        
        document.getElementById('mine-question').style.display = 'none';
        alert("Blok qazib olindi! ⛏️ +" + currentMineBlock.dataset.points + " ball!");
    } else {
        alert("Xato! Blok qattiqlik qildi. ❌");
    }
}

async function sendMessage() {
    const m = userInput.value; if(!m) return;
    appendMessage(m, 'user'); userInput.value = '';
    
    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai';
    loadingDiv.innerText = "...";
    chatBox.appendChild(loadingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await callGemini(m, false);
        chatBox.removeChild(loadingDiv);
        appendMessage(response, 'ai');
    } catch(e) {
        chatBox.removeChild(loadingDiv);
        appendMessage("Tarmoqda xatolik yoki kalit kiritilmadi.", 'ai');
    }
}
function appendMessage(t, s) {
    const d = document.createElement('div'); d.className=`message ${s}`; d.innerText=t;
    chatBox.appendChild(d); chatBox.scrollTop = chatBox.scrollHeight;
}
function handleKeyPress(e) { 
    if(e.key==='Enter') {
        if (document.getElementById('minecraft-area').style.display === 'block') {
            checkMine();
        } else if (document.getElementById('mario-area').style.display === 'block') {
            checkMarioAnswer();
        } else {
            sendMessage();
        }
    }
}

// --- INITIALIZATION ---
function initApp() {
    let userName = localStorage.getItem('user_name');
    if (!userName) {
        userName = prompt("Ismingizni kiriting:");
        if (!userName) userName = "O'quvchi";
        localStorage.setItem('user_name', userName);
    }
    document.getElementById('user-display').innerHTML = `Salom, <strong>${userName}</strong>! | <a href="#" onclick="resetUser()">Chiqish</a>`;
    
    window.addEventListener('keydown', (e) => { 
        keys[e.code] = true; 
        battleKeys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => { 
        keys[e.code] = false; 
        battleKeys[e.code] = false;
    });

    setupMobileControls();
}

function resetUser() {
    localStorage.removeItem('user_name');
    localStorage.removeItem('gemini_api_key');
    location.reload();
}

window.addEventListener('DOMContentLoaded', initApp);
