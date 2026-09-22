// /server/server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const authRoutes = require('./auth');
const apiRoutes = require('./api');
const shortlinkRoutes = require('./routes/shortlinks');

const app = express();
const PORT = 3000;

// Tells browsers to only ever contact this domain over HTTPS, for a year,
// including subdomains -- closes the gap where a visitor's very first
// request could still go out over plain HTTP before any redirect happens.
// Safe to set unconditionally: Cloudflare's own edge redirect (confirmed
// separately) means an http:// request from a browser never actually
// reaches this server in the first place.
app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Behind nginx -- needed so req.ip (used for shortlink login rate limiting)
// reflects the real client instead of the proxy's own address.
app.set('trust proxy', true);

// THIS LOGS EVERY REQUEST
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] Request received for: ${req.url}`);
    next();
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// The root static mount below (`app.use('/', express.static(...))`) serves
// the entire repo by design -- every top-level HTML page, and folders like
// exams/, student/, interactives/ all depend on that being broad. But it
// was ALSO happily serving server/db.js, server/server.js (both with the
// live DB password and session secret hardcoded in plaintext), memory/*.md,
// readme-files/*, and this repo's own .git history to anyone on the
// internet with no auth -- confirmed live via a plain curl. Express only
// excludes dotfiles by default; it has no concept of "this folder is
// backend source, not a public asset." Denylist the specific paths that
// were never meant to be public, checked before any static handler runs.
const BLOCKED_STATIC_PREFIXES = [
    '/server', '/memory', '/readme-files', '/.git', '/.claude',
    '/node_modules', '/migrations', '/_screenshot-helpers', '/tests'
];
app.use((req, res, next) => {
    const p = req.path.toLowerCase();
    if (p.endsWith('/.env') || p === '/.env' || BLOCKED_STATIC_PREFIXES.some(prefix => p === prefix || p.startsWith(prefix + '/'))) {
        return res.status(404).end();
    }
    next();
});

// Previously had no `store` set, which silently defaults express-session
// to its built-in MemoryStore -- an in-process object that's entirely
// wiped on every restart. Express-session's own docs call MemoryStore
// "not designed for a production environment" for exactly this reason:
// every `pm2 restart` (any deploy touching a server/ file) instantly
// logged out every currently-active session server-side, while each
// browser's cookie and client-cached authData still claimed they were
// logged in -- surfacing later as random 403s on session-gated routes
// with no obvious connection to a deploy that happened minutes earlier.
// Backing the store with the same MySQL database already in use makes
// sessions survive restarts (and would also survive a droplet failover,
// since both boxes point at the same reconciled database).
// express-mysql-session's own default `expiration` is 24 hours -- a teacher
// who leaves a tab open over a weekend (or just doesn't reopen the site
// daily) comes back to a cookie the browser still holds but whose matching
// row has already been pruned server-side, so every click on a session-gated
// route (sending a message, resolving a tardy consequence, etc.) 403s with
// no obvious cause. Both the store's row lifetime and the cookie's own
// maxAge are set here, in sync, to 30 days -- long enough that normal
// day-to-day gaps in usage don't trigger this, while still eventually
// expiring rather than lasting forever.
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

if (!process.env.DB_PASSWORD || !process.env.SESSION_SECRET) {
    throw new Error('DB_PASSWORD and SESSION_SECRET must be set in .env before starting the server.');
}

const sessionStore = new MySQLStore({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'chs_gradebook',
    // Table is auto-created on first run if missing; explicit here so
    // it's easy to find (`SELECT * FROM sessions`) rather than guessing
    // the package's default name.
    schema: { tableName: 'sessions' },
    expiration: SESSION_MAX_AGE_MS
});

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    // `secure: true` is deliberately NOT set here -- it depends on nginx
    // correctly forwarding X-Forwarded-Proto for `trust proxy` to see the
    // request as HTTPS, which hasn't been verified, and getting it wrong
    // would silently break every login site-wide (the cookie would never
    // get set at all). sameSite is safe to add unconditionally -- it's a
    // browser-side default that doesn't depend on the proxy chain.
    cookie: { maxAge: SESSION_MAX_AGE_MS, sameSite: 'lax' }
}));

// Route Mapping - API routes must come before static routes
app.use('/api', authRoutes);
app.use('/api', apiRoutes);
app.use('/go', shortlinkRoutes);

// Explicitly map your folders
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/images', express.static(path.join(__dirname, '../images')));

// Root static files (must be last so it doesn't intercept API calls).
// HTML pages get an explicit no-cache: express.static sends no
// Cache-Control by default, which leaves a browser free to serve an old
// cached copy of a page from heuristic freshness rules alone (no
// revalidation) -- and a stale HTML page is stale in exactly the way that
// matters here, since every JS/CSS reference on it is baked in as a
// literal ?v=N URL. A student's browser holding a cached page from before
// the last deploy keeps requesting the OLD, already-fixed ?v=N script
// forever, because it never re-fetches the HTML that would tell it the
// number changed -- consistent with the reported failures being tied to
// specific lab computers rather than specific students. no-cache (not
// no-store) still lets the browser cache the response, it just forces a
// cheap revalidation round-trip on every load instead of trusting a stale
// local copy for days. JS/CSS/images are untouched -- their own ?v=N
// query string already changes the URL itself when they change, so normal
// caching there is correct and left alone.
app.use('/', express.static(path.join(__dirname, '../'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    }
}));

// Root index
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

app.listen(PORT, () => console.log(`Guild Server listening on port ${PORT}`));