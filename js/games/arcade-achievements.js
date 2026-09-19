// /js/games/arcade-achievements.js
// A student's real rank + achievement badges (same data/thresholds as their
// My Grades dashboard -- js/modules/achievements.js is the shared source of
// truth) surfaced right where they're about to play, instead of only ever
// showing up on the gradebook. Scoped to the student's primary enrolled
// course only -- a student in more than one course sees their primary
// course's badges here; the full per-course breakdown still lives on My
// Grades.
import { getLoggedInUser } from '../modules/user-session.js';
import { apiFetch } from '../modules/api-client.js';
import { COURSE_WEIGHTS, periodToCourseKey } from '../modules/grade-weights.js?v=5';
import { computeGradeStats, computeBadges } from '../modules/achievements.js';

const COURSE_LABELS = { WD1: 'Web Design 1', WD2: 'Web Design 2', CS: 'Computer Science', AS: 'Advanced Studies', INTV: 'Intervention' };

function rankBadgeHtml(rankType) {
    if (rankType === 'platinum') return '<span class="badge rounded-pill shadow-sm fs-6 badge-platinum"><i class="fas fa-crown me-1"></i>Platinum Rank</span>';
    if (rankType === 'gold') return '<span class="badge rounded-pill shadow-sm fs-6 badge-gold"><i class="fas fa-medal me-1"></i>Gold Rank</span>';
    if (rankType === 'silver') return '<span class="badge rounded-pill shadow-sm fs-6 badge-silver"><i class="fas fa-award me-1"></i>Silver Rank</span>';
    return '';
}

function badgeTierClass(type) {
    if (type === 'platinum' || type === 'gold' || type === 'silver' || type === 'diamond') return `badge-${type}`;
    return `bg-${type}`;
}

function renderStrip(container, courseKey, stats, badges, firstName) {
    const label = COURSE_LABELS[courseKey] || courseKey;
    const badgesHtml = badges.length > 0
        ? badges.map(b => `
            <div class="badge-item text-center p-2 rounded border shadow-sm ${badgeTierClass(b.type)}" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${b.desc}">
                <i class="${b.icon} fs-4 mb-1"></i>
                <div class="small fw-bold lh-sm">${b.title}</div>
            </div>`).join('')
        : '<div class="text-muted small fst-italic">Complete assignments in class to start earning badges!</div>';

    container.innerHTML = `
        <div class="card shadow-sm border-0 mb-4">
            <div class="card-body p-3 p-md-4">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <h5 class="fw-bold mb-0"><i class="fas fa-trophy text-warning me-2"></i>${firstName ? `${firstName}'s` : 'Your'} Achievements — ${label}</h5>
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-bold text-primary">${stats.percent}%</span>
                        ${rankBadgeHtml(stats.rankType)}
                    </div>
                </div>
                <div class="d-flex flex-wrap gap-3">${badgesHtml}</div>
            </div>
        </div>`;

    if (typeof bootstrap !== 'undefined') {
        container.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
    }
}

async function init() {
    const container = document.getElementById('arcade-achievements');
    if (!container) return;

    const user = getLoggedInUser();
    // No student_id (a teacher demoing the page, or a logged-out visitor) --
    // there's no gradebook to show, so the strip just doesn't render at all.
    if (!user || !user.student_id) { container.remove(); return; }

    const sectionId = (user.section_id || '').trim().toUpperCase();
    const courseKey = periodToCourseKey(sectionId);
    if (!courseKey || !COURSE_WEIGHTS[courseKey]) { container.remove(); return; }

    try {
        const data = await apiFetch(`/api/student/course-gradebook?student_id=${user.student_id}&section_id=${encodeURIComponent(sectionId)}`);
        const registryData = {};
        const myGrades = {};
        (data.assignments || []).forEach(a => {
            const key = String(a.exam_id || '').trim();
            if (!key) return;
            registryData[key] = {
                maxPoints: a.total_points || 0, dueDate: a.due_date || '',
                category: a.category, isProjectMilestone: !!a.is_project_milestone
            };
            myGrades[key] = { score: a.score };
        });
        const keys = Object.keys(registryData).filter(k => !k.endsWith('-Score'));

        const stats = computeGradeStats(keys, myGrades, registryData, courseKey);
        const badges = computeBadges(keys, myGrades, registryData);
        renderStrip(container, courseKey, stats, badges, user.first_name);
    } catch (e) {
        console.error('[arcade-achievements] failed to load grades:', e);
        container.remove();
    }
}

document.addEventListener('DOMContentLoaded', init);
