// /js/student/budget-game.js
// "The Paycheck" -- client for the real-pay budgeting game. Every real,
// finalized payroll run becomes a paycheck event server-side; this page just
// renders whatever balance/transaction state the server already synced.
import { getLoggedInUser } from '../modules/user-session.js';
import { apiFetch } from '../modules/api-client.js';

let studentData = null;
let lastStoreCatalog = null;
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

    initStickyBalances();
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

    lastStoreCatalog = data.store;
    renderStore();
    renderTransactions(data.transactions);
    if (!isStaffPreview) {
        maybeShowPaycheckBanner(data.transactions);
        maybeShowLifeEventBanner(data.transactions);
    }
}

const CATEGORY_META = {
    groceries: { label: 'Groceries', icon: 'fa-basket-shopping', placeholderIcon: 'fa-apple-whole' },
    clothes:   { label: 'Clothes',   icon: 'fa-shirt',           placeholderIcon: 'fa-shirt' }
};

function itemCardHtml(item) {
    const img = item.image
        ? `<img src="${item.image}" alt="${item.label}" loading="lazy">`
        : `<i class="fas ${CATEGORY_META[item.category]?.placeholderIcon || 'fa-box'} item-image-placeholder"></i>`;
    return `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="item-card">
                <div class="item-image-wrap">${img}</div>
                <div class="item-card-body">
                    <div class="item-label">${item.label}</div>
                    <div class="item-price-row">
                        <span class="item-price-tag">${money(item.price)}</span>
                        <button class="btn btn-sm btn-primary fw-bold buy-btn" data-key="${item.key}" ${isStaffPreview ? 'disabled' : ''}>Buy</button>
                    </div>
                </div>
            </div>
        </div>`;
}

function renderStore() {
    const container = document.getElementById('storeSections');
    if (!lastStoreCatalog) return;
    const categories = Object.keys(lastStoreCatalog).filter(c => lastStoreCatalog[c] && lastStoreCatalog[c].length);
    if (categories.length === 0) {
        container.innerHTML = '<div class="text-muted text-center small py-4">The store is empty right now.</div>';
        return;
    }
    container.innerHTML = categories.map(cat => {
        const meta = CATEGORY_META[cat] || { label: cat[0].toUpperCase() + cat.slice(1), icon: 'fa-store' };
        const items = lastStoreCatalog[cat].map(item => ({ ...item, category: cat }));
        return `
            <div class="store-section ${cat} mb-4">
                <div class="store-section-header"><i class="fas ${meta.icon}"></i>${meta.label}</div>
                <div class="store-section-body">
                    <div class="row g-3">${items.map(itemCardHtml).join('')}</div>
                </div>
            </div>`;
    }).join('');
    if (isStaffPreview) return;
    container.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => buyItem(btn.dataset.key));
    });
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

async function buyItem(itemKey) {
    try {
        await apiFetch('/api/student/budget-game/buy', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentData.student_id, item_key: itemKey })
        });
        await loadState();
    } catch (e) {
        alert(e.message || 'Could not complete purchase.');
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
