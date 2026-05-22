// MariaDB Transition Version

// 1. THE SHIELD (Immediate)
const hideStyle = document.createElement('style');
hideStyle.id = 'auth-shield';
hideStyle.innerHTML = 'body { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
document.head.appendChild(hideStyle);

// --- ATOMIC BYPASS FOR EXAMS ---
// We check the path immediately to prevent redirects during tests
if (window.location.pathname.toLowerCase().includes('exams')) {
    const shield = document.getElementById('auth-shield');
    if (shield) shield.remove();
    console.log("🚨 EXAM BYPASS ACTIVE: Redirects disabled for this directory.");
}

function executeAuthCheck() {
    const currentPath = window.location.pathname.toLowerCase();
    
    // If we already handled the exam bypass above, finish event dispatch
    if (currentPath.includes('exams')) {
        window.dacAuthData = { isAuthenticated: false, isTeacher: false, isCSStudent: false };
        document.dispatchEvent(new Event('authComplete'));
        return; 
    }

    // Instantly check Local Storage instead of waiting for Firebase
    let user = null;
    try {
        const storedUser = localStorage.getItem('user');
        if (storedUser && storedUser !== 'undefined') {
            user = JSON.parse(storedUser);
        }
    } catch (e) {
        console.error("Local storage parse error, clearing user.");
        localStorage.removeItem('user');
    }

    // Public pages that logged-out users can see
    const publicP = [
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
    
    const isPublic = publicP.some(p => currentPath.includes(p.toLowerCase())) || currentPath === '/' || currentPath === '';

    if (!user) {
        // NOT LOGGED IN
        if (!isPublic) {
            // Force to login page
            window.location.replace(`/login.html?redirect=${encodeURIComponent(currentPath)}`);
        } else {
            window.dacAuthData = { isAuthenticated: false, isTeacher: false, isCSStudent: false };
            document.dispatchEvent(new Event('authComplete'));
            const shield = document.getElementById('auth-shield');
            if (shield) shield.remove();
        }
    } else {
        // LOGGED IN
        const isTeacher = user.role === 'admin' || user.section_id === 'Teacher' || (user.username && user.username.includes('damiller'));
        const isCSStudent = user.section_id && user.section_id.startsWith('CS');

        // Teacher check
        if (isTeacher) {
            window.dacAuthData = { isAuthenticated: true, isTeacher: true, isCSStudent: false };
            document.dispatchEvent(new Event('authComplete'));
            const shield = document.getElementById('auth-shield');
            if (shield) shield.remove();
            return;
        }

        // STUDENT ROUTING
        const shared = ['student-grades', 'grades', 'student-notes', 'notes', 'student-files', 'files', 'calendar', 'student-payroll', 'payroll', '/pre-assessments/', '/proficiencyscales/'];
        const isShared = shared.some(p => currentPath.includes(p.toLowerCase()));

        if (!isShared && !isPublic) {
            const isWdPage = currentPath.includes("level1") || currentPath.includes("level2") || currentPath.includes("/year1/") || currentPath.includes("/year2/");
            const isCsPage = (currentPath.includes("cs-interactive") || currentPath.includes("computerscience") || currentPath.includes("/compsci/"));

            if (!isCSStudent && isCsPage) {
                window.location.replace("/student/notes.html");
                return;
            }
            if (isCSStudent && isWdPage) {
                window.location.replace("/cs-interactive.html");
                return;
            }
        }

        window.dacAuthData = { isAuthenticated: true, isTeacher: false, isCSStudent };
        document.dispatchEvent(new Event('authComplete'));
        const shield = document.getElementById('auth-shield');
        if (shield) shield.remove();
    }
}

// FIRE IMMEDIATELY IF DOM IS ALREADY LOADED (Fixes the Module Race Condition!)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeAuthCheck);
} else {
    executeAuthCheck();
}