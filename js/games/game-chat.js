/**
 * game-chat.js -- room chat for the multiplayer review games.
 * Loaded by review_games_logic.js only when the page has a ?room= code.
 * One chat per review page + room code (server/routes/gameChat.js), so a
 * room on the Unit 2 review and the same code on the Unit 3 review are
 * separate chats. Names come from the student's login, not the game name.
 */
(function () {
    if (window.__gameChatLoaded) return;
    window.__gameChatLoaded = true;

    const room = (new URLSearchParams(location.search)).get('room');
    if (!room || room === 'solo') return;
    const roomKey = `${location.pathname}|${room.toLowerCase()}`;
    const POLL_MS = 2500;
    let lastId = 0, open = false, unread = 0, sending = false;

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const timeStr = ts => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const style = document.createElement('style');
    style.textContent = `
      #gc-toggle { position: fixed; right: 18px; bottom: 18px; z-index: 39000; border: none; border-radius: 999px;
        padding: .7rem 1.1rem; font-weight: 800; color: #fff; background: var(--primary-color, #0d6efd);
        box-shadow: 0 .4rem 1rem rgba(0,0,0,.35); }
      #gc-badge { background: #dc3545; color: #fff; border-radius: 999px; padding: 0 .45rem; margin-left: .35rem; font-size: .8rem; }
      #gc-panel { position: fixed; right: 18px; bottom: 78px; z-index: 39000; width: min(340px, calc(100vw - 36px));
        height: min(440px, calc(100vh - 120px)); display: none; flex-direction: column; background: #fff;
        border-radius: 1rem; box-shadow: 0 .8rem 2rem rgba(0,0,0,.4); overflow: hidden; color: #212529; }
      #gc-panel.open { display: flex; }
      #gc-head { background: var(--primary-color, #0d6efd); color: #fff; padding: .6rem .9rem; font-weight: 800;
        display: flex; justify-content: space-between; align-items: center; }
      #gc-head button { background: none; border: none; color: #fff; font-size: 1.2rem; line-height: 1; }
      #gc-list { flex: 1; overflow-y: auto; padding: .6rem .75rem; background: #f8f9fa; font-size: .92rem; }
      .gc-msg { margin-bottom: .45rem; word-wrap: break-word; }
      .gc-msg .gc-name { font-weight: 800; }
      .gc-msg .gc-time { color: #6c757d; font-size: .72rem; margin-left: .3rem; }
      .gc-msg.teacher .gc-name { color: #6f42c1; }
      .gc-msg.mine .gc-name { color: #198754; }
      .gc-note { color: #6c757d; font-size: .82rem; text-align: center; margin: .4rem 0; }
      #gc-form { display: flex; gap: .4rem; padding: .5rem; border-top: 1px solid #dee2e6; }
      #gc-input { flex: 1; min-width: 0; border: 2px solid #ced4da; border-radius: .5rem; padding: .4rem .55rem; }
      #gc-send { border: none; border-radius: .5rem; padding: .4rem .8rem; font-weight: 800; color: #fff; background: var(--primary-color, #0d6efd); }
      #gc-error { color: #dc3545; font-size: .8rem; padding: 0 .6rem .4rem; min-height: 0; }
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <button id="gc-toggle" type="button">💬 Chat<span id="gc-badge" style="display:none"></span></button>
      <div id="gc-panel" role="dialog" aria-label="Room chat">
        <div id="gc-head"><span>💬 Room chat: ${esc(room)}</span><button type="button" id="gc-close" aria-label="Close chat">×</button></div>
        <div id="gc-list"><div class="gc-note">Your teacher can see everything in this chat. Keep it kind and on topic.</div></div>
        <div id="gc-error"></div>
        <form id="gc-form" autocomplete="off">
          <input id="gc-input" maxlength="150" placeholder="Type a message…">
          <button id="gc-send" type="submit">Send</button>
        </form>
      </div>`;
    document.body.appendChild(wrap);

    const panel = document.getElementById('gc-panel');
    const list = document.getElementById('gc-list');
    const badge = document.getElementById('gc-badge');
    const input = document.getElementById('gc-input');
    const errEl = document.getElementById('gc-error');
    const form = document.getElementById('gc-form');

    function setUnread(n) {
        unread = n;
        badge.style.display = n > 0 ? 'inline' : 'none';
        badge.textContent = n > 9 ? '9+' : String(n);
    }
    function setOpen(v) {
        open = v;
        panel.classList.toggle('open', v);
        if (v) { setUnread(0); list.scrollTop = list.scrollHeight; input.focus(); }
    }
    document.getElementById('gc-toggle').addEventListener('click', () => setOpen(!open));
    document.getElementById('gc-close').addEventListener('click', () => setOpen(false));
    // Typing in the chat mustn't trigger game keyboard shortcuts.
    panel.addEventListener('keydown', e => e.stopPropagation());

    function render(messages) {
        const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
        messages.forEach(m => {
            const cls = m.is_teacher ? 'teacher' : (m.mine ? 'mine' : '');
            const div = document.createElement('div');
            div.className = `gc-msg ${cls}`;
            div.dataset.id = m.id;
            div.innerHTML = `<span class="gc-name">${esc(m.display_name)}</span><span class="gc-time">${esc(timeStr(m.created_at))}</span><div>${esc(m.message)}</div>`;
            list.appendChild(div);
        });
        if (atBottom || !open) list.scrollTop = list.scrollHeight;
    }

    async function poll() {
        try {
            const res = await fetch(`/api/game-chat?room=${encodeURIComponent(roomKey)}&after=${lastId}`);
            if (res.ok) {
                const body = await res.json();
                const disabled = !body.enabled;
                input.disabled = disabled;
                document.getElementById('gc-send').disabled = disabled;
                input.placeholder = disabled ? 'Chat is turned off by your teacher' : 'Type a message…';
                (body.hiddenIds || []).forEach(id => { const el = list.querySelector(`.gc-msg[data-id="${id}"]`); if (el) el.remove(); });
                const msgs = body.messages || [];
                if (msgs.length) {
                    const first = lastId === 0;
                    render(msgs);
                    lastId = msgs[msgs.length - 1].id;
                    if (!open && !first) setUnread(unread + msgs.filter(m => !m.mine).length);
                }
            }
        } catch (e) { /* next poll retries */ }
        setTimeout(poll, POLL_MS);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = input.value.trim();
        if (!message || sending) return;
        sending = true;
        errEl.textContent = '';
        try {
            const res = await fetch('/api/game-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room: roomKey, message })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) { errEl.textContent = body.error || 'Message didn\'t send.'; }
            else { input.value = ''; }
        } catch (err) {
            errEl.textContent = 'Message didn\'t send -- check your connection.';
        } finally {
            sending = false;
            input.focus();
        }
    });

    poll();
})();
