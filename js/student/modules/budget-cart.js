// /js/student/modules/budget-cart.js
// Shared cart-drawer controller for student/budget-game-grocery.html and
// student/budget-game-mall.html -- both pages include the exact same cart
// drawer markup (same element IDs), so this one module can drive either
// page's cart/checkout without per-page configuration beyond which
// "store" (groceries vs mall) it's scoped to.
import { apiFetch } from '../../modules/api-client.js';

function money(n) {
    const v = Number(n) || 0;
    return (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2);
}

export function createCartController(store, studentId) {
    let items = [];
    let subtotal = 0;

    const drawer = document.getElementById('cartDrawer');
    const toggleBtn = document.getElementById('cartToggleBtn');
    const countBadge = document.getElementById('cartCountBadge');
    const itemsEl = document.getElementById('cartItems');
    const subtotalEl = document.getElementById('cartSubtotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const checkoutMsg = document.getElementById('checkoutMsg');
    const closeBtn = document.getElementById('cartCloseBtn');
    const overlay = document.getElementById('cartOverlay');

    function render() {
        const count = items.reduce((s, it) => s + it.quantity, 0);
        countBadge.textContent = count;
        countBadge.classList.toggle('d-none', count === 0);
        subtotalEl.textContent = money(subtotal);
        checkoutBtn.disabled = items.length === 0;

        if (items.length === 0) {
            itemsEl.innerHTML = '<div class="text-muted text-center small py-4">Your cart is empty.</div>';
            return;
        }
        itemsEl.innerHTML = items.map(it => `
            <div class="cart-row" data-key="${it.key}">
                <div class="cart-row-img">${it.image ? `<img src="${it.image}" alt="${it.label}">` : '<i class="fas fa-box text-muted"></i>'}</div>
                <div class="flex-grow-1">
                    <div class="fw-bold small">${it.label}${it.active ? '' : ' <span class="text-danger">(no longer available)</span>'}</div>
                    <div class="text-muted small">${money(it.price)} each</div>
                    <div class="d-flex align-items-center gap-2 mt-1">
                        <button class="btn btn-sm btn-outline-secondary qty-btn" data-key="${it.key}" data-delta="-1">-</button>
                        <span class="fw-bold">${it.quantity}</span>
                        <button class="btn btn-sm btn-outline-secondary qty-btn" data-key="${it.key}" data-delta="1">+</button>
                        <button class="btn btn-sm btn-link text-danger ms-auto remove-btn" data-key="${it.key}">Remove</button>
                    </div>
                </div>
                <div class="fw-bold">${money(it.price * it.quantity)}</div>
            </div>`).join('');

        itemsEl.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = items.find(it => it.key === btn.dataset.key);
                const newQty = item.quantity + Number(btn.dataset.delta);
                updateQty(btn.dataset.key, Math.max(0, newQty));
            });
        });
        itemsEl.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => updateQty(btn.dataset.key, 0));
        });
    }

    async function refresh() {
        const data = await apiFetch(`/api/student/budget-game/cart?student_id=${encodeURIComponent(studentId)}&store=${store}`);
        items = data.items || [];
        subtotal = data.subtotal || 0;
        render();
    }

    async function addItem(itemKey) {
        await apiFetch('/api/student/budget-game/cart/add', {
            method: 'POST', body: JSON.stringify({ student_id: studentId, item_key: itemKey })
        });
        await refresh();
        openDrawer();
    }

    async function updateQty(itemKey, qty) {
        await apiFetch('/api/student/budget-game/cart/update', {
            method: 'POST', body: JSON.stringify({ student_id: studentId, item_key: itemKey, quantity: qty })
        });
        await refresh();
    }

    function openDrawer() {
        drawer.classList.add('open');
        overlay.classList.add('open');
    }
    function closeDrawer() {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
    }

    toggleBtn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    checkoutBtn.addEventListener('click', async () => {
        checkoutBtn.disabled = true;
        checkoutMsg.className = 'small mt-2';
        checkoutMsg.textContent = '';
        try {
            const data = await apiFetch('/api/student/budget-game/checkout', {
                method: 'POST', body: JSON.stringify({ student_id: studentId, store })
            });
            showReceipt(data);
            await refresh();
        } catch (e) {
            checkoutMsg.classList.add('text-danger', 'fw-bold');
            checkoutMsg.textContent = e.message || 'Checkout failed.';
            checkoutBtn.disabled = false;
        }
    });

    function showReceipt(data) {
        const modalBody = document.getElementById('receiptBody');
        modalBody.innerHTML = `
            <div class="text-center mb-3">
                <i class="fas fa-circle-check fa-2x text-success mb-2"></i>
                <div class="fw-bold">Paid with card ending in ${data.card_last4}</div>
            </div>
            ${data.receipt.map(r => `
                <div class="d-flex justify-content-between small py-1 border-bottom">
                    <span>${r.label} &times; ${r.quantity}</span>
                    <span class="fw-bold">${money(r.price * r.quantity)}</span>
                </div>`).join('')}
            <div class="d-flex justify-content-between fw-bold mt-2 pt-2 border-top">
                <span>Total</span><span>${money(data.total)}</span>
            </div>`;
        new bootstrap.Modal(document.getElementById('receiptModal')).show();
        closeDrawer();
    }

    return { refresh, addItem, updateQty, openDrawer, closeDrawer };
}
