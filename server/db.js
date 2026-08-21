// server/db.js
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'chs_password',
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
                }
                return await socketPool.getConnection();
            } catch (socketErr) { throw err; }
        }
        throw err;
    }
}

module.exports = { getDbConnection };