// /js/modules/grade-weights.js
// Single source of truth for course grade weighting — shared by the teacher
// gradebook (js/admin/gradebook.js) and the student dashboard (js/student/dashboard.js)
// so the two views can never compute a different percentage for the same data.

export const COURSE_WEIGHTS = {
    WD1:  { assignment: 0.50, project_quiz: 0.20, final: 0.20, career: 0.10 },
    WD2:  { assignment: 0.35, project_quiz: 0.35, final: 0.20, career: 0.10 },
    AS:   { assignment: 0.35, project_quiz: 0.35, final: 0.20, career: 0.10 }, // Map Advanced Studies matching WD2
    CS:   { assignment: 0.60, project_quiz: 0.20, final: 0.20, career: 0.00 },
    INTV: { assignment: 1.00, project_quiz: 0.00, final: 0.00, career: 0.00 } // Flat pool, no categories
};

// Current bell-schedule period codes (A1, A3, A5, B2, B4, B6, B8...) don't
// carry a course prefix the way the old "WD1-A1"-style section_ids did, so
// any startsWith()/includes() check against a bare period silently fails.
// This is the single source of truth for period -> course, sourced from
// live roster enrollment (students.course_id -> courses.course_name) —
// used by both the teacher gradebook and the student dashboard so they can
// never disagree about which weight scheme applies to a given student.
export const PERIOD_COURSE_MAP = { A1: 'WD1', B2: 'WD2', A3: 'CS', A5: 'CS', B4: 'CS', B6: 'CS', B8: 'CS', INTV: 'INTV' };

export function periodToCourseKey(period) {
    const p = String(period || '').trim().toUpperCase();
    if (PERIOD_COURSE_MAP[p]) return PERIOD_COURSE_MAP[p];
    // Fall back to legacy hyphenated codes (e.g. "WD1-A1") or a bare "CS"/"AS" value
    const prefix = p.split('-')[0];
    if (COURSE_WEIGHTS[prefix]) return prefix;
    if (p.includes('CS')) return 'CS';
    if (p.includes('WD2')) return 'WD2';
    if (p.includes('WD1')) return 'WD1';
    return null;
}

export function getAssignmentCategory(name, courseKey) {
    // Intervention is a flat pool — every assignment counts the same, no
    // final/project-quiz/career split (COURSE_WEIGHTS.INTV weights those at 0,
    // so miscategorizing something here would silently drop it from the total).
    if (courseKey === 'INTV') return 'assignment';

    const lowerName = name.toLowerCase();

    if (lowerName.startsWith('tc-') || lowerName.includes('timeclock')) {
        if (courseKey === 'CS') return 'assignment';
        return 'career';
    }

    if (lowerName.includes('final')) return 'final';
    if (lowerName.includes('project') || lowerName.includes('quiz') || lowerName.includes('exam') || lowerName.includes('summative') || lowerName.includes('assessment') || lowerName.includes('milestone')) return 'project_quiz';
    return 'assignment';
}
