/**
 * CHS Web Design - Student File Manager (Workspace Edition)
 * MIGRATED: Firebase removed. Uses MariaDB API + auth-guard.js for authentication.
 * Handles: Virtual File System, Folder Navigation, Move/Delete/Download.
 * INCLUDES: Peer-to-peer file sharing, Code Editor, and Fetch API fix.
 */

const HOSTGATOR_UPLOAD_URL = "https://digitalartsclasses.com/upload.php";
const HOSTGATOR_MANAGE_URL = "https://digitalartsclasses.com/manage_files.php";

let myOwnStudentId = null;
let myOwnStudentData = null; // { student_id, first_name, last_name, section_id, username }
let currentStudentId = null;
let allFilesData = [];
let currentFolderPath = '';

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

// ==========================================
// GLOBAL NAVIGATION EXPORTS
// ==========================================
window.openFolder = (path) => {
    currentFolderPath = path;
    renderFileTable();
};

window.goBackFolder = () => {
    const parts = currentFolderPath.split('/').filter(p => p !== '');
    parts.pop();
    currentFolderPath = parts.length > 0 ? parts.join('/') + '/' : '';
    renderFileTable();
};

window.openSharedFolder = (url) => {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p !== '');
        if (pathParts[0] === 'uploads' && pathParts.length >= 2) {
            currentStudentId = pathParts[1];
            currentFolderPath = pathParts.slice(2).join('/');
            if (currentFolderPath && !currentFolderPath.endsWith('/')) {
                currentFolderPath += '/';
            }
            const nameDisplay = document.getElementById('userSubtitle');
            if (nameDisplay) nameDisplay.innerHTML = `<i class="fas fa-users text-success"></i> Shared Workspace`;
            const idBadge = document.getElementById('student-id-badge');
            if (idBadge) idBadge.innerText = `Viewing ID: ${currentStudentId}`;
            fetchFiles();
        }
    } catch (e) {
        console.error("Invalid shared URL:", e);
        alert("Could not open this shared folder. The link may be invalid.");
    }
};

window.returnToMyWorkspace = () => {
    currentStudentId = myOwnStudentId;
    currentFolderPath = '';
    const nameDisplay = document.getElementById('userSubtitle');
    if (nameDisplay) nameDisplay.innerText = `Location: /uploads/${currentStudentId}/`;
    const idBadge = document.getElementById('student-id-badge');
    if (idBadge) idBadge.innerText = `ID: ${currentStudentId}`;
    fetchFiles();
};

window.openSharedFileEditor = (url, name) => openFileEditor('', url, name);

// ==========================================
// INIT — Entry Point (replaces onAuthStateChanged)
// ==========================================
async function startFileManager() {
    const authData = await waitForAuth();

    if (!authData.isAuthenticated) {
        window.location.replace("/login.html?redirect=" + encodeURIComponent(window.location.pathname));
        return;
    }

    // Get student_id and username from localStorage (stored at login)
    let storedUser = null;
    try {
        storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
        storedUser = {};
    }

    const username = storedUser.username || '';
    const studentId = storedUser.student_id || '';

    if (!username && !studentId) {
        document.getElementById('file-list-body').innerHTML =
            `<tr><td colspan="5" class="text-center p-5 text-danger fw-bold"><i class="fas fa-exclamation-triangle me-2"></i>Session error. Please log out and log back in.</td></tr>`;
        return;
    }

    try {
        // Fetch full student profile from API
        const profileRes = await fetch(`/api/student/profile?username=${encodeURIComponent(username)}`);
        if (!profileRes.ok) throw new Error("Profile not found");
        myOwnStudentData = await profileRes.json();

        myOwnStudentId = myOwnStudentData.student_id;
        currentStudentId = myOwnStudentId;

        const nameDisplay = document.getElementById('userSubtitle');
        if (nameDisplay) nameDisplay.innerText = `Location: /uploads/${currentStudentId}/`;

        const idBadge = document.getElementById('student-id-badge');
        if (idBadge) idBadge.innerText = `ID: ${currentStudentId}`;

        // Help Request Button
        const helpBtn = document.getElementById('btn-request-help');
        if (helpBtn) {
            helpBtn.classList.remove('d-none');
            let isHelpRequested = false;

            const updateHelpUI = () => {
                if (isHelpRequested) {
                    helpBtn.className = "btn btn-danger shadow-sm fw-bold";
                    helpBtn.innerHTML = '<i class="fas fa-times-circle me-2"></i> Cancel Help Request';
                } else {
                    helpBtn.className = "btn btn-outline-danger shadow-sm fw-bold";
                    helpBtn.innerHTML = '<i class="fas fa-life-ring me-2"></i> Request Admin Help';
                }
            };

            updateHelpUI();

            helpBtn.onclick = async () => {
                isHelpRequested = !isHelpRequested;
                helpBtn.disabled = true;
                try {
                    await fetch('/api/student/help-request', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ student_id: myOwnStudentId, requested: isHelpRequested })
                    });
                    updateHelpUI();
                } catch (e) {
                    console.error("Failed to update help request.", e);
                    isHelpRequested = !isHelpRequested;
                }
                helpBtn.disabled = false;
            };
        }

        setupFileUI(currentStudentId);
        setupMoveModal();
        setupOverwriteModal();
        setupShareModal();
        setupEditorModal();

        fetchFiles();
        loadSharedFiles();

    } catch (e) {
        console.error("File System Auth Error:", e);
        document.getElementById('file-list-body').innerHTML =
            `<tr><td colspan="5" class="text-center p-5 text-danger fw-bold"><i class="fas fa-exclamation-triangle me-2"></i>Roster profile not found. Please contact your instructor.</td></tr>`;
    }
}

startFileManager();

// ==========================================
// FILE SYSTEM (HostGator)
// ==========================================
async function fetchFiles() {
    const listBody = document.getElementById('file-list-body');
    if (listBody) listBody.innerHTML = '<tr><td colspan="5" class="text-center p-5"><div class="spinner-border text-primary"></div><br>Retrieving files...</td></tr>';

    try {
        if (!currentStudentId) throw new Error("Student ID missing.");

        const formData = new FormData();
        formData.append("action", "list");
        formData.append("studentId", currentStudentId);

        const response = await fetch(HOSTGATOR_MANAGE_URL, { method: "POST", body: formData });
        const result = await response.json();

        if (result.success) {
            const prefix = `uploads/${currentStudentId}/`;
            allFilesData = (result.files || []).map(f => ({
                ...f,
                serverPath: f.path,
                path: f.path.startsWith(prefix) ? f.path.substring(prefix.length) : f.path
            }));
            renderFileTable();
        } else {
            allFilesData = [];
            renderFileTable();
        }
    } catch (e) {
        console.error("Fetch error:", e);
        if (listBody) listBody.innerHTML = `<tr><td colspan="5" class="text-center p-5 text-danger fw-bold"><i class="fas fa-wifi me-2"></i>Connection error. Please refresh the page.</td></tr>`;
    }
}

function renderFileTable() {
    const tbody = document.getElementById('file-list-body');
    if (!tbody) return;

    const currentFiles = [];
    const subfolders = new Set();

    allFilesData.forEach(file => {
        if (file.path.startsWith(currentFolderPath)) {
            const relative = file.path.substring(currentFolderPath.length);
            const parts = relative.split('/');

            if (parts.length > 1) {
                subfolders.add(parts[0]);
            } else if (parts[0] !== '.keep' && parts[0] !== '') {
                currentFiles.push({ ...file, displayName: parts[0] });
            }
        }
    });

    const breadcrumbEl = document.getElementById('userSubtitle');
    if (breadcrumbEl) {
        let breadcrumbHtml = '';

        if (currentStudentId !== myOwnStudentId) {
            breadcrumbHtml += `<button class="btn btn-sm btn-outline-success me-2 fw-bold" onclick="window.returnToMyWorkspace()"><i class="fas fa-arrow-left"></i> Back to My Workspace</button>`;
            breadcrumbHtml += `<span class="fw-bold text-success font-monospace">/uploads/${currentStudentId}/</span>`;
        } else {
            breadcrumbHtml += `<span class="fw-bold text-dark breadcrumb-link font-monospace" data-path="" style="cursor:pointer;">/uploads/${currentStudentId}/</span>`;
        }

        let accumulatedPath = '';
        const pathParts = currentFolderPath.split('/').filter(p => p !== '');
        pathParts.forEach(part => {
            accumulatedPath += part + '/';
            breadcrumbHtml += `<span class="fw-bold text-primary breadcrumb-link font-monospace" data-path="${accumulatedPath}" style="cursor:pointer; text-decoration:underline; margin-left:4px;">${part}/</span>`;
        });

        breadcrumbEl.innerHTML = (currentStudentId === myOwnStudentId ? `<span class="font-monospace text-dark fw-bold">Location:</span> ` : '') + breadcrumbHtml;
    }

    let html = '';

    if (currentFolderPath !== '') {
        html += `
            <tr class="folder-row bg-secondary bg-opacity-10" style="cursor: pointer;" onclick="window.goBackFolder()">
                <td></td><td colspan="4" class="fw-bold py-3 text-primary font-monospace"><i class="fas fa-level-up-alt me-2"></i> .. (Back to parent folder)</td>
            </tr>`;
    }

    Array.from(subfolders).sort().forEach(folder => {
        const folderUrl = `https://digitalartsclasses.com/uploads/${currentStudentId}/${currentFolderPath}${folder}/`;
        html += `
            <tr class="align-middle folder-row">
                <td><input type="checkbox" class="file-checkbox" data-type="folder" data-folder="${currentFolderPath}${folder}/" style="cursor: pointer;"></td>
                <td class="fw-bold text-primary" style="cursor:pointer;" onclick="window.openFolder('${currentFolderPath}${folder}/')"><i class="fas fa-folder text-warning me-2"></i> ${folder}</td>
                <td class="text-muted small font-monospace">Folder</td>
                <td class="text-muted small">--</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-success me-1 share-folder-btn" data-url="${folderUrl}" data-name="${folder}" title="Share Folder"><i class="fas fa-share"></i></button>
                    <button class="btn btn-sm btn-info text-white move-folder-btn me-1" data-folder="${currentFolderPath}${folder}/" title="Move Folder">🔀</button>
                    <button class="btn btn-sm btn-outline-danger delete-folder-btn" data-folder="${currentFolderPath}${folder}/" title="Delete Folder"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });

    currentFiles.sort((a, b) => b.time - a.time).forEach(f => {
        const isIndex = f.displayName.toLowerCase() === 'index.html';
        const isEditable = ['.html', '.css', '.js', '.txt', '.json', '.xml', '.svg'].some(ext => f.displayName.toLowerCase().endsWith(ext));

        let icon = '<i class="fas fa-file-code text-secondary me-2"></i>';
        if (f.displayName.endsWith('.png') || f.displayName.endsWith('.jpg') || f.displayName.endsWith('.gif')) icon = '<i class="fas fa-file-image text-warning me-2"></i>';
        else if (f.displayName.endsWith('.css')) icon = '<i class="fab fa-css3-alt text-info me-2"></i>';
        else if (f.displayName.endsWith('.js')) icon = '<i class="fab fa-js-square text-warning me-2"></i>';

        html += `
            <tr class="align-middle">
                <td><input type="checkbox" class="file-checkbox" data-type="file" data-path="${f.path}" data-server-path="${f.serverPath}" style="cursor: pointer;"></td>
                <td class="font-monospace fw-medium text-info">${icon} ${f.displayName} ${isIndex ? '<span class="badge bg-success ms-2">Live Site</span>' : ''}</td>
                <td class="text-muted small font-monospace">${(f.size / 1024).toFixed(1)} KB</td>
                <td class="text-muted small">${new Date(f.time * 1000).toLocaleDateString()}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-success me-1 share-file-btn" data-url="${f.url}" data-name="${f.displayName}" title="Share File"><i class="fas fa-share"></i></button>
                    ${isEditable ? `<button class="btn btn-sm btn-outline-dark me-1 edit-file-btn" data-url="${f.url}" data-name="${f.displayName}" data-path="${f.path}" title="Edit Code"><i class="fas fa-edit"></i></button>` : ''}
                    ${isIndex ? `<a href="${f.url}" target="_blank" class="btn btn-sm btn-primary me-1" title="Launch Site"><i class="fas fa-rocket"></i></a>` : `<a href="${f.url}" target="_blank" class="btn btn-sm btn-outline-primary me-1" title="View File"><i class="fas fa-eye"></i></a>`}
                    <button class="btn btn-sm btn-info text-white move-file-btn me-1" data-path="${f.path}" title="Move File">🔀</button>
                    <button class="btn btn-sm btn-outline-danger delete-file-btn" data-server-path="${f.serverPath}" title="Delete File"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });

    tbody.innerHTML = html || '<tr><td colspan="5" class="text-center p-5 text-muted fw-bold"><i class="fas fa-folder-open fa-2x mb-3 opacity-25 d-block"></i>Folder is empty.</td></tr>';

    const countBadge = document.getElementById('fileCountBadge');
    if (countBadge) countBadge.innerText = `${allFilesData.filter(f => !f.name.endsWith('.keep')).length} Files Total`;

    const selectAll = document.getElementById('selectAllFiles');
    if (selectAll) selectAll.checked = false;
    updateBulkToolbar();

    attachFileListeners(currentStudentId);
}

function attachFileListeners(studentId) {
    document.querySelectorAll('.breadcrumb-link').forEach(link => {
        link.addEventListener('click', (e) => {
            currentFolderPath = e.target.getAttribute('data-path');
            renderFileTable();
        });
    });

    const selectAllCheckbox = document.getElementById('selectAllFiles');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = e.target.checked);
            updateBulkToolbar();
        });
    }

    document.querySelectorAll('.file-checkbox').forEach(cb => cb.addEventListener('change', updateBulkToolbar));

    document.querySelectorAll('.delete-file-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            if (confirm("Delete this file permanently?")) deleteHostGatorItem(btn.dataset.serverPath, studentId);
        };
    });

    document.querySelectorAll('.delete-folder-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            if (confirm("Delete this folder and ALL content?")) deleteHostGatorItem(`uploads/${studentId}/${btn.dataset.folder}`, studentId);
        };
    });

    document.querySelectorAll('.move-file-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            const oldPath = btn.dataset.path;
            const fileName = oldPath.split('/').pop();
            const targetDir = await askForMoveDestination(`Move "${fileName}" to a different folder:`);
            if (targetDir !== null) {
                let cleanDir = targetDir.trim().replace(/^\/+|\/+$/g, '');
                let newPath = (cleanDir === '') ? fileName : cleanDir + '/' + fileName;
                if (newPath !== oldPath) { btn.innerHTML = '⏳'; await moveHostGatorItem(oldPath, newPath, studentId); }
            }
        };
    });

    document.querySelectorAll('.move-folder-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            const oldPath = btn.dataset.folder.replace(/\/$/, "");
            const folderName = oldPath.split('/').filter(p => p !== '').pop();
            const targetDir = await askForMoveDestination(`Move entire folder "${folderName}" to:`);
            if (targetDir !== null) {
                let cleanDir = targetDir.trim().replace(/^\/+|\/+$/g, '');
                let newPath = (cleanDir === '') ? folderName : cleanDir + '/' + folderName;
                if (newPath !== oldPath) { btn.innerHTML = '⏳'; await moveHostGatorItem(oldPath, newPath, studentId); }
            }
        };
    });

    document.querySelectorAll('.share-file-btn').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); askForShareDestination(btn.dataset.name, btn.dataset.url, false); };
    });

    document.querySelectorAll('.share-folder-btn').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); askForShareDestination(btn.dataset.name, btn.dataset.url, true); };
    });

    document.querySelectorAll('.edit-file-btn').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); openFileEditor(btn.dataset.path, btn.dataset.url, btn.dataset.name); };
    });
}

function updateBulkToolbar() {
    const checked = document.querySelectorAll('.file-checkbox:checked');
    const toolbar = document.getElementById('bulk-actions-toolbar');
    const countSpan = document.getElementById('selected-file-count');

    if (toolbar && countSpan) {
        countSpan.innerText = checked.length;
        if (checked.length > 0) {
            toolbar.classList.remove('d-none');
            attachBulkActionListeners();
        } else {
            toolbar.classList.add('d-none');
        }
    }
}

function attachBulkActionListeners() {
    const shareBtn = document.getElementById('btn-bulk-share');
    const moveBtn = document.getElementById('btn-bulk-move');
    const deleteBtn = document.getElementById('btn-bulk-delete');
    if (shareBtn) shareBtn.onclick = () => handleBulkShare();
    if (moveBtn) moveBtn.onclick = () => handleBulkMove();
    if (deleteBtn) deleteBtn.onclick = () => handleBulkDelete();
}

async function handleBulkShare() {
    const checked = document.querySelectorAll('.file-checkbox:checked');
    if (checked.length === 0) return;

    const targetStudentId = prompt("Enter the Student ID to share with (e.g., 8011569):");
    if (!targetStudentId || !targetStudentId.trim()) return;

    const senderName = myOwnStudentData
        ? `${myOwnStudentData.first_name} ${myOwnStudentData.last_name}`
        : 'A classmate';

    let successCount = 0;

    for (let checkbox of checked) {
        const itemType = checkbox.dataset.type;
        const isFolder = itemType === 'folder';
        const itemPath = isFolder ? checkbox.dataset.folder : checkbox.dataset.path;
        const itemName = itemPath.split('/').filter(p => p).pop();
        const itemUrl = `https://digitalartsclasses.com/uploads/${currentStudentId}/${itemPath}`;

        if (isFolder) {
            // Share the folder itself
            try {
                await shareItem(targetStudentId.trim(), senderName, itemName, itemUrl, true);
                successCount++;

                // Share all files inside the folder
                const itemsInFolder = allFilesData.filter(f => f.path.startsWith(itemPath));
                for (let file of itemsInFolder) {
                    const fileUrl = `https://digitalartsclasses.com/uploads/${currentStudentId}/${file.path}`;
                    const fileName = file.path.split('/').pop();
                    await shareItem(targetStudentId.trim(), senderName, fileName, fileUrl, false);
                }
            } catch (e) {
                console.error("Share error for folder:", e);
            }
        } else {
            try {
                await shareItem(targetStudentId.trim(), senderName, itemName, itemUrl, false);
                successCount++;
            } catch (e) {
                console.error("Share error for file:", e);
            }
        }
    }

    alert(`Success! Shared ${successCount} item(s) with Student ID ${targetStudentId}.`);
    document.getElementById('selectAllFiles').checked = false;
    document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = false);
    updateBulkToolbar();
}

async function handleBulkMove() {
    const checked = document.querySelectorAll('.file-checkbox:checked');
    if (checked.length === 0) return;

    const items = Array.from(checked).map(cb => ({
        type: cb.dataset.type,
        path: cb.dataset.type === 'folder' ? cb.dataset.folder : cb.dataset.path
    }));

    const targetDir = await askForMoveDestination(`Move ${items.length} item(s) to:`);
    if (targetDir === null) return;

    let successCount = 0;
    let cleanDir = targetDir.trim().replace(/^\/+|\/+$/g, '');

    for (let item of items) {
        const itemName = item.path.split('/').filter(p => p).pop();
        const newPath = (cleanDir === '') ? itemName : cleanDir + '/' + itemName;
        if (newPath !== item.path) {
            try {
                await moveHostGatorItem(item.path, newPath, currentStudentId);
                successCount++;
            } catch (err) {
                console.error("Move error for " + item.path, err);
            }
        }
    }

    alert(`Moved ${successCount} item(s).`);
    document.getElementById('selectAllFiles').checked = false;
    document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = false);
    updateBulkToolbar();
    fetchFiles();
}

async function handleBulkDelete() {
    const checked = document.querySelectorAll('.file-checkbox:checked');
    if (checked.length === 0) return;
    if (!confirm(`Delete ${checked.length} item(s) permanently? This cannot be undone.`)) return;

    let successCount = 0;
    for (let checkbox of checked) {
        const itemType = checkbox.dataset.type;
        const isFolder = itemType === 'folder';
        const itemPath = isFolder ? checkbox.dataset.folder : checkbox.dataset.path;
        const serverPath = isFolder ? `uploads/${currentStudentId}/${itemPath}` : checkbox.dataset.serverPath;
        try {
            await deleteHostGatorItem(serverPath, currentStudentId);
            successCount++;
        } catch (err) {
            console.error("Delete error for " + itemPath, err);
        }
    }

    alert(`Deleted ${successCount} item(s).`);
    document.getElementById('selectAllFiles').checked = false;
    document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = false);
    updateBulkToolbar();
    fetchFiles();
}

// ==========================================
// IN-BROWSER CODE EDITOR
// ==========================================
function setupEditorModal() {
    if (document.getElementById('editorModal')) return;
    const modalHtml = `
      <div class="modal fade" id="editorModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered modal-xl">
          <div class="modal-content shadow-lg border-dark" style="border-width: 3px;">
            <div class="modal-header py-2 bg-dark text-white">
              <h5 class="modal-title fw-bold mb-0 font-monospace text-warning"><i class="fas fa-code me-2"></i> Code Editor</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light p-3">
              <div class="input-group mb-3 shadow-sm">
                <span class="input-group-text bg-white fw-bold text-primary border-primary"><i class="fas fa-file-signature me-2"></i>File Name:</span>
                <input type="text" id="editorFileName" class="form-control font-monospace fw-bold text-dark border-primary" style="font-size: 1.1rem;">
                <input type="hidden" id="editorOriginalPath">
              </div>
              <textarea id="editorTextarea" class="form-control font-monospace text-light p-3 shadow-inner" style="background-color: #1e1e1e; height: 50vh; min-height: 400px; tab-size: 4; font-size: 1rem; border: 2px solid #6c757d;" spellcheck="false"></textarea>
            </div>
            <div class="modal-footer py-2 bg-white d-flex justify-content-between border-top">
              <button type="button" class="btn btn-outline-secondary fw-bold px-4" data-bs-dismiss="modal"><i class="fas fa-times me-2"></i> Cancel</button>
              <div>
                <button type="button" id="btn-save-as-file" class="btn btn-warning text-dark fw-bold px-4 shadow-sm me-2"><i class="fas fa-copy me-2"></i> Save As New</button>
                <button type="button" id="btn-save-file" class="btn btn-success text-white fw-bold px-4 shadow-sm"><i class="fas fa-save me-2"></i> Save File</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const textarea = document.getElementById('editorTextarea');
    textarea.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
        }
    });
}

async function openFileEditor(filePath, fileUrl, fileName) {
    const modalEl = document.getElementById('editorModal');
    let modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);

    document.getElementById('editorFileName').value = fileName;
    document.getElementById('editorOriginalPath').value = filePath || '';
    const textarea = document.getElementById('editorTextarea');

    textarea.value = "Fetching live code from server...";
    textarea.disabled = true;
    modal.show();

    try {
        const response = await fetch(fileUrl + '?t=' + new Date().getTime());
        if (!response.ok) throw new Error("Could not download file content.");
        textarea.value = await response.text();
    } catch (e) {
        textarea.value = "/* Error loading file: " + e.message + " */";
    } finally {
        textarea.disabled = false;
    }

    const saveBtn = document.getElementById('btn-save-file');
    const saveAsBtn = document.getElementById('btn-save-as-file');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    const newSaveAsBtn = saveAsBtn.cloneNode(true);
    saveAsBtn.parentNode.replaceChild(newSaveAsBtn, saveAsBtn);
    newSaveBtn.addEventListener('click', () => saveEditedContent(modal, false));
    newSaveAsBtn.addEventListener('click', () => saveEditedContent(modal, true));
}

async function saveEditedContent(modalInstance, isSaveAs) {
    const textarea = document.getElementById('editorTextarea');
    const newFileName = document.getElementById('editorFileName').value.trim().replace(/[^a-zA-Z0-9_.-]/g, '-');
    const originalPath = document.getElementById('editorOriginalPath').value;
    const content = textarea.value;

    if (!newFileName) { alert("File name cannot be empty."); return; }

    let folderPath = '';
    if (originalPath) {
        folderPath = originalPath.substring(0, originalPath.lastIndexOf('/') + 1);
    } else {
        folderPath = currentFolderPath;
    }

    const targetPath = folderPath + newFileName;

    if (isSaveAs && targetPath === originalPath && originalPath !== '') {
        alert("To 'Save As New', you must change the file name.");
        return;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const fileObj = new File([blob], newFileName);
    const btnId = isSaveAs ? 'btn-save-as-file' : 'btn-save-file';
    const btn = document.getElementById(btnId);
    const originalBtnText = btn.innerHTML;

    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Uploading...';
    btn.disabled = true;

    try {
        await uploadSingleFile(fileObj, targetPath, currentStudentId);
        modalInstance.hide();
        fetchFiles();
    } catch (e) {
        alert("Error saving file: " + e);
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    }
}

// ==========================================
// PEER-TO-PEER FILE SHARING (MariaDB API)
// ==========================================
async function shareItem(recipientStudentId, senderName, fileName, url, isFolder) {
    const res = await fetch('/api/student/share-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_student_id: recipientStudentId, sender_name: senderName, file_name: fileName, url, is_folder: isFolder })
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Share failed');
    }
}

function setupShareModal() {
    if (document.getElementById('shareFileModal')) return;
    const modalHtml = `
      <div class="modal fade" id="shareFileModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content shadow border-success">
            <div class="modal-header py-2 bg-success text-white">
              <h6 class="modal-title fw-bold mb-0 font-monospace"><i class="fas fa-share-alt me-1"></i> Share with Classmate</h6>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light">
              <p id="shareModalMsg" class="small mb-3 text-muted fw-bold"></p>
              <label class="form-label small fw-bold mb-1 text-primary">Recipient's Student ID:</label>
              <div class="input-group input-group-sm mb-2 shadow-sm">
                <span class="input-group-text bg-white fw-bold text-primary"><i class="fas fa-id-card"></i></span>
                <input type="text" id="shareStudentIdInput" class="form-control fw-bold font-monospace" placeholder="e.g. 8011569">
              </div>
              <div id="shareErrorMsg" class="text-danger x-small fw-bold d-none mt-2"></div>
            </div>
            <div class="modal-footer py-2 bg-white">
              <button type="button" class="btn btn-outline-secondary btn-sm fw-bold px-3" data-bs-dismiss="modal">Cancel</button>
              <button type="button" id="btn-confirm-share" class="btn btn-success text-white btn-sm fw-bold px-4 shadow-sm">Send Link</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function askForShareDestination(itemName, itemUrl, isFolder = false) {
    document.getElementById('shareModalMsg').innerHTML = `Sending <strong class="text-dark font-monospace">${isFolder ? 'Folder' : 'File'}: ${itemName}</strong>`;
    document.getElementById('shareStudentIdInput').value = '';
    document.getElementById('shareErrorMsg').classList.add('d-none');

    const modalEl = document.getElementById('shareFileModal');
    let modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();

    const confirmBtn = document.getElementById('btn-confirm-share');
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

    newBtn.addEventListener('click', async () => {
        const targetStudentId = document.getElementById('shareStudentIdInput').value.trim();
        const errorMsg = document.getElementById('shareErrorMsg');

        if (!targetStudentId) {
            errorMsg.innerText = "Please enter a valid Student ID number.";
            errorMsg.classList.remove('d-none');
            return;
        }

        newBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        newBtn.disabled = true;
        errorMsg.classList.add('d-none');

        const senderName = myOwnStudentData
            ? `${myOwnStudentData.first_name} ${myOwnStudentData.last_name}`
            : 'A classmate';

        try {
            await shareItem(targetStudentId, senderName, itemName, itemUrl, isFolder);
            modal.hide();
            alert(`Success! Link to ${itemName} has been sent to ID ${targetStudentId}.`);
        } catch (e) {
            console.error("Sharing error:", e);
            errorMsg.innerText = e.message === 'Recipient student ID not found on roster'
                ? "Student ID not found. Check the number and try again."
                : "Failed to send due to a network error.";
            errorMsg.classList.remove('d-none');
        } finally {
            newBtn.innerHTML = 'Send Link';
            newBtn.disabled = false;
        }
    });
}

// ==========================================
// SHARED FILES INBOX (MariaDB API — replaces onSnapshot)
// ==========================================
async function loadSharedFiles() {
    if (!myOwnStudentId) return;
    const tbody = document.getElementById('sharedListBody');
    if (!tbody) return;

    try {
        const res = await fetch(`/api/student/shared-files?student_id=${encodeURIComponent(myOwnStudentId)}`);
        const data = await res.json();
        const files = data.files || [];

        if (files.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-muted fw-bold"><i class="fas fa-inbox fa-2x mb-3 opacity-25 d-block"></i>No shared files yet.</td></tr>';
            return;
        }

        let html = '';
        files.forEach(d => {
            const icon = d.is_folder ? '<i class="fas fa-folder text-warning me-2"></i>' : '<i class="fas fa-link text-secondary me-2"></i>';
            const isEditable = !d.is_folder && ['.html', '.css', '.js', '.txt', '.json', '.xml', '.svg'].some(ext => (d.file_name || '').toLowerCase().endsWith(ext));
            const dateStr = new Date(d.created_at).toLocaleDateString();

            html += `
                <tr class="align-middle">
                    <td class="font-monospace fw-bold text-info">${icon}${d.file_name}</td>
                    <td class="fw-medium">${d.sender_name}</td>
                    <td class="small text-muted font-monospace">${dateStr}</td>
                    <td class="text-end">
                        ${isEditable ? `<button class="btn btn-sm btn-outline-dark me-1" onclick="window.openSharedFileEditor('${d.url}', '${d.file_name}')" title="Edit & Save to My Workspace"><i class="fas fa-edit"></i> Edit</button>` : ''}
                        ${d.is_folder
                            ? `<button class="btn btn-sm btn-success me-1 fw-bold shadow-sm" onclick="window.openSharedFolder('${d.url}')" title="Open Folder in Workspace"><i class="fas fa-folder-open"></i> Open</button>`
                            : `<a href="${d.url}" target="_blank" class="btn btn-sm btn-primary me-1 fw-bold shadow-sm"><i class="fas fa-external-link-alt"></i> View</a>`}
                        <button class="btn btn-sm btn-outline-danger" onclick="window.deleteSharedFile(${d.id})" title="Remove from list"><i class="fas fa-times"></i></button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (e) {
        console.error("Error loading shared files:", e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-danger">Failed to load shared files.</td></tr>';
    }
}

window.deleteSharedFile = async (id) => {
    if (!confirm("Remove this shared link from your inbox?")) return;
    try {
        await fetch(`/api/student/shared-file/${id}?student_id=${encodeURIComponent(myOwnStudentId)}`, { method: 'DELETE' });
        loadSharedFiles(); // Refresh inbox
    } catch (e) {
        console.error("Failed to remove shared file:", e);
    }
};

// ==========================================
// HOSTGATOR SERVER ACTIONS
// ==========================================
async function moveHostGatorItem(oldPath, newPath, studentId) {
    try {
        const moveData = new FormData();
        moveData.append("action", "move");
        moveData.append("studentId", studentId);
        moveData.append("oldPath", oldPath);
        moveData.append("newPath", newPath);
        const res = await fetch(HOSTGATOR_MANAGE_URL, { method: "POST", body: moveData });
        const result = await res.json();
        if (result.success) fetchFiles();
        else throw new Error(result.message || "Failed to move");
    } catch (err) {
        alert("Error moving file/folder: " + err.message);
        fetchFiles();
    }
}

async function deleteHostGatorItem(path, studentId) {
    try {
        const formData = new FormData();
        formData.append("action", "delete");
        formData.append("studentId", studentId);
        formData.append("path", path);
        await fetch(HOSTGATOR_MANAGE_URL, { method: "POST", body: formData });
        fetchFiles();
    } catch (e) {
        console.error("Delete failed", e);
    }
}

function createVirtualFolder(studentId) {
    const name = prompt("New folder name:");
    if (!name) return;
    const clean = name.trim().replace(/[^a-z0-9_-]/gi, '-');
    const dummy = new File(["keep"], ".keep", { type: "text/plain" });
    const formData = new FormData();
    formData.append("studentId", studentId);
    formData.append("assignment", "Workspace");
    formData.append("file", dummy);
    formData.append("path", currentFolderPath + clean + "/.keep");
    fetch(HOSTGATOR_UPLOAD_URL, { method: "POST", body: formData }).then(() => fetchFiles());
}

// ==========================================
// MOVE MODAL
// ==========================================
function setupMoveModal() {
    if (document.getElementById('moveFolderModal')) return;
    const modalHtml = `
      <div class="modal fade" id="moveFolderModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content shadow border-info">
            <div class="modal-header py-2 bg-info text-white">
              <h6 class="modal-title fw-bold mb-0 font-monospace"><i class="fas fa-random me-1"></i> Move Item(s)</h6>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light">
              <p id="moveModalMsg" class="small mb-3 text-muted fw-bold"></p>
              <label class="form-label small fw-bold mb-1 text-primary font-monospace">Select Destination Folder:</label>
              <select id="moveModalSelect" class="form-select shadow-sm fw-bold border-info text-primary font-monospace">
                <option value="">📁 Main Root Folder (/)</option>
              </select>
            </div>
            <div class="modal-footer py-2 bg-white">
              <button type="button" class="btn btn-outline-secondary btn-sm fw-bold px-3" data-bs-dismiss="modal">Cancel</button>
              <button type="button" id="btn-confirm-move" class="btn btn-info text-white btn-sm fw-bold px-4 shadow-sm">Move Here</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function askForMoveDestination(message) {
    return new Promise((resolve) => {
        const select = document.getElementById('moveModalSelect');
        select.innerHTML = '<option value="">📁 Main Root Folder (/)</option>';

        const allFolders = new Set();
        allFilesData.forEach(f => {
            const parts = f.path.split('/'); parts.pop();
            let accumulatedPath = '';
            parts.forEach(p => { if (p) { accumulatedPath += p + '/'; allFolders.add(accumulatedPath); } });
        });

        Array.from(allFolders).sort().forEach(folder => {
            const opt = document.createElement('option');
            opt.value = folder; opt.innerText = `📁 ${folder}`;
            select.appendChild(opt);
        });

        document.getElementById('moveModalMsg').innerText = message;

        const modalEl = document.getElementById('moveFolderModal');
        let modal = null;
        if (typeof bootstrap !== 'undefined') {
            modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        }

        const confirmBtn = document.getElementById('btn-confirm-move');
        const cleanup = () => {
            confirmBtn.removeEventListener('click', onConfirm);
            modalEl.removeEventListener('hidden.bs.modal', onCancel);
        };

        const onConfirm = () => { if (document.activeElement) document.activeElement.blur(); cleanup(); modal.hide(); resolve(select.value); };
        const onCancel = () => { if (document.activeElement) document.activeElement.blur(); cleanup(); resolve(null); };

        confirmBtn.addEventListener('click', onConfirm);
        modalEl.addEventListener('hidden.bs.modal', onCancel);
    });
}

// ==========================================
// OVERWRITE MODAL
// ==========================================
function setupOverwriteModal() {
    if (document.getElementById('overwriteModal')) return;
    const modalHtml = `
      <div class="modal fade" id="overwriteModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
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
        const justFileName = fileName.includes('/') ? fileName.split('/').pop() : fileName;
        const safeName = justFileName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        document.getElementById('overwriteModalMsg').innerHTML = `The file <br><span class="fw-bold text-danger font-monospace border-bottom border-danger">${safeName}</span><br> already exists in this location.<br><br>What would you like to do?`;

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
            cleanup(); modal.hide(); resolve(action);
        };
        buttons.forEach(btn => btn.addEventListener('click', handleChoice));
    });
}

// ==========================================
// FILE UPLOAD UI
// ==========================================
function setupFileUI(studentId) {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => { dropZone.addEventListener(eventName, () => dropZone.style.backgroundColor = '#eef2f7', false); });
    ['dragleave', 'drop'].forEach(eventName => { dropZone.addEventListener(eventName, () => dropZone.style.backgroundColor = '#f8f9fa', false); });

    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault(); e.stopPropagation();
        dropZone.style.backgroundColor = '#f8f9fa';

        if (e.dataTransfer.items) {
            const files = [];
            const items = Array.from(e.dataTransfer.items);

            const readEntry = async (entry, path = '') => {
                if (entry.isFile) {
                    const file = await new Promise(resolve => entry.file(resolve));
                    file.customPath = path + file.name;
                    files.push(file);
                } else if (entry.isDirectory) {
                    const dirReader = entry.createReader();
                    const readAllEntries = async () => {
                        let allEntries = [];
                        let keepReading = true;
                        while (keepReading) {
                            const entries = await new Promise(resolve => dirReader.readEntries(resolve));
                            if (entries.length > 0) allEntries.push(...entries);
                            else keepReading = false;
                        }
                        return allEntries;
                    };
                    const entries = await readAllEntries();
                    for (let child of entries) { await readEntry(child, path + entry.name + '/'); }
                }
            };

            for (let item of items) {
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry();
                    if (entry) {
                        if (entry.isFile) {
                            const file = item.getAsFile();
                            if (file) { file.customPath = file.name; files.push(file); }
                        } else if (entry.isDirectory) {
                            await readEntry(entry);
                        }
                    }
                }
            }

            if (files.length > 0) handleUploadBatch(files, studentId);
        } else {
            handleUploadBatch(e.dataTransfer.files, studentId);
        }
    });

    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.onchange = function () { handleUploadBatch(this.files, studentId); };

    if (!document.getElementById('folderInput')) {
        const folderInput = document.createElement('input');
        folderInput.type = 'file'; folderInput.id = 'folderInput'; folderInput.className = 'd-none';
        folderInput.setAttribute('webkitdirectory', ''); folderInput.setAttribute('directory', ''); folderInput.setAttribute('multiple', '');
        folderInput.onchange = function () { handleUploadBatch(this.files, studentId); };
        fileInput.parentNode.insertBefore(folderInput, fileInput.nextSibling);
    }

    const newFolderBtn = document.getElementById('btn-new-folder');
    if (newFolderBtn) {
        newFolderBtn.onclick = (e) => { e.stopPropagation(); createVirtualFolder(studentId); };
    }
}

async function handleUploadBatch(files, studentId, isSilent = false) {
    if (files.length === 0) return;
    const progress = document.getElementById('uploadProgressContainer');
    const bar = document.getElementById('uploadProgressBar');
    const status = document.getElementById('uploadStatusText');

    if (!isSilent && progress) {
        progress.style.display = 'block'; bar.style.width = '0%';
        bar.classList.remove('bg-danger', 'bg-warning'); bar.classList.add('bg-success');
        if (status) status.classList.remove('d-none');
    }

    let successCount = 0, failCount = 0, skipCount = 0, overwriteAll = false, skipAll = false;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name === '.DS_Store' || file.name.startsWith('._') || file.name === 'Thumbs.db') continue;

        let relativePath = file.customPath || file.webkitRelativePath || file.name;
        let finalPath = currentFolderPath + relativePath;

        if (!isSilent) {
            if (allFilesData.some(f => f.path === finalPath)) {
                if (skipAll) { skipCount++; continue; }
                else if (!overwriteAll) {
                    const choice = await askForOverwrite(finalPath);
                    if (choice === 'skipAll') { skipAll = true; skipCount++; continue; }
                    else if (choice === 'skip') { skipCount++; continue; }
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
                        while (allFilesData.some(f => f.path === newPath)) {
                            copyCount++;
                            newPath = `${fPath}${base} (Copy ${copyCount})${ext}`;
                        }
                        finalPath = newPath;
                    }
                }
            }
        }

        if (!isSilent && status) status.innerText = `Uploading (${i + 1}/${files.length}): ${file.name}`;

        try {
            await uploadSingleFile(file, finalPath, studentId);
            successCount++;
            if (!isSilent && bar) bar.style.width = Math.round(((i + 1) / files.length) * 100) + '%';
        } catch (e) {
            console.error("Upload failed for " + file.name, e);
            failCount++;
        }
    }

    if (!isSilent && status) {
        if (failCount === 0 && skipCount === 0) status.innerText = `Upload Complete: ${successCount} items saved.`;
        else {
            status.innerText = `Complete: ${successCount} saved, ${skipCount} skipped, ${failCount} failed.`;
            if (failCount > 0) bar.classList.replace('bg-success', 'bg-warning');
        }
        setTimeout(() => {
            if (progress) progress.style.display = 'none';
            if (status) status.classList.add('d-none');
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.value = '';
            const folderInput = document.getElementById('folderInput');
            if (folderInput) folderInput.value = '';
            fetchFiles();
        }, 2000);
    } else {
        fetchFiles();
    }
}

function uploadSingleFile(file, path, studentId) {
    return new Promise(async (resolve, reject) => {
        const formData = new FormData();
        formData.append("studentId", studentId);
        formData.append("assignment", "Workspace");
        formData.append("file", file);
        formData.append("path", path);

        try {
            const response = await fetch(HOSTGATOR_UPLOAD_URL, { method: "POST", body: formData });
            if (!response.ok) { reject("Upload failed with status: " + response.status); return; }
            const result = await response.json();
            if (result.success) resolve();
            else reject("Server rejected upload.");
        } catch (e) {
            console.error("Upload error:", e);
            reject("Upload failed due to network error.");
        }
    });
}
