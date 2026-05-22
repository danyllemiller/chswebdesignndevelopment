/**
 * CHS Web Design - Admin Student Files Controller
 * -----------------------------------------------
 * Allows the teacher to select a student from the roster and view their HostGator files.
 * Default is Read-Only mode to prevent accidental data loss. 
 * Automatically unlocks Move/Delete features if the student has requested Teacher Help.
 * NEW: Integrated Rubric Auto-Grader engine!
 * NEW: Integrated Phase 3 - Student Self-Reflection & Peer Review display!
 */

(function() {
    const patch = function(original) {
        return function(selector) {
            if (typeof selector === 'string' && selector.includes(',')) {
                const cleaned = selector.split(',').map(s => s.trim()).filter(s => s.length > 0).join(', ');
                if (cleaned !== selector) selector = cleaned === '' ? 'nothing_to_select' : cleaned;
            }
            try { return original.call(this, selector); } 
            catch (e) { return document.createDocumentFragment().querySelectorAll('*'); }
        };
    };
    Document.prototype.querySelectorAll = patch(Document.prototype.querySelectorAll);
    Element.prototype.querySelectorAll = patch(Element.prototype.querySelectorAll);
})();

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, query, getDocs, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db, appId as customAppId } from "/js/firebase-init.js";

// HostGator Endpoints
const HOSTGATOR_MANAGE_URL = "https://digitalartsclasses.com/manage_files.php";

// Security Whitelist
const MASTER_WHITELIST = ['damiller'];

// Global State
let fullRoster = [];
let allFilesData = [];
let availableRubrics = []; 
let currentFolderPath = '';
let currentStudentId = null;
let currentStudentDocId = null;
let isEditMode = false; 

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("/login.html");
        return;
    }

    const username = user.email.split('@')[0];
    if (MASTER_WHITELIST.includes(username)) {
        setupMoveModal();
        await loadRoster();
        await loadRubrics();
        return;
    }

    const rosterRef = collection(db, 'artifacts', customAppId, 'public', 'data', 'roster');
    const q = query(rosterRef, where("username", "==", username));
    const snap = await getDocs(q);

    let isAuthorized = false;
    snap.forEach(doc => { if (doc.data().period === "Teacher") isAuthorized = true; });

    if (!isAuthorized) {
        alert("Security Alert: Teacher access required.");
        window.location.replace("/index.html");
        return;
    }

    setupMoveModal();
    await loadRoster();
    await loadRubrics(); 
});

async function loadRoster() {
    const studentSelect = document.getElementById('studentSelect');
    try {
        const querySnapshot = await getDocs(collection(db, 'artifacts', customAppId, 'public', 'data', 'roster'));
        fullRoster = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if(data.firstName && data.lastName && data.studentId) {
                fullRoster.push({ docId: doc.id, ...data });
            }
        });
        
        fullRoster.sort((a, b) => a.lastName.localeCompare(b.lastName));
        populateStudentDropdown("All");
        
        document.getElementById('periodFilter').addEventListener('change', (e) => {
            populateStudentDropdown(e.target.value);
        });

        studentSelect.addEventListener('change', async (e) => {
            currentStudentId = e.target.value;
            currentFolderPath = ''; 
            
            if (currentStudentId) {
                const selectedOpt = studentSelect.options[studentSelect.selectedIndex];
                currentStudentDocId = selectedOpt.getAttribute('data-doc-id');
                
                document.getElementById('workspaceContainer').classList.remove('d-none');
                
                if (currentStudentDocId) {
                    const docSnap = await getDoc(doc(db, 'artifacts', customAppId, 'public', 'data', 'roster', currentStudentDocId));
                    const data = docSnap.data();
                    isEditMode = data.helpRequested === true;
                    updateAdminStatusUI();
                }
                
                loadFiles(currentStudentId);
            } else {
                document.getElementById('workspaceContainer').classList.add('d-none');
            }
        });

    } catch (error) {
        console.error("Error loading roster:", error);
        studentSelect.innerHTML = '<option value="">Error loading roster</option>';
    }
}

function populateStudentDropdown(period) {
    const studentSelect = document.getElementById('studentSelect');
    studentSelect.innerHTML = '<option value="">-- Select a Student --</option>';
    
    const filteredRoster = period === "All" ? fullRoster : fullRoster.filter(s => s.period === period);
    
    filteredRoster.forEach(student => {
        const option = document.createElement('option');
        option.value = student.studentId;
        option.setAttribute('data-doc-id', student.docId);
        
        const helpFlag = student.helpRequested ? " 🚨 (HELP)" : "";
        option.textContent = `${student.lastName}, ${student.firstName} (${student.period}) - ${student.studentId}${helpFlag}`;
        
        studentSelect.appendChild(option);
    });
    
    studentSelect.disabled = false;
    currentStudentId = null;
    currentStudentDocId = null;
    currentFolderPath = '';
    document.getElementById('workspaceContainer').classList.add('d-none');
}

function updateAdminStatusUI() {
    const statusDiv = document.getElementById('adminControlStatus');
    if (isEditMode) {
        statusDiv.innerHTML = `
            <span class="text-danger fw-bold"><i class="fas fa-unlock-alt"></i> Unlocked: Help Requested</span>
            <button id="btn-resolve-help" class="btn btn-sm btn-success ms-3 shadow-sm fw-bold"><i class="fas fa-check-circle"></i> Mark Resolved</button>
        `;
        document.getElementById('btn-resolve-help').onclick = async () => {
            const btn = document.getElementById('btn-resolve-help');
            btn.innerHTML = '⏳...';
            btn.disabled = true;
            await setDoc(doc(db, 'artifacts', customAppId, 'public', 'data', 'roster', currentStudentDocId), { helpRequested: false }, { merge: true });
            isEditMode = false;
            updateAdminStatusUI();
            renderVirtualDirectory();
        };
    } else {
        statusDiv.innerHTML = `<span class="text-secondary fw-bold"><i class="fas fa-lock"></i> Locked: No Help Requested</span>`;
    }
}

// ==========================================
// AUTO-GRADER ENGINE
// ==========================================
async function loadRubrics() {
    try {
        const snap = await getDocs(collection(db, 'artifacts', customAppId, 'public', 'data', 'rubrics'));
        availableRubrics = [];
        snap.forEach(docSnap => availableRubrics.push({ id: docSnap.id, ...docSnap.data() }));
        availableRubrics.sort((a,b) => a.title.localeCompare(b.title));
        
        const rSelect = document.getElementById('rubricSelect');
        if (rSelect) {
            rSelect.innerHTML = '<option value="">-- Select Rubric --</option>' + 
                availableRubrics.map(r => `<option value="${r.id}">${r.title} (${r.maxPoints || 100} pts)</option>`).join('');
        }
    } catch (e) {
        console.error("Failed to load rubrics:", e);
    }
}

document.body.addEventListener('click', (e) => {
    if (e.target.closest('#btn-open-autograder')) {
        document.getElementById('scanResultsUI').classList.add('d-none');
        document.getElementById('scanningUI').classList.add('d-none');
        document.getElementById('rubricSelect').value = "";
        
        const modalEl = document.getElementById('autoGradeModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        }
    }
});

document.addEventListener('change', async (e) => {
    if (e.target.id === 'rubricSelect') {
        const rubricId = e.target.value;
        if (!rubricId) {
            document.getElementById('scanResultsUI').classList.add('d-none');
            return;
        }
        
        const rubric = availableRubrics.find(r => r.id === rubricId);
        document.getElementById('scanningUI').classList.remove('d-none');
        document.getElementById('scanResultsUI').classList.add('d-none');
        document.getElementById('scanStatusText').innerText = "Downloading folder contents...";
        
        const filesInFolder = allFilesData.filter(f => f.path.startsWith(currentFolderPath) && f.path.substring(currentFolderPath.length).indexOf('/') === -1 && f.name !== '.keep');
        
        let combinedHTML = "";
        let combinedCSS = "";
        
        document.getElementById('scanStatusText').innerText = "Parsing HTML and CSS files...";
        for (let f of filesInFolder) {
            const lowerName = f.name.toLowerCase();
            if (lowerName.endsWith('.html')) {
                try { const resp = await fetch(f.url); combinedHTML += await resp.text(); } catch(err){}
            } else if (lowerName.endsWith('.css')) {
                try { const resp = await fetch(f.url); combinedCSS += await resp.text(); } catch(err){}
            }
        }
        
        const parser = new DOMParser();
        const virtualDOM = parser.parseFromString(combinedHTML, "text/html");
        const cleanCSS = combinedCSS.replace(/\s+/g, ' ').toLowerCase(); 
        
        document.getElementById('scanStatusText').innerText = "Fetching student reflections...";
        const reflectionRef = doc(db, 'artifacts', customAppId, 'public', 'data', 'reflections', `${currentStudentId}_${rubricId}`);
        const reflectionSnap = await getDoc(reflectionRef);
        
        let reflectionHtml = '';
        if (reflectionSnap.exists()) {
            const rData = reflectionSnap.data();
            reflectionHtml = `
                <div class="bg-light p-3 rounded border border-info shadow-sm mb-4">
                    <h6 class="fw-bold text-info border-bottom pb-2"><i class="fas fa-user-edit me-2"></i> Student & Peer Reflection</h6>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <p class="small mb-1"><strong>Easiest/Hardest:</strong> ${rData.easiestHardest}</p>
                            <p class="small mb-1"><strong>Could be better:</strong> ${rData.couldBeBetter}</p>
                            <p class="small mb-1"><strong>If more time:</strong> ${rData.moreTime}</p>
                            <span class="badge bg-primary fs-6 mt-1">Self-Grade: ${rData.selfGrade} / 4.0</span>
                        </div>
                        <div class="col-md-6 border-start">
                            <p class="small mb-1 text-muted fst-italic">" ${rData.peerFeedback} "</p>
                            <p class="small mb-1 fw-bold text-success">- Reviewed by ${rData.peerName}</p>
                            <span class="badge bg-success fs-6 mt-1">Peer Grade: ${rData.peerGrade} / 4.0</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            reflectionHtml = `<div class="alert alert-secondary small fw-bold mb-4 shadow-sm"><i class="fas fa-clock me-2"></i> No reflection submitted by student.</div>`;
        }
        
        const resultsHtml = [];
        
        rubric.criteria.forEach((crit, index) => {
            let suggestedScore = 0;
            let aiMessage = "Manual review required.";
            let badgeColor = "bg-secondary";
            
            if (crit.autoRule && crit.autoRule.type !== 'none') {
                let matched = false;
                const ruleVal = crit.autoRule.value;
                
                if (crit.autoRule.type === 'html_tag') {
                    if (virtualDOM.querySelectorAll(ruleVal).length > 0) matched = true;
                } else if (crit.autoRule.type === 'css_prop') {
                    if (cleanCSS.includes(ruleVal.toLowerCase().replace(/\s+/g, ' '))) matched = true;
                } else if (crit.autoRule.type === 'file_ext') {
                    if (filesInFolder.some(f => f.name.toLowerCase().endsWith(ruleVal.toLowerCase()))) matched = true;
                }
                
                if (matched) {
                    suggestedScore = 3; 
                    aiMessage = `<i class="fas fa-check text-success"></i> Auto-Grader found: <code>${ruleVal}</code> (Suggested: 3.0 Mastery)`;
                    badgeColor = "bg-success";
                } else {
                    suggestedScore = 1; 
                    aiMessage = `<i class="fas fa-times text-danger"></i> Auto-Grader missing: <code>${ruleVal}</code> (Suggested: 1.0 Novice)`;
                    badgeColor = "bg-danger";
                }
            }
            
            const safeDesc = encodeURIComponent(JSON.stringify({ l4: crit.l4, l3: crit.l3, l2: crit.l2, l1: crit.l1 }));
            const initialDesc = suggestedScore === 3 ? crit.l3 : (suggestedScore === 1 ? crit.l1 : "Select a score to view rubric description.");
            
            resultsHtml.push(`
                <div class="bg-white p-3 rounded border shadow-sm criterion-eval-row">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="fw-bold mb-0 text-dark" style="max-width: 60%;">${crit.name} <span class="badge ${badgeColor} ms-2">${crit.autoRule && crit.autoRule.type !== 'none' ? 'Auto-Scanned' : 'Manual'}</span></h6>
                        
                        <div class="btn-group btn-group-sm shadow-sm" role="group">
                            <input type="radio" class="btn-check prof-radio" name="crit_${index}" id="c${index}_4" value="4" data-desc="${safeDesc}" ${suggestedScore === 4 ? 'checked' : ''}>
                            <label class="btn btn-outline-success fw-bold" for="c${index}_4">4.0</label>

                            <input type="radio" class="btn-check prof-radio" name="crit_${index}" id="c${index}_3" value="3" data-desc="${safeDesc}" ${suggestedScore === 3 ? 'checked' : ''}>
                            <label class="btn btn-outline-primary fw-bold" for="c${index}_3">3.0</label>

                            <input type="radio" class="btn-check prof-radio" name="crit_${index}" id="c${index}_2" value="2" data-desc="${safeDesc}" ${suggestedScore === 2 ? 'checked' : ''}>
                            <label class="btn btn-outline-warning text-dark fw-bold" for="c${index}_2">2.0</label>

                            <input type="radio" class="btn-check prof-radio" name="crit_${index}" id="c${index}_1" value="1" data-desc="${safeDesc}" ${suggestedScore === 1 ? 'checked' : ''}>
                            <label class="btn btn-outline-danger fw-bold" for="c${index}_1">1.0</label>

                            <input type="radio" class="btn-check prof-radio" name="crit_${index}" id="c${index}_0" value="0" data-desc="${safeDesc}" ${suggestedScore === 0 ? 'checked' : ''}>
                            <label class="btn btn-outline-secondary fw-bold" for="c${index}_0">0.0</label>
                        </div>
                    </div>
                    <div class="p-2 bg-light border rounded small text-muted crit-desc-box fst-italic">
                        ${initialDesc}
                    </div>
                    <p class="small mb-0 font-monospace mt-2">${aiMessage}</p>
                </div>
            `);
        });
        
        document.getElementById('criteriaList').innerHTML = reflectionHtml + resultsHtml.join('');
        document.getElementById('rubricMaxPtsHidden').value = rubric.maxPoints || 100;
        document.getElementById('maxScoreSpan').innerText = rubric.maxPoints || 100;
        
        const recalculateGrade = () => {
            const radios = document.querySelectorAll('.prof-radio:checked');
            if (radios.length === 0) return;

            let totalProf = 0;
            radios.forEach(r => totalProf += Number(r.value));
            const avgProf = totalProf / radios.length;

            document.getElementById('avgProficiencySpan').innerText = avgProf.toFixed(1);

            let percentage = 50;
            if (avgProf >= 3.0) percentage = 85 + ((avgProf - 3.0) * 15);      
            else if (avgProf >= 2.0) percentage = 75 + ((avgProf - 2.0) * 10); 
            else if (avgProf >= 1.0) percentage = 60 + ((avgProf - 1.0) * 15); 
            else percentage = 50 + ((avgProf - 0.0) * 10);                     

            document.getElementById('calculatedPercentSpan').innerText = Math.round(percentage) + '%';
            const maxPts = Number(document.getElementById('rubricMaxPtsHidden').value);
            document.getElementById('finalScoreInput').value = Math.round((percentage / 100) * maxPts);
        };

        document.querySelectorAll('.prof-radio').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const box = e.target.closest('.criterion-eval-row').querySelector('.crit-desc-box');
                const descData = JSON.parse(decodeURIComponent(e.target.getAttribute('data-desc')));
                const val = e.target.value;
                if(val == 4) box.innerText = descData.l4;
                else if(val == 3) box.innerText = descData.l3;
                else if(val == 2) box.innerText = descData.l2;
                else if(val == 1) box.innerText = descData.l1;
                else box.innerText = "No evidence of standard met.";
                recalculateGrade();
            });
        });
        
        recalculateGrade(); 

        document.getElementById('scanningUI').classList.add('d-none');
        document.getElementById('scanResultsUI').classList.remove('d-none');
    }
});

document.addEventListener('submit', async (e) => {
    if (e.target.id === 'autoGradeForm') {
        e.preventDefault();
        const btn = document.getElementById('saveGradeBtn');
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        btn.disabled = true;
        
        const rSelect = document.getElementById('rubricSelect');
        const rubric = availableRubrics.find(r => r.id === rSelect.value);
        const finalScore = Number(document.getElementById('finalScoreInput').value);
        const maxScore = rubric.maxPoints || 100;
        const finalAssignmentKey = `${rubric.title} [${maxScore} pts]`;
        
        try {
            const gradeRef = doc(db, 'artifacts', customAppId, 'public', 'data', 'grades', currentStudentId);
            await setDoc(gradeRef, { 
                [finalAssignmentKey]: { 
                    score: finalScore, 
                    max: maxScore, 
                    timestamp: new Date().toLocaleString(),
                    teacherOverride: true 
                },
                lastSubmitDate: new Date().toLocaleString()
            }, { merge: true });
            
            btn.innerHTML = '✅ Saved to Gradebook!';
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('autoGradeModal'));
                if(modal) modal.hide();
                btn.innerHTML = '<i class="fas fa-save me-2"></i> Save Official Grade';
                btn.disabled = false;
            }, 1500);
            
        } catch (err) {
            console.error(err);
            btn.innerHTML = '❌ Error Saving';
            btn.disabled = false;
        }
    }
});

// ==========================================
// FILE MANAGER LOGIC
// ==========================================
async function loadFiles(studentId) {
    const tbody = document.getElementById('fileListBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center p-5"><div class="spinner-border text-primary"></div></td></tr>`;

    try {
        const formData = new FormData();
        formData.append("action", "list");
        formData.append("studentId", studentId);

        const res = await fetch(HOSTGATOR_MANAGE_URL, { method: "POST", body: formData });
        const data = await res.json();

        if (!data.success) throw new Error("Failed to load files.");

        const prefix = `uploads/${studentId}/`;
        allFilesData = (data.files || []).map(f => {
            return {
                ...f,
                serverPath: f.path,
                path: f.path.startsWith(prefix) ? f.path.substring(prefix.length) : f.path
            };
        });

        renderVirtualDirectory();

    } catch (error) {
        console.error(error);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center p-5 text-danger fw-bold font-monospace">Error loading files for this student.</td></tr>`;
    }
}

function renderVirtualDirectory() {
    if (!currentStudentId) return;

    const tbody = document.getElementById('fileListBody');
    if (!tbody) return;

    const currentFiles = [];
    const subfolders = new Set();

    allFilesData.forEach(fileMeta => {
        if (fileMeta.path.startsWith(currentFolderPath)) {
            const relativePath = fileMeta.path.substring(currentFolderPath.length);
            const parts = relativePath.split('/');
            
            if (parts.length > 1) subfolders.add(parts[0]); 
            else if (parts[0] !== '.keep') currentFiles.push({ ...fileMeta, relativeName: parts[0] });
        }
    });

    const realFiles = allFilesData.filter(f => !f.name.endsWith('.keep'));
    const countBadge = document.getElementById('fileCountBadge');
    if (countBadge) countBadge.innerText = `${realFiles.length} Total Files`;

    // Reset Bulk Toolbar
    const selectAll = document.getElementById('selectAllFiles');
    if(selectAll) selectAll.checked = false;
    updateBulkToolbar();

    // Toggle Checkbox Column Header
    document.querySelectorAll('.admin-col').forEach(el => {
        if(isEditMode) el.classList.remove('d-none');
        else el.classList.add('d-none');
    });

    // Breadcrumbs
    const breadcrumbEl = document.getElementById('userSubtitle');
    if (breadcrumbEl) {
        let breadcrumbHtml = `<span class="fw-bold text-primary font-monospace breadcrumb-link" data-path="" style="cursor:pointer;"><i class="fas fa-home me-1"></i>Home</span>`;
        let accumulatedPath = '';
        const pathParts = currentFolderPath.split('/').filter(p => p !== '');
        
        pathParts.forEach(part => {
            accumulatedPath += part + '/';
            breadcrumbHtml += `<span class="text-muted mx-1">/</span><span class="fw-bold text-primary font-monospace breadcrumb-link" data-path="${accumulatedPath}" style="cursor:pointer; text-decoration:underline;">${part}</span>`;
        });
        breadcrumbEl.innerHTML = breadcrumbHtml;
    }

    // Build Table
    let html = '';

    if (currentFolderPath !== '') {
        const adminPadding = isEditMode ? '<td></td>' : '';
        html += `
            <tr class="folder-row bg-secondary text-primary" style="cursor: pointer;">
                ${adminPadding}
                <td colspan="4" class="fw-bold py-3 font-monospace">
                    <i class="fas fa-level-up-alt me-2"></i> .. (Back)
                </td>
            </tr>
        `;
    }

    const sortedFolders = Array.from(subfolders).sort();
    sortedFolders.forEach(folderName => {
        const checkboxHtml = isEditMode ? `<td class="admin-col" onclick="event.stopPropagation()"><input type="checkbox" class="file-checkbox" data-type="folder" data-folder="${currentFolderPath}${folderName}/" style="cursor: pointer;"></td>` : '';
        const actionsHtml = isEditMode ? `
            <button class="btn btn-sm btn-info text-white action-btn move-folder-btn shadow-sm fw-bold me-1" data-folder="${currentFolderPath}${folderName}/" title="Move Folder"><i class="fas fa-random"></i> Move</button>
            <button class="btn btn-sm btn-danger text-white action-btn delete-folder-btn shadow-sm" data-folder="${currentFolderPath}${folderName}/" title="Delete Folder"><i class="fas fa-trash"></i> Delete</button>
        ` : `<span class="text-muted small"><i class="fas fa-lock"></i> Locked</span>`;

        html += `
            <tr class="folder-row bg-light" data-folder="${currentFolderPath}${folderName}/" style="cursor: pointer;">
                ${checkboxHtml}
                <td class="fw-bold text-primary" style="font-size: 1.1rem;"><i class="fas fa-folder text-info me-2"></i> ${folderName}</td>
                <td class="text-muted small">Folder</td>
                <td class="text-muted small">--</td>
                <td class="text-end">${actionsHtml}</td>
            </tr>
        `;
    });

    currentFiles.sort((a, b) => b.time - a.time).forEach(fileMeta => {
        const sizeKB = (fileMeta.size / 1024).toFixed(1);
        const dateUploaded = new Date(fileMeta.time * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const name = fileMeta.relativeName || '';
        
        const checkboxHtml = isEditMode ? `<td class="admin-col" onclick="event.stopPropagation()"><input type="checkbox" class="file-checkbox" data-type="file" data-path="${fileMeta.path}" data-server-path="${fileMeta.serverPath}" style="cursor: pointer;"></td>` : '';
        
        let actionHtml = name.toLowerCase() === 'index.html' 
            ? `<a href="${fileMeta.url}" target="_blank" class="btn btn-sm btn-success text-white action-btn me-1 fw-bold shadow-sm"><i class="fas fa-rocket"></i> Launch</a>`
            : `<a href="${fileMeta.url}" target="_blank" class="btn btn-sm btn-primary action-btn me-1 shadow-sm"><i class="fas fa-eye"></i> View</a>`;

        if (isEditMode) {
            actionHtml += `<button class="btn btn-sm btn-info text-white action-btn move-btn shadow-sm fw-bold me-1" data-path="${fileMeta.path}" data-server-path="${fileMeta.serverPath}" title="Move File"><i class="fas fa-random"></i> Move</button>`;
            actionHtml += `<button class="btn btn-sm btn-danger text-white action-btn delete-btn shadow-sm" data-server-path="${fileMeta.serverPath}"><i class="fas fa-trash"></i> Delete</button>`;
        }

        let icon = '<i class="fas fa-file-code text-secondary me-2"></i>';
        if(name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.gif')) icon = '<i class="fas fa-file-image text-warning me-2"></i>';
        else if (name.endsWith('.css')) icon = '<i class="fab fa-css3-alt text-info me-2"></i>';

        html += `
            <tr>
                ${checkboxHtml}
                <td class="fw-medium font-monospace text-info">${icon} ${name}</td>
                <td class="text-muted small">${sizeKB} KB</td>
                <td class="text-muted small">${dateUploaded}</td>
                <td class="text-end">${actionHtml}</td>
            </tr>
        `;
    });

    if (html === '') {
        const colSpan = isEditMode ? 5 : 4;
        html = `<tr><td colspan="${colSpan}" class="text-center p-5 text-muted fw-bold">This folder is empty.</td></tr>`;
    }

    tbody.innerHTML = html;

    // Attach Checkbox Listeners
    document.querySelectorAll('.file-checkbox').forEach(cb => {
        cb.addEventListener('change', updateBulkToolbar);
    });
}

// ==========================================
// MASTER EVENT DELEGATION
// ==========================================
document.body.addEventListener('click', async (e) => {
    const target = e.target;
    
    if (target.closest('.move-btn') && isEditMode) {
        const btn = target.closest('.move-btn');
        e.preventDefault(); e.stopPropagation();
        const oldPath = btn.getAttribute('data-path').replace(/\/$/, "");
        const fileName = oldPath.split('/').pop();
        const targetDir = await askForMoveDestination(`Move "${fileName}" to:`);
        
        if (targetDir !== null) {
            let cleanDir = targetDir.trim().replace(/^\/+|\/+$/g, ''); 
            let newPath = (cleanDir === '') ? fileName : cleanDir + '/' + fileName;
            if (newPath !== oldPath) {
                btn.innerHTML = '⏳';
                await moveHostGatorFile(oldPath, newPath, currentStudentId);
            }
        }
    }
    
    else if (target.closest('.move-folder-btn') && isEditMode) {
        const btn = target.closest('.move-folder-btn');
        e.preventDefault(); e.stopPropagation();
        const oldPath = btn.getAttribute('data-folder').replace(/\/$/, "");
        const folderName = oldPath.split('/').filter(p => p !== '').pop();
        const targetDir = await askForMoveDestination(`Move entire folder "${folderName}" to:`);
        
        if (targetDir !== null) {
            let cleanDir = targetDir.trim().replace(/^\/+|\/+$/g, '');
            let newPath = (cleanDir === '') ? folderName : cleanDir + '/' + folderName;
            if (newPath !== oldPath) {
                btn.innerHTML = '⏳';
                await moveHostGatorFile(oldPath, newPath, currentStudentId);
            }
        }
    }
    
    else if (target.closest('.delete-btn') && isEditMode) {
        const btn = target.closest('.delete-btn');
        e.stopPropagation();
        if(confirm("Permanently delete this file for the student?")) {
            btn.innerHTML = '⏳';
            await deleteHostGatorFile(btn.getAttribute('data-server-path'), currentStudentId);
        }
    }

    else if (target.closest('.delete-folder-btn') && isEditMode) {
        const btn = target.closest('.delete-folder-btn');
        e.stopPropagation();
        if(confirm("WARNING: Delete this folder AND EVERYTHING inside it for the student?")) {
            btn.innerHTML = '⏳';
            await deleteHostGatorFile(`uploads/${currentStudentId}/${btn.getAttribute('data-folder')}`, currentStudentId);
        }
    }
    
    else if (target.closest('.breadcrumb-link')) {
        currentFolderPath = target.closest('.breadcrumb-link').getAttribute('data-path');
        renderVirtualDirectory();
    }

    else if (target.closest('.folder-row')) {
        const row = target.closest('.folder-row');
        if (target.closest('button') || target.closest('input')) return;
        if (row.hasAttribute('data-folder')) {
            currentFolderPath = row.getAttribute('data-folder');
        } else {
            const parts = currentFolderPath.split('/').filter(p => p !== '');
            parts.pop(); 
            currentFolderPath = parts.length > 0 ? parts.join('/') + '/' : '';
        }
        renderVirtualDirectory();
    }
});


// ==========================================
// BULK & MODAL ACTIONS
// ==========================================
document.addEventListener('click', async (e) => {
    // Bulk Move
    if (e.target.closest('#btn-bulk-move')) {
        const checked = document.querySelectorAll('.file-checkbox:checked');
        if (checked.length === 0) return;

        const targetDir = await askForMoveDestination(`Move ${checked.length} selected item(s) to:`);

        if (targetDir !== null) {
            let cleanDir = targetDir.trim().replace(/^\/+|\/+$/g, ''); 
            const moveBtn = document.getElementById('btn-bulk-move');
            moveBtn.innerHTML = '⏳ Moving...';
            moveBtn.disabled = true;

            const promises = Array.from(checked).map(cb => {
                const type = cb.getAttribute('data-type');
                let oldPath, newPath;

                if (type === 'file') {
                    oldPath = cb.getAttribute('data-path').replace(/\/$/, "");
                    const fileName = oldPath.split('/').pop();
                    newPath = (cleanDir === '') ? fileName : cleanDir + '/' + fileName;
                } else {
                    oldPath = cb.getAttribute('data-folder').replace(/\/$/, "");
                    const folderName = oldPath.split('/').filter(p => p !== '').pop();
                    newPath = (cleanDir === '') ? folderName : cleanDir + '/' + folderName;
                }

                if (newPath === oldPath) return Promise.resolve();

                const moveData = new FormData();
                moveData.append("action", "move");
                moveData.append("studentId", currentStudentId);
                moveData.append("oldPath", oldPath);
                moveData.append("newPath", newPath);
                return fetch(HOSTGATOR_MANAGE_URL, { method: "POST", body: moveData });
            });

            await Promise.all(promises);
            moveBtn.innerHTML = '<i class="fas fa-random"></i> Move Selected';
            moveBtn.disabled = false;
            document.getElementById('selectAllFiles').checked = false;
            updateBulkToolbar();
            loadFiles(currentStudentId);
        }
    }

    // Bulk Delete
    if (e.target.closest('#btn-bulk-delete')) {
        const checked = document.querySelectorAll('.file-checkbox:checked');
        if (checked.length === 0) return;

        if(confirm(`WARNING: Are you sure you want to permanently delete ${checked.length} selected item(s)?`)) {
            const delBtn = document.getElementById('btn-bulk-delete');
            delBtn.innerHTML = '⏳ Deleting...';
            delBtn.disabled = true;

            const promises = Array.from(checked).map(cb => {
                const type = cb.getAttribute('data-type');
                const delData = new FormData();
                delData.append("action", "delete");
                delData.append("studentId", currentStudentId);
                
                if (type === 'file') delData.append("path", cb.getAttribute('data-server-path'));
                else delData.append("path", `uploads/${currentStudentId}/${cb.getAttribute('data-folder')}`);
                
                return fetch(HOSTGATOR_MANAGE_URL, { method: "POST", body: delData });
            });

            await Promise.all(promises);
            delBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Selected';
            delBtn.disabled = false;
            document.getElementById('selectAllFiles').checked = false;
            updateBulkToolbar();
            loadFiles(currentStudentId);
        }
    }

    // Select All
    if (e.target.id === 'selectAllFiles') {
        document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = e.target.checked);
        updateBulkToolbar();
    }
});


function updateBulkToolbar() {
    const checked = document.querySelectorAll('.file-checkbox:checked');
    const toolbar = document.getElementById('bulk-actions-toolbar');
    const countSpan = document.getElementById('selected-file-count');
    
    if (toolbar && countSpan) {
        countSpan.innerText = checked.length;
        if (checked.length > 0 && isEditMode) {
            toolbar.classList.remove('d-none');
        } else {
            toolbar.classList.add('d-none');
            const selectAll = document.getElementById('selectAllFiles');
            if(selectAll) selectAll.checked = false;
        }
    }
}

async function moveHostGatorFile(oldPath, newPath, studentId) {
    try {
        const moveData = new FormData();
        moveData.append("action", "move");
        moveData.append("studentId", studentId);
        moveData.append("oldPath", oldPath);
        moveData.append("newPath", newPath);
        const res = await fetch(HOSTGATOR_MANAGE_URL, { method: "POST", body: moveData });
        const result = await res.json();
        if (result.success) loadFiles(studentId);
        else throw new Error(result.message || "Failed to move");
    } catch (err) {
        alert("Error moving file/folder: " + err.message);
        loadFiles(studentId);
    }
}

async function deleteHostGatorFile(path, studentId) {
    try {
        const delData = new FormData();
        delData.append("action", "delete");
        delData.append("studentId", studentId);
        delData.append("path", path);
        const res = await fetch(HOSTGATOR_MANAGE_URL, { method: "POST", body: delData });
        const result = await res.json();
        if (result.success) loadFiles(studentId);
        else throw new Error(result.message || "Failed to delete");
    } catch (err) {
        alert("Error deleting file or folder.");
        loadFiles(studentId);
    }
}

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
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function askForMoveDestination(message) {
    return new Promise((resolve) => {
        const select = document.getElementById('moveModalSelect');
        select.innerHTML = '<option value="">📁 Main Root Folder (/)</option>';

        const allFolders = new Set();
        allFilesData.forEach(f => {
            const parts = f.path.split('/');
            parts.pop(); 
            let accumulatedPath = '';
            parts.forEach(p => {
                if (p) { accumulatedPath += p + '/'; allFolders.add(accumulatedPath); }
            });
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

        const onConfirm = () => {
            if (document.activeElement) document.activeElement.blur(); 
            cleanup();
            if (modal) modal.hide();
            resolve(select.value);
        };

        const onCancel = () => {
            if (document.activeElement) document.activeElement.blur(); 
            cleanup();
            resolve(null);
        };

        confirmBtn.addEventListener('click', onConfirm);
        modalEl.addEventListener('hidden.bs.modal', onCancel);
    });
}