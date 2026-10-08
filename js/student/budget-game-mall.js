// /js/student/budget-game-mall.js
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

// Mall shows every store category except groceries (its own page) -- new
// categories a teacher adds later via Store Manager show up automatically,
// with a generic icon/label fallback for anything not in this map.
const CATEGORY_META = {
    clothes:   { label: 'Clothes',   icon: 'fa-shirt' },
    household: { label: 'Household', icon: 'fa-house-chimney' },
    vehicles:  { label: 'Vehicles',  icon: 'fa-car' },
    other:     { label: 'Other',     icon: 'fa-store' }
};

function itemCardHtml(item) {
    const img = item.image
        ? `<img src="${item.image}" alt="${item.label}" loading="lazy">`
        : `<i class="fas fa-box item-image-placeholder"></i>`;
    return `
        <div class="col-6 col-md-4 col-lg-3 col-xl-2">
            <div class="item-card">
                <div class="item-image-wrap">${img}</div>
                <div class="item-card-body">
                    <div class="item-label">${item.label}</div>
                    <div class="item-price-row">
                        <span class="item-price-tag">${money(item.price)}</span>
                        <button class="btn btn-sm btn-dark fw-bold add-to-cart-btn" data-key="${item.key}">Add</button>
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
        document.getElementById('storeSections').classList.add('d-none');
        const msg = document.getElementById('blockedMsg');
        msg.classList.remove('d-none');
        msg.innerHTML = 'Staff: shopping pages are student-only for now. Use <a href="/student/budget-game.html">Staff Preview on The Paycheck</a> to review a student\'s balances, bills, and transaction history.';
        return;
    }
    if (!studentData || !studentData.student_id) {
        window.location.replace('/login.html');
        return;
    }

    const cart = createCartController('mall', studentData.student_id);
    await cart.refresh();

    try {
        const data = await apiFetch(`/api/student/budget-game/state?student_id=${encodeURIComponent(studentData.student_id)}`);
        const categories = Object.keys(data.store || {}).filter(c => c !== 'groceries' && data.store[c].length);
        const container = document.getElementById('storeSections');
        const nav = document.getElementById('mallNav');

        if (categories.length === 0) {
            container.innerHTML = '<div class="text-muted text-center py-5">The Mall is empty right now -- check back soon.</div>';
            return;
        }

        nav.classList.remove('d-none');
        nav.innerHTML = categories.map(cat => {
            const meta = CATEGORY_META[cat] || { label: cat[0].toUpperCase() + cat.slice(1), icon: 'fa-store' };
            return `<a href="#mall-${cat}"><i class="fas ${meta.icon} me-1"></i>${meta.label}</a>`;
        }).join('');

        container.innerHTML = categories.map(cat => {
            const meta = CATEGORY_META[cat] || { label: cat[0].toUpperCase() + cat.slice(1), icon: 'fa-store' };
            return `
                <div id="mall-${cat}">
                    <div class="store-section-header"><i class="fas ${meta.icon} me-2"></i>${meta.label}</div>
                    <div class="store-section-body">
                        <div class="row g-3">${data.store[cat].map(itemCardHtml).join('')}</div>
                    </div>
                </div>`;
        }).join('');

        container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', () => cart.addItem(btn.dataset.key));
        });
    } catch (e) {
        document.getElementById('storeSections').innerHTML = `<div class="text-danger text-center py-5">Failed to load the Mall: ${e.message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', init);
