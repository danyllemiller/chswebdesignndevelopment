const statusDiv = document.getElementById('statusMessage');
let availableSections = [];
const selectedStudents = new Set();
let lastDisplayedRoster = []; // whatever's currently visible after filters — what CSV export downloads

async function populateYearDropdowns() {
    try {
        const res = await fetch('/api/admin/school-years');
        if (!res.ok) return;
        const years = await res.json();
        const options = years.map(y => `<option value="${escapeHtml(y)}">${escapeHtml(y)}</option>`).join('');
        const rosterYearFilter = document.getElementById('yearFilter');
        const sectionYearFilter = document.getElementById('sectionYearFilter');
        if (rosterYearFilter) rosterYearFilter.innerHTML = '<option value="">Active (Current)</option>' + options;
        if (sectionYearFilter) sectionYearFilter.innerHTML = '<option value="">Active (Current)</option>' + options;
    } catch (err) {
        console.error('Failed to load school years', err);
    }
}

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
        body.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">No sections yet. Add one above.</td></tr>';
        return;
    }

    body.innerHTML = sections.map(s => {
        const perm = s.permanent === 1 || s.permanent === true;
        const yearCell = perm
            ? '<span class="badge bg-secondary">🔒 Permanent</span>'
            : escapeHtml(s.school_year || '');
        const editBtn = perm
            ? ''
            : `<button class="btn btn-sm btn-outline-primary py-0 me-1" onclick="editSection('${escapeHtml(s.section_id)}','${escapeHtml(s.course_id)}','${escapeHtml(s.course_name)}','${escapeHtml(s.school_year||'')}')">✏️</button>`;
        const delBtn = perm
            ? '<button class="btn btn-sm btn-outline-secondary py-0" disabled title="Permanent — cannot delete">🔒</button>'
            : `<button class="btn btn-sm btn-outline-danger py-0" onclick="deleteSection('${escapeHtml(s.section_id)}','${escapeHtml(s.course_id)}')">🗑️</button>`;
        return `
        <tr${s.archived ? ' class="table-secondary text-muted"' : (perm ? ' class="table-warning"' : '')}>
            <td class="fw-bold">${escapeHtml(s.section_id)}</td>
            <td class="text-muted small">${escapeHtml(s.course_id)}</td>
            <td>${escapeHtml(s.course_name)}</td>
            <td class="small">${yearCell}</td>
            <td class="text-center" style="white-space:nowrap">${editBtn}${delBtn}</td>
        </tr>`;
    }).join('');
}

async function addSection() {
    const sid   = document.getElementById('new-section-id')?.value.trim();
    const cid   = document.getElementById('new-section-course-id')?.value.trim();
    const cname = document.getElementById('new-section-course-name')?.value.trim();
    if (!sid)   { showStatus('Section ID is required.', 'warning'); return; }
    if (!cid)   { showStatus('Enter a Course ID.', 'warning'); return; }
    if (!cname) { showStatus('Enter a Course Name.', 'warning'); return; }

    try {
        const r = await fetch('/api/admin/sections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section_id: sid, course_id: cid, course_name: cname })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed');
        document.getElementById('new-section-course-id').value = '';
        document.getElementById('new-section-course-name').value = '';
        document.getElementById('new-section-id').value = '';
        showStatus(`Section "${sid}" added.`, 'success');
        fetchSections();
    } catch (err) {
        showStatus(err.message, 'danger');
    }
}

window.editSection = function(sid, cid, cname, year) {
    document.getElementById('editSection-id').value = sid;
    document.getElementById('editSection-cid').value = cid;
    document.getElementById('editSection-name').value = cname;
    document.getElementById('editSection-year').value = year;
    new bootstrap.Modal(document.getElementById('editSectionModal')).show();
};

window.deleteSection = async function(sid, cid) {
    if (!confirm(`Delete section "${sid}" (${cid})? This cannot be undone.`)) return;
    try {
        const r = await fetch(`/api/admin/sections/${encodeURIComponent(sid)}?course_id=${encodeURIComponent(cid)}`, { method: 'DELETE' });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed');
        showStatus(`Section "${sid}" removed.`, 'success');
        fetchSections();
    } catch (err) {
        showStatus(err.message, 'danger');
    }
};

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
    const singleAdditional = document.getElementById('single-additional-periods');
    const editAdditional = document.getElementById('editAdditionalPeriods');

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
    // Multi-selects for additional (non-primary) periods — no placeholder option needed
    if (singleAdditional) {
        singleAdditional.innerHTML = buildSectionOptions(sections, '', false);
    }
    if (editAdditional) {
        editAdditional.innerHTML = buildSectionOptions(sections, '', false);
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
    const year = document.getElementById('sectionYearFilter')?.value || '';
    const url = year ? `/api/admin/sections?year=${encodeURIComponent(year)}` : '/api/admin/sections';
    try {
        const response = await fetch(url);
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

async function archiveYear() {
    const year = document.getElementById('sectionYearFilter')?.value || '';
    if (!year) {
        showStatus('Select a specific year to archive (not "Active").', 'warning');
        return;
    }
    if (!confirm(`Archive ${year}? This will hide all sections and students from that year. Grade data is preserved.`)) return;
    try {
        const res = await fetch('/api/admin/archive-year', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ school_year: year })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        showStatus(`${year} archived — ${data.sections} section(s), ${data.students} student(s).`, 'success');
        await populateYearDropdowns();
        fetchSections();
        fetchRoster();
    } catch (err) {
        showStatus(err.message, 'danger');
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

window.archiveSelectedStudents = async function() {
    if (selectedStudents.size === 0) return alert('No students selected.');
    if (!confirm(`Archive ${selectedStudents.size} selected student(s)? Their data is preserved and can be viewed by selecting a past year.`)) return;
    try {
        const res = await fetch('/api/admin/archive-students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_ids: Array.from(selectedStudents) })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        showStatus(`${data.archivedCount} student(s) archived successfully.`, 'success');
        selectedStudents.clear();
        fetchRoster();
    } catch (err) {
        showStatus(err.message, 'danger');
    }
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
        const year = document.getElementById('yearFilter')?.value || '';
        const url = year ? `/api/admin/roster?year=${encodeURIComponent(year)}` : '/api/admin/roster';
        const response = await fetch(url);
        const data = await response.json();

        // gather filters
        const periodFilterVal = document.getElementById('periodFilter')?.value || 'All';
        const courseFilterVal = document.getElementById('courseFilter')?.value || '';
        const roleFilterVal = document.getElementById('roleFilter')?.value || 'All';
        const searchVal = (document.getElementById('rosterSearch')?.value || '').trim().toLowerCase();

        tbody.innerHTML = '';
        lastDisplayedRoster = [];
        let passwordResetPendingCount = 0;

        data.forEach(s => {
            // Use server-resolved fields when available, fall back to local lookup
            const courseId   = s.course_id || '';
            const period     = s.display_period || s.section_id || '';
            const courseName = s.display_course_name || (() => {
                const sec = availableSections.find(sec => sec.section_id === s.section_id) || {};
                return sec.course_name || '';
            })();

            // filtering
            if (periodFilterVal && periodFilterVal !== 'All' && period !== periodFilterVal) return;
            if (courseFilterVal && courseFilterVal !== '') {
                if (courseName !== courseFilterVal && courseId !== courseFilterVal) return;
            }
            if (roleFilterVal && roleFilterVal !== 'All' && String(s.role || '').toLowerCase() !== roleFilterVal) return;
            if (searchVal) {
                const hay = `${s.first_name || ''} ${s.last_name || ''} ${s.username || ''} ${s.student_id || ''} ${courseId}`.toLowerCase();
                if (!hay.includes(searchVal)) return;
            }

            lastDisplayedRoster.push({ courseId, period, courseName, lastName: s.last_name || '', firstName: s.first_name || '', username: s.username || '', studentId: s.student_id || '' });

            const row = document.createElement('tr');
            const resetPending = Number(s.must_change_password || 0) === 1;
            if (resetPending) passwordResetPendingCount += 1;

            const isChecked = selectedStudents.has(s.student_id) ? 'checked' : '';

            const additionalBadges = (s.additional_sections || []).map(a =>
                `<span class="badge bg-info text-dark ms-1" title="${escapeHtml(a.course_name || '')}">+${escapeHtml(a.section_id)}</span>`
            ).join('');

            row.innerHTML = `
                <td class="text-center"><input type="checkbox" class="student-checkbox" data-student-id="${escapeHtml(s.student_id || '')}" ${isChecked} onchange="toggleStudentCheckbox('${escapeHtml(s.student_id || '')}')"></td>
                <td class="small text-muted">${escapeHtml(courseId)}</td>
                <td>${escapeHtml(period)}${additionalBadges}</td>
                <td>${escapeHtml(courseName)}</td>
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
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Failed to load roster.</td></tr>';
    }
}

// --- ADD SINGLE STUDENT ---
document.getElementById('addSingleBtn').addEventListener('click', async () => {
    const studentId = document.getElementById('single-sid').value.trim();
    const payload = [{
        first_name: document.getElementById('single-fname').value.trim(),
        last_name: document.getElementById('single-lname').value.trim(),
        student_id: studentId,
        section_id: document.getElementById('single-period').value.trim()
    }];

    try {
        const res = await fetch('/api/admin/upload-roster', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const additionalSel = document.getElementById('single-additional-periods');
            const additionalIds = additionalSel ? Array.from(additionalSel.selectedOptions).map(o => o.value) : [];
            if (studentId && additionalIds.length > 0) {
                await fetch('/api/admin/set-student-sections', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ student_id: studentId, section_ids: additionalIds })
                });
            }
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

        lines.forEach((line, idx) => {
            const cols = line.split(',');
            if (cols.length < 4) return;
            const rawCourseCol = cols[3].trim();
            // Skip header rows (first token not a number or empty student ID)
            const sid = cols[2].trim();
            if (!sid || isNaN(Number(sid))) return;
            // School CSVs may have "05254GIF-101 WEB DESIGN I" — take first token only
            const course_id = rawCourseCol.split(' ')[0].trim();
            students.push({
                first_name: cols[0].trim(),
                last_name:  cols[1].trim(),
                student_id: sid,
                course_id
            });
        });

        // Client-side validation: ensure all course_id values exist in the catalog
        const validCourseIds = new Set(availableSections.map(s => (s.course_id || '').trim()).filter(Boolean));
        const invalidRows = students.filter(s => {
            const cid = (s.course_id || '').trim();
            if (!cid) return true;
            return !validCourseIds.has(cid);
        });

        if (invalidRows.length > 0) {
            const invalidList = Array.from(new Set(invalidRows.map(r => r.course_id)));
            showStatus(`Unknown Course IDs: ${invalidList.join(', ')} — add these sections first, then re-upload.`, 'danger');
            return;
        }

        // upload-roster now handles the whole thing atomically in one call:
        // matched students get their period/name corrected, brand-new IDs
        // get a bare account created (same as the single-add form above),
        // and anyone currently active but absent from this file is archived
        // automatically -- no manual per-student review step anymore.
        await finishRosterUpload(students);
    };
    reader.readAsText(file);
});

async function finishRosterUpload(students) {
    // archiveMissing=true only here -- this is the one flow where the
    // payload IS meant to be the full current roster. Never add this flag
    // to the single Add Student call above; that payload is intentionally
    // just one student and would read as everyone else having dropped out.
    const res = await fetch('/api/admin/upload-roster?archiveMissing=true', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(students)
    });
    if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showStatus(j && j.error ? `Upload failed: ${j.error}` : 'Upload failed', 'danger');
        return;
    }
    const d = await res.json();
    showStatus(`Roster uploaded — ${d.created || 0} added, ${d.updated || 0} updated, ${d.archived || 0} archived (not on this file).`, 'success');
    fetchRoster();
}

// --- MODAL ACTIONS ---
let activeStudentId = null;
let originalPayrollTitle = 'Intern';

// Only show the effective-date picker once the admin actually changes the
// position -- most saves don't touch payroll at all, and the row would
// otherwise imply every save moves someone's pay-rate start date.
document.getElementById('edit-payroll-title')?.addEventListener('change', (e) => {
    const effDateRow = document.getElementById('payroll-effective-date-row');
    if (effDateRow) effDateRow.style.display = (e.target.value !== originalPayrollTitle) ? '' : 'none';
});
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
        const posEl = document.getElementById('edit-payroll-title');
        if (posEl) posEl.value = s.payroll_title || 'Intern';
        originalPayrollTitle = s.payroll_title || 'Intern';
        const effDateRow = document.getElementById('payroll-effective-date-row');
        const effDateInput = document.getElementById('edit-payroll-effective-date');
        if (effDateRow) effDateRow.style.display = 'none';
        if (effDateInput) effDateInput.value = new Date().toISOString().split('T')[0];
        // ensure editPeriod options exist; if not, fall back to simple text
        const editPeriodEl = document.getElementById('editPeriod');
        if (editPeriodEl) {
            // set value if present in options, otherwise set blank
            const target = s.section_id || '';
            editPeriodEl.value = '';
            const opt = Array.from(editPeriodEl.options).find(o => o.value === target);
            if (opt) editPeriodEl.value = target;
        }

        const editAdditionalEl = document.getElementById('editAdditionalPeriods');
        if (editAdditionalEl) {
            Array.from(editAdditionalEl.options).forEach(o => { o.selected = false; });
            try {
                const secRes = await fetch(`/api/admin/student-sections?student_id=${encodeURIComponent(id)}`);
                if (secRes.ok) {
                    const extra = await secRes.json();
                    const extraIds = new Set(extra.map(r => r.section_id));
                    Array.from(editAdditionalEl.options).forEach(o => { o.selected = extraIds.has(o.value); });
                }
            } catch (e) { console.error('Failed to load additional sections', e); }
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
        role: document.getElementById('edit-role').value || 'student',
        payroll_title: document.getElementById('edit-payroll-title')?.value || 'Intern',
        payroll_effective_date: document.getElementById('edit-payroll-effective-date')?.value || null
    };
    const pw = document.getElementById('edit-password').value;
    if (pw && pw.length > 0) payload.password = pw;

    try {
        const res = await fetch('/api/admin/save-student', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });
        if (res.ok) {
            const editAdditionalEl = document.getElementById('editAdditionalPeriods');
            const additionalIds = editAdditionalEl ? Array.from(editAdditionalEl.selectedOptions).map(o => o.value) : [];
            await fetch('/api/admin/set-student-sections', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ student_id: payload.student_id, section_ids: additionalIds })
            });
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

// Bulk selection button handlers
document.getElementById('selectAllBtn')?.addEventListener('click', selectAllStudents);
document.getElementById('deselectAllBtn')?.addEventListener('click', deselectAllStudents);
document.getElementById('archiveSelectedBtn')?.addEventListener('click', archiveSelectedStudents);
document.getElementById('deleteSelectedBtn')?.addEventListener('click', deleteSelectedStudents);
document.getElementById('addSectionBtn')?.addEventListener('click', addSection);
document.getElementById('refreshSectionCatalog')?.addEventListener('click', fetchSections);
document.getElementById('archiveYearBtn')?.addEventListener('click', archiveYear);

document.getElementById('saveSectionBtn')?.addEventListener('click', async () => {
    const sid   = document.getElementById('editSection-id').value.trim();
    const cid   = document.getElementById('editSection-cid').value.trim();
    const cname = document.getElementById('editSection-name').value.trim();
    const year  = document.getElementById('editSection-year').value.trim();
    try {
        const res = await fetch(`/api/admin/sections/${encodeURIComponent(sid)}?course_id=${encodeURIComponent(cid)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ course_name: cname, school_year: year })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        bootstrap.Modal.getInstance(document.getElementById('editSectionModal')).hide();
        showStatus('Section updated.', 'success');
        await populateYearDropdowns();
        fetchSections();
    } catch (err) {
        showStatus(err.message, 'danger');
    }
});

// Also handle the header "Select All" checkbox
document.getElementById('selectAllCheckbox')?.addEventListener('change', (e) => {
    if (e.target.checked) {
        selectAllStudents();
    } else {
        deselectAllStudents();
    }
});

window.onload = async () => {
    await populateYearDropdowns();
    fetchRoster();
    fetchSections();
};

// filter/listener hooks
document.getElementById('periodFilter')?.addEventListener('change', fetchRoster);
document.getElementById('courseFilter')?.addEventListener('change', fetchRoster);
document.getElementById('roleFilter')?.addEventListener('change', fetchRoster);
document.getElementById('yearFilter')?.addEventListener('change', fetchRoster);
document.getElementById('rosterSearch')?.addEventListener('input', fetchRoster);
document.getElementById('sectionYearFilter')?.addEventListener('change', fetchSections);

// --- EXPORT ROSTER TO CSV ---
// Exports exactly what's currently visible in the table (respects every
// active filter — period, course, role, search, and year).
document.getElementById('exportRosterCsvBtn')?.addEventListener('click', () => {
    if (lastDisplayedRoster.length === 0) return showStatus('No students to export.', 'warning');

    const header = ['Course ID', 'Period', 'Course Name', 'Last Name', 'First Name', 'Username', 'Student ID'];
    const rows = lastDisplayedRoster.map(s => [s.courseId, s.period, s.courseName, s.lastName, s.firstName, s.username, s.studentId]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `roster-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
});

