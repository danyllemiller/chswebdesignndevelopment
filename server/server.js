// /server/server.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const authRoutes = require('./auth');
const apiRoutes = require('./api');

const app = express();
const PORT = 3000;

// THIS LOGS EVERY REQUEST
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] Request received for: ${req.url}`);
    next();
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use(session({
    secret: 'secure-session-key-12345',
    resave: false,
    saveUninitialized: false
}));

// Route Mapping - API routes must come before static routes
app.use('/api', authRoutes);
app.use('/api', apiRoutes);

// Explicitly map your folders
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/images', express.static(path.join(__dirname, '../images')));

// Root static files (must be last so it doesn't intercept API calls)
app.use('/', express.static(path.join(__dirname, '../')));

// Root index
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

app.listen(PORT, () => console.log(`Guild Server listening on port ${PORT}`));