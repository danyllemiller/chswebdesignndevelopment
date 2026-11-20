// server/lib/asStudentPlan.js
// Itzel (AS-B2) follows Web 2 alongside B2 (teacher 2026-11-20). From Ch 10 on,
// her AS gradebook is:
//   - each daily Guided Notebook page (Assignments), 10 pts, scored by how much
//     of the page she filled in: "AS-NB-ch12-d1";
//   - each chapter project (Projects/Tests/Quizzes), the Web 2 project grade
//     once it posts (self + signed peer review, server/lib/csProjectGate.js):
//     "AS-ch12_milestone";
//   - the chapter tests (Projects/Tests/Quizzes), copied by
//     server/lib/asChapterTests.js like any AS student's.
// A page or project only counts once she does it: a blank one never becomes a
// 0 (teacher's choice). The AS columns have no due date, so another AS student
// is never marked missing for them. Her other AS items (Monique's practicum and
// the 8th grade tour presentation) are excused in the data, not here.
const { resolveCourseId } = require('../helpers');

const PLANS = { '8009324': { fromChapter: 10, toChapter: 16 } };
const PAGE_POINTS = 10;
const WD2_COURSE = '05254G2S';

const planFor = (studentId) => PLANS[String(studentId || '')] || null;
const inPlan = (plan, chapter) => !!plan && chapter >= plan.fromChapter && chapter <= plan.toChapter;
const filled = (v) => typeof v === 'string' ? v.trim().length > 0 : !!v;
const countOf = (n, test) => { let k = 0; for (let i = 0; i < n; i++) if (test(i)) k++; return k; };
const anyRow = (rows, fields) => Array.isArray(rows) && rows.some(r => r && fields.some(f => filled(r[f])));

// [done, total] answerable parts of one notebook block, from what the page
// saves (js/student/guided-notebook.js: data.blocks[blockId]).
function blockParts(b, d) {
    d = d || {};
    switch (b.type) {
    case 'doNow': case 'dok': return [filled(d.text) ? 1 : 0, 1];
    case 'discussion': { const n = (b.prompts || []).length; return [countOf(n, i => filled(d['a' + i])), n]; }
    case 'fields': { const n = (b.fields || []).length; return [countOf(n, i => filled(d['f' + i])), n]; }
    case 'lab': { const n = (b.steps || []).length; return [countOf(n, i => d['s' + i]) + (filled(d.notes) ? 1 : 0), n + 1]; }
    case 'blanks': {
        const n = (b.items || []).reduce((k, t) => k + (String(t).match(/\[\[[^\]]+\]\]/g) || []).length, 0);
        return [Math.min(n, Object.values(d.values || {}).filter(filled).length), n];
    }
    case 'sort': { const n = (b.items || []).length; return [Math.min(n, Object.values(d.values || {}).filter(filled).length), n]; }
    case 'order': return [Array.isArray(d.order) && d.order.length ? 1 : 0, 1];
    case 'thinkShare': return [['partner', 'think', 'share', 'agree'].filter(f => filled(d[f])).length, 4];
    case 'fourSquare': return [(filled(d.answer) ? 1 : 0) + (filled(d.contributed) ? 1 : 0) + ([0, 1, 2, 3].some(i => filled(d['m' + i])) ? 1 : 0), 3];
    case 'team': return [(filled(d.teamName) ? 1 : 0) + (filled(d.decided) ? 1 : 0) + (anyRow(d.rows, ['member', 'task']) ? 1 : 0), 3];
    case 'projectSheet': return [['teamName', 'progress', 'blockers'].filter(f => filled(d[f])).length + (anyRow(d.rows, ['step', 'owner']) ? 1 : 0), 4];
    case 'turnin': return [d.turnedIn ? 1 : 0, 1];
    case 'exit': return [(filled(d.rating) ? 1 : 0) + (filled(d.sentence) ? 1 : 0), 2];
    default: return [0, 0];
    }
}

function pageScore(day, data) {
    const blocks = (data && data.blocks) || {};
    let done = 0, total = 0;
    (day.blocks || []).forEach(b => { const [x, n] = blockParts(b, blocks[b.id]); done += x; total += n; });
    return total ? Math.round((done / total) * PAGE_POINTS * 10) / 10 : 0;
}

async function asCourseId(connection, studentId) {
    const [[s]] = await connection.execute('SELECT section_id FROM students WHERE student_id = ? LIMIT 1', [String(studentId)]);
    return s ? resolveCourseId(connection, s.section_id) : null;
}

// Writes the AS column's score (creating the column the first time), unless
// the teacher excused it or the score didn't change.
async function writeAsScore(connection, studentId, examId, title, points, category, score) {
    const courseId = await asCourseId(connection, studentId);
    if (!courseId) return false;
    await connection.execute(
        'INSERT IGNORE INTO exams (exam_id, title, total_points, course_id, category, due_date) VALUES (?, ?, ?, ?, ?, NULL)',
        [examId, String(title).slice(0, 100), points, courseId, category]);
    const [[mine]] = await connection.execute('SELECT score FROM responses WHERE student_id = ? AND exam_id = ? LIMIT 1', [String(studentId), examId]);
    if (mine && (mine.score === 'EX' || Number(mine.score) === Number(score))) return false;
    await connection.execute(
        `INSERT INTO responses (student_id, exam_id, score, total_points, timestamp, entered_in_ic) VALUES (?, ?, ?, ?, NOW(), 0)
         ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW(), entered_in_ic = 0`,
        [String(studentId), examId, score, points]);
    return true;
}

// After a Guided Notebook save (server/routes/guidedNotebook.js). chapter is the
// loaded chapter content ({chapter, course, days}).
async function syncNotebookPage(connection, studentId, chapter, dayNum, data) {
    const plan = planFor(studentId);
    if (!chapter || chapter.course !== 'WD2' || !inPlan(plan, Number(chapter.chapter))) return false;
    const day = (chapter.days || []).find(d => d.day === Number(dayNum));
    if (!day) return false;
    const score = pageScore(day, data);
    if (!score) return false; // a blank page never counts as 0
    return writeAsScore(connection, studentId, `AS-NB-ch${chapter.chapter}-d${day.day}`,
        `Notebook Ch${chapter.chapter} Day ${day.day}: ${day.title || ''}`, PAGE_POINTS, 'assignment', score);
}

// After a Web 2 project grade posts (server/lib/csProjectGate.js).
async function syncProjectCopy(connection, studentId, examId) {
    const m = /^ch(\d+)_milestone$/.exec(String(examId || ''));
    if (!m || !inPlan(planFor(studentId), Number(m[1]))) return false;
    const [[exam]] = await connection.execute(
        'SELECT TRIM(title) AS title, total_points FROM exams WHERE exam_id = ? AND course_id = ? LIMIT 1', [examId, WD2_COURSE]);
    const [[best]] = await connection.execute('SELECT score, total_points FROM responses WHERE student_id = ? AND exam_id = ? LIMIT 1', [String(studentId), examId]);
    if (!exam || !best || best.score === null || best.score === '' || isNaN(Number(best.score))) return false;
    return writeAsScore(connection, studentId, `AS-${examId}`, `Ch${m[1]} ${exam.title || 'Project'} (Web 2)`,
        exam.total_points || best.total_points || 100, 'project_quiz', Number(best.score));
}

module.exports = { syncNotebookPage, syncProjectCopy, pageScore, PLANS };
