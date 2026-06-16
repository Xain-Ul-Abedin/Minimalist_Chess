const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const flipBtn = document.getElementById('flipBtn');
const hintBtn = document.getElementById('hintBtn');
const resignBtn = document.getElementById('resignBtn');
const drawBtn = document.getElementById('drawBtn');
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

// Audio Context for sound effects
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

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
        // Double wood knock
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
        osc.frequency.setValueAtTime(329.63, audioCtx.currentTime); // E4
        osc.frequency.exponentialRampToValueAtTime(440.00, audioCtx.currentTime + 0.1); // A4
        gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'capture') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(392.00, audioCtx.currentTime + 0.06); // G4
        gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    } else if (type === 'check') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.08); // C#5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.16); // E5
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

// FontAwesome chess icons
const pieceIcons = {
    'p': 'fa-chess-pawn', 'n': 'fa-chess-knight', 'b': 'fa-chess-bishop',
    'r': 'fa-chess-rook', 'q': 'fa-chess-queen', 'k': 'fa-chess-king',
    'P': 'fa-chess-pawn', 'N': 'fa-chess-knight', 'B': 'fa-chess-bishop',
    'R': 'fa-chess-rook', 'Q': 'fa-chess-queen', 'K': 'fa-chess-king'
};

// --- Confetti Engine ---
let confettiActive = false;
let confettiParticles = [];
let confettiAnimationFrame = null;

function startConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    
    // Fit canvas to parent modal size
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
                            if (move && move !== '(none)' && game.turn() === 'b' && gameModeSelect.value === 'ai') {
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
                    if (line.includes('score cp')) {
                        const match = line.match(/score cp (-?\d+)/);
                        if (match) {
                            let score = parseInt(match[1]) / 100;
                            // Ensure score is from White's perspective
                            if (game.turn() === 'b') score = -score;
                            updateEvalBar(score);
                            updateEvalScore(score, false);
                        }
                    } else if (line.includes('score mate')) {
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
    const isAi = gameModeSelect.value === 'ai';
    if (!engineReady || game.game_over()) return;
    
    // Check if we need to show the spinner (only when AI is actively thinking for its own turn)
    if (isAi && game.turn() === 'b') {
        thinkingSpinner.classList.remove('hidden');
        const skill = aiDifficultySelect.value;
        engine.postMessage(`setoption name Skill Level value ${skill}`);
        engine.postMessage(`position fen ${game.fen()}`);
        engine.postMessage('go depth 10'); 
    } else {
        // Just run evaluation in background on player turns, no thinking spinner
        engine.postMessage(`position fen ${game.fen()}`);
        engine.postMessage('go depth 10');
    }
}

function updateEvalBar(score) {
    const cappedScore = Math.max(-5, Math.min(5, score));
    const percentage = 50 + (cappedScore * 10); // 1 point = 10% movement
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
    
    // Only highlight timers if the game is active
    const isReviewing = historyIndex < fenHistory.length - 1;
    whiteTimerEl.classList.toggle('active', activeColor === 'w' && !timerStopped && !isReviewing);
    blackTimerEl.classList.toggle('active', activeColor === 'b' && !timerStopped && !isReviewing);
}

function startTimer() {
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

// --- Dynamic Config Parsing ---
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

// Apply increment and store FEN
function applyIncrementAndSwitch() {
    if (game.turn() === 'b') { // White just moved
        whiteTime += incrementSeconds;
    } else { // Black just moved
        blackTime += incrementSeconds;
    }
    
    // Save live state to history
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
            const icon = pieceIcons[p];
            const colorClass = isWhite ? 'white-piece' : 'black-piece';
            return `<div class="captured-piece ${colorClass}"><i class="fa-solid ${icon}"></i></div>`;
        }).join('');
    };

    renderPieces(whiteCaptures, whiteCapturedEl, true);
    renderPieces(blackCaptures, blackCapturedEl, false);
}

// --- Move History List Builder ---
function updateHistory() {
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
    
    // Highlight the active history move visually in the history panel and scroll it ONLY
    const moveEls = historyListEl.querySelectorAll('.move-w, .move-b');
    if (historyIndex > 0 && moveEls[historyIndex - 1]) {
        const activeEl = moveEls[historyIndex - 1];
        activeEl.style.color = 'var(--primary-btn)';
        activeEl.style.fontWeight = '700';
        
        // Scroll ONLY the historyListEl panel using setting scrollTop (fixes outer window jumping)
        const containerHeight = historyListEl.clientHeight;
        const elemTop = activeEl.offsetTop;
        const elemHeight = activeEl.clientHeight;
        historyListEl.scrollTop = elemTop - containerHeight / 2 + elemHeight / 2;
    }
}

function updateHistoryNav() {
    document.getElementById('navFirst').disabled = (historyIndex === 0);
    document.getElementById('navPrev').disabled = (historyIndex === 0);
    document.getElementById('navNext').disabled = (historyIndex === fenHistory.length - 1);
    document.getElementById('navLast').disabled = (historyIndex === fenHistory.length - 1);
}

// --- Board Renderer ---
function renderBoard() {
    boardEl.innerHTML = '';
    
    const isReviewing = historyIndex < fenHistory.length - 1;
    const displayGame = isReviewing ? new Chess(fenHistory[historyIndex]) : game;
    const board = displayGame.board(); 
    
    if (isReviewing) {
        historyBadge.classList.remove('hidden');
    } else {
        historyBadge.classList.add('hidden');
    }

    const ranks = boardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const files = boardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    // Find king check on displayed board
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

    // Get last move coordinates of displayed board to highlight
    let lastMove = null;
    const currentHist = displayGame.history({ verbose: true });
    if (currentHist.length > 0) {
        lastMove = currentHist[currentHist.length - 1];
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

            // Apply selected highlight
            if (!isReviewing && selectedSquare === squareId) {
                squareEl.classList.add('selected');
            }

            // Apply legal moves dots
            if (!isReviewing && selectedSquare) {
                const moves = game.moves({ square: selectedSquare, verbose: true });
                if (moves.some(m => m.to === squareId)) {
                    squareEl.classList.add('highlight');
                }
            }

            // Apply last move highlight
            if (lastMove && (squareId === lastMove.from || squareId === lastMove.to)) {
                if (squareId === lastMove.from) {
                    squareEl.classList.add('last-move-from');
                } else {
                    squareEl.classList.add('last-move-to');
                }
            }

            // Apply check highlight
            if (squareId === kingSquare) {
                squareEl.classList.add('king-check');
            }

            // Apply Hint highlight
            if (!isReviewing && hintMove && (squareId === hintMove.from || squareId === hintMove.to)) {
                if (squareId === hintMove.from) {
                    squareEl.classList.add('hint-from');
                } else {
                    squareEl.classList.add('hint-to');
                }
            }

            const piece = board[r][f];
            if (piece) {
                const pieceKey = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
                const iconClass = pieceIcons[pieceKey];
                const colorClass = piece.color === 'w' ? 'white-piece' : 'black-piece';
                
                const pieceEl = document.createElement('div');
                pieceEl.className = `piece ${colorClass}`;
                pieceEl.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
                pieceEl.draggable = !isReviewing;
                
                if (!isReviewing) {
                    pieceEl.addEventListener('dragstart', (e) => {
                        if (gameModeSelect.value === 'ai' && piece.color === 'b') {
                            e.preventDefault();
                            return;
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
    if (gameModeSelect.value === 'ai' && game.turn() === 'b') return;

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
    statusEl.textContent = status;
}

// --- Custom Alert Dialog ---
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

// --- Main Menu UI Interactions ---
modeLocalBtn.addEventListener('click', () => {
    modeLocalBtn.classList.add('active');
    modeAiBtn.classList.remove('active');
    menuAiDiffSection.classList.add('hidden');
});

modeAiBtn.addEventListener('click', () => {
    modeAiBtn.classList.add('active');
    modeLocalBtn.classList.remove('active');
    menuAiDiffSection.classList.remove('hidden');
});

// Time presets in menu
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

// Sync themes on change in menu
menuThemeSelect.addEventListener('change', (e) => {
    const theme = e.target.value;
    document.body.setAttribute('data-theme', theme);
    themeSelect.value = theme;
    localStorage.setItem('cozy-chess-theme', theme);
});

// Sync themes on change in active game
themeSelect.addEventListener('change', (e) => {
    const theme = e.target.value;
    document.body.setAttribute('data-theme', theme);
    menuThemeSelect.value = theme;
    localStorage.setItem('cozy-chess-theme', theme);
});

// Back to menu
menuBtn.addEventListener('click', () => {
    stopTimer();
    gameLayout.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

// Start button execution
startGameBtn.addEventListener('click', () => {
    // 1. Sync theme
    const theme = menuThemeSelect.value;
    themeSelect.value = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('cozy-chess-theme', theme);

    // 2. Sync game mode
    const isAi = modeAiBtn.classList.contains('active');
    gameModeSelect.value = isAi ? 'ai' : 'human';
    aiDifficultySelect.disabled = !isAi;
    aiDifficultySelect.value = menuAiDifficulty.value;

    // 3. Sync time control settings
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

    // Initialize game state
    startNewGame();

    // Transition animation
    mainMenu.classList.add('fade-out');
    setTimeout(() => {
        mainMenu.classList.add('hidden');
        gameLayout.classList.remove('hidden');
        mainMenu.classList.remove('fade-out');
    }, 450);
});

// --- Pawn Promotion Choice Event Listeners ---
document.querySelectorAll('.promotion-choice').forEach(choice => {
    choice.addEventListener('click', () => {
        const pieceType = choice.dataset.piece;
        selectPromotion(pieceType);
    });
});

// --- In-Game Select Listeners ---
resetBtn.addEventListener('click', () => {
    startNewGame();
});

flipBtn.addEventListener('click', () => {
    boardFlipped = !boardFlipped;
    renderBoard();
});

hintBtn.addEventListener('click', () => {
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

// In-Game Time Control select change
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

// PGN Export
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

// PGN Import Modals Actions
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

// GameOver Modal Actions
modalNewGameBtn.addEventListener('click', () => {
    startNewGame();
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
const savedThemeBoot = localStorage.getItem('cozy-chess-theme') || 'espresso';
themeSelect.value = savedThemeBoot;
menuThemeSelect.value = savedThemeBoot;
document.body.setAttribute('data-theme', savedThemeBoot);

parseTimeSetting(timeControlSelect.value);
renderBoard();
