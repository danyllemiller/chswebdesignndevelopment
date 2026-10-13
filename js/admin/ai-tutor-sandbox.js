// /js/admin/ai-tutor-sandbox.js
import { apiFetch } from '../modules/api-client.js';

const chatLog = document.getElementById('chatLog');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chapterContextInput = document.getElementById('chapterContext');
const newConvoBtn = document.getElementById('newConvoBtn');
const sessionsBody = document.getElementById('sessionsBody');

const SESSION_KEY = 'aiTutorSandboxSessionId';

function newSessionId() {
    return `sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
        id = newSessionId();
        sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
}

function fmtTime(d) {
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function appendBubble(role, content, meta) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.textContent = content;
    if (meta) {
        const metaEl = document.createElement('div');
        metaEl.className = 'chat-meta';
        metaEl.textContent = meta;
        bubble.appendChild(metaEl);
    }
    chatLog.appendChild(bubble);
    chatLog.scrollTop = chatLog.scrollHeight;
    return bubble;
}

async function loadHistory(sessionId) {
    chatLog.innerHTML = '';
    try {
        const data = await apiFetch(`/api/admin/ai-tutor/history?session_id=${encodeURIComponent(sessionId)}`);
        const messages = data.messages || [];
        if (messages.length === 0) {
            appendBubble('assistant', "New conversation — type a message below as if you were a student and see how it responds.");
            return;
        }
        messages.forEach(m => appendBubble(m.role, m.content, fmtTime(m.created_at)));
    } catch (e) {
        appendBubble('assistant', `Failed to load history: ${e.message}`);
    }
}

async function loadSessions() {
    sessionsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted p-3">Loading…</td></tr>';
    try {
        const data = await apiFetch('/api/admin/ai-tutor/sessions');
        const sessions = data.sessions || [];
        if (sessions.length === 0) {
            sessionsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted p-3">No sandbox conversations yet.</td></tr>';
            return;
        }
        sessionsBody.innerHTML = sessions.map(s => `
            <tr class="session-row" data-session-id="${s.session_id}">
                <td>${s.tester_id}</td>
                <td>${s.chapter_context || '<span class="text-muted">—</span>'}</td>
                <td>${s.message_count}</td>
                <td>${fmtTime(s.last_activity)}</td>
            </tr>`).join('');
        sessionsBody.querySelectorAll('.session-row').forEach(row => {
            row.addEventListener('click', () => {
                const sid = row.dataset.sessionId;
                sessionStorage.setItem(SESSION_KEY, sid);
                loadHistory(sid);
            });
        });
    } catch (e) {
        sessionsBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger p-3">Failed to load: ${e.message}</td></tr>`;
    }
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
    chatInput.value = '';
    chatInput.disabled = true;

    appendBubble('user', message);
    const pending = appendBubble('pending', 'Thinking…');

    try {
        const sessionId = getSessionId();
        const chapter_context = chapterContextInput.value.trim() || null;
        const data = await apiFetch('/api/admin/ai-tutor/message', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId, chapter_context, message })
        });
        pending.remove();
        appendBubble('assistant', data.reply);
    } catch (e) {
        pending.remove();
        appendBubble('assistant', `Error: ${e.message}`);
    } finally {
        chatInput.disabled = false;
        chatInput.focus();
        loadSessions();
    }
});

newConvoBtn.addEventListener('click', () => {
    sessionStorage.setItem(SESSION_KEY, newSessionId());
    loadHistory(getSessionId());
});

document.addEventListener('DOMContentLoaded', () => {
    loadHistory(getSessionId());
    loadSessions();
});
