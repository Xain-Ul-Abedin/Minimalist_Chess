const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const flipBtn = document.getElementById('flipBtn');
const whiteTimerEl = document.getElementById('whiteTimer');
const blackTimerEl = document.getElementById('blackTimer');
const whiteCapturedEl = document.getElementById('whiteCaptured');
const blackCapturedEl = document.getElementById('blackCaptured');
const historyListEl = document.getElementById('historyList');

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

// SVG chess pieces from Wikipedia Commons
const pieceImages = {
    'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Chess_ndt45.svg',
    'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
    'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    'N': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg'
};

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

function updateCapturedPieces() {
    const history = game.history({ verbose: true });
    let whiteCaptures = [];
    let blackCaptures = [];

    history.forEach(move => {
        if (move.captured) {
            if (move.color === 'w') {
                whiteCaptures.push(move.captured); // White captured a black piece
            } else {
                blackCaptures.push(move.captured.toUpperCase()); // Black captured a white piece
            }
        }
    });

    const renderPieces = (captures, el) => {
        el.innerHTML = captures.map(p => {
            const url = pieceImages[p];
            return `<div class="captured-piece" style="background-image: url('${url}');"></div>`;
        }).join('');
    };

    renderPieces(whiteCaptures, whiteCapturedEl);
    renderPieces(blackCaptures, blackCapturedEl);
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
    
    // Auto scroll to bottom
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
                const pieceUrl = pieceImages[pieceKey];
                
                const pieceEl = document.createElement('div');
                pieceEl.className = 'piece';
                pieceEl.style.backgroundImage = `url('${pieceUrl}')`;
                pieceEl.draggable = true;
                
                // Drag start
                pieceEl.addEventListener('dragstart', (e) => {
                    if (piece.color !== game.turn()) {
                        e.preventDefault();
                        return;
                    }
                    selectedSquare = squareId;
                    e.dataTransfer.setData('text/plain', squareId);
                    setTimeout(() => pieceEl.classList.add('dragging'), 0);
                    renderBoard(); // re-render to show highlights
                });
                
                pieceEl.addEventListener('dragend', () => {
                    pieceEl.classList.remove('dragging');
                });
                
                squareEl.appendChild(pieceEl);
            }

            // Drop zone logic
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

            // Click logic
            squareEl.addEventListener('click', () => handleSquareClick(squareId));
            
            boardEl.appendChild(squareEl);
        });
    });
    
    updateStatus();
    updateCapturedPieces();
    updateHistory();
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

resetBtn.addEventListener('click', () => {
    game.reset();
    resetTimers();
    selectedSquare = null;
    renderBoard();
    startTimer();
});

flipBtn.addEventListener('click', () => {
    boardFlipped = !boardFlipped;
    renderBoard();
});

updateTimerDisplay();
startTimer();
renderBoard();
