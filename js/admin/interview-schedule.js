const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

let RUBRIC_CRITERIA = [];
let EXAM_TOTAL_POINTS = 25;
let currentStudent = null;
let currentSlotId = null;

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(timeStr) {
    const [h, m] = String(timeStr).split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

async function loadCriteria() {
    try {
        const res = await fetch('/api/interview-rubric-criteria');
        if (!res.ok) return;
        const data = await res.json();
        RUBRIC_CRITERIA = data.criteria || [];
        EXAM_TOTAL_POINTS = data.maxPoints || 25;
    } catch (e) { console.error('Failed to load rubric criteria', e); }
}

async function loadQuestions() {
    const list = document.getElementById('questionsList');
    try {
        const res = await fetch('/api/interview-questions');
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const questions = await res.json();
        if (questions.length === 0) {
            list.innerHTML = '<div class="empty-note">No questions yet. Add one below.</div>';
            return;
        }
        list.innerHTML = questions.map((q, i) => `
            <div class="question-row">
                <div class="question-num">${i + 1}.</div>
                <div class="question-text small">${escapeHtml(q.question_text)}</div>
                <button type="button" class="btn btn-sm btn-outline-secondary" data-remove-question="${q.id}" title="Remove"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
        list.querySelectorAll('[data-remove-question]').forEach(btn => {
            btn.addEventListener('click', () => removeQuestion(btn.dataset.removeQuestion));
        });
    } catch (err) {
        console.error('Failed to load interview questions:', err);
        list.innerHTML = '<div class="text-center py-3 text-danger small">Failed to load questions.</div>';
    }
}

async function addQuestion() {
    const input = document.getElementById('newQuestionInput');
    const text = input.value.trim();
    if (!text) return;
    try {
        const res = await fetch('/api/admin/interview-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_text: text })
        });
        if (!res.ok) throw new Error('Failed to add question');
        input.value = '';
        loadQuestions();
    } catch (e) { alert("Couldn't add that question."); }
}

async function removeQuestion(id) {
    if (!confirm('Remove this question?')) return;
    try {
        await fetch(`/api/admin/interview-questions/${id}`, { method: 'DELETE' });
        loadQuestions();
    } catch (e) { alert("Couldn't remove that question."); }
}

async function loadSchedule() {
    const container = document.getElementById('scheduleContainer');
    try {
        const res = await fetch('/api/admin/interview-slots');
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const slots = await res.json();

        if (slots.length === 0) {
            container.innerHTML = '<div class="card shadow-sm border-0"><div class="empty-note">No interview days generated yet. Add one above.</div></div>';
            return;
        }

        const byDate = {};
        slots.forEach(s => { (byDate[s.slot_date] = byDate[s.slot_date] || []).push(s); });

        container.innerHTML = Object.keys(byDate).sort().map(date => `
            <div class="card shadow-sm border-0 mb-3">
                <div class="day-header d-flex justify-content-between align-items-center">
                    <span>${escapeHtml(formatDate(date))}</span>
                    <button type="button" class="btn btn-sm btn-outline-light" data-clear-day="${date}"><i class="fas fa-trash"></i> Clear empty slots</button>
                </div>
                <div class="card-body p-0">
                    ${byDate[date].map(s => renderSlotRow(s)).join('')}
                </div>
            </div>
        `).join('');

        container.querySelectorAll('[data-score-btn]').forEach(btn => {
            btn.addEventListener('click', () => openScoreModal(btn.dataset.studentId, btn.dataset.slotId, btn.dataset.name));
        });
        container.querySelectorAll('[data-remove-slot]').forEach(btn => {
            btn.addEventListener('click', () => removeSlot(btn.dataset.removeSlot));
        });
        container.querySelectorAll('[data-clear-day]').forEach(btn => {
            btn.addEventListener('click', () => {
                const emptyIds = byDate[btn.dataset.clearDay].filter(s => !s.student_id).map(s => s.id);
                clearEmptySlots(emptyIds);
            });
        });
    } catch (err) {
        console.error('Failed to load schedule:', err);
        container.innerHTML = '<div class="text-center py-4 text-danger">Failed to load schedule. Try refreshing.</div>';
    }
}

function renderSlotRow(s) {
    const name = s.first_name && s.last_name ? `${s.last_name}, ${s.first_name}` : null;
    const hasScore = s.rubric_score !== null && s.rubric_score !== undefined;
    const rowCls = !name ? 'open' : (hasScore ? 'scored' : '');
    return `
        <div class="slot-row ${rowCls}">
            <div class="fw-bold small">${escapeHtml(formatTime(s.start_time))}</div>
            <div class="slot-name small">${name ? escapeHtml(name) : 'Open slot'}</div>
            <div>${hasScore ? `<span class="badge bg-success score-pill">${Number(s.rubric_score).toFixed(1)}/${EXAM_TOTAL_POINTS}</span>` : ''}</div>
            <div class="text-end">
                ${name
                    ? `<button type="button" class="btn btn-sm btn-outline-primary" data-score-btn data-student-id="${escapeHtml(s.student_id)}" data-slot-id="${s.id}" data-name="${escapeHtml(name)}">${hasScore ? 'Edit Score' : 'Score'}</button>`
                    : `<button type="button" class="btn btn-sm btn-outline-secondary" data-remove-slot="${s.id}" title="Remove this open slot"><i class="fas fa-times"></i></button>`}
            </div>
        </div>
    `;
}

async function removeSlot(slotId) {
    if (!confirm('Remove this open slot?')) return;
    try {
        await fetch(`/api/admin/interview-slots/${slotId}`, { method: 'DELETE' });
        loadSchedule();
    } catch (e) { alert("Couldn't remove that slot."); }
}

async function clearEmptySlots(slotIds) {
    if (slotIds.length === 0) return;
    if (!confirm(`Remove ${slotIds.length} unclaimed slot(s) for this day?`)) return;
    try {
        await Promise.all(slotIds.map(id => fetch(`/api/admin/interview-slots/${id}`, { method: 'DELETE' })));
        loadSchedule();
    } catch (e) { alert("Couldn't clear those slots."); }
}

function openScoreModal(studentId, slotId, name) {
    currentStudent = studentId;
    currentSlotId = slotId;
    document.getElementById('scoreModalTitle').textContent = `Score Interview — ${name}`;
    document.getElementById('scoreModalStatus').textContent = '';

    document.getElementById('scoreModalBody').innerHTML = `
        ${RUBRIC_CRITERIA.map(c => `
            <div class="criterion-row">
                <div class="fw-bold small">${escapeHtml(c.label)}</div>
                <div class="btn-group" role="group" data-criterion="${c.key}">
                    ${[0, 1, 2, 3, 4].map(v => `<button type="button" class="btn btn-sm btn-outline-primary crit-btn" data-val="${v}">${v}</button>`).join('')}
                </div>
            </div>
        `).join('')}
        <div class="mt-3">
            <label class="form-label small fw-bold mb-1">Notes (optional)</label>
            <textarea id="scoreNotes" class="form-control form-control-sm" rows="2" placeholder="Anything specific for feedback later..."></textarea>
        </div>
    `;

    document.querySelectorAll('[data-criterion]').forEach(group => {
        group.querySelectorAll('.crit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('.crit-btn').forEach(b => b.classList.remove('btn-primary', 'text-white'));
                group.querySelectorAll('.crit-btn').forEach(b => b.classList.add('btn-outline-primary'));
                btn.classList.remove('btn-outline-primary');
                btn.classList.add('btn-primary', 'text-white');
            });
        });
    });

    // Pre-fill from any existing score
    fetch(`/api/admin/interview-rubric?student_id=${encodeURIComponent(studentId)}`)
        .then(r => r.ok ? r.json() : null)
        .then(existing => {
            if (!existing) return;
            document.getElementById('scoreNotes').value = existing.notes || '';
            Object.entries(existing.ratings || {}).forEach(([key, val]) => {
                const group = document.querySelector(`[data-criterion="${key}"]`);
                if (!group) return;
                const btn = group.querySelector(`.crit-btn[data-val="${val}"]`);
                if (btn) btn.click();
            });
        })
        .catch(() => {});

    new bootstrap.Modal(document.getElementById('scoreModal')).show();
}

async function saveScore() {
    const statusEl = document.getElementById('scoreModalStatus');
    const ratings = {};
    let missing = false;
    document.querySelectorAll('[data-criterion]').forEach(group => {
        const selected = group.querySelector('.crit-btn.btn-primary');
        if (!selected) { missing = true; return; }
        ratings[group.dataset.criterion] = Number(selected.dataset.val);
    });
    if (missing) {
        statusEl.textContent = 'Rate every criterion first.';
        statusEl.className = 'me-auto small text-danger';
        return;
    }

    statusEl.textContent = 'Saving...';
    statusEl.className = 'me-auto small text-muted';
    try {
        const res = await fetch('/api/admin/interview-rubric', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: currentStudent,
                slot_id: currentSlotId,
                ratings,
                notes: document.getElementById('scoreNotes').value
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to save');
        bootstrap.Modal.getInstance(document.getElementById('scoreModal')).hide();
        loadSchedule();
    } catch (err) {
        statusEl.textContent = err.message || "Couldn't save score.";
        statusEl.className = 'me-auto small text-danger';
    }
}

async function generateDay() {
    const dateInput = document.getElementById('genDate');
    const statusEl = document.getElementById('genStatus');
    if (!dateInput.value) { statusEl.textContent = 'Pick a date first.'; statusEl.className = 'small ms-2 text-danger'; return; }
    statusEl.textContent = 'Generating...';
    statusEl.className = 'small ms-2 text-muted';
    try {
        const res = await fetch('/api/admin/interview-slots/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slot_date: dateInput.value })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to generate slots');
        statusEl.textContent = `Added ${escapeHtml(String(data.generated))} slots.`;
        statusEl.className = 'small ms-2 text-success';
        loadSchedule();
    } catch (err) {
        statusEl.textContent = err.message || "Couldn't generate slots.";
        statusEl.className = 'small ms-2 text-danger';
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    await loadCriteria();
    loadSchedule();
    loadQuestions();
    document.getElementById('genBtn').addEventListener('click', generateDay);
    document.getElementById('saveScoreBtn').addEventListener('click', saveScore);
    document.getElementById('addQuestionBtn').addEventListener('click', addQuestion);
    document.getElementById('newQuestionInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addQuestion();
    });
});
