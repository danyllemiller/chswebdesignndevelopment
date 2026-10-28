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
const { withConnection } = require('../db');
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
        const rows = await withConnection((connection) => connection.execute(
            `SELECT id FROM shared_files WHERE recipient_student_id = ? AND url LIKE ? LIMIT 1`,
            [viewerId, `/uploads/${studentId}/%`]
        ).then(([rows]) => rows));
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

// GET /student/files-zip?studentId= -- "Download all my files" (student/files.html): the student's whole folder
// as one .zip, so they can keep their work in Google Drive when the semester ends. Built while it streams:
// one file at a time is read and compressed off the main thread, so a big folder neither fills memory nor
// stalls the site for anyone else.
const zlib = require('zlib');
const deflateRaw = require('util').promisify(zlib.deflateRaw);
const dosTime = d => ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
const dosDate = d => (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
router.get('/student/files-zip', requireSelfOrStaff('studentId'), async (req, res) => {
    const studentId = cleanStudentId(req.query.studentId);
    const root = studentId && path.join(UPLOADS_ROOT, studentId);
    if (!root || !fs.existsSync(root)) return res.status(404).json({ error: 'There are no files in your folder yet.' });
    const files = [];
    (function walk(dir) {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) walk(full);
            else if (e.isFile() && !/^(\.DS_Store|Thumbs\.db)$|^\._/.test(e.name)) files.push(full);
        }
    })(root);
    if (!files.length) return res.status(404).json({ error: 'There are no files in your folder yet.' });
    const total = files.reduce((n, f) => n + fs.statSync(f).size, 0);
    if (files.length > 60000 || total > 1.5 * 1024 ** 3) return res.status(413).json({ error: 'Your folder is too big to download in one piece. Ask your teacher for help.' });
    // ?check=1: the page asks first, so an empty or too-big folder gets a message on the page, not a failed download
    if (req.query.check) return res.json({ files: files.length, bytes: total });

    res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="my-class-files-${new Date().toISOString().slice(0, 10)}.zip"`, 'Cache-Control': 'no-store' });
    let offset = 0;
    const central = [];
    // Waits for the browser to catch up, or for it to go away: a closed tab never sends 'drain', so without
    // 'close' an abandoned download would sit here forever holding its buffers.
    const caughtUp = () => new Promise(ok => {
        const done = () => { res.off('drain', done); res.off('close', done); ok(); };
        res.on('drain', done).on('close', done);
    });
    const write = async buf => {
        if (res.destroyed) throw new Error('the download was stopped');
        offset += buf.length;
        if (!res.write(buf)) await caughtUp();
    };
    try {
        for (const full of files) {
            const data = await fs.promises.readFile(full), mtime = (await fs.promises.stat(full)).mtime;
            const name = Buffer.from('My class files/' + path.relative(root, full).split(path.sep).join('/'), 'utf8');
            const packed = await deflateRaw(data), deflate = packed.length < data.length, body = deflate ? packed : data;
            const crc = zlib.crc32(data), method = deflate ? 8 : 0, t = dosTime(mtime), d = dosDate(mtime);
            const local = Buffer.alloc(30);
            local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(method, 8);
            local.writeUInt16LE(t, 10); local.writeUInt16LE(d, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18);
            local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
            const at = offset;
            await write(local); await write(name); await write(body);
            const cd = Buffer.alloc(46);
            cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8); cd.writeUInt16LE(method, 10);
            cd.writeUInt16LE(t, 12); cd.writeUInt16LE(d, 14); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(body.length, 20);
            cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(name.length, 28); cd.writeUInt32LE(at, 42);
            central.push(cd, name);
        }
        const start = offset;
        for (const b of central) await write(b);
        const end = Buffer.alloc(22);
        end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
        end.writeUInt32LE(offset - start, 12); end.writeUInt32LE(start, 16);
        res.end(end);
    } catch (err) {
        if (res.destroyed) return;   // the student closed the tab or cancelled: nothing went wrong
        console.error('[uploads] zip failed:', err);
        res.destroy(err);   // headers are already sent: cut it off so the browser shows a failed download, not a broken zip
    }
});

module.exports = router;
