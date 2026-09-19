// server/routes/uploads.js
// Replaces upload.php and manage_files.php -- both PHP endpoints had zero
// identity check at all (any request, from anyone, could write/list/move/
// delete files in ANY student's uploads/{studentId}/ folder just by naming
// that studentId), on top of Access-Control-Allow-Origin: *. Since student
// IDs are short, sequential-looking numbers, that was a live, guessable
// IDOR on a folder that's also the assignment-dropbox write target -- and
// upload.php took the file's extension on faith, so a POST landing a
// "screenshot.php" there was one guess away from the same PHP runtime that
// serves the rest of the site executing it, i.e. a webshell.
//
// This keeps the exact same FormData contract (action/studentId/path/
// oldPath/newPath/file, response shape {success, ...}) so the five existing
// front-end callers only needed their URL constant changed, not their
// request-building logic.
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { getDbConnection } = require('../db');
const { requireSelfOrStaff, isSelfOrStaffSession } = require('../helpers');

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');

// Extensions a web server could execute instead of just serving as a static
// asset. Everything else (html/css/js/images/pdf/zip/...) is fair game --
// this is a web-dev class assignment dropbox, an allowlist would reject
// half of what students legitimately turn in.
const BLOCKED_EXTENSIONS = new Set([
    'php', 'php3', 'php4', 'php5', 'php7', 'phtml', 'phar', 'pht',
    'cgi', 'pl', 'py', 'rb', 'sh', 'exe', 'bat', 'cmd', 'jsp', 'jspx', 'asp', 'aspx'
]);
// .htaccess in particular could turn on execution for other extensions in
// this same folder (or basic-auth/rewrite its way into other mischief) --
// blocked by exact name since it has no "extension" to catch above.
const BLOCKED_FILENAMES = new Set(['.htaccess', '.htpasswd', 'web.config']);

function isSafeFilename(name) {
    if (BLOCKED_FILENAMES.has(name.toLowerCase())) return false;
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    return !BLOCKED_EXTENSIONS.has(ext);
}

function cleanStudentId(raw) {
    return String(raw || '').replace(/[^A-Za-z0-9_-]/g, '');
}

function ensureStudentRoot(studentId) {
    const dir = path.join(UPLOADS_ROOT, studentId);
    fs.mkdirSync(dir, { recursive: true });
    return fs.realpathSync(dir);
}

// Strips an optional "uploads/{studentId}/" prefix (both conventions are
// used by different front-end callers), blocks ../ traversal and empty
// segments. Returns null for an empty/invalid path.
function safeRelPath(raw, studentId) {
    let p = String(raw || '').replace(/\\/g, '/');
    const prefix = `uploads/${studentId}/`;
    if (p.startsWith(prefix)) p = p.slice(prefix.length);
    p = p.replace(/^\/+/, '');
    const parts = p.split('/').filter(seg => seg !== '' && seg !== '.' && seg !== '..');
    return parts.length ? parts.join('/') : null;
}

// Re-verifies a resolved path is still inside the student's own realpath'd
// folder -- defends against symlink tricks the segment-filtering above
// might miss, same as the old PHP realpath() check.
function isInsideRoot(studentRoot, targetPath) {
    const checkBase = fs.existsSync(targetPath) ? targetPath : path.dirname(targetPath);
    let real;
    try { real = fs.realpathSync(checkBase); } catch (e) { return false; }
    return real === studentRoot || real.startsWith(studentRoot + path.sep);
}

function listFilesRecursive(dir, studentRoot, studentId) {
    let results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(listFilesRecursive(full, studentRoot, studentId));
        } else if (entry.isFile()) {
            const rel = path.relative(studentRoot, full).split(path.sep).join('/');
            const stat = fs.statSync(full);
            results.push({
                path: `uploads/${studentId}/${rel}`,
                name: entry.name,
                url: `/uploads/${studentId}/${rel}`,
                size: stat.size,
                // Both admin/files.js and student-files.js read this back as
                // `.time` (`new Date(f.time * 1000)`) -- the PHP version this
                // replaces actually returned it as `mtime`, a mismatch that's
                // been silently breaking the modified-date column and
                // recency sort in both file managers. Fixed here for free
                // since this is a from-scratch reimplementation of the same
                // response shape anyway.
                time: Math.floor(stat.mtimeMs / 1000)
            });
        }
    }
    return results;
}

// A non-owner/non-staff viewer may still list a student's folder if that
// student (or someone) shared something out of it with them -- the
// peer-to-peer sharing feature in student-files.js opens a classmate's
// whole folder this way. Restricting `list` to strictly self-or-staff would
// silently break that feature, so instead: allow it when a shared_files row
// addressed to the caller points into this specific student's folder.
async function canListFolder(req, studentId) {
    if (isSelfOrStaffSession(req, studentId)) return true;
    const viewerId = req.session?.user?.student_id;
    if (!viewerId) return false;
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT id FROM shared_files WHERE recipient_student_id = ? AND url LIKE ? LIMIT 1`,
            [viewerId, `/uploads/${studentId}/%`]
        );
        await connection.release();
        return rows.length > 0;
    } catch (err) {
        // Table not created yet (nobody has ever shared anything) or a real
        // DB error -- either way, fail closed rather than leaking the folder.
        return false;
    }
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/upload', upload.single('file'), requireSelfOrStaff('studentId'), (req, res) => {
    const studentId = cleanStudentId(req.body.studentId);
    const relPath = studentId ? safeRelPath(req.body.path, studentId) : null;
    if (!studentId || !relPath || !req.file) {
        return res.status(400).json({ success: false, error: 'studentId, path, and file are required' });
    }

    const fileName = relPath.split('/').pop();
    if (!isSafeFilename(fileName)) {
        return res.status(400).json({ success: false, error: 'That file type is not allowed.' });
    }

    try {
        const studentRoot = ensureStudentRoot(studentId);
        const destPath = path.join(studentRoot, relPath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });

        if (!isInsideRoot(studentRoot, path.dirname(destPath))) {
            return res.status(400).json({ success: false, error: 'Invalid path' });
        }

        fs.writeFileSync(destPath, req.file.buffer, { mode: 0o644 });
        res.json({ success: true, path: `uploads/${studentId}/${relPath}` });
    } catch (err) {
        console.error('[uploads] upload failed:', err);
        res.status(500).json({ success: false, error: 'Failed to save file' });
    }
});

router.post('/manage-files', multer().none(), async (req, res) => {
    const action = req.body.action;
    const studentId = cleanStudentId(req.body.studentId);
    if (!studentId) return res.status(400).json({ success: false, error: 'studentId is required' });

    if (action === 'list') {
        if (!(await canListFolder(req, studentId))) return res.status(401).json({ success: false, error: 'Not authorized.' });
    } else if (action === 'move' || action === 'delete') {
        if (!isSelfOrStaffSession(req, studentId)) return res.status(401).json({ success: false, error: 'Not authorized.' });
    } else {
        return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    const studentRoot = ensureStudentRoot(studentId);

    if (action === 'list') {
        try {
            const files = listFilesRecursive(studentRoot, studentRoot, studentId);
            return res.json({ success: true, files });
        } catch (err) {
            console.error('[uploads] list failed:', err);
            return res.status(500).json({ success: false, error: 'Failed to list files' });
        }
    }

    if (action === 'move') {
        const oldRel = safeRelPath(req.body.oldPath, studentId);
        const newRel = safeRelPath(req.body.newPath, studentId);
        const newName = newRel ? newRel.split('/').pop() : null;
        if (!oldRel || !newRel || !newName || !isSafeFilename(newName)) {
            return res.status(400).json({ success: false, error: 'Invalid source or destination path' });
        }
        const oldFull = path.join(studentRoot, oldRel);
        const newFull = path.join(studentRoot, newRel);
        if (!fs.existsSync(oldFull) || !isInsideRoot(studentRoot, oldFull)) {
            return res.status(400).json({ success: false, error: 'Invalid source or destination path' });
        }
        try {
            fs.mkdirSync(path.dirname(newFull), { recursive: true });
            if (!isInsideRoot(studentRoot, path.dirname(newFull))) {
                return res.status(400).json({ success: false, error: 'Invalid source or destination path' });
            }
            fs.renameSync(oldFull, newFull);
            return res.json({ success: true });
        } catch (err) {
            console.error('[uploads] move failed:', err);
            return res.status(500).json({ success: false, error: 'Failed to move' });
        }
    }

    if (action === 'delete') {
        const rel = safeRelPath(req.body.path, studentId);
        if (!rel) return res.status(400).json({ success: false, error: 'Invalid path' });
        const full = path.join(studentRoot, rel);
        if (!fs.existsSync(full) || !isInsideRoot(studentRoot, full)) {
            return res.status(400).json({ success: false, error: 'Invalid path' });
        }
        try {
            fs.rmSync(full, { recursive: true, force: true });
            return res.json({ success: true });
        } catch (err) {
            console.error('[uploads] delete failed:', err);
            return res.status(500).json({ success: false, error: 'Failed to delete' });
        }
    }
});

module.exports = router;
