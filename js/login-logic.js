/* test-site/js/login-logic.js */

/**
 * Student Portal Logic (MariaDB Transition)
 * Handles: Login, Registration, Conditional Clock-In, and Self-Service Password Resets
 */

const errorDiv = document.getElementById("auth-error");

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

/**
 * Posts clock-in data to the local MariaDB server.
 */
async function recordClockIn(type, answer = "N/A") {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    try {
        await fetch('/api/clockin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                student_id: user.student_id, 
                section_id: user.section_id,
                type: type, 
                answer: answer 
            })
        });
    } catch (err) {
        console.error("Clock-in storage failed:", err);
    }
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
                const isCS = userSection.startsWith('CS') || userSection.startsWith('COMP') || userSection.includes('COMP');
                const normalizedUser = {
                    ...data.user,
                    section_id: userSection,
                    studentClass: userSection,
                    course: data.user.course || (isCS ? 'CS' : 'WD')
                };

                localStorage.setItem('user', JSON.stringify(normalizedUser));
                localStorage.setItem('shift', JSON.stringify(data.shift));

                // If account is flagged, force immediate password change before any redirect.
                if (Number(data.must_change_password || data.user?.must_change_password || 0) === 1) {
                    const temporaryPassword = prompt("Your password was reset. Enter your current temporary password (your Student ID):");
                    if (!temporaryPassword) {
                        throw new Error('Password change is required before continuing.');
                    }

                    const newPassword = prompt("Create a new password (minimum 6 characters):");
                    if (!newPassword || String(newPassword).length < 6) {
                        throw new Error('New password must be at least 6 characters.');
                    }

                    const changeResponse = await fetch('/api/change-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            current_password: temporaryPassword,
                            new_password: newPassword
                        })
                    });

                    const changeData = await changeResponse.json();
                    if (!changeResponse.ok) {
                        throw new Error(changeData.error || 'Failed to change password.');
                    }

                    const updatedUser = { ...data.user, must_change_password: 0 };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    alert('Password updated successfully. You can now continue.');
                }
                
                // TEACHER REDIRECT OVERRIDE
                const isTeacher = data.user.role === 'admin' || data.user.section_id === 'Teacher' || data.user.username.includes('damiller');
                if (isTeacher) {
                    window.location.replace("/admin/gradebook.html");
                    return;
                }
                
                if (data.shift && data.shift.isRegular) {
                    // REGULAR SHIFT: Transition to Clock-In Question
                    document.getElementById('tab-login').parentElement.classList.add('d-none');
                    document.getElementById('tab-register').parentElement.classList.add('d-none');
                    const testAlert = document.getElementById('test-mode-alert');
                    if (testAlert) testAlert.classList.add('d-none');

                    const clockInTab = document.getElementById('tab-clockin');
                    clockInTab.parentElement.classList.remove('d-none');
                    clockInTab.click();
                } else {
                    // OVERTIME: Silent Record and Redirect
                    await recordClockIn('Overtime');
                    handleNavigationFlow();
                }

            } catch (err) {
                errorDiv.textContent = "Authentication Error: " + err.message;
                errorDiv.classList.remove("d-none");
            }
        });
    }

    // CLOCK-IN SUBMISSION
    if (clockinForm) {
        clockinForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const answer = document.getElementById('clockin-answer').value;
            try {
                await recordClockIn('Regular', answer);
                handleNavigationFlow();
            } catch (err) {
                handleNavigationFlow();
            }
        });
    }

    // REGISTRATION LOGIC
    if (regForm) {
        regForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const payload = {
                first_name: document.getElementById("reg-fname").value.trim(),
                last_name: document.getElementById("reg-lname").value.trim(),
                student_id: document.getElementById("reg-sid").value.trim(),
                username: document.getElementById("reg-username").value.trim().toLowerCase(),
                password: document.getElementById("reg-password").value
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
        resetForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const resetError = document.getElementById("reset-error");
            const resetSuccess = document.getElementById("reset-success");
            
            resetError.classList.add("d-none");
            resetSuccess.classList.add("d-none");

            const payload = {
                first_name: document.getElementById("reset-fname").value.trim(),
                last_name: document.getElementById("reset-lname").value.trim(),
                student_id: document.getElementById("reset-sid").value.trim(),
                username: document.getElementById("reset-username").value.trim().toLowerCase()
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
