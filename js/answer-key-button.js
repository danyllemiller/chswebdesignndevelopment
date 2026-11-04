// /js/answer-key-button.js
// On a chapter page, the teacher's account gets an "Answer Key" button that opens
// that chapter's key (admin/answer-keys.html). Students never see the button, and
// it's only a link: the keys themselves stay behind the teacher-only API.
// Loaded site-wide from includes/site-footer.html.
(function () {
    let user = {};
    try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { return; }
    const role = String(user.role || '').toLowerCase();
    if (!(role === 'admin' || role === 'teacher' || user.section_id === 'Teacher')) return;

    const CHAPTERS = {
        '/compsci/essential_computer_skills.html': 'cs&ch=1',
        '/compsci/ethics_privacy_law.html': 'cs&ch=2',
        '/compsci/how_computers_work.html': 'cs&ch=3',
        '/compsci/intro_to_office_software.html': 'cs&ch=4',
        '/compsci/language_of_computers.html': 'cs&ch=5',
        '/compsci/storing_data.html': 'cs&ch=6',
        '/compsci/mastering_spreadsheets.html': 'cs&ch=7',
        '/compsci/computational_modeling.html': 'cs&ch=8',
        '/compsci/problem_solving_algorithms.html': 'cs&ch=9',
        '/compsci/control_structures_events.html': 'cs&ch=10',
        '/compsci/culture_equity_bias.html': 'cs&ch=11',
        '/compsci/ethics_societal_impact.html': 'cs&ch=12',
        '/compsci/ai_cross_disciplinary.html': 'cs&ch=13',
        '/compsci/advanced_data_structures.html': 'cs&ch=14',
        '/compsci/modularity_procedures.html': 'cs&ch=15',
        '/compsci/software_development_lifecycle.html': 'cs&ch=16',
        '/compsci/how_the_internet_works.html': 'cs&ch=17',
        '/compsci/cybersecurity_threats.html': 'cs&ch=18',
        '/compsci/defending_systems.html': 'cs&ch=19',
        '/year1/join-the-developers-guild.html': 'wd1&ch=1',
        '/year1/the-rules-how-not-to-get-sued.html': 'wd1&ch=2',
        '/year1/the-blueprint.html': 'wd1&ch=3',
        '/year1/the-why-intro-to-uiux.html': 'wd1&ch=4',
        '/year1/the-bones-intro-to-html.html': 'wd1&ch=5',
        '/year1/the-clothes-intro-to-css.html': 'wd1&ch=6',
        '/year1/the-style-advanced-css-layout.html': 'wd1&ch=7',
        '/year1/sights-sounds-making-it-pop-html-media.html': 'wd1&ch=8',
        '/year2/the-brains-intro-to-javascript.html': 'wd2&ch=9',
        '/year2/the-game-dev-advanced-js-game-logic.html': 'wd2&ch=10',
        '/year2/the-cloud-collaboration-hosting.html': 'wd2&ch=11',
        '/year2/the-manager-cms-platforms.html': 'wd2&ch=12',
        '/year2/the-network-intro-to-apis.html': 'wd2&ch=13',
        '/year2/the-brain-databases.html': 'wd2&ch=14',
        '/year2/the-game-never-ends.html': 'wd2&ch=15',
        '/year2/the-final-boss-going-live.html': 'wd2&ch=16'
    };
    const target = CHAPTERS[location.pathname];
    if (!target) return;

    const a = document.createElement('a');
    a.href = `/admin/answer-keys.html?course=${target}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'btn btn-warning fw-bold shadow no-print d-print-none';
    // just right of the back-to-top rocket (bottom-left, 47px wide)
    a.style.cssText = 'position:fixed;left:90px;bottom:34px;z-index:2000;border-radius:999px;';
    // the site theme recolors .btn with !important, which only an inline !important beats
    a.style.setProperty('background-color', '#ffc107', 'important');
    a.style.setProperty('border-color', '#e0a800', 'important');
    a.style.setProperty('color', '#000', 'important');
    a.innerHTML = '<i class="fas fa-key me-1"></i>Answer Key';
    a.title = 'Only you can see this button and the key';
    document.body.appendChild(a);
})();
