# SERVER.md — Server Infrastructure

## Server Details

| Item | Value |
|------|-------|
| Hosting | VPS (Virtual Private Server) |
| Domain | `chswebdesignndevelopment.com` |
| SSH user | `administrator` |
| SSH password | `[ask server admin]` |
| Site root | `/srv/chswebdesignndevelopment` |
| OS | Linux (Ubuntu/Debian) |

---

## Architecture Overview

```
Browser
   │
   ▼
Nginx (port 80/443)
   │
   ├── location ~ \.php$ ──────────────► PHP 8.4-FPM
   │                                      (unix:/var/run/php/php8.4-fpm.sock)
   │                                      Handles: /api/*.php files
   │
   └── location / ─────────────────────► Node.js / Express
                                          (http://localhost:3000)
                                          PM2 process: guild-server
                                          Entry: /srv/chswebdesignndevelopment/server/server.js
```

Both PHP and Node.js connect to the same MariaDB instance on localhost.

---

## Nginx Configuration (conceptual)

```nginx
server {
    listen 80;
    server_name chswebdesignndevelopment.com www.chswebdesignndevelopment.com;

    root /srv/chswebdesignndevelopment;
    index index.html;

    # PHP files → PHP-FPM
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Everything else → Node.js proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Note:** The Nginx config has a body size limit (~1MB). The admin.html migration tool sends review questions in batches of 150 (about 45KB per batch) to stay under this limit.

---

## PHP-FPM

- **Version:** PHP 8.4
- **Socket:** `/var/run/php/php8.4-fpm.sock`
- All `.php` files in `/api/`, `/api/admin/`, `/api/appointments/`, `/api/student/` are served by PHP-FPM directly
- PHP changes take effect immediately without any restart

---

## Node.js / Express (PM2)

**Entry point:** `/srv/chswebdesignndevelopment/server/server.js`  
**Port:** 3000 (internal only — Nginx proxies to it)  
**PM2 process name:** `guild-server`

### Server.js structure

```js
const app = express();

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(session({ secret: 'secure-session-key-12345', ... }));

// API routes (must be before static)
app.use('/api', authRoutes);  // server/auth.js
app.use('/api', apiRoutes);   // server/api.js

// Static file serving
app.use('/js',     express.static('../js'));
app.use('/css',    express.static('../css'));
app.use('/images', express.static('../images'));
app.use('/',       express.static('../'));

app.listen(3000);
```

**Important:** API routes are mounted before the static file middleware. This means `/api/login` (no `.php`) is handled by Express, while `/api/login.php` is intercepted by Nginx first and sent to PHP-FPM before it ever reaches Node.js.

### Node.js dependencies (package.json)

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.19.2 | Web framework |
| `express-session` | ^1.19.0 | Session middleware |
| `mysql2` | ^3.9.7 | MariaDB/MySQL driver (promise API) |
| `bcrypt` | ^5.1.1 | Password hashing |

### Database connection (server/db.js)

```js
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'DB_PASSWORD_IN_DB_CONFIG',
    database: 'chs_gradebook'
};

async function getDbConnection() {
    return await mysql.createConnection(dbConfig);
    // Falls back to socket path on Linux if TCP connection fails
}
```

Each API request opens a **new connection** and closes it after the query. There is no connection pooling.

---

## MariaDB

- **Version:** MariaDB (compatible with MySQL 5.x+ syntax)
- **Host:** localhost
- **Port:** 3306 (default)
- **User:** root
- **Password:** DB_PASSWORD_IN_DB_CONFIG
- **Database:** chs_gradebook
- **Charset:** utf8mb4

---

## PM2 Commands

```bash
# Check process status
pm2 list

# Restart Node.js after code changes
pm2 restart guild-server

# View live logs
pm2 logs guild-server

# Stop the server
pm2 stop guild-server

# Start manually (if stopped)
pm2 start /srv/chswebdesignndevelopment/server/server.js --name guild-server

# Save process list so it survives reboots
pm2 save
pm2 startup
```

---

## Deployment Steps

### For JavaScript / HTML / CSS changes

```bash
ssh administrator@chswebdesignndevelopment.com
cd /srv/chswebdesignndevelopment
git pull
pm2 restart guild-server
```

### For PHP-only changes

```bash
ssh administrator@chswebdesignndevelopment.com
cd /srv/chswebdesignndevelopment
git pull
# No restart needed — PHP-FPM picks up changes immediately
```

### For database schema changes

1. Edit or create tables manually via MariaDB CLI, or
2. Visit `/api/setup-db.php` in a browser (runs `CREATE TABLE IF NOT EXISTS` for all core tables), then delete the file:
```bash
rm /srv/chswebdesignndevelopment/api/setup-db.php
```

### For npm dependency changes

```bash
ssh administrator@chswebdesignndevelopment.com
cd /srv/chswebdesignndevelopment
npm install
pm2 restart guild-server
```

---

## File Structure on Server

```
/srv/chswebdesignndevelopment/
├── server/
│   ├── server.js       ← Node.js entry point
│   ├── auth.js         ← Login/register/password routes
│   ├── api.js          ← All other Node.js API routes
│   └── db.js           ← Database connection factory
├── api/
│   ├── db_config.php   ← PHP DB credentials + helper functions
│   ├── login.php
│   ├── register.php
│   ├── events.php
│   ├── bell-schedule.php
│   ├── save-csv.php
│   ├── school-config.php
│   ├── clockin.php
│   ├── change-password.php
│   ├── admin/
│   │   ├── master-gradebook-data.php
│   │   ├── save-assignment.php
│   │   ├── save-grade.php
│   │   ├── edit-assignment.php
│   │   ├── delete-assignment.php
│   │   ├── batch-update-grades.php
│   │   └── clear-all-assignments.php
│   ├── appointments/
│   │   ├── office-hours.php
│   │   ├── book.php
│   │   ├── slots.php
│   │   ├── requests.php
│   │   └── update-status.php
│   └── student/
│       ├── grades.php
│       ├── profile.php
│       ├── course-gradebook.php
│       ├── exam-progress.php
│       ├── save-self-assessment.php
│       └── self-assessments.php
├── js/
│   ├── auth-guard.js   ← Runs on every page
│   ├── loader.js       ← Injects nav/footer
│   ├── calendar.js     ← Calendar system
│   ├── admin/
│   │   ├── gradebook.js
│   │   ├── roster.js
│   │   ├── payroll.js
│   │   ├── admin-notebooks.js
│   │   └── rubrics.js
│   └── student/
│       ├── timeclock.js
│       ├── student-notes.js
│       ├── student-payroll.js
│       └── student-files.js
├── css/
│   ├── dacStyleSheets.css   ← Master stylesheet
│   ├── calendar.css
│   ├── dacPrint.css
│   └── admin-roster.css
├── includes/
│   ├── navbar.html     ← Injected by loader.js
│   ├── footer.html     ← Injected by loader.js
│   └── site-footer.html
├── images/
├── index.html
├── calendar.html
├── admin.html
├── admin/
│   ├── gradebook.html
│   ├── roster.html
│   ├── payroll.html
│   ├── files.html
│   ├── notebooks.html
│   └── rubrics.html
├── package.json
└── readme-files/       ← This documentation
```

---

## Logs

Node.js application logs are managed by PM2:
```bash
pm2 logs guild-server          # live tail
pm2 logs guild-server --lines 200  # last 200 lines
```

PHP errors are logged to `/api/error_log` (relative to the api/ directory) per Nginx/PHP-FPM configuration.

---

## Notes for New Developers

1. **Two API systems:** Before debugging an API call, determine if the URL ends in `.php` (PHP-FPM) or not (Node.js). They use different tables in some cases (`grades` vs `responses`).

2. **No connection pooling:** Each PHP request and each Node.js request opens its own DB connection. High concurrent load could exhaust connections, but this is a classroom tool with at most ~30 concurrent users.

3. **Session secret is hardcoded:** The Express session secret (`'secure-session-key-12345'`) should be moved to an environment variable if this site ever handles sensitive data beyond classroom grades.

4. **Nginx body limit:** Default Nginx client body size is 1MB. The admin.html seeder sends questions in 150-question batches to stay under this. If you need to send larger payloads, adjust `client_max_body_size` in the Nginx config.

5. **PHP legacy password support:** `api/login.php` supports MD5 and plain-text password hashes for backward compatibility. When students set new passwords they are always bcrypt-hashed.
