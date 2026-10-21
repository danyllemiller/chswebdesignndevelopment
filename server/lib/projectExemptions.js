// server/lib/projectExemptions.js
// Students excused from ALL CS Unit Projects. A Unit Project normally has to
// be complete (self + peer review) before that unit's exam unlocks (see
// checkUnitPrerequisite in server/routes/gradebook.js and the matching gate
// in js/cs-interactive.js). Students listed here skip that requirement on
// every unit, and /student/project-aggregate reports their projects as
// excused so the workspace unlocks too. Their Unit Project grades are
// entered as EX in the gradebook.
const PROJECT_EXEMPT_STUDENTS = new Map([
    // Claudia Casarez (B4): enrolled 2026-10-21, too late in the semester to
    // finish the unit projects before December.
    ['8012529', 'Joined 2026-10-21; excused from all unit projects'],
]);

const isProjectExempt = studentId => PROJECT_EXEMPT_STUDENTS.has(String(studentId || ''));

module.exports = { PROJECT_EXEMPT_STUDENTS, isProjectExempt };
