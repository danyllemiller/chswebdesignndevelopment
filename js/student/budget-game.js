// /js/student/budget-game.js
// "The Paycheck" -- client for the real-pay budgeting game. Every real,
// finalized payroll run becomes a paycheck event server-side; this page just
// renders whatever balance/transaction state the server already synced.
import { getLoggedInUser } from '../modules/user-session.js';
import { apiFetch } from '../modules/api-client.js';

let studentData = null;
let previewStudentId = null; // set only in staff read-only preview mode
let isStaffPreview = false;

function money(n) {
    const v = Number(n) || 0;
    return (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2);
}

function waitForAuth(timeout = 8000) {
    return new Promise((resolve) => {
        if (window.dacAuthData) { resolve(window.dacAuthData); return; }
        const handler = () => resolve(window.dacAuthData);
        document.addEventListener('authComplete', handler, { once: true });
        setTimeout(() => {
            document.removeEventListener('authComplete', handler);
            resolve({ isAuthenticated: false });
        }, timeout);
    });
}

function showBlocked(message) {
    document.querySelector('.container').innerHTML = `
        <div class="alert alert-warning text-center shadow-sm mt-5">
            <h4 class="fw-bold"><i class="fas fa-lock me-2"></i>Not Available Yet</h4>
            <p class="mb-0">${message}</p>
            <a href="/student" class="btn btn-primary mt-3">&laquo; Back to Portal</a>
        </div>`;
}

function isStaffUser(u) {
    return !!u && (u.role === 'admin' || u.section_id === 'Teacher');
}

async function init() {
    const authData = await waitForAuth();
    if (!authData.isAuthenticated) {
        window.location.replace(`/login.html?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
    }

    studentData = getLoggedInUser();
    initStickyBalances(); // both staff preview and real students show the same balance row

    // Check staff FIRST, before falling back on studentData.student_id --
    // a teacher account (e.g. Danylle's own "damiller" login) is itself a
    // row in the students table, so it has a real (but meaningless, for
    // this page) student_id of its own. Checking student_id first meant a
    // staff login silently loaded as if it were that account's own empty
    // budget data instead of ever reaching the preview picker below.
    if (isStaffUser(studentData)) {
        initStaffPreview();
        return;
    }

    if (!studentData || !studentData.student_id) {
        window.location.replace('/login.html');
        return;
    }

    document.getElementById('payBillsBtn').addEventListener('click', payBills);
    document.querySelectorAll('[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => transfer(btn.dataset.dir));
    });
    document.getElementById('addRoommateBtn').addEventListener('click', () => housing('add_roommate'));
    document.getElementById('housingCard').addEventListener('click', e => {
        const btn = e.target.closest('[data-housing]');
        if (btn) housing(btn.dataset.housing, btn.dataset.id);
    });

    await loadState();
}

// The navbar (includes/navbar.html) is itself sticky-top with a height that
// varies by viewport (the countdown banner wraps differently, mobile
// collapses the menu), so a hardcoded px offset would drift out of sync --
// measuring it directly and re-measuring on resize keeps the balance bar
// pinned exactly below the real navbar instead of overlapping or gapping.
function initStickyBalances() {
    const bar = document.getElementById('stickyBalances');
    if (!bar) return;
    function positionBar() {
        const nav = document.querySelector('nav.navbar');
        bar.style.top = `${nav ? nav.getBoundingClientRect().height : 0}px`;
    }
    positionBar();
    window.addEventListener('resize', positionBar);
    setTimeout(positionBar, 500); // catches late navbar reflow (fonts/logo loading in)

    const sentinel = document.createElement('div');
    bar.before(sentinel);
    new IntersectionObserver(([entry]) => {
        bar.classList.toggle('is-pinned', !entry.isIntersecting);
    }, { threshold: 1 }).observe(sentinel);
}

async function loadState() {
    const targetId = previewStudentId || studentData.student_id;
    try {
        const data = await apiFetch(`/api/student/budget-game/state?student_id=${encodeURIComponent(targetId)}`);
        renderState(data);
    } catch (e) {
        console.error('Failed to load budget game state:', e);
    }
}

// Staff has no student_id of their own, so there's no roster of a staff
// member's own data to fetch -- they pick a real student from the actual
// class roster and view that student's real, live state. Read-only: the
// action buttons are simply never wired up with click handlers below, and
// renderState() disables/hides them outright so it's visually obvious too.
async function initStaffPreview() {
    isStaffPreview = true;
    document.getElementById('staffPreviewPicker').classList.remove('d-none');
    const select = document.getElementById('staffPreviewSelect');
    try {
        const roster = await apiFetch('/api/admin/roster');
        const students = roster
            .filter(s => !s.archived && s.role !== 'teacher' && s.student_id)
            .sort((a, b) => {
                const periodA = a.display_period || a.section_id || '';
                const periodB = b.display_period || b.section_id || '';
                return periodA.localeCompare(periodB) || `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
            });
        select.innerHTML = '<option value="">Select a student to preview…</option>' +
            students.map(s => `<option value="${s.student_id}">${s.last_name}, ${s.first_name} — ${s.display_period || s.section_id || ''}</option>`).join('');
    } catch (e) {
        select.innerHTML = '<option value="">Failed to load roster</option>';
        return;
    }
    select.addEventListener('change', () => {
        previewStudentId = select.value || null;
        document.getElementById('staffPreviewBanner').classList.toggle('d-none', !previewStudentId);
        if (previewStudentId) loadState();
    });
}

function renderState(data) {
    document.getElementById('balChecking').textContent = money(data.checking);
    document.getElementById('balSavings').textContent = money(data.savings);
    document.getElementById('balInvested').textContent = money(data.invested);
    document.getElementById('balNetWorth').textContent = money(data.net_worth);

    document.getElementById('billsTotal').textContent = money(data.bills_total);
    const billsList = document.getElementById('billsList');
    billsList.innerHTML = data.bills.map(b => `
        <div class="d-flex justify-content-between small py-1">
            <span>${b.label}</span>
            <span class="fw-bold">${money(b.amount)}</span>
        </div>`).join('');

    const payBtn = document.getElementById('payBillsBtn');
    const billsMsg = document.getElementById('billsMsg');
    if (isStaffPreview) {
        payBtn.disabled = true;
        payBtn.innerHTML = '<i class="fas fa-eye me-1"></i>Staff Preview (Read-Only)';
        billsMsg.textContent = '';
    } else if (data.bills_paid_this_period) {
        payBtn.disabled = true;
        payBtn.innerHTML = '<i class="fas fa-check me-1"></i>Paid This Period';
        billsMsg.textContent = '';
    } else {
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="fas fa-check me-1"></i>Pay Bills';
    }
    document.querySelectorAll('[data-dir]').forEach(btn => { btn.disabled = isStaffPreview; });

    if (data.housing) renderHousing(data.housing);
    renderTransactions(data.transactions);
    if (!isStaffPreview) {
        maybeShowPaycheckBanner(data.transactions);
        maybeShowLifeEventBanner(data.transactions);
    }
}

// Where You Live: an apartment or a home they own, roommates, and the homes
// they own (live in one, rent out the rest, or rent out all of them and rent
// an apartment). The server does the math; this lays it out and asks before
// anything that brings Rent back or loses a tenant.
let housingState = null;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function renderHousing(h) {
    housingState = h;
    const off = isStaffPreview ? ' disabled' : '';
    document.getElementById('homeLine').innerHTML = h.home
        ? `<i class="fas fa-house me-1 text-success"></i>You live in your <b>${esc(h.home.label)}</b>. Instead of rent, you pay its Property Tax &amp; HOA: <b>${money(h.tax_hoa)}</b> every pay period.`
        : `<i class="fas fa-building me-1 text-primary"></i>You rent an apartment. Rent is 1/3 of your average paycheck: <b>${money(h.rent)}</b> every pay period.`;

    const place = h.home ? `Your ${h.home.label}` : 'Your apartment';   // plain text (textContent below)
    document.getElementById('roommateList').innerHTML = h.roommates.length
        ? h.roommates.map(m => `<div class="housing-row"><span><i class="fas fa-user me-1 text-muted"></i>${esc(m.name)}${m.pending ? ' <span class="badge text-bg-warning">moves in next payday</span>' : ''}</span>
            <button class="btn btn-outline-danger btn-sm" data-housing="remove_roommate" data-id="${m.id}"${off}>Ask to Move Out</button></div>`).join('')
        : `<div class="small text-muted">No roommates. You pay ${h.home ? 'the utilities' : 'the whole rent and utilities'} yourself.</div>`;
    document.getElementById('addRoommateBtn').disabled = isStaffPreview;
    document.getElementById('roommateHelp').textContent = (h.home
        ? `A roommate rents a spare room: they pay you ${money(h.room_rent)} every payday and split the utilities with you.`
        : 'A roommate splits the rent and utilities with you, so each of you pays less. But a roommate can come up short on their share, or move out.')
        + ` ${place} has room for ${h.rooms} roommate${h.rooms === 1 ? '' : 's'}.`;

    document.getElementById('propertyList').innerHTML = h.properties.length
        ? h.properties.map(p => {
            const what = p.status === 'live' ? 'You live here.'
                : p.status === 'rented' ? `Rented to ${esc(p.tenant || 'a tenant')}. They pay you <b>${money(p.tenant_rent)}</b> every payday.`
                : 'Empty. Nobody lives here, and you still pay its Property Tax &amp; HOA.';
            const btns = (p.status !== 'rented' ? `<button class="btn btn-primary btn-sm fw-bold" data-housing="rent_out" data-id="${p.id}"${off}>Rent It Out (${money(p.tenant_rent)}/payday)</button>` : `<button class="btn btn-outline-secondary btn-sm" data-housing="stop_renting" data-id="${p.id}"${off}>Stop Renting It</button>`)
                + (p.status !== 'live' ? ` <button class="btn btn-outline-primary btn-sm" data-housing="move_in" data-id="${p.id}"${off}>Move In</button>` : '');
            return `<div class="housing-row"><span><b>${esc(p.label)}</b> &mdash; ${what}</span><span>${btns}</span></div>`;
        }).join('') + `<p class="small text-muted mb-0 mt-2">Renting out a home: your tenant pays you every payday, but you still pay its Property Tax &amp; HOA (${money(h.tax_hoa)}), and repairs and empty months come out of your pocket. If you rent out the home you live in, you move into an apartment and pay Rent again.</p>`
        : `<div class="small text-muted">You don't own a home yet. Homes are in <a href="/student/budget-game-mall.html">The Mall</a> under Housing. Once you own one, you can live in it or rent it out to a tenant.</div>`;
}

async function housing(action, id) {
    const h = housingState, msg = document.getElementById('housingMsg');
    const p = h && h.properties.find(x => String(x.id) === String(id));
    if (action === 'rent_out' && p && p.status === 'live'
        && !confirm(`You'll move out of your ${p.label} and rent an apartment, so Rent (${money(h.rent)}) goes back on your bills. Your tenant pays you ${money(p.tenant_rent)} every payday, starting next payday.\n\nRent it out?`)) return;
    if (action === 'move_in' && p && p.status === 'rented'
        && !confirm(`${p.tenant || 'Your tenant'} will move out, and you won't get their rent anymore.\n\nMove into your ${p.label}?`)) return;
    msg.className = 'small mt-2';
    msg.textContent = '';
    try {
        const out = await apiFetch('/api/student/budget-game/housing', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentData.student_id, action, property_id: action === 'remove_roommate' ? undefined : id, roommate_id: action === 'remove_roommate' ? id : undefined })
        });
        await loadState();
        msg.className = 'small mt-2 text-success fw-bold';
        msg.textContent = out.message || 'Done.';
    } catch (e) {
        msg.className = 'small mt-2 text-danger fw-bold';
        msg.textContent = e.message || 'That didn\'t work. Try again.';
    }
}

function renderTransactions(txns) {
    const log = document.getElementById('txnLog');
    if (!txns || txns.length === 0) {
        log.innerHTML = '<div class="text-muted text-center small py-4">No transactions yet.</div>';
        return;
    }
    log.innerHTML = txns.map(t => {
        const amt = Number(t.amount);
        const dateStr = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
            <div class="txn-row">
                <div>
                    <div class="txn-desc">${t.description}</div>
                    <div class="txn-date">${dateStr}</div>
                </div>
                <div class="txn-amount ${amt >= 0 ? 'positive' : 'negative'}">${amt >= 0 ? '+' : ''}${money(amt)}</div>
            </div>`;
    }).join('');
}

function paycheckSeenKey() {
    return `budgetGamePaycheckSeen:${studentData.student_id}`;
}

function maybeShowPaycheckBanner(txns) {
    const latestPaycheck = (txns || []).find(t => t.type === 'paycheck');
    if (!latestPaycheck) return;
    let lastSeen = null;
    try { lastSeen = localStorage.getItem(paycheckSeenKey()); } catch (e) {}
    if (lastSeen === latestPaycheck.created_at) return;

    const banner = document.getElementById('paycheckBanner');
    const text = document.getElementById('paycheckBannerText');
    text.textContent = `Payday! ${latestPaycheck.description} — ${money(latestPaycheck.amount)} deposited.`;
    banner.style.display = 'block';
    try { localStorage.setItem(paycheckSeenKey(), latestPaycheck.created_at); } catch (e) {}
}

function lifeEventSeenKey() {
    return `budgetGameLifeEventSeen:${studentData.student_id}`;
}

function maybeShowLifeEventBanner(txns) {
    const latestEvent = (txns || []).find(t => t.type === 'life_event');
    if (!latestEvent) return;
    let lastSeen = null;
    try { lastSeen = localStorage.getItem(lifeEventSeenKey()); } catch (e) {}
    if (lastSeen === latestEvent.created_at) return;

    const banner = document.getElementById('lifeEventBanner');
    const text = document.getElementById('lifeEventBannerText');
    const amt = Number(latestEvent.amount);
    text.textContent = `${latestEvent.description} (${amt >= 0 ? '+' : ''}${money(amt)})`;
    banner.style.display = 'block';
    try { localStorage.setItem(lifeEventSeenKey(), latestEvent.created_at); } catch (e) {}
}

async function payBills() {
    const btn = document.getElementById('payBillsBtn');
    const msg = document.getElementById('billsMsg');
    btn.disabled = true;
    msg.className = 'small mt-2';
    msg.textContent = '';
    try {
        await apiFetch('/api/student/budget-game/pay-bills', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentData.student_id })
        });
        await loadState();
    } catch (e) {
        msg.classList.add('text-danger', 'fw-bold');
        msg.textContent = e.message || 'Could not pay bills.';
        btn.disabled = false;
    }
}

async function transfer(direction) {
    const input = document.getElementById('transferAmount');
    const msg = document.getElementById('transferMsg');
    const amount = parseFloat(input.value);
    if (!(amount > 0)) {
        msg.className = 'small mt-2 text-danger fw-bold';
        msg.textContent = 'Enter an amount greater than $0.';
        return;
    }
    msg.className = 'small mt-2';
    msg.textContent = '';
    try {
        await apiFetch('/api/student/budget-game/transfer', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentData.student_id, direction, amount })
        });
        input.value = '';
        await loadState();
    } catch (e) {
        msg.classList.add('text-danger', 'fw-bold');
        msg.textContent = e.message || 'Could not complete transfer.';
    }
}

document.addEventListener('DOMContentLoaded', init);
