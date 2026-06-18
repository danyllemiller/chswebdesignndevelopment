// /js/modules/question-service.js
import { apiFetch } from './api-client.js';

export async function getDailyQuestions(date) {
    try {
        return await apiFetch(`/api/admin/daily-questions?date=${date}`);
    } catch (e) {
        console.error("Error fetching daily questions:", e);
        return { wd_question: '', cs_question: '' };
    }
}

export async function saveDailyQuestions(date, wd_question, cs_question) {
    return await apiFetch('/api/admin/save-daily-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, wd_question, cs_question })
    });
}