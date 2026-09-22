# SERVER.md — Server Infrastructure

**Last verified accurate: 2026-09-22**, by directly checking the live server (not by trusting the previous version of this file, which had drifted badly — see "A note on trusting this file" at the bottom before you rely on any of it six months from now).

## Server Details

| Item | Value |
|------|-------|
| Hosting | **Self-hosted** — the teacher's own server at home. Not a commercial VPS/cloud provider (not DigitalOcean, AWS, etc.) |
| Reachable via | Tailscale (a private mesh VPN) — the `100.108.216.90` address is a Tailscale IP, not a public internet IP |
| SSH alias | `webServer` (defined in `~/.ssh/config` on the developer's machine) |
| Domain | `chswebdesignndevelopment.com` |
| SSH user | `administrator` |
| SSH login | Key-based (no password needed to connect) |
| `sudo` password | **Not currently known/available to the developer.** Anything requiring root (e.g. fixing file ownership outside what `administrator` already owns) has to be run by whoever knows this password. Worth recording it somewhere safe if it isn't already. |
| Site root | `/srv/chswebdesignndevelopment` (this git repo, checked out directly — deploys are `git pull` in place) |

---

## Architecture Overview

```
Browser
   │
   ▼
Nginx (port 80/443, reverse proxy)
   │
   └── everything ──────────────────► Node.js / Express
                                       (http://localhost:3000)
                                       PM2 process: guild-server
                                       Entry: server/server.js
```

**There is no PHP in production.** Confirmed live on 2026-09-22: `find /srv/chswebdesignndevelopment -iname '*.php'` returns zero files. The entire site was migrated off an earlier PHP layer to pure Node.js/Express over the course of this project. Nginx's config still has a `location ~ \.php$ { fastcgi_pass ... }` block left over from that era — it's inert (nothing left to match it) but hasn't been cleaned out of the config yet.

If you ever find a doc (including an older version of this one, or `readme-files/dev-handoff.html`) that talks about PHP files still executing in production, **do not trust it** — verify with the `find` command above before believing it. This exact mistake (trusting a stale doc's infrastructure claims instead of the live server) is why this file was rewritten.

---

## Nginx

Config lives on the server (not in this repo). Proxies everything to the Node process on port 3000. Also does its own response caching in front of Node — confirmed live:
- Static assets under `/js/`, `/css/` etc. get a `Cache-Control: public, max-age=14400` (4 hours) from Nginx.
- HTML pages are set to `Cache-Control: no-cache` by `server/server.js` itself (see below) — Nginx has been observed passing this through as `no-store` in practice, which is even stronger (good — means an HTML page is never served stale from cache, only its own `?v=N`-tagged JS/CSS assets are).

**Client body size limit:** ~1MB by default. Any bulk-upload endpoint sending large payloads (e.g. seeding question banks) needs to batch under this or the request silently fails.

---

## Node.js / Express (PM2)

**Entry point:** `server/server.js`
**Port:** 3000 (internal only — Nginx proxies to it; nothing external talks to port 3000 directly)
**PM2 process name:** `guild-server`
**Process owner:** `administrator` (confirmed via `ps aux` — this matters for file permissions, see Uploads section below)

### Route mounting (server/server.js)

```js
app.use('/api', authRoutes);   // server/auth.js — login/register/logout/password
app.use('/api', apiRoutes);    // server/api.js — aggregates every server/routes/*.js file

app.use('/js',     express.static(...));
app.use('/css',    express.static(...));
app.use('/images', express.static(...));
app.use('/', express.static(path.join(__dirname, '../'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    }
}));
```

API routes are mounted before static file serving, and the root static mount is last (so it never intercepts an `/api/*` call). Every domain's routes live in its own file under `server/routes/` (gradebook, roster, payroll, timeclock, projects, uploads, agenda, etc.) and `server/api.js` just aggregates them.

### Session middleware

`express-session`, backed by **`express-mysql-session`** (a real MySQL-backed store, `sessions` table in `chs_gradebook`) — **not in-memory**. This was a deliberate fix; an in-memory store used to mean every `pm2 restart` logged every active user out mid-class. Sessions now survive restarts, with a 30-day expiration on both the store row and the cookie.

`/api/login` calls `req.session.regenerate()` before setting `req.session.user`, so every successful login gets a genuinely fresh session (not session fixation). `/api/logout` calls `req.session.destroy()` — logout.html's client-side JS calls this endpoint before clearing its own localStorage.

**Session secret and DB password** both come from a `.env` file on the server (`SESSION_SECRET`, `DB_PASSWORD`) — `server/server.js` and `server/db.js` both throw on startup if these aren't set. `.env` is gitignored and exists only on the server; `server/db.js` itself has no hardcoded credentials and is safely committed to git.

### Database connection (server/db.js)

Uses `mysql2`'s **connection pool** (`mysql.createPool()`, `connectionLimit: 20`), not a fresh connection per request. Falls back to a local Unix socket path on Linux if the TCP connection fails.

---

## MariaDB / MySQL

- **Database:** `chs_gradebook`
- **Host:** `localhost` (same machine as the Node process)
- **User:** `root`
- **Password:** in `.env` on the server (`DB_PASSWORD`) — never in this repo
- **Charset:** `utf8mb4`

---

## File Uploads — a real, recurring gotcha

Every student has a folder at `uploads/<student_id>/` on the server, used by the assignment dropbox (`server/routes/uploads.js`, `POST /api/upload`) and the student file manager. **These folders must be owned by `administrator`** (the user the Node process actually runs as) or every write into them fails with `EACCES: permission denied` — which surfaces to the student as a generic "Upload failed" message, with zero connection to their browser, their account, or which computer they're on.

**Confirmed live, 2026-09-22:** 73 of 189 existing upload folders were still owned by `www-data` — a leftover from the old PHP-era upload system (which ran as the `www-data` web server user, before the migration to Node). Any student whose folder was never touched by the newer Node-based folder-creation code (`server/routes/roster.js`'s `ensureUploadFolder`, which correctly creates folders as `administrator`) was silently stuck with the wrong owner and could never turn anything in, on any computer, in any browser, logged in or as a guest — because the failure has nothing to do with the client at all.

**If a student reports "upload failed" and it's not a one-off:** check `uploads/<their_id>/` ownership before assuming it's a browser/cache/account problem:
```bash
ls -ld /srv/chswebdesignndevelopment/uploads/<student_id>/
# should say "administrator administrator" — if it says "www-data www-data", that's the bug
```
Fix (requires the `sudo` password noted at the top of this file):
```bash
sudo chown -R administrator:administrator /srv/chswebdesignndevelopment/uploads/
```
This is safe to run any time — it only changes ownership metadata, never touches file contents, and re-running it on already-correct folders is a no-op.

---

## PM2 Commands

```bash
pm2 list                              # check process status
pm2 restart guild-server              # restart after a server/ change
pm2 logs guild-server                 # live tail
pm2 logs guild-server --lines 200     # last 200 lines
```

Logs are split by PM2 into two files, which matters when grepping:
```bash
~/.pm2/logs/guild-server-out.log      # console.log output
~/.pm2/logs/guild-server-error.log    # console.error output -- this is where [CLIENT ERROR] entries land
```
`console.error(...)` (used for both real server errors and the client-side error-reporting endpoint, `POST /api/client-error-log`) goes to **stderr**, i.e. the `-error.log` file, not `-out.log`. Grepping the wrong file for a reported bug looks like "nothing was logged" when it actually was.

---

## Deployment Steps

### JavaScript / HTML / CSS / any change under `server/`
```bash
ssh webServer
cd /srv/chswebdesignndevelopment
git pull
pm2 restart guild-server   # only strictly required for server/ changes -- harmless to run anyway
```
Static file changes (HTML/CSS/JS outside `server/`) take effect on the next `git pull` with no restart needed, since they're served directly off disk by Express's static middleware.

### Database schema changes
Run the SQL directly against the live DB (`mysql -u root -p chs_gradebook`), or let a route's own `CREATE TABLE IF NOT EXISTS` DDL (several routes carry their own, run on first request) create it. There's no formal migration tool — schema changes are applied by hand and should be noted somewhere (this file, or a commit message) so they're not lost to memory.

---

## Notes for New Developers

1. **PHP is gone.** Don't spend time looking for `.php` files or PHP-FPM issues — see "There is no PHP in production" above.
2. **Sessions survive restarts.** A `pm2 restart` does not log anyone out anymore.
3. **Connection pooling is in place.** `server/db.js` uses a real pool, not one connection per request.
4. **Uploads folder ownership is a known, recurring failure mode.** See the File Uploads section above before assuming a student's "can't turn in work" report is a browser problem.
5. **This server is not a commercial cloud VPS.** Don't assume a hosting provider's dashboard (DigitalOcean, AWS console, etc.) exists for this box — it doesn't. Access is SSH over Tailscale, full stop.

---

## A note on trusting this file

The previous version of this document described a PHP+Node dual-stack setup on a generic VPS, with in-memory sessions and no connection pooling — all of which had been fixed or replaced months before anyone (including an AI assistant working from this file) noticed the doc hadn't been updated. That drift caused a real, wasted debugging detour. Whenever this file is used to make a decision that matters (especially anything about hosting, infrastructure, or "how does X work"), verify the specific claim against the live server or the actual code first, the way this rewrite did — don't take the file's word for it, including this version, a year from now.
