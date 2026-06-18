// js/admin/admin-notebooks.js
/**
 * Teacher Admin Digital Notebooks Controller
 * MariaDB Transition Version
 */

let roster = [];
let allNotes = [];
let currentChapterTab = "";
let activeStudent = null;

// --- Auth Guard Pattern ---
function waitForAuth(timeout = 8000) {
    return new Promise((resolve) => {
        if (window.dacAuthData) { resolve(window.dacAuthData); return; }
        const handler = () => { resolve(window.dacAuthData); };
        document.addEventListener('authComplete', handler, { once: true });
        setTimeout(() => {
            document.removeEventListener('authComplete', handler);
            resolve({ isAuthenticated: false, isTeacher: false });
        }, timeout);
    });
}

// --- Course maps to dynamically generate the correct tab names! ---
const wdUnits = [
    "1: Developer's World", "2: The \"Rules\"", "3: The Blueprint", "4: UI/UX Design",
    "5: The \"Bones\"", "6: The \"Clothes\"", "7: Advanced Layout", "8: Sights & Sounds",
    "9: The \"Brains\"", "10: Advanced JavaScript", "11: The Cloud", "12: The \"Manager\"",
    "13: The \"Network\"", "14: The \"Brain\"", "15: The Future", "16: The \"Launch\""
];

const csUnits = [
    "1: How Computers Work", "2: Essential Computer Skills", "3: Intro to Office Software",
    "4: How the Internet Works", "5: Cybersecurity Threats", "6: Defending Systems",
    "7: The Language of Computers", "8: Storing Data", "9: Mastering Spreadsheets",
    "10: Computational Modeling", "11: Problem Solving & Algorithms", "12: Control Structures & Events",
    "13: Advanced Data", "14: Modularity & Procedures", "15: Software Dev Lifecycle",
    "16: Ethics, Privacy, and the Law", "17: Culture, Equity, and Bias", "18: AI & Cross-Disciplinary",
    "19: Semester Capstone"
];

// --- SECURITY GUARD ---
const MASTER_WHITELIST = ['damiller'];

async function init() {
    const authData = await waitForAuth();

    if (!authData.isAuthenticated) {
        window.location.replace("/login.html?redirect=" + encodeURIComponent(window.location.pathname));
        return;
    }

    if (!authData.isTeacher) {
        alert("Security Alert: This area is restricted to Teacher accounts only.");
        window.location.replace("/index.html");
        return;
    }

    loadRoster();
}

// --- FETCH ROSTER ---
async function loadRoster() {
    try {
        const response = await fetch('/api/admin/notebooks/roster');
        if (!response.ok) throw new Error('Failed to fetch roster');
        const data = await response.json();

        roster = data.map(student => ({
            ...student,
            docId: student.student_id,
            displaySchoolId: student.student_id,
            id: student.student_id,
            lastName: student.last_name || 'Unknown',
            firstName: student.first_name || 'Student',
            period: student.section_id || 'Unassigned'
        }));

        roster.sort((a, b) => a.lastName.localeCompare(b.lastName));

        // BRUTE FORCE URL CATCHER
        const currentUrl = window.location.href;
        let targetStudentId = null;
        if (currentUrl.includes('student=')) {
            targetStudentId = currentUrl.split('student=')[1].split('&')[0].split('#')[0].trim();
        }

        if (targetStudentId) {
            document.getElementById('periodFilter').value = 'All';
        }

        renderStudentList();

        // Target Student Auto-Load Logic
        if (targetStudentId) {
            const targetStudent = roster.find(s =>
                String(s.id) === targetStudentId ||
                String(s.student_id) === targetStudentId ||
                String(s.docId) === targetStudentId ||
                String(s.displaySchoolId) === targetStudentId
            );

            if (targetStudent) {
                loadStudentNotebook(targetStudent);

                setTimeout(() => {
                    const allItems = Array.from(document.querySelectorAll('.student-item'));
                    const targetEl = allItems.find(el => el.dataset.studentId === String(targetStudent.id));

                    if (targetEl) {
                        document.querySelectorAll('.student-item').forEach(el => {
                            el.classList.remove('active');
                            const nameEl = el.querySelector('.student-name');
                            const userEl = el.querySelector('.student-username');
                            if (nameEl) nameEl.classList.add('text-dark');
                            if (userEl) userEl.classList.replace('text-light', 'text-muted');
                        });

                        targetEl.classList.add('active');
                        const targetName = targetEl.querySelector('.student-name');
                        const targetUser = targetEl.querySelector('.student-username');
                        if (targetName) targetName.classList.remove('text-dark');
                        if (targetUser) targetUser.classList.replace('text-muted', 'text-light');

                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            } else {
                console.warn("Student ID from URL not found in roster:", targetStudentId);
            }
        }

    } catch (error) {
        document.getElementById('studentList').innerHTML = `<div class="alert alert-danger m-3">Failed to load roster: ${error.message}</div>`;
    }
}

// --- RENDER SIDEBAR ---
function renderStudentList() {
    const listEl = document.getElementById('studentList');
    const filter = document.getElementById('periodFilter').value;

    listEl.innerHTML = '';
    let count = 0;

    roster.forEach(student => {
        if (filter !== 'All') {
            if (filter === 'All-WD1' && (!student.period || !student.period.startsWith('WD1'))) return;
            else if (filter === 'All-WD2' && (!student.period || !student.period.startsWith('WD2'))) return;
            else if (filter === 'All-CS' && (!student.period || !student.period.startsWith('CS'))) return;
            else if (!filter.startsWith('All-') && student.period !== filter) return;
        }

        count++;

        const item = document.createElement('a');
        item.className = 'list-group-item list-group-item-action student-item p-3 border-bottom';
        item.dataset.studentId = String(student.id);

        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <strong class="mb-0 text-dark student-name">${escapeHtml(student.lastName)}, ${escapeHtml(student.firstName)}</strong>
                <span class="badge bg-secondary">${escapeHtml(student.period)}</span>
            </div>
            <small class="text-muted d-block mt-1 student-username"><i class="fas fa-id-card me-1 opacity-50"></i> ${escapeHtml(student.displaySchoolId)}</small>
        `;

        item.addEventListener('click', (e) => {
            document.querySelectorAll('.student-item').forEach(el => {
                el.classList.remove('active');
            });

            item.classList.add('active');
            loadStudentNotebook(student);
        });

        listEl.appendChild(item);
    });

    if (count === 0) {
        listEl.innerHTML = `<div class="p-4 text-center text-muted">No students found in this period.</div>`;
    }
}

document.getElementById('periodFilter').addEventListener('change', renderStudentList);

// --- DYNAMICALLY INITIALIZE CHAPTER TABS BASED ON STUDENT COURSE ---
function renderChapterTabs(student) {
    const tabsContainer = document.getElementById('chapterTabsContainer');
    const isCS = student.period && student.period.startsWith("CS");
    const units = isCS ? csUnits : wdUnits;

    let tabsHtml = '';
    units.forEach((chName, i) => {
        const activeClass = i === 0 ? 'active' : '';
        const safeName = chName.replace(/"/g, '&quot;');
        tabsHtml += `<button class="chapter-tab-btn ${activeClass}" data-chapter="${safeName}">Ch ${i+1}</button>`;
    });

    tabsContainer.innerHTML = tabsHtml;
    currentChapterTab = units[0];

    document.querySelectorAll('.chapter-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.chapter-tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentChapterTab = e.target.dataset.chapter;
            if (activeStudent) {
                renderNotes();
            }
        });
    });
}

// --- FETCH STUDENT'S NOTEBOOK ---
async function loadStudentNotebook(student) {
    activeStudent = student;
    document.getElementById('welcomeScreen').classList.add('d-none');
    document.getElementById('notebookScreen').classList.remove('d-none');

    renderChapterTabs(student);

    const targetUid = student.id || student.student_id;

    document.getElementById('displayStudentName').innerText = `${student.firstName} ${student.lastName}`;
    document.getElementById('displayStudentPeriod').innerText = student.period;
    document.getElementById('displayStudentUser').innerText = `ID: ${student.displaySchoolId}`;

    const noteListEl = document.getElementById('noteList');
    const emptyMsg = document.getElementById('emptyNotesMsg');
    const syncMsg = document.getElementById('syncWarningMsg');
    document.getElementById('previewFrame').srcdoc = '';
    document.getElementById('previewCategory').innerText = "Select a Note";

    if (!targetUid) {
        syncMsg.classList.remove('d-none');
        emptyMsg.classList.add('d-none');
        noteListEl.innerHTML = '';
        allNotes = [];
        return;
    } else {
        syncMsg.classList.add('d-none');
    }

    noteListEl.innerHTML = '<div class="p-4 text-center text-primary fw-bold"><div class="spinner-border spinner-border-sm mb-2"></div><br>Fetching Cloud Data...</div>';
    emptyMsg.classList.add('d-none');

    try {
        const response = await fetch(`/api/admin/notebooks/entries?student_id=${encodeURIComponent(targetUid)}`);
        if (!response.ok) throw new Error('Failed to fetch notebook entries');
        const data = await response.json();

        allNotes = data.map(entry => ({
            id: entry.entry_id,
            title: entry.title || 'Untitled',
            content: entry.content || '',
            category: entry.category || 'Note',
            chapter: entry.chapter || 'Chapter 1',
            timestamp: entry.created_at ? new Date(entry.created_at).getTime() : Date.now()
        }));

        allNotes.sort((a, b) => b.timestamp - a.timestamp);
        renderNotes();

    } catch (err) {
        console.error("Error loading notebook:", err);
        noteListEl.innerHTML = `<div class="alert alert-danger m-3 small fw-bold">Permission Denied or Error reading database.</div>`;
    }
}

// --- RENDER NOTES LIST FOR CHAPTER ---
function renderNotes() {
    const noteListEl = document.getElementById('noteList');
    const emptyMsg = document.getElementById('emptyNotesMsg');

    const filteredNotes = allNotes.filter(n => n.chapter === currentChapterTab);

    if (filteredNotes.length === 0) {
        emptyMsg.classList.remove('d-none');
        noteListEl.innerHTML = '';
        document.getElementById('previewFrame').srcdoc = '';
        document.getElementById('previewCategory').innerText = "None";
        return;
    }

    emptyMsg.classList.add('d-none');
    let html = '';

    filteredNotes.forEach(note => {
        const dateObj = new Date(note.timestamp);
        const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });

        let badgeClass = 'bg-primary';
        if (note.category === 'Do Now') badgeClass = 'bg-danger';
        if (note.category === 'Exit Ticket') badgeClass = 'bg-warning text-dark';
        if (note.category === 'Worksheet') badgeClass = 'bg-success';

        html += `
            <li class="list-group-item note-list-item p-3" onclick="previewNote(event, '${note.id}')">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <strong class="text-truncate d-block text-dark" style="max-width: 75%;">${escapeHtml(note.title)}</strong>
                    <span class="badge ${badgeClass}" style="font-size: 0.65rem;">${escapeHtml(note.category)}</span>
                </div>
                <small class="text-muted" style="font-size: 0.75rem;"><i class="far fa-clock me-1"></i> ${dateStr}</small>
            </li>
        `;
    });

    noteListEl.innerHTML = html;

    if(filteredNotes.length > 0) {
        const firstNoteId = filteredNotes[0].id;
        setTimeout(() => {
            const firstEl = noteListEl.querySelector('.note-list-item');
            if(firstEl) previewNote({ currentTarget: firstEl }, firstNoteId);
        }, 50);
    }
}

// --- RENDER NOTE IN IFRAME ---
window.previewNote = function(event, noteId) {
    document.querySelectorAll('.note-list-item').forEach(el => el.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;

    document.getElementById('previewCategory').innerText = note.category;

    const srcDoc = `
        <!DOCTYPE html>
        <html>
        <head>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"/>
            <link href="/css/student-pages.css" rel="stylesheet" />
        </head>
        <body class="iframe-preview-body">
            ${note.content}
        <a href="#" class="back-to-top text-decoration-none" title="Back to Top">🚀</a>
        </body>
        </html>
    `;

    document.getElementById('previewFrame').srcdoc = srcDoc;
}

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Start the app
init();
