// js/admin/accommodations.js -- the teacher's Accommodations page (admin/accommodations.html).
// STEP 1 reads an IEP / 504 At-A-Glance PDF on the server (POST /api/admin/accommodations/read; the PDF isn't
// kept), STEP 2 shows who it's for and what it says for checking, STEP 3 saves it to the student
// (PUT /api/admin/accommodations/:id). Below: every student with a plan, with Edit and Remove.
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => (d ? new Date(`${d}T12:00:00`).toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' }) : '');
const today = new Date().toLocaleDateString('en-CA');
let roster = [], plans = [], editingId = null;

async function api(url, opts = {}) {
    const res = await fetch(url, opts);
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || 'Something went wrong. Try again.');
    return out;
}

// ---------- the form ----------
function studentOptions(selected) {
    $('student').innerHTML = '<option value="">Pick the student…</option>' + roster.map(s =>
        `<option value="${esc(s.id)}" ${s.id === selected ? 'selected' : ''}>${esc(s.last)}, ${esc(s.first)} · ${esc(s.section)} · ${esc(s.id)}</option>`).join('');
}
const SITE = { 'read-aloud': 'Read aloud: the site does this', 'extra-days': 'Extra days: the site does this', 'test-time': 'Test time: the site does this', 'extra-time': 'Extra time: the site does this' };
function itemRow(it = {}) {
    const div = document.createElement('div');
    div.className = 'ac-item';
    div.innerHTML = `<div class="d-flex gap-2 align-items-start">
        <div class="flex-grow-1">
          <div class="d-flex flex-wrap gap-2 align-items-center mb-1">
            <input class="form-control form-control-sm" style="max-width:15rem" data-f="group" placeholder="Group (like In class)" value="${esc(it.group || '')}">
            ${it.site && SITE[it.site] ? `<span class="badge bg-success ac-site">${esc(SITE[it.site])}</span>` : ''}
            ${it.when ? `<span class="small text-muted">When: <span data-when>${esc(it.when)}</span></span>` : ''}
          </div>
          <textarea class="form-control form-control-sm mb-1" rows="2" data-f="text" placeholder="The accommodation">${esc(it.text || '')}</textarea>
          <textarea class="form-control form-control-sm" rows="1" data-f="detail" placeholder="Details (optional)">${esc(it.detail || '')}</textarea>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger" data-remove title="Remove this one" aria-label="Remove this accommodation"><i class="fas fa-xmark"></i></button>
      </div>`;
    div.dataset.when = it.when || '';
    return div;
}
function fillForm(p, note) {
    $('planForm').classList.remove('d-none');
    studentOptions(p.id || '');
    $('student').disabled = !!editingId;
    $('matchNote').innerHTML = note || '';
    $('planType').value = p.planType || 'IEP';
    $('start').value = p.start || '';
    $('end').value = p.end || '';
    $('extraDays').value = p.extraDays || 0;
    $('testTimeX').value = String(p.testTimeX || 1);
    $('readAloud').checked = !!p.readAloud;
    $('flags').innerHTML = (p.flags || []).map(f => `<div><i class="fas fa-triangle-exclamation me-1"></i>${esc(f)}</div>`).join('');
    $('items').innerHTML = '';
    (p.items || []).forEach(it => $('items').appendChild(itemRow(it)));
    $('notes').value = p.notes || '';
    $('saveStatus').textContent = '';
}
function resetForm() {
    editingId = null;
    $('planForm').reset();
    $('planForm').classList.add('d-none');
    $('editorTitle').innerHTML = '<i class="fas fa-file-medical me-2 text-primary"></i>Add a plan';
    $('pdf').value = '';
    $('readStatus').textContent = '';
}

$('pdf').addEventListener('change', async () => {
    const file = $('pdf').files[0];
    if (!file) return;
    editingId = null;
    $('readStatus').className = 'small fw-bold mt-1 text-muted';
    $('readStatus').innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Reading the plan…';
    const fd = new FormData(); fd.append('file', file);
    try {
        const { plan, matches } = await api('/api/admin/accommodations/read', { method: 'POST', body: fd });
        const top = matches[0];
        let note;
        if (top && top.how === 'id') note = `<span class="text-success fw-bold"><i class="fas fa-check me-1"></i>Matched by student ID ${esc(plan.student.id)}.</span>`;
        else if (top) note = `<span class="text-warning-emphasis fw-bold"><i class="fas fa-triangle-exclamation me-1"></i>Matched by name ("${esc(plan.student.name)}"). Make sure it's the right student.</span>`
            + (matches.length > 1 ? ` Others with a similar name: ${matches.slice(1).map(m => `${esc(m.first)} ${esc(m.last)} (${esc(m.section)})`).join(', ')}.` : '');
        else note = `<span class="text-danger fw-bold"><i class="fas fa-circle-question me-1"></i>No one on your roster matches "${esc(plan.student.name || 'the name on the plan')}". Pick the student.</span>`;
        const existing = top && plans.find(x => x.id === top.id);
        if (existing) note += ' <span class="fw-bold">They already have a plan here; saving replaces it.</span>';
        fillForm({
            id: top ? top.id : '', planType: plan.kind === 'unknown' ? 'Other' : plan.kind, start: plan.dates.start, end: plan.dates.end,
            extraDays: plan.suggestions.extraDays, testTimeX: plan.suggestions.testTimeX, readAloud: plan.suggestions.readAloud,
            flags: [...plan.suggestions.flags, ...(plan.kind === 'unknown' ? ['This PDF isn\'t a layout the site knows, so every line is listed. Remove the ones that aren\'t accommodations.'] : [])],
            items: plan.items
        }, note);
        $('readStatus').className = 'small fw-bold mt-1 text-success';
        $('readStatus').textContent = `Read ${plan.items.length} accommodation${plan.items.length === 1 ? '' : 's'}${plan.kind !== 'unknown' ? ` from the ${plan.kind}` : ''}. Check them below.`;
    } catch (e) {
        $('readStatus').className = 'small fw-bold mt-1 text-danger';
        $('readStatus').textContent = e.message;
    }
});
$('manualBtn').addEventListener('click', () => { editingId = null; fillForm({ items: [{ group: 'In class' }] }, ''); $('student').focus(); });
$('addItem').addEventListener('click', () => { const row = itemRow({ group: 'In class' }); $('items').appendChild(row); row.querySelector('[data-f=text]').focus(); });
$('items').addEventListener('click', e => { const b = e.target.closest('[data-remove]'); if (b) b.closest('.ac-item').remove(); });
$('cancelBtn').addEventListener('click', resetForm);

$('planForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = editingId || $('student').value;
    if (!id) { $('saveStatus').className = 'small fw-bold text-danger'; $('saveStatus').textContent = 'Pick the student first.'; return; }
    const items = [...$('items').querySelectorAll('.ac-item')].map(row => ({
        group: row.querySelector('[data-f=group]').value, text: row.querySelector('[data-f=text]').value,
        detail: row.querySelector('[data-f=detail]').value, when: row.dataset.when || ''
    })).filter(i => i.text.trim());
    const body = { planType: $('planType').value, start: $('start').value, end: $('end').value, extraDays: Number($('extraDays').value) || 0,
        testTimeX: Number($('testTimeX').value), readAloud: $('readAloud').checked, items, notes: $('notes').value };
    $('saveStatus').className = 'small fw-bold text-muted'; $('saveStatus').textContent = 'Saving…';
    try {
        await api(`/api/admin/accommodations/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        resetForm();
        await load();
        const p = plans.find(x => x.id === id);
        document.getElementById(`plan-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        $('readStatus').className = 'small fw-bold mt-1 text-success';
        $('readStatus').textContent = `Saved ${p ? `${p.first} ${p.last}'s` : 'the'} plan.`;
    } catch (err) {
        $('saveStatus').className = 'small fw-bold text-danger'; $('saveStatus').textContent = err.message;
    }
});

// ---------- the list ----------
function autoChips(p) {
    const chips = [];
    if (p.extraDays) chips.push(`+${p.extraDays} school day${p.extraDays === 1 ? '' : 's'} on assignments`);
    if (p.testTimeX > 1) chips.push(p.testTimeX === 2 ? 'Double time on timed tests' : 'Time and a half on timed tests');
    if (p.readAloud) chips.push('Read aloud on timed tests');
    return chips.length ? chips.map(c => `<span class="ac-chip ac-auto"><i class="fas fa-check me-1"></i>${esc(c)}</span>`).join('')
        : '<span class="ac-chip ac-none">Nothing automatic: all reminders</span>';
}
function render() {
    $('planCount').textContent = plans.length || '';
    if (!plans.length) { $('planList').innerHTML = '<div class="alert alert-light border">No plans yet. Upload one above.</div>'; return; }
    $('planList').innerHTML = plans.map(p => {
        const ended = p.end && p.end < today;
        const groups = [];
        p.items.forEach(it => { const g = it.group || 'Accommodations'; let x = groups.find(y => y.g === g); if (!x) groups.push(x = { g, items: [] }); x.items.push(it); });
        return `<div class="ac-plan" id="plan-${esc(p.id)}">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
              <div>
                <div class="fw-bold fs-5">${esc(p.last)}, ${esc(p.first)} <span class="badge bg-secondary">${esc(p.section)}</span> <span class="badge bg-primary">${esc(p.planType)}</span></div>
                <div class="small text-muted">${p.start || p.end ? `${esc(fmt(p.start))} – ${esc(fmt(p.end))}` : 'No dates'}
                  ${ended ? ` <span class="badge bg-danger">Ended ${esc(fmt(p.end))}: upload the new one when you get it</span>` : ''}</div>
              </div>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-outline-primary fw-bold" data-edit="${esc(p.id)}"><i class="fas fa-pen me-1"></i>Edit</button>
                <button type="button" class="btn btn-sm btn-outline-danger fw-bold" data-del="${esc(p.id)}"><i class="fas fa-trash me-1"></i>Remove</button>
              </div>
            </div>
            <div class="mt-2">${autoChips(p)}</div>
            <details class="mt-1"><summary class="small fw-bold text-primary" style="cursor:pointer">${p.items.length} accommodation${p.items.length === 1 ? '' : 's'}${p.notes ? ' and your notes' : ''}</summary>
              ${groups.map(g => `<div class="ac-group">${esc(g.g)}</div><ul class="small mb-1">${g.items.map(it => `<li>${esc(it.text)}${it.detail ? `<div class="text-muted">${esc(it.detail)}</div>` : ''}${it.when ? `<div class="text-muted">When: ${esc(it.when)}</div>` : ''}</li>`).join('')}</ul>`).join('')}
              ${p.notes ? `<div class="ac-group">Your notes</div><p class="small mb-0">${esc(p.notes)}</p>` : ''}
            </details>
          </div>`;
    }).join('');
}
$('planList').addEventListener('click', async e => {
    const ed = e.target.closest('[data-edit]');
    if (ed) {
        const p = plans.find(x => x.id === ed.dataset.edit); if (!p) return;
        editingId = p.id;
        $('editorTitle').innerHTML = `<i class="fas fa-pen me-2 text-primary"></i>Edit ${esc(p.first)} ${esc(p.last)}'s plan`;
        $('readStatus').textContent = '';
        fillForm(p, '<span class="text-muted">To replace it from a newer PDF, cancel and upload the PDF in STEP 1.</span>');
        $('editor').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
        const p = plans.find(x => x.id === del.dataset.del); if (!p) return;
        if (!confirm(`Remove ${p.first} ${p.last}'s plan? Their extra days and test time stop right away.`)) return;
        try { await api(`/api/admin/accommodations/${encodeURIComponent(p.id)}`, { method: 'DELETE' }); await load(); }
        catch (err) { alert(err.message); }
    }
});

async function load() {
    try {
        const out = await api('/api/admin/accommodations');
        roster = out.students; plans = out.plans;
        render();
    } catch (e) {
        $('planList').innerHTML = `<div class="alert alert-danger">${esc(e.message)}</div>`;
    }
}
load();
