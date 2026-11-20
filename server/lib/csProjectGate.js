// server/lib/csProjectGate.js
// CS unit projects (Unit1-Project ... Unit7-Project) only post a grade to the
// gradebook once BOTH of these exist (teacher decision, 2026-10-23):
//   1. an uploaded file -- assignment-uploader.js logs an exam_attempts row
//      for the project's exam_id after every successful upload, and that log
//      is the only record tying a file to the project; and
//   2. a peer review -- which, since the same date, a classmate has to
//      confirm with their own password or the teacher's daily code
//      (server/routes/projects.js).
// Until then there is no responses row at all, so the gradebook shows the
// project as PENDING (master-gradebook-data) and it never counts against
// the student's grade (project milestones with no score are excluded).
//
// Web Design chapter projects (WD1 ch2-ch8, WD2 ch10-ch16 "chN_milestone")
// follow the same upload + self + signed peer review rule (teacher
// 2026-11-19). One difference: a WD project NOTHING was turned in for still
// counts as missing (0) once it's past due -- only a turned-in, not-yet-
// graded one is PENDING and left out of the grade. So WD projects are not
// "project milestones" in the gradebook's skip-when-blank sense
// (is_project_milestone below), only pending ones are skipped.
const CS_UNIT_PROJECT = /^Unit\d+-Project$/;
const WD_PROJECT = /^ch([2-8]|1[0-6])_milestone$/;
// The same two patterns for MySQL REGEXP.
const WD_PROJECT_SQL = '^ch([2-8]|1[0-6])_milestone$';
const GATED_PROJECT_SQL = '^(Unit[0-9]+-Project|ch([2-8]|1[0-6])_milestone)$';

const isCsUnitProject = (examId) => CS_UNIT_PROJECT.test(String(examId || ''));
const isWdProject = (examId) => WD_PROJECT.test(String(examId || ''));
// Any project under the upload + peer review gate (CS or WD).
const isGatedProject = (examId) => isCsUnitProject(examId) || isWdProject(examId);
// "Unit4-Project" -> "Unit 4", "ch3_milestone" -> "Chapter 3", for messages.
const projectUnitLabel = (examId) => {
    const s = String(examId || '');
    const cs = s.match(/^Unit(\d+)-Project$/); if (cs) return `Unit ${cs[1]}`;
    const wd = s.match(/^ch(\d+)_milestone$/); if (wd) return `Chapter ${wd[1]}`;
    return 'this';
};

async function hasProjectUpload(connection, studentId, examId) {
    const [rows] = await connection.execute(
        'SELECT 1 FROM exam_attempts WHERE student_id = ? AND exam_id = ? LIMIT 1', [studentId, examId]);
    return rows.length > 0;
}

// Writes the project's aggregate to the gradebook when it's ready; otherwise
// leaves the gradebook alone (pending). Never deletes a score here -- a grade
// the teacher typed in by hand always stays. Returns { posted, reason }.
async function syncCsProjectGrade(connection, studentId, examId) {
    const [[agg]] = await connection.execute(
        'SELECT peer_score, aggregate_score, max_score FROM project_grade_aggregates WHERE student_id = ? AND exam_id = ? LIMIT 1',
        [studentId, examId]);
    const uploaded = await hasProjectUpload(connection, studentId, examId);
    const peerReviewed = !!agg && agg.peer_score !== null;
    if (!uploaded || !peerReviewed) {
        const missing = [!uploaded && 'an uploaded project file', !peerReviewed && 'a confirmed peer review'].filter(Boolean);
        return { posted: false, reason: `Pending: needs ${missing.join(' and ')}.` };
    }
    await connection.execute(
        `INSERT INTO responses (student_id, exam_id, score, total_points, timestamp) VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW()`,
        [studentId, examId, agg.aggregate_score, agg.max_score]);
    // An AS student following Web 2 (Itzel): copy the project grade into her
    // AS gradebook (server/lib/asStudentPlan.js; required here, not at the top,
    // because that file loads after this one).
    try { await require('./asStudentPlan').syncProjectCopy(connection, studentId, examId); }
    catch (e) { console.error('[project gate] AS project copy', e.message); }
    return { posted: true, reason: null };
}

module.exports = { isCsUnitProject, isWdProject, isGatedProject, projectUnitLabel, WD_PROJECT_SQL, GATED_PROJECT_SQL, hasProjectUpload, syncCsProjectGrade };
