// Lightweight, ungraded comprehension-check widget. Replaces a heavier
// multi-step lab with 2-3 quick questions per topic so a chapter can
// briefly introduce a topic without demanding a full deliverable for
// each one. Purely a self-check: it shows immediate right/wrong feedback
// per question but never submits a score to the gradebook -- Danylle's
// explicit call (2026-09-23): keep the instant feedback, drop the grade,
// since these are meant to be low-stakes comprehension checks, not
// scored assignments. A student can retake one as many times as they
// want; nothing here is persisted.
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

    // Each chapter keeps its own bank file (data/ch{N}-quick-checks.json),
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
    await Promise.all([...chapterNums].map(async (n) => {
        try {
            const bankRes = await fetch(`/data/ch${n}-quick-checks.json?v=` + Date.now());
            if (bankRes.ok) Object.assign(bankData, await bankRes.json());
        } catch (e) {
            console.error(`[quick-check] Failed to load ch${n} bank`, e);
        }
    }));

    containers.forEach(container => initOneQuickCheck(container, bankData));
}

function initOneQuickCheck(container, bankData) {
    const examId = container.dataset.examId;
    const entry = bankData[examId];
    if (!entry || !Array.isArray(entry.questions) || entry.questions.length === 0) {
        container.innerHTML = `<p class="text-muted small mb-0">This quick check isn't available right now.</p>`;
        return;
    }
    renderQuiz(container, examId, entry.questions);
}

function renderQuiz(container, examId, questions) {
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
            <button type="button" class="btn btn-sm btn-outline-secondary d-none" data-retry-btn>Try Again</button>
        </form>
    `;

    const form = container.querySelector('[data-quick-check-form]');
    const submitBtn = form.querySelector('[data-submit-btn]');
    const retryBtn = form.querySelector('[data-retry-btn]');

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
        retryBtn.classList.remove('d-none');

        const summary = document.createElement('div');
        summary.className = 'mt-2 small text-muted';
        summary.dataset.checkSummary = '1';
        summary.textContent = `${correctCount} of ${questions.length} correct. This is a self-check, not a graded assignment.`;
        const oldSummary = form.querySelector('[data-check-summary]');
        if (oldSummary) oldSummary.remove();
        form.appendChild(summary);
    });

    retryBtn.addEventListener('click', () => {
        renderQuiz(container, examId, questions);
    });
}

initAllQuickChecks();
