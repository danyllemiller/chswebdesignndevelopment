// /js/modules/grade-weights.js
// Single source of truth for course grade weighting — shared by the teacher
// gradebook (js/admin/gradebook.js) and the student dashboard (js/student/dashboard.js)
// so the two views can never compute a different percentage for the same data.

export const COURSE_WEIGHTS = {
    WD1: { assignment: 0.50, project_quiz: 0.20, final: 0.20, career: 0.10 },
    WD2: { assignment: 0.35, project_quiz: 0.35, final: 0.20, career: 0.10 },
    AS:  { assignment: 0.35, project_quiz: 0.35, final: 0.20, career: 0.10 }, // Map Advanced Studies matching WD2
    CS:  { assignment: 0.60, project_quiz: 0.20, final: 0.20, career: 0.00 }
};

export function getAssignmentCategory(name, courseKey) {
    const lowerName = name.toLowerCase();

    if (lowerName.startsWith('tc-') || lowerName.includes('timeclock')) {
        if (courseKey === 'CS') return 'assignment';
        return 'career';
    }

    if (lowerName.includes('final')) return 'final';
    if (lowerName.includes('project') || lowerName.includes('quiz') || lowerName.includes('exam') || lowerName.includes('summative') || lowerName.includes('assessment') || lowerName.includes('milestone')) return 'project_quiz';
    return 'assignment';
}
