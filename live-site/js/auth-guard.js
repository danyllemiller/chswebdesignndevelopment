// js/auth-guard.js
// Attach this script to the <head> of EVERY protected and public page.

// 1. THE SHIELD (Immediate)
const hideStyle = document.createElement('style');
hideStyle.id = 'auth-shield';
hideStyle.innerHTML = 'body { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
document.head.appendChild(hideStyle);

// --- ATOMIC BYPASS FOR EXAMS ---
// We check the path BEFORE we even wait for Firebase to load.
if (window.location.pathname.toLowerCase().includes('exams')) {
    const shield = document.getElementById('auth-shield');
    if (shield) shield.remove();
    console.log("🚨 EXAM BYPASS ACTIVE: Redirects disabled for this directory.");
    // We exit early so the bouncer logic below NEVER runs for exams.
}

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db, appId } from "./firebase-init.js";

const MASTER_WHITELIST = ['damiller'];

// CONSOLIDATED WHITELIST: Add any new public pages here
const PUBLIC_PAGES = [
    'index.html', 
    'contact.html', 
    'sitemap.html', 
    'notices.html', 
    'discipline.html', 
    'expectations.html', 
    'grading.html', 
    'login.html', 
    'forgot-password.html', 
    'level1.html', 
    'level2andup.html',
    'computerscience.html',
    'compscifinal.html'
];

onAuthStateChanged(auth, async (user) => {
    const currentPath = window.location.pathname.toLowerCase();

    // If we already handled the exam bypass above, just finish the event dispatch
    if (currentPath.includes('exams')) {
        window.dacAuthData = { isAuthenticated: !!user, isTeacher: false, isCSStudent: false };
        document.dispatchEvent(new Event('authComplete'));
        return; 
    }

    if (user && !user.isAnonymous) {
        const userEmail = user.email || "";
        const studentUsername = userEmail.split('@')[0].toLowerCase().trim();
        let studentData = null;
        let isTeacher = MASTER_WHITELIST.map(u => u.toLowerCase()).includes(studentUsername);
        let isCSStudent = false;

        // Teacher check
        if (isTeacher) {
            const shield = document.getElementById('auth-shield');
            if (shield) shield.remove();
            window.dacAuthData = { isAuthenticated: true, isTeacher: true, isCSStudent: false };
            document.dispatchEvent(new Event('authComplete'));
            return;
        }

        try {
            const rosterRef = collection(db, 'artifacts', appId, 'public', 'data', 'roster');
            const uidSnap = await getDocs(query(rosterRef, where("uid", "==", user.uid)));
            if (!uidSnap.empty) {
                studentData = uidSnap.docs[0].data();
            } else {
                const allDocs = await getDocs(rosterRef);
                for (const rDoc of allDocs.docs) {
                    if ((rDoc.data().username || "").toLowerCase().trim() === studentUsername) {
                        studentData = rDoc.data();
                        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'roster', rDoc.id), { uid: user.uid });
                        break;
                    }
                }
            }
            if (studentData) {
                const p = (studentData.period || "").toUpperCase();
                if (p === "TEACHER" || p === "ADMIN") isTeacher = true;
                else if (p.startsWith("CS")) isCSStudent = true;
            }
        } catch (e) { console.warn("🛡️ Auth Guard Failure", e); }

        // ROUTING
        const shared = ['student-grades', 'student-notes', 'student-files', 'calendar', 'student-payroll', '/pre-assessments/', '/proficiencyscales/', '/notes/'];
        const isShared = shared.some(p => currentPath.includes(p.toLowerCase()));
        const isPublic = PUBLIC_PAGES.some(p => currentPath.includes(p.toLowerCase())) || currentPath === '/';

        if (!isShared && !isPublic) {
            const isWdPage = currentPath.includes("level1") || currentPath.includes("level2") || currentPath.includes("/year1/") || currentPath.includes("/year2/");
            const isCsPage = (currentPath.includes("cs-interactive") || currentPath.includes("computerscience") || currentPath.includes("/compsci/"));

            if (!isCSStudent && isCsPage) {
                window.location.replace("/student-notes.html");
                return;
            }
            if (isCSStudent && isWdPage) {
                window.location.replace("/cs-interactive.html");
                return;
            }
        }

        window.dacAuthData = { isAuthenticated: true, isTeacher, isCSStudent };
        document.dispatchEvent(new Event('authComplete'));
        const shield = document.getElementById('auth-shield');
        if (shield) shield.remove();

    } else {
        // NOT LOGGED IN
        // ADD EXAMS TO PUBLIC CHECK SO LOGGED-OUT STUDENTS CAN AT LEAST SEE THE TEST PAGE IF NEEDED
        const isPublic = PUBLIC_PAGES.some(p => currentPath.includes(p.toLowerCase())) || currentPath.includes('exams') || currentPath === '/';

        if (!isPublic) {
            window.location.replace(`/login.html?redirect=${encodeURIComponent(currentPath)}`);
        } else {
            window.dacAuthData = { isAuthenticated: false, isTeacher: false, isCSStudent: false };
            document.dispatchEvent(new Event('authComplete'));
            const shield = document.getElementById('auth-shield');
            if (shield) shield.remove();
        }
    }
});