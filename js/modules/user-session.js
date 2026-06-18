// /js/modules/user-session.js
/**
 * Universal Session Helper
 * Retrieves the currently logged-in user object from localStorage.
 * Used by both student and teacher modules.
 */
export function getLoggedInUser() {
    const userStr = localStorage.getItem('user');
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
        return null;
    }
}