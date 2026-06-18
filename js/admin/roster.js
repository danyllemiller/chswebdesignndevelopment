/* /test-site/js/admin/roster.js */

const statusDiv = document.getElementById('statusMessage');
let availableSections = [];
const selectedStudents = new Set();

function escapeHtml(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showStatus(msg, type = 'info') {
    statusDiv.innerText = msg;
    statusDiv.className = `alert alert-${type} text-center fw-bold small mb-3`;
    statusDiv.classList.remove('d-none');
    setTimeout(() => statusDiv.classList.add('d-none'), 5000);
}

// Make key functions globally accessible immediately
window.escapeHtml = escapeHtml;
window.showStatus = showStatus;

function renderSectionCatalog(sections) {
    const body = document.getElementById('sectionCatalogBody');
    if (!body) return;

    if (!Array.isArray(sections) || sections.length === 0) {
        body.innerHTML = '<tr><td colspan="4" class="text-center py-3 text-muted">No section catalog data available.</td></tr>';
        return;
    }

        body.innerHTML = sections.map(section => `
                <tr>
                    <td>${escapeHtml(section.section_id)}</td>
                    <td>${escapeHtml(section.course_id)}</td>
                    <td>${escapeHtml(section.course_name)}</td>
                    <td>${escapeHtml(section.department)}</td>
                </tr>
        `).join('');
}

function buildSectionOptions(sections, placeholderText, includePlaceholder = true) {
    if (!Array.isArray(sections) || sections.length === 0) {
        return includePlaceholder ? `<option value="">${escapeHtml(placeholderText)}</option>` : '';
    }

    const grouped = sections.reduce((acc, section) => {
        const group = section.course_name || section.department || 'Other';
        if (!acc[group]) acc[group] = [];
        acc[group].push(section);
        return acc;
    }, {});

    let options = `<option value="">${escapeHtml(placeholderText)}</option>`;
    Object.keys(grouped).sort().forEach(group => {
        const items = grouped[group].sort((a, b) => a.section_id.localeCompare(b.section_id));
        options += `<optgroup label="${escapeHtml(group)}">`;
        items.forEach(section => {
            options += `<option value="${escapeHtml(section.section_id)}">${escapeHtml(section.section_id)}</option>`;
        });
        options += '</optgroup>';
    });
    return options;
}

function populateSectionSelectors(sections) {
    availableSections = Array.isArray(sections) ? sections : [];

    const sectionFilter = document.getElementById('periodFilter');
    const bulkPeriodMove = document.getElementById('bulkPeriodMove');
    const singlePeriod = document.getElementById('single-period');
    const editPeriod = document.getElementById('editPeriod');

    if (sectionFilter) {
        sectionFilter.innerHTML = `<option value="All">All Periods</option>` + buildSectionOptions(sections, null, false);
    }
    if (bulkPeriodMove) {
        bulkPeriodMove.innerHTML = buildSectionOptions(sections, 'Move to...');
    }
    if (singlePeriod) {
        singlePeriod.innerHTML = buildSectionOptions(sections, 'Role/Period...');
    }
    if (editPeriod) {
        editPeriod.innerHTML = buildSectionOptions(sections, 'Role/Period...');
    }
    // populate courseFilter with unique courses
    const courseFilter = document.getElementById('courseFilter');
    if (courseFilter) {
        const coursesMap = {};
        (availableSections || []).forEach(s => {
            const key = s.course_id || (s.course_name || '');
            if (!coursesMap[key]) coursesMap[key] = { course_id: s.course_id, course_name: s.course_name };
        });
        const courseItems = Object.values(coursesMap).sort((a,b) => (a.course_name||'').localeCompare(b.course_name||''));
        courseFilter.innerHTML = '<option value="">All Courses</option>' + courseItems.map(c => `<option value="${escapeHtml(c.course_name||c.course_id)}">${escapeHtml((c.course_name? c.course_name + ' ('+c.course_id+')' : c.course_id))}</option>`).join('');
    }
    // populate roleFilter default handled in HTML; no dynamic data required
}

async function fetchSections() {
    try {
        const response = await fetch('/api/admin/sections');
        if (!response.ok) throw new Error('Failed to load section catalog');
        const data = await response.json();
        populateSectionSelectors(data);
        renderSectionCatalog(data);
    } catch (err) {
        console.error(err);
        renderSectionCatalog([]);
        showStatus('Unable to load section catalog. Using fallback options.', 'warning');
    }
}

// --- BULK SELECTION FUNCTIONS ---
window.toggleStudentCheckbox = function(studentId) {
    if (selectedStudents.has(studentId)) {
        selectedStudents.delete(studentId);
    } else {
        selectedStudents.add(studentId);
    }
    updateSelectedCount();
};

window.updateSelectedCount = function() {
    const countEl = document.getElementById('selectedCount');
    if (countEl) {
        countEl.textContent = `${selectedStudents.size} selected`;
    }
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if (deleteBtn) {
        deleteBtn.disabled = selectedStudents.size === 0;
    }
};

window.selectAllStudents = function() {
    const checkboxes = document.querySelectorAll('.student-checkbox');
    checkboxes.forEach(cb => {
        if (!cb.checked) {
            cb.checked = true;
            selectedStudents.add(cb.dataset.studentId);
        }
    });
    updateSelectedCount();
};

window.deselectAllStudents = function() {
    const checkboxes = document.querySelectorAll('.student-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = false;
    });
    selectedStudents.clear();
    updateSelectedCount();
};

window.deleteSelectedStudents = async function() {
    if (selectedStudents.size === 0) return alert('No students selected.');
    
    if (!confirm(`Are you sure you want to remove ${selectedStudents.size} selected student(s)? This cannot be undone.`)) return;
    
    const studentArray = Array.from(selectedStudents);
    let deletedCount = 0;
    
    // Try the bulk endpoint first
    try {
        const res = await fetch('/api/admin/delete-multiple-students', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ student_ids: studentArray })
        });
        
        if (res.ok) {
            const j = await res.json().catch(()=>({}));
            deletedCount = j.deletedCount || studentArray.length;
        } else if (res.status === 404 || res.status === 500) {
            console.log('Bulk delete not available, using fallback...');
        }
    } catch (err) {
        console.log('Bulk endpoint error, using fallback:', err.message);
    }
    
    // If bulk didn't work, delete one by one
    if (deletedCount === 0 && studentArray.length > 0) {
        for (const studentId of studentArray) {
            try {
                const res = await fetch('/api/admin/delete-student', {
                    method: 'DELETE',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ student_id: studentId })
                });
                if (res.ok) deletedCount++;
            } catch (e) {
                console.error('Failed to delete', studentId, e);
            }
        }
    }
    
    if (deletedCount > 0) {
        showStatus(`Successfully removed ${deletedCount} student(s)!`, 'success');
        selectedStudents.clear();
        fetchRoster();
} else {
        showStatus('Failed to delete students', 'danger');
    }
};

// --- VIEW ROSTER ---
async function fetchRoster() {
    const tbody = document.getElementById('rosterTableBody');
    try {
        const response = await fetch('/api/admin/roster');
        const data = await response.json();

        // gather filters
        const periodFilterVal = document.getElementById('periodFilter')?.value || 'All';
        const courseFilterVal = document.getElementById('courseFilter')?.value || '';
        const roleFilterVal = document.getElementById('roleFilter')?.value || 'All';
        const searchVal = (document.getElementById('rosterSearch')?.value || '').trim().toLowerCase();

        tbody.innerHTML = '';
        let passwordResetPendingCount = 0;

        data.forEach(s => {
            // compute course name from availableSections
            const sectionInfo = availableSections.find(sec => sec.section_id === s.section_id) || {};
            const courseName = sectionInfo.course_name || '';

            // filtering
            if (periodFilterVal && periodFilterVal !== 'All' && s.section_id !== periodFilterVal) return;
            if (courseFilterVal && courseFilterVal !== '' && (courseName !== courseFilterVal && (sectionInfo.course_id || '') !== courseFilterVal)) return;
            if (roleFilterVal && roleFilterVal !== 'All' && String(s.role || '').toLowerCase() !== roleFilterVal) return;
            if (searchVal) {
                const hay = `${s.first_name || ''} ${s.last_name || ''} ${s.username || ''} ${s.student_id || ''}`.toLowerCase();
                if (!hay.includes(searchVal)) return;
            }
            const row = document.createElement('tr');
            const resetPending = Number(s.must_change_password || 0) === 1;
            if (resetPending) passwordResetPendingCount += 1;
            
            const isChecked = selectedStudents.has(s.student_id) ? 'checked' : '';

            row.innerHTML = `
                <td class="text-center"><input type="checkbox" class="student-checkbox" data-student-id="${escapeHtml(s.student_id || '')}" ${isChecked} onchange="toggleStudentCheckbox('${escapeHtml(s.student_id || '')}')"></td>
                <td>${escapeHtml(s.section_id || '')}</td>
                <td>${escapeHtml(courseName || '')}</td>
                <td>${escapeHtml(s.last_name || '')}</td>
                <td>${escapeHtml(s.first_name || '')}</td>
                <td>
                    <span class="badge ${s.username ? 'bg-success' : 'bg-secondary'}">${escapeHtml(s.username || 'Unregistered')}</span>
                    ${resetPending ? '<span class="badge bg-warning text-dark ms-1">Password Reset Pending</span>' : ''}
                </td>
                <td>${escapeHtml(s.student_id || '')}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="manageStudent('${escapeHtml(s.student_id || '')}', '${escapeHtml((s.first_name || '') + ' ' + (s.last_name || ''))}')">Manage</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        if (passwordResetPendingCount > 0) {
            showStatus(`⚠️ ${passwordResetPendingCount} student(s) must change password after reset.`, 'warning');
        }
        updateSelectedCount();
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load roster.</td></tr>';
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

        // Client-side validation: ensure all section_id values exist in the catalog
        const invalidRows = students.filter(s => {
            const sid = (s.section_id || '').trim();
            if (!sid) return true; // treat empty as invalid
            return !availableSections.find(sec => sec.section_id === sid);
        });

        if (invalidRows.length > 0) {
            const invalidList = Array.from(new Set(invalidRows.map(r => r.section_id)));
            showStatus(`Invalid section IDs: ${invalidList.join(', ')} — upload canceled.`, 'danger');
            return;
        }

        const res = await fetch('/api/admin/upload-roster', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(students)
        });
        if (res.ok) {
            showStatus('Roster uploaded successfully!', 'success');
            fetchRoster();
        } else {
            const j = await res.json().catch(()=>({}));
            showStatus(j && j.error ? `Upload failed: ${j.error}` : 'Upload failed', 'danger');
        }
    };
    reader.readAsText(file);
});

// --- MODAL ACTIONS ---
let activeStudentId = null;
window.manageStudent = async (id, name) => {
    activeStudentId = id;
    document.getElementById('modalStudentName').innerText = name;
    // populate fields from server
    try {
        const res = await fetch(`/api/admin/student?student_id=${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error('Failed to fetch student');
        const s = await res.json();
        document.getElementById('edit-first-name').value = s.first_name || '';
        document.getElementById('edit-last-name').value = s.last_name || '';
        document.getElementById('edit-student-id').value = s.student_id || '';
        document.getElementById('edit-username').value = s.username || '';
        document.getElementById('edit-role').value = s.role || 'student';
        // ensure editPeriod options exist; if not, fall back to simple text
        const editPeriodEl = document.getElementById('editPeriod');
        if (editPeriodEl) {
            // set value if present in options, otherwise set blank
            const target = s.section_id || '';
            editPeriodEl.value = '';
            const opt = Array.from(editPeriodEl.options).find(o => o.value === target);
            if (opt) editPeriodEl.value = target;
        }
    } catch (err) {
        console.error(err);
        showStatus('Failed to load student details.', 'danger');
    }

    new bootstrap.Modal(document.getElementById('editModal')).show();
};

document.getElementById('resetPasswordBtn').addEventListener('click', async () => {
    if (!confirm('Reset this student password to their student ID and force password change on login?')) return;
    const res = await fetch('/api/admin/reset-password-default', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ student_id: activeStudentId, default_password: activeStudentId })
    });
    const payload = await res.json().catch(() => ({}));
    if (res.ok) {
        showStatus(payload.message || 'Password reset successfully.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        fetchRoster();
    } else {
        showStatus(payload.error || 'Password reset failed.', 'danger');
    }
});

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

// Save edited student
document.getElementById('saveStudentBtn').addEventListener('click', async () => {
    const payload = {
        student_id: document.getElementById('edit-student-id').value,
        first_name: document.getElementById('edit-first-name').value.trim(),
        last_name: document.getElementById('edit-last-name').value.trim(),
        username: document.getElementById('edit-username').value.trim() || null,
        section_id: document.getElementById('editPeriod') ? document.getElementById('editPeriod').value : null,
        role: document.getElementById('edit-role').value || 'student'
    };
    const pw = document.getElementById('edit-password').value;
    if (pw && pw.length > 0) payload.password = pw;

    try {
        const res = await fetch('/api/admin/save-student', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });
        if (res.ok) {
            showStatus('Student saved!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            fetchRoster();
        } else {
            const j = await res.json().catch(()=>({}));
            showStatus(j && j.error ? `Save failed: ${j.error}` : 'Save failed', 'danger');
        }
    } catch (err) {
        console.error(err);
        showStatus('Save failed', 'danger');
    }
});

// Init
document.getElementById('refreshRosterBtn').addEventListener('click', fetchRoster);
document.getElementById('refreshSectionCatalog')?.addEventListener('click', fetchSections);

// Bulk selection button handlers
document.getElementById('selectAllBtn')?.addEventListener('click', selectAllStudents);
document.getElementById('deselectAllBtn')?.addEventListener('click', deselectAllStudents);
document.getElementById('deleteSelectedBtn')?.addEventListener('click', deleteSelectedStudents);

// Also handle the header "Select All" checkbox
document.getElementById('selectAllCheckbox')?.addEventListener('change', (e) => {
    if (e.target.checked) {
        selectAllStudents();
    } else {
        deselectAllStudents();
    }
});

window.onload = async () => {
    fetchRoster();
    fetchSections();
};

// filter/listener hooks
document.getElementById('periodFilter')?.addEventListener('change', fetchRoster);
document.getElementById('courseFilter')?.addEventListener('change', fetchRoster);
document.getElementById('roleFilter')?.addEventListener('change', fetchRoster);
document.getElementById('rosterSearch')?.addEventListener('input', fetchRoster);

