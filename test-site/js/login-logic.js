/* test-site/js/login-logic.js */

/**
 * Student Portal Logic (MariaDB Transition)
 * Handles: Login, Registration, Conditional Clock-In, and Self-Service Password Resets
 */

const errorDiv = document.getElementById("auth-error");

/**
 * Returns the student to their original destination or the dashboard.
 */
function handleNavigationFlow() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get('redirect') || "/student/grades.html";
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
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Login failed');

                // Store User and their current Shift Metadata
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('shift', JSON.stringify(data.shift));
                
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
                username: document.getElementById("reset-username").value.trim().toLowerCase(),
                new_password: document.getElementById("reset-new-password").value
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