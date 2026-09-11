// /js/student/budget-game.js
// "The Paycheck" -- client for the real-pay budgeting game. Every real,
// finalized payroll run becomes a paycheck event server-side; this page just
// renders whatever balance/transaction state the server already synced.
import { getLoggedInUser } from '../modules/user-session.js';
import { apiFetch } from '../modules/api-client.js';
import { periodToCourseKey } from '../modules/grade-weights.js?v=3';

let studentData = null;
let currentStoreTab = 'groceries';
let lastStoreCatalog = null;

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

async function init() {
    const authData = await waitForAuth();
    if (!authData.isAuthenticated) {
        window.location.replace(`/login.html?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
    }

    studentData = getLoggedInUser();
    if (!studentData || !studentData.student_id) {
        window.location.replace('/login.html');
        return;
    }

    // The Paycheck is Web Design II and Advanced Studies for now -- confirmed
    // course, not just primary section, since a dual-enrolled student's WD2/AS
    // period might not be their primary one.
    const courseKey = periodToCourseKey(studentData.section_id);
    if (courseKey !== 'WD2' && courseKey !== 'AS') {
        showBlocked('The Paycheck is currently only available to Web Design II and Advanced Studies students.');
        return;
    }

    document.querySelectorAll('#storeTabs button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#storeTabs button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStoreTab = btn.dataset.store;
            renderStore();
        });
    });

    document.getElementById('payBillsBtn').addEventListener('click', payBills);
    document.querySelectorAll('[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => transfer(btn.dataset.dir));
    });

    await loadState();
}

async function loadState() {
    try {
        const data = await apiFetch(`/api/student/budget-game/state?student_id=${encodeURIComponent(studentData.student_id)}`);
        renderState(data);
    } catch (e) {
        console.error('Failed to load budget game state:', e);
    }
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
    if (data.bills_paid_this_period) {
        payBtn.disabled = true;
        payBtn.innerHTML = '<i class="fas fa-check me-1"></i>Paid This Period';
        billsMsg.textContent = '';
    } else {
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="fas fa-check me-1"></i>Pay Bills';
    }

    lastStoreCatalog = data.store;
    renderStore();
    renderTransactions(data.transactions);
    maybeShowPaycheckBanner(data.transactions);
}

function renderStore() {
    if (!lastStoreCatalog) return;
    const items = lastStoreCatalog[currentStoreTab] || [];
    document.getElementById('storeGrid').innerHTML = items.map(item => `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="item-card p-3 text-center h-100 d-flex flex-column justify-content-between">
                <div class="fw-bold mb-2">${item.label}</div>
                <div class="text-muted mb-2">${money(item.price)}</div>
                <button class="btn btn-sm btn-outline-primary fw-bold buy-btn" data-key="${item.key}">Buy</button>
            </div>
        </div>`).join('');
    document.querySelectorAll('.buy-btn').forEach(btn => {
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
