// "My Clock-Ins & Outs" (student/clockins.html): each day's clock-in question,
// the student's answer, the right answer and the points it earned, plus the
// clock-out question and their answer -- from /api/student/clockin-history.
// Added 2026-10-23 so CS students can see what Web Design students already
// see in My Daily Journal, and check their own on-time/correct record.
const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function dayHtml(d) {
    const dateLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const pts = d.points === null || d.points === undefined ? null : Number(d.points);
    const ptsColor = pts === null ? 'background:#6c757d;color:#fff;' : pts >= 3 ? 'background:#198754;color:#fff;' : pts === 2 ? 'background:#ffc107;color:#000;' : 'background:#dc3545;color:#fff;';
    const onTime = d.on_time === true ? '<span class="ms-1" style="display:inline-block;padding:.25em .65em;border-radius:999px;font-weight:700;font-size:.8em;line-height:1;background:#198754;color:#fff;">On time</span>'
        : d.on_time === false ? '<span class="ms-1" style="display:inline-block;padding:.25em .65em;border-radius:999px;font-weight:700;font-size:.8em;line-height:1;background:#dc3545;color:#fff;">Late</span>' : '';
    const mark = d.is_right === true ? ' <span class="fw-bold" style="color:#198754;">&#10004; right</span>'
        : d.is_right === false ? ' <span class="fw-bold" style="color:#dc3545;">&#10008; wrong</span>' : '';
    const right = d.right_answer ? `<div><strong>Right answer:</strong> ${escapeHtml(d.right_answer)}</div>`
        : d.right_answer_tomorrow ? '<div class="text-muted"><strong>Right answer:</strong> shows here tomorrow (your class has this same question today).</div>' : '';
    const out = d.clock_out || d.out_answer ? `
        <div class="day-part">
            <span class="day-label out">Clock-Out${d.clock_out ? ` ${escapeHtml(d.clock_out)}` : ''}</span>
            ${d.out_question ? `<div class="day-q">${escapeHtml(d.out_question)}</div>` : ''}
            <div class="day-a">${d.out_answer ? escapeHtml(d.out_answer) : '<span class="text-muted">no answer</span>'}</div>
        </div>` : '<div class="day-part small text-muted">No clock-out this day.</div>';
    return `
        <div class="day">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div class="day-date">${escapeHtml(dateLabel)}</div>
                ${pts === null ? '' : `<span style="display:inline-block;padding:.25em .65em;border-radius:999px;font-weight:700;font-size:.8em;line-height:1;font-size:.95em;${ptsColor}">${pts} / ${d.max_points || 3} pts</span>`}
            </div>
            <div class="day-part">
                <span class="day-label">Clock-In${d.clock_in ? ` ${escapeHtml(d.clock_in)}` : ''}</span>${onTime}
                <div class="day-q">${d.question ? escapeHtml(d.question) : 'The question was not saved for this day.'}</div>
                <div><strong>Your answer:</strong> ${d.your_answer ? escapeHtml(d.your_answer) : '<span class="text-muted">none</span>'}${mark}</div>
                ${right}
                ${d.explanation ? `<div class="text-muted small mt-1"><strong>Why:</strong> ${escapeHtml(d.explanation)}</div>` : ''}
            </div>
            ${out}
        </div>`;
}

async function loadClockins() {
    const list = document.getElementById('dayList');
    let user;
    try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { user = {}; }
    if (!user.student_id) {
        list.innerHTML = '<div class="empty">You must be logged in to see your clock-ins.</div>';
        return;
    }
    try {
        const res = await fetch(`/api/student/clockin-history?student_id=${encodeURIComponent(user.student_id)}`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const days = (await res.json()).days || [];
        list.innerHTML = days.length ? days.map(dayHtml).join('')
            : '<div class="empty"><i class="fas fa-clock mb-2 fs-3 d-block"></i>Nothing here yet. Your clock-ins show up here after you clock in.</div>';
    } catch (err) {
        console.error('Failed to load clock-ins:', err);
        list.innerHTML = '<div class="empty text-danger">Could not load your clock-ins. Try refreshing the page.</div>';
    }
}

window.addEventListener('DOMContentLoaded', loadClockins);
