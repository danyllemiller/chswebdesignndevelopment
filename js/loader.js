// js/loader.js
/**
 * Global Resource Loader
 * Handles asynchronous injection of common components (Navbar, Footer Nav, and Site Footer)
 * Also auto-injects common head resources to reduce redundancy across pages.
 * Receives auth state from auth-guard.js via Event Listener to style navigation.
 */

// ==========================================
// LIVE CLASS POLLS (sitewide, self-guards to students only)
// ==========================================
(function injectPollListener() {
  if (document.getElementById('poll-listener-script')) return;
  const script = document.createElement('script');
  script.id = 'poll-listener-script';
  script.src = '/js/poll-listener.js?v=1';
  document.body ? document.body.appendChild(script) : document.head.appendChild(script);
})();

// ==========================================
// LIVE WORD CLOUDS (sitewide, self-guards to students only)
// ==========================================
(function injectWordCloudListener() {
  if (document.getElementById('wordcloud-listener-script')) return;
  const script = document.createElement('script');
  script.id = 'wordcloud-listener-script';
  script.src = '/js/wordcloud-listener.js?v=1';
  document.body ? document.body.appendChild(script) : document.head.appendChild(script);
})();

// ==========================================
// TIMECLOCK (sitewide, self-guards to students only)
// Was previously only <script>-included on 4 pages, so the auto-popup
// silently never fired for a student whose current page wasn't one of
// those 4 -- which in practice is most of class time, since students are
// on chapter/lesson pages, not grades/notes/files/calendar.
// ==========================================
(function injectTimeclock() {
  if (document.getElementById('timeclock-script')) return;
  const script = document.createElement('script');
  script.id = 'timeclock-script';
  script.type = 'module';
  script.src = '/js/student/timeclock.js?v=8';
  document.body ? document.body.appendChild(script) : document.head.appendChild(script);
})();

// ==========================================
// AUTO-INJECT COMMON HEAD RESOURCES
// ==========================================
(function initGlobalHeadResources() {
  const head = document.head;
  const resourceExists = (selector) => document.querySelector(selector) !== null;

  if (!resourceExists('link[rel="shortcut icon"]')) {
    [
      { rel: 'shortcut icon', href: '/images/favicon/favicon.ico' },
      { rel: 'apple-touch-icon', href: '/images/favicon/apple-touch-icon.png' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/images/favicon/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/images/favicon/favicon-16x16.png' }
    ].forEach(attrs => {
      const link = document.createElement('link');
      Object.assign(link, attrs);
      head.appendChild(link);
    });
  }

  if (!resourceExists('link[href*="/css/dacStyleSheets.css"]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/css/dacStyleSheets.css?v=1.4';
    head.appendChild(css);
  }

  if (!resourceExists('link[href*="/css/dacPrint.css"]')) {
    const printCss = document.createElement('link');
    printCss.rel = 'stylesheet';
    printCss.media = 'print';
    printCss.href = '/css/dacPrint.css';
    printCss.type = 'text/css';
    head.appendChild(printCss);
  }
})();

// ==========================================
// GLOBAL BOOTSTRAP BUG FIX
// ==========================================
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

console.log("1. Loader.js is active and running!");

// ==========================================
// SUMMER COUNTDOWN LOGIC (STACKED VERSION)
// ==========================================
function initSummerCountdown() {
    // Rolling sequence of break countdowns, each targeting end-of-school-day on
    // the last attendance day before that break (times sourced from the live
    // bell schedule: 14:07 for a regular day, 12:50 for the Jun 3 minimum day).
    // Once a target passes, the countdown automatically advances to the next one.
    const breakTargets = [
        { label: 'Thanksgiving Break', date: '2026-11-20T14:07:00' },
        { label: 'Winter Break',       date: '2026-12-17T14:07:00' },
        { label: 'Spring Break',       date: '2027-03-26T14:07:00' },
        { label: 'Summer Break',       date: '2027-06-03T12:50:00' }
    ];

    const updateTimer = () => {
        const countdownEl = document.getElementById('summer-countdown');
        if (!countdownEl) return;

        const now = new Date().getTime();
        const target = breakTargets.find(t => new Date(t.date).getTime() - now > 0);

        if (!target) {
            countdownEl.innerHTML = "Enjoy your Summer! 🏖️";
            return;
        }

        const distance = new Date(target.date).getTime() - now;
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

        // Stacked HTML format for better spacing
        countdownEl.innerHTML = `
            <div style="font-size: 0.75rem; line-height: 1; margin-bottom: 2px; opacity: 0.9;">${target.label} In:</div>
            <div style="font-size: 0.9rem; line-height: 1; letter-spacing: 0.5px;">${days}d ${hours}h ${minutes}m</div>
        `;
    };

    updateTimer();

    if(window.dacSummerTimer) clearInterval(window.dacSummerTimer);
    window.dacSummerTimer = setInterval(updateTimer, 1000);
}

// ==========================================
// ASYNC INJECTION
// ==========================================
async function loadIncludes() {
    console.log("2. Function loadIncludes() has started.");

    const navEl = document.getElementById('nav-placeholder');
    if (navEl) {
        try {
            const resp = await fetch('/includes/navbar.html?v=' + new Date().getTime());
            if (resp.ok) {
                const html = await resp.text();
                navEl.innerHTML = html;
                
                initSummerCountdown();
                
                if (window.dacAuthData) {
                    filterNavigation(window.dacAuthData);
                } else {
                    const authTimeout = setTimeout(() => {
                        if (!window.dacAuthData) {
                            filterNavigation({ isAuthenticated: false });
                        }
                    }, 800);

                    document.addEventListener('authComplete', () => {
                        clearTimeout(authTimeout);
                        filterNavigation(window.dacAuthData);
                    });
                }
            }
        } catch (e) { console.error("CRITICAL ERROR loading navbar:", e); }
    }

    const footerNavEl = document.getElementById('footer-nav');
    if (footerNavEl) {
        try {
            const url = "/includes/footer.html?v=" + new Date().getTime();
            const resp = await fetch(url);
            if (resp.ok) {
                const html = await resp.text();
                footerNavEl.innerHTML = html;
                const scripts = footerNavEl.querySelectorAll('script');
                scripts.forEach(oldScript => {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                    if (oldScript.innerText) newScript.textContent = oldScript.innerText;
                    document.body.appendChild(newScript);
                });
            }
        } catch (e) { console.error("ERROR loading footer-nav:", e); }
    }

    const footEl = document.getElementById('footer-placeholder');
    if (footEl) {
        try {
            const url = "/includes/site-footer.html?v=" + new Date().getTime();
            const resp = await fetch(url);
            if (resp.ok) {
                const html = await resp.text();
                footEl.innerHTML = html;
                const scripts = footEl.querySelectorAll('script');
                scripts.forEach(oldScript => {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                    if (oldScript.innerText) newScript.textContent = oldScript.innerText;
                    document.body.appendChild(newScript);
                });
            }
        } catch (e) { console.error("CRITICAL ERROR loading global footer:", e); }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadIncludes);
} else {
    loadIncludes();
}

/**
 * --- NAVIGATION FORMATTER ---
 */
function filterNavigation(authData) {
    console.log('[filterNavigation] ENTRY authData:', authData);
    const loginMenu = document.getElementById('login-menu-item');
    const adminMenu = document.getElementById('admin-menu-item');
    const studentMenuWD = document.getElementById('student-menu-wd');
    const studentMenuCS = document.getElementById('student-menu-cs');
    const studentMenuINTV = document.getElementById('student-menu-intv');
    const webDesignNav = document.getElementById('nav-web-design');
    const compSciNav = document.getElementById('nav-computer-science');
    console.log('[filterNavigation] DOM elements found:', { loginMenu: !!loginMenu, adminMenu: !!adminMenu, studentMenuWD: !!studentMenuWD, studentMenuCS: !!studentMenuCS, webDesignNav: !!webDesignNav, compSciNav: !!compSciNav });

    if (!authData || !authData.isAuthenticated) {
        if (loginMenu) loginMenu.style.display = '';
        if (studentMenuWD) studentMenuWD.style.setProperty('display', 'none', 'important');
        if (studentMenuCS) studentMenuCS.style.setProperty('display', 'none', 'important');
        if (studentMenuINTV) studentMenuINTV.style.setProperty('display', 'none', 'important');
        if (adminMenu) adminMenu.style.setProperty('display', 'none', 'important');
        if (webDesignNav) webDesignNav.style.display = '';
        if (compSciNav) compSciNav.style.display = '';
        return;
    }

    if (loginMenu) loginMenu.style.setProperty('display', 'none', 'important');

    if (authData.isTeacher) {
        // --- TEACHER: SHOW ADMIN, PLUS ALL STUDENT TOOL MENUS SO THE TEACHER CAN
        // DEMONSTRATE THEM LIVE WITHOUT LOGGING IN AS A STUDENT ---
        if (adminMenu) {
            adminMenu.classList.remove('d-none');
            adminMenu.style.setProperty('display', 'block', 'important');
        }
        if (studentMenuWD) {
            studentMenuWD.classList.remove('d-none');
            studentMenuWD.style.setProperty('display', 'block', 'important');
        }
        if (studentMenuCS) {
            studentMenuCS.classList.remove('d-none');
            studentMenuCS.style.setProperty('display', 'block', 'important');
        }
        if (studentMenuINTV) {
            studentMenuINTV.classList.remove('d-none');
            studentMenuINTV.style.setProperty('display', 'block', 'important');
        }
        if (webDesignNav) webDesignNav.style.display = '';
        if (compSciNav) compSciNav.style.display = '';
    } else {
        // --- STUDENT LOGIC ---
        if (adminMenu) adminMenu.style.setProperty('display', 'none', 'important');
        
const studentClass = String(
            authData.studentClass ||
            authData.section_id ||
            authData.section ||
            authData.period ||
            authData.user?.section_id ||
            authData.user?.section ||
            authData.user?.studentClass ||
            ''
        ).trim().toUpperCase();

        // FIX: Check explicit course setting FIRST - this is set at login and is most reliable
        // The auth-guard sets authData.course to 'CS' or 'WD' based on student's section_id
        const explicitCourse = authData.course ? String(authData.course).toUpperCase() : null;

        // Fall back to inferring from section_id if no explicit course set
        const courseFromClass = studentClass.startsWith('CS') || studentClass.startsWith('COMP') || studentClass.includes('COMP') ? 'CS' :
                    (studentClass.startsWith('WD') || studentClass.startsWith('AS') || studentClass.includes('WEB')) ? 'WD' :
                    null;

        // auth-guard now resolves a student's FULL set of enrolled courses (primary
        // section + any additional sections) into authData.enrolledCourses. Prefer
        // that -- it's what lets a student in both CS and WD see both menus -- and
        // only fall back to the old single-course inference if it's missing.
        const enrolledCourses = Array.isArray(authData.enrolledCourses) && authData.enrolledCourses.length
            ? authData.enrolledCourses
            : null;

        const isCS = enrolledCourses ? enrolledCourses.includes('CS') :
            (explicitCourse === 'CS' || authData.isCSStudent === true || courseFromClass === 'CS' || /^(CS|COMP)/.test(studentClass) || studentClass.includes('CS') || studentClass.includes('COMP'));
        const isWD = enrolledCourses ? enrolledCourses.includes('WD') :
            (explicitCourse === 'WD' || authData.isWDStudent === true || courseFromClass === 'WD' || /^(WD|AS)/.test(studentClass) || studentClass.includes('WD') || studentClass.includes('WEB'));
        const isINTV = enrolledCourses ? enrolledCourses.includes('INTV') :
            (!isCS && !isWD && (studentClass === 'INTV' || studentClass === 'INTERVENTION' || studentClass.startsWith('INTV')));

        console.log('[filterNavigation STUDENT] studentClass=', studentClass, 'enrolledCourses=', enrolledCourses, 'isCS=', isCS, 'isWD=', isWD, 'isINTV=', isINTV);

        // Each course's nav is shown/hidden independently -- a student enrolled in
        // more than one course (e.g. CS + Web Design) sees every menu that applies.
        if (webDesignNav) webDesignNav.style.setProperty('display', isWD ? '' : 'none', isWD ? '' : 'important');
        if (compSciNav) compSciNav.style.setProperty('display', isCS ? 'block' : 'none', isCS ? '' : 'important');

        if (studentMenuWD) {
            if (isWD) { studentMenuWD.classList.remove('d-none'); studentMenuWD.style.setProperty('display', 'block', 'important'); }
            else studentMenuWD.style.setProperty('display', 'none', 'important');
        }
        if (studentMenuCS) {
            if (isCS) { studentMenuCS.classList.remove('d-none'); studentMenuCS.style.setProperty('display', 'block', 'important'); }
            else studentMenuCS.style.setProperty('display', 'none', 'important');
        }
        if (studentMenuINTV) {
            if (isINTV) { studentMenuINTV.classList.remove('d-none'); studentMenuINTV.style.setProperty('display', 'block', 'important'); }
            else studentMenuINTV.style.setProperty('display', 'none', 'important');
        }
    }

    // DEFENSIVE: Wait 50ms and verify styles were applied correctly
    setTimeout(() => {
        const loginMenu = document.getElementById('login-menu-item');
        const adminMenu = document.getElementById('admin-menu-item');
        const studentMenuWD = document.getElementById('student-menu-wd');
        const studentMenuCS = document.getElementById('student-menu-cs');
        const studentMenuINTV = document.getElementById('student-menu-intv');
        const webDesignNav = document.getElementById('nav-web-design');
        const compSciNav = document.getElementById('nav-computer-science');

        if (!authData || !authData.isAuthenticated) return;

        const studentClass = String(
            authData.studentClass ||
            authData.section_id ||
            authData.section ||
            authData.period ||
            authData.user?.section_id ||
            authData.user?.section ||
            authData.user?.studentClass ||
            ''
        ).trim().toUpperCase();
        const courseFromClass = studentClass.startsWith('CS') || studentClass.startsWith('COMP') || studentClass.includes('COMP') ? 'CS' :
                    (studentClass.startsWith('WD') || studentClass.startsWith('AS') || studentClass.includes('WEB')) ? 'WD' :
                    null;
        const enrolledCourses = Array.isArray(authData.enrolledCourses) && authData.enrolledCourses.length
            ? authData.enrolledCourses
            : null;
        const isCS = enrolledCourses ? enrolledCourses.includes('CS') :
            (authData.course === 'CS' || authData.isCSStudent === true || courseFromClass === 'CS' || /^(CS|COMP)/.test(studentClass) || studentClass.includes('CS') || studentClass.includes('COMP'));
        const isWD = enrolledCourses ? enrolledCourses.includes('WD') :
            (authData.course === 'WD' || authData.isWDStudent === true || courseFromClass === 'WD' || /^(WD|AS)/.test(studentClass) || studentClass.includes('WD') || studentClass.includes('WEB'));
        const isINTV = enrolledCourses ? enrolledCourses.includes('INTV') :
            (!isCS && !isWD && (studentClass === 'INTV' || studentClass === 'INTERVENTION' || studentClass.startsWith('INTV')));

        if (authData.isTeacher) return;

        // Re-apply the same independent per-course visibility as the initial pass,
        // in case something else on the page mutated these elements in the meantime.
        if (webDesignNav) webDesignNav.style.setProperty('display', isWD ? '' : 'none', isWD ? '' : 'important');
        if (compSciNav) compSciNav.style.setProperty('display', isCS ? 'block' : 'none', isCS ? '' : 'important');
        if (studentMenuWD) studentMenuWD.style.setProperty('display', isWD ? 'block' : 'none', 'important');
        if (studentMenuCS) studentMenuCS.style.setProperty('display', isCS ? 'block' : 'none', 'important');
        if (studentMenuINTV) studentMenuINTV.style.setProperty('display', isINTV ? 'block' : 'none', 'important');
        if (isWD && studentMenuWD) studentMenuWD.classList.remove('d-none');
        if (isCS && studentMenuCS) studentMenuCS.classList.remove('d-none');
        if (isINTV && studentMenuINTV) studentMenuINTV.classList.remove('d-none');
    }, 50);
}