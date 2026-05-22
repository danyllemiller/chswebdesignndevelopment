/**
 * CHS Web Design - Admin Roster Controller
 * UPGRADED: Robust bulk move/delete feedback and error handling.
 */

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db, appId } from "../firebase-init.js";

const status = document.getElementById('statusMessage');

// Defensive check for modal initialization
let bsEditModal = null;
const modalEl = document.getElementById('editModal');
if (modalEl && typeof bootstrap !== 'undefined') {
    bsEditModal = new bootstrap.Modal(modalEl);
}

let currentRoster = [];
let filterPeriod = 'All';
let searchQuery = '';
let sortKey = 'period'; 
let sortDirection = 'asc'; 

const cleanId = (id) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
const toTitleCase = (str) => {
    if (!str) return '';
    return str.trim().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// --- SECURITY GUARD ---
const MASTER_WHITELIST = ['damiller'];

onAuthStateChanged(auth, async (user) => {
    if (!user || user.isAnonymous) {
        window.location.replace("/login.html?redirect=" + encodeURIComponent(window.location.pathname));
        return;
    }

    const username = user.email.split('@')[0];
    
    if (MASTER_WHITELIST.includes(username)) {
        console.log("🔓 Master Access Granted:", username);
        loadRoster();
        return;
    }

    const rosterRef = collection(db, 'artifacts', appId, 'public', 'data', 'roster');
    const q = query(rosterRef, where("username", "==", username));
    const snap = await getDocs(q);

    let isAuthorized = false;
    snap.forEach(doc => {
        if (doc.data().period === "Teacher") isAuthorized = true;
    });

    if (!isAuthorized) {
        alert("Security Alert: This area is restricted to Teacher accounts only.");
        window.location.replace("/index.html");
        return;
    }

    loadRoster();
});

async function loadRoster() {
    const tbody = document.getElementById('rosterTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> Fetching Database...</td></tr>';
    resetSelection();
    try {
        const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'roster'));
        currentRoster = [];
        snap.forEach(doc => currentRoster.push({ id: doc.id, ...doc.data() }));
        displayRoster();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Error fetching database.</td></tr>`;
    }
}

function displayRoster() {
    const tbody = document.getElementById('rosterTableBody');
    if (!tbody) return;
    
    let list = currentRoster.filter(s => {
        const matchesPeriod = filterPeriod === 'All' || s.period === filterPeriod;
        
        const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
        const sid = (s.studentId || "").toLowerCase();
        const username = (s.username || "").toLowerCase();
        const matchesSearch = searchQuery === '' || 
                             fullName.includes(searchQuery) || 
                             sid.includes(searchQuery) ||
                             username.includes(searchQuery);
        
        return matchesPeriod && matchesSearch;
    });

    list.sort((a, b) => {
        let valA = (a[sortKey] || "").toString().toLowerCase();
        let valB = (b[sortKey] || "").toString().toLowerCase();
        let cmp = valA.localeCompare(valB);
        if (cmp === 0) cmp = (a.lastName || "").localeCompare(b.lastName || "");
        return sortDirection === 'asc' ? cmp : -cmp;
    });

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No matching records found.</td></tr>';
    } else {
        tbody.innerHTML = list.map(s => `
            <tr class="clickable-row ${s.period === 'Teacher' ? 'row-teacher' : ''}">
                <td><input type="checkbox" class="student-checkbox" data-id="${s.id}"></td>
                <td class="open-mgr" data-id="${s.id}"><strong>${s.period || 'N/A'}</strong></td>
                <td class="open-mgr" data-id="${s.id}">${s.lastName}</td>
                <td class="open-mgr" data-id="${s.id}">${s.firstName}</td>
                <td class="open-mgr" data-id="${s.id}"><small class="${s.username && s.username !== 'Pending' ? 'text-dark fw-bold' : 'text-muted italic'}">${s.username || 'Pending'}</small></td>
                <td class="open-mgr code" data-id="${s.id}">${s.studentId}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary py-0 px-2 edit-btn" data-id="${s.id}">Edit</button>
                    <button class="btn btn-sm btn-outline-danger py-0 px-2 del-btn" data-id="${s.id}">X</button>
                </td>
            </tr>
        `).join('');
    }
    attachListeners();
}

function attachListeners() {
    document.querySelectorAll('.open-mgr, .edit-btn').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = el.dataset.id || el.closest('tr').querySelector('.student-checkbox').dataset.id;
            openManager(id);
        });
    });
    document.querySelectorAll('.del-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if(!confirm("Remove student from roster?")) return;
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'roster', btn.dataset.id));
                loadRoster();
            } catch(e) { status.innerHTML = `<span class="text-danger">${e.message}</span>`; }
        });
    });
    document.querySelectorAll('.student-checkbox').forEach(cb => cb.addEventListener('change', updateToolbar));
}

function openManager(docId) {
    const s = currentRoster.find(x => x.id === docId);
    if (!s || !bsEditModal) return;
    
    document.getElementById('editDocId').value = s.id;
    document.getElementById('editFname').value = s.firstName;
    document.getElementById('editLname').value = s.lastName;
    document.getElementById('editSid').value = s.studentId;
    document.getElementById('editPeriod').value = s.period || 'A1';
    document.getElementById('editUsername').value = s.username || 'Pending';
    
    bsEditModal.show();
}

document.getElementById('saveEditBtn').addEventListener('click', async () => {
    const id = document.getElementById('editDocId').value;
    const data = {
        firstName: toTitleCase(document.getElementById('editFname').value),
        lastName: toTitleCase(document.getElementById('editLname').value),
        studentId: document.getElementById('editSid').value.trim(),
        period: document.getElementById('editPeriod').value,
        username: document.getElementById('editUsername').value.trim().toLowerCase()
    };
    
    if(!data.firstName || !data.lastName || !data.studentId) return alert("First name, last name, and ID are required.");
    if(!data.username) data.username = "Pending";

    try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'roster', id), data);
        if(bsEditModal) bsEditModal.hide();
        loadRoster();
        status.innerHTML = `<span class="text-success">✅ Info updated for ${data.firstName}.</span>`;
    } catch(e) { alert(e.message); }
});

document.getElementById('resetStudentBtn').addEventListener('click', async () => {
    const firstName = toTitleCase(document.getElementById('editFname').value);
    if(!confirm(`This will wipe the current roster entry for ${firstName} and re-add them as a clean record. Continue?`)) return;
    
    const oldId = document.getElementById('editDocId').value;
    const data = {
        firstName: firstName,
        lastName: toTitleCase(document.getElementById('editLname').value),
        studentId: document.getElementById('editSid').value.trim(),
        period: document.getElementById('editPeriod').value,
        username: "Pending"
    };

    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'roster', oldId));
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'roster'), data);
        if(bsEditModal) bsEditModal.hide();
        status.innerHTML = `<span class="text-success">✅ Roster record for ${data.firstName} has been refreshed.</span>`;
        loadRoster();
    } catch (e) { alert(e.message); }
});

document.getElementById('periodFilter').addEventListener('change', (e) => { filterPeriod = e.target.value; displayRoster(); });
document.getElementById('rosterSearch').addEventListener('input', (e) => { searchQuery = e.target.value.toLowerCase().trim(); displayRoster(); });

const setSort = (key) => { 
    if(sortKey === key) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'; 
    else { sortKey = key; sortDirection='asc'; } 
    displayRoster(); 
    updateSortIcons();
};

function updateSortIcons() {
    ['sortPeriod', 'sortLastName', 'sortFirstName', 'sortUsername'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.remove('sort-asc', 'sort-desc');
    });
    const activeId = 'sort' + sortKey.charAt(0).toUpperCase() + sortKey.slice(1);
    const el = document.getElementById(activeId);
    if (el) el.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
}

document.getElementById('sortPeriod').onclick = () => setSort('period');
document.getElementById('sortLastName').onclick = () => setSort('lastName');
document.getElementById('sortFirstName').onclick = () => setSort('firstName');
document.getElementById('sortUsername').onclick = () => setSort('username');

function updateToolbar() {
    const checked = document.querySelectorAll('.student-checkbox:checked');
    const toolbar = document.getElementById('bulkActionsToolbar');
    const countSpan = document.getElementById('selectedCount');
    
    if (countSpan) countSpan.innerText = checked.length;
    if (toolbar) {
        if(checked.length > 0) toolbar.classList.remove('d-none'); 
        else toolbar.classList.add('d-none');
    }
}

function resetSelection() { 
    if (document.getElementById('selectAll')) document.getElementById('selectAll').checked = false; 
    const toolbar = document.getElementById('bulkActionsToolbar');
    if (toolbar) toolbar.classList.add('d-none'); 
}

document.getElementById('selectAll').onchange = (e) => { 
    document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = e.target.checked); 
    updateToolbar(); 
};

// --- BULK ACTION: DELETE ---
document.getElementById('bulkDeleteBtn').onclick = async () => {
    const ids = Array.from(document.querySelectorAll('.student-checkbox:checked')).map(cb => cb.dataset.id);
    if(ids.length === 0) return;
    if(!confirm(`Are you sure you want to permanently delete ${ids.length} selected entries?`)) return;
    
    status.innerHTML = `<span class="text-primary"><span class="spinner-border spinner-border-sm"></span> Deleting ${ids.length} students...</span>`;
    
    try {
        await Promise.all(ids.map(id => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'roster', id))));
        status.innerHTML = `<span class="text-success">✅ Purged ${ids.length} students from the database.</span>`;
        loadRoster();
    } catch(e) {
        status.innerHTML = `<span class="text-danger">❌ Error: ${e.message}</span>`;
    }
};

// --- BULK ACTION: MOVE (FIXED) ---
document.getElementById('bulkMoveBtn').onclick = async () => {
    const checkedBoxes = document.querySelectorAll('.student-checkbox:checked');
    const ids = Array.from(checkedBoxes).map(cb => cb.dataset.id);
    const destinationPeriod = document.getElementById('bulkPeriodMove').value;
    
    if(ids.length === 0) {
        alert("Please select students using the checkboxes first.");
        return;
    }
    
    if(!destinationPeriod) {
        alert("Please select a destination period from the 'Move to...' dropdown.");
        return;
    }

    status.innerHTML = `<span class="text-primary"><span class="spinner-border spinner-border-sm"></span> Moving ${ids.length} students to ${destinationPeriod}...</span>`;
    
    try {
        const movePromises = ids.map(id => 
            updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'roster', id), {
                period: destinationPeriod
            })
        );
        
        await Promise.all(movePromises);
        
        status.innerHTML = `<span class="text-success">✅ Successfully moved ${ids.length} students to ${destinationPeriod}.</span>`;
        
        // Refresh the roster data
        loadRoster();
        
        // If the teacher was filtering for the old period, students will disappear. 
        // We notify the teacher of this behavior.
        if (filterPeriod !== 'All' && filterPeriod !== destinationPeriod) {
            status.innerHTML += ` <span class="small text-muted">(Change your filter to ${destinationPeriod} to see them)</span>`;
        }
        
    } catch(e) {
        console.error("Bulk Move Error:", e);
        status.innerHTML = `<span class="text-danger">❌ Bulk Move failed: ${e.message}</span>`;
    }
};

document.getElementById('refreshRosterBtn').onclick = loadRoster;

document.getElementById('downloadRosterBtn').onclick = () => {
    let csv = "First Name,Last Name,Username,ID,Period\n";
    currentRoster.forEach(s => csv += `"${s.firstName}","${s.lastName}","${s.username || ''}","${s.studentId}","${s.period}"\n`);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = `Roster_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
};

document.getElementById('addSingleBtn').onclick = async () => {
    const data = {
        firstName: toTitleCase(document.getElementById('single-fname').value),
        lastName: toTitleCase(document.getElementById('single-lname').value),
        studentId: document.getElementById('single-sid').value.trim(),
        period: document.getElementById('single-period').value,
        username: "Pending"
    };
    if(!data.firstName || !data.lastName || !data.studentId || !data.period) return alert("Fill all fields.");
    
    status.innerHTML = `<span>Adding ${data.firstName}...</span>`;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'roster'), data);
    status.innerHTML = `<span class="text-success">✅ Added ${data.firstName}!</span>`;
    loadRoster();
};

// --- CSV BULK UPLOAD HANDLER ---
document.getElementById('uploadBtn').onclick = async () => {
    const fileInput = document.getElementById('csvFileInput');
    if (!fileInput.files[0]) return alert("Please select a CSV file first.");
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    status.innerHTML = `<span class="text-primary"><span class="spinner-border spinner-border-sm"></span> Processing CSV...</span>`;
    
    reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/);
        let count = 0;
        let skipped = 0;

        for (let line of lines) {
            if (!line.trim()) continue;
            const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
            if (parts.length < 4) continue;

            const [fname, lname, sid, period] = parts;
            
            if (fname.toLowerCase() === 'first name' || fname.toLowerCase() === 'name') continue;

            const isDup = currentRoster.some(s => cleanId(s.studentId) === cleanId(sid));
            if (isDup) { skipped++; continue; }

            const studentData = {
                firstName: toTitleCase(fname),
                lastName: toTitleCase(lname),
                studentId: sid,
                period: period,
                username: "Pending"
            };

            try {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'roster'), studentData);
                count++;
            } catch (err) {
                console.error("Error adding row:", err);
            }
        }
        
        status.innerHTML = `<span class="text-success">✅ Processed: ${count} added, ${skipped} skipped.</span>`;
        loadRoster();
        fileInput.value = "";
    };
    reader.readAsText(file);
};