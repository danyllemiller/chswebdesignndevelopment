const COURSE_LABELS = { CS: 'Computer Science', WD1: 'Web Design 1', WD2: 'Web Design 2' };

function fmtPercent(val) {
    return (val === null || val === undefined) ? '<span class="no-data">—</span>' : `${val}%`;
}

function fmtMastery(val) {
    if (val === null || val === undefined) return '<span class="no-data">—</span>';
    return `<span class="${val >= 80 ? 'mastery-good' : 'mastery-bad'}">${val}%</span>`;
}

function renderOverall(data) {
    const container = document.getElementById('overallSection');
    let html = `
        <div class="card shadow-sm border-primary overall-card">
            <div class="card-body text-center p-3">
                <div class="small text-muted fw-bold text-uppercase" style="font-size:.7rem; letter-spacing:.04em;">Overall — ${COURSE_LABELS[data.course]}</div>
                <div class="display-6 fw-bold text-primary mb-0">${fmtPercent(data.overallCourse.avgPercent)}</div>
                <div class="small text-muted">${data.overallCourse.studentCount} student${data.overallCourse.studentCount === 1 ? '' : 's'}</div>
            </div>
        </div>`;

    Object.keys(data.overallByPeriod || {}).forEach(period => {
        const p = data.overallByPeriod[period];
        html += `
            <div class="card shadow-sm overall-card">
                <div class="card-body text-center p-3">
                    <div class="small text-muted fw-bold text-uppercase" style="font-size:.7rem; letter-spacing:.04em;">Period ${period}</div>
                    <div class="display-6 fw-bold text-dark mb-0">${fmtPercent(p.avgPercent)}</div>
                    <div class="small text-muted">${p.studentCount} student${p.studentCount === 1 ? '' : 's'}</div>
                </div>
            </div>`;
    });

    container.innerHTML = html;
}

function renderUnits(units) {
    const tbody = document.getElementById('analyticsBody');
    if (!units || units.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No data yet.</td></tr>';
        return;
    }

    tbody.innerHTML = units.map(u => {
        const e1 = u.examAttempts['1'], e2 = u.examAttempts['2'], e3 = u.examAttempts['3+'];
        return `
            <tr>
                <td class="fw-bold">${u.label}</td>
                <td>${fmtPercent(u.pretest.avgPercent)} ${u.pretest.count ? `<span class="text-muted small">(n=${u.pretest.count})</span>` : ''}</td>
                <td class="attempt-col-group">${fmtPercent(e1.avgPercent)} ${e1.count ? `<span class="text-muted small">(n=${e1.count})</span>` : ''}</td>
                <td>${fmtMastery(e1.masteryPercent)}</td>
                <td class="attempt-col-group">${fmtPercent(e2.avgPercent)} ${e2.count ? `<span class="text-muted small">(n=${e2.count})</span>` : ''}</td>
                <td>${fmtMastery(e2.masteryPercent)}</td>
                <td class="attempt-col-group">${fmtPercent(e3.avgPercent)} ${e3.count ? `<span class="text-muted small">(n=${e3.count})</span>` : ''}</td>
                <td>${fmtMastery(e3.masteryPercent)}</td>
            </tr>`;
    }).join('');
}

async function loadCourse(courseKey) {
    const tbody = document.getElementById('analyticsBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> Loading...</td></tr>';
    document.getElementById('overallSection').innerHTML = '';

    try {
        const res = await fetch(`/api/admin/attempt-analytics?course=${courseKey}`);
        if (!res.ok) throw new Error('Failed to load analytics');
        const data = await res.json();
        renderOverall(data);
        renderUnits(data.units);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${e.message}</td></tr>`;
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
