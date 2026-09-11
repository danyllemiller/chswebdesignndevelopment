// /srv/chswebdesignndevelopment/server/api.js
// Route aggregator — each domain lives in its own routes/ file.
const express = require('express');
const router = express.Router();

// Every /admin/* route previously trusted the caller unconditionally --
// the only "admin gate" was a client-side localStorage check
// (js/auth-guard.js, js/admin/gradebook.js), so anyone who found an admin
// API URL could call it directly. express-session is already configured
// app-wide (server/server.js) and already populated correctly at login
// (server/auth.js sets req.session.user on success) -- it was just never
// checked again afterward. apiFetch() makes plain same-origin fetch()
// calls with no credentials override, so the session cookie is already
// sent on every request today; this is a server-only fix, no client
// change needed. Mirrors the exact three-way check every admin page
// already uses client-side, so behavior stays consistent -- it just
// becomes real instead of advisory, for every existing and future
// /admin/* route in one place.
router.use((req, res, next) => {
    if (!req.path.startsWith('/admin/')) return next();
    const u = req.session && req.session.user;
    const isAdmin = u && (u.role === 'admin' || u.section_id === 'Teacher' || (u.username && u.username.includes('damiller')));
    if (!isAdmin) return res.status(401).json({ error: 'Not authorized.' });
    next();
});

router.use('/', require('./routes/timeclock'));
router.use('/', require('./routes/gradebook'));
router.use('/', require('./routes/roster'));
router.use('/', require('./routes/payroll'));
router.use('/', require('./routes/notebooks'));
router.use('/', require('./routes/projects'));
router.use('/', require('./routes/assessments'));
router.use('/', require('./routes/calendar'));
router.use('/', require('./routes/files'));
router.use('/', require('./routes/intervention'));
router.use('/', require('./routes/gallery'));
router.use('/', require('./routes/rank'));
router.use('/', require('./routes/paystubs'));
router.use('/', require('./routes/stickers'));
router.use('/', require('./routes/polls'));
router.use('/', require('./routes/wordcloud'));
router.use('/', require('./routes/tardy'));
router.use('/', require('./routes/songRequests'));
router.use('/', require('./routes/daily-activity'));
router.use('/', require('./routes/messages'));
router.use('/', require('./routes/newsletter'));
router.use('/', require('./routes/budgetGame'));
router.use('/', require('./routes/survey'));

module.exports = router;
