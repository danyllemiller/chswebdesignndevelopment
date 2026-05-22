// js/admin/admin-notebooks.js
/**
 * Teacher Admin Digital Notebooks Controller
 */

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db, appId } from "/js/firebase-init.js";

let roster = [];
let allNotes = [];
let currentChapterTab = "";
let activeStudent = null;

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

onAuthStateChanged(auth, async (user) => {
    if (!user || user.isAnonymous) {
        window.location.replace("/login.html?redirect=" + encodeURIComponent(window.location.pathname));
        return;
    }

    const username = user.email.split('@')[0];
    
    if (MASTER_WHITELIST.includes(username)) {
        loadRoster();
        return;
    }

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'roster'), where("username", "==", username));
    const snap = await getDocs(q);
    
    let isTeacher = false;
    snap.forEach(d => { if(d.data().period === "Teacher") isTeacher = true; });
    
    if (!isTeacher) {
        alert("Security Alert: This area is restricted to Teacher accounts only.");
        window.location.replace("/index.html");
    } else {
        loadRoster();
    }
});

// --- FETCH ROSTER ---
async function loadRoster() {
    try {
        const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'roster'));
        roster = [];
        
        snap.forEach(doc => {
            const data = doc.data();
            if (data.period !== "Teacher") {
                // THE FIX: Robust data mapping identical to the Gradebook
                const realId = data.studentId || (data.id && String(data.id).length < 15 ? data.id : null) || 'Pending Setup';
                roster.push({ 
                    ...data, 
                    docId: doc.id,
                    displaySchoolId: realId,
                    id: data.studentId || data.uid || doc.id,
                    lastName: data.lastName || 'Unknown',
                    firstName: data.firstName || 'Student',
                    period: data.period || 'Unassigned'
                });
            }
        });
        
        roster.sort((a, b) => a.lastName.localeCompare(b.lastName));
        
        // THE FIX: BRUTE FORCE URL CATCHER
        // Ignores standard parsing and manually extracts the exact string from the browser URL to bypass any encoding bugs
        const currentUrl = window.location.href;
        let targetStudentId = null;
        if (currentUrl.includes('student=')) {
            targetStudentId = currentUrl.split('student=')[1].split('&')[0].split('#')[0].trim();
        }
        
        if (targetStudentId) {
            // Ensure the period filter shows "All" so the student isn't accidentally hidden
            document.getElementById('periodFilter').value = 'All';
        }

        renderStudentList();
        
        // Target Student Auto-Load Logic
        if (targetStudentId) {
            // Aggressive match against ANY possible ID field
            const targetStudent = roster.find(s => 
                String(s.id) === targetStudentId || 
                String(s.uid) === targetStudentId || 
                String(s.studentId) === targetStudentId ||
                String(s.docId) === targetStudentId ||
                String(s.displaySchoolId) === targetStudentId
            );
            
            if (targetStudent) {
                // 1. Immediately force the data load bypassing the DOM
                loadStudentNotebook(targetStudent);
                
                // 2. Add visual highlighting to the list and scroll them into view
                setTimeout(() => {
                    const allItems = Array.from(document.querySelectorAll('.student-item'));
                    const targetEl = allItems.find(el => el.dataset.studentId === String(targetStudent.id));
                    
                    if (targetEl) {
                        // Reset all active states
                        document.querySelectorAll('.student-item').forEach(el => {
                            el.classList.remove('active');
                            const nameEl = el.querySelector('.student-name');
                            const userEl = el.querySelector('.student-username');
                            if (nameEl) nameEl.classList.add('text-dark');
                            if (userEl) userEl.classList.replace('text-light', 'text-muted');
                        });
                        
                        // Set Active
                        targetEl.classList.add('active');
                        const targetName = targetEl.querySelector('.student-name');
                        const targetUser = targetEl.querySelector('.student-username');
                        if (targetName) targetName.classList.remove('text-dark');
                        if (targetUser) targetUser.classList.replace('text-muted', 'text-light');
                        
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300); // 300ms ensures DOM has totally finished rendering the sidebar list
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
        item.dataset.studentId = String(student.id); // Ensure string for strict matching
        
        const syncWarning = !(student.uid || student.docId) ? `<i class="fas fa-exclamation-circle text-warning ms-2" title="Needs to log in to sync account"></i>` : '';

        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <strong class="mb-0 text-dark student-name">${escapeHtml(student.lastName)}, ${escapeHtml(student.firstName)} ${syncWarning}</strong>
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
        // Make sure the quotes don't break the HTML attribute
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
    
    // Generate the accurate tabs for this specific student!
    renderChapterTabs(student);
    
    const targetUid = student.uid || student.docId || student.id;

    document.getElementById('displayStudentName').innerText = `${student.firstName} ${student.lastName}`;
    document.getElementById('displayStudentPeriod').innerText = student.period;
    document.getElementById('displayStudentUser').innerText = `ID: ${student.displaySchoolId}`;
    
    const noteListEl = document.getElementById('noteList');
    const emptyMsg = document.getElementById('emptyNotesMsg');
    const syncMsg = document.getElementById('syncWarningMsg');
    document.getElementById('previewFrame').srcdoc = ''; 
    document.getElementById('previewCategory').innerText = "Select a Note";
    
    // Fallback: If they have a valid ID but it's not strictly 'uid', allow them through
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
        // Look up the notebook securely using the resolved UID
        const notesRef = collection(db, 'artifacts', appId, 'users', targetUid, 'notebook');
        const snapshot = await getDocs(notesRef);
        
        allNotes = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.chapter) data.chapter = "Chapter 1"; 
            allNotes.push({ id: doc.id, ...data });
        });
        
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
    
    // FIX: NO STYLES IN JS. All Design is pulled from the CSS file linked via the head.
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