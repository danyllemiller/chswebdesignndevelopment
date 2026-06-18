// /js/calendar.js

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Each type maps to a background color, text color, and short label.
// 'none' = observance only — just show the name, no colored background.
const TYPE_CONFIG = {
    A:     { bg: '#e4e6f8', text: '#1a1a6e', border: '#b0b5e8', label: 'A Day' },
    B:     { bg: '#d9eed8', text: '#1a3a1a', border: '#a4cfa2', label: 'B Day' },
    A_MIN: { bg: '#cdd0f0', text: '#1a1a6e', border: '#9099d8', label: 'A Min Day' },
    B_MIN: { bg: '#c3e3c2', text: '#1a3a1a', border: '#88be86', label: 'B Min Day' },
    OFF:   { bg: '#fef9d0', text: '#5c4800', border: '#e6d000', label: 'No School' },
    C:     { bg: '#f5e6dc', text: '#7a2a0a', border: '#e0b89a', label: 'All Periods' },
    none:  { bg: null,      text: null,      border: null,      label: ''          },
};

let specialDates = new Map(); // 'YYYY-MM-DD' → { type, description }
let currentYear, currentMonth;
let selectedDate = null;

// ─── Bootstrap ──────────────────────────────────────────────────────────────

async function initCalendar() {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();

    document.getElementById('prev-month')?.addEventListener('click', () => {
        if (--currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderMonth();
    });
    document.getElementById('next-month')?.addEventListener('click', () => {
        if (++currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderMonth();
    });

    document.getElementById('btn-import-csv')?.addEventListener('click', () => {
        const file = document.getElementById('csv-file')?.files[0];
        if (!file) { showCsvStatus('Select a CSV file first.', 'danger'); return; }
        const reader = new FileReader();
        reader.onload = e => {
            const count = parseCSV(e.target.result);
            renderMonth();
            showCsvStatus(`✓ Imported ${count} dates.`, 'success');
        };
        reader.readAsText(file);
    });

    // Auto-load the school year CSV from the server root
    try {
        const res = await fetch('/special-dates.csv');
        if (res.ok) parseCSV(await res.text());
    } catch (e) {
        console.warn('[Calendar] Could not auto-load /special-dates.csv:', e);
    }

    renderMonth();
    initAppointments();
}

// ─── CSV Parser ──────────────────────────────────────────────────────────────

function parseCSV(text) {
    specialDates.clear();
    const lines = text.split(/\r?\n/);

    // Detect delimiter from first non-empty line (tab-separated or comma-separated)
    const firstLine = lines.find(l => l.trim());
    const delim = firstLine && firstLine.includes('\t') ? '\t' : ',';

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i].trim();
        if (!raw) continue;
        if (i === 0 && /^date/i.test(raw.split(delim)[0].trim())) continue; // skip header

        const cols = raw.split(delim);
        const date = cols[0]?.trim();
        const type = cols[1]?.trim();
        // For comma-delimited files description may itself contain commas; for TSV just use col 2
        const description = delim === '\t'
            ? (cols[2]?.trim() || '')
            : cols.slice(2).join(',').trim();

        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && type) {
            specialDates.set(date, { type, description });
        }
    }
    return specialDates.size;
}

// ─── Month Renderer ───────────────────────────────────────────────────────────

function renderMonth() {
    const monthLabel = document.getElementById('month-label');
    if (monthLabel) monthLabel.textContent = `${MONTHS[currentMonth]} ${currentYear}`;

    const grid = document.getElementById('calendar');
    if (!grid) return;
    grid.innerHTML = '';

    // Weekday header row
    DAY_LABELS.forEach(d => {
        const el = document.createElement('div');
        el.className = 'calendar-weekday';
        el.textContent = d;
        grid.appendChild(el);
    });

    const today = new Date();
    const todayStr = isoDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const firstWeekday = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth  = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Empty cells before day 1
    for (let i = 0; i < firstWeekday; i++) {
        const el = document.createElement('div');
        el.className = 'calendar-day-empty';
        grid.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = isoDate(currentYear, currentMonth + 1, d);
        const info    = specialDates.get(dateStr) || null;
        const cfg     = info ? (TYPE_CONFIG[info.type] || TYPE_CONFIG.none) : null;

        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        cell.dataset.date = dateStr;

        if (dateStr === todayStr)    cell.classList.add('today');
        if (dateStr === selectedDate) cell.classList.add('selected');

        // Background color from type (skip 'none')
        if (cfg?.bg) {
            cell.style.setProperty('--day-bg',     cfg.bg);
            cell.style.setProperty('--day-text',   cfg.text);
            cell.style.setProperty('--day-border',  cfg.border);
            cell.classList.add('typed-day');
        }

        // Day number
        const numEl = document.createElement('div');
        numEl.className = 'day-number';
        numEl.textContent = d;
        cell.appendChild(numEl);

        // Type chip (skip for 'none')
        if (cfg?.label) {
            const chip = document.createElement('div');
            chip.className = 'day-type-chip';
            chip.textContent = cfg.label;
            cell.appendChild(chip);
        }

        // Event / observance text
        if (info?.description) {
            const evt = document.createElement('div');
            evt.className = info.type === 'none' ? 'day-event-text day-event-text--observance' : 'day-event-text';
            evt.textContent = info.description;
            cell.appendChild(evt);
        }

        cell.addEventListener('click', () => selectDay(dateStr, cell, info, cfg));
        grid.appendChild(cell);
    }
}

// ─── Sidebar Detail ───────────────────────────────────────────────────────────

function selectDay(dateStr, cellEl, info, cfg) {
    document.querySelectorAll('.calendar-day.selected').forEach(c => c.classList.remove('selected'));
    cellEl.classList.add('selected');
    selectedDate = dateStr;

    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const label = document.getElementById('selected-date-label');
    if (label) {
        label.textContent = dateObj.toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        });
    }

    const list = document.getElementById('day-events');
    if (!list) return;
    list.innerHTML = '';

    if (info) {
        const li = document.createElement('li');
        li.style.padding = '0.75rem 1rem';
        li.style.borderRadius = '0.75rem';
        li.style.border = `2px solid ${cfg?.border || '#ccc'}`;

        if (cfg?.bg) {
            li.style.backgroundColor = cfg.bg;
            li.style.color = cfg.text;
        }

        li.innerHTML = `
            ${cfg?.label ? `<div class="fw-bold mb-1">${cfg.label}</div>` : ''}
            ${info.description ? `<div class="small">${info.description}</div>` : ''}
        `;
        list.appendChild(li);
    } else {
        const li = document.createElement('li');
        li.className = 'text-muted small fst-italic';
        li.textContent = 'No special events scheduled.';
        list.appendChild(li);
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(y, m, d) {
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function showCsvStatus(msg, type) {
    const el = document.getElementById('csv-status');
    if (el) { el.className = `mt-2 small text-${type} fw-bold`; el.textContent = msg; }
}

document.addEventListener('DOMContentLoaded', initCalendar);

// ─── Appointment Booking ──────────────────────────────────────────────────────

let selectedSlot = null;

function initAppointments() {
    // Show teacher button once auth resolves
    function applyAuthUI() {
        if (window.dacAuthData?.isTeacher) {
            const btn = document.getElementById('btn-teacher-dashboard');
            if (btn) btn.style.display = '';
        }
    }
    if (window.dacAuthData) applyAuthUI();
    document.addEventListener('authComplete', applyAuthUI);

    // Student: open booking modal
    document.getElementById('btn-book-appointment')?.addEventListener('click', () => {
        selectedSlot = null;
        const dateInput = document.getElementById('ap-date');
        if (dateInput && selectedDate) dateInput.value = selectedDate;
        const form = document.getElementById('appointment-request-form');
        const reqBtn = document.getElementById('btn-request-appointment');
        if (form) form.style.display = 'none';
        if (reqBtn) reqBtn.style.display = 'none';
        document.getElementById('appointment-slots').innerHTML =
            '<p class="small text-muted">Select a date to see available times.</p>';
        if (dateInput?.value) loadSlots(dateInput.value);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalBookAppointment')).show();
    });

    document.getElementById('ap-date')?.addEventListener('change', e => loadSlots(e.target.value));
    document.getElementById('btn-request-appointment')?.addEventListener('click', submitBooking);

    // Teacher: open dashboard
    document.getElementById('btn-teacher-dashboard')?.addEventListener('click', () => {
        loadTeacherDashboard();
        renderOfficeHoursForm();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalAppointmentDashboard')).show();
    });

    // Tab switches reload data
    document.querySelector('a[href="#tab-pending"]')?.addEventListener('shown.bs.tab', loadTeacherDashboard);
    document.querySelector('a[href="#tab-approved"]')?.addEventListener('shown.bs.tab', loadTeacherDashboard);
    document.querySelector('a[href="#tab-manage-hours"]')?.addEventListener('shown.bs.tab', renderOfficeHoursForm);

    document.getElementById('btn-save-office-hours')?.addEventListener('click', saveOfficeHours);

    // Add Single Event modal
    document.getElementById('btn-add-single-event')?.addEventListener('click', () => {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalSingleEvent')).show();
    });
}

// ─── Slot Loader ──────────────────────────────────────────────────────────────

async function loadSlots(date) {
    const container = document.getElementById('appointment-slots');
    const form      = document.getElementById('appointment-request-form');
    const reqBtn    = document.getElementById('btn-request-appointment');
    if (!container) return;

    selectedSlot = null;
    if (form) form.style.display = 'none';
    if (reqBtn) reqBtn.style.display = 'none';
    container.innerHTML = '<p class="small text-muted">Loading...</p>';

    try {
        const res  = await fetch(`/api/appointments/slots?date=${date}`);
        const data = await res.json();

        if (!data.slots?.length) {
            container.innerHTML = `<p class="small text-muted fst-italic">${data.message || 'No available slots on this day.'}</p>`;
            return;
        }

        container.innerHTML = '<div class="appointment-slot-grid"></div>';
        const grid = container.querySelector('.appointment-slot-grid');

        data.slots.forEach(slot => {
            const b = document.createElement('button');
            b.type = 'button';
            b.dataset.time = slot.time;

            if (!slot.available) {
                b.className = 'btn btn-secondary btn-sm appointment-slot-btn';
                b.textContent = formatTime12(slot.time);
                b.disabled = true;
                b.title = 'Already booked';
            } else {
                b.className = 'btn btn-outline-info btn-sm appointment-slot-btn';
                b.textContent = formatTime12(slot.time);
                b.addEventListener('click', () => selectSlot(slot.time, b));
            }
            grid.appendChild(b);
        });
    } catch {
        container.innerHTML = '<p class="small text-danger">Could not load available times.</p>';
    }
}

function selectSlot(time, btnEl) {
    selectedSlot = time;
    document.querySelectorAll('.appointment-slot-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
    const selectedEl = document.getElementById('ap-selected-slot');
    if (selectedEl) selectedEl.textContent = formatTime12(time);
    const form   = document.getElementById('appointment-request-form');
    const reqBtn = document.getElementById('btn-request-appointment');
    if (form) form.style.display = '';
    if (reqBtn) reqBtn.style.display = '';
}

async function submitBooking() {
    const studentId = window.dacAuthData?.user?.student_id;
    const date      = document.getElementById('ap-date')?.value;
    const reason    = document.getElementById('ap-reason')?.value?.trim() || '';
    const btn       = document.getElementById('btn-request-appointment');

    if (!studentId || !date || !selectedSlot) return;

    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
        const res  = await fetch('/api/appointments/book', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ student_id: studentId, date, time: selectedSlot, reason }),
        });
        const data = await res.json();

        if (data.success) {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalBookAppointment')).hide();
            alert(`Request sent for ${date} at ${formatTime12(selectedSlot)}. Your teacher will confirm it.`);
        } else {
            alert(data.error || 'Could not book that slot — please try another time.');
        }
    } catch {
        alert('Network error. Please try again.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Request Appointment';
    }
}

// ─── Teacher Dashboard ────────────────────────────────────────────────────────

async function loadTeacherDashboard() {
    const pendingEl  = document.getElementById('pending-requests');
    const approvedEl = document.getElementById('approved-appointments');

    try {
        const res  = await fetch('/api/appointments/requests?role=teacher');
        const data = await res.json();
        const all  = data.appointments || [];

        const pending  = all.filter(a => a.status === 'pending');
        const resolved = all.filter(a => a.status !== 'pending');

        if (pendingEl) {
            pendingEl.innerHTML = pending.length
                ? pending.map(a => apptCard(a, true)).join('')
                : '<p class="text-muted small">No pending requests.</p>';
        }
        if (approvedEl) {
            approvedEl.innerHTML = resolved.length
                ? resolved.map(a => apptCard(a, false)).join('')
                : '<p class="text-muted small">No approved or denied appointments yet.</p>';
        }

        document.querySelectorAll('.btn-approve-appt').forEach(b =>
            b.addEventListener('click', () => updateApptStatus(+b.dataset.id, 'approved')));
        document.querySelectorAll('.btn-deny-appt').forEach(b =>
            b.addEventListener('click', () => updateApptStatus(+b.dataset.id, 'denied')));
    } catch {
        if (pendingEl) pendingEl.innerHTML = '<p class="text-danger small">Could not load appointments.</p>';
    }
}

function apptCard(a, showActions) {
    const name   = a.student_name || a.student_id;
    const colors = { pending: 'warning', approved: 'success', denied: 'secondary' };
    const color  = colors[a.status] || 'secondary';

    return `
    <div class="card mb-2 border-${color}">
      <div class="card-body p-3">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <strong>${name}</strong>
            <span class="badge bg-${color} ms-1">${a.status}</span><br>
            <span class="small">${a.date} at ${formatTime12(a.time)}</span>
            ${a.section_id ? `<span class="small text-muted"> · ${a.section_id}</span>` : ''}<br>
            ${a.reason ? `<span class="small">${a.reason}</span>` : ''}
          </div>
          ${showActions ? `
          <div class="d-flex flex-column gap-1 flex-shrink-0">
            <button class="btn btn-success btn-sm btn-approve-appt" data-id="${a.id}">Approve</button>
            <button class="btn btn-outline-secondary btn-sm btn-deny-appt" data-id="${a.id}">Deny</button>
          </div>` : ''}
        </div>
        ${a.teacher_note ? `<div class="mt-1 small text-muted fst-italic">Note: ${a.teacher_note}</div>` : ''}
      </div>
    </div>`;
}

async function updateApptStatus(id, status) {
    const teacherId = window.dacAuthData?.user?.student_id;
    try {
        const res  = await fetch('/api/appointments/update-status', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id, status, teacher_id: teacherId }),
        });
        const data = await res.json();
        if (data.success) loadTeacherDashboard();
    } catch {
        alert('Could not update appointment status.');
    }
}

// ─── Office Hours Form ────────────────────────────────────────────────────────

async function renderOfficeHoursForm() {
    const container = document.getElementById('office-hours-schedule');
    if (!container) return;

    let currentHours = {};
    try {
        const res  = await fetch('/api/appointments/office-hours');
        const data = await res.json();
        (data.hours || []).forEach(h => { currentHours[h.day_of_week] = h; });
    } catch { /* no hours saved yet */ }

    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    container.innerHTML = days.map((day, dow) => {
        const h      = currentHours[dow] || {};
        const active = h.is_active == 1;
        const start  = (h.start_time || '07:30').substring(0, 5);
        const end    = (h.end_time   || '08:15').substring(0, 5);
        const dur    = h.slot_duration || 15;

        return `
        <div class="card mb-2 p-2">
          <div class="d-flex align-items-center gap-3 flex-wrap">
            <div class="form-check mb-0" style="min-width:110px">
              <input class="form-check-input oh-active" type="checkbox" id="oh-${dow}" data-dow="${dow}" ${active ? 'checked' : ''}>
              <label class="form-check-label fw-bold" for="oh-${dow}">${day}</label>
            </div>
            <div class="d-flex align-items-center gap-2">
              <input type="time" class="form-control form-control-sm oh-start" data-dow="${dow}" value="${start}" style="width:120px">
              <span class="text-muted">to</span>
              <input type="time" class="form-control form-control-sm oh-end" data-dow="${dow}" value="${end}" style="width:120px">
            </div>
            <select class="form-select form-select-sm oh-duration" data-dow="${dow}" style="width:145px">
              <option value="15" ${dur==15?'selected':''}>15 min slots</option>
              <option value="20" ${dur==20?'selected':''}>20 min slots</option>
              <option value="30" ${dur==30?'selected':''}>30 min slots</option>
            </select>
          </div>
        </div>`;
    }).join('');
}

async function saveOfficeHours() {
    const teacherId = window.dacAuthData?.user?.student_id;
    const hours     = [];

    document.querySelectorAll('.oh-active').forEach(cb => {
        const dow   = +cb.dataset.dow;
        const start = document.querySelector(`.oh-start[data-dow="${dow}"]`)?.value || '07:30';
        const end   = document.querySelector(`.oh-end[data-dow="${dow}"]`)?.value   || '08:15';
        const dur   = +(document.querySelector(`.oh-duration[data-dow="${dow}"]`)?.value || 15);
        hours.push({ day_of_week: dow, start_time: start, end_time: end, slot_duration: dur, is_active: cb.checked ? 1 : 0 });
    });

    const btn = document.getElementById('btn-save-office-hours');
    try {
        const res  = await fetch('/api/appointments/office-hours', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ teacher_id: teacherId, hours }),
        });
        const data = await res.json();
        if (data.success && btn) {
            btn.textContent = '✓ Saved!';
            setTimeout(() => { btn.textContent = 'Save Office Hours'; }, 2000);
        } else {
            alert('Could not save office hours.');
        }
    } catch {
        alert('Network error.');
    }
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function formatTime12(hhmm) {
    const [h, m] = (hhmm || '').split(':').map(Number);
    if (isNaN(h)) return hhmm;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}
