// /js/student/budget-game-card.js
import { getLoggedInUser } from '../modules/user-session.js';
import { apiFetch } from '../modules/api-client.js';

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

function maskNumber(num) {
    const last4 = num.replace(/\s/g, '').slice(-4);
    return `•••• •••• •••• ${last4}`;
}

async function init() {
    const authData = await waitForAuth();
    if (!authData.isAuthenticated) {
        window.location.replace(`/login.html?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
    }
    const studentData = getLoggedInUser();
    if (isStaffUser(studentData) || !studentData || !studentData.student_id) {
        document.querySelector('.card-wrap').innerHTML = '<div class="alert alert-warning text-center">Student-only page. <a href="/student/budget-game.html">Back to The Paycheck</a></div>';
        return;
    }

    try {
        const card = await apiFetch(`/api/student/budget-game/card?student_id=${encodeURIComponent(studentData.student_id)}`);
        let revealed = false;
        document.getElementById('cardNumber').textContent = maskNumber(card.card_number);
        document.getElementById('cardName').textContent = card.card_name;
        document.getElementById('cardExpiry').textContent = card.expiry;

        document.getElementById('revealBtn').addEventListener('click', (e) => {
            revealed = !revealed;
            document.getElementById('cardNumber').textContent = revealed ? card.card_number : maskNumber(card.card_number);
            e.target.innerHTML = revealed
                ? `<i class="fas fa-eye-slash me-1"></i>Hide Number (CVV: ${card.cvv})`
                : '<i class="fas fa-eye me-1"></i>Reveal Full Number &amp; CVV';
        });
    } catch (e) {
        document.querySelector('.card-wrap').innerHTML = `<div class="alert alert-danger text-center">Failed to load your card: ${e.message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', init);
