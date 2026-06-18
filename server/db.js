// server/db.js
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'chs_password',
    database: 'chs_gradebook'
};

async function getDbConnection() {
    try {
        return await mysql.createConnection(dbConfig);
    } catch (err) {
        if (process.platform === 'linux') {
            try {
                return await mysql.createConnection({
                    socketPath: '/var/run/mysqld/mysqld.sock',
                    user: 'root',
                    password: '',
                    database: 'chs_gradebook'
                });
            } catch (socketErr) { throw err; }
        }
        throw err;
    }
}

module.exports = { getDbConnection };