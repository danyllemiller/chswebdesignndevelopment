// server/routes/shortlinks.js
// Self-hosted URL shortener living at /go/* on this same domain. Separate,
// deliberately simple password gate (env var, not the main teacher/student
// login) since it's meant to be low-friction to use.
const express = require('express');
const path = require('path');
const router = express.Router();
const { getDbConnection } = require('../db');

const RESERVED_SLUGS = new Set(['admin', 'api', 'new', 'login', 'logout', 'go', 'edit', 'delete']);
const SLUG_RE = /^[a-z0-9-]+$/;

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS short_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(80) NOT NULL UNIQUE,
    destination_url TEXT NOT NULL,
    note VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

async function ensureTable(connection) {
  await connection.execute(CREATE_TABLE_SQL);
}

// ── Login rate limiting ──────────────────────────────────────────────────
// In-memory is fine here: single admin, single process, and a restart
// clearing the counters is a non-issue for a tool nobody but the teacher uses.
const loginAttempts = new Map(); // ip -> { count, lockedUntil }
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

function isLockedOut(ip) {
  const rec = loginAttempts.get(ip);
  if (!rec || !rec.lockedUntil) return false;
  if (Date.now() < rec.lockedUntil) return true;
  loginAttempts.delete(ip);
  return false;
}
function recordFailedAttempt(ip) {
  const rec = loginAttempts.get(ip) || { count: 0, lockedUntil: null };
  rec.count++;
  if (rec.count >= MAX_ATTEMPTS) rec.lockedUntil = Date.now() + LOCKOUT_MS;
  loginAttempts.set(ip, rec);
}
function clearAttempts(ip) { loginAttempts.delete(ip); }

function requireShortlinkAuth(req, res, next) {
  if (req.session && req.session.shortlinkAdmin) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

// ── Admin page ───────────────────────────────────────────────────────────
router.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../go-admin.html'));
});

// ── Auth ─────────────────────────────────────────────────────────────────
router.post('/admin/api/login', (req, res) => {
  const ip = req.ip;
  if (isLockedOut(ip)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  }
  const realPassword = process.env.SHORTLINK_ADMIN_PASSWORD;
  if (!realPassword) {
    return res.status(500).json({ error: 'Server not configured: SHORTLINK_ADMIN_PASSWORD is not set.' });
  }
  const { password } = req.body || {};
  if (password && password === realPassword) {
    clearAttempts(ip);
    req.session.shortlinkAdmin = true;
    return res.json({ success: true });
  }
  recordFailedAttempt(ip);
  return res.status(401).json({ error: 'Wrong password.' });
});

router.post('/admin/api/logout', (req, res) => {
  if (req.session) req.session.shortlinkAdmin = false;
  res.json({ success: true });
});

router.get('/admin/api/check', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.shortlinkAdmin) });
});

// ── Links: create + list (Stage 1 — edit/delete are a follow-up) ─────────
router.get('/admin/api/links', requireShortlinkAuth, async (req, res) => {
  try {
    const connection = await getDbConnection();
    await ensureTable(connection);
    const [rows] = await connection.execute('SELECT * FROM short_links ORDER BY created_at DESC');
    await connection.release();
    res.json({ links: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

router.post('/admin/api/new', requireShortlinkAuth, async (req, res) => {
  let { slug, destination_url, note } = req.body || {};
  destination_url = String(destination_url || '').trim();
  note = note ? String(note).trim().slice(0, 255) : null;

  if (!destination_url) return res.status(400).json({ error: 'destination_url is required' });
  try {
    new URL(destination_url);
  } catch (_) {
    return res.status(400).json({ error: 'destination_url must be a full URL, including https://' });
  }

  slug = String(slug || '').trim().toLowerCase();
  if (!slug) return res.status(400).json({ error: 'slug is required' });
  if (!SLUG_RE.test(slug)) {
    return res.status(400).json({ error: 'Slug can only contain lowercase letters, digits, and hyphens.' });
  }
  if (RESERVED_SLUGS.has(slug)) {
    return res.status(400).json({ error: `"${slug}" is reserved and can't be used as a slug.` });
  }

  try {
    const connection = await getDbConnection();
    await ensureTable(connection);
    const [existing] = await connection.execute('SELECT id FROM short_links WHERE slug = ?', [slug]);
    if (existing.length > 0) {
      await connection.release();
      return res.status(409).json({ error: `"${slug}" is already taken — pick another slug.` });
    }
    await connection.execute(
      'INSERT INTO short_links (slug, destination_url, note) VALUES (?, ?, ?)',
      [slug, destination_url, note]
    );
    await connection.release();
    res.json({ success: true, slug });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create link' });
  }
});

const NOT_FOUND_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Link Not Found</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: #f4f6fb;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
    .card { background: #fff; border-radius: 16px; padding: 2.5rem; max-width: 440px; width: 100%;
            text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,.12); }
    h1 { color: #000099; font-size: 1.5rem; margin-bottom: .5rem; }
    p { color: #6c757d; margin-bottom: 1.5rem; }
    a.btn { display: inline-block; background: #000099; color: #fff; text-decoration: none;
            padding: .75rem 1.5rem; border-radius: 10px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <h1>That link doesn't exist</h1>
    <p>Double-check the address your teacher gave you — it may have been typed with a typo.</p>
    <a class="btn" href="/">Go to the Site Home</a>
  </div>
</body>
</html>`;

// ── The redirect itself — must stay registered last (catches anything else under /go) ──
router.get('/:slug', async (req, res) => {
  const slug = String(req.params.slug || '').trim().toLowerCase();
  try {
    const connection = await getDbConnection();
    await ensureTable(connection);
    const [rows] = await connection.execute('SELECT destination_url FROM short_links WHERE slug = ?', [slug]);
    await connection.release();
    if (rows.length === 0) return res.status(404).send(NOT_FOUND_HTML);
    // 302, not 301 -- a typo'd destination has to stay fixable without
    // fighting every visitor's browser cache.
    res.redirect(302, rows[0].destination_url);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

module.exports = router;
