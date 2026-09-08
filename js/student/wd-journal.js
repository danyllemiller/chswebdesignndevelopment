const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// The reflection prompt is stored as "[WPR 1.1.1] question text" when it
// came from the Workplace Readiness bank (see server/wprQuestionBank.js) --
// pulled apart here just to show the standard as its own small badge rather
// than leaving the bracket tag inline in the sentence.
function splitPrompt(promptText) {
    const m = /^\[WPR ([\d.]+)\]\s*(.*)$/.exec(promptText || '');
    if (m) return { standard: m[1], text: m[2] };
    return { standard: null, text: promptText || '' };
}

async function loadJournal() {
    const list = document.getElementById('journalList');
    let user;
    try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { user = {}; }
    if (!user.student_id) {
        list.innerHTML = '<div class="journal-empty">You must be logged in to see your journal.</div>';
        return;
    }

    try {
        const res = await fetch(`/api/student/wd-journal?student_id=${encodeURIComponent(user.student_id)}`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        const entries = data.entries || [];

        if (entries.length === 0) {
            list.innerHTML = '<div class="journal-empty"><i class="fas fa-feather-pointed mb-2 fs-3 d-block"></i>Nothing here yet — your journal fills in as you clock out each day.</div>';
            return;
        }

        list.innerHTML = entries.map(entry => {
            const dateObj = new Date(entry.entry_date + 'T00:00:00');
            const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            const { standard, text } = splitPrompt(entry.prompt);
            return `
                <div class="journal-entry">
                    <div class="journal-date">${escapeHtml(dateLabel)}${standard ? `<span class="journal-standard">WPR ${escapeHtml(standard)}</span>` : ''}</div>
                    ${text ? `<div class="journal-prompt">${escapeHtml(text)}</div>` : ''}
                    <div class="journal-content">${escapeHtml(entry.content)}</div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Failed to load journal:', err);
        list.innerHTML = '<div class="journal-empty text-danger">Could not load your journal. Try refreshing the page.</div>';
    }
}

window.addEventListener('DOMContentLoaded', loadJournal);
