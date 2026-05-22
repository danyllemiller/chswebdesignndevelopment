/* /test-site/js/admin/roster.js */

const statusDiv = document.getElementById('statusMessage');

function showStatus(msg, type = 'info') {
    statusDiv.innerText = msg;
    statusDiv.className = `alert alert-${type} text-center fw-bold small mb-3`;
    statusDiv.classList.remove('d-none');
    setTimeout(() => statusDiv.classList.add('d-none'), 5000);
}

// --- VIEW ROSTER ---
async function fetchRoster() {
    const tbody = document.getElementById('rosterTableBody');
    try {
        const response = await fetch('/api/admin/roster');
        const data = await response.json();

        tbody.innerHTML = '';
        data.forEach(s => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${s.section_id}</td>
                <td>${s.last_name}</td>
                <td>${s.first_name}</td>
                <td><span class="badge ${s.username ? 'bg-success' : 'bg-secondary'}">${s.username || 'Unregistered'}</span></td>
                <td>${s.student_id}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="manageStudent('${s.student_id}', '${s.first_name} ${s.last_name}')">Manage</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load roster.</td></tr>';
    }
}

// --- ADD SINGLE STUDENT ---
document.getElementById('addSingleBtn').addEventListener('click', async () => {
    const payload = [{
        first_name: document.getElementById('single-fname').value.trim(),
        last_name: document.getElementById('single-lname').value.trim(),
        student_id: document.getElementById('single-sid').value.trim(),
        section_id: document.getElementById('single-period').value.trim()
    }];

    try {
        const res = await fetch('/api/admin/upload-roster', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showStatus('Student added!', 'success');
            fetchRoster();
        }
    } catch (err) { showStatus('Add failed', 'danger'); }
});

// --- BULK CSV UPLOAD ---
document.getElementById('uploadBtn').addEventListener('click', () => {
    const file = document.getElementById('csvFileInput').files[0];
    if (!file) return alert('Select a CSV file first.');

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n');
        const students = [];

        lines.forEach(line => {
            const cols = line.split(',');
            if (cols.length >= 4) {
                students.push({
                    first_name: cols[0].trim(),
                    last_name: cols[1].trim(),
                    student_id: cols[2].trim(),
                    section_id: cols[3].trim()
                });
            }
        });

        const res = await fetch('/api/admin/upload-roster', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(students)
        });
        if (res.ok) {
            showStatus('Roster uploaded successfully!', 'success');
            fetchRoster();
        }
    };
    reader.readAsText(file);
});

// --- MODAL ACTIONS ---
let activeStudentId = null;
window.manageStudent = (id, name) => {
    activeStudentId = id;
    document.getElementById('modalStudentName').innerText = name;
    new bootstrap.Modal(document.getElementById('editModal')).show();
};

document.getElementById('resetStudentBtn').addEventListener('click', async () => {
    if (!confirm('This will wipe their username/password. Continue?')) return;
    const res = await fetch('/api/admin/reset-student', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ student_id: activeStudentId })
    });
    if (res.ok) {
        showStatus('Registration wiped!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        fetchRoster();
    }
});

document.getElementById('deleteStudentBtn').addEventListener('click', async () => {
    if (!confirm('This will REMOVE them from the roster entirely. Continue?')) return;
    const res = await fetch('/api/admin/delete-student', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ student_id: activeStudentId })
    });
    if (res.ok) {
        showStatus('Student removed!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        fetchRoster();
    }
});

// Init
document.getElementById('refreshRosterBtn').addEventListener('click', fetchRoster);
window.onload = fetchRoster;