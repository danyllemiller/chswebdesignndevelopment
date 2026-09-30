// Graded comprehension-check widget (2026-09-30). Each chapter's quick-checks
// roll up into ONE combined gradebook entry per chapter (ch{N}_quick_checks)
// instead of one column per widget -- per Danylle's existing rule against
// per-lab gradebook clutter. A wrong answer can be retried, but only after
// answering a short "did you actually re-read it" gate question pulled from
// the same section -- getting every question right on the first try skips
// the gate entirely.
import { getLoggedInUser } from '../modules/user-session.js';

// Only these chapters have a real exams-table row + gate-question bank
// configured. Every other chapter's quick-checks stay exactly as they were
// (pure self-check, ungraded, unconditional retry) until they're rolled out
// the same way -- a chapter number showing up in its exam_id prefix is not
// enough on its own to start submitting grades for it.
const GRADED_CHAPTERS = new Set(['2']);

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

    // Each chapter keeps its own bank file (data/ch{N}-quick-checks.json)
    // plus a matching gate-question file (data/ch{N}-quick-check-gates.json),
    // derived from the "ch{N}_" prefix every quick-check's own exam_id
    // already uses -- no separate data attribute needed. A page only ever
    // has one chapter's worth of quick-checks in practice, but this
    // fetches whichever distinct chapter numbers are actually present
    // (once each) rather than assuming there's exactly one.
    const chapterNums = new Set();
    containers.forEach(c => {
        const m = (c.dataset.examId || '').match(/^ch(\d+)_/);
        if (m) chapterNums.add(m[1]);
    });

    let bankData = {};
    let gateData = {};
    await Promise.all([...chapterNums].map(async (n) => {
        try {
            const bankRes = await fetch(`/data/ch${n}-quick-checks.json?v=` + Date.now());
            if (bankRes.ok) Object.assign(bankData, await bankRes.json());
        } catch (e) {
            console.error(`[quick-check] Failed to load ch${n} bank`, e);
        }
        try {
            const gateRes = await fetch(`/data/ch${n}-quick-check-gates.json?v=` + Date.now());
            if (gateRes.ok) Object.assign(gateData, await gateRes.json());
        } catch (e) {
            // A chapter without a gate bank yet just means wrong answers
            // fall back to an unconditional retry -- not a hard failure.
        }
    }));

    containers.forEach(container => initOneQuickCheck(container, bankData, gateData, user.student_id));
}

function initOneQuickCheck(container, bankData, gateData, studentId) {
    const examId = container.dataset.examId;
    const entry = bankData[examId];
    if (!entry || !Array.isArray(entry.questions) || entry.questions.length === 0) {
        container.innerHTML = `<p class="text-muted small mb-0">This quick check isn't available right now.</p>`;
        return;
    }
    const points = Number(container.dataset.points) || 10;
    const chapterMatch = examId.match(/^ch(\d+)_/);
    const chapterNum = chapterMatch ? chapterMatch[1] : null;
    const isGraded = chapterNum && GRADED_CHAPTERS.has(chapterNum);
    const chapterExamId = isGraded ? `ch${chapterNum}_quick_checks` : null;
    const gate = isGraded ? (gateData[examId] || null) : null;

    renderQuiz(container, examId, entry.questions, points, chapterExamId, gate, studentId, isGraded);
}

async function submitScore(chapterExamId, examId, score, maxScore, studentId) {
    if (!chapterExamId) return;
    try {
        await fetch('/api/student/quick-check-submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId,
                widget_id: examId,
                chapter_exam_id: chapterExamId,
                score, max_score: maxScore
            })
        });
    } catch (e) {
        console.error('[quick-check] Failed to submit score', e);
    }
}

function renderQuiz(container, examId, questions, points, chapterExamId, gate, studentId, isGraded) {
    container.innerHTML = `
        <form data-quick-check-form>
            ${questions.map((q, qi) => `
                <fieldset class="mb-3" data-question-fieldset data-correct-index="${q.correct}">
                    <legend class="fw-bold small mb-2" style="font-size:.9rem;">${qi + 1}. ${escapeHtml(q.q)}</legend>
                    ${q.options.map((opt, oi) => `
                        <div class="form-check" data-option-row data-option-index="${oi}">
                            <input class="form-check-input" type="radio" name="q${qi}" id="${examId}-q${qi}-o${oi}" value="${oi}" required>
                            <label class="form-check-label small" for="${examId}-q${qi}-o${oi}">${escapeHtml(opt)}</label>
                        </div>
                    `).join('')}
                    <div class="small mt-1 d-none" data-question-feedback></div>
                </fieldset>
            `).join('')}
            <button type="submit" class="btn btn-sm btn-primary fw-bold" data-submit-btn>Check My Answers</button>
        </form>
        <div class="d-none" data-gate-box></div>
    `;

    const form = container.querySelector('[data-quick-check-form]');
    const submitBtn = form.querySelector('[data-submit-btn]');
    const gateBox = container.querySelector('[data-gate-box]');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        let correctCount = 0;

        form.querySelectorAll('[data-question-fieldset]').forEach((fieldset, qi) => {
            const correctIndex = Number(fieldset.dataset.correctIndex);
            const picked = fieldset.querySelector(`input[name="q${qi}"]:checked`);
            const pickedIndex = picked ? Number(picked.value) : null;
            const isCorrect = pickedIndex === correctIndex;
            if (isCorrect) correctCount++;

            fieldset.querySelectorAll('[data-option-row]').forEach(row => {
                const idx = Number(row.dataset.optionIndex);
                row.classList.remove('text-success', 'fw-bold', 'text-danger');
                if (idx === correctIndex) row.classList.add('text-success', 'fw-bold');
                else if (idx === pickedIndex) row.classList.add('text-danger');
            });
            fieldset.querySelectorAll('input[type="radio"]').forEach(input => { input.disabled = true; });

            const feedbackEl = fieldset.querySelector('[data-question-feedback]');
            feedbackEl.classList.remove('d-none');
            feedbackEl.innerHTML = isCorrect
                ? `<i class="fas fa-check-circle text-success me-1"></i><span class="text-success">Correct!</span>`
                : `<i class="fas fa-times-circle text-danger me-1"></i><span class="text-danger">Not quite -- the correct answer is highlighted above.</span>`;
        });

        submitBtn.classList.add('d-none');

        const summary = document.createElement('div');
        summary.className = 'mt-2 small fw-bold';
        summary.dataset.checkSummary = '1';

        if (isGraded) {
            const earned = Number(((correctCount / questions.length) * points).toFixed(2));
            submitScore(chapterExamId, examId, earned, points, studentId);
            summary.innerHTML = `${correctCount} of ${questions.length} correct &mdash; ${earned} / ${points} points toward this chapter's Quick Checks grade.`;
        } else {
            summary.className = 'mt-2 small text-muted';
            summary.textContent = `${correctCount} of ${questions.length} correct. This is a self-check, not a graded assignment.`;
        }
        const oldSummary = form.querySelector('[data-check-summary]');
        if (oldSummary) oldSummary.remove();
        form.appendChild(summary);

        if (correctCount === questions.length) {
            return; // perfect run -- nothing more to do
        }

        // Missed at least one -- on a graded chapter, retry is gated behind
        // re-engaging with the section first, not an instant do-over. Every
        // other chapter keeps the original unconditional retry.
        if (isGraded && gate) {
            renderGate();
        } else {
            const retryBtn = document.createElement('button');
            retryBtn.type = 'button';
            retryBtn.className = 'btn btn-sm btn-outline-secondary mt-2';
            retryBtn.textContent = 'Try Again';
            retryBtn.addEventListener('click', () => {
                renderQuiz(container, examId, questions, points, chapterExamId, gate, studentId, isGraded);
            });
            form.appendChild(retryBtn);
        }
    });

    function renderGate() {
        gateBox.classList.remove('d-none');
        gateBox.innerHTML = `
            <div class="alert alert-warning small mt-2 mb-0">
                <p class="fw-bold mb-2"><i class="fas fa-book-open me-1"></i> Before you retry: scroll back up and re-read that section, then answer this.</p>
                <p class="mb-2">${escapeHtml(gate.q)}</p>
                <div class="d-flex gap-2 mb-2">
                    <button type="button" class="btn btn-sm btn-outline-dark" data-gate-answer="true">True</button>
                    <button type="button" class="btn btn-sm btn-outline-dark" data-gate-answer="false">False</button>
                </div>
                <div class="small d-none" data-gate-feedback></div>
            </div>
        `;
        const feedback = gateBox.querySelector('[data-gate-feedback]');
        gateBox.querySelectorAll('[data-gate-answer]').forEach(btn => {
            btn.addEventListener('click', () => {
                const picked = btn.dataset.gateAnswer === 'true';
                feedback.classList.remove('d-none');
                if (picked === gate.answer) {
                    feedback.innerHTML = `<i class="fas fa-check-circle text-success me-1"></i><span class="text-success">${escapeHtml(gate.explain || 'Correct.')}</span>`;
                    const retryBtn = document.createElement('button');
                    retryBtn.type = 'button';
                    retryBtn.className = 'btn btn-sm btn-primary fw-bold mt-2';
                    retryBtn.textContent = 'Try Again';
                    retryBtn.addEventListener('click', () => {
                        renderQuiz(container, examId, questions, points, chapterExamId, gate, studentId, isGraded);
                    });
                    gateBox.appendChild(retryBtn);
                    gateBox.querySelectorAll('[data-gate-answer]').forEach(b => { b.disabled = true; });
                } else {
                    feedback.innerHTML = `<i class="fas fa-times-circle text-danger me-1"></i><span class="text-danger">Not quite -- look at that section again and try this gate question once more.</span>`;
                }
            });
        });
    }
}

initAllQuickChecks();
