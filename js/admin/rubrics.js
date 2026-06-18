/**
 * CHS Web Design - Admin Rubric Manager
 * MIGRATED: Firebase removed. Uses MariaDB API + auth-guard.js.
 * Handles the creation of Rubrics, Self-Assessments, and Auto-Grader Rules.
 */

// ==========================================
// AUTH GUARD (MariaDB / auth-guard.js)
// ==========================================
function waitForAuth(timeout = 8000) {
    return new Promise((resolve) => {
        if (window.dacAuthData) { resolve(window.dacAuthData); return; }
        const handler = () => { resolve(window.dacAuthData); };
        document.addEventListener('authComplete', handler, { once: true });
        setTimeout(() => {
            document.removeEventListener('authComplete', handler);
            resolve({ isAuthenticated: false, isTeacher: false });
        }, timeout);
    });
}

let allRubrics = [];

(async function init() {
    const authData = await waitForAuth();

    if (!authData.isAuthenticated) {
        window.location.replace("/login.html");
        return;
    }

    if (!authData.isTeacher) {
        alert("Security Alert: Teacher access required.");
        window.location.replace("/index.html");
        return;
    }

    loadRubrics();
})();

// --- CORE DATA LOGIC ---
async function loadRubrics() {
    const list = document.getElementById('rubric-list');
    try {
        const res = await fetch('/api/admin/rubrics');
        if (!res.ok) throw new Error('Failed to fetch rubrics');
        const data = await res.json();
        allRubrics = data.rubrics || [];
        // Already sorted server-side by title, but sort here too for safety
        allRubrics.sort((a, b) => a.title.localeCompare(b.title));
        renderList();
    } catch (e) {
        console.error(e);
        list.innerHTML = `<div class="p-3 text-danger">Error loading rubrics.</div>`;
    }
}

function renderList() {
    const list = document.getElementById('rubric-list');
    if (allRubrics.length === 0) {
        list.innerHTML = `<div class="p-4 text-center text-muted small fw-bold">No rubrics created yet.</div>`;
        return;
    }

    list.innerHTML = allRubrics.map(r => `
        <button type="button" class="list-group-item list-group-item-action p-3" onclick="openRubric('${r.id}')">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong class="text-primary">${r.title}</strong>
                <span class="badge bg-secondary">${r.totalPoints || 0} pts</span>
            </div>
            <small class="text-muted"><i class="fas fa-laptop-code me-1"></i> ${r.course}</small>
        </button>
    `).join('');
}

// --- EDITOR LOGIC ---
window.openRubric = (id) => {
    const rubric = allRubrics.find(r => r.id === id);
    if (!rubric) return;

    document.getElementById('rubric-editor-card').classList.remove('d-none');
    document.getElementById('empty-editor-state').classList.add('d-none');

    document.getElementById('rubric-id').value = rubric.id;
    document.getElementById('rubric-title').value = rubric.title;
    document.getElementById('rubric-course').value = rubric.course;
    document.getElementById('enable-self-grade').checked = rubric.enableSelfGrade;
    document.getElementById('enable-peer-grade').checked = rubric.enablePeerGrade;

    const container = document.getElementById('criteria-container');
    container.innerHTML = '';

    if (rubric.criteria && rubric.criteria.length > 0) {
        rubric.criteria.forEach(c => addCriterionRow(c));
    } else {
        addCriterionRow(); // Empty row if none exist
    }

    updateTotalPoints();
};

document.getElementById('btn-create-new').onclick = () => {
    document.getElementById('rubric-editor-card').classList.remove('d-none');
    document.getElementById('empty-editor-state').classList.add('d-none');
    document.getElementById('rubric-form').reset();
    document.getElementById('rubric-id').value = 'NEW';
    document.getElementById('criteria-container').innerHTML = '';

    // Add one blank row to start
    addCriterionRow();
    updateTotalPoints();
};

function addCriterionRow(data = null) {
    const container = document.getElementById('criteria-container');
    const rowId = 'crit_' + Date.now() + Math.floor(Math.random() * 100);

    const div = document.createElement('div');
    div.className = 'criterion-row bg-white border border-secondary rounded p-3 position-relative shadow-sm';
    div.id = rowId;

    const name = data ? data.name : '';
    const points = data ? data.points : 10;
    const desc = data ? data.description : '';
    const ruleType = data && data.autoRule ? data.autoRule.type : 'none';
    const ruleValue = data && data.autoRule ? data.autoRule.value : '';

    div.innerHTML = `
        <button type="button" class="btn btn-sm text-danger position-absolute top-0 end-0 m-2" onclick="document.getElementById('${rowId}').remove(); window.updateTotalPoints();" title="Remove Criterion"><i class="fas fa-times"></i></button>

        <div class="row g-2 mb-2">
            <div class="col-md-9">
                <input type="text" class="form-control form-control-sm crit-name fw-bold" placeholder="Category Name (e.g. Optimization)" value="${name}" required>
            </div>
            <div class="col-md-3">
                <div class="input-group input-group-sm">
                    <input type="number" class="form-control crit-pts text-center fw-bold" value="${points}" min="0" required onchange="window.updateTotalPoints()">
                    <span class="input-group-text bg-light">pts</span>
                </div>
            </div>
        </div>

        <div class="mb-2">
            <textarea class="form-control form-control-sm crit-desc" rows="2" placeholder="Description of expectations for a perfect score..." required>${desc}</textarea>
        </div>

        <div class="bg-light p-2 rounded border">
            <div class="d-flex align-items-center gap-2">
                <i class="fas fa-robot text-primary"></i>
                <span class="small fw-bold text-dark">Auto-Grader Smart Rule (Optional)</span>
            </div>
            <div class="row g-2 mt-1">
                <div class="col-md-5">
                    <select class="form-select form-select-sm crit-rule-type text-primary fw-bold">
                        <option value="none" ${ruleType === 'none' ? 'selected' : ''}>No Auto-Check</option>
                        <option value="html_tag" ${ruleType === 'html_tag' ? 'selected' : ''}>Requires HTML Tag</option>
                        <option value="css_prop" ${ruleType === 'css_prop' ? 'selected' : ''}>Requires CSS Property</option>
                        <option value="file_ext" ${ruleType === 'file_ext' ? 'selected' : ''}>Requires File Extension</option>
                    </select>
                </div>
                <div class="col-md-7">
                    <input type="text" class="form-control form-control-sm crit-rule-val font-monospace" placeholder="e.g. video, object-fit, .webp" value="${ruleValue}">
                </div>
            </div>
        </div>
    `;

    container.appendChild(div);
}

// Attach to window so inline onclicks can reach it
window.updateTotalPoints = () => {
    let total = 0;
    document.querySelectorAll('.crit-pts').forEach(input => {
        total += Number(input.value) || 0;
    });
    document.getElementById('total-points-badge').innerText = `${total} pts Total`;
};

document.getElementById('btn-add-criterion').onclick = () => {
    addCriterionRow();
    updateTotalPoints();
};

// --- SAVE & DELETE LOGIC ---
document.getElementById('rubric-form').onsubmit = async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btn-save-rubric');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
    btn.disabled = true;

    try {
        let id = document.getElementById('rubric-id').value;
        if (id === 'NEW') {
            id = "rubric_" + Date.now();
        }

        const criteria = [];
        let totalPoints = 0;

        document.querySelectorAll('.criterion-row').forEach(row => {
            const pts = Number(row.querySelector('.crit-pts').value) || 0;
            totalPoints += pts;

            const ruleType = row.querySelector('.crit-rule-type').value;
            const autoRule = ruleType === 'none' ? null : {
                type: ruleType,
                value: row.querySelector('.crit-rule-val').value.trim()
            };

            criteria.push({
                name: row.querySelector('.crit-name').value.trim(),
                points: pts,
                description: row.querySelector('.crit-desc').value.trim(),
                autoRule: autoRule
            });
        });

        const data = {
            id,
            title: document.getElementById('rubric-title').value.trim(),
            course: document.getElementById('rubric-course').value,
            enableSelfGrade: document.getElementById('enable-self-grade').checked,
            enablePeerGrade: document.getElementById('enable-peer-grade').checked,
            criteria,
            totalPoints,
            lastUpdated: Date.now()
        };

        const res = await fetch('/api/admin/rubrics/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Save failed');

        btn.innerHTML = '✅ Saved!';
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-save me-2"></i> Save Rubric';
            btn.disabled = false;
        }, 2000);

        loadRubrics();

    } catch (err) {
        console.error(err);
        alert("Error saving rubric.");
        btn.innerHTML = '<i class="fas fa-save me-2"></i> Save Rubric';
        btn.disabled = false;
    }
};

document.getElementById('btn-delete-rubric').onclick = async () => {
    const id = document.getElementById('rubric-id').value;
    if (id === 'NEW') {
        document.getElementById('rubric-editor-card').classList.add('d-none');
        document.getElementById('empty-editor-state').classList.remove('d-none');
        return;
    }

    if (confirm("Are you sure you want to permanently delete this rubric?")) {
        try {
            const res = await fetch(`/api/admin/rubrics/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            document.getElementById('rubric-editor-card').classList.add('d-none');
            document.getElementById('empty-editor-state').classList.remove('d-none');
            loadRubrics();
        } catch (e) {
            console.error(e);
            alert("Error deleting rubric.");
        }
    }
};
