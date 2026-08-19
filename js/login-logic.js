/**
 * Student Portal Logic
 * Handles: Login, Registration, Conditional Clock-In, and Self-Service Password Resets
 */

const errorDiv = document.getElementById("auth-error");

/**
 * Client-side mirror of server/helpers.js validatePassword(). Convenience
 * only -- the server enforces this independently on register and
 * change-password, so this never needs to be trusted on its own.
 * Returns null if pw satisfies the rule, otherwise a specific message
 * naming the first unmet requirement.
 */
function validatePasswordClient(pw) {
    const s = String(pw || "");
    if (s.length < 8) return "Password must be at least 8 characters.";
    if (/\s/.test(s)) return "Password cannot contain spaces.";
    if (!/^[\x21-\x7E]+$/.test(s)) return "Password can only contain standard keyboard letters, numbers, and symbols.";
    if (!/[A-Z]/.test(s)) return "Password needs at least one uppercase letter.";
    if (!/[a-z]/.test(s)) return "Password needs at least one lowercase letter.";
    if (!/[0-9]/.test(s)) return "Password needs at least one number.";
    if (!/[^A-Za-z0-9]/.test(s)) return "Password needs at least one special character.";
    return null;
}

/**
 * Updates a live password checklist, ticking each requirement green as it
 * becomes true. `prefix` selects which checklist (register uses "pw-check",
 * reset uses "reset-pw-check") since both forms coexist in the DOM at once.
 * No-op if the checklist items aren't on the page.
 */
function updatePasswordChecklist(pw, prefix = "pw-check") {
    const s = String(pw || "");
    const checks = {
        [`${prefix}-length`]:  s.length >= 8,
        [`${prefix}-upper`]:   /[A-Z]/.test(s),
        [`${prefix}-lower`]:   /[a-z]/.test(s),
        [`${prefix}-number`]:  /[0-9]/.test(s),
        [`${prefix}-special`]: /[^A-Za-z0-9]/.test(s)
    };
    Object.entries(checks).forEach(([id, met]) => {
        const li = document.getElementById(id);
        if (!li) return;
        const icon = li.querySelector("i");
        li.classList.toggle("text-success", met);
        li.classList.toggle("text-muted", !met);
        if (icon) {
            icon.classList.toggle("fas", met);
            icon.classList.toggle("fa-check-circle", met);
            icon.classList.toggle("far", !met);
            icon.classList.toggle("fa-circle", !met);
        }
    });
}

/**
 * Returns the student to their original destination or the dashboard.
 * Updated to check for lastPage first (remember last page feature).
 * Priority: lastPage > explicit redirect > default course page
 */
function handleNavigationFlow(isCS = false) {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Get redirect param from auth-guard (set when session times out)
    const authRedirect = urlParams.get('redirect');
    console.log('[login] authRedirect param:', authRedirect);
    
    // Check if there's a valid lastPage saved (from previous session)
    let lastPage = null;
    try {
        const stored = localStorage.getItem('lastPage');
        console.log('[login] lastPage raw:', stored);
        if (stored) {
            const pageData = JSON.parse(stored);
            const age = Date.now() - pageData.timestamp;
            const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
            console.log('[login] lastPage age:', age, 'ms');
            if (age < MAX_AGE && pageData.path) {
                lastPage = pageData.path;
            }
        }
    } catch (e) {
        console.log('[login] lastPage error:', e);
        // Ignore errors, lastPage will be null
    }
    
    // Priority: lastPage takes precedence over authRedirect (timeout redirect)
    // We want user to return to where they were, not forced to timeout redirect
    let redirectTo;
    if (lastPage && !lastPage.includes('login') && !lastPage.includes('logout')) {
        // Use saved lastPage if available
        redirectTo = lastPage;
        console.log('[login] Using lastPage:', lastPage);
    } else if (authRedirect && !authRedirect.includes('login')) {
        // Fall back to timeout redirect if no lastPage
        redirectTo = authRedirect;
        console.log('[login] Using authRedirect:', redirectTo);
    } else {
        // Default course page as final fallback
        redirectTo = isCS ? "/cs-interactive.html" : "/student/grades.html";
        console.log('[login] Using default:', redirectTo);
    }
    
    window.location.replace(redirectTo);
}

// --- FORM INITIALIZATION ---

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const regForm = document.getElementById("register-form");
    const clockinForm = document.getElementById("clockin-form");
    const resetForm = document.getElementById("reset-password-form");

    // LOGIN LOGIC
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            errorDiv.classList.add("d-none");
            
            const username = document.getElementById("login-username").value.trim().toLowerCase();
            const password = document.getElementById("login-password").value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Login failed');

                // Normalize and store section / course metadata so auth guard can detect student track reliably.
                const userSection = String(data.user.section_id || data.user.section || data.user.period || data.user.studentClass || '').trim().toUpperCase();
                const courseName = String(data.user.course_name || '').toUpperCase();
                const isCS = courseName.includes('COMP') || courseName.includes('COMPUTER')
                          || userSection.startsWith('CS') || userSection.startsWith('COMP') || userSection.includes('COMP');
                const normalizedUser = {
                    ...data.user,
                    section_id: userSection,
                    studentClass: userSection,
                    course: data.user.course || (isCS ? 'CS' : 'WD')
                };

                localStorage.setItem('user', JSON.stringify(normalizedUser));

                // If account is flagged, force immediate password change before any redirect.
                if (Number(data.must_change_password || data.user?.must_change_password || 0) === 1) {
                    let newPassword, confirmPassword;
                    do {
                        newPassword = prompt("Your account requires a new password.\n\nPassword must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character:");
                        if (!newPassword) throw new Error('Password change is required before continuing.');
                        const passwordError = validatePasswordClient(newPassword);
                        if (passwordError) {
                            alert(passwordError + ' Please try again.');
                            newPassword = null;
                            continue;
                        }
                        confirmPassword = prompt("Confirm new password:");
                        if (!confirmPassword) throw new Error('Password change is required before continuing.');
                        if (newPassword !== confirmPassword) {
                            alert('Passwords do not match. Please try again.');
                            newPassword = null;
                        }
                    } while (!newPassword);

                    const changeResponse = await fetch('/api/change-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            current_password: String(data.user.student_id),
                            new_password: newPassword
                        })
                    });

                    const changeData = await changeResponse.json();
                    if (!changeResponse.ok) {
                        throw new Error(changeData.error || 'Failed to change password.');
                    }

                    const updatedUser = { ...data.user, must_change_password: 0 };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    alert('Password set successfully. Welcome!');
                }
                
                // TEACHER REDIRECT OVERRIDE
                const isTeacher = data.user.role === 'admin' || data.user.section_id === 'Teacher' || data.user.username.includes('damiller');
                if (isTeacher) {
                    window.location.replace("/admin/gradebook.html");
                    return;
                }
                
                // Clock-in/out is handled by the timeclock widget (js/student/timeclock.js)
                // once the student lands on their dashboard, which knows their actual
                // period and today's bell schedule. Login itself just navigates on.
                handleNavigationFlow();

            } catch (err) {
                errorDiv.textContent = "Authentication Error: " + err.message;
                errorDiv.classList.remove("d-none");
            }
        });
    }

    // CLOCK-IN SUBMISSION (legacy tab, superseded by the timeclock widget)
    if (clockinForm) {
        clockinForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            handleNavigationFlow();
        });
    }

    // REGISTRATION LOGIC
    if (regForm) {
        const regPasswordInput = document.getElementById("reg-password");
        if (regPasswordInput) {
            regPasswordInput.addEventListener("input", () => updatePasswordChecklist(regPasswordInput.value));
        }

        regForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            errorDiv.classList.add("d-none");

            const username = document.getElementById("reg-username").value.trim().toLowerCase();
            const password = document.getElementById("reg-password").value;

            if (!/^[a-z0-9]+$/.test(username)) {
                errorDiv.textContent = "Username may only contain lowercase letters and numbers.";
                errorDiv.classList.remove("d-none");
                return;
            }

            const passwordError = validatePasswordClient(password);
            if (passwordError) {
                errorDiv.textContent = passwordError;
                errorDiv.classList.remove("d-none");
                return;
            }

            const payload = {
                first_name: document.getElementById("reg-fname").value.trim(),
                last_name: document.getElementById("reg-lname").value.trim(),
                student_id: document.getElementById("reg-sid").value.trim(),
                username: username,
                password: password
            };
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Registration failed');
                
                alert("Account created successfully! Please log in.");
                document.getElementById('tab-login').click();
            } catch (err) {
                errorDiv.textContent = "Registration Error: " + err.message;
                errorDiv.classList.remove("d-none");
            }
        });
    }

    // SELF-SERVICE PASSWORD RESET
    if (resetForm) {
        const resetPasswordInput = document.getElementById("reset-new-password");
        if (resetPasswordInput) {
            resetPasswordInput.addEventListener("input", () =>
                updatePasswordChecklist(resetPasswordInput.value, "reset-pw-check")
            );
        }

        resetForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const resetError = document.getElementById("reset-error");
            const resetSuccess = document.getElementById("reset-success");

            resetError.classList.add("d-none");
            resetSuccess.classList.add("d-none");

            const newPassword = document.getElementById("reset-new-password").value;
            const passwordError = validatePasswordClient(newPassword);
            if (passwordError) {
                resetError.textContent = passwordError;
                resetError.classList.remove("d-none");
                return;
            }

            const payload = {
                first_name: document.getElementById("reset-fname").value.trim(),
                last_name: document.getElementById("reset-lname").value.trim(),
                student_id: document.getElementById("reset-sid").value.trim(),
                username: document.getElementById("reset-username").value.trim().toLowerCase(),
                new_password: newPassword
            };

            try {
                const response = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Reset failed');

                resetSuccess.textContent = data.message;
                resetSuccess.classList.remove("d-none");
                resetForm.reset();
                
                // Close modal and focus login tab after a brief delay
                setTimeout(() => {
                    const modalEl = document.getElementById('resetPasswordModal');
                    const modalInstance = bootstrap.Modal.getInstance(modalEl);
                    if (modalInstance) {
                        modalInstance.hide();
                    }
                    document.getElementById('tab-login').click();
                }, 2000);

            } catch (err) {
                resetError.textContent = "Reset Error: " + err.message;
                resetError.classList.remove("d-none");
            }
        });
    }
});
