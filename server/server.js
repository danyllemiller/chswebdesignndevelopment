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
const sessionStore = new MySQLStore({
    host: 'localhost',
    user: 'root',
    password: 'chs_password',
    database: 'chs_gradebook',
    // Table is auto-created on first run if missing; explicit here so
    // it's easy to find (`SELECT * FROM sessions`) rather than guessing
    // the package's default name.
    schema: { tableName: 'sessions' }
});

app.use(session({
    secret: 'secure-session-key-12345',
    resave: false,
    saveUninitialized: false,
    store: sessionStore
}));

// Route Mapping - API routes must come before static routes
app.use('/api', authRoutes);
app.use('/api', apiRoutes);
app.use('/go', shortlinkRoutes);

// Explicitly map your folders
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/images', express.static(path.join(__dirname, '../images')));

// Root static files (must be last so it doesn't intercept API calls)
app.use('/', express.static(path.join(__dirname, '../')));

// Root index
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

app.listen(PORT, () => console.log(`Guild Server listening on port ${PORT}`));