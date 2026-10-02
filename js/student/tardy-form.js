// /js/student/tardy-form.js
import { apiFetch } from '../modules/api-client.js';

document.getElementById('submitBtn').addEventListener('click', async () => {
    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('formMsg');
    const reason = document.getElementById('reasonInput').value.trim();
    btn.disabled = true;
    msg.className = 'small mt-2';
    msg.textContent = '';
    try {
        await apiFetch('/api/student/tardy-form/submit', {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
        document.getElementById('formArea').classList.add('d-none');
        document.getElementById('successArea').classList.remove('d-none');
    } catch (e) {
        msg.classList.add('text-danger', 'fw-bold');
        msg.textContent = e.message || 'Could not submit -- try again.';
        btn.disabled = false;
    }
});
