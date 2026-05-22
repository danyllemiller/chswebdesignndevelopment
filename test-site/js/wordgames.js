// ======================================================
// 5. WORD GAMES ENGINE
// ======================================================
window.WordGames = (() => {
    const safeEscape = (str) => {
        if (typeof window.escapeHTML === 'function') return window.escapeHTML(str);
        if (typeof str !== 'string') return str;
        if (str.includes('&lt;') || str.includes('<code>')) return str; 
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    function setup() {
        const data = window.currentChapterData;
        if (!data || !data.vocabList) return;
        
        const seen = new Set();
        const mapped = [];
        
        data.vocabList.forEach(v => {
            const word = (v.term || v.word).toUpperCase().replace(/[^A-Z]/g, '');
            if (word.length >= 3 && word.length <= 15 && !seen.has(word)) {
                seen.add(word);
                mapped.push({ word, clue: safeEscape(v.def || v.clue) });
            }
        });

        if (mapped.length === 0) {
            console.error("WordGames Error: No valid vocabulary words found after filtering.");
            return;
        }

        if (document.getElementById('ws-grid')) initWS(mapped);
        if (document.getElementById('cw-grid')) initCW(mapped);
    }

    function initWS(vocab) {
        const gridEl = document.getElementById('ws-grid');
        if(!gridEl) return;
        
        const col = gridEl.closest('[class*="col-"]');
        if (col) {
            col.className = 'col-12 mb-5';
        }
        
        const wrapper = gridEl.parentElement;
        const size = 15, grid = Array(size).fill().map(() => Array(size).fill('')), wordLocations = {};
        const shuffled = [...vocab].sort(() => 0.5 - Math.random()).slice(0, 15);
        const dirs = [[0,1],[1,0],[1,1],[-1,1]]; 
        
        shuffled.forEach(v => {
            let placed = false, att = 0;
            while(!placed && att < 100) {
                const [dr, dc] = dirs[Math.floor(Math.random()*dirs.length)];
                const r = Math.floor(Math.random()*(size - (dr < 0 ? -dr : dr) * v.word.length));
                const c = Math.floor(Math.random()*(size - dc * v.word.length));
                
                if (r >= 0 && r + (v.word.length - 1) * dr >= 0 && r + (v.word.length - 1) * dr < size &&
                    c >= 0 && c + (v.word.length - 1) * dc >= 0 && c + (v.word.length - 1) * dc < size) {
                    
                    let ok = true; 
                    for(let i=0; i<v.word.length; i++) {
                        if(grid[r+i*dr][c+i*dc]!=='' && grid[r+i*dr][c+i*dc]!==v.word[i]) ok=false;
                    }
                    if(ok) { 
                        const locs = []; 
                        for(let i=0; i<v.word.length; i++) { 
                            grid[r+i*dr][c+i*dc]=v.word[i]; 
                            locs.push(`${r+i*dr}-${c+i*dc}`); 
                        } 
                        wordLocations[v.word] = locs; 
                        placed=true; 
                    }
                } 
                att++;
            }
        });

        for(let r=0; r<size; r++) {
            for(let c=0; c<size; c++) {
                if(grid[r][c]==='') grid[r][c]="ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random()*26)];
            }
        }

        wrapper.innerHTML = `
            <div class="w-100">
                <h2 class="game-title text-center mb-4 pt-4 mt-2" style="color: var(--primary-color); border-top: 2px solid var(--tertiary-color);">Vocabulary Search</h2>
                <div class="row g-4 w-100 m-0">
                    <div class="col-lg-8 col-xl-9 p-0 pe-lg-4 d-flex justify-content-center align-items-start">
                        <div class="card shadow-sm rounded-4 p-2 w-100" style="background-color: var(--primary-color); border: 2px solid var(--tertiary-color); max-width: 80vh;">
                            <div style="width: 100%; position: relative; padding-bottom: 100%;">
                                <div id="ws-grid" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: repeat(${size}, minmax(0, 1fr)); grid-template-rows: repeat(${size}, minmax(0, 1fr)); gap: 2px; touch-action: none;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-lg-4 col-xl-3 p-0">
                        <div class="card shadow-sm rounded-4 w-100 flex-grow-1" style="border: 2px solid var(--tertiary-color); max-height: 80vh; overflow: hidden;">
                            <div class="card-header text-center fw-bold fs-5" style="background-color: var(--primary-color); color: var(--secondary-color); border-bottom: 2px solid var(--tertiary-color);">
                                Find These Words
                            </div>
                            
                            <div class="p-2 text-center" style="background-color: var(--secondary-color); border-bottom: 2px solid var(--tertiary-color);">
                                <button type="button" class="btn btn-sm py-1 px-4 fw-bold shadow-sm" onclick="location.reload()" style="background-color: var(--quaternary-color); color: var(--primary-color); border: none; touch-action: manipulation;">🔄 Reset Search</button>
                            </div>

                            <div class="card-body p-3" style="overflow-y: auto; background-color: white;">
                                <ul id="ws-clues" class="list-unstyled mb-0 d-flex flex-column gap-2"></ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        const newGrid = document.getElementById('ws-grid'), newList = document.getElementById('ws-clues');
        
        newGrid.innerHTML = grid.flat().map((l, idx) => `
            <div class="ws-cell d-flex align-items-center justify-content-center fw-bold" data-row="${Math.floor(idx/size)}" data-col="${idx%size}" style="background-color: white; color: var(--primary-color); font-size: clamp(10px, 3vmin, 24px); cursor: pointer; user-select: none; width: 100%; height: 100%; min-width: 0; min-height: 0; overflow: hidden; transition: background-color 0.2s;">${l}</div>
        `).join('');
        
        shuffled.forEach(v => {
            if (!wordLocations[v.word]) return; 
            const li = document.createElement('li'); 
            li.dataset.word = v.word;
            li.innerHTML = `<div class="clue-item p-2 rounded text-start shadow-sm" style="background-color: var(--secondary-color); color: var(--primary-color); border: 1px solid var(--tertiary-color); font-size: clamp(12px, 1.1vw, 15px); line-height: 1.3; cursor: pointer; transition: all 0.2s;">${v.clue}</div>`;
            
            li.onclick = () => { 
                const locs = wordLocations[v.word]; 
                if(locs && locs.length > 0) { 
                    const [r, c] = locs[0].split('-'); 
                    const cell = newGrid.querySelector(`.ws-cell[data-row="${r}"][data-col="${c}"]`); 
                    if(cell) {
                        const wasFound = cell.classList.contains('found');
                        const wasSelected = cell.classList.contains('selected');
                        
                        cell.style.backgroundColor = 'var(--file-name-color)';
                        cell.style.color = 'white';
                        
                        setTimeout(() => { 
                            if (wasFound) {
                                cell.style.backgroundColor = 'var(--code-color)';
                                cell.style.color = 'white';
                            } else if (wasSelected) {
                                cell.style.backgroundColor = 'var(--tertiary-color)';
                                cell.style.color = 'white';
                            } else {
                                cell.style.backgroundColor = 'white';
                                cell.style.color = 'var(--primary-color)';
                            }
                        }, 1000); 
                    }
                } 
            };
            newList.appendChild(li);
        });

        let isDragging = false, startCell = null, selectedCells = [];

        const clearSelection = () => {
            newGrid.querySelectorAll('.ws-cell.selected').forEach(c => {
                c.classList.remove('selected');
                if (c.classList.contains('found')) {
                    c.style.backgroundColor = 'var(--code-color)';
                    c.style.color = 'white';
                } else {
                    c.style.backgroundColor = 'white';
                    c.style.color = 'var(--primary-color)';
                }
            });
            selectedCells = [];
        };

        const startDrag = (cell) => {
            isDragging = true; 
            startCell = cell; 
            clearSelection();
            
            cell.classList.add('selected');
            cell.style.backgroundColor = 'var(--tertiary-color)';
            cell.style.color = 'white';
            selectedCells.push(cell);
        };

        const moveDrag = (cell) => {
            if(!isDragging || !startCell || !cell) return;
            const r1 = parseInt(startCell.dataset.row), c1 = parseInt(startCell.dataset.col);
            const r2 = parseInt(cell.dataset.row), c2 = parseInt(cell.dataset.col);
            const dr = r2-r1, dc = c2-c1;
            
            if(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) {
                clearSelection();
                const steps = Math.max(Math.abs(dr), Math.abs(dc));
                const sR = steps === 0 ? 0 : dr/steps;
                const sC = steps === 0 ? 0 : dc/steps;
                for(let i=0; i<=steps; i++){ 
                    const t = newGrid.querySelector(`.ws-cell[data-row="${Math.round(r1+i*sR)}"][data-col="${Math.round(c1+i*sC)}"]`); 
                    if(t) { 
                        t.classList.add('selected'); 
                        t.style.backgroundColor = 'var(--tertiary-color)';
                        t.style.color = 'white';
                        selectedCells.push(t); 
                    } 
                }
            }
        };

        const endDrag = () => {
            if(!isDragging) return; 
            isDragging = false;
            if (selectedCells.length === 0) return;
            
            const word = selectedCells.map(c => c.textContent).join('');
            const rev = word.split('').reverse().join('');
            let found = false;

            shuffled.forEach(v => { 
                if(word===v.word || rev===v.word) { 
                    selectedCells.forEach(c => { 
                        c.classList.add('found'); 
                        c.classList.remove('selected');
                        c.style.backgroundColor = 'var(--code-color)';
                        c.style.color = 'white';
                    }); 
                    const clueLi = newList.querySelector(`li[data-word="${v.word}"] .clue-item`);
                    if (clueLi) {
                        clueLi.style.textDecoration = 'line-through';
                        clueLi.style.opacity = '0.5';
                        clueLi.style.backgroundColor = 'transparent';
                        clueLi.style.border = 'none';
                        clueLi.style.boxShadow = 'none';
                    }
                    found = true;
                } 
            });
            
            if (!found) {
                clearSelection();
            }
        };

        newGrid.onmousedown = (e) => e.preventDefault();
        newGrid.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('ws-cell')) startDrag(e.target);
        });
        newGrid.addEventListener('mousemove', (e) => {
            if (e.target.classList.contains('ws-cell')) moveDrag(e.target);
        });
        window.addEventListener('mouseup', endDrag);

        newGrid.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('ws-cell')) {
                e.preventDefault(); 
                startDrag(e.target);
            }
        }, { passive: false });

        newGrid.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault(); 
            const touch = e.touches[0];
            const cell = document.elementFromPoint(touch.clientX, touch.clientY);
            if (cell && cell.classList.contains('ws-cell')) {
                moveDrag(cell);
            }
        }, { passive: false });

        window.addEventListener('touchend', endDrag);
    }

    function initCW(vocab) {
        const gridEl = document.getElementById('cw-grid');
        if(!gridEl) return;
        
        const col = gridEl.closest('[class*="col-"]');
        if (col) {
            col.className = 'col-12 mb-5';
        }
        
        const wrapper = gridEl.parentElement;
        const size = 15, grid = Array(size).fill().map(() => Array(size).fill(null)), wordsInGrid = [];
        const shuffled = [...vocab].sort(() => 0.5 - Math.random());
        const sorted = [...shuffled].sort((a,b)=>b.word.length-a.word.length);
        let activeWord = null, activeDir = 'across';

        function canPlaceStrict(word, r, c, dir) {
            if(r < 0 || c < 0 || (dir === 'across' && c + word.length > size) || (dir === 'down' && r + word.length > size)) return false;
            if(dir === 'across') { if(c > 0 && grid[r][c-1] !== null) return false; if(c + word.length < size && grid[r][c + word.length] !== null) return false; }
            else { if(r > 0 && grid[r-1][c] !== null) return false; if(r + word.length < size && grid[r + word.length][c] !== null) return false; }
            let intersect = false;
            for(let i=0; i<word.length; i++) {
                const cr = dir === 'down' ? r + i : r, cc = dir === 'across' ? c + i : c;
                if(grid[cr][cc] !== null) { if(grid[cr][cc] !== word[i]) return false; intersect = true; }
                else { const adj = dir === 'across' ? [[-1,0],[1,0]] : [[0,-1],[0,1]]; for(let [drx, dcx] of adj) { if(cr+drx>=0 && cr+drx<size && cc+dcx>=0 && cc+dcx<size && grid[cr+drx][cc+dcx]!==null) return false; } }
            } return intersect;
        }

        const first = sorted.shift();
        const startR = Math.floor(size/2), startC = Math.floor((size - first.word.length) / 2);
        for(let i=0; i<first.word.length; i++) grid[startR][startC+i] = first.word[i];
        wordsInGrid.push({word: first.word, clue: first.clue, dir: 'across', r: startR, c: startC, cells: first.word.split('').map((_,i)=>({r:startR, c:startC+i}))});

        let placedCount = 0;
        let attempts = 0;
        do {
            placedCount = 0;
            for(let vIdx = 0; vIdx < sorted.length; vIdx++) {
                let v = sorted[vIdx];
                if (wordsInGrid.some(w => w.word === v.word)) continue;
                
                let placed = false;
                for(let ex of wordsInGrid) {
                    for(let i=0; i<ex.word.length; i++) {
                        for(let j=0; j<v.word.length; j++) {
                            if(ex.word[i] === v.word[j]) {
                                const dir = ex.dir === 'across' ? 'down' : 'across';
                                const nr = dir === 'down' ? ex.r - j : ex.r + i;
                                const nc = dir === 'across' ? ex.c - j : ex.c + i;
                                if(canPlaceStrict(v.word, nr, nc, dir)) { 
                                    for(let k=0; k<v.word.length; k++) grid[dir==='down'?nr+k:nr][dir==='across'?nc+k:nc] = v.word[k]; 
                                    wordsInGrid.push({word:v.word, clue:v.clue, dir, r:nr, c:nc, cells:v.word.split('').map((_,k)=>({r:dir==='down'?nr+k:nr, c:dir==='across'?nc+k:nc}))}); 
                                    placed = true; placedCount++; break; 
                                }
                            }
                        } if(placed) break;
                    } if(placed) break;
                }
            }
            attempts++;
        } while (placedCount > 0 && attempts < 5);

        const starts = [];
        wordsInGrid.forEach(w => { const ex = starts.find(s => s.r === w.r && s.c === w.c); if(!ex) { starts.push({r: w.r, c: w.c, num: starts.length + 1}); w.num = starts.length; } else { w.num = ex.num; } });
        
        wrapper.innerHTML = `
            <div class="w-100">
                <h2 class="game-title text-center mb-4 pt-4 mt-2" style="color: var(--primary-color); border-top: 2px solid var(--tertiary-color);">Vocabulary Crossword</h2>
                <div class="row g-4 w-100 m-0">
                    <div class="col-lg-8 col-xl-9 p-0 pe-lg-4 d-flex justify-content-center align-items-start">
                        <div class="card shadow-sm rounded-4 p-2 w-100" style="background-color: var(--primary-color); border: 2px solid var(--tertiary-color); max-width: 80vh;">
                            <div style="width: 100%; position: relative; padding-bottom: 100%;">
                                <div id="cw-grid" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: repeat(${size}, minmax(0, 1fr)); grid-template-rows: repeat(${size}, minmax(0, 1fr)); gap: 2px;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-lg-4 col-xl-3 p-0">
                        <div class="card shadow-sm rounded-4 w-100 flex-grow-1" style="border: 2px solid var(--tertiary-color); max-height: 80vh; overflow: hidden;">
                            <div class="card-header text-center fw-bold fs-5" style="background-color: var(--primary-color); color: var(--secondary-color); border-bottom: 2px solid var(--tertiary-color);">
                                Crossword Clues
                            </div>
                            
                            <div class="p-2 text-center" style="background-color: var(--secondary-color); border-bottom: 2px solid var(--tertiary-color);">
                                <button type="button" class="btn btn-sm py-1 px-4 fw-bold shadow-sm" onclick="location.reload()" style="background-color: var(--quaternary-color); color: var(--primary-color); border: none; touch-action: manipulation;">🔄 Reset Crossword</button>
                            </div>

                            <div class="card-body p-3" style="overflow-y: auto; background-color: white;">
                                <div class="d-flex flex-column gap-3" id="cw-clues-container">
                                    <div>
                                        <h6 class="fw-bold text-uppercase pb-1 mb-2" style="color: var(--primary-color); border-bottom: 2px solid var(--tertiary-color);">Across</h6>
                                        <ul id="cw-clues-across" class="list-unstyled mb-0 d-flex flex-column gap-2"></ul>
                                    </div>
                                    <div>
                                        <h6 class="fw-bold text-uppercase pb-1 mb-2" style="color: var(--primary-color); border-bottom: 2px solid var(--tertiary-color);">Down</h6>
                                        <ul id="cw-clues-down" class="list-unstyled mb-0 d-flex flex-column gap-2"></ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        const newGrid = document.getElementById('cw-grid');
        const acrossList = document.getElementById('cw-clues-across');
        const downList = document.getElementById('cw-clues-down');
        
        newGrid.innerHTML = Array(size).fill().map((_,r)=>Array(size).fill().map((_,c)=>{ 
            const sn = starts.find(s=>s.r===r && s.c===c); 
            return `<div class="cw-cell position-relative d-flex align-items-center justify-content-center" style="background-color: ${grid[r][c] ? 'white' : 'transparent'}; width: 100%; height: 100%; min-width: 0; min-height: 0; overflow: hidden;">
                ${sn?`<span class="position-absolute top-0 start-0 text-dark fw-bold" style="font-size: clamp(8px, 1.5vmin, 14px); line-height: 1; padding: 2px; z-index: 2;">${sn.num}</span>`:''}
                ${grid[r][c]?`<input type="text" maxlength="1" class="border-0 text-center w-100 h-100 fw-bold p-0 m-0" style="background-color: transparent; color: var(--primary-color); font-size: clamp(14px, 3.5vmin, 28px); text-transform: uppercase; min-width: 0; min-height: 0; outline: none; z-index: 1;" data-row="${r}" data-col="${c}" data-ans="${grid[r][c]}">`:''}
            </div>`; 
        }).join('')).join('');
        
        ['across', 'down'].forEach(d => {
            const group = wordsInGrid.filter(w => w.dir === d).sort((a,b) => a.num - b.num);
            const targetList = d === 'across' ? acrossList : downList;
            
            if(group.length > 0) {
                group.forEach(w => {
                    const li = document.createElement('li'); 
                    li.className = "clue-item p-2 rounded text-start shadow-sm"; 
                    li.style.cssText = "background-color: var(--secondary-color); color: var(--primary-color); border: 1px solid var(--tertiary-color); font-size: clamp(12px, 1.1vw, 15px); line-height: 1.3; cursor: pointer;";
                    li.innerHTML = `<strong>${w.num}.</strong> ${w.clue}`;
                    li.onclick = () => {
                        activeWord = w; activeDir = w.dir;
                        
                        let missing = w.cells.find(cell => {
                            const el = newGrid.querySelector(`input[data-row="${cell.r}"][data-col="${cell.c}"]`);
                            return el && el.value === "";
                        });
                        
                        const targetCell = missing || w.cells[0];
                        const inp = newGrid.querySelector(`input[data-row="${targetCell.r}"][data-col="${targetCell.c}"]`);
                        
                        if(inp) {
                            if(missing) { 
                                inp.value = inp.dataset.ans; 
                                inp.style.color = 'var(--code-color)'; 
                            }
                            const ev = new Event('input', { bubbles: true }); 
                            inp.dispatchEvent(ev); 
                            inp.focus();
                        }
                    };
                    targetList.appendChild(li);
                });
            }
        });

        newGrid.querySelectorAll('input').forEach(inp => {
            inp.onfocus = function() { 
                const r = parseInt(this.dataset.row), c = parseInt(this.dataset.col); 
                const matches = wordsInGrid.filter(w => w.cells.some(cell => cell.r === r && cell.c === c)); 
                activeWord = matches.find(w => w.dir === activeDir) || matches[0]; 
                if (activeWord) activeDir = activeWord.dir; 
            };
            inp.onkeydown = function(e) { 
                if (e.key === 'Backspace' && this.value === "") { 
                    const r = parseInt(this.dataset.row), c = parseInt(this.dataset.col); 
                    const idx = activeWord?.cells.findIndex(cell => cell.r === r && cell.c === c); 
                    if (idx > 0) { 
                        const prevInp = newGrid.querySelector(`input[data-row="${activeWord.cells[idx-1].r}"][data-col="${activeWord.cells[idx-1].c}"]`); 
                        if (prevInp) { prevInp.value = ""; prevInp.focus(); e.preventDefault(); } 
                    } 
                } 
            };
            inp.oninput = function() {
                const val = this.value.toUpperCase();
                if(val !== "") {
                    if (val === this.dataset.ans) {
                        this.style.color = 'var(--code-color)';
                    } else {
                        this.style.color = 'var(--file-name-color)';
                    }

                    const r = parseInt(this.dataset.row), c = parseInt(this.dataset.col); 
                    const idx = activeWord?.cells.findIndex(cell => cell.r === r && cell.c === c);
                    
                    let next = activeWord?.cells.slice(idx + 1).find(cell => {
                        const el = newGrid.querySelector(`input[data-row="${cell.r}"][data-col="${cell.c}"]`);
                        return el && el.value === "";
                    });
                    
                    if(next) { 
                        newGrid.querySelector(`input[data-row="${next.r}"][data-col="${next.c}"]`)?.focus(); 
                    } else {
                        const sameDir = wordsInGrid.filter(w => w.dir === activeDir).sort((a,b)=>a.num-b.num);
                        const nextWord = sameDir[sameDir.indexOf(activeWord) + 1];
                        
                        let jump = nextWord?.cells.find(cell => {
                            const el = newGrid.querySelector(`input[data-row="${cell.r}"][data-col="${cell.c}"]`);
                            return el && el.value === "";
                        });

                        if (!jump) {
                            const otherDir = activeDir === 'across' ? 'down' : 'across';
                            const otherGroup = wordsInGrid.filter(w => w.dir === otherDir).sort((a,b)=>a.num-b.num);
                            for (let nW of otherGroup) { 
                                jump = nW.cells.find(cell => {
                                    const el = newGrid.querySelector(`input[data-row="${cell.r}"][data-col="${cell.c}"]`);
                                    return el && el.value === "";
                                }); 
                                if (jump) { activeDir = otherDir; activeWord = nW; break; } 
                            }
                        } else { 
                            activeWord = nextWord; 
                        }
                        if (jump) newGrid.querySelector(`input[data-row="${jump.r}"][data-col="${jump.c}"]`)?.focus();
                    }
                }
            };
        });
    }
    
    return { setup, init: setup };
})();