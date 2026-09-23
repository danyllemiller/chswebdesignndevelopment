#!/usr/bin/env node
// Run via cron on the production server shortly after B2 ends, every school
// day -- see the crontab entry (added manually on webServer, not tracked
// here) for the exact time. Checks whether new commits have landed on
// origin/main since what's currently deployed (this checkout's own HEAD)
// on a day B2 actually meets (special-dates.csv type 'B' or the "All
// Period Day" type 'C' -- confirmed against the bell_schedule table, B2
// has rows under both). Every other day this is a silent no-op.
//
// This never touches the working tree beyond a read-only `git fetch` --
// it does NOT merge/deploy anything. It only writes a pending-review
// marker (data/monique-pending-review.json) that admin/tools.html reads
// and surfaces as a banner, so Danylle can look at the real diff on
// GitHub before deciding to deploy it (git pull, same as every other
// deploy this whole project uses).
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_DIR = path.join(__dirname, '..');
const REVIEW_FILE = path.join(REPO_DIR, 'data', 'monique-pending-review.json');
const REPO_URL = 'https://github.com/danyllemiller/chswebdesignndevelopment';

function sh(cmd) {
    return execSync(cmd, { cwd: REPO_DIR, encoding: 'utf8' }).trim();
}

function todaysScheduleType() {
    const today = new Date().toISOString().slice(0, 10);
    const csv = fs.readFileSync(path.join(REPO_DIR, 'special-dates.csv'), 'utf8');
    const row = csv.split('\n').find(line => line.startsWith(today + ','));
    return { today, type: row ? row.split(',')[1].trim() : null };
}

function main() {
    const { today, type } = todaysScheduleType();

    // B2 only meets on 'B' days and 'C' (All Period) days -- confirmed
    // against bell_schedule; B_MIN has no B2 row at all as of this writing.
    if (type !== 'B' && type !== 'C') {
        console.log(`[check-monique-push] ${today} is a '${type}' day -- B2 doesn't meet, nothing to check.`);
        return;
    }

    const deployedSha = sh('git rev-parse HEAD');
    sh('git fetch origin main --quiet');
    const remoteSha = sh('git rev-parse origin/main');

    if (deployedSha === remoteSha) {
        console.log(`[check-monique-push] ${today} (${type} day): checked -- nothing new since last deploy (${deployedSha}).`);
        return;
    }

    console.log(`[check-monique-push] ${today} (${type} day): new commits found, ${deployedSha}..${remoteSha}`);

    const commitLog = sh(`git log ${deployedSha}..${remoteSha} --format=%h%x01%an%x01%ad%x01%s --date=short`);
    const commits = commitLog.split('\n').filter(Boolean).map(line => {
        const [sha, author, date, message] = line.split('\x01');
        return { sha, author, date, message };
    });
    const diffstatSummary = sh(`git diff --stat ${deployedSha}..${remoteSha}`).split('\n').pop().trim();

    fs.mkdirSync(path.dirname(REVIEW_FILE), { recursive: true });
    fs.writeFileSync(REVIEW_FILE, JSON.stringify({
        checked_at: new Date().toISOString(),
        deployed_sha: deployedSha,
        remote_sha: remoteSha,
        commit_count: commits.length,
        commits,
        diffstat_summary: diffstatSummary,
        compare_url: `${REPO_URL}/compare/${deployedSha}...${remoteSha}`
    }, null, 2));

    console.log(`[check-monique-push] wrote ${REVIEW_FILE}`);
}

main();
