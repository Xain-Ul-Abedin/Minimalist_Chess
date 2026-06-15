const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const flipBtn = document.getElementById('flipBtn');
const whiteTimerEl = document.getElementById('whiteTimer');
const blackTimerEl = document.getElementById('blackTimer');
const whiteCapturedEl = document.getElementById('whiteCaptured');
const blackCapturedEl = document.getElementById('blackCaptured');
const historyListEl = document.getElementById('historyList');
const evalBarEl = document.getElementById('evalBar');
const gameModeSelect = document.getElementById('gameMode');
const aiDifficultySelect = document.getElementById('aiDifficulty');

const INITIAL_TIME_SECONDS = 300;

let game = new Chess();
let boardFlipped = false;
let selectedSquare = null;

let whiteTime = INITIAL_TIME_SECONDS;
let blackTime = INITIAL_TIME_SECONDS;
let activeColor = 'w';
let timerStopped = true;
let lastTick = null;
let timerHandle = null;

// AI Engine State
let engine = null;
let engineReady = false;

// Audio Context for sound effects
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'capture') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    }
}

// FontAwesome chess icons
const pieceIcons = {
    'p': 'fa-chess-pawn', 'n': 'fa-chess-knight', 'b': 'fa-chess-bishop',
    'r': 'fa-chess-rook', 'q': 'fa-chess-queen', 'k': 'fa-chess-king',
    'P': 'fa-chess-pawn', 'N': 'fa-chess-knight', 'B': 'fa-chess-bishop',
    'R': 'fa-chess-rook', 'Q': 'fa-chess-queen', 'K': 'fa-chess-king'
};

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
                    
                    // Handle Engine Move
                    if (line.includes('bestmove')) {
                        const move = line.split(' ')[1];
                        if (move && move !== '(none)') {
                            const moveObj = {
                                from: move.substring(0, 2),
                                to: move.substring(2, 4),
                                promotion: move.length > 4 ? move.charAt(4) : undefined
                            };
                            const res = game.move(moveObj);
                            if (res) {
                                playSound(res.captured ? 'capture' : 'move');
                                switchActiveColor(game.turn());
                                renderBoard();
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
                        }
                    } else if (line.includes('score mate')) {
                        const match = line.match(/score mate (-?\d+)/);
                        if (match) {
                            let mate = parseInt(match[1]);
                            if (game.turn() === 'b') mate = -mate;
                            updateEvalBar(mate > 0 ? 100 : -100);
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
    if (!isAi || !engineReady || game.game_over()) return;
    
    // Assume AI plays Black for now
    if (game.turn() === 'b') {
        const skill = aiDifficultySelect.value;
        engine.postMessage(`setoption name Skill Level value ${skill}`);
        engine.postMessage(`position fen ${game.fen()}`);
        engine.postMessage('go depth 10'); // Fix depth for web performance
    } else {
        // If it's white's turn, we evaluate the position to update the bar
        engine.postMessage(`position fen ${game.fen()}`);
        engine.postMessage('go depth 10');
    }
}

function updateEvalBar(score) {
    // Math: Cap at +5 or -5. Map to 0-100%
    const cappedScore = Math.max(-5, Math.min(5, score));
    const percentage = 50 + (cappedScore * 10); // 1 point = 10% movement
    evalBarEl.style.height = `${percentage}%`;
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
    whiteTimerEl.classList.toggle('active', activeColor === 'w' && !timerStopped);
    blackTimerEl.classList.toggle('active', activeColor === 'b' && !timerStopped);
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

        if (whiteTime <= 0 || blackTime <= 0) {
            stopTimer();
            updateStatus();
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
    whiteTime = INITIAL_TIME_SECONDS;
    blackTime = INITIAL_TIME_SECONDS;
    activeColor = 'w';
    updateTimerDisplay();
}

function switchActiveColor(moveColor) {
    activeColor = moveColor;
    if (!timerStopped) {
        updateTimerDisplay();
    }
}

// --- UI Logic ---
function updateCapturedPieces() {
    const history = game.history({ verbose: true });
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
        
        const bMove = document.createElement('div');
        bMove.className = 'move-b';
        bMove.textContent = history[i+1] || '';
        
        row.appendChild(num);
        row.appendChild(wMove);
        row.appendChild(bMove);
        historyListEl.appendChild(row);
    }
    
    historyListEl.scrollTop = historyListEl.scrollHeight;
}

function renderBoard() {
    boardEl.innerHTML = '';
    const board = game.board(); 
    
    const ranks = boardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const files = boardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    ranks.forEach((r, rowIndex) => {
        files.forEach((f, colIndex) => {
            const squareEl = document.createElement('div');
            
            const fileChar = String.fromCharCode('a'.charCodeAt(0) + f);
            const rankChar = 8 - r;
            const squareId = `${fileChar}${rankChar}`;
            
            const isLight = (f + r) % 2 === 0;
            squareEl.className = `square ${isLight ? 'light' : 'dark'}`;
            squareEl.dataset.square = squareId;

            if (selectedSquare === squareId) {
                squareEl.classList.add('selected');
            }

            if (selectedSquare) {
                const moves = game.moves({ square: selectedSquare, verbose: true });
                if (moves.some(m => m.to === squareId)) {
                    squareEl.classList.add('highlight');
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
                pieceEl.draggable = true;
                
                // Drag start
                pieceEl.addEventListener('dragstart', (e) => {
                    // Prevent human from dragging AI pieces when AI is active
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
                
                squareEl.appendChild(pieceEl);
            }

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
            
            boardEl.appendChild(squareEl);
        });
    });
    
    updateStatus();
    updateCapturedPieces();
    updateHistory();
    
    // Trigger AI evaluation/move if it's the engine's turn
    triggerAi();
}

function handleMove(from, to) {
    if (game.game_over()) return;

    let moves = game.moves({ square: from, verbose: true });
    let move = moves.find(m => m.to === to);

    if (move) {
        let moveObj = { from: from, to: to };
        if (move.flags.includes('p') || move.flags.includes('cp')) {
            moveObj.promotion = 'q';
        }
        
        const res = game.move(moveObj);
        if (res) {
            playSound(res.captured ? 'capture' : 'move');
            selectedSquare = null;
            switchActiveColor(game.turn());
        }
    }
    renderBoard();
}

function handleSquareClick(square) {
    if (game.game_over()) return;
    
    // Prevent human clicking for AI color
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
    } else if (game.in_draw()) {
        status = 'Game drawn';
    } else {
        status = `${moveColor} to move`;
        if (game.in_check()) {
            status += ' (Check!)';
        }
    }
    statusEl.textContent = status;
}

// --- Event Listeners ---
resetBtn.addEventListener('click', () => {
    game.reset();
    resetTimers();
    selectedSquare = null;
    evalBarEl.style.height = '50%';
    renderBoard();
    startTimer();
});

flipBtn.addEventListener('click', () => {
    boardFlipped = !boardFlipped;
    renderBoard();
});

gameModeSelect.addEventListener('change', (e) => {
    aiDifficultySelect.disabled = e.target.value !== 'ai';
    triggerAi();
});

aiDifficultySelect.addEventListener('change', () => {
    triggerAi();
});

document.getElementById('exportPgnBtn').addEventListener('click', () => {
    const pgn = game.pgn();
    const blob = new Blob([pgn], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cozy_chess_game.pgn';
    a.click();
});

document.getElementById('importPgnBtn').addEventListener('click', () => {
    const input = prompt("Paste your PGN here:");
    if (input) {
        if(game.load_pgn(input)) {
            resetTimers();
            renderBoard();
        } else {
            alert("Invalid PGN format. Please check and try again.");
        }
    }
});

// Boot
updateTimerDisplay();
startTimer();
renderBoard();
