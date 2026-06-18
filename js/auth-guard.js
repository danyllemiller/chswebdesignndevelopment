// MariaDB Transition Version

// 1. THE SHIELD (Immediate)
const hideStyle = document.createElement('style');
hideStyle.id = 'auth-shield';
hideStyle.innerHTML = 'body { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
document.head.appendChild(hideStyle);

// ==========================================
// LAST PAGE TRACKING
// ==========================================
const LAST_PAGE_KEY = 'lastPage';
const LAST_PAGE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Save the current page to localStorage with timestamp.
 * Used to return user to last page after login/logout/timeout.
 */
function saveLastPage() {
    const currentPath = window.location.pathname;
    // Don't save public pages or login/logout pages
    const publicPages = ['/login.html', '/logout.html', '/index.html', '/contact.html', '/sitemap.html'];
    if (publicPages.includes(currentPath) || currentPath === '/') return;
    
    const pageData = {
        path: currentPath,
        timestamp: Date.now(),
        title: document.title || ''
    };
    localStorage.setItem(LAST_PAGE_KEY, JSON.stringify(pageData));
    console.log('[lastPage] Saved:', pageData.path);
}

/**
 * Get the last saved page if it's fresh (less than 24 hours old).
 * Returns null if no valid last page exists.
 */
function getLastPage() {
    try {
        const stored = localStorage.getItem('lastPage');
        console.log('[lastPage] Raw:', stored);
        if (!stored) return null;
        
        const pageData = JSON.parse(stored);
        const age = Date.now() - pageData.timestamp;
        console.log('[lastPage] Age:', age, 'ms');
        
        if (age > LAST_PAGE_MAX_AGE) {
            // Page too old, clear it
            localStorage.removeItem(LAST_PAGE_KEY);
            console.log('[lastPage] Expired, cleared');
            return null;
        }
        
        return pageData.path;
    } catch (e) {
        console.log('[lastPage] Error:', e);
        return null;
    }
}

// --- ATOMIC BYPASS FOR EXAMS ---
if (window.location.pathname.toLowerCase().includes('exams')) {
    const shield = document.getElementById('auth-shield');
    if (shield) shield.remove();
    console.log('🚨 EXAM BYPASS ACTIVE: Redirects disabled for this directory.');
}

function getCourseGroup(sectionId = '') {
    const s = String(sectionId).toUpperCase();
    if (s.startsWith('CS') || s.startsWith('COMP') || s.includes('COMP')) return 'CS';
    if (s.startsWith('WD1') || s.startsWith('WD2') || s.startsWith('AS')) return 'WD';
    if (s.startsWith('WD') || s.includes('WEB')) return 'WD';
    return null;
}

function getPageCourse(currentPath = '') {
    const path = String(currentPath).toLowerCase();
    const csPatterns = [
        'computerscience',
        'cs-interactive',
        'compscifinal',
        '/reviewgames/how_computers_work',
        '/reviewgames/essential_computer_skills',
        '/reviewgames/intro_to_office_software',
        '/reviewgames/how_the_internet_works',
        '/reviewgames/cybersecurity_threats',
        '/reviewgames/defending_systems',
        '/pre-assessments/cs-',
        '/proficiencyScales/cs-',
        '/proficiencyscales/cs-'
    ];
    const wdPatterns = [
        '/year1/',
        '/year2/',
        '/reviewgames/',
        '/tolongdidntread/',
        '/techtalka-zguide/',
        'level1',
        'level2andup',
        '/pre-assessments/',
        '/proficiencyScales/',
        '/proficiencyscales/'
    ];

    if (csPatterns.some(pattern => path.includes(pattern))) return 'CS';
    if (wdPatterns.some(pattern => path.includes(pattern))) return 'WD';
    return 'SHARED';
}

function executeAuthCheck() {
    const currentPath = window.location.pathname.toLowerCase();

    let user = null;
    try {
        const storedUser = localStorage.getItem('user');
        if (storedUser && storedUser !== 'undefined') {
            user = JSON.parse(storedUser);
            const rawSection = String(user.section_id || user.section || user.period || user.studentClass || user.class || '').trim();
            user.section_id = rawSection;
            user.studentClass = rawSection;
        }
    } catch (e) {
        console.error('Local storage parse error, clearing user.');
        localStorage.removeItem('user');
    }

    const publicPages = [
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
    const isPublic = publicPages.some(p => currentPath.includes(p.toLowerCase())) || currentPath === '/' || currentPath === '';

    if (!user) {
        console.log('[auth-guard] No user found in localStorage. isPublic=', isPublic, 'currentPath=', currentPath);
        if (!isPublic) {
            // Save last page before redirect to login (for timeout scenarios)
            saveLastPage();
            console.log('[auth-guard] Page not public, redirecting to login');
            window.location.replace(`/login.html?redirect=${encodeURIComponent(currentPath)}`);
        } else {
            window.dacAuthData = { isAuthenticated: false, isTeacher: false, isCSStudent: false };
            document.dispatchEvent(new Event('authComplete'));
            const shield = document.getElementById('auth-shield');
            if (shield) shield.remove();
        }
        return;
    }

    const userSection = String(user.section_id || user.section || user.period || user.studentClass || user.class || '').trim().toUpperCase();
    const normalizedSection = userSection;
    const isTeacher = user.role === 'admin' || user.section_id === 'Teacher' || (user.username && user.username.includes('damiller'));
    const studentCourse = getCourseGroup(normalizedSection);
    const isCSStudent = studentCourse === 'CS' || user.course === 'CS' || user.isCSStudent === true || /^(CS|COMP)/.test(normalizedSection);
    console.log('[auth-guard] user.section_id=', user.section_id, 'userSection=', normalizedSection, ' -> studentCourse=', studentCourse, 'isCSStudent=', isCSStudent, 'path=', currentPath);

    if (isTeacher) {
        window.dacAuthData = {
            isAuthenticated: true,
            isTeacher: true,
            isCSStudent: false,
            course: 'ADMIN',
            studentClass: normalizedSection,
            section_id: normalizedSection,
            user
        };
        document.dispatchEvent(new Event('authComplete'));
        const shield = document.getElementById('auth-shield');
        if (shield) shield.remove();
        return;
    }

    // FIX: Check if this is the student's designated home page BEFORE applying course restrictions
    // This prevents the redirect loop by allowing access to the student's correct course page
    const designatedCourse = studentCourse || user.course;
    const pageCourse = getPageCourse(currentPath);
    
    // Define shared paths - pages accessible to all authenticated students
    const sharedPaths = [
        '/admin/',
        '/student-grades',
        '/grades',
        '/student-files',
        '/files',
        '/calendar',
        '/student-payroll',
        '/payroll',
        '/logout',
        '/login',
        '/index.html',
        '/contact.html',
        '/sitemap.html',
        '/notices.html',
        '/discipline.html',
        '/expectations.html',
        '/grading.html',
        'exams' // <- ADDED EXAMS HERE TO PREVENT REDIRECTS
    ];
    const isShared = sharedPaths.some(p => currentPath.includes(p.toLowerCase()));
    
    // List of course-specific home pages that should always be accessible to their designated students
    const csHomePages = ['cs-interactive.html', 'computerscience.html', 'compscifinal.html'];
    const wdHomePages = ['student/notes.html', 'level1.html', 'level2andup.html'];
    
    const isCSHomePage = csHomePages.some(p => currentPath.includes(p));
    const isWDHomePage = wdHomePages.some(p => currentPath.includes(p));
    
    // If student is CS and trying to access CS home page, allow it
    if (isCSStudent && isCSHomePage) {
        console.log('[auth-guard] CS student accessing CS home page - allowing access');
    } 
    // If student is WD and trying to access WD home page, allow it
    else if (!isCSStudent && isWDHomePage) {
        console.log('[auth-guard] WD student accessing WD home page - allowing access');
    }
    // Otherwise apply course restrictions
    else if (!isShared && !isPublic) {
        if (isCSStudent) {
            if (pageCourse === 'WD') {
                console.log('[auth-guard] CS student attempted WD page; redirecting to /cs-interactive.html');
                window.location.replace('/cs-interactive.html');
                return;
            }
        } else if (pageCourse === 'CS') {
            console.log('[auth-guard] Non-CS student attempted CS page; redirecting to /student/notes.html');
            window.location.replace('/student/notes.html');
            return;
        }
    }

    // Save last page after successful auth (so we track where user is)
    saveLastPage();

    window.dacAuthData = {
        isAuthenticated: true,
        isTeacher: false,
        isCSStudent,
        course: studentCourse || 'Student',
        studentClass: normalizedSection,
        section_id: normalizedSection,
        user
    };
    console.log('[auth-guard] Setting window.dacAuthData:', window.dacAuthData);
    document.dispatchEvent(new Event('authComplete'));
    console.log('[auth-guard] Dispatched authComplete event');
    const shield = document.getElementById('auth-shield');
    if (shield) shield.remove();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeAuthCheck);
} else {
    executeAuthCheck();
}
