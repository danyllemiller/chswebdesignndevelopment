const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function splitPrompt(promptText) {
    const m = /^\[WPR ([\d.]+)\]\s*(.*)$/.exec(promptText || '');
    if (m) return { standard: m[1], text: m[2] };
    return { standard: null, text: promptText || '' };
}

async function loadRoster() {
    const select = document.getElementById('studentSelect');
    try {
        const res = await fetch('/api/admin/roster');
        const data = await res.json();
        const roster = (data.roster || data || [])
            .filter(s => s.student_id && s.first_name && s.last_name && (s.section_id === 'A1' || s.section_id === 'B2'))
            .sort((a, b) => a.last_name.localeCompare(b.last_name));

        select.innerHTML = '<option value="">Select a student...</option>' + roster.map(s =>
            `<option value="${s.student_id}">${escapeHtml(s.last_name)}, ${escapeHtml(s.first_name)} (${escapeHtml(s.section_id)})</option>`
        ).join('');

        select.addEventListener('change', () => {
            if (select.value) loadJournal(select.value);
            else document.getElementById('journalList').innerHTML = '';
        });
    } catch (err) {
        console.error('Failed to load roster:', err);
        select.innerHTML = '<option value="">Failed to load roster</option>';
    }
}

async function loadJournal(studentId) {
    const list = document.getElementById('journalList');
    list.innerHTML = '<div class="text-center text-primary py-4"><div class="spinner-border"></div></div>';
    try {
        const res = await fetch(`/api/admin/wd-journal/${encodeURIComponent(studentId)}`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        const entries = data.entries || [];

        if (entries.length === 0) {
            list.innerHTML = '<div class="journal-empty">No journal entries yet for this student.</div>';
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
        list.innerHTML = '<div class="journal-empty text-danger">Could not load this journal. Try again.</div>';
    }
}

window.addEventListener('DOMContentLoaded', loadRoster);
