/**
 * CHAPTER 4: THE WHY (Intro to UI/UX)
 * MASTER MIGRATION FILE - UNIFIED DATA BANK
 * 75 Items Total (5 Categories x 5 Levels x 3 Variations)
 */
window.migrationPool = window.migrationPool || []; window.migrationPool.push(...[
        // --- CATEGORY: UI BASICS ---
        { cat: "UI Basics", val: 100, q: "This acronym refers to the visual icons, buttons, and colors a user touches.", a: "User Interface (UI)", d: ["UX", "URL", "API"] },
        { cat: "UI Basics", val: 100, q: "Which design role focuses specifically on choosing buttons, fonts, and colors?", a: "UI Designer", d: ["Back-End Dev", "UX Designer", "Database Admin"] },
        { cat: "UI Basics", val: 100, q: "Is the User Interface (UI) considered a part of the User Experience (UX)?", a: "Yes", d: ["No", "Only for mobile", "Only for servers"] },

        { cat: "UI Basics", val: 200, q: "A low-fidelity, 'skeletal' outline of a single web page layout.", a: "Wireframe", d: ["Mockup", "Prototype", "Moodboard"] },
        { cat: "UI Basics", val: 200, q: "A high-fidelity visual design that includes the final colors and fonts.", a: "Mockup", d: ["Wireframe", "Sketch", "Diagram"] },
        { cat: "UI Basics", val: 200, q: "A visual map showing the structure of every page in a website.", a: "Sitemap", d: ["Wireframe", "User Flow", "Logic Graph"] },

        { cat: "UI Basics", val: 300, q: "The tiny icon displayed in the browser tab next to the page title.", a: "Favicon", d: ["Logo", "Thumbnail", "Avatar"] },
        { cat: "UI Basics", val: 300, q: "Short text labels on buttons and links that guide users.", a: "Micro-copy", d: ["Metadata", "Min-code", "Sub-text"] },
        { cat: "UI Basics", val: 300, q: "The style and arrangement of text on a page to make it readable.", a: "Typography", d: ["Symmetry", "Hierarchy", "Alignment"] },

        { cat: "UI Basics", val: 400, q: "A font category that lacks the small decorative 'feet' on the ends of letters.", a: "Sans-Serif", d: ["Serif", "Monospaced", "Display"] },
        { cat: "UI Basics", val: 400, q: "A font category that features small lines or decorative feet on letters.", a: "Serif", d: ["Sans-Serif", "Cursive", "Gothic"] },
        { cat: "UI Basics", val: 400, q: "A font where every single letter has the exact same width.", a: "Monospaced", d: ["Serif", "Variable", "Display"] },

        { cat: "UI Basics", val: 500, q: "Designing for the smallest screens first before moving to desktop.", a: "Mobile-First", d: ["Desktop-First", "App-First", "User-First"] },
        { cat: "UI Basics", val: 500, q: "The specific width (in pixels) where a layout changes structure.", a: "Breakpoint", d: ["Cutoff", "Viewport", "Margin"] },
        { cat: "UI Basics", val: 500, q: "The term for a design that automatically adapts to any screen size.", a: "Responsive", d: ["Adaptive", "Fluid", "Fixed"] },

        // --- CATEGORY: USABILITY & HIERARCHY ---
        { cat: "Usability & Hierarchy", val: 100, q: "The term describing how easy and intuitive a website is to use.", a: "Usability", d: ["Accessibility", "Speed", "Scale"] },
        { cat: "Usability & Hierarchy", val: 100, q: "Empty space used in a design to create focus and clarity.", a: "White Space", d: ["Gutter", "Margin", "Void"] },
        { cat: "Usability & Hierarchy", val: 100, q: "Arranging elements in order of importance to guide the user's eye.", a: "Visual Hierarchy", d: ["Symmetry", "Consistency", "Alignment"] },

        { cat: "Usability & Hierarchy", val: 200, q: "Reusing similar visual styles and patterns throughout a website.", a: "Consistency", d: ["Variation", "Isolation", "Chaos"] },
        { cat: "Usability & Hierarchy", val: 200, q: "The difference between light and dark elements used to create focus.", a: "Contrast", d: ["Balance", "Rhythm", "Harmony"] },
        { cat: "Usability & Hierarchy", val: 200, q: "The 'Golden Rule' of UX is to always focus on this specific group.", a: "The Users", d: ["The Clients", "The Coder", "The Boss"] },

        { cat: "Usability & Hierarchy", val: 300, q: "A visual hint that tells a user an item is interactive (e.g. looking like a button).", a: "Affordance", d: ["Constraint", "Insight", "Feedback"] },
        { cat: "Usability & Hierarchy", val: 300, q: "Anything that slows a user down or causes frustration in an interface.", a: "Friction", d: ["Flow", "Logic", "Pattern"] },
        { cat: "Usability & Hierarchy", val: 300, q: "Showing information only when the user needs it to avoid overwhelm.", a: "Progressive Disclosure", d: ["Full Reveal", "Auto-Display", "Direct Load"] },

        { cat: "Usability & Hierarchy", val: 400, q: "The scanning pattern users follow on text-heavy pages (top left to right).", a: "F-Pattern", d: ["Z-Pattern", "Diagonal", "Circular"] },
        { cat: "Usability & Hierarchy", val: 400, q: "The scanning pattern users follow on visual-heavy landing pages.", a: "Z-Pattern", d: ["F-Pattern", "Zig-Zag", "Diagonal"] },
        { cat: "Usability & Hierarchy", val: 400, q: "The spacing between individual characters in a font.", a: "Kerning", d: ["Leading", "Tracking", "Spacing"] },

        { cat: "Usability & Hierarchy", val: 500, q: "The spacing between vertical lines of text.", a: "Leading", d: ["Kerning", "Gutter", "Margin"] },
        { cat: "Usability & Hierarchy", val: 500, q: "The amount of information displayed in a given screen area.", a: "Information Density", d: ["Data Size", "Pixel Depth", "Memory Load"] },
        { cat: "Usability & Hierarchy", val: 500, q: "A design style making digital items look like real-world physical objects.", a: "Skeuomorphism", d: ["Flat Design", "Glassmorphism", "Dark Mode"] },

        // --- CATEGORY: LAYOUT & LAWS ---
        { cat: "Layout & Laws", val: 100, q: "A design principle for balanced image placement using a 3x3 grid.", a: "Rule of Thirds", d: ["Rule of Odds", "Golden Ratio", "Center Rule"] },
        { cat: "Layout & Laws", val: 100, q: "A button or link that tells a user exactly what to do next.", a: "Call to Action (CTA)", d: ["NAV", "ALT", "META"] },
        { cat: "Layout & Laws", val: 100, q: "Content that is visible on the screen without having to scroll down.", a: "Above the Fold", d: ["Below the Fold", "Footer", "Sidebar"] },

        { cat: "Layout & Laws", val: 200, q: "Design law: Users prefer your site to work like other sites they know.", a: "Jakob's Law", d: ["Hick's Law", "Fitts's Law", "Miller's Law"] },
        { cat: "Layout & Laws", val: 200, q: "Design law: More choices lead to slower user decisions.", a: "Hick's Law", d: ["Fitts's Law", "Jakob's Law", "Moore's Law"] },
        { cat: "Layout & Laws", val: 200, q: "Design law: The time to hit a target depends on its size and distance.", a: "Fitts's Law", d: ["Hick's Law", "Jakob's Law", "Ohm's Law"] },

        { cat: "Layout & Laws", val: 300, q: "The total mental effort required for a user to use your interface.", a: "Cognitive Load", d: ["Physical Load", "Data Load", "Browser Load"] },
        { cat: "Layout & Laws", val: 300, q: "A specific user frustration or problem encountered in an app.", a: "Pain Point", d: ["Selling Point", "Reference Point", "Data Point"] },
        { cat: "Layout & Laws", val: 300, q: "A popup window that blocks the main page until dismissed.", a: "Modal", d: ["Banner", "Tooltip", "Widget"] },

        { cat: "Layout & Laws", val: 400, q: "Principles describing how humans group visual items (Gestalt).", a: "Laws of Organization", d: ["Laws of Physics", "Laws of Motion", "Code Syntax"] },
        { cat: "Layout & Laws", val: 400, q: "The mathematical ratio (1.618) used for pleasing proportions.", a: "Golden Ratio", d: ["Rule of Thirds", "Pi", "Fibonacci"] },
        { cat: "Layout & Laws", val: 400, q: "Designing a simple, 2D interface with no shadows or textures.", a: "Flat Design", d: ["Skeuomorphism", "3D Design", "Realism"] },

        { cat: "Layout & Laws", val: 500, q: "UX Rule: Users judge a whole experience by the highest point and the finish.", a: "Peak-End Rule", d: ["Start-Finish Rule", "High-Low Rule", "Context Rule"] },
        { cat: "Layout & Laws", val: 500, q: "UX Rule: People remember unfinished tasks better than completed ones.", a: "Zeigarnik Effect", d: ["Hick's Law", "Fitts's Law", "Miller's Effect"] },
        { cat: "Layout & Laws", val: 500, q: "A navigation path trail showing where the user is in the hierarchy.", a: "Breadcrumb", d: ["Sitemap", "User Flow", "Hamburger Menu"] },

        // --- CATEGORY: VISUAL DESIGN ---
        { cat: "Visual Design", val: 100, q: "Which color family includes Red, Orange, and Yellow?", a: "Warm Colors", d: ["Cool Colors", "Monochromatic", "Secondary"] },
        { cat: "Visual Design", val: 100, q: "Which color family includes Blue, Green, and Purple?", a: "Cool Colors", d: ["Warm Colors", "Primary", "Loud Colors"] },
        { cat: "Visual Design", val: 100, q: "A color scheme using different shades and tints of only one color.", a: "Monochromatic", d: ["Analogous", "Complementary", "Triadic"] },

        { cat: "Visual Design", val: 200, q: "Colors that are directly opposite each other on the color wheel.", a: "Complementary", d: ["Analogous", "Monochromatic", "Grayscale"] },
        { cat: "Visual Design", val: 200, q: "Colors that sit next to each other on the color wheel.", a: "Analogous", d: ["Complementary", "Opposite", "Primary"] },
        { cat: "Visual Design", val: 200, q: "High contrast in color is a key requirement for this web standard.", a: "Accessibility", d: ["Speed", "Storage", "Hosting"] },

        { cat: "Visual Design", val: 300, q: "A collection of images and colors used to set the initial vibe of a project.", a: "Moodboard", d: ["Wireframe", "Sitemap", "Storyboard"] },
        { cat: "Visual Design", val: 300, q: "A system of reusable UI components used by big brands like Google.", a: "Design System", d: ["Framework", "CMS", "Database"] },
        { cat: "Visual Design", val: 300, q: "An interface featuring light text on a dark background.", a: "Dark Mode", d: ["Light Mode", "Grayscale", "Inverted"] },

        { cat: "Visual Design", val: 400, q: "Designing for as many people as possible, regardless of ability.", a: "Inclusive Design", d: ["Exclusive Design", "Solo Design", "Draft Design"] },
        { cat: "Visual Design", val: 400, q: "Studying where a user's vision focuses on a screen using sensors.", a: "Eye Tracking", d: ["Heatmapping", "Analytics", "Logging"] },
        { cat: "Visual Design", val: 400, q: "Visualizing where users click most using 'hot' and 'cold' colors.", a: "Heatmapping", d: ["Sitemapping", "Charting", "Graphing"] },

        { cat: "Visual Design", val: 500, q: "A screen that is shown when there is no user data to display yet.", a: "Zero State", d: ["Error State", "Landing Page", "Home Screen"] },
        { cat: "Visual Design", val: 500, q: "A hint that tells a user they are on the right path to their goal.", a: "Information Scent", d: ["Logic Trail", "Visual Hint", "Link Path"] },
        { cat: "Visual Design", val: 500, q: "Reviewing a website against a set of 'best practice' rules.", a: "Heuristic Evaluation", d: ["A/B Test", "User Interview", "Code Audit"] },

        // --- CATEGORY: UX STRATEGY ---
        { cat: "UX Strategy", val: 100, q: "The term for how a user FEELS when interacting with a brand.", a: "User Experience (UX)", d: ["UI", "URL", "ISP"] },
        { cat: "UX Strategy", val: 100, q: "Which role focuses on the overall logic, flow, and user psychology?", a: "UX Designer", d: ["UI Designer", "Front-End Dev", "Back-End Dev"] },
        { cat: "UX Strategy", val: 100, q: "The practice of using game-like elements in a website (like badges).", a: "Gamification", d: ["Play-testing", "Animation", "Interaction"] },

        { cat: "UX Strategy", val: 200, q: "A tool used to understand and document user feelings and thoughts.", a: "Empathy Map", d: ["Wireframe", "Sitemap", "SWOT Grid"] },
        { cat: "UX Strategy", val: 200, q: "Visualizing every single step a user takes to reach a goal.", a: "User Journey Map", d: ["Sitemap", "Logic Loop", "Flowchart"] },
        { cat: "UX Strategy", val: 200, q: "Comparing two designs with real users to see which one is more effective.", a: "A/B Testing", d: ["Mirror Testing", "Code Check", "Solo Review"] },

        { cat: "UX Strategy", val: 300, q: "An interactive, clickable version of a design meant for testing logic.", a: "Prototype", d: ["Mockup", "Wireframe", "Draft"] },
        { cat: "UX Strategy", val: 300, q: "The design process where real users are involved in every phase.", a: "User-Centered Design", d: ["Boss-Centered Design", "Code-First Design", "Logic Design"] },
        { cat: "UX Strategy", val: 300, q: "A fast, agile way to design by building and testing small ideas.", a: "Lean UX", d: ["Heavy UX", "Slow UX", "Waterfall Design"] },

        { cat: "UX Strategy", val: 400, q: "The famous psychologist known as the 'Father of UX'.", a: "Don Norman", d: ["Steve Jobs", "Tim Berners-Lee", "Bill Gates"] },
        { cat: "UX Strategy", val: 400, q: "Short descriptions of a user need: 'As a user, I want to...'", a: "User Story", d: ["User Manual", "User Legend", "User Script"] },
        { cat: "UX Strategy", val: 400, q: "Anything that adds unnecessary steps or mental effort for a user.", a: "Friction", d: ["Flow", "Ease", "Affordance"] },

        { cat: "UX Strategy", val: 500, q: "The 'Paradox of Choice' means users are LESS happy when given...", a: "More Options", d: ["Less Options", "Clear Menus", "Fast Speed"] },
        { cat: "UX Strategy", val: 500, q: "A rough, thumbnail-sized sketch of a design idea.", a: "Thumbnail Sketch", d: ["Mockup", "Prototype", "Wireframe"] },
        { cat: "UX Strategy", val: 500, q: "The primary difference between a prototype and a mockup.", a: "Interactivity", d: ["Color", "Price", "File Size"] }
    ].map(item => ({ ...item, chapter: "Chapter 4", grade: "Web Design 1" })));
