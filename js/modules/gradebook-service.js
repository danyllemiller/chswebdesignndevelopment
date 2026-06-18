/**
 * Modular Gradebook Service
 * Handles all gradebook synchronization with MariaDB
 * Clean, reusable, and modular - no Google Sheets dependencies
 */

const GradebookService = (function() {
    'use strict';
    
    // ==========================================
    // CONFIGURATION
    // ==========================================
    const POINTS = {
        PRE_SCALE: 10,
        PRE_ASSESSMENT: 15, // Only used as baseline if no questions graded
        WORKSHEET: 20,
        UNIT_TEST: 0 // Variable based on correct answers
    };
    
    // ==========================================
    // PRIVATE HELPERS
    // ==========================================
    
    /**
     * Get current user from localStorage
     */
    function getUser() {
        try {
            return JSON.parse(localStorage.getItem('user'));
        } catch(e) {
            console.warn('GradebookService: No user in localStorage');
            return null;
        }
    }
    
    /**
     * Generate consistent exam_id
     */
    function makeExamId(unit, type, suffix = 'pts') {
        return `Unit ${unit} ${type} [10 ${suffix}]`;
    }
    
    /**
     * Submit grade to MariaDB via API
     */
    async function submitToGradebook(examId, score, maxPoints) {
        const user = getUser();
        if (!user || !user.student_id) {
            console.warn('GradebookService: No user logged in');
            return { success: false, error: 'No user logged in' };
        }
        
        try {
            const response = await fetch('/api/submit-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: user.student_id,
                    exam_id: examId,
                    score: score,
                    total_points: maxPoints
                })
            });
            
            const result = await response.json();
            console.log(`GradebookService: Synced ${examId} = ${score}/${maxPoints} points`);
            return result;
        } catch(e) {
            console.error('GradebookService: Sync failed', e);
            return { success: false, error: e.message };
        }
    }
    
    // ==========================================
    // PUBLIC API
    // ==========================================
    
    /**
     * Sync Pre-Scale (Self-Assessment) to gradebook
     * ALWAYS 10 points when completed
     * @param {number} unit - Unit number (1-5)
     * @returns {Promise<Object>}
     */
    async function syncPreScale(unit) {
        const examId = makeExamId(unit, 'Pre-Scale');
        return await submitToGradebook(examId, POINTS.PRE_SCALE, POINTS.PRE_SCALE);
    }
    
    /**
     * Sync Pre-Assessment (Diagnostic) to gradebook
     * Score based on CORRECT ANSWERS, not fixed
     * @param {number} unit - Unit number (1-5)
     * @param {number} correctAnswers - Number of correct answers
     * @param {number} totalQuestions - Total questions attempted
     * @returns {Promise<Object>}
     */
    async function syncPreAssessment(unit, correctAnswers, totalQuestions) {
        // Calculate percentage score
        const score = totalQuestions > 0 
            ? Math.round((correctAnswers / totalQuestions) * POINTS.PRE_ASSESSMENT)
            : 0;
        
        const examId = makeExamId(unit, 'Pre-Assessment', 'pts');
        return await submitToGradebook(examId, score, POINTS.PRE_ASSESSMENT);
    }
    
    /**
     * Sync Worksheet to gradebook
     * ALWAYS 20 points when submitted
     * @param {number} chapter - Chapter number
     * @returns {Promise<Object>}
     */
    async function syncWorksheet(chapter) {
        const examId = `Ch${chapter}-Worksheet [${POINTS.WORKSHEET} pts]`;
        return await submitToGradebook(examId, POINTS.WORKSHEET, POINTS.WORKSHEET);
    }
    
    /**
     * Sync Unit Test/Exam to gradebook
     * Score based on CORRECT ANSWERS
     * @param {number} unit - Unit number (1-5)
     * @param {number} correctAnswers - Number of correct answers
     * @param {number} totalQuestions - Total questions
     * @returns {Promise<Object>}
     */
    async function syncExam(unit, correctAnswers, totalQuestions) {
        const score = totalQuestions > 0
            ? Math.round((correctAnswers / totalQuestions) * 100)
            : 0;
        
        const examId = `Unit ${unit} Exam [100 pts]`;
        return await submitToGradebook(examId, score, 100);
    }
    
    /**
     * Check if a specific grade exists
     * @param {string} examId - Exam/assignment ID to check
     * @returns {Promise<Object>}
     */
    async function checkGrade(examId) {
        const user = getUser();
        if (!user || !user.student_id) {
            return { found: false };
        }
        
        try {
            const response = await fetch(`/api/student/grades?student_id=${encodeURIComponent(user.student_id)}`);
            const data = await response.json();
            const found = (data.responses || []).some(r => r.exam_id === examId);
            return { found, grade: found ? data.responses.find(r => r.exam_id === examId) : null };
        } catch(e) {
            return { found: false, error: e.message };
        }
    }
    
    /**
     * Get all grades for current user
     * @returns {Promise<Array>}
     */
    async function getAllGrades() {
        const user = getUser();
        if (!user || !user.student_id) {
            return [];
        }
        
        try {
            const response = await fetch(`/api/student/grades?student_id=${encodeURIComponent(user.student_id)}`);
            const data = await response.json();
            return data.responses || [];
        } catch(e) {
            console.error('GradebookService: Failed to fetch grades', e);
            return [];
        }
    }
    
    // ==========================================
    // EXPORTS
    // ==========================================
    return {
        syncPreScale,
        syncPreAssessment,
        syncWorksheet,
        syncExam,
        checkGrade,
        getAllGrades,
        POINTS
    };
    
})();

// ==========================================
// GLOBAL EXPORTS
// ==========================================
window.GradebookService = GradebookService;

// Convenience aliases for HTML onclick handlers
window.syncPreScale = function(unit) { return GradebookService.syncPreScale(unit); };
window.syncPreAssessment = function(unit, correct, total) { return GradebookService.syncPreAssessment(unit, correct, total); };
window.syncWorksheet = function(chapter) { return GradebookService.syncWorksheet(chapter); };
window.syncExam = function(unit, correct, total) { return GradebookService.syncExam(unit, correct, total); };

console.log('GradebookService: Loaded - Modular gradebook sync ready');
