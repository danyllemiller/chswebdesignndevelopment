// js/loader.js
/**
 * Global Resource Loader
 * Handles asynchronous injection of common components (Navbar, Footer Nav, and Site Footer)
 * Also auto-injects common head resources to reduce redundancy across pages.
 * Receives auth state from auth-guard.js via Event Listener to style navigation.
 */

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
    const summerDate = new Date('2026-06-04T11:40:00').getTime(); 
    
    const updateTimer = () => {
        const countdownEl = document.getElementById('summer-countdown');
        if (!countdownEl) return; 

        const now = new Date().getTime();
        const distance = summerDate - now;
        
        if (distance < 0) {
            countdownEl.innerHTML = "Enjoy your Summer! 🏖️";
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        
        // Stacked HTML format for better spacing
        countdownEl.innerHTML = `
            <div style="font-size: 0.75rem; line-height: 1; margin-bottom: 2px; opacity: 0.9;">Summer Break In:</div>
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
    const webDesignNav = document.getElementById('nav-web-design');
    const compSciNav = document.getElementById('nav-computer-science');
    console.log('[filterNavigation] DOM elements found:', { loginMenu: !!loginMenu, adminMenu: !!adminMenu, studentMenuWD: !!studentMenuWD, studentMenuCS: !!studentMenuCS, webDesignNav: !!webDesignNav, compSciNav: !!compSciNav });

    if (!authData || !authData.isAuthenticated) {
        if (loginMenu) loginMenu.style.display = '';
        if (studentMenuWD) studentMenuWD.style.setProperty('display', 'none', 'important');
        if (studentMenuCS) studentMenuCS.style.setProperty('display', 'none', 'important');
        if (adminMenu) adminMenu.style.setProperty('display', 'none', 'important');
        if (webDesignNav) webDesignNav.style.display = '';
        if (compSciNav) compSciNav.style.display = '';
        return;
    }

    if (loginMenu) loginMenu.style.setProperty('display', 'none', 'important');

    if (authData.isTeacher) {
        // --- TEACHER: SHOW ADMIN, ATOMICALLY HIDE STUDENT MENUS ---
        if (adminMenu) {
            adminMenu.classList.remove('d-none');
            adminMenu.style.setProperty('display', 'block', 'important');
        }
        if (studentMenuWD) studentMenuWD.style.setProperty('display', 'none', 'important');
        if (studentMenuCS) studentMenuCS.style.setProperty('display', 'none', 'important');
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
        
        // Use explicit course first, then fall back to class-based inference
        const isCS = explicitCourse === 'CS' || authData.isCSStudent === true || courseFromClass === 'CS' || /^(CS|COMP)/.test(studentClass) || studentClass.includes('CS') || studentClass.includes('COMP');
        const isWD = explicitCourse === 'WD' || courseFromClass === 'WD' || /^(WD|AS)/.test(studentClass) || studentClass.includes('WD') || studentClass.includes('WEB');
        
        console.log('[filterNavigation STUDENT] studentClass=', studentClass, 'explicitCourse=', explicitCourse, 'courseFromClass=', courseFromClass, 'isCS=', isCS, 'isWD=', isWD, 'authData.isCSStudent=', authData.isCSStudent);

        if (isCS && !isWD) {
            console.log('[filterNavigation] APPLYING CS-ONLY RULES');
            if (webDesignNav) {
                webDesignNav.style.setProperty('display', 'none', 'important');
                console.log('[filterNavigation] Hidden webDesignNav:', webDesignNav.style.display);
            }
            if (studentMenuWD) {
                studentMenuWD.style.setProperty('display', 'none', 'important');
                console.log('[filterNavigation] Hidden studentMenuWD:', studentMenuWD.style.display);
            }
            if (studentMenuCS) {
                studentMenuCS.classList.remove('d-none');
                studentMenuCS.style.setProperty('display', 'block', 'important');
                console.log('[filterNavigation] Showed studentMenuCS:', studentMenuCS.style.display);
            }
            if (compSciNav) {
                compSciNav.style.setProperty('display', 'block', 'important');
                console.log('[filterNavigation] Ensured compSciNav visible:', compSciNav.style.display);
            }
        } else if (isWD && !isCS) {
            if (compSciNav) compSciNav.style.setProperty('display', 'none', 'important');
            if (studentMenuCS) studentMenuCS.style.setProperty('display', 'none', 'important');
            if (studentMenuWD) {
                studentMenuWD.classList.remove('d-none');
                studentMenuWD.style.setProperty('display', 'block', 'important');
            }
            if (webDesignNav) webDesignNav.style.display = '';
        } else if (authData.isCSStudent) {
            // If we still know this is a CS student, hide WD nav and show CS nav.
            if (webDesignNav) webDesignNav.style.setProperty('display', 'none', 'important');
            if (studentMenuWD) studentMenuWD.style.setProperty('display', 'none', 'important');
            if (studentMenuCS) {
                studentMenuCS.classList.remove('d-none');
                studentMenuCS.style.setProperty('display', 'block', 'important');
            }
            if (compSciNav) compSciNav.style.setProperty('display', '');
        } else {
            // If track is unknown, keep both top-level course nav items available,
            // but hide the student-specific dropdowns until course is detected.
            if (studentMenuWD) studentMenuWD.style.setProperty('display', 'none', 'important');
            if (studentMenuCS) studentMenuCS.style.setProperty('display', 'none', 'important');
        }
    }

    // DEFENSIVE: Wait 50ms and verify styles were applied correctly
    setTimeout(() => {
        const loginMenu = document.getElementById('login-menu-item');
        const adminMenu = document.getElementById('admin-menu-item');
        const studentMenuWD = document.getElementById('student-menu-wd');
        const studentMenuCS = document.getElementById('student-menu-cs');
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
        const isCS = authData.course === 'CS' || authData.isCSStudent === true || courseFromClass === 'CS' || /^(CS|COMP)/.test(studentClass) || studentClass.includes('CS') || studentClass.includes('COMP');
        const isWD = authData.course === 'WD' || courseFromClass === 'WD' || /^(WD|AS)/.test(studentClass) || studentClass.includes('WD') || studentClass.includes('WEB');

        if (authData.isTeacher) return;

        if (isCS && !isWD) {
            console.log('[filterNavigation DEFENSIVE CHECK] Re-enforcing CS-only nav');
            if (webDesignNav && webDesignNav.style.display !== 'none') {
                webDesignNav.style.setProperty('display', 'none', 'important');
                console.log('[filterNavigation] webDesignNav was re-hidden');
            }
            if (studentMenuWD && studentMenuWD.style.display !== 'none') {
                studentMenuWD.style.setProperty('display', 'none', 'important');
                console.log('[filterNavigation] studentMenuWD was re-hidden');
            }
        } else if (isWD && !isCS) {
            console.log('[filterNavigation DEFENSIVE CHECK] Re-enforcing WD-only nav');
            if (compSciNav && compSciNav.style.display === 'none') {
                compSciNav.style.setProperty('display', '', 'important');
                console.log('[filterNavigation] compSciNav was re-shown');
            }
            if (studentMenuCS && studentMenuCS.style.display !== 'none') {
                studentMenuCS.style.setProperty('display', 'none', 'important');
                console.log('[filterNavigation] studentMenuCS was re-hidden');
            }
        }
    }, 50);
}