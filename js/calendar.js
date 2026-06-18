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
}

// ─── CSV Parser ──────────────────────────────────────────────────────────────

function parseCSV(text) {
    specialDates.clear();
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i].trim();
        if (!raw) continue;
        if (i === 0 && /^date/i.test(raw)) continue; // skip header

        const cols = raw.split(',');
        const date = cols[0]?.trim();
        const type = cols[1]?.trim();
        const description = cols.slice(2).join(',').trim();

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
