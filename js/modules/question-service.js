// /js/modules/question-service.js
import { apiFetch } from './api-client.js';

export async function getDailyQuestions(date) {
    try {
        return await apiFetch(`/api/admin/daily-questions?date=${date}`);
    } catch (e) {
        console.error("Error fetching daily questions:", e);
        return { groups: [], questions: {} };
    }
}

// questions: { WD1, WD2, WD_AS, CS_A, CS_B, CS_MON }
export async function saveDailyQuestions(date, questions) {
    return await apiFetch('/api/admin/daily-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, questions })
    });
}
