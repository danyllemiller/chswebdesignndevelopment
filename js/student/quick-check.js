// Lightweight, auto-graded comprehension-check widget. Replaces a heavier
// multi-step lab with 2-3 quick questions per topic so a chapter can
// briefly introduce a topic without demanding a full deliverable for
// each one. Submits through the same POST /api/submit-exam every other
// lightweight grade in this app already uses (keep-highest built in, so
// retrying to improve never hurts a student's score).
import { getLoggedInUser } from '../modules/user-session.js';

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function initAllQuickChecks() {
    const containers = document.querySelectorAll('[data-quick-check]');
    if (containers.length === 0) return;

    const user = getLoggedInUser();
    if (!user || !user.student_id) {
        containers.forEach(c => { c.innerHTML = `<p class="text-muted small mb-0">Log in to take this quick check.</p>`; });
        return;
    }

    let bankData = {};
    let existingScores = {};
    try {
        const [bankRes, gradesRes] = await Promise.all([
            fetch('/data/ch1-quick-checks.json?v=' + Date.now()),
            fetch(`/api/student/grades?student_id=${encodeURIComponent(user.student_id)}`)
        ]);
        bankData = bankRes.ok ? await bankRes.json() : {};
        const gradesData = gradesRes.ok ? await gradesRes.json() : { responses: [] };
        (gradesData.responses || []).forEach(r => { existingScores[r.exam_id] = { score: Number(r.score), total_points: Number(r.total_points) }; });
    } catch (e) {
        console.error('[quick-check] Failed to load data', e);
    }

    containers.forEach(container => initOneQuickCheck(container, user, bankData, existingScores));
}

function initOneQuickCheck(container, user, bankData, existingScores) {
    const examId = container.dataset.examId;
    const points = Number(container.dataset.points || 10);
    const entry = bankData[examId];
    if (!entry || !Array.isArray(entry.questions) || entry.questions.length === 0) {
        container.innerHTML = `<p class="text-muted small mb-0">This quick check isn't available right now.</p>`;
        return;
    }

    const existing = existingScores[examId];
    if (existing && container.dataset.forceRetry !== '1') {
        renderCompleted(container, existing.score, existing.total_points || points, entry.questions.length);
        return;
    }
    delete container.dataset.forceRetry;

    renderQuiz(container, examId, points, entry.questions, user);
}

function renderCompleted(container, score, total, questionCount) {
    container.innerHTML = `
        <div class="alert alert-success mb-2 py-2 px-3">
            <i class="fas fa-check-circle me-1"></i> Completed — Score: <strong>${score}/${total}</strong>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-retry-btn>Retry to improve your score</button>
    `;
    container.querySelector('[data-retry-btn]').addEventListener('click', () => {
        container.dataset.forceRetry = '1';
        initAllQuickChecks();
    });
}

function renderQuiz(container, examId, points, questions, user) {
    container.innerHTML = `
        <form data-quick-check-form>
            ${questions.map((q, qi) => `
                <fieldset class="mb-3">
                    <legend class="fw-bold small mb-2" style="font-size:.9rem;">${qi + 1}. ${escapeHtml(q.q)}</legend>
                    ${q.options.map((opt, oi) => `
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="q${qi}" id="${examId}-q${qi}-o${oi}" value="${oi}" required>
                            <label class="form-check-label small" for="${examId}-q${qi}-o${oi}">${escapeHtml(opt)}</label>
                        </div>
                    `).join('')}
                </fieldset>
            `).join('')}
            <button type="submit" class="btn btn-sm btn-primary fw-bold">Submit Quick Check</button>
            <div class="mt-2" data-quick-check-status></div>
        </form>
    `;

    container.querySelector('[data-quick-check-form]').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const statusEl = container.querySelector('[data-quick-check-status]');
        let correctCount = 0;
        questions.forEach((q, qi) => {
            const picked = form.querySelector(`input[name="q${qi}"]:checked`);
            if (picked && Number(picked.value) === q.correct) correctCount++;
        });
        const score = Math.round((correctCount / questions.length) * points);

        statusEl.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i>Saving…`;
        try {
            const res = await fetch('/api/submit-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: user.student_id, exam_id: examId, score, total_points: points })
            });
            if (!res.ok) throw new Error('Request failed');
            renderCompleted(container, score, points, questions.length);
        } catch (err) {
            statusEl.innerHTML = `<span class="text-danger">Couldn't save your answers. Try again.</span>`;
        }
    });
}

initAllQuickChecks();
