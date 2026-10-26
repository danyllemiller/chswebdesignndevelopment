const express = require('express');
const router = express.Router();
const { withConnection } = require('../db');
const bcrypt = require('bcrypt');
const { getCurrentSchoolYear, requireSelfOrStaff } = require('../helpers');
const fs = require('fs');
const path = require('path');

// Every student needs a personal uploads/<student_id>/ folder for the
// assignment dropbox (server/routes/uploads.js) to write into. Creating it
// here -- the moment the student record itself is created -- means it
// always exists before a student could ever reach the upload form, rather
// than relying on the upload route's own mkdir on first write.
// Plain 0o755: the dropbox route runs in this same Node process, so unlike
// the old PHP scripts (which ran as www-data and needed world-write access
// into a folder this process owned) there's no separate OS user that needs
// "other" permission bits here anymore.
function ensureUploadFolder(studentId) {
    try {
        const dir = path.join(__dirname, '..', '..', 'uploads', String(studentId));
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.chmodSync(dir, 0o755);
    } catch (err) {
        console.error(`Could not create upload folder for ${studentId}:`, err.message);
    }
}

const AGENCY_PAY_SCALES = {
    'Intern': 15.00, 'Junior Developer': 20.00, 'Web Developer': 35.00,
    'Senior Developer': 45.00, 'Project Manager': 50.00, 'UI/UX Designer': 38.52, // BLS OEWS May 2025, Nevada median, SOC 15-1255
    'Brand Strategist': 38.00, 'Motion Graphics Designer': 42.00, 'Content Creator': 22.00,
    'Social Media Manager': 24.00, 'Client Relations Manager': 35.00,
    'IT Support Specialist': 27.00, 'Office Manager': 28.00, 'Accountant': 32.00
};

router.get('/admin/roster', async (req, res) => {
    const year = req.query.year || null;
    try {
        const students = await withConnection(async (connection) => {
        const baseSelect = `
            SELECT DISTINCT s.*,
                COALESCE(csc.section_id, csl.section_id, s.section_id)   AS display_period,
                COALESCE(crc.course_name, crl.course_name, '')            AS display_course_name,
                COALESCE(csc.school_year, csl.school_year, s.school_year) AS effective_year,
                pr.title AS payroll_title
            FROM students s
            -- Matching on course_id alone let one row in class_sections fan out
            -- into one roster row per section sharing that course_id (5 CS
            -- periods all share course_id '10003GS') whenever a student's own
            -- course_id happened to equal that shared value instead of being
            -- NULL or a section-specific code -- confirmed live on one student
            -- (Darian Bernal, since corrected) who showed up 5 times, one per
            -- CS period, instead of once. Anchoring to the student's own
            -- section_id too keeps this join 1:1 no matter what course_id ends
            -- up holding.
            LEFT JOIN class_sections csc ON s.course_id = csc.course_id AND s.section_id = csc.section_id
            LEFT JOIN courses        crc ON s.course_id = crc.course_id
            LEFT JOIN class_sections csl ON s.section_id = csl.section_id AND s.course_id IS NULL
            LEFT JOIN courses        crl ON csl.course_id = crl.course_id AND s.course_id IS NULL
            LEFT JOIN pay_roles      pr  ON s.role_id = pr.id`;

        let sql, params = [];
        if (year) {
            sql = `${baseSelect}
                   WHERE COALESCE(csc.school_year, csl.school_year, s.school_year) = ?
                   ORDER BY s.last_name ASC, s.first_name ASC`;
            params = [year];
        } else {
            // A student must clear ALL THREE checks to appear in the default
            // view: their own archived flag, and (if matched) their section's
            // archived flag via either join path. This used to be OR'd
            // together, which meant an active class_sections match alone kept
            // a student visible even after explicitly archiving them via
            // /admin/archive-students (students.archived = 1) -- the
            // per-student archive button silently had no effect for anyone
            // still enrolled in a non-archived section, which is nearly
            // everyone it's ever used on.
            sql = `${baseSelect}
                   WHERE (s.archived IS NULL OR s.archived = 0)
                     AND (csc.archived IS NULL OR csc.archived = 0)
                     AND (csl.archived IS NULL OR csl.archived = 0)
                   ORDER BY s.last_name ASC, s.first_name ASC`;
        }
        const [students] = await connection.execute(sql, params);

        // Attach each student's additional (non-primary) sections, e.g. an
        // Intervention student who is also physically enrolled in a real
        // CS/WD1 period. Grading stays tied to the primary section_id above
        // — this is purely for roster/attendance-style lookups.
        const [extra] = await connection.execute(`
            SELECT sas.student_id, sas.section_id, COALESCE(c.course_name, '') AS course_name
            FROM student_additional_sections sas
            LEFT JOIN class_sections cs ON sas.section_id = cs.section_id
            LEFT JOIN courses c ON cs.course_id = c.course_id
        `);
        const extraByStudent = {};
        extra.forEach(r => {
            if (!extraByStudent[r.student_id]) extraByStudent[r.student_id] = [];
            extraByStudent[r.student_id].push({ section_id: r.section_id, course_name: r.course_name });
        });
        students.forEach(s => { s.additional_sections = extraByStudent[s.student_id] || []; });
        return students;
        });
        res.json(students);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch roster.' }); }
});

// GET /admin/student-sections?student_id=X — additional (non-primary) sections for one student
// This path is one of the three GET-only exemptions from api.js's blanket
// /admin/* staff gate (it's called by every logged-in student session, not
// just teachers -- see that file's comment), which had left it with no
// auth check of its own at all: a fully anonymous request could read any
// student's extra-period enrollment. requireSelfOrStaff scopes it back to
// "your own sections, or a staff session looking up anyone's" -- matching
// how every real caller (auth-guard.js, dashboard.js, timeclock.js) already
// only ever asks for its own logged-in user's student_id; only the admin
// roster page looks up other students', and that's a staff session.
router.get('/admin/student-sections', requireSelfOrStaff('student_id'), async (req, res) => {
    const studentId = req.query.student_id;
    if (!studentId) return res.status(400).json({ error: 'student_id is required' });
    try {
        const rows = await withConnection(async (connection) => {
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS student_additional_sections (
                  student_id VARCHAR(50) NOT NULL,
                  section_id VARCHAR(50) NOT NULL,
                  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (student_id, section_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            const [rows] = await connection.execute(
                `SELECT sas.section_id, COALESCE(c.course_name, '') AS course_name
                 FROM student_additional_sections sas
                 LEFT JOIN class_sections cs ON sas.section_id = cs.section_id
                 LEFT JOIN courses c ON cs.course_id = c.course_id
                 WHERE sas.student_id = ?`,
                [studentId]
            );
            return rows;
        });
        res.json(rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch student sections' }); }
});

// POST /admin/set-student-sections — { student_id, section_ids: [...] }
// Replaces the full set of additional sections for a student in one call,
// matching how a multi-select list naturally reports its selection.
router.post('/admin/set-student-sections', async (req, res) => {
    const { student_id, section_ids } = req.body || {};
    if (!student_id || !Array.isArray(section_ids)) {
        return res.status(400).json({ error: 'student_id and section_ids array are required' });
    }
    try {
        await withConnection(async (connection) => {
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS student_additional_sections (
                  student_id VARCHAR(50) NOT NULL,
                  section_id VARCHAR(50) NOT NULL,
                  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (student_id, section_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            await connection.execute('DELETE FROM student_additional_sections WHERE student_id = ?', [student_id]);
            for (const sid of section_ids) {
                const clean = String(sid).trim();
                if (!clean) continue;
                await connection.execute(
                    'INSERT IGNORE INTO student_additional_sections (student_id, section_id) VALUES (?, ?)',
                    [student_id, clean]
                );
            }
        });
        res.json({ success: true, count: section_ids.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save student sections' });
    }
});

router.get('/admin/sections', async (req, res) => {
    const year = req.query.year || null;
    try {
        const sections = await withConnection((connection) => {
            let sql = `SELECT cs.section_id, cs.course_id, cs.school_year, cs.archived, cs.permanent,
                              COALESCE(c.course_name, '') AS course_name
                       FROM class_sections cs
                       LEFT JOIN courses c ON cs.course_id = c.course_id`;
            const params = [];
            if (year) { sql += ' WHERE cs.school_year = ?'; params.push(year); }
            else { sql += ' WHERE cs.archived = 0'; }
            sql += ' ORDER BY cs.section_id ASC, c.course_name ASC';
            return connection.execute(sql, params).then(([sections]) => sections);
        });
        res.json(sections);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch class section catalog.' }); }
});

router.get('/admin/school-years', async (req, res) => {
    try {
        const rows = await withConnection((connection) => connection.execute(
            `SELECT DISTINCT school_year FROM (
                SELECT school_year FROM class_sections WHERE school_year IS NOT NULL
                UNION
                SELECT school_year FROM students WHERE school_year IS NOT NULL
             ) combined ORDER BY school_year DESC`
        ).then(([rows]) => rows));
        res.json(rows.map(r => r.school_year).filter(Boolean));
    } catch (err) { res.status(500).json({ error: 'Failed to fetch school years' }); }
});

router.post('/admin/archive-year', async (req, res) => {
    const { school_year } = req.body || {};
    if (!school_year) return res.status(400).json({ error: 'school_year is required' });
    try {
        const { s, u } = await withConnection(async (connection) => {
            const [s] = await connection.execute(
                'UPDATE class_sections SET archived = 1 WHERE school_year = ? AND permanent = 0', [school_year]
            );
            const [u] = await connection.execute(
                'UPDATE students SET archived = 1 WHERE school_year = ? AND section_id NOT IN (SELECT section_id FROM class_sections WHERE permanent = 1)', [school_year]
            );
            return { s, u };
        });
        res.json({ success: true, school_year, sections: s.affectedRows, students: u.affectedRows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to archive year' }); }
});

router.post('/admin/archive-students', async (req, res) => {
    const { student_ids } = req.body || {};
    if (!Array.isArray(student_ids) || student_ids.length === 0)
        return res.status(400).json({ error: 'student_ids array is required' });
    try {
        const affectedRows = await withConnection((connection) => {
            const placeholders = student_ids.map(() => '?').join(',');
            return connection.execute(
                `UPDATE students SET archived = 1 WHERE student_id IN (${placeholders})`, student_ids
            ).then(([result]) => result.affectedRows);
        });
        res.json({ success: true, archivedCount: affectedRows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to archive students' }); }
});

router.post('/admin/sections', async (req, res) => {
    const { section_id, course_id, course_name } = req.body || {};
    if (!section_id) return res.status(400).json({ error: 'section_id is required' });
    if (!course_id)  return res.status(400).json({ error: 'course_id is required' });
    const sid   = String(section_id).trim();
    const cid   = String(course_id).trim();
    const cname = course_name ? String(course_name).trim() : cid;
    const year  = getCurrentSchoolYear();
    try {
        await withConnection(async (connection) => {
            await connection.execute(
                'INSERT INTO courses (course_id, course_name, department) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE course_name = VALUES(course_name)',
                [cid, cname, '']
            );
            await connection.execute(
                'INSERT IGNORE INTO class_sections (section_id, course_id, school_year, archived) VALUES (?, ?, ?, 0)',
                [sid, cid, year]
            );
        });
        res.json({ success: true, section_id: sid, school_year: year });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.put('/admin/sections/:section_id', async (req, res) => {
    const sid = String(req.params.section_id || '').trim();
    const cid = String(req.query.course_id || '').trim();
    const { course_name, school_year } = req.body || {};
    if (!sid || !cid) return res.status(400).json({ error: 'section_id and course_id required' });
    try {
        const outcome = await withConnection(async (connection) => {
            const [pRows] = await connection.execute(
                'SELECT permanent FROM class_sections WHERE section_id = ? AND course_id = ?', [sid, cid]
            );
            if (pRows.length > 0 && pRows[0].permanent === 1 && school_year !== undefined) {
                return { status: 403, body: { error: 'School year cannot be changed for permanent sections.' } };
            }
            if (school_year !== undefined) {
                await connection.execute(
                    'UPDATE class_sections SET school_year = ? WHERE section_id = ? AND course_id = ?',
                    [String(school_year).trim(), sid, cid]
                );
            }
            if (course_name !== undefined) {
                await connection.execute(
                    'UPDATE courses SET course_name = ? WHERE course_id = ?',
                    [String(course_name).trim(), cid]
                );
            }
            return { status: 200, body: { success: true } };
        });
        res.status(outcome.status).json(outcome.body);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/admin/sections/:section_id', async (req, res) => {
    const sid = String(req.params.section_id || '').trim();
    const cid = String(req.query.course_id || '').trim();
    if (!sid) return res.status(400).json({ error: 'section_id required' });
    try {
        const outcome = await withConnection(async (connection) => {
            const [permRows] = await connection.execute(
                'SELECT permanent FROM class_sections WHERE section_id = ?' + (cid ? ' AND course_id = ?' : ''),
                cid ? [sid, cid] : [sid]
            );
            if (permRows.some(r => r.permanent === 1)) {
                return { status: 403, body: { error: `"${sid}" is a permanent section and cannot be deleted.` } };
            }
            const [rows] = await connection.execute(
                'SELECT COUNT(*) AS cnt FROM students WHERE section_id = ?', [sid]
            );
            if (rows[0].cnt > 0) {
                return { status: 409, body: { error: `Cannot delete — ${rows[0].cnt} student(s) still enrolled in period ${sid}.` } };
            }
            const sql = cid ? 'DELETE FROM class_sections WHERE section_id = ? AND course_id = ?' : 'DELETE FROM class_sections WHERE section_id = ?';
            await connection.execute(sql, cid ? [sid, cid] : [sid]);
            return { status: 200, body: { success: true } };
        });
        res.status(outcome.status).json(outcome.body);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Extra classes a student is in beyond their main one. source says where the row
// came from: 'manual' (picked on the roster page; every row from before
// 2026-10-26 counts as manual) or 'upload' (a roster file listed the student there).
async function ensureAdditionalSections(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS student_additional_sections (
          student_id VARCHAR(50) NOT NULL,
          section_id VARCHAR(50) NOT NULL,
          added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (student_id, section_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await connection.execute("ALTER TABLE student_additional_sections ADD COLUMN IF NOT EXISTS source VARCHAR(10) NOT NULL DEFAULT 'manual'");
}

router.post('/admin/upload-roster', async (req, res) => {
    let students = req.body;
    if (!students) return res.status(400).json({ error: 'Roster payload is required.' });
    if (!Array.isArray(students)) students = [students];

    // Archiving "anyone missing from this payload" is only safe when the
    // payload IS the full current roster (the CSV bulk-upload flow). The
    // single "Add Student" form posts here too with just one student --
    // without this flag it would read as "everyone else just dropped out."
    // Opt-in and defaults to off on purpose so a future caller can't
    // reintroduce the same mistake by omission.
    const archiveMissing = req.query.archiveMissing === 'true';
    // dryRun: work out every change and send back the list without touching
    // anything, so the roster page can show it for the teacher to approve first.
    const dryRun = req.query.dryRun === 'true';

    const cleaned = students
        .map((s) => ({
            student_id: String(s.student_id || s.studentId || '').trim(),
            first_name:  String(s.first_name  || s.firstName  || '').trim() || null,
            last_name:   String(s.last_name   || s.lastName   || '').trim() || null,
            course_id:   String(s.course_id   || s.courseId   || '').trim() || null,
            section_id:  String(s.section_id  || s.sectionId  || s.section || s.period || '').trim() || null
        }))
        .filter((s) => s.student_id);

    if (cleaned.length === 0) return res.status(400).json({ error: 'At least one student record with student_id is required.' });

    try {
        const result = await withConnection(async (connection) => {
        const [catalogRows] = await connection.execute('SELECT section_id, course_id, archived FROM class_sections');
        const validSectionIds = new Set(), sectionsByCourse = new Map();
        for (const r of catalogRows) {
            const sid = String(r.section_id).trim(), cid = String(r.course_id || '').trim();
            validSectionIds.add(sid);
            if (cid && !Number(r.archived)) sectionsByCourse.set(cid, [...(sectionsByCourse.get(cid) || []), sid]);
        }
        // The school's system gives every class period its own ID (10003GF-301,
        // 10003GF-401, ...), while the section list holds the gradebook's course
        // IDs (all five Comp Sci periods are 10003GS). Earlier uploads stored the
        // school's ID on each student, so a school ID's period is where most of
        // the students carrying it are now (2026-10-26: every ID in the teacher's
        // roster file was "unknown" and the upload never left the page).
        const [learnedRows] = await connection.execute(
            `SELECT course_id, section_id, COUNT(*) AS n FROM students
             WHERE COALESCE(archived, 0) = 0 AND course_id IS NOT NULL AND course_id <> ''
             GROUP BY course_id, section_id ORDER BY n DESC`);
        const learned = new Map();
        for (const r of learnedRows) {
            const cid = String(r.course_id).trim(), sid = String(r.section_id).trim();
            if (!learned.has(cid) && validSectionIds.has(sid)) learned.set(cid, sid);
        }

        // A period named in the file wins; then a course ID only one period uses;
        // then the school ID's period. A course ID several periods share needs the period.
        const resolved = [], invalid = new Set(), shared = new Set();
        for (const s of cleaned) {
            const secs = s.course_id ? sectionsByCourse.get(s.course_id) : null;
            if (s.section_id && validSectionIds.has(s.section_id)) resolved.push(s);
            else if (secs && secs.length === 1) resolved.push({ ...s, section_id: secs[0] });
            else if (s.course_id && learned.has(s.course_id)) resolved.push({ ...s, section_id: learned.get(s.course_id) });
            else if (secs) shared.add(`${s.course_id} (${secs.join(', ')})`);
            else invalid.add(s.course_id || s.section_id || '(empty)');
        }
        if (shared.size || invalid.size) {
            const why = [];
            if (shared.size) why.push(`More than one period uses ${[...shared].join('; ')}, so the file has to say which period each student is in: add a Period column (the 5th column).`);
            if (invalid.size) why.push(`Unknown course IDs: ${[...invalid].join(', ')}. Add them to the right period under Sections, or add a Period column.`);
            return { status: 400, body: { error: why.join(' '), invalid: [...invalid] } };
        }

        // Table changes commit on their own in MySQL, so they go before the transaction.
        await ensureAdditionalSections(connection);
        const year = getCurrentSchoolYear();

        // Snapshot who's currently active BEFORE the upsert below touches
        // anything, so "missing from this file" is judged against the roster
        // as it stood at the start of the upload, not a moving target. Only
        // computed at all when archiveMissing is set -- see note above.
        let missingIds = [];
        if (archiveMissing) {
            const [activeRows] = await connection.execute(
                `SELECT student_id FROM students
                 WHERE (archived IS NULL OR archived = 0) AND school_year = ?
                   AND (role IS NULL OR LOWER(role) <> 'teacher') AND section_id <> 'Teacher'`,
                [year]
            );
            const uploadedIds = new Set(resolved.map((s) => s.student_id));
            missingIds = activeRows.map((r) => r.student_id).filter((id) => !uploadedIds.has(id));
        }

        const [existingRows] = await connection.execute('SELECT student_id, section_id, first_name, last_name, archived FROM students');
        const existing = new Map(existingRows.map((r) => [r.student_id, r.section_id]));
        const before = new Map(existingRows.map((r) => [r.student_id, r]));
        const [extraRows] = await connection.execute('SELECT student_id, section_id, source FROM student_additional_sections');

        // A student in more than one of these classes is listed once per class
        // (2026-10-26). They keep every class: their main class (section_id)
        // stays the one they have now if the file still lists it, otherwise the
        // first one listed, and the rest become additional sections. Before
        // this, each row overwrote the last and the student kept only one class.
        const byStudent = new Map();
        for (const s of resolved) {
            const e = byStudent.get(s.student_id);
            if (!e) byStudent.set(s.student_id, { ...s, sections: [s.section_id], courseOf: { [s.section_id]: s.course_id } });
            else if (!e.sections.includes(s.section_id)) { e.sections.push(s.section_id); e.courseOf[s.section_id] = s.course_id; }
        }

        // What this upload changes, in words the roster page can show before anything happens.
        const nameOf = (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.student_id;
        const plan = { added: [], returning: [], moved: [], multi: [], leaving: [], dropped: [] };
        for (const s of byStudent.values()) {
            const was = before.get(s.student_id), main = s.sections.includes(was?.section_id) ? was.section_id : s.sections[0];
            const extra = s.sections.filter((x) => x !== main), who = nameOf(s);
            if (!was) plan.added.push({ name: who, sections: s.sections });
            else if (Number(was.archived) === 1) plan.returning.push({ name: who, sections: s.sections });
            else if (was.section_id !== main) plan.moved.push({ name: who, from: was.section_id, to: main });
            if (was && archiveMissing) {
                for (const x of extraRows) if (x.student_id === s.student_id && x.source === 'upload' && x.section_id !== main && !extra.includes(x.section_id)) plan.leaving.push({ name: who, section: x.section_id });
            }
            if (extra.length) plan.multi.push({ name: who, sections: s.sections });
        }
        for (const id of missingIds) { const r = before.get(id); plan.dropped.push({ name: r ? nameOf(r) : id, section: r?.section_id || '' }); }
        if (dryRun) return { status: 200, body: { success: true, dryRun: true, plan } };

        await connection.beginTransaction();
        try {
        const stmt = `INSERT INTO students (student_id, first_name, last_name, section_id, course_id, role, school_year, archived)
                      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
                      ON DUPLICATE KEY UPDATE
                        first_name = VALUES(first_name), last_name = VALUES(last_name),
                        section_id = VALUES(section_id), course_id = VALUES(course_id),
                        role = VALUES(role), school_year = VALUES(school_year), archived = 0`;
        let created = 0, updated = 0, multiClass = 0;
        for (const s of byStudent.values()) {
            const cur = existing.get(s.student_id);
            const main = s.sections.includes(cur) ? cur : s.sections[0];
            const extra = s.sections.filter((x) => x !== main);
            const role = main === 'Teacher' ? 'teacher' : 'student';
            await connection.execute(stmt, [s.student_id, s.first_name, s.last_name, main, s.courseOf[main], role, year]);
            if (existing.has(s.student_id)) { updated++; } else { created++; ensureUploadFolder(s.student_id); }
            await connection.execute('DELETE FROM student_additional_sections WHERE student_id = ? AND section_id = ?', [s.student_id, main]);
            for (const x of extra) {
                await connection.execute("INSERT IGNORE INTO student_additional_sections (student_id, section_id, source) VALUES (?, ?, 'upload')", [s.student_id, x]);
            }
            // The full roster drops an additional class an earlier upload added
            // that this file no longer lists. Ones added by hand on the roster
            // page (source 'manual', e.g. dual-enrolled students) always stay.
            if (archiveMissing) {
                const keep = extra.length ? extra : [''];
                await connection.execute(
                    `DELETE FROM student_additional_sections WHERE student_id = ? AND source = 'upload' AND section_id NOT IN (${keep.map(() => '?').join(',')})`,
                    [s.student_id, ...keep]
                );
            }
            if (extra.length) multiClass++;
        }

        // Anyone active before this upload but absent from the new file is
        // no longer on the current roster -- archived (not deleted), which
        // hides them and keeps every record intact.
        let archived = 0;
        if (missingIds.length > 0) {
            const placeholders = missingIds.map(() => '?').join(',');
            const [archiveResult] = await connection.execute(
                `UPDATE students SET archived = 1 WHERE student_id IN (${placeholders})`,
                missingIds
            );
            archived = archiveResult.affectedRows;
        }

        await connection.commit();
        return { status: 200, body: { success: true, count: cleaned.length, created, updated, archived, multiClass } };
        } catch (txErr) {
            await connection.rollback();
            throw txErr;
        }
        });
        res.status(result.status).json(result.body);
    } catch (err) {
        console.error(err && err.stack ? err.stack : err);
        res.status(500).json({ error: 'Failed to upload roster.' });
    }
});

router.post('/admin/reset-student', async (req, res) => {
    const { student_id } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id is required.' });
    try {
        const affectedRows = await withConnection((connection) => connection.execute(
            'UPDATE students SET username = NULL, password = NULL, password_hash = NULL WHERE student_id = ?',
            [student_id]
        ).then(([result]) => result.affectedRows));
        if (affectedRows === 0) return res.status(404).json({ error: 'Student not found.' });
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to reset student.' }); }
});

router.get('/admin/student', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        // pay_roles (keyed by students.role_id) is the real, live payroll table --
        // also used by payroll.js for actual paycheck calculations. This used to
        // join a "payroll_roster" table that was never actually created, which
        // made this endpoint 500 on every call.
        const rows = await withConnection((connection) => connection.execute(
            `SELECT s.student_id, s.first_name, s.last_name, s.username, s.section_id, s.role, s.archived,
                    COALESCE(pr.title, 'Intern') AS payroll_title, COALESCE(pr.hourly_rate, 15.00) AS hourly_rate
             FROM students s LEFT JOIN pay_roles pr ON s.role_id = pr.id
             WHERE s.student_id = ? LIMIT 1`, [student_id]
        ).then(([rows]) => rows));
        if (rows.length === 0) return res.status(404).json({ error: 'Student not found' });
        res.json(rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch student' }); }
});

router.post('/admin/save-student', async (req, res) => {
    const { student_id, first_name, last_name, username, section_id, role, password, payroll_title, payroll_effective_date, archived } = req.body || {};
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const outcome = await withConnection(async (connection) => {
            if (section_id && String(section_id).trim().length > 0) {
                const [sections] = await connection.execute('SELECT section_id FROM class_sections WHERE section_id = ?', [section_id]);
                if (sections.length === 0) {
                    return { status: 400, body: { error: 'Invalid section_id' } };
                }
            }
            const [existing] = await connection.execute('SELECT student_id FROM students WHERE student_id = ?', [student_id]);
            if (existing.length === 0) {
                return { status: 404, body: { error: 'Student not found' } };
            }
            const updates = [], params = [];
            if (first_name !== undefined) { updates.push('first_name = ?'); params.push(first_name); }
            if (last_name  !== undefined) { updates.push('last_name = ?');  params.push(last_name); }
            if (username   !== undefined) { updates.push('username = ?');   params.push(username || null); }
            if (section_id !== undefined) { updates.push('section_id = ?'); params.push(section_id || null); }
            if (role       !== undefined) { updates.push('role = ?');       params.push(role); }
            // The individual edit form previously had no way to un-archive a
            // student at all -- only bulk actions (archive-students/archive-year)
            // could set the flag, none could clear it, so a student assigned a
            // new section while still archived would keep their new section_id
            // (it really did save) but stay invisible everywhere that filters
            // archived IS NULL OR archived = 0, making the edit look like it
            // silently failed no matter how many times it was repeated.
            if (archived !== undefined) { updates.push('archived = ?'); params.push(archived ? 1 : 0); }
            if (password !== undefined && password !== null && String(password).length > 0) {
                const hash = await bcrypt.hash(String(password), 10);
                updates.push('password = ?', 'password_hash = ?');
                params.push(hash, hash);
            }
            if (updates.length === 0) {
                return { status: 400, body: { error: 'No update fields provided' } };
            }
            params.push(student_id);
            const [result] = await connection.execute(`UPDATE students SET ${updates.join(', ')} WHERE student_id = ?`, params);

            // pay_roles is the real payroll table (keyed by students.role_id) --
            // this used to insert into a "payroll_roster" table that was never
            // actually created, which threw AFTER the update above had already
            // committed, so the save looked like it failed (500, no roster
            // refresh) even though the real change had already gone through.
            //
            // Only writes a new student_role_history row (payroll's real,
            // date-aware source of truth) when the title is actually changing --
            // the edit modal always submits payroll_title on every save, so
            // without this check saving an unrelated field (name, section...)
            // would spam a new no-op history row every time.
            if (payroll_title && AGENCY_PAY_SCALES[payroll_title] !== undefined) {
                const rate = AGENCY_PAY_SCALES[payroll_title];
                await connection.execute(
                    `INSERT INTO pay_roles (title, hourly_rate) VALUES (?, ?)
                     ON DUPLICATE KEY UPDATE hourly_rate = VALUES(hourly_rate)`,
                    [payroll_title, rate]
                );
                const [roleRows] = await connection.execute('SELECT id FROM pay_roles WHERE title = ?', [payroll_title]);
                const [[currentRole]] = await connection.execute(
                    `SELECT r.id, r.title FROM students s LEFT JOIN pay_roles r ON s.role_id = r.id WHERE s.student_id = ?`,
                    [student_id]
                );
                if (roleRows.length > 0 && (!currentRole || currentRole.title !== payroll_title)) {
                    const newRoleId = roleRows[0].id;
                    const effectiveDate = (payroll_effective_date && /^\d{4}-\d{2}-\d{2}$/.test(payroll_effective_date))
                        ? payroll_effective_date
                        : new Date().toISOString().split('T')[0];
                    await connection.execute('UPDATE students SET role_id = ? WHERE student_id = ?', [newRoleId, student_id]);
                    await connection.execute(
                        'INSERT INTO student_role_history (student_id, role_id, effective_date) VALUES (?, ?, ?)',
                        [student_id, newRoleId, effectiveDate]
                    );
                }
            }
            return { status: 200, body: { success: true, affectedRows: result.affectedRows } };
        });
        res.status(outcome.status).json(outcome.body);
    } catch (err) {
        console.error(err && err.stack ? err.stack : err);
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'That username is already taken by another student.' });
        }
        res.status(500).json({ error: 'Failed to save student' });
    }
});

router.delete('/admin/delete-student', async (req, res) => {
    const { student_id } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id is required.' });
    try {
        const affectedRows = await withConnection((connection) => connection.execute(
            'DELETE FROM students WHERE student_id = ?', [student_id]
        ).then(([result]) => result.affectedRows));
        if (affectedRows === 0) return res.status(404).json({ error: 'Student not found.' });
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete student.' }); }
});

router.post('/admin/delete-multiple-students', async (req, res) => {
    const { student_ids } = req.body;
    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0)
        return res.status(400).json({ error: 'student_ids array is required.' });
    try {
        const deletedCount = await withConnection((connection) => {
            const placeholders = student_ids.map(() => '?').join(', ');
            return connection.execute(
                `DELETE FROM students WHERE student_id IN (${placeholders})`, student_ids
            ).then(([result]) => result.affectedRows);
        });
        res.json({ success: true, deletedCount });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete students.' }); }
});

module.exports = router;
