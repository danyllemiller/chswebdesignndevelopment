// /js/modules/achievements.js
// Pure grade-stats/badge computation, extracted out of js/student/dashboard.js
// so a second page (the review-games arcade) can show the same real
// achievements without re-deriving -- and possibly mis-deriving -- the same
// weighted-grade/badge-tier rules a second time. dashboard.js keeps its own
// DOM-writing wrappers around these; this file only computes and returns data.

import { parsePts } from './utils.js';
import { COURSE_WEIGHTS, getAssignmentCategory } from './grade-weights.js?v=5';

// Matches data/cs-course-map.json -- which chapters' classwork
// (cs_chN_activity_name) belong to which unit's exam, for the mastery
// exemption below. Kept in sync with the identical copy in server/gradeCalc.js
// and the original in js/student/dashboard.js.
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

// Mirrors js/admin/gradebook.js's weighted calculation exactly, so this
// always matches what the teacher's gradebook and the real dashboard compute
// -- same CS mastery exemption, same excused/missing/not-yet-due handling.
export function computeGradeStats(keys, myGrades, registryData, courseKey) {
    let totalEarned = 0;
    let totalPossible = 0;
    let completed = 0;
    const catEarned = { assignment: 0, project_quiz: 0, final: 0, career: 0 };
    const catPossible = { assignment: 0, project_quiz: 0, final: 0, career: 0 };

    const today = new Date(); today.setHours(0, 0, 0, 0);

    keys.forEach(key => {
        if (myGrades[key] !== undefined && myGrades[key] !== null) {
            const isCsActivity = courseKey === 'CS' && /^cs_ch\d+_/.test(key);
            if (isCsActivity) {
                const chMatch = key.match(/^cs_ch(\d+)_/);
                const unit = chMatch ? unitForCsChapter(Number(chMatch[1])) : null;
                if (unit) {
                    const examEntry = myGrades[`Unit${unit}-Exam`];
                    const examScore = examEntry ? (typeof examEntry === 'object' ? examEntry.score : examEntry) : null;
                    const examMax = registryData?.[`Unit${unit}-Exam`]?.maxPoints;
                    if (examScore !== null && examScore !== undefined && examScore !== '' && examMax
                        && (Number(examScore) / examMax) >= 0.80) {
                        return;
                    }
                }
            }

            const max = registryData?.[key]?.maxPoints || parsePts(key);
            const score = typeof myGrades[key] === 'object' ? myGrades[key].score : myGrades[key];
            if (score === "Submitted") return;
            if (score === "EX") return;

            const hasScore = score !== undefined && score !== null && score !== "";
            if (!hasScore) {
                if (isCsActivity) return;
                if (registryData?.[key]?.isProjectMilestone) return;
                const dueDate = registryData?.[key]?.dueDate;
                const isPastDue = !!dueDate && new Date(dueDate + 'T00:00:00') < today;
                if (!isPastDue) return;
            }

            const num = hasScore ? Number(score) : 0;
            totalPossible += max;
            totalEarned += num;
            if (hasScore) completed++;

            const cat = getAssignmentCategory(key, courseKey, registryData?.[key]?.category);
            catEarned[cat] += num;
            catPossible[cat] += max;
        }
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

    let rankType = null;
    if (percent >= 100 && completed > 0) rankType = 'platinum';
    else if (percent >= 85 && completed > 0) rankType = 'gold';
    else if (percent >= 75 && completed > 0) rankType = 'silver';

    return { percent, letterGrade, completed, totalKeys: keys.length, totalEarned, rankType };
}

// Same achievement thresholds as dashboard.js's badge card -- returns plain
// data ({icon, type, title, desc}) instead of writing HTML, so each page
// renders it in whatever shape fits that page.
export function computeBadges(keys, myGrades, registryData) {
    const badges = [];
    const add = (icon, type, title, desc) => badges.push({ icon, type, title, desc });

    let totalPoints = 0;
    let totalSubmitted = 0;
    let perfectScores = 0;
    let platinumExams = 0;
    let goldExams = 0;
    let silverExams = 0;

    keys.forEach(key => {
        const grade = myGrades[key];
        if (grade) {
            const score = typeof grade === 'object' ? grade.score : grade;
            const max = registryData?.[key]?.maxPoints || parsePts(key);

            if (score !== "Submitted" && score !== "") {
                totalSubmitted++;
                totalPoints += Number(score);

                if (key.toLowerCase().includes('exam') || key.toLowerCase().includes('summative') || key.toLowerCase().includes('project')) {
                    const percentage = max > 0 ? (Number(score) / max) * 100 : 0;
                    if (percentage >= 100) platinumExams++;
                    else if (percentage >= 85) goldExams++;
                    else if (percentage >= 75) silverExams++;
                } else {
                    if (Number(score) === max && max > 0) perfectScores++;
                }
            }
        }
    });

    if (totalSubmitted >= 1) add('fas fa-shoe-prints', 'info', 'First Steps', 'Submitted your first assignment!');
    if (totalSubmitted >= 10) add('fas fa-running', 'success', 'On a Roll', 'Submitted 10 assignments!');
    if (totalSubmitted >= 25) add('fas fa-briefcase', 'platinum', 'Master Architect', 'Turned in 25 total assignments!');

    if (perfectScores >= 1) add('fas fa-star', 'gold', 'Flawless', 'Achieved a perfect score!');
    if (perfectScores >= 5) add('fas fa-star', 'diamond', 'Unstoppable', 'Achieved 5 perfect scores!');

    if (platinumExams >= 1) add('fas fa-trophy', 'platinum', 'Platinum Exam', 'Scored 100% on a major exam!');
    else if (goldExams >= 1) add('fas fa-trophy', 'gold', 'Gold Exam', 'Scored 85%+ on a major exam!');
    else if (silverExams >= 1) add('fas fa-trophy', 'silver', 'Silver Exam', 'Scored 75%+ on a major exam!');

    if (totalPoints >= 100) add('fas fa-gem', 'info', 'Century Club', 'Earned over 100 total points!');
    if (totalPoints >= 500) add('fas fa-gem', 'success', '500 Club', 'Earned over 500 total points!');

    return badges;
}
