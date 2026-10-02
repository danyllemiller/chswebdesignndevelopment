// /js/admin/budget-game-leaderboard.js
import { apiFetch } from '../modules/api-client.js';

function money(n) {
    const v = Number(n) || 0;
    return (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2);
}

function scoreClass(score) {
    if (score >= 75) return 'score-high';
    if (score >= 45) return 'score-mid';
    return 'score-low';
}

function rankClass(rank) {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return '';
}

function renderRows(rows) {
    const tbody = document.getElementById('leaderboardBody');
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center p-5 text-muted">No one played The Paycheck during this quarter yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = rows.map((r, i) => {
        const rank = i + 1;
        const medal = rank === 1 ? '<i class="fas fa-crown me-1"></i>' : '';
        return `
            <tr>
                <td class="rank-cell ${rankClass(rank)}">${medal}${rank}</td>
                <td class="fw-bold">${r.last_name}, ${r.first_name}</td>
                <td>${r.section_id || ''}</td>
                <td><span class="score-pill ${scoreClass(r.score)}">${r.score}</span></td>
                <td>${r.bills_paid}/${r.paychecks} <span class="text-muted small">(${Math.round(r.bills_rate * 100)}%)</span></td>
                <td>${Math.round(r.savings_rate * 100)}%</td>
                <td class="${r.overdrafts > 0 ? 'overdraft-flag' : ''}">${r.overdrafts}</td>
                <td>${r.life_events}${r.life_events_negative ? ` <span class="text-muted small">(${r.life_events_negative} rough)</span>` : ''}</td>
                <td>${money(r.net_worth)}</td>
            </tr>`;
    }).join('');
}

async function loadLeaderboard(start, end) {
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = `<tr><td colspan="9" class="text-center p-5 text-muted"><div class="spinner-border text-primary mb-3"></div><br>Loading…</td></tr>`;
    try {
        const params = new URLSearchParams();
        if (start) params.set('start', start);
        if (end) params.set('end', end);
        const data = await apiFetch(`/api/admin/budget-game/leaderboard?${params.toString()}`);
        renderRows(data.rows || []);
        return data;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center p-5 text-danger">Failed to load leaderboard: ${e.message || e}</td></tr>`;
        return null;
    }
}

async function init() {
    const data = await loadLeaderboard();
    if (!data) return;

    const select = document.getElementById('quarterSelect');
    select.innerHTML = (data.quarters || []).map(q =>
        `<option value="${q.start}|${q.end}" ${q.start === data.start ? 'selected' : ''}>${q.label} (${q.start} – ${q.end})</option>`
    ).join('');

    select.addEventListener('change', () => {
        const [start, end] = select.value.split('|');
        loadLeaderboard(start, end);
    });
}

document.addEventListener('DOMContentLoaded', init);
