// Server-side port of js/student/dashboard.js's calculateGradeStats +
// isAssignmentVisible, kept faithful on purpose so a number computed here
// always matches what the student sees on their own dashboard. Do NOT model
// this on js/admin/gradebook.js's row-summary builder instead -- that one
// diverges (period-specific due dates, an "EX" sentinel) and would produce
// a different number than the student-facing one this is meant to mirror.
const { getDbConnection } = require('./db');
const { resolveCourseId } = require('./helpers');

const COURSE_WEIGHTS = {
    WD1:  { assignment: 0.50, project_quiz: 0.20, final: 0.20, career: 0.10 },
    WD2:  { assignment: 0.35, project_quiz: 0.35, final: 0.20, career: 0.10 },
    AS:   { assignment: 0.35, project_quiz: 0.35, final: 0.20, career: 0.10 },
    CS:   { assignment: 0.60, project_quiz: 0.20, final: 0.20, career: 0.00 },
    INTV: { assignment: 1.00, project_quiz: 0.00, final: 0.00, career: 0.00 }
};

const COURSE_MAP = { '05254G1S': 'WD1', '05254G2S': 'WD2', '10003GS': 'CS', '05254ES': 'AS', '99999999': 'Teacher' };
const COURSE_LABELS = { WD1: 'Web Design 1', WD2: 'Web Design 2', AS: 'Advanced Studies', CS: 'Computer Science', INTV: 'Intervention' };

// Matches data/cs-course-map.json -- which chapters' classwork
// (cs_chN_activity_name) belong to which unit's exam, for the mastery
// exemption below.
const CS_UNIT_CHAPTERS = {
    1: [1, 2], 2: [3, 4], 3: [5, 6, 7, 8], 4: [9, 10],
    5: [11, 12, 13], 6: [14, 15, 16], 7: [17, 18, 19]
};
function unitForCsChapter(ch) {
    for (const unit in CS_UNIT_CHAPTERS) {
        if (CS_UNIT_CHAPTERS[unit].includes(ch)) return Number(unit);
    }
    return null;
}

function getAssignmentCategory(name, courseKey) {
    if (courseKey === 'INTV') return 'assignment';
    const lowerName = name.toLowerCase();
    if (lowerName.startsWith('tc-') || lowerName.includes('timeclock')) {
        return courseKey === 'CS' ? 'assignment' : 'career';
    }
    if (lowerName.includes('final')) return 'final';
    if (lowerName.includes('project') || lowerName.includes('quiz') || lowerName.includes('exam') || lowerName.includes('summative') || lowerName.includes('assessment') || lowerName.includes('milestone')) return 'project_quiz';
    return 'assignment';
}

function parsePts(name) {
    const ptsMatch = name.match(/[\[\(](\d+)\s*pts?[\]\)]/i);
    if (ptsMatch) return parseInt(ptsMatch[1], 10);
    const lowerName = name.toLowerCase();
    if (lowerName.includes('pre-test') || lowerName.includes('pretest') || lowerName.includes('pre-assessment') || lowerName.includes('preassessment') || lowerName.includes('diagnostic')) return 10;
    if (lowerName.includes('post test') || lowerName.includes('post-test') || lowerName.includes('formative') || lowerName.includes('assessment') || lowerName.includes('exam') || lowerName.includes('summative')) return 20;
    if (lowerName.includes('lab') || lowerName.includes('worksheet') || lowerName.includes('ch ') || lowerName.match(/ch\d+/) || lowerName.includes('unit')) return 25;
    return 100;
}

function isAssignmentVisible(name, studentCourse, registryEntry) {
    if (registryEntry && registryEntry.targetCourse) {
        const target = COURSE_MAP[registryEntry.targetCourse] || registryEntry.targetCourse;
        if (target !== 'All' && target !== studentCourse) return false;
    }
    const lowerName = String(name).toLowerCase();
    const match = lowerName.match(/(?:chapter|ch|unit|milestone)\s*(\d+)/i);
    const num = match ? parseInt(match[1], 10) : null;

    if (studentCourse === 'WD1') {
        if (num !== null) return lowerName.includes('unit') || lowerName.includes('milestone') ? num >= 1 && num <= 4 : num >= 1 && num <= 8;
        return true;
    }
    if (studentCourse === 'WD2' || studentCourse === 'AS') {
        if (num !== null) return lowerName.includes('unit') || lowerName.includes('milestone') ? num >= 5 && num <= 8 : num >= 9 && num <= 16;
        return true;
    }
    if (studentCourse === 'CS') {
        if (num !== null) return num >= 1 && num <= 19;
        return true;
    }
    return true;
}

function formatDbDate(d) {
    if (!d) return '';
    if (typeof d === 'string') return d.split('T')[0].split(' ')[0];
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Mirrors js/modules/grade-weights.js's periodToCourseKey.
function periodToCourseKey(period) {
    const PERIOD_COURSE_MAP = { A1: 'WD1', B2: 'WD2', A3: 'CS', A5: 'CS', B4: 'CS', B6: 'CS', B8: 'CS', INTV: 'INTV' };
    const p = String(period || '').trim().toUpperCase();
    if (PERIOD_COURSE_MAP[p]) return PERIOD_COURSE_MAP[p];
    const prefix = p.split('-')[0];
    if (COURSE_WEIGHTS[prefix]) return prefix;
    if (p.includes('CS')) return 'CS';
    if (p.includes('WD2')) return 'WD2';
    if (p.includes('WD1')) return 'WD1';
    return null;
}

// Returns { percent, letterGrade, courseLabel } for one student, computed
// exactly the way js/student/dashboard.js computes it for their own
// dashboard -- same weighting, same CS mastery exemption, same due-date
// gating (global due_date only, not per-period overrides).
async function computeStudentGrade(connection, studentId, sectionId) {
    const courseKey = periodToCourseKey(sectionId);
    const courseCode = await resolveCourseId(connection, sectionId);
    if (!courseKey || !courseCode) return { percent: null, letterGrade: null, courseLabel: null };

    const [rows] = await connection.execute(
        `SELECT e.exam_id, TRIM(e.title) AS title, e.total_points, e.due_date, r.score
         FROM exams e
         LEFT JOIN responses r ON e.exam_id = r.exam_id AND r.student_id = ?
         WHERE e.course_id = ?`,
        [studentId, courseCode]
    );

    const today = new Date(); today.setHours(0, 0, 0, 0);
    let totalEarned = 0, totalPossible = 0;
    const catEarned = { assignment: 0, project_quiz: 0, final: 0, career: 0 };
    const catPossible = { assignment: 0, project_quiz: 0, final: 0, career: 0 };

    const byKey = {};
    rows.forEach(r => { byKey[r.exam_id] = r; });

    rows.forEach(r => {
        const key = r.exam_id;
        const registryEntry = { title: r.title, targetCourse: courseCode };
        if (!isAssignmentVisible(key, courseKey, registryEntry)) return;

        // Pre-Test, Pre-Scale, and timeclock entries are NEVER exempt --
        // only chapter classwork (cs_chN_*) is, once that chapter's unit
        // exam is scored 80% or better. Previously this exempted Unit#-Pre
        // and Unit# Pre-Scale instead, which is the opposite of what's
        // wanted: those diagnostic/reflection items should always count,
        // and it's the classwork that becomes redundant once the exam
        // itself proves mastery.
        if (courseKey === 'CS') {
            const chMatch = key.match(/^cs_ch(\d+)_/);
            const unit = chMatch ? unitForCsChapter(Number(chMatch[1])) : null;
            if (unit) {
                const examEntry = byKey[`Unit${unit}-Exam`];
                if (examEntry && examEntry.score !== null && examEntry.score !== undefined && examEntry.score !== '' && examEntry.total_points
                    && (Number(examEntry.score) / examEntry.total_points) >= 0.80) {
                    return;
                }
            }
        }

        const max = r.total_points || parsePts(key);
        const score = r.score;
        if (score === 'Submitted') return;
        // Excused work is fully excluded, regardless of due date. Previously
        // "EX" wasn't caught here at all, so it fell through to hasScore=true
        // and Number("EX") produced NaN, silently corrupting the running total
        // (and, downstream, the grade-based paystub calc in paystubs.js).
        if (score === 'EX') return;

        const hasScore = score !== undefined && score !== null && score !== '';
        if (!hasScore) {
            const dueDate = formatDbDate(r.due_date);
            const isPastDue = !!dueDate && new Date(dueDate + 'T00:00:00') < today;
            if (!isPastDue) return;
        }

        const num = hasScore ? Number(score) : 0;
        totalPossible += max;
        totalEarned += num;

        const cat = getAssignmentCategory(key, courseKey);
        catEarned[cat] += num;
        catPossible[cat] += max;
    });

    const weights = COURSE_WEIGHTS[courseKey] || COURSE_WEIGHTS.WD1;
    let weighted = 0, weightSum = 0;
    Object.keys(catPossible).forEach(cat => {
        if (catPossible[cat] > 0 && weights[cat] > 0) {
            weighted += (catEarned[cat] / catPossible[cat]) * weights[cat];
            weightSum += weights[cat];
        }
    });
    const percent = weightSum > 0 ? Math.round((weighted / weightSum) * 100) : (totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0);

    let letterGrade = 'F';
    if (percent >= 90) letterGrade = 'A';
    else if (percent >= 80) letterGrade = 'B';
    else if (percent >= 70) letterGrade = 'C';
    else if (percent >= 60) letterGrade = 'D';

    return { percent, letterGrade, courseLabel: COURSE_LABELS[courseKey] || courseKey };
}

module.exports = { computeStudentGrade, periodToCourseKey, COURSE_LABELS, CS_UNIT_CHAPTERS, unitForCsChapter };
