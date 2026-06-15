const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const flipBtn = document.getElementById('flipBtn');
const whiteTimerEl = document.getElementById('whiteTimer');
const blackTimerEl = document.getElementById('blackTimer');

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

// Unicode chess pieces
const piecesMap = {
    'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
    'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'
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

function renderBoard() {
    boardEl.innerHTML = '';
    const board = game.board(); // Returns 2D array [8][8] (rank 8 to 1)
    
    // Determine ranks and files iteration based on flip state
    const ranks = boardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const files = boardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    ranks.forEach((r, rowIndex) => {
        files.forEach((f, colIndex) => {
            const squareEl = document.createElement('div');
            
            // Standard algebraic notation (e.g., a8, e4)
            const fileChar = String.fromCharCode('a'.charCodeAt(0) + f);
            const rankChar = 8 - r;
            const squareId = `${fileChar}${rankChar}`;
            
            // Determine square color
            const isLight = (f + r) % 2 === 0;
            squareEl.className = `square ${isLight ? 'light' : 'dark'}`;
            squareEl.dataset.square = squareId;

            // Highlight selected square
            if (selectedSquare === squareId) {
                squareEl.classList.add('selected');
            }

            // Highlight legal moves
            if (selectedSquare) {
                const moves = game.moves({ square: selectedSquare, verbose: true });
                if (moves.some(m => m.to === squareId)) {
                    squareEl.classList.add('highlight');
                }
            }

            // Place piece
            const piece = board[r][f];
            if (piece) {
                const pieceSymbol = piece.color === 'w' ? piecesMap[piece.type.toUpperCase()] : piecesMap[piece.type];
                squareEl.innerHTML = `<span class="piece">${pieceSymbol}</span>`;
            }

            // Add interaction
            squareEl.addEventListener('click', () => handleSquareClick(squareId));
            
            boardEl.appendChild(squareEl);
        });
    });
    
    updateStatus();
}

function handleSquareClick(square) {
    if (game.game_over()) return;

    // If a square is already selected, try to move
    if (selectedSquare) {
        let moves = game.moves({ square: selectedSquare, verbose: true });
        let move = moves.find(m => m.to === square);

        if (move) {
            // Check for promotion (auto-promote to Queen for simplicity in minimal UI)
            let moveObj = { from: selectedSquare, to: square };
            if (move.flags.includes('p') || move.flags.includes('cp')) {
                moveObj.promotion = 'q';
            }
            game.move(moveObj);
            selectedSquare = null;
            switchActiveColor(game.turn());
        } else {
            // If clicking another piece of the same color, select it instead
            const piece = game.get(square);
            if (piece && piece.color === game.turn()) {
                selectedSquare = square;
            } else {
                selectedSquare = null; // Deselect
            }
        }
    } else {
        // Select a piece if it belongs to the current player
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
            selectedSquare = square;
        }
    }
    renderBoard();
}

function updateStatus() {
    let status = '';
    let moveColor = game.turn() === 'w' ? 'White' : 'Black';

    if (game.in_checkmate()) {
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

// Initial render
renderBoard();
