/**
 * CHAPTER 3: THE BLUEPRINT (UX Strategy & Site Planning)
 * MASTER MIGRATION FILE - UNIFIED DATA BANK
 * 75 Items Total (5 Categories x 5 Levels x 3 Variations)
 */
window.migrationPool = window.migrationPool || []; window.migrationPool.push(...[
        // --- CATEGORY: USER RESEARCH ---
        { cat: "User Research", val: 100, q: "The document that represents a semi-fictional character built from real research is called a what?", a: "Persona", d: ["Avatar", "Profile", "Mockup"] },
        { cat: "User Research", val: 100, q: "Gathering real data through interviews and surveys before designing anything is called what phase?", a: "Research", d: ["Wireframing", "Development", "Deployment"] },
        { cat: "User Research", val: 100, q: "A specific frustration or problem a real user experiences is called a what?", a: "Pain Point", d: ["Feature Request", "User Story", "Breakpoint"] },

        { cat: "User Research", val: 200, q: "In an Empathy Map, the quadrant that captures a user's internal monologue is called?", a: "Thinks", d: ["Says", "Does", "Feels"] },
        { cat: "User Research", val: 200, q: "In an Empathy Map, the quadrant that captures a user's observable actions is called?", a: "Does", d: ["Says", "Thinks", "Feels"] },
        { cat: "User Research", val: 200, q: "A persona built with no real research behind it, based purely on guesswork, is considered what?", a: "Useless / Invalid", d: ["Mid-Fidelity", "A Wireframe", "An Organism"] },

        { cat: "User Research", val: 300, q: "An Empathy Map's \"Says\" quadrant is sourced directly from what research method?", a: "Interviews", d: ["Analytics only", "Guesswork", "Competitor research"] },
        { cat: "User Research", val: 300, q: "What four quadrants make up an Empathy Map?", a: "Says, Thinks, Does, Feels", d: ["Who, What, Where, Why", "Plan, Design, Build, Launch", "Strengths, Weaknesses, Opportunities, Threats"] },
        { cat: "User Research", val: 300, q: "What four fields should every Persona include at minimum?", a: "Name, Age, Occupation, Quote", d: ["Name, Salary, Address, Photo", "Username, Password, Email, Bio", "Title, Company, Skills, Portfolio"] },

        { cat: "User Research", val: 400, q: "Why can't a persona built without real research answer any real design question?", a: "There's no evidence behind the character", d: ["It doesn't have a name", "It has too much detail", "It has too many quadrants"] },
        { cat: "User Research", val: 400, q: "If a persona THINKS \"why is this site so ugly,\" that directly justifies what design decision?", a: "A cleaner visual design", d: ["A longer paragraph of copy", "Smaller images", "More advertisements"] },
        { cat: "User Research", val: 400, q: "\"Takes a picture of the high score screen with a phone\" belongs in which Empathy Map quadrant?", a: "Does", d: ["Says", "Thinks", "Feels"] },

        { cat: "User Research", val: 500, q: "A persona's Empathy Map \"Does\" entry (\"uses phone while playing\") justifies which technical requirement?", a: "Mobile-responsive design", d: ["A dark mode toggle", "A faster server", "A larger font size"] },
        { cat: "User Research", val: 500, q: "What is the core difference between a generic persona and a valid, research-backed persona?", a: "Real goals and pain points sourced from actual research", d: ["The number of demographic fields listed", "Whether it has a name", "How detailed the empathy map looks"] },
        { cat: "User Research", val: 500, q: "Why can't \"gut feeling\" substitute for the Research phase before building a persona?", a: "There's no evidence to support design decisions", d: ["It takes too long to conduct interviews", "It's impossible to measure", "It skips the empathy map step"] },

        // --- CATEGORY: STRATEGY & SCOPE ---
        { cat: "Strategy & Scope", val: 100, q: "SWOT stands for Strengths, Weaknesses, Opportunities, and what?", a: "Threats", d: ["Timelines", "Tools", "Trends"] },
        { cat: "Strategy & Scope", val: 100, q: "In MoSCoW prioritization, what does the \"M\" stand for?", a: "Must Have", d: ["Maybe", "Minor", "Major"] },
        { cat: "Strategy & Scope", val: 100, q: "A 5-step model -- Analyze, Design, Develop, Implement, Evaluate -- is known by what acronym?", a: "ADDIE", d: ["MoSCoW", "SWOT", "F-Pattern"] },

        { cat: "Strategy & Scope", val: 200, q: "In SWOT, Strengths and Weaknesses are considered what kind of factors?", a: "Internal", d: ["External", "Temporary", "Optional"] },
        { cat: "Strategy & Scope", val: 200, q: "In SWOT, Opportunities and Threats are considered what kind of factors?", a: "External", d: ["Internal", "Fixed", "Optional"] },
        { cat: "Strategy & Scope", val: 200, q: "In MoSCoW, a feature that's a \"nice to have\" bonus but not essential falls under which category?", a: "Could Have", d: ["Must Have", "Should Have", "Won't Have"] },

        { cat: "Strategy & Scope", val: 300, q: "A market gap where competitors are weak and you can uniquely succeed is nicknamed a what?", a: "Blue Ocean", d: ["Red Zone", "White Space", "Green Field"] },
        { cat: "Strategy & Scope", val: 300, q: "A proper User Story follows the format \"As a [user], I want to [do a thing] so that I can ___\"?", a: "Achieve a goal", d: ["Save money", "Avoid errors", "Finish faster"] },
        { cat: "Strategy & Scope", val: 300, q: "In MoSCoW, features that are out of scope for the current release fall under which category?", a: "Won't Have", d: ["Could Have", "Should Have", "Must Have"] },

        { cat: "Strategy & Scope", val: 400, q: "A student writes \"our site loads slowly\" in a SWOT chart. Which quadrant does this belong in?", a: "Weakness", d: ["Threat", "Opportunity", "Strength"] },
        { cat: "Strategy & Scope", val: 400, q: "A student writes \"a bigger competitor might launch a leaderboard next month\" in a SWOT chart. Which quadrant does this belong in?", a: "Threat", d: ["Weakness", "Strength", "Opportunity"] },
        { cat: "Strategy & Scope", val: 400, q: "\"As a user, I want a leaderboard\" is an incomplete User Story because it's missing what part?", a: "The \"so that\" goal", d: ["The user type", "A priority level", "A MoSCoW tag"] },

        { cat: "Strategy & Scope", val: 500, q: "Why does the ADDIE model work as a loop instead of a straight line?", a: "The Evaluate step often sends you back to Analyze", d: ["The Design step always repeats twice", "Develop must happen before Analyze", "Each step takes exactly the same amount of time"] },
        { cat: "Strategy & Scope", val: 500, q: "If every feature on a MoSCoW list ends up marked \"Must Have,\" what does that indicate?", a: "The prioritization method has failed", d: ["The project is ahead of schedule", "The site is fully complete", "The team skipped the Design phase"] },
        { cat: "Strategy & Scope", val: 500, q: "Without a User Story's \"so that\" clause, why can't a team tell if a feature actually solves the user's problem?", a: "The real underlying goal was never stated", d: ["The feature has no name", "The MoSCoW tag is missing", "The persona wasn't consulted"] },

        // --- CATEGORY: SITE ARCHITECTURE ---
        { cat: "Site Architecture", val: 100, q: "A top-down diagram showing every page on a site and how they connect is called a what?", a: "Sitemap", d: ["Wireframe", "Storyboard", "Flowchart"] },
        { cat: "Site Architecture", val: 100, q: "A black-and-white layout blueprint for a single page, with no colors or real images, is called a what?", a: "Wireframe", d: ["Mockup", "Sitemap", "Prototype"] },
        { cat: "Site Architecture", val: 100, q: "In Atomic Design, the smallest, indivisible HTML elements (like <button> or <input>) are called what?", a: "Atoms", d: ["Molecules", "Organisms", "Cells"] },

        { cat: "Site Architecture", val: 200, q: "In Atomic Design, a small group of atoms working together as one functional unit (like a search form) is a what?", a: "Molecule", d: ["Atom", "Organism", "Template"] },
        { cat: "Site Architecture", val: 200, q: "In Atomic Design, a complex standalone section built from multiple molecules (like a site header) is a what?", a: "Organism", d: ["Atom", "Molecule", "Template"] },
        { cat: "Site Architecture", val: 200, q: "A sitemap always starts at the top with what page?", a: "Homepage / index.html", d: ["Contact page", "Sitemap.xml", "Login page"] },

        { cat: "Site Architecture", val: 300, q: "The fastest, roughest wireframe fidelity level, typically sketched on paper, is called what?", a: "Low-Fidelity (Lo-Fi)", d: ["Mid-Fidelity", "High-Fidelity", "Zero-Fidelity"] },
        { cat: "Site Architecture", val: 300, q: "A pixel-perfect wireframe that's ready for coding is what fidelity level?", a: "High-Fidelity (Hi-Fi)", d: ["Low-Fidelity", "Mid-Fidelity", "Draft-Fidelity"] },
        { cat: "Site Architecture", val: 300, q: "A screen-width range where a responsive layout changes is called a what?", a: "Breakpoint", d: ["Checkpoint", "Threshold", "Gridline"] },

        { cat: "Site Architecture", val: 400, q: "Why do wireframes deliberately avoid using color?", a: "So discussion stays focused on layout, not color choices", d: ["Color printers are expensive", "Color isn't supported in Figma", "Color makes files too large"] },
        { cat: "Site Architecture", val: 400, q: "Designing the mobile layout of a page before the desktop version is called what strategy?", a: "Mobile-First Design", d: ["Progressive Enhancement", "Responsive Priority", "Content-First"] },
        { cat: "Site Architecture", val: 400, q: "Why is a sitemap that's just a flat list of every page, with no grouping, considered a design mistake?", a: "It gives users no clear navigation structure", d: ["It takes too long to draw", "It uses too many pages", "It's missing the homepage"] },

        { cat: "Site Architecture", val: 500, q: "Why is Atomic Design better understood as a naming/reuse system rather than a strict build order?", a: "A reusable molecule (like a search form) gets written once and reused everywhere", d: ["Atoms must always be built last", "Organisms can't legally contain molecules", "It only applies to CSS files"] },
        { cat: "Site Architecture", val: 500, q: "A 3-column desktop grid squeezed directly onto a phone screen with no rework typically becomes what?", a: "Unreadable / cramped", d: ["Automatically responsive", "Faster to load", "More accessible"] },
        { cat: "Site Architecture", val: 500, q: "If a site can't be summarized in 5-7 top-level navigation items, what does that suggest about the sitemap?", a: "It needs more structure, not more pages", d: ["It needs fewer pages overall", "It needs a login wall", "It needs more wireframes"] },

        // --- CATEGORY: CONTENT & READABILITY ---
        { cat: "Content & Readability", val: 100, q: "The scanning pattern typically used for text-heavy pages like blogs and forums is called the what?", a: "F-Pattern", d: ["Z-Pattern", "S-Pattern", "L-Pattern"] },
        { cat: "Content & Readability", val: 100, q: "The scanning pattern typically used for simple, visual pages like homepages is called the what?", a: "Z-Pattern", d: ["F-Pattern", "C-Pattern", "X-Pattern"] },
        { cat: "Content & Readability", val: 100, q: "A brand's consistent personality across all of its writing is called its what?", a: "Voice", d: ["Tone", "Style", "Pitch"] },

        { cat: "Content & Readability", val: 200, q: "How a brand's voice adjusts to a specific moment (like an error page vs. a homepage) is called its what?", a: "Tone", d: ["Voice", "Style", "Grammar"] },
        { cat: "Content & Readability", val: 200, q: "The concrete writing rules that keep a voice consistent (sentence length, contractions, capitalization) make up a site's what?", a: "Style", d: ["Tone", "Grammar", "Pitch"] },
        { cat: "Content & Readability", val: 200, q: "The one thing a page absolutely must accomplish is called its what?", a: "Primary Purpose", d: ["Secondary Purpose", "Main Feature", "Core Value"] },

        { cat: "Content & Readability", val: 300, q: "A smaller, supporting goal a page can achieve without competing for attention is called its what?", a: "Secondary Purpose", d: ["Primary Purpose", "Core Feature", "Call to Action"] },
        { cat: "Content & Readability", val: 300, q: "A one-page list of a project's specific spelling and formatting choices, meant to keep multiple writers consistent, is a what?", a: "Style Sheet", d: ["Wireframe", "Sitemap", "Persona"] },
        { cat: "Content & Readability", val: 300, q: "A children's museum website should generally target what reading level?", a: "3rd-5th grade", d: ["College level", "8th grade", "Graduate level"] },

        { cat: "Content & Readability", val: 400, q: "If an account-signup banner is bigger and bolder than a page's actual walkthrough content, what mistake has occurred?", a: "The secondary purpose is overshadowing the primary purpose", d: ["The page has too many images", "The reading level is too high", "The tone doesn't match the voice"] },
        { cat: "Content & Readability", val: 400, q: "Why do spell-checkers fail to catch a sentence like \"Their are three modes\"?", a: "The words are spelled correctly, just used wrong", d: ["Spell-checkers don't check grammar at all", "The sentence is too short to scan", "\"Their\" isn't a recognized word"] },
        { cat: "Content & Readability", val: 400, q: "For most commercial websites, what's the actual effect of an overly formal, complex writing style?", a: "It drives casual users away", d: ["It builds more trust automatically", "It ranks higher in Google", "It matches most personas"] },

        { cat: "Content & Readability", val: 500, q: "A wall-of-text forum page and a simple image-heavy landing page sit on the same site. Why don't they get scanned the same way?", a: "The scanning pattern depends on the page's content density, not its category", d: ["Forums always load slower", "Landing pages have fewer links", "Forums use larger fonts"] },
        { cat: "Content & Readability", val: 500, q: "Why should a page's reading level match the target Persona's audience rather than sound \"impressive\"?", a: "A mismatched reading level drives away the exact readers the page needs", d: ["It affects page load speed", "It changes the site's SEO ranking directly", "It determines the color palette"] },
        { cat: "Content & Readability", val: 500, q: "What's the real risk of proofreading a page silently instead of reading it out loud before publishing?", a: "Your eyes skim past errors your ear would catch", d: ["Silent reading takes longer overall", "It skips the style sheet entirely", "It catches spelling but never grammar"] },

        // --- CATEGORY: SEO & DISCOVERY ---
        { cat: "SEO & Discovery", val: 100, q: "SEO stands for Search Engine what?", a: "Optimization", d: ["Organization", "Operation", "Ownership"] },
        { cat: "SEO & Discovery", val: 100, q: "The HTML tag that tells Google the main topic of a page, shown in the browser tab, is the what tag?", a: "<title>", d: ["<head>", "<h1>", "<meta>"] },
        { cat: "SEO & Discovery", val: 100, q: "How many <h1> tags should a single page generally have?", a: "One", d: ["Three", "Five", "As many as needed"] },

        { cat: "SEO & Discovery", val: 200, q: "The \"ad copy\" snippet shown under a link in Google search results comes from which tag?", a: "<meta description>", d: ["<title>", "<h1>", "<alt>"] },
        { cat: "SEO & Discovery", val: 200, q: "Alt text on an image primarily exists to serve what two purposes?", a: "SEO and accessibility", d: ["File size and color", "Speed and caching", "Branding and style"] },
        { cat: "SEO & Discovery", val: 200, q: "A keyword like \"RPG games\" -- short, broad, and extremely high-competition -- is called what kind of keyword?", a: "Short-Tail", d: ["Long-Tail", "Meta", "Root"] },

        { cat: "SEO & Discovery", val: 300, q: "A keyword like \"best SNES RPGs with time travel\" -- specific, lower competition -- is called what kind of keyword?", a: "Long-Tail", d: ["Short-Tail", "Meta", "Broad"] },
        { cat: "SEO & Discovery", val: 300, q: "The <title> tag, <meta description>, and single <h1> are together nicknamed the what?", a: "Holy Trinity", d: ["Big Three", "Core Stack", "SEO Triangle"] },
        { cat: "SEO & Discovery", val: 300, q: "Linking one page on your own site to a related page on that same site is called what?", a: "An internal link", d: ["A backlink", "An external link", "A redirect"] },

        { cat: "SEO & Discovery", val: 400, q: "Why is a new site more likely to rank for a long-tail keyword than a short-tail one?", a: "Lower competition and higher search intent", d: ["Long-tail keywords are free to use", "Google favors longer text automatically", "Short-tail keywords are banned for new sites"] },
        { cat: "SEO & Discovery", val: 400, q: "Descriptive alt text like \"Boss fight screenshot\" beats a filename like \"img047.png\" for what two reasons?", a: "SEO and accessibility", d: ["File size and load speed", "Color accuracy and contrast", "Caching and bandwidth"] },
        { cat: "SEO & Discovery", val: 400, q: "Why does Google treat <h2> and <h3> subheadings as more than just visual styling?", a: "They help Google understand the structure/topic of each section", d: ["They make pages load faster", "They replace the need for a title tag", "They count as backlinks"] },

        { cat: "SEO & Discovery", val: 500, q: "A brand-new site targets only short-tail keywords like \"RPG games\" right out of the gate. What's the realistic outcome?", a: "It won't rank -- the competition is too high", d: ["It will rank #1 immediately", "It will rank higher than long-tail pages", "Google will penalize the site"] },
        { cat: "SEO & Discovery", val: 500, q: "What's the recommended strategy for a brand-new site trying to earn its first real search rankings?", a: "Build multiple pages targeting long-tail keywords first", d: ["Buy ads instead of writing content", "Target the single highest-volume keyword", "Remove all internal links"] },
        { cat: "SEO & Discovery", val: 500, q: "Besides ranking, what's the other core reason internal links between related pages matter?", a: "They keep visitors on the site longer", d: ["They reduce server costs", "They increase image quality", "They shorten page load time"] }
    ].map(item => ({ ...item, chapter: "Chapter 3", grade: "Web Design 1" })));
