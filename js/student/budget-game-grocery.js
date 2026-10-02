// /js/student/budget-game-grocery.js
import { getLoggedInUser } from '../modules/user-session.js';
import { apiFetch } from '../modules/api-client.js';
import { createCartController } from './modules/budget-cart.js';

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

function isStaffUser(u) {
    return !!u && (u.role === 'admin' || u.section_id === 'Teacher');
}

function itemCardHtml(item, cart) {
    const img = item.image
        ? `<img src="${item.image}" alt="${item.label}" loading="lazy">`
        : `<i class="fas fa-apple-whole item-image-placeholder"></i>`;
    return `
        <div class="col-6 col-md-4 col-lg-3 col-xl-2">
            <div class="item-card">
                <div class="item-image-wrap">${img}</div>
                <div class="item-card-body">
                    <div class="item-label">${item.label}</div>
                    <div class="item-price-row">
                        <span class="item-price-tag">${money(item.price)}</span>
                        <button class="btn btn-sm btn-primary fw-bold add-to-cart-btn" data-key="${item.key}">Add</button>
                    </div>
                </div>
            </div>
        </div>`;
}

async function init() {
    const authData = await waitForAuth();
    if (!authData.isAuthenticated) {
        window.location.replace(`/login.html?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
    }
    const studentData = getLoggedInUser();
    if (isStaffUser(studentData)) {
        document.getElementById('storeGrid').classList.add('d-none');
        const msg = document.getElementById('blockedMsg');
        msg.classList.remove('d-none');
        msg.innerHTML = 'Staff: shopping pages are student-only for now. Use <a href="/student/budget-game.html">Staff Preview on The Paycheck</a> to review a student\'s balances, bills, and transaction history.';
        return;
    }
    if (!studentData || !studentData.student_id) {
        window.location.replace('/login.html');
        return;
    }

    const cart = createCartController('groceries', studentData.student_id);
    await cart.refresh();

    try {
        const data = await apiFetch(`/api/student/budget-game/state?student_id=${encodeURIComponent(studentData.student_id)}`);
        const items = (data.store && data.store.groceries) || [];
        const grid = document.getElementById('storeGrid');
        if (items.length === 0) {
            grid.innerHTML = '<div class="text-muted text-center py-5">The grocery store is empty right now -- check back soon.</div>';
            return;
        }
        grid.innerHTML = items.map(item => itemCardHtml(item)).join('');
        grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', () => cart.addItem(btn.dataset.key));
        });
    } catch (e) {
        document.getElementById('storeGrid').innerHTML = `<div class="text-danger text-center py-5">Failed to load the store: ${e.message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', init);
