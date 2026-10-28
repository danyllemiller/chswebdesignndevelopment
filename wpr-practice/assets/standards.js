// wpr-practice/assets/standards.js
// Nevada CTE Employability Skills for Career Readiness (2012, rev. 5/30/2014): the 3 performance standards and
// 21 indicators that every WPR question is tagged with (server/lib/wprIndicators.json). Reports use the short
// names and print the full wording as a key. Used by the student report (report-pdf.js) and the teacher's
// downloads (teacher.html).
window.WprStandards = (function () {
    const LIST = [
        ['1.1', 'Personal Qualities and People Skills', [
            ['1.1.1', 'Work ethic', 'Demonstrate a positive work ethic by coming to work every day on time, a willingness to take direction, and motivation to accomplish the task at hand.'],
            ['1.1.2', 'Integrity', 'Demonstrate integrity by abiding by workplace policies and laws and demonstrating honesty and reliability.'],
            ['1.1.3', 'Teamwork', 'Demonstrate teamwork skills by contributing to the success of the team, assisting others, and requesting help when needed.'],
            ['1.1.4', 'Self-representation', 'Demonstrate positive self-representation skills by dressing appropriately and using language and manners suitable for the workplace.'],
            ['1.1.5', 'Diversity awareness', 'Demonstrate diversity awareness by working well with all customers and coworkers.'],
            ['1.1.6', 'Conflict resolution', 'Demonstrate conflict-resolution skills by negotiating diplomatic solutions to interpersonal and workplace issues.'],
            ['1.1.7', 'Creativity and initiative', 'Demonstrate creativity and resourcefulness by contributing new ideas and working with initiative.']
        ]],
        ['1.2', 'Professional Knowledge and Skills', [
            ['1.2.1', 'Speaking and listening', 'Demonstrate effective speaking and listening skills by communicating effectively with customers and employees and following directions.'],
            ['1.2.2', 'Reading and writing', 'Demonstrate effective reading and writing skills by reading and interpreting workplace documents and writing clearly.'],
            ['1.2.3', 'Critical thinking', 'Demonstrate critical-thinking and problem-solving skills by analyzing and resolving problems that arise in completing assigned tasks.'],
            ['1.2.4', 'Health and safety', 'Demonstrate healthy behaviors and safety skills by following safety guidelines and managing personal health.'],
            ['1.2.5', 'Workplace systems', 'Demonstrate understanding of workplace organizations, systems, and climates by identifying "big picture" issues and fulfilling the mission of the workplace.'],
            ['1.2.6', 'Lifelong learning', 'Demonstrate lifelong-learning skills by continually acquiring new industry-related information and improving professional skills.'],
            ['1.2.7', 'Job search and advancement', 'Demonstrate job acquisition and advancement skills by preparing to apply for a job and seeking promotion.'],
            ['1.2.8', 'Time and task management', 'Demonstrate time, task, and resource management skills by organizing and implementing a productive plan of work.'],
            ['1.2.9', 'Math', 'Demonstrate mathematics skills by using mathematical reasoning to accomplish tasks.'],
            ['1.2.10', 'Customer service', 'Demonstrate customer service skills by identifying and addressing the needs of all customers and providing helpful, courteous, and knowledgeable service.']
        ]],
        ['1.3', 'Technology Knowledge and Skills', [
            ['1.3.1', 'Job-specific technology', 'Demonstrate proficiency with job-specific technologies by selecting and safely using technological resources to accomplish work responsibilities in a productive manner.'],
            ['1.3.2', 'Information technology', 'Demonstrate proficiency with information technology by using computers, file management techniques, and software/programs effectively.'],
            ['1.3.3', 'Internet use and security', 'Demonstrate proper Internet use and security by using the Internet appropriately for work.'],
            ['1.3.4', 'Telecommunications', 'Demonstrate proficiency with telecommunications by selecting and using appropriate devices, services, and applications.']
        ]]
    ];
    const standards = LIST.map(([id, name, inds]) => ({ id, name, indicators: inds.map(([iid, short, full]) => ({ id: iid, name: short, full })) }));
    const byId = {};
    standards.forEach(s => { byId[s.id] = s; s.indicators.forEach(i => { byId[i.id] = i; }); });
    const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
    // 80% and up is green, 70-79% yellow, under 70% red (the "reteach" line)
    const band = p => (p >= 80 ? 'green' : p >= 70 ? 'yellow' : 'red');

    // Right out of answered, per standard and per indicator, from items like { indicator, right }.
    // Unanswered items (right null) don't count: the percentages are of the questions answered.
    function tally(items) {
        const count = {};
        (items || []).forEach(it => {
            if (!it || typeof it.right !== 'boolean' || !byId[it.indicator] || !/^1\.\d+\.\d+$/.test(it.indicator)) return;
            [it.indicator.split('.').slice(0, 2).join('.'), it.indicator].forEach(k => {
                const c = count[k] || (count[k] = { right: 0, seen: 0 });
                c.seen++; if (it.right) c.right++;
            });
        });
        const add = x => { const c = count[x.id] || { right: 0, seen: 0 }; return Object.assign({}, x, c, { pct: pct(c.right, c.seen) }); };
        return standards.map(s => Object.assign(add(s), { indicators: s.indicators.map(add) }));
    }

    return { standards, byId, tally, pct, band };
})();
