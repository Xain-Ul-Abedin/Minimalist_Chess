const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const flipBtn = document.getElementById('flipBtn');
const hintBtn = document.getElementById('hintBtn');
const resignBtn = document.getElementById('resignBtn');
const drawBtn = document.getElementById('drawBtn');
const undoBtn = document.getElementById('undoBtn');
const whiteTimerEl = document.getElementById('whiteTimer');
const blackTimerEl = document.getElementById('blackTimer');
const whiteCapturedEl = document.getElementById('whiteCaptured');
const blackCapturedEl = document.getElementById('blackCaptured');
const historyListEl = document.getElementById('historyList');
const evalBarEl = document.getElementById('evalBar');
const evalScoreEl = document.getElementById('evalScore');
const thinkingSpinner = document.getElementById('thinkingSpinner');
const themeSelect = document.getElementById('themeSelect');
const timeControlSelect = document.getElementById('timeControlSelect');
const customTimePanel = document.getElementById('customTimePanel');
const soundSelect = document.getElementById('soundSelect');
const historyBadge = document.getElementById('historyBadge');

// Custom modals elements
const gameOverModal = document.getElementById('gameOverModal');
const modalWinnerTitle = document.getElementById('modalWinnerTitle');
const modalWinnerDesc = document.getElementById('modalWinnerDesc');
const statMoves = document.getElementById('statMoves');
const statTime = document.getElementById('statTime');
const modalNewGameBtn = document.getElementById('modalNewGameBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');

const importPgnModal = document.getElementById('importPgnModal');
const pgnInputText = document.getElementById('pgnInputText');
const pgnSubmitBtn = document.getElementById('pgnSubmitBtn');
const pgnCancelBtn = document.getElementById('pgnCancelBtn');

const gameModeSelect = document.getElementById('gameMode');
const aiDifficultySelect = document.getElementById('aiDifficulty');

// Main Menu elements
const modeLocalBtn = document.getElementById('modeLocalBtn');
const modeAiBtn = document.getElementById('modeAiBtn');
const menuAiDiffSection = document.getElementById('menuAiDiffSection');
const menuAiDifficulty = document.getElementById('menuAiDifficulty');
const menuThemeSelect = document.getElementById('menuThemeSelect');
const menuCustomTimePanel = document.getElementById('menuCustomTimePanel');
const menuCustomMin = document.getElementById('menuCustomMin');
const menuCustomInc = document.getElementById('menuCustomInc');
const startGameBtn = document.getElementById('startGameBtn');
const gameLayout = document.getElementById('gameLayout');
const mainMenu = document.getElementById('mainMenu');
const menuBtn = document.getElementById('menuBtn');

// Play vs Teach Tabs
const tabPlayBtn = document.getElementById('tabPlayBtn');
const tabTeachBtn = document.getElementById('tabTeachBtn');
const panelPlaySettings = document.getElementById('panelPlaySettings');
const panelTeachSettings = document.getElementById('panelTeachSettings');
const historyView = document.getElementById('historyView');
const teachView = document.getElementById('teachView');
const teachPanel = document.getElementById('teachPanel');

// Game State variables
let game = new Chess();
let boardFlipped = false;
let selectedSquare = null;

let INITIAL_TIME_SECONDS = 300;
let whiteTime = INITIAL_TIME_SECONDS;
let blackTime = INITIAL_TIME_SECONDS;
let incrementSeconds = 0;
let activeColor = 'w';
let timerStopped = true;
let lastTick = null;
let timerHandle = null;

// History navigation state
let fenHistory = [game.fen()];
let historyIndex = 0;

// Promotion state
let pendingPromotion = null;

// Hint state
let hintMove = null;
let awaitingHint = false;

// AI Engine State
let engine = null;
let engineReady = false;

// Teach Mode State
let teachModeActive = false;
let currentLessonKey = 'sicilian';
let currentLessonStep = 0;
let menuMode = 'play'; // 'play' or 'teach'

// Audio Context for sound effects
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// --- Theme-Based Dynamic Pieces ---
const themeIcons = {
    espresso: {
        'p': 'fa-chess-pawn', 'n': 'fa-chess-knight', 'b': 'fa-chess-bishop',
        'r': 'fa-chess-rook', 'q': 'fa-chess-queen', 'k': 'fa-chess-king'
    },
    forest: {
        'p': 'fa-seedling', 'n': 'fa-horse', 'b': 'fa-frog',
        'r': 'fa-mountain', 'q': 'fa-dove', 'k': 'fa-paw' // Paw represents woodland Lion
    },
    midnight: {
        'p': 'fa-star', 'n': 'fa-meteor', 'b': 'fa-user-astronaut',
        'r': 'fa-rocket', 'q': 'fa-moon', 'k': 'fa-sun'
    },
    autumn: {
        'p': 'fa-seedling', 'n': 'fa-horse', 'b': 'fa-wind',
        'r': 'fa-wheat-awn', 'q': 'fa-apple-whole', 'k': 'fa-crown'
    },
    blossom: {
        'p': 'fa-clover', 'n': 'fa-horse', 'b': 'fa-wand-magic-sparkles',
        'r': 'fa-monument', 'q': 'fa-heart', 'k': 'fa-gem'
    }
};

function getPieceIcon(pieceKey) {
    const theme = document.body.getAttribute('data-theme') || 'espresso';
    const key = pieceKey.toLowerCase();
    const icons = themeIcons[theme] || themeIcons.espresso;
    return icons[key] || 'fa-chess-pawn';
}

// --- Teach Mode Opening Lessons Database ---
const openingLessons = {
    sicilian: {
        title: "Sicilian Defense",
        description: "Practice the Sicilian Defense, Black's most popular asymmetric response to 1.e4.",
        steps: [
            { prompt: "Advance your King's Pawn to e4.", move: "e4", color: "w", from: "e2", to: "e4" },
            { prompt: "Black challenges the center with Pawn to c5. Do it.", move: "c5", color: "b", from: "c7", to: "c5" },
            { prompt: "Develop your King's Knight to f3.", move: "Nf3", color: "w", from: "g1", to: "f3" }
        ]
    },
    ruy: {
        title: "Ruy Lopez (Spanish Opening)",
        description: "Practice the Ruy Lopez, a classical opening targeting the e5-pawn pressure.",
        steps: [
            { prompt: "Advance your King's Pawn to e4.", move: "e4", color: "w", from: "e2", to: "e4" },
            { prompt: "Black responds symmetrically with Pawn to e5. Do it.", move: "e5", color: "b", from: "e7", to: "e5" },
            { prompt: "Develop your Knight to f3 to attack e5.", move: "Nf3", color: "w", from: "g1", to: "f3" },
            { prompt: "Black develops Knight to c6 to defend e5. Do it.", move: "Nc6", color: "b", from: "b8", to: "c6" },
            { prompt: "Develop your Bishop to b5 to press the knight.", move: "Bb5", color: "w", from: "f1", to: "b5" }
        ]
    },
    queens: {
        title: "Queen's Gambit",
        description: "Practice the Queen's Gambit, sacrificing a wing pawn for center dominance.",
        steps: [
            { prompt: "Advance your Queen's Pawn to d4.", move: "d4", color: "w", from: "d2", to: "d4" },
            { prompt: "Black matches with Pawn to d5. Do it.", move: "d5", color: "b", from: "d7", to: "d5" },
            { prompt: "Offer the wing pawn: Advance c-pawn to c4.", move: "c4", color: "w", from: "c2", to: "c4" }
        ]
    },
    scholars: {
        title: "Scholar's Mate Challenge",
        description: "Practice the 4-move checkmate sequence to understand early weaknesses.",
        steps: [
            { prompt: "Start with King's Pawn to e4.", move: "e4", color: "w", from: "e2", to: "e4" },
            { prompt: "Black responds with Pawn to e5. Do it.", move: "e5", color: "b", from: "e7", to: "e5" },
            { prompt: "Bring your Queen out early to h5.", move: "Qh5", color: "w", from: "d1", to: "h5" },
            { prompt: "Black defends with Knight to c6. Do it.", move: "Nc6", color: "b", from: "b8", to: "c6" },
            { prompt: "Position your Bishop on c4, aiming at f7.", move: "Bc4", color: "w", from: "f1", to: "c4" },
            { prompt: "Black attacks your queen with Knight to f6. Do it.", move: "Nf6", color: "b", from: "g8", to: "f6" },
            { prompt: "Deliver checkmate: Capture f7 pawn with your Queen!", move: "Qxf7#", color: "w", from: "h5", to: "f7" }
        ]
    }
};

// --- Sound Synthesizers ---
function playWoodSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'move') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, audioCtx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    } else if (type === 'capture') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(90, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'check') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.04);
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.04);

        setTimeout(() => {
            const osc2 = audioCtx.createOscillator();
            const gainNode2 = audioCtx.createGain();
            osc2.connect(gainNode2);
            gainNode2.connect(audioCtx.destination);
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(190, audioCtx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(130, audioCtx.currentTime + 0.04);
            gainNode2.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gainNode2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.04);
        }, 65);
    }
}

function playSynthSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(329.63, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(440.00, audioCtx.currentTime + 0.1); 
        gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'capture') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
        osc.frequency.setValueAtTime(392.00, audioCtx.currentTime + 0.06); 
        gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    } else if (type === 'check') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.08); 
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.16); 
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.24);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.24);
    }
}

function playSound(type) {
    const mode = soundSelect.value;
    if (mode === 'mute') return;
    if (mode === 'wood') {
        playWoodSound(type);
    } else if (mode === 'synth') {
        playSynthSound(type);
    }
}

// --- Confetti Engine ---
let confettiActive = false;
let confettiParticles = [];
let confettiAnimationFrame = null;

function startConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    confettiActive = true;
    confettiParticles = [];
    
    for (let i = 0; i < 100; i++) {
        confettiParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 6 + 4,
            d: Math.random() * canvas.height,
            color: `hsl(${Math.random() * 360}, 75%, 60%)`,
            tilt: Math.random() * 10 - 5,
            tiltAngleIncremental: Math.random() * 0.07 + 0.02,
            tiltAngle: 0
        });
    }

    function draw() {
        if (!confettiActive) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let remaining = 0;
        confettiParticles.forEach((p) => {
            p.tiltAngle += p.tiltAngleIncremental;
            p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
            p.x += Math.sin(p.tiltAngle);
            p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 5;

            if (p.y <= canvas.height) {
                remaining++;
            }

            ctx.beginPath();
            ctx.lineWidth = p.r;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
            ctx.stroke();
        });

        if (remaining > 0 && confettiActive) {
            confettiAnimationFrame = requestAnimationFrame(draw);
        } else {
            confettiActive = false;
        }
    }

    if (confettiAnimationFrame) cancelAnimationFrame(confettiAnimationFrame);
    draw();
}

function stopConfetti() {
    confettiActive = false;
    if (confettiAnimationFrame) {
        cancelAnimationFrame(confettiAnimationFrame);
        confettiAnimationFrame = null;
    }
}

// --- Engine Initialization (Stockfish) ---
function initEngine() {
    try {
        const stockfishUrl = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
        fetch(stockfishUrl)
            .then(r => r.text())
            .then(text => {
                const blob = new Blob([text], {type: 'application/javascript'});
                engine = new Worker(URL.createObjectURL(blob));
                
                engine.onmessage = function(event) {
                    const line = event.data;
                    
                    // Handle Engine Move or Hint
                    if (line.includes('bestmove')) {
                        thinkingSpinner.classList.add('hidden');
                        const move = line.split(' ')[1];
                        
                        if (awaitingHint) {
                            awaitingHint = false;
                            if (move && move !== '(none)') {
                                hintMove = {
                                    from: move.substring(0, 2),
                                    to: move.substring(2, 4)
                                };
                                renderBoard();
                            }
                        } else {
                            if (move && move !== '(none)' && game.turn() === 'b' && gameModeSelect.value === 'ai' && !teachModeActive) {
                                const moveObj = {
                                    from: move.substring(0, 2),
                                    to: move.substring(2, 4),
                                    promotion: move.length > 4 ? move.charAt(4) : undefined
                                };
                                const res = game.move(moveObj);
                                if (res) {
                                    playSound(res.captured ? 'capture' : 'move');
                                    if (game.in_check() || game.in_checkmate()) {
                                        playSound('check');
                                    }
                                    applyIncrementAndSwitch();
                                    renderBoard();
                                }
                            }
                        }
                    }
                    
                    // Handle Evaluation
                    if (line.includes('score cp') && !teachModeActive) {
                        const match = line.match(/score cp (-?\d+)/);
                        if (match) {
                            let score = parseInt(match[1]) / 100;
                            if (game.turn() === 'b') score = -score;
                            updateEvalBar(score);
                            updateEvalScore(score, false);
                        }
                    } else if (line.includes('score mate') && !teachModeActive) {
                        const match = line.match(/score mate (-?\d+)/);
                        if (match) {
                            let mate = parseInt(match[1]);
                            if (game.turn() === 'b') mate = -mate;
                            updateEvalBar(mate > 0 ? 100 : -100);
                            updateEvalScore(mate, true);
                        }
                    }
                };
                
                engine.postMessage('uci');
                engineReady = true;
            });
    } catch(e) {
        console.error("Stockfish failed to load", e);
    }
}

initEngine();

function triggerAi() {
    if (teachModeActive) return; // Disable Stockfish in Teach Mode
    const isAi = gameModeSelect.value === 'ai';
    if (!engineReady || game.game_over()) return;
    
    if (isAi && game.turn() === 'b') {
        thinkingSpinner.classList.remove('hidden');
        const skill = aiDifficultySelect.value;
        engine.postMessage(`setoption name Skill Level value ${skill}`);
        engine.postMessage(`position fen ${game.fen()}`);
        engine.postMessage('go depth 10'); 
    } else {
        engine.postMessage(`position fen ${game.fen()}`);
        engine.postMessage('go depth 10');
    }
}

function updateEvalBar(score) {
    const cappedScore = Math.max(-5, Math.min(5, score));
    const percentage = 50 + (cappedScore * 10); 
    evalBarEl.style.height = `${percentage}%`;
}

function updateEvalScore(score, isMate) {
    if (isMate) {
        evalScoreEl.textContent = score > 0 ? `M${score}` : `-M${Math.abs(score)}`;
    } else {
        const formatted = score.toFixed(1);
        evalScoreEl.textContent = score > 0 ? `+${formatted}` : formatted;
    }
}

// --- Timer Logic ---
function formatTime(totalSeconds) {
    const minutes = Math.floor(Math.max(0, Math.floor(totalSeconds)) / 60);
    const seconds = Math.floor(Math.max(0, totalSeconds)) % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    whiteTimerEl.textContent = formatTime(whiteTime);
    blackTimerEl.textContent = formatTime(blackTime);
    
    const isReviewing = historyIndex < fenHistory.length - 1;
    whiteTimerEl.classList.toggle('active', activeColor === 'w' && !timerStopped && !isReviewing && !teachModeActive);
    blackTimerEl.classList.toggle('active', activeColor === 'b' && !timerStopped && !isReviewing && !teachModeActive);
}

function startTimer() {
    if (teachModeActive) return; // No timers in Teach Mode
    if (timerHandle) return;
    timerStopped = false;
    lastTick = performance.now();
    timerHandle = setInterval(() => {
        const now = performance.now();
        const deltaMs = now - lastTick;
        lastTick = now;
        const deltaSec = deltaMs / 1000;

        if (activeColor === 'w') {
            whiteTime -= deltaSec;
        } else {
            blackTime -= deltaSec;
        }

        updateTimerDisplay();

        if (whiteTime <= 0) {
            stopTimer();
            declareGameOver("Game Over", "Black wins on time!");
            return;
        }
        if (blackTime <= 0) {
            stopTimer();
            declareGameOver("Game Over", "White wins on time!");
            return;
        }
    }, 100);
}

function stopTimer() {
    timerStopped = true;
    if (timerHandle) {
        clearInterval(timerHandle);
        timerHandle = null;
    }
    updateTimerDisplay();
}

function resetTimers() {
    stopTimer();
    const val = timeControlSelect.value;
    if (val !== 'custom') {
        parseTimeSetting(val);
    }
}

function parseTimeSetting(value) {
    if (value === 'custom') return;
    const parts = value.split('+');
    const secs = parseInt(parts[0]);
    const inc = parts[1] ? parseInt(parts[1]) : 0;
    
    whiteTime = secs;
    blackTime = secs;
    incrementSeconds = inc;
    
    updateTimerDisplay();
}

function switchActiveColor(moveColor) {
    activeColor = moveColor;
    if (!timerStopped) {
        updateTimerDisplay();
    }
}

function applyIncrementAndSwitch() {
    if (game.turn() === 'b') { 
        whiteTime += incrementSeconds;
    } else { 
        blackTime += incrementSeconds;
    }
    
    fenHistory.push(game.fen());
    historyIndex = fenHistory.length - 1;
    updateHistoryNav();
    
    switchActiveColor(game.turn());
}

// --- UI Captured Material ---
function updateCapturedPieces() {
    const isReviewing = historyIndex < fenHistory.length - 1;
    let scanGame = game;
    if (isReviewing) {
        scanGame = new Chess();
        const fullHistory = game.history();
        for (let i = 0; i < historyIndex; i++) {
            scanGame.move(fullHistory[i]);
        }
    }

    const history = scanGame.history({ verbose: true });
    let whiteCaptures = [];
    let blackCaptures = [];

    history.forEach(move => {
        if (move.captured) {
            if (move.color === 'w') {
                whiteCaptures.push(move.captured);
            } else {
                blackCaptures.push(move.captured.toUpperCase());
            }
        }
    });

    const renderPieces = (captures, el, isWhite) => {
        el.innerHTML = captures.map(p => {
            const icon = getPieceIcon(p);
            const colorClass = isWhite ? 'white-piece' : 'black-piece';
            return `<div class="captured-piece ${colorClass}"><i class="fa-solid ${icon}"></i></div>`;
        }).join('');
    };

    renderPieces(whiteCaptures, whiteCapturedEl, true);
    renderPieces(blackCaptures, blackCapturedEl, false);
}

// --- Move History List ---
function updateHistory() {
    if (teachModeActive) return; // History side panel is hidden in teach mode
    const history = game.history();
    historyListEl.innerHTML = '';
    
    for (let i = 0; i < history.length; i += 2) {
        const row = document.createElement('div');
        row.className = 'move-row';
        
        const num = document.createElement('div');
        num.className = 'move-num';
        num.textContent = `${Math.floor(i/2) + 1}.`;
        
        const wMove = document.createElement('div');
        wMove.className = 'move-w';
        wMove.textContent = history[i];
        wMove.style.cursor = 'pointer';
        wMove.addEventListener('click', () => {
            historyIndex = i + 1;
            renderBoard();
        });
        
        const bMove = document.createElement('div');
        bMove.className = 'move-b';
        bMove.textContent = history[i+1] || '';
        if (history[i+1]) {
            bMove.style.cursor = 'pointer';
            bMove.addEventListener('click', () => {
                historyIndex = i + 2;
                renderBoard();
            });
        }
        
        row.appendChild(num);
        row.appendChild(wMove);
        row.appendChild(bMove);
        historyListEl.appendChild(row);
    }
    
    const moveEls = historyListEl.querySelectorAll('.move-w, .move-b');
    if (historyIndex > 0 && moveEls[historyIndex - 1]) {
        const activeEl = moveEls[historyIndex - 1];
        activeEl.style.color = 'var(--primary-btn)';
        activeEl.style.fontWeight = '700';
        
        const containerHeight = historyListEl.clientHeight;
        const elemTop = activeEl.offsetTop;
        const elemHeight = activeEl.clientHeight;
        historyListEl.scrollTop = elemTop - containerHeight / 2 + elemHeight / 2;
    }
}

function updateHistoryNav() {
    if (teachModeActive) return;
    document.getElementById('navFirst').disabled = (historyIndex === 0);
    document.getElementById('navPrev').disabled = (historyIndex === 0);
    document.getElementById('navNext').disabled = (historyIndex === fenHistory.length - 1);
    document.getElementById('navLast').disabled = (historyIndex === fenHistory.length - 1);
}

// --- Teach Mode UI Drawer ---
function updateLessonUI() {
    if (!currentLessonKey) return;
    const lesson = openingLessons[currentLessonKey];
    const isCompleted = currentLessonStep >= lesson.steps.length;

    if (isCompleted) {
        teachPanel.innerHTML = `
            <div class="teach-active-lesson">
                <div class="lesson-header">
                    <h3>🎉 Challenge Cleared!</h3>
                    <p class="lesson-instruction">Outstanding! You completed the <strong>${lesson.title}</strong> challenge!</p>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: 100%;"></div>
                </div>
                <div class="lesson-step-box" style="border-style: solid; border-color: var(--primary-btn);">
                    Lesson Complete!
                </div>
                <div class="teach-actions">
                    <button class="teach-btn primary" id="lessonFinishBtn">Return to Menu</button>
                </div>
            </div>
        `;
        document.getElementById('lessonFinishBtn').addEventListener('click', () => {
            exitTeachMode();
        });
        
        declareGameOver("Lesson Completed!", `You successfully mastered the ${lesson.title} moves.`);
        return;
    }

    const step = lesson.steps[currentLessonStep];
    const progressPercent = (currentLessonStep / lesson.steps.length) * 100;

    teachPanel.innerHTML = `
        <div class="teach-active-lesson">
            <div class="lesson-header">
                <h3>${lesson.title}</h3>
                <p class="lesson-instruction">${lesson.description}</p>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progressPercent}%;"></div>
            </div>
            <div class="lesson-step-box">
                <i class="fa-solid fa-graduation-cap fa-pulse" style="color: var(--primary-btn); margin-right: 8px;"></i>
                ${step.prompt}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">
                <strong>Hint:</strong> ${step.move} (${step.color === 'w' ? 'Your Move' : 'AI plays this'})
            </div>
            <div class="teach-actions">
                <button class="teach-btn secondary" id="lessonResetBtn">Reset</button>
                <button class="teach-btn secondary" id="lessonQuitBtn">Quit</button>
            </div>
        </div>
    `;

    document.getElementById('lessonResetBtn').addEventListener('click', () => {
        resetLesson();
    });
    document.getElementById('lessonQuitBtn').addEventListener('click', () => {
        exitTeachMode();
    });
}

function resetLesson() {
    game.reset();
    selectedSquare = null;
    currentLessonStep = 0;
    renderBoard();
    updateLessonUI();
}

function exitTeachMode() {
    teachModeActive = false;
    stopConfetti();
    gameOverModal.classList.add('hidden');
    
    teachView.classList.add('hidden');
    historyView.classList.remove('hidden');
    
    gameLayout.classList.add('hidden');
    mainMenu.classList.remove('hidden');
}

// --- Board Renderer ---
function renderBoard() {
    boardEl.innerHTML = '';
    
    const isReviewing = historyIndex < fenHistory.length - 1 && !teachModeActive;
    const displayGame = isReviewing ? new Chess(fenHistory[historyIndex]) : game;
    const board = displayGame.board(); 
    
    if (isReviewing) {
        historyBadge.classList.remove('hidden');
    } else {
        historyBadge.classList.add('hidden');
    }

    const ranks = boardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const files = boardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    // Find king check
    let kingSquare = null;
    if (displayGame.in_check()) {
        const turnColor = displayGame.turn();
        for (let r = 0; r < 8; r++) {
            for (let f = 0; f < 8; f++) {
                const piece = board[r][f];
                if (piece && piece.type === 'k' && piece.color === turnColor) {
                    const fileChar = String.fromCharCode('a'.charCodeAt(0) + f);
                    const rankChar = 8 - r;
                    kingSquare = `${fileChar}${rankChar}`;
                    break;
                }
            }
            if (kingSquare) break;
        }
    }

    // Get last move coordinates
    let lastMove = null;
    const currentHist = displayGame.history({ verbose: true });
    if (currentHist.length > 0) {
        lastMove = currentHist[currentHist.length - 1];
    }

    // Find lesson hint highlight squares
    let lessonHintFrom = null;
    let lessonHintTo = null;
    if (teachModeActive) {
        const lesson = openingLessons[currentLessonKey];
        if (currentLessonStep < lesson.steps.length) {
            const step = lesson.steps[currentLessonStep];
            lessonHintFrom = step.from;
            lessonHintTo = step.to;
        }
    }

    ranks.forEach((r, rowIndex) => {
        files.forEach((f, colIndex) => {
            const squareEl = document.createElement('div');
            
            const fileChar = String.fromCharCode('a'.charCodeAt(0) + f);
            const rankChar = 8 - r;
            const squareId = `${fileChar}${rankChar}`;
            
            const isLight = (f + r) % 2 === 0;
            squareEl.className = `square ${isLight ? 'light' : 'dark'}`;
            squareEl.dataset.square = squareId;

            // Selected highlight
            if (!isReviewing && selectedSquare === squareId) {
                squareEl.classList.add('selected');
            }

            // Legal dots
            if (!isReviewing && selectedSquare) {
                const moves = game.moves({ square: selectedSquare, verbose: true });
                if (moves.some(m => m.to === squareId)) {
                    squareEl.classList.add('highlight');
                }
            }

            // Last move highlight (only if not teaching, or if last move exists)
            if (lastMove && (squareId === lastMove.from || squareId === lastMove.to)) {
                if (squareId === lastMove.from) {
                    squareEl.classList.add('last-move-from');
                } else {
                    squareEl.classList.add('last-move-to');
                }
            }

            // King check highlight
            if (squareId === kingSquare) {
                squareEl.classList.add('king-check');
            }

            // Lesson hint highlights (glowing blue border)
            if (teachModeActive && (squareId === lessonHintFrom || squareId === lessonHintTo)) {
                if (squareId === lessonHintFrom) {
                    squareEl.classList.add('hint-from');
                } else {
                    squareEl.classList.add('hint-to');
                }
            }

            // Engine Hint highlight (normal mode)
            if (!isReviewing && !teachModeActive && hintMove && (squareId === hintMove.from || squareId === hintMove.to)) {
                if (squareId === hintMove.from) {
                    squareEl.classList.add('hint-from');
                } else {
                    squareEl.classList.add('hint-to');
                }
            }

            const piece = board[r][f];
            if (piece) {
                const iconClass = getPieceIcon(piece.type);
                const colorClass = piece.color === 'w' ? 'white-piece' : 'black-piece';
                
                const pieceEl = document.createElement('div');
                pieceEl.className = `piece ${colorClass}`;
                pieceEl.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
                pieceEl.draggable = !isReviewing;
                
                if (!isReviewing) {
                    pieceEl.addEventListener('dragstart', (e) => {
                        // Prevent moving black in AI game mode
                        if (!teachModeActive && gameModeSelect.value === 'ai' && piece.color === 'b') {
                            e.preventDefault();
                            return;
                        }
                        // Prevent moving wrong color in teach mode
                        if (teachModeActive) {
                            const step = openingLessons[currentLessonKey].steps[currentLessonStep];
                            if (piece.color !== step.color) {
                                e.preventDefault();
                                return;
                            }
                        }
                        if (piece.color !== game.turn()) {
                            e.preventDefault();
                            return;
                        }
                        selectedSquare = squareId;
                        e.dataTransfer.setData('text/plain', squareId);
                        setTimeout(() => pieceEl.classList.add('dragging'), 0);
                        renderBoard();
                    });
                    
                    pieceEl.addEventListener('dragend', () => {
                        pieceEl.classList.remove('dragging');
                    });
                }
                
                squareEl.appendChild(pieceEl);
            }

            if (!isReviewing) {
                squareEl.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    squareEl.classList.add('drag-over');
                });

                squareEl.addEventListener('dragleave', () => {
                    squareEl.classList.remove('drag-over');
                });

                squareEl.addEventListener('drop', (e) => {
                    e.preventDefault();
                    squareEl.classList.remove('drag-over');
                    const fromSquare = e.dataTransfer.getData('text/plain');
                    handleMove(fromSquare, squareId);
                });

                squareEl.addEventListener('click', () => handleSquareClick(squareId));
            }
            
            boardEl.appendChild(squareEl);
        });
    });
    
    updateStatus();
    updateCapturedPieces();
    updateHistory();
    updateHistoryNav();
    updateTimerDisplay();
    
    if (!isReviewing) {
        triggerAi();
    }
}

function handleMove(from, to) {
    if (game.game_over()) return;

    if (teachModeActive) {
        // Validation in Teach Mode
        const lesson = openingLessons[currentLessonKey];
        if (currentLessonStep >= lesson.steps.length) return;
        const step = lesson.steps[currentLessonStep];

        if (from === step.from && to === step.to) {
            let moveObj = { from: from, to: to };
            // Auto queen on lesson promotions
            if (to[1] === '8' || to[1] === '1') {
                const p = game.get(from);
                if (p && p.type === 'p') moveObj.promotion = 'q';
            }

            const res = game.move(moveObj);
            if (res) {
                playSound(res.captured ? 'capture' : 'move');
                if (game.in_check()) playSound('check');
                selectedSquare = null;
                currentLessonStep++;
                
                // If next step is black, auto play it
                if (currentLessonStep < lesson.steps.length) {
                    const nextStep = lesson.steps[currentLessonStep];
                    if (nextStep.color === 'b') {
                        updateLessonUI();
                        renderBoard();
                        setTimeout(() => {
                            const blackRes = game.move({ from: nextStep.from, to: nextStep.to });
                            if (blackRes) {
                                playSound(blackRes.captured ? 'capture' : 'move');
                                if (game.in_check()) playSound('check');
                                currentLessonStep++;
                                updateLessonUI();
                                renderBoard();
                            }
                        }, 800);
                        return;
                    }
                }
                updateLessonUI();
            }
        } else {
            showCustomAlert("Incorrect move. Follow the glowing blue squares to learn the opening!");
        }
        renderBoard();
        return;
    }

    // Normal play move validation
    let moves = game.moves({ square: from, verbose: true });
    let move = moves.find(m => m.to === to);

    if (move) {
        if (move.flags.includes('p') || move.flags.includes('cp')) {
            pendingPromotion = { from: from, to: to };
            document.getElementById('promotionOverlay').classList.remove('hidden');
            return;
        }

        let moveObj = { from: from, to: to };
        const res = game.move(moveObj);
        if (res) {
            playSound(res.captured ? 'capture' : 'move');
            if (game.in_check() || game.in_checkmate()) {
                playSound('check');
            }
            selectedSquare = null;
            hintMove = null; 
            applyIncrementAndSwitch();
        }
    }
    renderBoard();
}

function selectPromotion(pieceType) {
    if (!pendingPromotion) return;
    
    let moveObj = {
        from: pendingPromotion.from,
        to: pendingPromotion.to,
        promotion: pieceType
    };
    
    const res = game.move(moveObj);
    if (res) {
        playSound(res.captured ? 'capture' : 'move');
        if (game.in_check() || game.in_checkmate()) {
            playSound('check');
        }
        selectedSquare = null;
        hintMove = null;
        applyIncrementAndSwitch();
    }
    
    document.getElementById('promotionOverlay').classList.add('hidden');
    pendingPromotion = null;
    renderBoard();
}

function handleSquareClick(square) {
    if (game.game_over()) return;
    if (!teachModeActive && gameModeSelect.value === 'ai' && game.turn() === 'b') return;

    if (teachModeActive) {
        const step = openingLessons[currentLessonKey].steps[currentLessonStep];
        // Enforce clicking only step color pieces
        const piece = game.get(square);
        if (selectedSquare) {
            if (selectedSquare === square) {
                selectedSquare = null;
            } else {
                handleMove(selectedSquare, square);
            }
        } else {
            if (piece && piece.color === step.color) {
                selectedSquare = square;
            }
        }
        renderBoard();
        return;
    }

    if (selectedSquare) {
        let moves = game.moves({ square: selectedSquare, verbose: true });
        let move = moves.find(m => m.to === square);

        if (move) {
            handleMove(selectedSquare, square);
        } else {
            const piece = game.get(square);
            if (piece && piece.color === game.turn()) {
                selectedSquare = square;
            } else {
                selectedSquare = null; 
            }
            renderBoard();
        }
    } else {
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
            selectedSquare = square;
            renderBoard();
        }
    }
}

function updateStatus() {
    let status = '';
    let moveColor = game.turn() === 'w' ? 'White' : 'Black';

    if (teachModeActive) {
        const lesson = openingLessons[currentLessonKey];
        if (currentLessonStep >= lesson.steps.length) {
            status = "Lesson Complete!";
        } else {
            status = `Lesson Practice: ${lesson.steps[currentLessonStep].color === 'w' ? 'White' : 'Black'} to move`;
        }
    } else {
        if (whiteTime <= 0) {
            status = 'Game over, White ran out of time.';
        } else if (blackTime <= 0) {
            status = 'Game over, Black ran out of time.';
        } else if (game.in_checkmate()) {
            status = `Game over, ${moveColor} is in checkmate.`;
            stopTimer();
            setTimeout(() => {
                const winner = game.turn() === 'w' ? 'Black' : 'White';
                declareGameOver(`${winner} Wins!`, `${winner} won by checkmate.`);
            }, 300);
        } else if (game.in_draw()) {
            status = 'Game drawn';
            stopTimer();
            setTimeout(() => {
                let reason = 'Draw';
                if (game.in_stalemate()) reason = 'Draw by Stalemate';
                else if (game.in_threefold_repetition()) reason = 'Draw by Threefold Repetition';
                else if (game.insufficient_material()) reason = 'Draw by Insufficient Material';
                declareGameOver("Game Drawn", reason);
            }, 300);
        } else {
            status = `${moveColor} to move`;
            if (game.in_check()) {
                status += ' (Check!)';
            }
        }
    }
    statusEl.textContent = status;
}

// --- Custom Alert ---
function showCustomAlert(message) {
    const alertOverlay = document.createElement('div');
    alertOverlay.className = 'modal-overlay';
    alertOverlay.innerHTML = `
        <div class="modal-content text-center">
            <h2>Notice</h2>
            <p class="modal-desc" style="font-size: 1.1rem; margin: 1.5rem 0;">${message}</p>
            <button class="btn" id="customAlertCloseBtn">OK</button>
        </div>
    `;
    document.body.appendChild(alertOverlay);
    document.getElementById('customAlertCloseBtn').addEventListener('click', () => {
        alertOverlay.remove();
    });
}

function declareGameOver(title, desc) {
    stopTimer();
    
    modalWinnerTitle.textContent = title;
    modalWinnerDesc.textContent = desc;
    
    const moves = game.history();
    statMoves.textContent = moves.length;
    statTime.textContent = `W: ${formatTime(whiteTime)} | B: ${formatTime(blackTime)}`;
    
    gameOverModal.classList.remove('hidden');
    startConfetti();
}

function startNewGame() {
    game.reset();
    selectedSquare = null;
    hintMove = null;
    pendingPromotion = null;
    
    resetTimers();
    
    fenHistory = [game.fen()];
    historyIndex = 0;
    
    evalBarEl.style.height = '50%';
    evalScoreEl.textContent = '0.0';
    thinkingSpinner.classList.add('hidden');
    
    stopConfetti();
    gameOverModal.classList.add('hidden');
    
    renderBoard();
    startTimer();
}

// --- Tabs Switcher in Menu ---
tabPlayBtn.addEventListener('click', () => {
    menuMode = 'play';
    tabPlayBtn.classList.add('active');
    tabTeachBtn.classList.remove('active');
    panelPlaySettings.classList.remove('hidden');
    panelTeachSettings.classList.add('hidden');
});

tabTeachBtn.addEventListener('click', () => {
    menuMode = 'teach';
    tabTeachBtn.classList.add('active');
    tabPlayBtn.classList.remove('active');
    panelTeachSettings.classList.remove('hidden');
    panelPlaySettings.classList.add('hidden');
});

// Selection click on openings in list
document.querySelectorAll('.menu-opening-option').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.menu-opening-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        currentLessonKey = opt.dataset.opening;
    });
});

// --- Theme Switcher ---
const savedThemeBoot = localStorage.getItem('cozy-chess-theme') || 'espresso';
themeSelect.value = savedThemeBoot;
menuThemeSelect.value = savedThemeBoot;
document.body.setAttribute('data-theme', savedThemeBoot);

menuThemeSelect.addEventListener('change', (e) => {
    const theme = e.target.value;
    document.body.setAttribute('data-theme', theme);
    themeSelect.value = theme;
    localStorage.setItem('cozy-chess-theme', theme);
    renderBoard(); // Update piece icons
});

themeSelect.addEventListener('change', (e) => {
    const theme = e.target.value;
    document.body.setAttribute('data-theme', theme);
    menuThemeSelect.value = theme;
    localStorage.setItem('cozy-chess-theme', theme);
    renderBoard(); // Update piece icons
});

// Back to menu
menuBtn.addEventListener('click', () => {
    stopTimer();
    gameLayout.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

// Start Match button execution
startGameBtn.addEventListener('click', () => {
    // 1. Sync theme
    const theme = menuThemeSelect.value;
    themeSelect.value = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('cozy-chess-theme', theme);

    if (menuMode === 'play') {
        teachModeActive = false;
        teachView.classList.add('hidden');
        historyView.classList.remove('hidden');

        // Sync game modes & limits
        const isAi = modeAiBtn.classList.contains('active');
        gameModeSelect.value = isAi ? 'ai' : 'human';
        aiDifficultySelect.disabled = !isAi;
        aiDifficultySelect.value = menuAiDifficulty.value;

        const activeTimeBtn = document.querySelector('.time-btn.active');
        const timeVal = activeTimeBtn.dataset.time;
        if (timeVal === 'custom') {
            const mins = parseInt(menuCustomMin.value);
            const inc = parseInt(menuCustomInc.value);
            if (isNaN(mins) || mins < 1) {
                showCustomAlert("Please enter a valid time (minimum 1 minute).");
                return;
            }
            whiteTime = mins * 60;
            blackTime = mins * 60;
            incrementSeconds = isNaN(inc) ? 0 : inc;
            
            timeControlSelect.value = 'custom';
            customTimePanel.classList.remove('hidden');
            document.getElementById('customMin').value = mins;
            document.getElementById('customInc').value = inc;
        } else {
            timeControlSelect.value = timeVal;
            customTimePanel.classList.add('hidden');
            parseTimeSetting(timeVal);
        }
        
        startNewGame();
    } else {
        // Teach Mode Init
        teachModeActive = true;
        historyView.classList.add('hidden');
        teachView.classList.remove('hidden');
        
        currentLessonStep = 0;
        game.reset();
        selectedSquare = null;
        hintMove = null;
        pendingPromotion = null;
        stopTimer();
        evalBarEl.style.height = '50%';
        evalScoreEl.textContent = '0.0';
        
        updateLessonUI();
        renderBoard();
    }

    // Fade out transition
    mainMenu.classList.add('fade-out');
    setTimeout(() => {
        mainMenu.classList.add('hidden');
        gameLayout.classList.remove('hidden');
        mainMenu.classList.remove('fade-out');
    }, 450);
});

// --- Time Preset selections in Main Menu ---
document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.time === 'custom') {
            menuCustomTimePanel.classList.remove('hidden');
        } else {
            menuCustomTimePanel.classList.add('hidden');
        }
    });
});

// --- Game Mode selections in Main Menu ---
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const menuAiDiffSection = document.getElementById('menuAiDiffSection');
        if (btn.dataset.mode === 'ai') {
            menuAiDiffSection.classList.remove('hidden');
        } else {
            menuAiDiffSection.classList.add('hidden');
        }
    });
});

// --- Promotion overlay handlers ---
document.querySelectorAll('.promotion-choice').forEach(choice => {
    choice.addEventListener('click', () => {
        const pieceType = choice.dataset.piece;
        selectPromotion(pieceType);
    });
});

// --- Undo Move Logic ---
function undoMove() {
    if (teachModeActive) return;
    
    // Exit history review mode first
    historyIndex = fenHistory.length - 1;
    
    const isAiMode = (gameModeSelect.value === 'ai');
    
    if (isAiMode) {
        if (fenHistory.length > 2) {
            game.undo();
            game.undo();
            fenHistory.pop();
            fenHistory.pop();
            historyIndex = fenHistory.length - 1;
        } else {
            showCustomAlert("No moves to undo.");
            return;
        }
    } else {
        if (fenHistory.length > 1) {
            game.undo();
            fenHistory.pop();
            historyIndex = fenHistory.length - 1;
        } else {
            showCustomAlert("No moves to undo.");
            return;
        }
    }
    
    thinkingSpinner.classList.add('hidden');
    switchActiveColor(game.turn());
    renderBoard();
    updateHistory();
    updateCapturedPieces();
    updateHistoryNav();
    playSound('wood');
    
    triggerAi();
}

undoBtn.addEventListener('click', () => {
    undoMove();
});

// --- In-Game handlers ---
resetBtn.addEventListener('click', () => {
    if (teachModeActive) {
        resetLesson();
    } else {
        startNewGame();
    }
});

flipBtn.addEventListener('click', () => {
    boardFlipped = !boardFlipped;
    renderBoard();
});

hintBtn.addEventListener('click', () => {
    if (teachModeActive) return;
    if (game.game_over()) return;
    if (awaitingHint) return;
    
    awaitingHint = true;
    thinkingSpinner.classList.remove('hidden');
    
    engine.postMessage(`position fen ${game.fen()}`);
    engine.postMessage('go depth 12');
});

resignBtn.addEventListener('click', () => {
    if (game.game_over()) return;
    const turn = game.turn() === 'w' ? 'White' : 'Black';
    const opponent = turn === 'w' ? 'Black' : 'White';
    declareGameOver(`${opponent} Wins!`, `${turn} resigned the game.`);
});

drawBtn.addEventListener('click', () => {
    if (game.game_over()) return;
    
    if (gameModeSelect.value === 'ai') {
        const history = game.history();
        if (history.length < 16) {
            showCustomAlert("Stockfish declined the draw. It is too early in the game.");
            return;
        }
        
        const scoreText = evalScoreEl.textContent;
        let isBalanced = false;
        if (scoreText) {
            const val = parseFloat(scoreText);
            if (!isNaN(val) && Math.abs(val) <= 1.0) {
                isBalanced = true;
            }
        }
        
        if (isBalanced) {
            declareGameOver("Game Drawn", "Draw by agreement with Stockfish.");
        } else {
            showCustomAlert("Stockfish declined the draw. The position is not balanced.");
        }
    } else {
        declareGameOver("Game Drawn", "Draw by mutual agreement.");
    }
});

gameModeSelect.addEventListener('change', (e) => {
    aiDifficultySelect.disabled = e.target.value !== 'ai';
    triggerAi();
});

aiDifficultySelect.addEventListener('change', () => {
    triggerAi();
});

timeControlSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
        customTimePanel.classList.remove('hidden');
    } else {
        customTimePanel.classList.add('hidden');
        parseTimeSetting(val);
        startNewGame();
    }
});

document.getElementById('applyCustomTimeBtn').addEventListener('click', () => {
    const mins = parseInt(document.getElementById('customMin').value);
    const inc = parseInt(document.getElementById('customInc').value);
    
    if (isNaN(mins) || mins < 1) {
        showCustomAlert("Please enter a valid time (minimum 1 minute).");
        return;
    }
    
    whiteTime = mins * 60;
    blackTime = mins * 60;
    incrementSeconds = isNaN(inc) ? 0 : inc;
    
    customTimePanel.classList.add('hidden');
    startNewGame();
});

document.getElementById('exportPgnBtn').addEventListener('click', () => {
    const pgn = game.pgn();
    if (!pgn) {
        showCustomAlert("No moves have been played yet.");
        return;
    }
    const blob = new Blob([pgn], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cozy_chess_game.pgn';
    a.click();
});

document.getElementById('importPgnBtn').addEventListener('click', () => {
    pgnInputText.value = '';
    importPgnModal.classList.remove('hidden');
});

pgnCancelBtn.addEventListener('click', () => {
    importPgnModal.classList.add('hidden');
});

pgnSubmitBtn.addEventListener('click', () => {
    const pgn = pgnInputText.value.trim();
    if (!pgn) {
        showCustomAlert("Please paste a valid PGN string first.");
        return;
    }
    
    const tempGame = new Chess();
    if (tempGame.load_pgn(pgn)) {
        game.load_pgn(pgn);
        importPgnModal.classList.add('hidden');
        
        const moves = tempGame.history();
        const replayer = new Chess();
        fenHistory = [replayer.fen()];
        for (let m of moves) {
            replayer.move(m);
            fenHistory.push(replayer.fen());
        }
        
        historyIndex = fenHistory.length - 1;
        resetTimers();
        renderBoard();
        startTimer();
    } else {
        showCustomAlert("Invalid PGN format. Please check your notation.");
    }
});

modalNewGameBtn.addEventListener('click', () => {
    if (teachModeActive) {
        resetLesson();
    } else {
        startNewGame();
    }
});

modalCloseBtn.addEventListener('click', () => {
    gameOverModal.classList.add('hidden');
    stopConfetti();
});

// History Navigation buttons
document.getElementById('navFirst').addEventListener('click', () => {
    if (fenHistory.length === 0) return;
    historyIndex = 0;
    renderBoard();
});

document.getElementById('navPrev').addEventListener('click', () => {
    if (historyIndex > 0) {
        historyIndex--;
        renderBoard();
    }
});

document.getElementById('navNext').addEventListener('click', () => {
    if (historyIndex < fenHistory.length - 1) {
        historyIndex++;
        renderBoard();
    }
});

document.getElementById('navLast').addEventListener('click', () => {
    historyIndex = fenHistory.length - 1;
    renderBoard();
});

// Boot Setup
parseTimeSetting(timeControlSelect.value);
renderBoard();
