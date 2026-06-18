/**
 * CHS Web Design - Digital Notebook Controller (MariaDB)
 * ---------------------------------------------------------------------
 * Dedicated controller for the student-notes.html page.
 * Handles the rich text editor and note sidebar.
 * Uses MariaDB API endpoints only (no Firebase).
 */

(function() {
    const patch = function(original) {
        return function(selector) {
            if (typeof selector === 'string' && selector.includes(',')) {
                const cleaned = selector.split(',').map(s => s.trim()).filter(s => s.length > 0).join(', ');
                if (cleaned !== selector) selector = cleaned === '' ? 'nothing_to_select' : cleaned;
            }
            try { return original.call(this, selector); }
            catch (e) { return document.createDocumentFragment().querySelectorAll('*'); }
        };
    };
    Document.prototype.querySelectorAll = patch(Document.prototype.querySelectorAll);
    Element.prototype.querySelectorAll = patch(Element.prototype.querySelectorAll);
})();

let currentChapterTab = "1: Developer's World";
let currentStudentData = null;
let allNotes = [];
let activeNoteId = null;
let autoSaveTimer = null;

const dom = {
    list: document.getElementById('note-list'),
    form: document.getElementById('note-form'),
    title: document.getElementById('note-title'),
    content: document.getElementById('note-content'),
    preview: document.getElementById('preview-frame'),
    count: document.getElementById('note-count')
};

function getLocalSessionUser() {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

function getActiveUserId() {
    const localUser = getLocalSessionUser();
    return (
        localUser?.student_id ||
        localUser?.studentId ||
        currentStudentData?.student_id ||
        currentStudentData?.studentId ||
        currentStudentData?.userId ||
        null
    );
}

function getCurrentChapterSelection() {
    const activeBtn = document.querySelector('.chapter-tab-btn.active');
    return activeBtn?.dataset?.chapter || activeBtn?.textContent?.trim() || currentChapterTab || "1: Developer's World";
}

function chapterLabelFromId(chapterId) {
    const units = getUnitLabels();
    const idx = Number(chapterId) - 1;
    return units[idx] || `Chapter ${chapterId}`;
}

function chapterIdFromLabel(label) {
    const n = Number(String(label || '').split(':')[0]);
    return Number.isInteger(n) && n > 0 ? n : 1;
}

function getUnitLabels() {
    return [
        "1: Developer's World", "2: The \"Rules\"", "3: The Blueprint", "4: UI/UX Design",
        "5: The \"Bones\"", "6: The \"Clothes\"", "7: Advanced Layout", "8: Sights & Sounds",
        "9: The \"Brains\"", "10: Advanced JavaScript", "11: The Cloud", "12: The \"Manager\"",
        "13: The \"Network\"", "14: The \"Brain\"", "15: The Future", "16: The \"Launch\""
    ];
}

// Ensure chapter tabs render immediately on page load
function ensureNotebookUIBootstrapped() {
    const tabsContainer = document.getElementById('chapterTabsContainer');
    if (!tabsContainer) return;
    const hasPlaceholder = /Syncing course roadmap/i.test(tabsContainer.textContent || "");
    if (hasPlaceholder || tabsContainer.children.length <= 1) {
        initNotebookUI();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(ensureNotebookUIBootstrapped, 0));
} else {
    setTimeout(ensureNotebookUIBootstrapped, 0);
}

// Stop form refresh on Save
if (dom.form) {
    dom.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const didSave = await saveNoteData();
            if (!didSave) return;

            const saveBtn = document.getElementById('btn-save');
            if (saveBtn) {
                const originalHtml = saveBtn.innerHTML;
                saveBtn.innerHTML = '<i class="fas fa-check me-2"></i>Saved!';
                saveBtn.classList.replace('btn-success', 'btn-primary');
                setTimeout(() => {
                    saveBtn.innerHTML = originalHtml;
                    saveBtn.classList.replace('btn-primary', 'btn-success');
                }, 2000);
            }
        } catch (err) {
            console.error("Save failed:", err);
            alert("Unable to save right now. Please try again.");
        }
    });
}

if (dom.title) dom.title.addEventListener('input', triggerAutoSave);
const categorySelect = document.getElementById('note-category');
if (categorySelect) categorySelect.addEventListener('change', triggerAutoSave);

function extractAutoTitle(htmlString, titleElement, defaultTitleString) {
    if (!titleElement) return;
    const current = titleElement.value.trim();
    const isDefault = current === '' || current === defaultTitleString || current === 'New Entry Title' || current.startsWith('Note: ');
    if (isDefault) {
        const parser = new DOMParser();
        const parsed = parser.parseFromString(htmlString, 'text/html');
        const heading = parsed.querySelector('h1, h2, h3, h4');
        if (heading && heading.textContent.trim()) {
            titleElement.value = heading.textContent.trim().substring(0, 80);
        } else if (current === '' || current === defaultTitleString || current === 'New Entry Title') {
            const now = new Date();
            titleElement.value = "Note: " + now.toLocaleDateString() + " " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }
}

// Initialization (MariaDB/session based)
async function initializeNotebook() {
    try {
        const localUser = getLocalSessionUser();
        currentStudentData = localUser || {};
            if (typeof setupToolbars !== 'undefined' && typeof setupTemplatesAndHTML !== 'undefined') {
                initNotebookUI();
            } else {
                console.warn('Notebook helpers unavailable; delaying setup until toolbar functions are initialized.');
                setTimeout(initNotebookUI, 50);
            }
        await fetchNotes();
    } catch (e) {
        console.error("Notebook Init Error:", e);
        showEmptyState();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNotebook);
} else {
    initializeNotebook();
}

function initNotebookUI() {
    const tabsContainer = document.getElementById('chapterTabsContainer');
    const units = getUnitLabels();

    if (tabsContainer) {
        tabsContainer.innerHTML = units.map((ch) =>
            `<button class="chapter-tab-btn ${ch === currentChapterTab ? 'active' : ''}" data-chapter="${ch.replace(/"/g, '"')}">${ch}</button>`
        ).join('');
    }

    const firstChapter = units[0];
    currentChapterTab = firstChapter;
    const firstBtn = document.querySelector('.chapter-tab-btn[data-chapter]');
    if (firstBtn) {
        document.querySelectorAll('.chapter-tab-btn').forEach(b => b.classList.remove('active'));
        firstBtn.classList.add('active');
        currentChapterTab = firstBtn.dataset.chapter || firstChapter;
    }

    const listTitle = document.getElementById('list-chapter-title');
    if (listTitle) listTitle.innerText = currentChapterTab;

    setupToolbars();
    setupTemplatesAndHTML();
}

function showEmptyState() {
    if (dom.form) dom.form.classList.add('d-none');
    let empty = document.getElementById('notebook-empty-state');
    if (!empty) {
        empty = document.createElement('div');
        empty.id = 'notebook-empty-state';
        empty.className = 'text-center p-5 text-muted bg-white mt-5 shadow-sm border rounded';
        empty.innerHTML = `
            <i class="fas fa-edit fa-3x mb-3 opacity-25 text-primary"></i>
            <h5 class="fw-bold text-dark mt-2">No note selected yet</h5>
            <p class="small text-muted mb-1">Click <span class="text-primary fw-bold" style="cursor: pointer; text-decoration: underline;" id="empty-state-new-btn">Create New Entry</span> to begin.</p>
            <p class="small text-muted mb-0">Then enter a real title in <strong>Entry Title</strong> (example: <em>What are we learning today?</em>).</p>
        `;
        if (dom.form && dom.form.parentNode) dom.form.parentNode.appendChild(empty);

        const btn = document.getElementById('empty-state-new-btn');
        if (btn) btn.onclick = () => window.prepareNewNote();
    }
    if (empty) empty.classList.remove('d-none');
}

function hideEmptyState() {
    if (dom.form) dom.form.classList.remove('d-none');
    const empty = document.getElementById('notebook-empty-state');
    if (empty) empty.classList.add('d-none');
}

window.prepareNewNote = function() {
    activeNoteId = null;
    if (dom.form) dom.form.reset();
    if (dom.content) dom.content.value = `<h2></h2><p>Start writing your notes here...</p>`;
    if (dom.title) dom.title.value = ``;

    hideEmptyState();
    updatePreview();
    renderNoteList();

    setTimeout(() => {
        if (dom.title) {
            dom.title.focus();
            dom.title.setSelectionRange(dom.title.value.length, dom.title.value.length);
            return;
        }
        if (dom.preview?.contentWindow) {
            dom.preview.contentWindow.document.body.focus();
        }
    }, 150);
};
window.addEventListener('prepareNewNote', window.prepareNewNote);

function renderNoteList() {
    const filtered = allNotes.filter(n => n.chapter === currentChapterTab);
    if (dom.count) dom.count.innerText = filtered.length;
    if (filtered.length === 0) {
        if (dom.list) dom.list.innerHTML = `<li class="list-group-item p-4 text-center text-muted"><i class="fas fa-book-open mb-2 fs-3 opacity-50"></i><p class="small fw-bold mb-0">No notes in this unit.</p></li>`;
        return;
    }

    if (dom.list) {
        dom.list.innerHTML = filtered.map(note => {
            const badge = note.category === 'Worksheet' ? 'bg-success' : (note.category === 'Do Now' ? 'bg-danger' : 'bg-primary');
            return `
            <li class="list-group-item note-list-item ${note.id === activeNoteId ? 'active shadow-sm' : ''} p-3 border-start-0 border-end-0" data-id="${note.id}" style="cursor:pointer; transition: background-color 0.2s;">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <strong class="text-truncate d-block text-dark pe-2" style="max-width: 85%; font-size: 1.05rem;">${note.title}</strong>
                    <button type="button" class="btn btn-sm text-danger p-0 delete-note-btn opacity-75 hover-opacity-100" data-id="${note.id}" title="Permanently Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="badge ${badge}">${note.category}</span>
                    <small class="text-muted fw-bold" style="font-size: 0.75rem;">${new Date(note.timestamp).toLocaleDateString()}</small>
                </div>
            </li>`;
        }).join('');
    }
}

async function fetchNotes() {
    const userId = getActiveUserId();
    if (!userId) {
        console.warn("fetchNotes skipped: student id not available yet.");
        showEmptyState();
        return;
    }

    try {
        const chapterNumber = chapterIdFromLabel(currentChapterTab);
        const response = await fetch(`/api/student/notebook?student_id=${encodeURIComponent(userId)}&chapter_id=${chapterNumber}`);
        if (!response.ok) throw new Error(`Fetch notes failed with status ${response.status}`);
        const payload = await response.json();

        allNotes = (payload.entries || []).map((n) => ({
            id: String(n.id),
            title: n.title || 'Untitled Note',
            chapter: chapterLabelFromId(n.chapter_id || chapterNumber),
            category: n.category || 'Notes',
            content: n.content || '',
            timestamp: n.timestamp || Date.now()
        })).sort((a, b) => b.timestamp - a.timestamp);

        renderNoteList();

        const currentNote = allNotes.find(n => n.id === activeNoteId && n.chapter === currentChapterTab);
        if (!currentNote && activeNoteId !== null) {
            activeNoteId = null;
            showEmptyState();
        } else if (activeNoteId === null) {
            showEmptyState();
        }
    } catch (err) {
        console.warn("Notebook read unavailable, showing empty state.", err);
        allNotes = [];
        renderNoteList();
        showEmptyState();
    }
}

window.syncFromIframe = function(htmlContent) {
    if (dom.content) {
        dom.content.value = htmlContent;
        extractAutoTitle(htmlContent, dom.title, 'New Entry Title');
        triggerAutoSave();
    }
};

function updatePreview() {
    if (!dom.preview || !dom.content) return;
    const src = `<!DOCTYPE html><html><head><style>:root{--primary:#000099;--secondary:#cfe1f0;--accent:var(--tertiary-color,#E07A5F);}body{font-family:sans-serif;padding:25px;color:#333;line-height:1.6;}h2,h3,h4{color:var(--primary);border-bottom:2px solid var(--secondary);padding-bottom:5px;margin-top:0;}.donow{background:#fffcf0;border-left:5px solid #ffc107;padding:15px;margin:15px 0;border-radius:4px;}.worksheet{font-family:monospace;background:#f8f9fa;padding:15px;border:1px solid #ddd;}</style><script>function sync(){if(window.parent && window.parent.syncFromIframe){window.parent.syncFromIframe(document.body.innerHTML);}}document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();document.execCommand('undo');sync();}});</script></head><body contenteditable="true" oninput="sync()">${dom.content.value}</body></html>`;
    dom.preview.srcdoc = src;
}

async function saveNoteData() {
    const userId = getActiveUserId();
    if (!userId) {
        alert("Still connecting your account. Please wait a moment and try Save again.");
        return false;
    }

    const titleVal = (dom.title?.value || "").trim();
    if (!titleVal) {
        alert("Please enter a title before saving.");
        return false;
    }

    const isPlaceholderTitle = titleVal === "New Entry Title" || titleVal.startsWith("Note: ");
    if (!activeNoteId && isPlaceholderTitle) {
        alert("Please enter a real note title before saving.");
        if (dom.title) dom.title.focus();
        return false;
    }

    const selectedChapter = getCurrentChapterSelection();
    currentChapterTab = selectedChapter;

    const payload = {
        id: activeNoteId || null,
        student_id: userId,
        chapter_id: chapterIdFromLabel(selectedChapter),
        title: titleVal,
        category: document.getElementById('note-category')?.value || "Notes",
        content: dom.content ? dom.content.value : ""
    };

    const response = await fetch('/api/student/notebook/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Save failed with status ${response.status}`);

    const result = await response.json();
    if (result?.id) activeNoteId = String(result.id);

    await fetchNotes();
    hideEmptyState();
    return true;
}

function triggerAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        // Autosave intentionally disabled to avoid accidental write storms.
        // Manual save via Save button is authoritative.
    }, 1500);
}

function setupToolbars() {
    if (document.getElementById('rich-text-toolbar')) return;
    const rt = document.createElement('div');
    rt.id = 'rich-text-toolbar';
    rt.className = 'd-flex flex-wrap p-2 bg-light border border-bottom-0 rounded-top align-items-center';
    rt.innerHTML = `
        <div class="btn-group me-2 shadow-sm"><button type="button" class="btn btn-sm btn-light border-secondary rt-btn" data-command="undo"><i class="fas fa-undo"></i></button><button type="button" class="btn btn-sm btn-light border-secondary rt-btn" data-command="redo"><i class="fas fa-redo"></i></button></div>
        <div class="btn-group me-2 shadow-sm"><button type="button" class="btn btn-sm btn-light border-secondary rt-btn" data-command="bold"><i class="fas fa-bold"></i></button><button type="button" class="btn btn-sm btn-light border-secondary rt-btn" data-command="italic"><i class="fas fa-italic"></i></button><button type="button" class="btn btn-sm btn-light border-secondary rt-btn" data-command="underline"><i class="fas fa-underline"></i></button></div>
        <div class="btn-group me-2 shadow-sm"><button type="button" class="btn btn-sm btn-light border-secondary rt-btn fw-bold" data-command="formatBlock" data-val="H2">H1</button><button type="button" class="btn btn-sm btn-light border-secondary rt-btn fw-bold" data-command="formatBlock" data-val="H3">H2</button></div>
        <div class="btn-group me-2 shadow-sm"><button type="button" class="btn btn-sm btn-light border-secondary rt-btn" data-command="insertUnorderedList"><i class="fas fa-list-ul"></i></button><button type="button" class="btn btn-sm btn-light border-secondary rt-btn" data-command="insertOrderedList"><i class="fas fa-list-ol"></i></button></div>
        <div class="btn-group shadow-sm"><button type="button" class="btn btn-sm btn-light border-secondary rt-btn text-warning" data-command="hiliteColor" data-val="#fff200"><i class="fas fa-highlighter"></i></button><button type="button" class="btn btn-sm btn-light border-secondary rt-btn text-danger" data-command="removeFormat"><i class="fas fa-eraser"></i></button></div>`;

    dom.preview.parentElement.insertBefore(rt, dom.preview);
    rt.querySelectorAll('.rt-btn').forEach(btn => btn.onclick = () => {
        if (!dom.preview?.contentWindow) return;
        dom.preview.contentWindow.document.execCommand(btn.dataset.command, false, btn.dataset.val || null);
        dom.preview.contentWindow.focus();
        if (dom.content) {
            dom.content.value = dom.preview.contentWindow.document.body.innerHTML;
            extractAutoTitle(dom.content.value, dom.title, 'New Entry Title');
            triggerAutoSave();
        }
    });

    const saveBtn = document.getElementById('btn-save');
    if (saveBtn && !document.getElementById('btn-delete-bottom')) {
        const wrap = document.createElement('div');
        wrap.className = 'd-flex gap-3 mt-4 w-100 pt-3 border-top';
        saveBtn.replaceWith(wrap);
        const del = document.createElement('button');
        del.type = 'button';
        del.id = 'btn-delete-bottom';
        del.className = 'btn text-white fw-bold shadow-sm px-4';
        del.style.backgroundColor = 'var(--tertiary-color, #e07a5f)';
        del.innerHTML = '<i class="fas fa-trash-alt me-2"></i> Delete Note';
        wrap.appendChild(del);
        wrap.appendChild(saveBtn);
        saveBtn.className += " flex-grow-1";

        del.onclick = async () => {
            const userId = getActiveUserId();
            if (!userId) {
                alert("Your account is still connecting. Please try again in a moment.");
                return;
            }

            if (activeNoteId) {
                if (confirm("Are you sure you want to permanently delete this note from the database?")) {
                    const response = await fetch('/api/student/notebook/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: activeNoteId, student_id: userId })
                    });
                    if (!response.ok) throw new Error(`Delete failed with status ${response.status}`);
                    activeNoteId = null;
                    await fetchNotes();
                    showEmptyState();
                }
            } else if (confirm("Discard this new unsaved note?")) {
                activeNoteId = null;
                showEmptyState();
            }
        };
    }
};

function setupTemplatesAndHTML() {
    const btnHtmlTemplate = document.getElementById('tpl-html');
    if (btnHtmlTemplate && btnHtmlTemplate.parentNode && !document.getElementById('btn-toggle-code')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'btn-toggle-code';
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn btn-outline-dark fw-bold';
        toggleBtn.innerHTML = '<i class="fas fa-code"></i> HTML';
        btnHtmlTemplate.parentNode.appendChild(toggleBtn);
        toggleBtn.onclick = () => {
            const rtToolbar = document.getElementById('rich-text-toolbar');
            if (dom.content && dom.content.classList.contains('d-none')) {
                dom.content.classList.remove('d-none', 'form-control');
                dom.content.classList.add('notebook-textarea', 'w-100', 'd-block', 'mb-3');
                toggleBtn.classList.replace('btn-outline-dark', 'btn-dark');
                if (rtToolbar) rtToolbar.classList.add('d-none');
                if (dom.preview) dom.preview.style.height = '300px';
            } else if (dom.content) {
                dom.content.classList.add('d-none', 'form-control');
                dom.content.classList.remove('notebook-textarea', 'w-100', 'd-block', 'mb-3');
                toggleBtn.classList.replace('btn-dark', 'btn-outline-dark');
                if (rtToolbar) rtToolbar.classList.remove('d-none');
                if (dom.preview) dom.preview.style.height = '500px';
            }
        };
    }

    const worksheetBtn = document.getElementById('tpl-worksheet');
    if (worksheetBtn) {
        worksheetBtn.onclick = () => {
            if (dom.content) dom.content.value = `<div class="worksheet"><h3>Worksheet</h3><p>Paste or type content here.</p></div>`;
            updatePreview();
            triggerAutoSave();
        };
    }

    if (dom.content) {
        const syncHtmlToPreview = () => {
            extractAutoTitle(dom.content.value, dom.title, 'New Entry Title');
            try {
                if (dom.preview && dom.preview.contentWindow && dom.preview.contentWindow.document && dom.preview.contentWindow.document.body) {
                    dom.preview.contentWindow.document.body.innerHTML = dom.content.value;
                }
            } catch (e) {
                console.warn("Iframe sync issue:", e);
            }
            triggerAutoSave();
        };

        dom.content.addEventListener('input', syncHtmlToPreview);
        dom.content.addEventListener('change', syncHtmlToPreview);
        dom.content.addEventListener('paste', () => setTimeout(syncHtmlToPreview, 50));
    }
};

document.body.addEventListener('click', async (e) => {
    if (e.target.classList.contains('chapter-tab-btn')) {
        document.querySelectorAll('.chapter-tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentChapterTab = e.target.dataset.chapter || e.target.textContent.trim();
        const listTitle = document.getElementById('list-chapter-title');
        if (listTitle) listTitle.innerText = `${currentChapterTab}`;
        activeNoteId = null;
        await fetchNotes();
        return;
    }

    const deleteBtn = e.target.closest('.delete-note-btn');
    if (deleteBtn) {
        e.stopPropagation();
        const userId = getActiveUserId();
        if (!userId) {
            alert("Your account is still connecting. Please try again in a moment.");
            return;
        }

        if (confirm("Are you sure you want to permanently delete this note?")) {
            const noteId = deleteBtn.dataset.id;
            const response = await fetch('/api/student/notebook/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: noteId, student_id: userId })
            });
            if (!response.ok) throw new Error(`Delete failed with status ${response.status}`);

            if (activeNoteId === noteId) {
                activeNoteId = null;
                showEmptyState();
            }
            await fetchNotes();
        }
        return;
    }

    const item = e.target.closest('.note-list-item');
    if (item) {
        const note = allNotes.find(x => x.id === item.dataset.id);
        if (!note) return;
        activeNoteId = note.id;
        if (dom.title) dom.title.value = note.title;
        if (dom.content) dom.content.value = note.content;

        const category = document.getElementById('note-category');
        if (category && note.category) category.value = note.category;

        hideEmptyState();
        updatePreview();
        renderNoteList();
    }
});
