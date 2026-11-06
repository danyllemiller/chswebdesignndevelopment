// server/lib/asChapterTests.js
// An Advanced Studies student sometimes sits a Web Design 2 chapter test with
// B2 (teacher 2026-11-05: an AS student took the Ch10 test with Web 2). The
// score lands on the WD2 exam (Ch10-Exam, course 05254G2S), but an AS
// student's gradebook only has AS-course columns, so it never showed or
// counted. This copies the student's best score on that test into an AS
// column of its own ("AS-Ch10-Exam") in the student's AS course.
//
// The AS column has no due date on purpose: it belongs only to whoever took
// the test, so another AS student who didn't is never marked missing for it.
// The WD2 row stays the real record (retakes, keep-highest, prerequisites and
// the missed-question report all key off it); the AS copy only ever moves up
// to the WD2 best, never down, and a teacher's EX on it stays.
const { periodToCourseKey } = require('../gradeCalc');
const { resolveCourseId } = require('../helpers');

const WD_CHAPTER_TEST = /^Ch\d+-Exam$/;
const WD2_COURSE = '05254G2S';

const asExamId = (examId) => `AS-${examId}`;

// Returns { copied, exam_id } -- copied false when it isn't an AS student's
// WD2 chapter test, there's no score yet, or the AS column is already as high.
async function syncAsChapterTest(connection, studentId, examId) {
    if (!WD_CHAPTER_TEST.test(String(examId || ''))) return { copied: false };
    const [[student]] = await connection.execute('SELECT section_id FROM students WHERE student_id = ? LIMIT 1', [studentId]);
    if (!student || periodToCourseKey(student.section_id) !== 'AS') return { copied: false };
    const [[exam]] = await connection.execute(
        'SELECT TRIM(title) AS title, total_points, category FROM exams WHERE exam_id = ? AND course_id = ? LIMIT 1', [examId, WD2_COURSE]);
    if (!exam) return { copied: false };
    const [[best]] = await connection.execute(
        'SELECT score, total_points, timestamp FROM responses WHERE student_id = ? AND exam_id = ? LIMIT 1', [studentId, examId]);
    if (!best || best.score === null || best.score === '' || isNaN(Number(best.score))) return { copied: false };

    const courseId = await resolveCourseId(connection, student.section_id);
    const id = asExamId(examId);
    await connection.execute(
        'INSERT IGNORE INTO exams (exam_id, title, total_points, course_id, category, due_date) VALUES (?, ?, ?, ?, ?, NULL)',
        [id, `${exam.title || examId} (taken with Web 2)`, exam.total_points || best.total_points, courseId, exam.category || 'assignment']);
    const [[mine]] = await connection.execute('SELECT score FROM responses WHERE student_id = ? AND exam_id = ? LIMIT 1', [studentId, id]);
    if (mine && (mine.score === 'EX' || Number(mine.score) >= Number(best.score))) return { copied: false, exam_id: id };
    await connection.execute(
        `INSERT INTO responses (student_id, exam_id, score, total_points, timestamp, entered_in_ic) VALUES (?, ?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = VALUES(timestamp), entered_in_ic = 0`,
        [studentId, id, best.score, exam.total_points || best.total_points, best.timestamp]);
    return { copied: true, exam_id: id };
}

module.exports = { syncAsChapterTest, asExamId };
