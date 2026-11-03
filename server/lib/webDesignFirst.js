// Web Design is always a student's main class (the teacher's rule, 2026-11-03). Payroll, groups and the
// rest of the Web Design side go by the main class (students.section_id); every other class a student is
// in -- Computer Science, Intervention -- is an additional one (student_additional_sections), which grades,
// attendance, clock-ins and the student menus already follow. Before this, a student dual-enrolled in CS
// and Web Design 1 kept CS as their main class and was missing from payroll and groups.

// Active Web Design periods (WD1, WD2, WD AS; not the TEST-WD account), section_id -> gradebook course_id
async function webDesignSections(connection) {
    const [rows] = await connection.execute(
        `SELECT cs.section_id, cs.course_id FROM class_sections cs JOIN courses c ON c.course_id = cs.course_id
         WHERE c.course_name LIKE 'WEB DESIGN%' AND cs.course_id NOT LIKE 'TEST%' AND COALESCE(cs.archived, 0) = 0`);
    return new Map(rows.map(r => [String(r.section_id), String(r.course_id)]));
}

// The main class for a student in these classes: a Web Design one (the current main if it already is
// one), otherwise the current main if it's still listed, otherwise the first.
function pickMain(sections, current, wd) {
    if (wd.has(current) && sections.includes(current)) return current;
    return sections.find(x => wd.has(x)) || (sections.includes(current) ? current : sections[0]);
}

// Swaps every active student (or just studentId) whose Web Design class is only an additional one: Web
// Design becomes the main class and the old main class becomes an additional one. Returns the swaps.
async function webDesignFirst(connection, studentId) {
    const wd = await webDesignSections(connection);
    if (!wd.size) return [];
    const [rows] = await connection.execute(
        `SELECT s.student_id, s.section_id, s.course_id, sas.section_id AS extra, sas.source
         FROM students s JOIN student_additional_sections sas ON sas.student_id = s.student_id
         WHERE COALESCE(s.archived, 0) = 0 AND s.section_id <> 'Teacher' AND (s.role IS NULL OR LOWER(s.role) <> 'teacher')
           ${studentId ? 'AND s.student_id = ?' : ''}
         ORDER BY s.student_id, sas.added_at`, studentId ? [String(studentId)] : []);
    const swaps = [], done = new Set();
    for (const r of rows) {
        if (done.has(r.student_id) || wd.has(String(r.section_id)) || !wd.has(String(r.extra))) continue;
        done.add(r.student_id);
        // the course ID the student's new classmates carry (the school's ID, as a roster upload stores it)
        const [[mate]] = await connection.execute(
            `SELECT course_id FROM students WHERE section_id = ? AND COALESCE(archived, 0) = 0 AND course_id IS NOT NULL AND course_id <> ''
             GROUP BY course_id ORDER BY COUNT(*) DESC LIMIT 1`, [r.extra]);
        await connection.execute('UPDATE students SET section_id = ?, course_id = ? WHERE student_id = ?',
            [r.extra, mate?.course_id || wd.get(String(r.extra)), r.student_id]);
        await connection.execute('DELETE FROM student_additional_sections WHERE student_id = ? AND section_id = ?', [r.student_id, r.extra]);
        if (r.section_id) {
            await connection.execute('INSERT IGNORE INTO student_additional_sections (student_id, section_id, source) VALUES (?, ?, ?)',
                [r.student_id, r.section_id, r.source || 'manual']);
        }
        swaps.push({ student_id: r.student_id, from: r.section_id, to: r.extra });
    }
    return swaps;
}

module.exports = { webDesignSections, pickMain, webDesignFirst };
