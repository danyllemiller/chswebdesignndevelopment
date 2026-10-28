// wpr-practice/assets/feedback.js
// Feedback for WPR Practice Pro, loaded on every page of the site. The "Report a bug / Request a feature" link
// in each footer (data-wfb-open) opens the form. While the pilot runs (through the 12/1/2026 PLC; the date is
// in server/routes/wprFeedback.js) a "Give feedback" button also floats in the corner, hidden during a test,
// and the form asks who you are and for 1-5 ratings. WprFeedback.survey() puts three quick questions on a
// student's results screen (wpr-practice/index.html). A student who took the test in class is never asked for
// a name and can't attach a screenshot, since a screenshot of the test could show their name.
(function () {
    const script = document.currentScript;
    const startRole = (script && script.dataset.role) || '';   // teacher.html starts the form on "I'm a teacher"
    const MAX_UPLOAD = 900 * 1024;                             // the web server turns away anything over 1 MB
    let cfg = { pilot: false };
    const ready = fetch('/api/wpr/feedback/config').then(r => (r.ok ? r.json() : {})).then(c => { cfg = Object.assign(cfg, c); }).catch(() => {});

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const chips = (name, opts, labelId) => `<div class="wfb-chips" role="radiogroup" aria-labelledby="${labelId}">${opts.map(([v, t]) =>
        `<label class="wfb-chip"><input type="radio" name="${name}" value="${v}"><span>${esc(t)}</span></label>`).join('')}</div>`;
    const scale = (name, lo, hi, labelId) => `<div class="wfb-scale" role="radiogroup" aria-labelledby="${labelId}"><span class="wfb-ends">1 = ${esc(lo)}</span>
        <span class="wfb-nums">${[1, 2, 3, 4, 5].map(n => `<label class="wfb-chip"><input type="radio" name="${name}" value="${n}"><span>${n}</span></label>`).join('')}</span>
        <span class="wfb-ends">5 = ${esc(hi)}</span></div>`;

    const ROLES = [['tester', 'I\'m a student helping test the site'], ['teacher', 'I\'m a teacher'], ['class-student', 'I\'m a student who took a test in class'], ['other', 'Someone else']];
    const TYPES = [['bug', 'Something broke'], ['confusing', 'Something was confusing'], ['idea', 'An idea or a feature request'], ['great', 'Something worked really well']];
    const SEVERITY = [['blocks', 'It stopped me'], ['annoying', 'Annoying, but I got past it'], ['minor', 'Just a small thing']];
    const ASK = { bug: 'What happened? What were you doing right before it broke?', confusing: 'What was confusing?', idea: 'What\'s your idea?', great: 'What worked well? (optional)' };
    const NEED = { bug: 'Tell us what happened', confusing: 'Tell us what was confusing', idea: 'Tell us your idea' };

    const css = document.createElement('style');
    css.textContent = `
    .wfb-fab { position: fixed; right: 16px; bottom: 16px; z-index: 1050; display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border: 0; border-radius: 999px; background: #1d2a48; color: #fff; font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; line-height: 1.2; box-shadow: 0 6px 18px rgba(0,0,0,.25); cursor: pointer; }
    .wfb-fab:hover { background: #26365c; }
    .wfb-fab svg { width: 18px; height: 18px; flex: none; }
    .wfb-pad { height: 64px; }
    body.wt-locked .wfb-fab, body.wt-locked .wfb-back, body.wt-locked .wfb-pad, body.wfb-surveying .wfb-fab, body.wfb-surveying .wfb-pad { display: none !important; }
    .wfb-back { position: fixed; inset: 0; z-index: 1060; display: flex; align-items: flex-start; justify-content: center; padding: 24px 12px; overflow-y: auto; background: rgba(15,23,42,.55); }
    .wfb-back[hidden] { display: none; }
    .wfb-modal, .wfb-survey { font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #1d2433; text-align: left; }
    .wfb-modal { position: relative; width: 100%; max-width: 560px; margin: auto 0; padding: 24px; border-radius: 14px; background: #fff; box-shadow: 0 20px 50px rgba(0,0,0,.3); }
    .wfb-modal h2, .wfb-survey h2 { margin: 0 40px 4px 0; font-size: 22px; font-weight: 800; line-height: 1.25; color: #1d2a48; }
    .wfb-sub { margin: 0 0 18px; color: #5d6779; font-size: 15px; }
    .wfb-x { position: absolute; top: 12px; right: 12px; width: 38px; height: 38px; border: 0; border-radius: 50%; background: #f1f3f7; color: #1d2433; font-size: 24px; line-height: 1; cursor: pointer; }
    .wfb-step { margin: 0 0 18px; }
    .wfb-step[hidden], .wfb-step [hidden] { display: none !important; }
    .wfb-q { display: block; margin: 0 0 8px; font-size: 16px; font-weight: 700; color: #1d2433; }
    .wfb-n { color: #2f7de1; }
    .wfb-rq { margin: 10px 0 6px; font-size: 15px; font-weight: 600; }
    .wfb-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .wfb-nums { display: flex; gap: 6px; }
    .wfb-chip { position: relative; margin: 0; }
    .wfb-chip input { position: absolute; top: 0; left: 0; width: 1px; height: 1px; margin: 0; opacity: 0; }
    .wfb-chip span { display: inline-block; padding: 8px 14px; border: 2px solid #d5dae3; border-radius: 999px; background: #fff; font-size: 15px; font-weight: 600; line-height: 1.3; cursor: pointer; user-select: none; }
    .wfb-chip span:hover { border-color: #9db8dc; }
    .wfb-chip input:checked + span { border-color: #2f7de1; background: #e8f1fc; color: #1d2a48; }
    .wfb-chip input:focus-visible + span { outline: 3px solid #f0b13c; outline-offset: 2px; }
    .wfb-scale { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
    .wfb-nums .wfb-chip span { min-width: 46px; padding: 8px 0; text-align: center; }
    .wfb-ends { font-size: 13px; color: #5d6779; }
    .wfb-modal textarea, .wfb-modal input[type=text], .wfb-modal input[type=email], .wfb-survey textarea { display: block; width: 100%; box-sizing: border-box; padding: 10px 12px; border: 2px solid #d5dae3; border-radius: 8px; background: #fff; color: inherit; font: inherit; }
    .wfb-modal textarea, .wfb-survey textarea { min-height: 96px; resize: vertical; }
    .wfb-modal input[type=file] { display: block; max-width: 100%; font-size: 15px; }
    .wfb-hint { display: block; margin: 6px 0 0; font-size: 14px; color: #5d6779; }
    .wfb-warn { margin: 8px 0 0; padding: 6px 10px; border-radius: 6px; background: #fdf3dd; color: #7a4a00; font-size: 14px; }
    .wfb-err { margin: 0 0 12px; color: #b42318; font-weight: 700; }
    .wfb-err:empty { display: none; }
    .wfb-row { display: flex; flex-wrap: wrap; gap: 10px; }
    .wfb-send, .wfb-ghost { padding: 12px 22px; border-radius: 10px; font-family: inherit; font-size: 17px; font-weight: 700; line-height: 1.2; cursor: pointer; }
    .wfb-send { flex: 1 1 auto; border: 0; background: #2f7de1; color: #fff; }
    .wfb-send:disabled { opacity: .65; cursor: wait; }
    .wfb-ghost { border: 2px solid #d5dae3; background: #fff; color: #1d2433; }
    .wfb-hp { position: absolute !important; left: -9999px !important; width: 1px !important; height: 1px !important; opacity: 0 !important; }
    .wfb-done { padding: 12px 0 4px; text-align: center; }
    .wfb-done h2 { margin: 0 0 4px; }
    .wfb-done .wfb-big { font-size: 46px; line-height: 1.1; }
    .wfb-survey { position: relative; margin: 8px 0 24px; padding: 18px 20px; border: 2px solid #cfe0f7; border-radius: 12px; background: #f5f9ff; }
    .wfb-survey .wfb-step { margin-bottom: 16px; }
    .wfb-thanks { margin: 0; font-weight: 700; color: #146c43; }
    @media (max-width: 480px) { .wfb-fab { right: 12px; bottom: 12px; padding: 9px 14px; font-size: 14px; } .wfb-modal { padding: 20px 16px; } .wfb-survey { padding: 14px; } .wfb-nums .wfb-chip span { min-width: 40px; } }
    @media print { .wfb-fab, .wfb-pad, .wfb-back, .wfb-survey { display: none !important; } }`;
    document.head.appendChild(css);

    // A short description of the device for bug reports, like "Chromebook · Chrome 130 · 1366×768"
    function device() {
        const ua = navigator.userAgent;
        const os = /CrOS/.test(ua) ? 'Chromebook' : /iPhone|iPod/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad'
            : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Other';
        const [, br, v] = ua.match(/(Edg|OPR|Firefox|FxiOS|CriOS|Chrome)\/(\d+)/) || (/Safari\//.test(ua) && ua.match(/(Version)\/(\d+)/)) || [];
        const name = { Edg: 'Edge', OPR: 'Opera', FxiOS: 'Firefox', CriOS: 'Chrome', Version: 'Safari' }[br] || br || 'Other browser';
        return `${os} · ${name}${v ? ' ' + v : ''} · ${window.innerWidth}×${window.innerHeight}`;
    }

    // Phone and Chromebook screenshots are often 2-5 MB, so a big one is redrawn as a smaller JPEG.
    async function shrink(file) {
        if (file.size <= MAX_UPLOAD && /^image\/(png|jpeg|webp|gif)$/.test(file.type)) return file;
        const url = URL.createObjectURL(file);
        try {
            const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
            let size = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
            for (let i = 0; i < 5; i++, size *= 0.75) {
                const c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(img.naturalWidth * size)); c.height = Math.max(1, Math.round(img.naturalHeight * size));
                const g = c.getContext('2d');
                g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
                const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.8));
                if (blob && blob.size <= MAX_UPLOAD) return blob;
            }
        } catch (e) { /* a picture this browser can't open */ } finally { URL.revokeObjectURL(url); }
        return null;
    }

    async function send(fields, file) {
        const fd = new FormData();
        Object.entries(fields).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') fd.append(k, v); });
        fd.append('page', location.pathname);
        fd.append('device', device());
        if (file) fd.append('screenshot', file, file.name || 'screenshot.jpg');
        const res = await fetch('/api/wpr/feedback', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(res.status === 413 ? 'That picture is too big. Try a smaller screenshot.' : data.error || 'It didn\'t send. Check your internet and try again.');
        return data;
    }

    // ---- The form (a pop-up window) ----
    let back = null, opener = null;
    function formHtml() {
        const pilot = cfg.pilot;
        return `<h2 id="wfbTitle">${pilot ? 'Give feedback' : 'Report a bug or request a feature'}</h2>
          <p class="wfb-sub">${pilot ? 'We\'re trying out WPR Practice Pro before more classes use it. Tell us what broke, what confused you, or what would make it better.' : 'Tell us what went wrong, or what you wish the site could do.'}</p>
          <form novalidate>
            ${pilot ? `<div class="wfb-step" data-step="role"><div class="wfb-q" id="wfbQRole"><span class="wfb-n"></span>Who are you?</div>${chips('role', ROLES, 'wfbQRole')}</div>` : ''}
            <div class="wfb-step" data-step="type"><div class="wfb-q" id="wfbQType"><span class="wfb-n"></span>What do you want to tell us?</div>${chips('type', TYPES, 'wfbQType')}</div>
            <div class="wfb-step" data-step="severity" hidden><div class="wfb-q" id="wfbQSev"><span class="wfb-n"></span>How much did it get in your way?</div>${chips('severity', SEVERITY, 'wfbQSev')}</div>
            <div class="wfb-step" data-step="message"><label class="wfb-q" for="wfbMsg"><span class="wfb-n"></span><span class="wfb-ask">Tell us more</span></label>
              <textarea id="wfbMsg" name="message" maxlength="4000"></textarea>
              <p class="wfb-hint" data-noname hidden>Don't type your name or student ID.</p></div>
            <div class="wfb-step" data-step="expected" hidden><label class="wfb-q" for="wfbExp"><span class="wfb-n"></span>What did you expect to happen? (optional)</label>
              <textarea id="wfbExp" name="expected" maxlength="2000"></textarea></div>
            ${pilot ? `<div class="wfb-step" data-step="ratings"><div class="wfb-q"><span class="wfb-n"></span>Rate the site so far (optional)</div>
              <div class="wfb-rq" id="wfbQEasy">How easy is it to use?</div>${scale('easy', 'very hard', 'very easy', 'wfbQEasy')}
              <div class="wfb-rq" id="wfbQClear">How clear are the directions?</div>${scale('clear', 'very confusing', 'very clear', 'wfbQClear')}
              <div data-teacher hidden><div class="wfb-rq" id="wfbQRep">How useful are the results and downloads?</div>${scale('reports', 'not useful', 'very useful', 'wfbQRep')}</div></div>` : ''}
            <div class="wfb-step" data-step="shot"><label class="wfb-q" for="wfbShot"><span class="wfb-n"></span>Add a screenshot (optional)</label>
              <input type="file" id="wfbShot" accept="image/png,image/jpeg,image/webp,image/gif">
              <p class="wfb-warn">Cover or crop out any student names and ID numbers first.</p></div>
            <div class="wfb-step" data-step="name"><label class="wfb-q" for="wfbName"><span class="wfb-n"></span>Your name (optional)</label>
              <input type="text" id="wfbName" name="name" maxlength="60" autocomplete="name"></div>
            <div class="wfb-step" data-step="contact" hidden><label class="wfb-q" for="wfbContact"><span class="wfb-n"></span>Your email, if you'd like a reply (optional)</label>
              <input type="email" id="wfbContact" name="contact" maxlength="120" autocomplete="email"></div>
            <input type="text" name="website" class="wfb-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
            <p class="wfb-err" role="alert"></p>
            <button type="submit" class="wfb-send">Send feedback</button>
          </form>`;
    }
    const picked = (root, name) => (root.querySelector(`input[name="${name}"]:checked`) || {}).value || '';

    // Show only the steps that fit the answers so far, and number them in order.
    function sync(form) {
        const role = picked(form, 'role'), type = picked(form, 'type'), kid = role === 'class-student';
        const show = (step, on) => { const el = form.querySelector(`[data-step="${step}"]`); if (el) el.hidden = !on; };
        show('severity', type === 'bug' || type === 'confusing');
        show('expected', type === 'bug');
        show('shot', !kid);
        show('name', !kid);
        show('contact', !cfg.pilot || role === 'teacher' || role === 'other');
        form.querySelector('[data-noname]').hidden = !kid;
        const t = form.querySelector('[data-teacher]'); if (t) t.hidden = role !== 'teacher';
        form.querySelector('.wfb-ask').textContent = ASK[type] || 'Tell us more';
        if (kid) ['wfbShot', 'wfbName', 'wfbContact'].forEach(id => { form.querySelector('#' + id).value = ''; });
        let n = 0;
        form.querySelectorAll('.wfb-step').forEach(s => { if (!s.hidden) s.querySelector('.wfb-n').textContent = `${++n}. `; });
    }

    async function submit(form) {
        const field = id => form.querySelector('#' + id).value.trim(), err = form.querySelector('.wfb-err');
        const role = picked(form, 'role'), type = picked(form, 'type'), kid = role === 'class-student';
        const stepNo = step => form.querySelector(`[data-step="${step}"] .wfb-n`).textContent.replace(/\D/g, '');
        const fail = (msg, step) => {
            err.textContent = msg;
            const el = form.querySelector(`[data-step="${step}"]`);
            if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); (el.querySelector('input, textarea') || el).focus({ preventScroll: true }); }
        };
        err.textContent = '';
        if (cfg.pilot && !role) return fail(`Pick who you are (step ${stepNo('role')}).`, 'role');
        if (!type) return fail(`Pick what you want to tell us (step ${stepNo('type')}).`, 'type');
        const message = field('wfbMsg');
        if (NEED[type] && message.length < 3) return fail(`${NEED[type]} in step ${stepNo('message')}. A sentence is plenty.`, 'message');
        let file = null;
        const shot = !kid && form.querySelector('#wfbShot').files[0];
        if (shot && !(file = await shrink(shot))) return fail('We couldn\'t use that picture. Try a PNG or JPG screenshot.', 'shot');
        const ratings = {};
        ['easy', 'clear'].concat(role === 'teacher' ? ['reports'] : []).forEach(k => { const n = picked(form, k); if (n) ratings[k] = Number(n); });
        const btn = form.querySelector('.wfb-send');
        btn.disabled = true; btn.textContent = 'Sending…';
        try {
            await send({
                kind: cfg.pilot ? 'pilot' : 'report', role, type,
                severity: type === 'bug' || type === 'confusing' ? picked(form, 'severity') : '',
                message, expected: type === 'bug' ? field('wfbExp') : '',
                ratings: Object.keys(ratings).length ? JSON.stringify(ratings) : '',
                name: kid ? '' : field('wfbName'), contact: form.querySelector('[data-step="contact"]').hidden ? '' : field('wfbContact'),
                website: form.querySelector('.wfb-hp').value
            }, file);
            thanks();
        } catch (e) {
            btn.disabled = false; btn.textContent = 'Send feedback';
            err.textContent = e.message;
        }
    }

    function thanks() {
        const body = back.querySelector('.wfb-body');
        body.innerHTML = `<div class="wfb-done"><div class="wfb-big" aria-hidden="true">🙌</div><h2 id="wfbTitle">Thank you!</h2>
            <p class="wfb-sub">Your feedback was sent. Every one gets read.</p>
            <div class="wfb-row"><button type="button" class="wfb-send" data-wfb-again>Send more feedback</button><button type="button" class="wfb-ghost" data-wfb-close>Close</button></div></div>`;
        body.querySelector('[data-wfb-again]').focus();
    }

    function newForm() {
        const body = back.querySelector('.wfb-body');
        body.innerHTML = formHtml();
        const form = body.querySelector('form');
        const r = startRole && form.querySelector(`input[name="role"][value="${startRole}"]`);
        if (r) r.checked = true;
        form.addEventListener('change', () => sync(form));
        form.addEventListener('submit', e => { e.preventDefault(); submit(form); });
        sync(form);
        return form;
    }

    async function open(from) {
        await ready;
        opener = from || document.activeElement;
        if (!back) {
            back = document.createElement('div');
            back.className = 'wfb-back'; back.hidden = true;
            back.innerHTML = '<div class="wfb-modal" role="dialog" aria-modal="true" aria-labelledby="wfbTitle"><button type="button" class="wfb-x" aria-label="Close">×</button><div class="wfb-body"></div></div>';
            document.body.appendChild(back);
            back.addEventListener('click', e => {
                if (e.target === back || e.target.closest('.wfb-x, [data-wfb-close]')) close();
                else if (e.target.closest('[data-wfb-again]')) newForm().querySelector('input, textarea').focus();
            });
            back.addEventListener('keydown', e => {
                if (e.key === 'Escape') return close();
                if (e.key !== 'Tab') return;   // keep Tab inside the window
                const all = [...back.querySelectorAll('button, input, textarea')].filter(el => !el.disabled && el.tabIndex !== -1 && el.getClientRects().length);
                const first = all[0], last = all[all.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            });
        }
        // Whatever was typed is still there if the window was closed without sending.
        const form = back.querySelector('form') || newForm();
        back.hidden = false;
        document.documentElement.style.overflow = 'hidden';
        (form.querySelector('input:checked') || form.querySelector('input, textarea')).focus();
    }

    function close() {
        if (!back || back.hidden) return;
        back.hidden = true;
        document.documentElement.style.overflow = '';
        if (back.querySelector('.wfb-done')) back.querySelector('.wfb-body').innerHTML = '';
        if (opener && opener.focus) opener.focus();
    }

    document.addEventListener('click', e => {
        const a = e.target.closest && e.target.closest('[data-wfb-open]');
        if (!a) return;
        e.preventDefault();
        open(a);
    });

    ready.then(() => {
        if (!cfg.pilot) return;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'wfb-fab'; b.setAttribute('data-wfb-open', '');
        b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/></svg><span>Give feedback</span>';
        const pad = document.createElement('div'); pad.className = 'wfb-pad';   // so the button never covers the bottom of the page
        document.body.append(pad, b);
    });

    // ---- Three quick questions on a student's results screen, during the pilot ----
    async function survey(after, opts) {
        await ready;
        if (!cfg.pilot || !after) return;
        const card = document.createElement('section');
        card.className = 'wfb-survey';
        card.setAttribute('aria-labelledby', 'wfbSvTitle');
        card.innerHTML = `<h2 id="wfbSvTitle">Help us make this test better</h2>
          <p class="wfb-sub">3 quick questions. Don't write your name.</p>
          <div class="wfb-step"><div class="wfb-q" id="wfbSvQ1">1. How clear were the directions?</div>${scale('sv_clear', 'very confusing', 'very clear', 'wfbSvQ1')}</div>
          <div class="wfb-step"><div class="wfb-q" id="wfbSvQ2">2. Did anything break or not work right?</div>${chips('sv_broke', [['no', 'No'], ['yes', 'Yes']], 'wfbSvQ2')}
            <div data-what hidden><label class="wfb-hint" for="wfbSvWhat">What happened?</label><textarea id="wfbSvWhat" maxlength="2000"></textarea></div></div>
          <div class="wfb-step"><div class="wfb-q" id="wfbSvQ3">3. How did taking the test feel?</div>${chips('sv_felt', [['smooth', 'Smooth'], ['okay', 'Okay'], ['frustrating', 'Frustrating']], 'wfbSvQ3')}</div>
          <input type="text" class="wfb-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
          <p class="wfb-err" role="alert"></p>
          <div class="wfb-row"><button type="button" class="wfb-send" data-sv-send>Send</button><button type="button" class="wfb-ghost" data-sv-skip>No thanks</button></div>`;
        after.insertAdjacentElement('afterend', card);
        document.body.classList.add('wfb-surveying');   // the survey stands in for the floating button
        const finished = () => document.body.classList.remove('wfb-surveying');
        card.addEventListener('change', () => { card.querySelector('[data-what]').hidden = picked(card, 'sv_broke') !== 'yes'; });
        card.querySelector('[data-sv-skip]').addEventListener('click', () => { card.remove(); finished(); });
        card.querySelector('[data-sv-send]').addEventListener('click', async (e) => {
            const btn = e.currentTarget, err = card.querySelector('.wfb-err');
            const clear = picked(card, 'sv_clear'), broke = picked(card, 'sv_broke'), felt = picked(card, 'sv_felt');
            if (!clear && !broke && !felt) { err.textContent = 'Answer at least one question, or tap No thanks.'; return; }
            btn.disabled = true; btn.textContent = 'Sending…'; err.textContent = '';
            try {
                await send({
                    kind: 'survey', role: 'class-student', type: broke === 'yes' ? 'bug' : '',
                    message: broke === 'yes' ? card.querySelector('#wfbSvWhat').value.trim() : '',
                    ratings: JSON.stringify({ clear: clear ? Number(clear) : undefined, broke: broke || undefined, felt: felt || undefined }),
                    code: (opts && opts.code) || '', website: card.querySelector('.wfb-hp').value
                });
                card.innerHTML = '<p class="wfb-thanks">Thanks! Your answers were sent.</p>';
                finished();
            } catch (x) {
                btn.disabled = false; btn.textContent = 'Send';
                err.textContent = x.message;
            }
        });
    }

    window.WprFeedback = { open, survey };
})();
