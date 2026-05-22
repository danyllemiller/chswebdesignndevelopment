// /js/guided-notes.js
import { db, auth, appId } from '/js/firebase-init.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// --- UTILITIES ---
function debounce(func, timeout = 1000) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap Tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(t => new bootstrap.Tooltip(t));

    // --- AUTO-SAVE LOGIC ---
    const noteId = window.location.pathname.replace(/[^a-z0-9]/gi, '_');
    const inputs = document.querySelectorAll('.user-input, .user-input-text, input, textarea, [contenteditable="true"]');

    const saveState = async (uid) => {
        const data = {};
        inputs.forEach((el, index) => {
            const key = el.id || el.name || `field_${index}`;
            data[key] = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? el.value : el.innerText;
        });
        try {
            await setDoc(doc(db, `artifacts/${appId}/users/${uid}/notes/${noteId}`), { ...data, lastSaved: Date.now() });
            console.log("✅ Auto-saved.");
        } catch (err) { console.error("❌ Auto-save failed:", err); }
    };

    const debouncedSave = debounce(saveState, 1500);

    onAuthStateChanged(auth, async (user) => {
        if (!user) return;
        
        // Load data
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/notes/${noteId}`);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                inputs.forEach((el, index) => {
                    const key = el.id || el.name || `field_${index}`;
                    if (data[key] !== undefined) {
                        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = data[key];
                        else el.innerText = data[key];
                    }
                });
                console.log("✅ Saved progress loaded.");
            }
        } catch (err) { console.warn("Could not load notes:", err); }

        // Attach auto-save
        inputs.forEach(el => el.addEventListener('input', () => debouncedSave(user.uid)));
    });
});

// --- VALIDATION ENGINE ---
window.checkSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.querySelectorAll('.user-input').forEach(input => {
        const correctVal = input.getAttribute('data-answer')?.toLowerCase().trim();
        const userVal = input.value.toLowerCase().trim();
        if (userVal === correctVal) { input.classList.remove('is-invalid'); input.classList.add('is-valid'); }
        else if (userVal !== "") { input.classList.remove('is-valid'); input.classList.add('is-invalid'); }
    });
};

window.checkAll = function() {
    document.querySelectorAll('.quest-section').forEach(section => { if (section.id) window.checkSection(section.id); });
};

// --- SCREENSHOT ENGINE ---
window.takeScreenshot = async function(contentId = 'worksheet-content') {
    const element = document.getElementById(contentId);
    if (!element) return;
    const uiToHide = document.querySelectorAll('.no-print');
    uiToHide.forEach(el => el.style.display = 'none');
    try {
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        const placeholder = document.getElementById('captured-image-placeholder');
        if (placeholder) { placeholder.innerHTML = ''; placeholder.appendChild(img); new bootstrap.Modal(document.getElementById('screenshotModal')).show(); }
    } finally { uiToHide.forEach(el => el.style.display = ''); }
};

// --- COPY TO NOTEBOOK (The Notebook Button) ---
// This handles your existing Copy to Notebook button
window.copyNotebookLogic = function() {
    const btn = document.getElementById('copyNotebookBtn');
    const worksheetContent = document.getElementById('worksheet-content');
    if (!worksheetContent) return;

    let rawHTML = worksheetContent.outerHTML;
    navigator.clipboard.writeText(rawHTML).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check me-1"></i> Copied!';
        btn.classList.replace('btn-primary', 'btn-success');
        setTimeout(() => { btn.innerHTML = originalText; btn.classList.replace('btn-success', 'btn-primary'); }, 3000);
    });
};

// --- NUCLEAR COPY (The "Copy Everything" Button) ---
window.copyWorksheetToClipboard = function() {
    const report = "Report generated from " + document.title + "\n\n" + 
                   Array.from(document.querySelectorAll('.quest-section')).map(s => {
                       return `[ ${s.querySelector('.section-title')?.innerText || "Section"} ]\n` + 
                       Array.from(s.querySelectorAll('input')).map(i => `Q: ${i.placeholder || 'Input'}\nA: ${i.value || 'Empty'}`).join('\n');
                   }).join('\n\n');
    
    navigator.clipboard.writeText(report).then(() => alert("Worksheet copied!"));
};