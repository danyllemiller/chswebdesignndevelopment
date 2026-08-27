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

let unitCharts = [];

function destroyUnitCharts() {
    unitCharts.forEach(c => c.destroy());
    unitCharts = [];
}

function renderUnitChart(unit) {
    const canvas = document.getElementById(`chart-unit-${unit.unit}`);
    if (!canvas || typeof Chart === 'undefined') return;

    // "All Periods" is already the summary row right above it in the table --
    // the chart is for comparing periods against each other, so it's left out here.
    const periods = unit.periods.filter(p => p.period !== 'All');
    if (periods.length === 0) return;

    const chart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: periods.map(p => p.period),
            datasets: [
                { label: 'Pre-Test', data: periods.map(p => p.pretest.avgPercent), backgroundColor: 'rgba(108,117,125,0.75)', borderRadius: 3 },
                { label: 'Exam — After 1 Attempt', data: periods.map(p => p.examAttempts['1'].avgPercent), backgroundColor: 'rgba(13,110,253,0.75)', borderRadius: 3 },
                { label: 'Exam — After 2 Attempts', data: periods.map(p => p.examAttempts['2'].avgPercent), backgroundColor: 'rgba(25,135,84,0.75)', borderRadius: 3 },
                { label: 'Exam — After 3+ Attempts', data: periods.map(p => p.examAttempts['3+'].avgPercent), backgroundColor: 'rgba(255,193,7,0.85)', borderRadius: 3 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } },
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
        }
    });
    unitCharts.push(chart);
}

function renderUnits(units) {
    const tbody = document.getElementById('analyticsBody');
    destroyUnitCharts();
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
        html += `<tr class="unit-chart-row"><td colspan="8"><canvas id="chart-unit-${u.unit}"></canvas></td></tr>`;
    });
    tbody.innerHTML = html;

    units.forEach(renderUnitChart);
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
