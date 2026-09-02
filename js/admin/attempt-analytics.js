// Same palette as admin/daily-agenda.html's bell schedule swatches, so a
// period reads as the same color everywhere on the site.
const PERIOD_COLORS = {
    'A1': '#f2d2d4', 'B2': '#cccdeb', 'A3': '#9cb9da', 'B4': '#f9f9dc',
    'A5': '#f6e9d4', 'B6': '#ecf4ea', 'B8': '#eadafa', 'INTV': '#dff3f9'
};

function periodRowStyle(period) {
    const color = PERIOD_COLORS[period];
    return color ? ` style="background:${color};"` : '';
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

    // One bar per category (the cumulative "All Periods" number) -- the
    // per-period breakdown lives in the hover tooltip instead of as
    // separate bars, since that's what the row above the chart already is.
    const periods = unit.periods.filter(p => p.period !== 'All');
    const allRow = unit.periods.find(p => p.period === 'All');
    if (!allRow || periods.length === 0) return;

    const categories = [
        { label: 'Pre-Test', color: 'rgba(108,117,125,0.75)', value: allRow.pretest.avgPercent, key: 'pretest' },
        { label: 'Exam — After 1 Attempt', color: 'rgba(13,110,253,0.75)', value: allRow.examAttempts['1'].avgPercent, key: '1' },
        { label: 'Exam — After 2 Attempts', color: 'rgba(25,135,84,0.75)', value: allRow.examAttempts['2'].avgPercent, key: '2' },
        { label: 'Exam — After 3+ Attempts', color: 'rgba(255,193,7,0.85)', value: allRow.examAttempts['3+'].avgPercent, key: '3+' }
    ];

    const chart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: categories.map(c => c.label),
            datasets: [{
                data: categories.map(c => c.value),
                backgroundColor: categories.map(c => c.color),
                borderRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (items) => categories[items[0].dataIndex].label,
                        label: (item) => `All Periods: ${item.parsed.y ?? '—'}%`,
                        afterBody: (items) => {
                            const key = categories[items[0].dataIndex].key;
                            return periods.map(p => {
                                const val = key === 'pretest' ? p.pretest.avgPercent : p.examAttempts[key].avgPercent;
                                return `Period ${p.period}: ${val !== null && val !== undefined ? val + '%' : '—'}`;
                            });
                        }
                    }
                }
            }
        }
    });
    unitCharts.push(chart);
}

function renderUnits(units) {
    const tbody = document.getElementById('analyticsBody');
    destroyUnitCharts();
    if (!units || units.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No data yet.</td></tr>';
        return;
    }

    let html = '';
    units.forEach(u => {
        html += `<tr class="unit-header-row"><td colspan="9">${u.label}</td></tr>`;
        u.periods.forEach((p, i) => {
            const e1 = p.examAttempts['1'], e2 = p.examAttempts['2'], e3 = p.examAttempts['3+'];
            const rowClass = p.period === 'All' ? 'all-periods-row' : '';
            const periodLabel = p.period === 'All' ? 'All Periods' : `Period ${p.period}`;
            // The chart is one-per-unit, not one-per-period, so it only
            // needs a cell on the unit's first row -- rowspan carries it
            // down the rest of that unit's period rows as a single column.
            const chartCell = i === 0
                ? `<td rowspan="${u.periods.length}" class="unit-chart-cell attempt-col-group"><canvas id="chart-unit-${u.unit}"></canvas></td>`
                : '';
            html += `
                <tr class="${rowClass}"${periodRowStyle(p.period)}>
                    <td>${periodLabel}</td>
                    <td>${fmtPercent(p.pretest.avgPercent)} ${p.pretest.count ? `<span class="text-muted small">(n=${p.pretest.count})</span>` : ''}</td>
                    <td class="attempt-col-group">${fmtPercent(e1.avgPercent)} ${e1.count ? `<span class="text-muted small">(n=${e1.count})</span>` : ''}</td>
                    <td>${fmtMastery(e1.masteryPercent)}</td>
                    <td class="attempt-col-group">${fmtPercent(e2.avgPercent)} ${e2.count ? `<span class="badge bg-warning text-dark">${e2.count} retook</span>` : ''}</td>
                    <td>${fmtMastery(e2.masteryPercent)}</td>
                    <td class="attempt-col-group">${fmtPercent(e3.avgPercent)} ${e3.count ? `<span class="badge bg-warning text-dark">${e3.count} retook</span>` : ''}</td>
                    <td>${fmtMastery(e3.masteryPercent)}</td>
                    ${chartCell}
                </tr>`;
        });
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
