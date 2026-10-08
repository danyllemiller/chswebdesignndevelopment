// /js/admin/budget-game-store.js
import { apiFetch } from '../modules/api-client.js';

function money(n) {
    return '$' + (Number(n) || 0).toFixed(2);
}

const CATEGORY_LABELS = { groceries: 'Groceries', clothes: 'Clothes', household: 'Household', vehicles: 'Vehicles', other: 'Other' };

function renderItems(items) {
    const container = document.getElementById('itemsList');
    if (items.length === 0) {
        container.innerHTML = '<div class="text-muted text-center p-4">No items yet -- add one above.</div>';
        return;
    }
    const byCategory = {};
    items.forEach(it => { (byCategory[it.category] = byCategory[it.category] || []).push(it); });

    container.innerHTML = Object.keys(byCategory).map(cat => `
        <h6 class="fw-bold text-primary mt-3">${CATEGORY_LABELS[cat] || cat}</h6>
        <div class="list-group mb-3">
            ${byCategory[cat].map(it => `
                <div class="list-group-item d-flex align-items-center gap-3 ${it.active ? '' : 'inactive-row'}" data-id="${it.id}">
                    ${it.image_url
                        ? `<img src="${it.image_url}" class="item-row-img" alt="${it.label}">`
                        : `<div class="item-row-img-placeholder"><i class="fas fa-image"></i></div>`}
                    <div class="flex-grow-1">
                        <div class="fw-bold">${it.label}</div>
                        <div class="text-muted small">${money(it.price)} ${it.active ? '' : '&middot; inactive'}</div>
                    </div>
                    <label class="btn btn-sm btn-outline-secondary mb-0" title="Replace photo">
                        <i class="fas fa-camera"></i>
                        <input type="file" class="d-none replace-image-input" accept="image/png,image/jpeg,image/webp,image/gif">
                    </label>
                    <button class="btn btn-sm ${it.active ? 'btn-outline-danger' : 'btn-outline-success'} toggle-active-btn" data-active="${it.active}">
                        ${it.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                </div>
            `).join('')}
        </div>
    `).join('');

    container.querySelectorAll('.toggle-active-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const row = btn.closest('[data-id]');
            const id = row.dataset.id;
            const nowActive = btn.dataset.active === 'true';
            btn.disabled = true;
            try {
                await apiFetch(`/api/admin/budget-game/store-items/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ active: !nowActive })
                });
                load();
            } catch (e) {
                alert('Failed: ' + e.message);
                btn.disabled = false;
            }
        });
    });

    container.querySelectorAll('.replace-image-input').forEach(input => {
        input.addEventListener('change', async () => {
            const file = input.files[0];
            if (!file) return;
            const row = input.closest('[data-id]');
            const id = row.dataset.id;
            const fd = new FormData();
            fd.append('image', file);
            try {
                const res = await fetch(`/api/admin/budget-game/store-items/${id}`, { method: 'PATCH', body: fd });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to update photo.');
                load();
            } catch (e) {
                alert('Failed: ' + e.message);
            }
        });
    });
}

async function load() {
    try {
        const data = await apiFetch('/api/admin/budget-game/store-items');
        renderItems(data.items || []);
    } catch (e) {
        document.getElementById('itemsList').innerHTML = `<div class="text-danger text-center p-4">Failed to load: ${e.message}</div>`;
    }
}

document.getElementById('addItemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('addItemBtn');
    const msg = document.getElementById('addItemMsg');
    const category = document.getElementById('newCategory').value;
    const label = document.getElementById('newLabel').value.trim();
    const price = document.getElementById('newPrice').value;
    const imageFile = document.getElementById('newImage').files[0];

    if (!label || !(Number(price) > 0)) {
        msg.className = 'small text-danger fw-bold';
        msg.textContent = 'Enter a name and a price greater than $0.';
        return;
    }

    btn.disabled = true;
    msg.className = 'small';
    msg.textContent = '';

    const fd = new FormData();
    fd.append('category', category);
    fd.append('label', label);
    fd.append('price', price);
    if (imageFile) fd.append('image', imageFile);

    try {
        const res = await fetch('/api/admin/budget-game/store-items', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add item.');
        document.getElementById('addItemForm').reset();
        load();
    } catch (e) {
        msg.classList.add('text-danger', 'fw-bold');
        msg.textContent = e.message;
    } finally {
        btn.disabled = false;
    }
});

document.addEventListener('DOMContentLoaded', load);
