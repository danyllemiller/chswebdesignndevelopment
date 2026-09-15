// Mock Interview slot sign-up widget for Chapter 1 (year1/join-the-developers-guild.html).
// First-come-first-served: a student claims one open slot; claiming a new
// one automatically releases any previous slot they held (server-enforced).
import { getLoggedInUser } from '../modules/user-session.js';

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

async function initInterviewSignup() {
    const container = document.querySelector('[data-interview-signup]');
    if (!container) return;

    const user = getLoggedInUser();
    if (!user || !user.student_id) {
        container.innerHTML = `<p class="text-muted small mb-0">Log in to sign up for an interview slot.</p>`;
        return;
    }

    container.innerHTML = `<p class="text-muted small mb-0"><i class="fas fa-spinner fa-spin me-1"></i>Loading available slots…</p>`;
    await render(container, user);
}

async function render(container, user) {
    let slots = [];
    try {
        const res = await fetch(`/api/interview-slots?student_id=${encodeURIComponent(user.student_id)}`);
        slots = res.ok ? await res.json() : [];
    } catch (e) {
        container.innerHTML = `<p class="text-danger small mb-0">Couldn't load interview slots. Try refreshing.</p>`;
        return;
    }

    if (slots.length === 0) {
        container.innerHTML = `<p class="text-muted small mb-0">No interview slots are open yet — check back soon.</p>`;
        return;
    }

    const mySlot = slots.find(s => s.is_mine);
    const byDate = {};
    slots.forEach(s => { (byDate[s.slot_date] = byDate[s.slot_date] || []).push(s); });

    let html = '';
    if (mySlot) {
        html += `
            <div class="alert alert-success py-2 px-3 mb-3">
                <i class="fas fa-check-circle me-1"></i> You're signed up for
                <strong>${escapeHtml(formatDate(mySlot.slot_date))} at ${escapeHtml(formatTime(mySlot.start_time))}</strong>.
                <button type="button" class="btn btn-sm btn-outline-danger ms-2" data-release-btn>Cancel</button>
            </div>`;
    } else {
        html += `<p class="small text-muted mb-3">Pick any open time below. Interviews are 5 minutes each.</p>`;
    }

    Object.keys(byDate).sort().forEach(date => {
        html += `<div class="mb-3">
            <h6 class="fw-bold small mb-2">${escapeHtml(formatDate(date))}</h6>
            <div class="d-flex flex-wrap gap-2">
                ${byDate[date].map(s => {
                    const isMine = s.is_mine;
                    const disabled = !s.available && !isMine;
                    const cls = isMine ? 'btn-success' : (disabled ? 'btn-outline-secondary disabled' : 'btn-outline-primary');
                    return `<button type="button" class="btn btn-sm ${cls} fw-bold" style="min-width:90px;"
                        ${disabled ? 'disabled' : ''} data-slot-id="${s.id}" data-claim-btn>
                        ${escapeHtml(formatTime(s.start_time))}${isMine ? ' <i class="fas fa-check"></i>' : ''}
                    </button>`;
                }).join('')}
            </div>
        </div>`;
    });

    html += `<div class="mt-2" data-signup-status></div>`;
    container.innerHTML = html;

    const statusEl = container.querySelector('[data-signup-status]');

    container.querySelectorAll('[data-claim-btn]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const slotId = btn.dataset.slotId;
            statusEl.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i>Booking…`;
            try {
                const res = await fetch('/api/interview-slots/claim', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ student_id: user.student_id, slot_id: slotId })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    statusEl.innerHTML = `<span class="text-danger small">${escapeHtml(data.error || "Couldn't book that slot.")}</span>`;
                    await render(container, user);
                    return;
                }
                await render(container, user);
            } catch (e) {
                statusEl.innerHTML = `<span class="text-danger small">Couldn't book that slot. Try again.</span>`;
            }
        });
    });

    const releaseBtn = container.querySelector('[data-release-btn]');
    if (releaseBtn) {
        releaseBtn.addEventListener('click', async () => {
            if (!mySlot) return;
            try {
                await fetch('/api/interview-slots/release', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ student_id: user.student_id, slot_id: mySlot.id })
                });
                await render(container, user);
            } catch (e) { /* re-render will show current state either way */ }
        });
    }
}

initInterviewSignup();
