/**
 * CHS Web Design - Universal Assignment Uploader
 * Uses MariaDB API + auth-guard.js for authentication.
 */

let currentStudent = null; // { student_id, first_name, last_name, username, section_id }
const hostgatorUrl = "/api/upload";
const hostgatorManageUrl = "/api/manage-files";

// "Upload failed or all files were skipped" alone gave no trail to follow --
// every real failure (a stale session, a genuinely missing folder, a
// rejected file type, a network drop) looked identical from both the
// student's side and the server logs. sendBeacon (not fetch, same reasoning
// as js/student/timeclock.js's logTimeclockError) so this still gets
// reported even when the connection problem it's describing is also what's
// breaking the upload itself.
function logUploadError(reason, fileName) {
    try {
        const payload = JSON.stringify({
            message: `Upload failed: ${reason}`,
            stack: null,
            url: window.location.href,
            student_id: currentStudent ? currentStudent.student_id : null,
            context: `assignment-uploader:${fileName || 'unknown file'}`,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        });
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            if (navigator.sendBeacon('/api/client-error-log', blob)) return;
        }
        fetch('/api/client-error-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
        }).catch(() => {});
    } catch (e) { /* logging must never itself break the widget */ }
}

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

function setupOverwriteModal() {
    if (document.getElementById('overwriteModal')) return;
    const modalHtml = `
      <div class="modal" id="overwriteModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content shadow border-danger">
            <div class="modal-header py-2 bg-danger text-white">
              <h6 class="modal-title fw-bold mb-0 font-monospace"><i class="fas fa-exclamation-triangle me-1"></i> File Exists</h6>
            </div>
            <div class="modal-body bg-light text-center">
              <p id="overwriteModalMsg" class="small mb-3 text-dark fw-bold"></p>
              <div class="d-flex flex-column gap-2">
                <button type="button" class="btn btn-danger btn-sm fw-bold w-100 shadow-sm" data-action="overwrite">Overwrite File</button>
                <button type="button" class="btn btn-primary btn-sm fw-bold w-100 shadow-sm" data-action="copy">Keep Both (Make Copy)</button>
                <button type="button" class="btn btn-outline-danger btn-sm fw-bold w-100" data-action="overwriteAll">Overwrite All</button>
                <button type="button" class="btn btn-secondary btn-sm fw-bold w-100 shadow-sm" data-action="skip">Skip File</button>
                <button type="button" class="btn btn-outline-secondary btn-sm fw-bold w-100" data-action="skipAll">Skip All</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function askForOverwrite(fileName) {
    return new Promise((resolve) => {
        const safeName = fileName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        document.getElementById('overwriteModalMsg').innerHTML = `The file <br><span class="fw-bold text-danger font-monospace border-bottom border-danger">${safeName}</span><br> already exists.<br><br>What would you like to do?`;

        const modalEl = document.getElementById('overwriteModal');
        let modal = null;
        if (typeof bootstrap !== 'undefined') {
            modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        }

        const buttons = modalEl.querySelectorAll('button[data-action]');
        const cleanup = () => { buttons.forEach(btn => btn.removeEventListener('click', handleChoice)); };

        const handleChoice = (e) => {
            if (document.activeElement) document.activeElement.blur();
            const action = e.target.getAttribute('data-action');
            cleanup();
            if (modal) { modal.hide(); setTimeout(() => resolve(action), 250); }
            else resolve(action);
        };

        buttons.forEach(btn => btn.addEventListener('click', handleChoice));
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Bootstrap Tooltips Globally
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }

    const uploadForm = document.getElementById('uploadForm');
    if (!uploadForm) return;

    const submitBtn = document.getElementById('submitBtn');
    const idBadge = document.getElementById('student-id-badge');
    const uploadType = document.getElementById('uploadType');
    const assignSelect = document.getElementById('uploadAssignment');

    const syncUploadState = () => {
        const fileInput = document.getElementById('fileInput');
        const folderInput = document.getElementById('folderInput');

        if (uploadType.value === 'folder') {
            document.getElementById('fileInputContainer').classList.add('d-none');
            document.getElementById('folderInputContainer').classList.remove('d-none');
            if (fileInput) fileInput.removeAttribute('required');
            if (folderInput) folderInput.setAttribute('required', 'required');
        } else {
            document.getElementById('fileInputContainer').classList.remove('d-none');
            document.getElementById('folderInputContainer').classList.add('d-none');
            if (folderInput) folderInput.removeAttribute('required');
            if (fileInput) fileInput.setAttribute('required', 'required');
        }
    };

    uploadType.addEventListener('change', syncUploadState);
    syncUploadState();

    // Auth + Student Profile
    const authData = await waitForAuth();
    if (!authData.isAuthenticated) return;

    try {
        let storedUser = {};
        try { storedUser = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) {}
        const username = storedUser.username || '';

        if (!username) throw new Error("No username in session");

        const profileRes = await fetch(`/api/student/profile?username=${encodeURIComponent(username)}`);
        if (!profileRes.ok) throw new Error("Profile not found");
        currentStudent = await profileRes.json();

        if (idBadge) idBadge.innerText = `ID: ${currentStudent.student_id} (${currentStudent.first_name})`;
        if (submitBtn) submitBtn.disabled = false;
        setupOverwriteModal();
    } catch (e) {
        console.error("Failed to load student profile:", e);
        return;
    }

    uploadForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!currentStudent) return alert("Identity error.");

        // Browser/extension page-translation (a student's Chrome set to
        // auto-translate to Mandarin, Spanish, etc.) rewrites visible DOM
        // text -- including, it turns out, the data-label ATTRIBUTE too in
        // at least one confirmed live case, not just rendered text as
        // originally assumed. A corrupted exam_id built from either one
        // used to land straight in the gradebook as a new, permanent,
        // due-date-less column with no validation at all (one real case:
        // a Chapter 9 milestone submitted in Chinese). The dropdown's own
        // `value` attribute is never touched by any translation mechanism
        // observed so far (rewriting it would break the browser's own form
        // submission), and every option's value is already hardcoded here
        // to exactly match its real, pre-seeded catalog exam_id -- so it's
        // used directly now instead of ever reconstructing an exam_id from
        // any DOM text, translated or not. rawAssignmentText is kept only
        // for the point/type detection below and the human-readable status
        // message -- neither is safety-critical the way exam_id is, since
        // the server now falls back to its own catalog's point value when
        // the exam_id already exists there (see /submit-exam).
        const selectedOption = assignSelect.options[assignSelect.selectedIndex];
        const rawAssignmentText = selectedOption.dataset.label || selectedOption.text;
        const finalAssignmentKey = selectedOption.value;

        // Calculate points
        const ptsMatch = rawAssignmentText.match(/[\[\(](\d+)\s*pts?[\]\)]/i);
        const lowerName = rawAssignmentText.toLowerCase();
        let maxPoints = 100;

        if (ptsMatch) {
            maxPoints = parseInt(ptsMatch[1]);
        } else if (lowerName.includes('pre-test') || lowerName.includes('pretest') || lowerName.includes('pre-assessment')) {
            maxPoints = 10;
        } else if (lowerName.includes('assessment') || lowerName.includes('exam')) {
            maxPoints = 20;
        } else if (lowerName.includes('lab') || lowerName.includes('ch ')) {
            maxPoints = 25;
        }

        // Interim milestones auto-grade at full credit for turning it in. Only the
        // chapter's culminating item ("Project:", "Capstone:", "Final Project:") is
        // held at 0 pending self/peer/auto review.
        let finalScore = (lowerName.includes('project') || lowerName.includes('capstone') || lowerName.includes('exam')) ? 0 : maxPoints;

        const status = document.getElementById('uploadStatus');
        const progBar = document.getElementById('progressBar');
        const progressContainer = document.getElementById('uploadProgress');

        const fileInput = document.getElementById('fileInput');
        const folderInput = document.getElementById('folderInput');
        const files = uploadType.value === 'file' ? fileInput.files : folderInput.files;

        if (files.length === 0) {
            alert("Please select a file or folder to upload.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Preparing Upload...';
        if (progressContainer) progressContainer.classList.remove('d-none');
        if (status) {
            status.classList.remove('d-none', 'bg-success', 'bg-danger', 'text-white');
            status.classList.add('bg-light', 'text-dark');
            status.innerHTML = "Initializing...";
        }

        let successCount = 0;
        let lastFailureReason = null;

        // Fetch existing files to check for duplicates
        let existingFiles = [];
        try {
            const listData = new FormData();
            listData.append("action", "list");
            listData.append("studentId", currentStudent.student_id);
            const listRes = await fetch(hostgatorManageUrl, { method: "POST", body: listData });
            const listJson = await listRes.json();
            if (listJson.success) {
                const prefix = `uploads/${currentStudent.student_id}/`;
                existingFiles = listJson.files.map(f => f.path.startsWith(prefix) ? f.path.substring(prefix.length) : f.path);
            }
        } catch (err) { console.warn("Could not fetch existing files.", err); }

        let skipAll = false;
        let overwriteAll = false;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.name === '.DS_Store' || file.name.startsWith('._') || file.name === 'Thumbs.db') continue;

            submitBtn.innerHTML = `⏳ Uploading file ${i + 1} of ${files.length}...`;

            let finalPath = file.webkitRelativePath || file.name;

            // Check duplicates
            if (existingFiles.includes(finalPath)) {
                if (skipAll) continue;
                if (!overwriteAll) {
                    const choice = await askForOverwrite(finalPath);
                    if (choice === 'skipAll') { skipAll = true; continue; }
                    else if (choice === 'skip') { continue; }
                    else if (choice === 'overwriteAll') { overwriteAll = true; }
                    else if (choice === 'copy') {
                        const pathParts = finalPath.split('/');
                        const fName = pathParts.pop();
                        const fPath = pathParts.length > 0 ? pathParts.join('/') + '/' : '';
                        const nameParts = fName.split('.');
                        const ext = nameParts.length > 1 ? '.' + nameParts.pop() : '';
                        const base = nameParts.join('.');
                        let copyCount = 1;
                        let newPath = `${fPath}${base} (Copy)${ext}`;
                        while (existingFiles.includes(newPath)) { copyCount++; newPath = `${fPath}${base} (Copy ${copyCount})${ext}`; }
                        finalPath = newPath;
                    }
                }
            }

            const formData = new FormData();
            formData.append("studentId", currentStudent.student_id);
            formData.append("assignment", finalAssignmentKey);
            formData.append("file", file);
            formData.append("path", finalPath);

            try {
                const resp = await fetch(hostgatorUrl, { method: "POST", body: formData });
                const res = await resp.json().catch(() => ({}));
                if (res.success) {
                    successCount++;
                    existingFiles.push(finalPath);
                } else {
                    // "Upload failed" alone gave no way to tell a stale
                    // session (401 Not authorized -- the actual cause behind
                    // more than one "students can't turn work in" report)
                    // apart from a genuinely missing/misconfigured folder or
                    // any other server error. Keep the real reason so the
                    // status message below can say what actually happened.
                    lastFailureReason = res.error || `Server returned ${resp.status}`;
                    logUploadError(lastFailureReason, file.name);
                }
            } catch (err) {
                console.error(`Failed to upload ${file.name}:`, err);
                lastFailureReason = err.message || String(err);
                logUploadError(lastFailureReason, file.name);
            }

            if (progBar) progBar.style.width = Math.round(((i + 1) / files.length) * 100) + '%';
        }

        if (successCount > 0) {
            try {
                // Save grade to MariaDB via submit-exam endpoint
                await fetch('/api/submit-exam', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student_id: currentStudent.student_id,
                        exam_id: finalAssignmentKey,
                        score: finalScore,
                        total_points: maxPoints
                    })
                });

                if (status) {
                    status.classList.remove('bg-light', 'text-dark', 'd-none');
                    status.classList.add('bg-success', 'text-white');
                    status.innerHTML = `✅ Uploaded ${successCount} files. Saved as: ${finalAssignmentKey}`;
                }
                uploadForm.reset();
                uploadType.dispatchEvent(new Event('change'));

                if (progBar) setTimeout(() => {
                    progBar.style.width = '0%';
                    if (progressContainer) progressContainer.classList.add('d-none');
                }, 3000);
            } catch (gradeErr) {
                console.error("Gradebook sync failed:", gradeErr);
                if (status) {
                    status.classList.remove('bg-light', 'text-dark', 'd-none');
                    status.classList.add('bg-warning', 'text-dark');
                    status.innerHTML = `⚠️ Files uploaded, but gradebook sync failed. Contact instructor.`;
                }
            }
        } else {
            if (status) {
                status.classList.remove('bg-light', 'text-dark', 'd-none');
                status.classList.add('bg-danger', 'text-white');
                status.innerHTML = lastFailureReason
                    ? `❌ Upload failed: ${lastFailureReason}. If this says "Not authorized," log out and log back in, then try again.`
                    : `❌ Upload failed or all files were skipped.`;
            }
            if (progressContainer) progressContainer.classList.add('d-none');
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = "Upload to Teacher Server";
    };
});
