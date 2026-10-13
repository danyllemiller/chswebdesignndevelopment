// server/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

if (!process.env.DB_PASSWORD) {
    throw new Error('DB_PASSWORD is not set -- add it to .env before starting the server.');
}

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'chs_gradebook'
};

// Every call site does `const connection = await getDbConnection(); ...;
// await connection.end();` -- previously this opened a brand-new raw MySQL
// TCP connection per call, which under a classroom's worth of students
// logging in within the same minute (each firing several DB-touching
// requests) could genuinely exhaust connections and cause intermittent,
// hard-to-reproduce failures that a page refresh would "fix" simply by
// retrying after the burst subsided. A pool reuses a fixed set of
// connections and queues requests past the limit instead of failing.
//
// getDbConnection() keeps returning something call sites can .execute()
// and .end() on unchanged -- in mysql2 (confirmed on the installed
// version), .end() on a pooled connection releases it back to the pool
// rather than destroying it, so no other file needs to change. That
// behavior is marked deprecated upstream in favor of .release(); if a
// future mysql2 upgrade changes it, every .end() call site would need to
// switch to .release() at the same time.
const pool = mysql.createPool({
    ...dbConfig,
    connectionLimit: 20,
    waitForConnections: true,
    queueLimit: 0
});

// mysql2's Pool is an EventEmitter. A background/idle pooled connection can
// die on its own (MySQL restart, a dropped TCP connection, PROTOCOL_CONNECTION_LOST)
// and the pool emits 'error' when that happens -- not tied to any one
// in-flight request. With no listener, Node's default EventEmitter behavior
// is to throw, which (with no process-level handler either) crashes the
// entire server for every concurrent user over a single dead connection.
// Logging it here is enough: the pool itself already drops the bad
// connection and opens a fresh one on the next getConnection() call.
pool.on('error', (err) => {
    console.error('[db] pool error (connection dropped, pool will recover):', err);
});

let socketPool = null;

async function getDbConnection() {
    try {
        return await pool.getConnection();
    } catch (err) {
        if (process.platform === 'linux') {
            try {
                if (!socketPool) {
                    socketPool = mysql.createPool({
                        socketPath: '/var/run/mysqld/mysqld.sock',
                        user: 'root',
                        password: '',
                        database: 'chs_gradebook',
                        connectionLimit: 20,
                        waitForConnections: true,
                        queueLimit: 0
                    });
                    socketPool.on('error', (socketErr) => {
                        console.error('[db] socket pool error (connection dropped, pool will recover):', socketErr);
                    });
                }
                return await socketPool.getConnection();
            } catch (socketErr) { throw err; }
        }
        throw err;
    }
}

// Acquires a connection, runs fn(connection), and always releases it --
// including on error. Prefer this over a hand-rolled
// `const connection = await getDbConnection(); try {...} catch {...}` in new
// code: the leading cause of pool exhaustion in this codebase has been
// routes that release the connection on their success paths but not in the
// catch block, silently leaking one connection per failed request until the
// pool runs out and every subsequent request hangs.
async function withConnection(fn) {
    const connection = await getDbConnection();
    try {
        return await fn(connection);
    } finally {
        connection.release();
    }
}

module.exports = { getDbConnection, withConnection };