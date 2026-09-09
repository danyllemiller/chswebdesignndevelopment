# Outage Runbook — Failing Over to the Droplet

Use this when chswebdesignndevelopment.com is down because the home server
(webServer, an old Mac on flaky Wi-Fi) has dropped off the network, and you
need the site working again before the home server comes back.

**If Claude/the assistant isn't reachable either**, this document is on
GitHub (`github.com/danyllemiller/chswebdesignndevelopment`) as well as on
both servers, so you can read it from any of those places even if one is
down.

## Background

- **webServer** = the home server. Normally serves the live site via a
  Cloudflare Tunnel.
- **vWebServer** = a DigitalOcean droplet (IP `67.205.134.69`) that mirrors
  the whole site as a standby. It also hosts two unrelated client sites
  (ableglass, digitalartsclasses), so it isn't dedicated to this site alone.
- The droplet's database is synced from the home server automatically —
  a full sync every night at 3am, plus a lighter data-only sync every 10
  minutes on weekdays from 7:30am–2:30pm. So during school hours it's
  never more than ~10 minutes stale; overnight/weekends it's as fresh as
  the last 3am run.
- **This is meant to be temporary.** The DigitalOcean plan is billed by
  usage, not a flat fee — don't leave the droplet as primary longer than
  necessary. Switch back once the home server's stable again.

## Cloudflare dashboard

dash.cloudflare.com → **chswebdesignndevelopment.com**

## Step 1: Switch SSL/TLS mode to Flexible

**SSL/TLS → Overview** (or the "Configure" button) → change mode from
**Full** to **Flexible**, save.

Why: the droplet's nginx only serves plain HTTP, no HTTPS certificate is
set up there. In Full mode, Cloudflare insists on reaching the origin over
HTTPS and would fail even with DNS pointed correctly. Flexible tells
Cloudflare to talk to the origin over plain HTTP instead — visitors still
get real HTTPS from Cloudflare's own edge either way, so this doesn't
weaken anything for them. Safe to leave and re-flip later; it doesn't
affect the home server's Tunnel routing at all.

## Step 2: Point DNS at the droplet

**DNS → Records**. Note down the current values before changing anything
(so you can revert exactly) — as of this writing they are:

- Both `chswebdesignndevelopment.com` and `www.chswebdesignndevelopment.com`
  are currently: **Type = CNAME**, **Target =
  `3988771b-38da-40c0-8ffb-ed4cf35fea76.cfargotunnel.com`**, Proxied (orange
  cloud) on.

To switch:
1. Click **Edit** on the `chswebdesignndevelopment.com` row.
2. Change the **Type** dropdown from CNAME to **A** (you must change the
   Type first — a CNAME can't hold a plain IP address).
3. Set **Content/Target** to `67.205.134.69`.
4. Keep **Proxy status** = Proxied. Save.
5. Repeat steps 1–4 for the `www` row.

## Step 3: Verify

Wait a minute or two (proxied-record changes propagate fast, not full DNS
TTL), then load `https://chswebdesignndevelopment.com/` in a fresh/private
browser window. It should load normally.

## When the home server comes back: reverting

1. **DNS → Records**: change both records back — Type **CNAME**, Target
   `3988771b-38da-40c0-8ffb-ed4cf35fea76.cfargotunnel.com`, Proxied on.
2. **SSL/TLS → Overview**: mode back to **Full**.

## After reverting: reconcile the databases — don't skip this

While the droplet was serving traffic, it collected its own new data
(grades, clock-ins, payroll, etc.) that never reached the home server. The
home server may also have data from before the outage that never made it
into the droplet's last sync. Just reverting DNS does **not** fix this —
the two databases are now genuinely different and need to be merged in
**both directions**, not copied over one another (which would silently
lose whichever side gets overwritten).

If Claude is available, just ask it to reconcile the two databases — it
has the exact merge procedure (including two known gotchas: a foreign-key
constraint that needs to be stripped from the temporary staging tables,
and a database-collation mismatch that shows up specifically when merging
the `student_role_history` table) saved from doing this successfully
before. If not, the tables that actually need this (the rest of the
database is static/config and doesn't change) are: `responses`,
`clockins`, `timesheets`, `tardy_passes`, `exam_attempts`,
`student_paystubs`, `payroll_runs`, `student_role_history`.
