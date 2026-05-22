// --- WORD GAMES LOGIC ---
// Separated into distinct Crossword and Word Search Engines 
// to support Chapter 6, 7, and 10 calls.

// ==========================================
// 1. CROSSWORD ENGINE
// ==========================================
const CrosswordEngine = (() => {
    let vocabList = [];
    const CW_ROWS = 15;
    const CW_COLS = 15;
    let cwGridData = [];
    let placedWords = [];
    let currentWordIndex = -1; 

    function init(vocab) {
        vocabList = vocab || [];
        if (vocabList.length === 0) return;
        
        // Auto-start if grid exists
        if(document.getElementById('crosswordGrid')) {
            generateRandomCrossword();
        }
    }
    
    function giveHint() {
        if (currentWordIndex === -1) {
            alert("Select a clue or click on the grid first to get a hint!");
            return;
        }
        
        const wordData = placedWords[currentWordIndex];
        if (!wordData) return;
        
        for(let i=0; i<wordData.word.length; i++) {
            const r = wordData.dir === 'across' ? wordData.r : wordData.r + i;
            const c = wordData.dir === 'across' ? wordData.c + i : wordData.c;
            
            const input = document.querySelector(`.cw-cell input[data-row="${r}"][data-col="${c}"]`);
            if(input) {
                const correctChar = wordData.word[i].toUpperCase();
                if(input.value.toUpperCase() !== correctChar) {
                    input.value = correctChar;
                    input.style.backgroundColor = '#e0f7fa'; 
                    input.style.fontWeight = 'bold';
                    return; 
                }
            }
        }
        alert("This word is already complete!");
    }

    function generateRandomCrossword() {
        const gridEl = document.getElementById('crosswordGrid');
        if(!gridEl) return;
        
        cwGridData = Array(CW_ROWS).fill(null).map(() => Array(CW_COLS).fill(null));
        placedWords = [];
        let pool = [...vocabList].sort(() => Math.random() - 0.5);
        
        if (pool.length > 0) {
            const first = pool.pop();
            const r = Math.floor(CW_ROWS/2);
            const c = Math.floor((CW_COLS - first.word.length)/2);
            placeWord(first, r, c, 'across');
            placedWords.push({ ...first, r, c, dir: 'across', num: 1 });
        }
        
        let safety = 0;
        let maxTries = pool.length * 10; 
        while (pool.length > 0 && safety < maxTries) {
            const current = pool[0];
            let placed = false;
            for (let pw of placedWords) {
                if (placed) break;
                for (let i = 0; i < pw.word.length; i++) {
                    const charOnBoard = pw.word[i];
                    const boardR = pw.dir === 'across' ? pw.r : pw.r + i;
                    const boardC = pw.dir === 'across' ? pw.c + i : pw.c;
                    for (let j = 0; j < current.word.length; j++) {
                        if (current.word[j] === pw.word[i]) {
                            const newDir = pw.dir === 'across' ? 'down' : 'across';
                            const newR = newDir === 'down' ? boardR - j : boardR;
                            const newC = newDir === 'across' ? boardC - j : boardC;
                            if (canPlaceWord(current.word, newR, newC, newDir)) {
                                placeWord(current, newR, newC, newDir);
                                placedWords.push({ ...current, r: newR, c: newC, dir: newDir });
                                pool.shift(); placed = true; break;
                            }
                        }
                    }
                    if (placed) break;
                }
            }
            if (!placed) { pool.push(pool.shift()); safety++; } else { safety = 0; }
            if (pool.length === 0) break;
        }
        
        assignNumbersToGrid();
        renderCrossword();
    }

    function canPlaceWord(word, r, c, dir) {
        if (r < 0 || c < 0) return false;
        if (dir === 'across') {
            if (c + word.length > CW_COLS) return false;
            if (c > 0 && cwGridData[r][c-1] !== null) return false;
            if (c + word.length < CW_COLS && cwGridData[r][c+word.length] !== null) return false;
            for (let i = 0; i < word.length; i++) {
                const cell = cwGridData[r][c+i];
                if (cell !== null && cell.char !== word[i]) return false;
                if (cell === null) {
                    if (r > 0 && cwGridData[r-1][c+i] !== null) return false;
                    if (r < CW_ROWS-1 && cwGridData[r+1][c+i] !== null) return false;
                }
            }
        } else {
            if (r + word.length > CW_ROWS) return false;
            if (r > 0 && cwGridData[r-1][c] !== null) return false;
            if (r + word.length < CW_ROWS && cwGridData[r+word.length][c] !== null) return false;
            for (let i = 0; i < word.length; i++) {
                const cell = cwGridData[r+i][c];
                if (cell !== null && cell.char !== word[i]) return false;
                if (cell === null) {
                    if (c > 0 && cwGridData[r+i][c-1] !== null) return false;
                    if (c < CW_COLS-1 && cwGridData[r+i][c+1] !== null) return false;
                }
            }
        }
        return true;
    }

    function placeWord(vocabObj, r, c, dir) {
        for (let i = 0; i < vocabObj.word.length; i++) {
            const rr = dir === 'across' ? r : r + i;
            const cc = dir === 'across' ? c + i : c;
            if (!cwGridData[rr][cc]) cwGridData[rr][cc] = { char: vocabObj.word[i] };
        }
    }

    function assignNumbersToGrid() {
        let numCounter = 1;
        placedWords.forEach(pw => pw.num = 0);
        for(let r=0; r<CW_ROWS; r++) {
            for(let c=0; c<CW_COLS; c++) {
                let isStart = false;
                const wordsStartingHere = placedWords.filter(pw => pw.r === r && pw.c === c);
                if (wordsStartingHere.length > 0) {
                    isStart = true;
                    wordsStartingHere.forEach(pw => pw.num = numCounter);
                    if (cwGridData[r][c]) cwGridData[r][c].num = numCounter;
                }
                if(isStart) numCounter++;
            }
        }
    }

    function renderCrossword() {
        const gridEl = document.getElementById('crosswordGrid');
        const listAcross = document.getElementById('clue-list-across');
        const listDown = document.getElementById('clue-list-down');
        
        gridEl.innerHTML = ''; listAcross.innerHTML = ''; listDown.innerHTML = '';
        gridEl.style.gridTemplateColumns = `repeat(${CW_COLS}, 30px)`;
        gridEl.style.gridTemplateRows = `repeat(${CW_ROWS}, 30px)`;

        for (let r=0; r<CW_ROWS; r++) {
            for (let c=0; c<CW_COLS; c++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'cw-cell';
                const cellData = cwGridData[r][c];
                if (cellData) {
                    cellDiv.classList.add('active-cell');
                    const inp = document.createElement('input');
                    inp.maxLength = 1; 
                    inp.dataset.ans = cellData.char;
                    inp.dataset.row = r;
                    inp.dataset.col = c;
                    
                    inp.addEventListener('input', function() { if(this.value.length === 1) moveToNext(this); });
                    inp.addEventListener('keydown', function(e) { if(e.key === 'Backspace' && this.value === '') moveToPrev(this); });
                    inp.addEventListener('focus', function() { highlightClueFromCell(r, c); });
                    
                    cellDiv.appendChild(inp);
                    if (cellData.num) {
                        const n = document.createElement('span');
                        n.className = 'cw-num'; n.textContent = cellData.num;
                        cellDiv.appendChild(n);
                    }
                }
                gridEl.appendChild(cellDiv);
            }
        }
        
        placedWords.sort((a, b) => a.num - b.num);
        placedWords.forEach((pw, idx) => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${pw.num}.</strong> ${pw.clue}`;
            li.dataset.wordId = `${pw.num}-${pw.dir}`;
            li.onclick = () => { 
                currentWordIndex = idx; 
                focusGridAt(pw.r, pw.c); 
                highlightClue(li); 
            };
            if(pw.dir === 'across') listAcross.appendChild(li);
            else listDown.appendChild(li);
        });
    }

    function highlightClueFromCell(r, c) {
        const foundIdx = placedWords.findIndex(pw => {
            if (pw.dir === 'across') return pw.r === r && c >= pw.c && c < pw.c + pw.word.length;
            else return pw.c === c && r >= pw.r && r < pw.r + pw.word.length;
        });
        
        if (foundIdx !== -1) {
            currentWordIndex = foundIdx; 
            const w = placedWords[foundIdx];
            document.querySelectorAll('.active-clue').forEach(el => el.classList.remove('active-clue'));
            const listId = w.dir === 'across' ? 'clue-list-across' : 'clue-list-down';
            const item = document.getElementById(listId).querySelector(`li[data-word-id="${w.num}-${w.dir}"]`);
            if(item) {
                item.classList.add('active-clue');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    function highlightClue(li) {
        document.querySelectorAll('.active-clue').forEach(el => el.classList.remove('active-clue'));
        li.classList.add('active-clue');
    }

    function focusGridAt(r, c) {
        const inp = document.querySelector(`.cw-cell input[data-row="${r}"][data-col="${c}"]`);
        if(inp) inp.focus();
    }

    function moveToNext(inp) {
        if (currentWordIndex === -1) return; 
        const wordData = placedWords[currentWordIndex];
        const r = parseInt(inp.dataset.row);
        const c = parseInt(inp.dataset.col);
        let nextR = r, nextC = c;
        if (wordData.dir === 'across') nextC = c + 1; else nextR = r + 1;
        const nextInput = document.querySelector(`.cw-cell input[data-row="${nextR}"][data-col="${nextC}"]`);
        if (nextInput) nextInput.focus();
    }

    function moveToPrev(inp) {
        if (currentWordIndex === -1) return; 
        const wordData = placedWords[currentWordIndex];
        const r = parseInt(inp.dataset.row);
        const c = parseInt(inp.dataset.col);
        let prevR = r, prevC = c;
        if (wordData.dir === 'across') prevC = c - 1; else prevR = r - 1;
        const prevInput = document.querySelector(`.cw-cell input[data-row="${prevR}"][data-col="${prevC}"]`);
        if (prevInput) prevInput.focus();
    }

    function checkAnswers() {
        const inputs = document.querySelectorAll('.cw-cell input');
        let correct = 0; let total = inputs.length;
        inputs.forEach(inp => {
            if (inp.value.toUpperCase() === inp.dataset.ans) {
                inp.style.backgroundColor = '#d4edda'; correct++;
            } else if (inp.value) {
                inp.style.backgroundColor = '#f8d7da';
            }
        });
        const fb = document.getElementById('cw-feedback');
        if(fb) fb.textContent = correct === total ? "Perfect!" : `${correct}/${total} Correct`;
    }

    return { init, checkAnswers, generateRandomCrossword, giveHint };
})();


// ==========================================
// 2. WORD SEARCH ENGINE
// ==========================================
const WordSearchEngine = (() => {
    let vocabList = [];
    let wsGrid = [];
    let wsWords = [];
    let foundCount = 0;
    const GRID_SIZE = 15;
    const DIRECTIONS = [{dr:0,dc:1}, {dr:1,dc:0}, {dr:1,dc:1}, {dr:-1,dc:1}];
    
    // Selection state
    let isSelecting = false;
    let selectedCells = [];
    let startPos = null;

    function init(vocab) {
        vocabList = vocab || [];
        if (vocabList.length === 0) return;

        // Auto-start if grid exists
        if(document.getElementById('wsGrid')) {
            resetWordSearch();
        }
    }

    function resetWordSearch() {
        const gridEl = document.getElementById('wsGrid');
        const listEl = document.getElementById('wsClueList');
        const fb = document.getElementById('ws-feedback');
        if(!gridEl) return;
        
        gridEl.innerHTML = ''; 
        if(listEl) listEl.innerHTML = '';
        if(fb) fb.textContent = '';
        
        gridEl.style.gridTemplateColumns = `repeat(15, 30px)`;
        
        wsGrid = Array(15).fill(null).map(() => Array(15).fill(''));
        wsWords = [];
        foundCount = 0;
        
        let pool = [...vocabList].sort(() => Math.random() - 0.5);
        // Limit to reasonable amount if pool is huge
        pool = pool.slice(0, 15);
        
        pool.forEach(item => {
            let pos = {};
            if(placeWSWord(item.word, pos)) {
                wsWords.push({ ...item, startPos: pos });
                
                if(listEl) {
                    const li = document.createElement('li');
                    li.className = 'ws-clue-item';
                    li.textContent = item.clue;
                    li.id = `clue-${item.word}`;
                    li.onclick = () => highlightWSStart(item.word);
                    listEl.appendChild(li);
                }
            }
        });
        
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for(let r=0; r<GRID_SIZE; r++) {
            for(let c=0; c<GRID_SIZE; c++) {
                if(!wsGrid[r][c]) wsGrid[r][c] = letters[Math.floor(Math.random()*letters.length)];
                const d = document.createElement('div');
                d.className = 'ws-cell';
                d.textContent = wsGrid[r][c];
                d.dataset.r = r; d.dataset.c = c;
                
                d.onmousedown = (e) => { 
                    e.preventDefault(); // Prevent text selection
                    isSelecting=true; 
                    startPos={r,c}; 
                    highlightWS(r,c); 
                };
                d.onmouseover = (e) => { 
                    if(isSelecting) highlightWS(r,c); 
                };
                gridEl.appendChild(d);
            }
        }
        
        // Remove existing listener to prevent duplicates
        document.removeEventListener('mouseup', stopSelection);
        document.addEventListener('mouseup', stopSelection);
    }
    
    function stopSelection() {
        if(isSelecting) { 
            isSelecting=false; 
            checkWSWord(); 
        }
    }
    
    function highlightWSStart(targetWord) {
        const foundWord = wsWords.find(w => w.word === targetWord);
        if (foundWord && foundWord.startPos) {
            const r = foundWord.startPos.r;
            const c = foundWord.startPos.c;
            const cell = document.querySelector(`.ws-cell[data-r="${r}"][data-c="${c}"]`);
            if(cell) {
                const originalBg = cell.style.backgroundColor;
                cell.style.backgroundColor = '#ffc107'; 
                setTimeout(() => {
                     cell.style.backgroundColor = originalBg;
                }, 800);
            }
        }
    }

    function placeWSWord(word, outPos) {
        for(let i=0; i<50; i++) {
            const dir = DIRECTIONS[Math.floor(Math.random()*DIRECTIONS.length)];
            const r = Math.floor(Math.random()*GRID_SIZE);
            const c = Math.floor(Math.random()*GRID_SIZE);
            if(canPlaceWS(word, r, c, dir)) {
                for(let j=0; j<word.length; j++) wsGrid[r+j*dir.dr][c+j*dir.dc] = word[j];
                if(outPos) { outPos.r = r; outPos.c = c; }
                return true;
            }
        }
        return false;
    }

    function canPlaceWS(word, r, c, dir) {
        const endR = r + (word.length-1)*dir.dr;
        const endC = c + (word.length-1)*dir.dc;
        if(endR<0 || endR>=15 || endC<0 || endC>=15) return false;
        for(let i=0; i<word.length; i++) {
            const char = wsGrid[r+i*dir.dr][c+i*dir.dc];
            if(char !== '' && char !== word[i]) return false;
        }
        return true;
    }

    function highlightWS(r2, c2) {
        document.querySelectorAll('.ws-cell.selected').forEach(el => el.classList.remove('selected'));
        selectedCells = [];
        let dr = r2 - startPos.r; let dc = c2 - startPos.c;
        const len = Math.max(Math.abs(dr), Math.abs(dc));
        const stepR = dr === 0 ? 0 : dr/Math.abs(dr);
        const stepC = dc === 0 ? 0 : dc/Math.abs(dc);
        
        if(dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return;

        for(let i=0; i<=len; i++) {
            const r = startPos.r + i*stepR;
            const c = startPos.c + i*stepC;
            const el = document.querySelector(`.ws-cell[data-r="${r}"][data-c="${c}"]`);
            if(el) { el.classList.add('selected'); selectedCells.push(el); }
        }
    }

    function checkWSWord() {
        const text = selectedCells.map(c => c.textContent).join('');
        const found = wsWords.find(w => w.word === text) || wsWords.find(w => w.word === text.split('').reverse().join(''));
        
        if(found) {
            selectedCells.forEach(c => c.classList.add('found'));
            const cl = document.getElementById(`clue-${found.word}`);
            if(cl && !cl.classList.contains('found-clue')) {
                cl.classList.add('found-clue');
                cl.style.textDecoration = 'line-through';
                cl.style.color = '#ccc';
                foundCount++;
                const fb = document.getElementById('ws-feedback');
                if(fb && foundCount === wsWords.length) fb.textContent = "ALL FOUND!";
            }
        }
        document.querySelectorAll('.ws-cell.selected').forEach(el => el.classList.remove('selected'));
    }

    return { init, resetWordSearch };
})();

// Provide a unified "WordGames" object for jeopardyWeb2.html compatibility if needed
// AND global access to engines for Chapter 6/7/10
window.CrosswordEngine = CrosswordEngine;
window.WordSearchEngine = WordSearchEngine;
// Alias for legacy support if needed
window.WordGames = {
    init: function(vocab) {
        CrosswordEngine.init(vocab);
        WordSearchEngine.init(vocab);
    },
    checkCrosswordAnswers: CrosswordEngine.checkAnswers,
    generateRandomCrossword: CrosswordEngine.generateRandomCrossword,
    resetWordSearch: WordSearchEngine.resetWordSearch,
    giveHint: CrosswordEngine.giveHint
};