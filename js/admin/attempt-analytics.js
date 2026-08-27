// Same palette as admin/daily-agenda.html's bell schedule swatches, so a
// period reads as the same color everywhere on the site.
const PERIOD_COLORS = {
    'A1': '#f2d2d4', 'B2': '#cccdeb', 'A3': '#9cb9da', 'B4': '#f9f9dc',
    'A5': '#f6e9d4', 'B6': '#ecf4ea', 'B8': '#eadafa', 'INTV': '#dff3f9'
};

function periodSwatch(period) {
    if (period === 'All') return '';
    const color = PERIOD_COLORS[period];
    if (!color) return '';
    return `<span class="period-swatch" style="background:${color};"></span>`;
}

function fmtPercent(val) {
    return (val === null || val === undefined) ? '<span class="no-data">—</span>' : `${val}%`;
}

function fmtMastery(val) {
    if (val === null || val === undefined) return '<span class="no-data">—</span>';
    return `<span class="${val >= 80 ? 'mastery-good' : 'mastery-bad'}">${val}%</span>`;
}

function renderUnits(units) {
    const tbody = document.getElementById('analyticsBody');
    if (!units || units.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No data yet.</td></tr>';
        return;
    }

    let html = '';
    units.forEach(u => {
        html += `<tr class="unit-header-row"><td colspan="8">${u.label}</td></tr>`;
        u.periods.forEach(p => {
            const e1 = p.examAttempts['1'], e2 = p.examAttempts['2'], e3 = p.examAttempts['3+'];
            const rowClass = p.period === 'All' ? 'all-periods-row' : '';
            const periodLabel = p.period === 'All' ? 'All Periods' : `Period ${p.period}`;
            html += `
                <tr class="${rowClass}">
                    <td>${periodSwatch(p.period)}${periodLabel}</td>
                    <td>${fmtPercent(p.pretest.avgPercent)} ${p.pretest.count ? `<span class="text-muted small">(n=${p.pretest.count})</span>` : ''}</td>
                    <td class="attempt-col-group">${fmtPercent(e1.avgPercent)} ${e1.count ? `<span class="text-muted small">(n=${e1.count})</span>` : ''}</td>
                    <td>${fmtMastery(e1.masteryPercent)}</td>
                    <td class="attempt-col-group">${fmtPercent(e2.avgPercent)} ${e2.count ? `<span class="text-muted small">(n=${e2.count})</span>` : ''}</td>
                    <td>${fmtMastery(e2.masteryPercent)}</td>
                    <td class="attempt-col-group">${fmtPercent(e3.avgPercent)} ${e3.count ? `<span class="text-muted small">(n=${e3.count})</span>` : ''}</td>
                    <td>${fmtMastery(e3.masteryPercent)}</td>
                </tr>`;
        });
    });
    tbody.innerHTML = html;
}

async function loadCourse(courseKey) {
    const tbody = document.getElementById('analyticsBody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> Loading...</td></tr>';

    try {
        const res = await fetch(`/api/admin/attempt-analytics?course=${courseKey}`);
        if (!res.ok) throw new Error('Failed to load analytics');
        const data = await res.json();
        renderUnits(data.units);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">${e.message}</td></tr>`;
    }
}

document.querySelectorAll('#courseTabs [data-course]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#courseTabs [data-course]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadCourse(btn.dataset.course);
    });
});

loadCourse('CS');
