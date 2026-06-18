/**
 * ULTIMATE PROGRAM REVIEW (Chapters 1-18)
 * MASTER MIGRATION FILE - UNIFIED DATA BANK
 * POOL: 18 Categories (270 Items Total)
 * Each level (100-500) has 3 unique variations for randomization.
 * Categories formatted for professional display (no Chapter numbers).
 * JEOPARDY LOGIC: Randomly selects 5 of 18 categories per session.
 */
window.migrationPool = window.migrationPool || []; window.migrationPool.push(...[
        // ==========================================
        // 1. PROFESSIONALISM (Ch 1)
        // ==========================================
        { cat: "Professionalism", val: 100, q: "Arriving on time and ready to work in a professional guild.", a: "Punctuality", d: ["Reliability", "Dress Code", "Initiative"] },
        { cat: "Professionalism", val: 100, q: "Appropriate clothing for a specific work environment.", a: "Attire", d: ["Punctuality", "Ethics", "Inclusivity"] },
        { cat: "Professionalism", val: 100, q: "Doing what you say you will do; being consistent.", a: "Dependability", d: ["Punctuality", "Leadership", "Communication"] },
        { cat: "Professionalism", val: 200, q: "Conduct and behavior expected in a workplace.", a: "Professionalism", d: ["Etiquette", "Attitude", "Ethics"] },
        { cat: "Professionalism", val: 200, q: "Clear and respectful exchange of info between devs.", a: "Communication", d: ["Networking", "Broadcasting", "Socializing"] },
        { cat: "Professionalism", val: 200, q: "Finding constructive solutions to team disagreements.", a: "Conflict Resolution", d: ["Mediation", "Teamwork", "Mediation"] },
        { cat: "Professionalism", val: 300, q: "Working well with others for a common goal.", a: "Teamwork", d: ["Leadership", "Networking", "Mediation"] },
        { cat: "Professionalism", val: 300, q: "Motivating others toward a project objective.", a: "Leadership", d: ["Management", "Mediation", "Coaching"] },
        { cat: "Professionalism", val: 300, q: "Taking action without being asked; being proactive.", a: "Initiative", d: ["Punctuality", "Motivation", "Dependability"] },
        { cat: "Professionalism", val: 400, q: "Adjusting to new conditions and project shifts.", a: "Flexibility", d: ["Adaptability", "Consistency", "Endurance"] },
        { cat: "Professionalism", val: 400, q: "Using time effectively to meet guild deadlines.", a: "Time Management", d: ["Efficiency", "Schedules", "Planning"] },
        { cat: "Professionalism", val: 400, q: "Valuing different backgrounds and perspectives in design.", a: "Inclusivity", d: ["Accessibility", "Diversity", "Tolerance"] },
        { cat: "Professionalism", val: 500, q: "Principles governing behavior in the guild.", a: "Ethics", d: ["Laws", "Rules", "Habits"] },
        { cat: "Professionalism", val: 500, q: "Following all laws and regulations strictly.", a: "Compliance", d: ["Legality", "Validation", "Ethics"] },
        { cat: "Professionalism", val: 500, q: "Keeping secret info safe and confidential.", a: "Confidentiality", d: ["Privacy", "Security", "Encryption"] },

        // ==========================================
        // 2. INFRASTRUCTURE (Ch 2)
        // ==========================================
        { cat: "Infrastructure", val: 100, q: "The physical network of connected computers.", a: "Internet", d: ["World Wide Web", "DNS", "HTTP"] },
        { cat: "Infrastructure", val: 100, q: "A system of documents linked via the internet.", a: "The Web", d: ["Internet", "HTML", "Cloud"] },
        { cat: "Infrastructure", val: 100, q: "A computer that stores and serves site files.", a: "Server", d: ["Client", "Router", "Modem"] },
        { cat: "Infrastructure", val: 200, q: "App used to view pages (e.g., Chrome).", a: "Browser", d: ["Web Host", "Protocol", "Spider"] },
        { cat: "Infrastructure", val: 200, q: "Protocol used to transfer web documents.", a: "HTTP", d: ["FTP", "SMTP", "DNS"] },
        { cat: "Infrastructure", val: 200, q: "The unique address of a specific webpage.", a: "URL", d: ["IP Address", "Domain", "Protocol"] },
        { cat: "Infrastructure", val: 300, q: "Translates domain names into IP addresses.", a: "DNS", d: ["DHCP", "URL", "ISP"] },
        { cat: "Infrastructure", val: 300, q: "Numerical label assigned to each network device.", a: "IP Address", d: ["Domain Name", "URL", "MAC"] },
        { cat: "Infrastructure", val: 300, q: "Company providing internet access to users.", a: "ISP", d: ["W3C", "ICANN", "DNS"] },
        { cat: "Infrastructure", val: 400, q: "The user or device requesting data from a server.", a: "Client", d: ["Host", "Server", "Proxy"] },
        { cat: "Infrastructure", val: 400, q: "Chunks of data sent over a network path.", a: "Packets", d: ["Bits", "Nodes", "Frames"] },
        { cat: "Infrastructure", val: 400, q: "Capacity of a network to transmit data.", a: "Bandwidth", d: ["Latency", "Ping", "Speed"] },
        { cat: "Infrastructure", val: 500, q: "Delay before data transfer begins.", a: "Latency", d: ["Throughput", "Uptime", "Ping"] },
        { cat: "Infrastructure", val: 500, q: "The secure, encrypted version of HTTP.", a: "HTTPS", d: ["HTTP", "SSL", "FTP"] },
        { cat: "Infrastructure", val: 500, q: "Language used for the structural markup of the web.", a: "HTML", d: ["CSS", "JavaScript", "SQL"] },

        // ==========================================
        // 3. LAW & ETHICS (Ch 3)
        // ==========================================
        { cat: "Law & Ethics", val: 100, q: "Protection for original works fixed in tangible form.", a: "Copyright", d: ["Trademark", "Patent", "NDA"] },
        { cat: "Law & Ethics", val: 100, q: "Using work without credit as if it were yours.", a: "Plagiarism", d: ["Piracy", "Leak", "Cloning"] },
        { cat: "Law & Ethics", val: 100, q: "The right to keep private data secret.", a: "Privacy", d: ["Copyright", "Trademark", "Shield"] },
        { cat: "Law & Ethics", val: 200, q: "Designing for users of all abilities.", a: "Accessibility", d: ["Usability", "Scaling", "Logic"] },
        { cat: "Law & Ethics", val: 200, q: "Symbol used to indicate copyright protection.", a: "©", d: ["®", "™", "@"] },
        { cat: "Law & Ethics", val: 200, q: "US law protecting kids under 13 online.", a: "COPPA", d: ["GDPR", "FERPA", "HIPAA"] },
        { cat: "Law & Ethics", val: 300, q: "Protection for logos and slogans.", a: "Trademark", d: ["Copyright", "Patent", "NDA"] },
        { cat: "Law & Ethics", val: 300, q: "Legal protection for inventions.", a: "Patent", d: ["Copyright", "Trademark", "NDA"] },
        { cat: "Law & Ethics", val: 300, q: "Limited exception for use for education.", a: "Fair Use", d: ["Public Domain", "Creative Commons", "Open Source"] },
        { cat: "Law & Ethics", val: 400, q: "Works with expired copyright free to all.", a: "Public Domain", d: ["Creative Commons", "Open Source", "Fair Use"] },
        { cat: "Law & Ethics", val: 400, q: "Flexible licenses allowing sharing with rules.", a: "Creative Commons", d: ["EULA", "NDA", "Public Domain"] },
        { cat: "Law & Ethics", val: 400, q: "Strict EU data protection regulation.", a: "GDPR", d: ["COPPA", "ADA", "HIPAA"] },
        { cat: "Law & Ethics", val: 500, q: "Scrambling data into a secret code.", a: "Encryption", d: ["Minification", "Compression", "Formatting"] },
        { cat: "Law & Ethics", val: 500, q: "Software with public source code anyone can edit.", a: "Open Source", d: ["Proprietary", "Private", "Closed"] },
        { cat: "Law & Ethics", val: 500, q: "Hacker who fixes holes to help security.", a: "White Hat", d: ["Black Hat", "Gray Hat", "Script Kiddie"] },

        // ==========================================
        // 4. USER RESEARCH (Ch 4)
        // ==========================================
        { cat: "User Research", val: 100, q: "Fictional profile representing a target user segment.", a: "User Persona", d: ["Admin", "Bot", "Ghost"] },
        { cat: "User Research", val: 100, q: "The specific group a site is designed for.", a: "Target Audience", d: ["Developers", "Focus Group", "Stakeholders"] },
        { cat: "User Research", val: 100, q: "Gathering data directly from people to plan a design.", a: "Interviews", d: ["Surveys", "Heatmaps", "Testing"] },
        { cat: "User Research", val: 200, q: "Data about user attitudes and motivations.", a: "Psychographics", d: ["Demographics", "Analytics", "Bio-metrics"] },
        { cat: "User Research", val: 200, q: "Stats about population like age and gender.", a: "Demographics", d: ["Psychographics", "Geographics", "Bio-metrics"] },
        { cat: "User Research", val: 200, q: "The psychological 'why' behind a user's behavior.", a: "Motivation", d: ["Scenario", "Persona", "Logic"] },
        { cat: "User Research", val: 300, q: "Data involving feelings and user 'whys'.", a: "Qualitative Data", d: ["Quantitative", "Hard Data", "Stats"] },
        { cat: "User Research", val: 300, q: "Data measured using numbers and stats.", a: "Quantitative Data", d: ["Qualitative", "Soft Data", "Vague"] },
        { cat: "User Research", val: 300, q: "Record of every link a user clicked during a visit.", a: "Clickstream", d: ["User Path", "Journey", "History"] },
        { cat: "User Research", val: 400, q: "Specific problems users face in an interface.", a: "Pain Points", d: ["Bonus Perks", "Selling Points", "Reference Points"] },
        { cat: "User Research", val: 400, q: "The step-by-step path a user takes to a goal.", a: "User Journey", d: ["Site Map", "Logic Loop", "Flowchart"] },
        { cat: "User Research", val: 400, q: "Links from other reputable sites back to yours.", a: "Backlinks", d: ["Internal Links", "Meta Links", "Forward"] },
        { cat: "User Research", val: 500, q: "Visual tool mapping user thoughts and state.", a: "Empathy Map", d: ["Wireframe", "Sitemap", "Sketch"] },
        { cat: "User Research", val: 500, q: "Assuming others think exactly like you do.", a: "False Consensus Bias", d: ["Confirmation Bias", "Memory Bias", "Halo Effect"] },
        { cat: "User Research", val: 500, q: "Turning research data into non-obvious insights.", a: "Synthesis", d: ["Collection", "Deletion", "Drafting"] },

        // ==========================================
        // 5. PROJECT PLANNING (Ch 5)
        // ==========================================
        { cat: "Project Planning", val: 100, q: "Blueprint of a site's page structure.", a: "Sitemap", d: ["Wireframe", "Mockup", "Script"] },
        { cat: "Project Planning", val: 100, q: "The primary mission a site needs to achieve.", a: "Objective", d: ["Color Scheme", "Code Limit", "URL"] },
        { cat: "Project Planning", val: 100, q: "The navigation system letting users move through a site.", a: "Navigation", d: ["GPS", "Search bar", "Sitemap"] },
        { cat: "Project Planning", val: 200, q: "Skeletal outline of a single page layout.", a: "Wireframe", d: ["Mockup", "Prototype", "Sketch"] },
        { cat: "Project Planning", val: 200, q: "What is included and excluded in a plan.", a: "Scope", d: ["Scale", "Budget", "Resolution"] },
        { cat: "Project Planning", val: 200, q: "Menu designed specifically for tiny screens.", a: "Hamburger Menu", d: ["Sidebar", "Dropdown", "Mega"] },
        { cat: "Project Planning", val: 300, q: "Site looking good and working on all device sizes.", a: "Responsive Design", d: ["Static Design", "Adaptive", "Fluid"] },
        { cat: "Project Planning", val: 300, q: "Users reaching a specific goal like a sale.", a: "Conversion", d: ["Bounce", "Drop-off", "Refresh"] },
        { cat: "Project Planning", val: 300, q: "Feature a site MUST have for success.", a: "Requirement", d: ["Suggestion", "Decoration", "Draft"] },
        { cat: "Project Planning", val: 400, q: "High-fidelity static picture of a final design.", a: "Mockup", d: ["Wireframe", "Prototype", "Blueprint"] },
        { cat: "Project Planning", val: 400, q: "Interactive clickable simulation for testing.", a: "Prototype", d: ["Mockup", "Wireframe", "Draft"] },
        { cat: "Project Planning", val: 400, q: "Simplest version of a product to launch for feedback.", a: "MVP", d: ["Alpha", "Beta", "Draft"] },
        { cat: "Project Planning", val: 500, q: "Using columns and rows to plan page logic.", a: "Grid System", d: ["Flexbox", "Tables", "Divs"] },
        { cat: "Project Planning", val: 500, q: "Repeating the design loop to improve results.", a: "Iteration", d: ["Recursion", "Stagnation", "Cloning"] },
        { cat: "Project Planning", val: 500, q: "Reviewing all content before a redesign.", a: "Content Audit", d: ["Code Review", "Link Check", "Tax Audit"] },

        // ==========================================
        // 6. UI/UX DESIGN (Ch 6)
        // ==========================================
        { cat: "UI/UX Design", val: 100, q: "How a user feels while using a system.", a: "UX", d: ["UI", "API", "SSL"] },
        { cat: "UI/UX Design", val: 100, q: "Visual elements a user touches like buttons.", a: "UI", d: ["UX", "URL", "API"] },
        { cat: "UI/UX Design", val: 100, q: "How easy a site is to use and understand.", a: "Usability", d: ["Scaling", "Logic", "Speed"] },
        { cat: "UI/UX Design", val: 200, q: "More choices lead to slower decisions.", a: "Hick's Law", d: ["Jakob's Law", "Fitts's Law", "Moore's Law"] },
        { cat: "UI/UX Design", val: 200, q: "Users prefer your site to work like others they know.", a: "Jakob's Law", d: ["Hick's Law", "Fitts's Law", "Ohm's Law"] },
        { cat: "UI/UX Design", val: 200, q: "Time to hit a target depends on size and distance.", a: "Fitts's Law", d: ["Hick's Law", "Jakob's Law", "Murphy's Law"] },
        { cat: "UI/UX Design", val: 300, q: "Arranging elements to guide the user's eye.", a: "Visual Hierarchy", d: ["Symmetry", "Consistency", "Alignment"] },
        { cat: "UI/UX Design", val: 300, q: "Empty space creating focus and breathing room.", a: "White Space", d: ["Gutter", "Margin", "Void"] },
        { cat: "UI/UX Design", val: 300, q: "Visual difference creating focus.", a: "Contrast", d: ["Balance", "Harmony", "Rhythm"] },
        { cat: "UI/UX Design", val: 400, q: "Total mental effort to use an interface.", a: "Cognitive Load", d: ["Data Load", "Physical Load", "Lag"] },
        { cat: "UI/UX Design", val: 400, q: "Anything slowing a user down or annoying them.", a: "Friction", d: ["Flow", "Ease", "Affordance"] },
        { cat: "UI/UX Design", val: 400, q: "Visual hint that an item is clickable.", a: "Affordance", d: ["Constraint", "Insight", "Feedback"] },
        { cat: "UI/UX Design", val: 500, q: "Reviewing a site against 'best practice' rules.", a: "Heuristic Evaluation", d: ["A/B Test", "Audit", "Sitemap"] },
        { cat: "UI/UX Design", val: 500, q: "Users judge an experience by the peak and end.", a: "Peak-End Rule", d: ["Hick's Law", "Jakob's Law", "Fitts's Law"] },
        { cat: "UI/UX Design", val: 500, q: "Studying user eye focus using sensors.", a: "Eye Tracking", d: ["Heatmapping", "Analytics", "Logging"] },

        // ==========================================
        // 7. HTML FOUNDATIONS (Ch 7)
        // ==========================================
        { cat: "HTML Foundations", val: 100, q: "Tag for the largest and most important heading.", a: "<h1>", d: ["<h6>", "<head>", "<header>"] },
        { cat: "HTML Foundations", val: 100, q: "Tag used to define a standard paragraph of text.", a: "<p>", d: ["<text>", "<pg>", "<span>"] },
        { cat: "HTML Foundations", val: 100, q: "Correct HTML tag for a clickable hyperlink.", a: "<a>", d: ["<link>", "<href>", "<url>"] },
        { cat: "HTML Foundations", val: 200, q: "Attribute providing link destination on an anchor.", a: "href", d: ["src", "url", "link"] },
        { cat: "HTML Foundations", val: 200, q: "Mandatory attribute in img tag for accessibility.", a: "alt", d: ["title", "src", "longdesc"] },
        { cat: "HTML Foundations", val: 200, q: "Attribute specifying file path of an image.", a: "src", d: ["href", "url", "link"] },
        { cat: "HTML Foundations", val: 300, q: "Putting tags inside other tags correctly.", a: "Nesting", d: ["Cascading", "Stacking", "Padding"] },
        { cat: "HTML Foundations", val: 300, q: "Tag for an unordered (bulleted) list.", a: "<ul>", d: ["<ol>", "<li>", "<dl>"] },
        { cat: "HTML Foundations", val: 300, q: "Tag for a single item within a list.", a: "<li>", d: ["<ul>", "<item>", "<pt>"] },
        { cat: "HTML Foundations", val: 400, q: "Meaningful tags describing content purpose.", a: "Semantic HTML", d: ["Valid HTML", "Logic HTML", "CSS Structure"] },
        { cat: "HTML Foundations", val: 400, q: "Introductory content at the top of a page/section.", a: "<header>", d: ["<head>", "<top>", "<nav>"] },
        { cat: "HTML Foundations", val: 400, q: "Tag used specifically for navigation blocks.", a: "<nav>", d: ["<links>", "<menu>", "<div>"] },
        { cat: "HTML Foundations", val: 500, q: "Required first line of any HTML5 document.", a: "<!DOCTYPE html>", d: ["<html>", "<head>", "<start>"] },
        { cat: "HTML Foundations", val: 500, q: "Standard character encoding for web pages.", a: "UTF-8", d: ["ASCII", "Unicode", "ISO"] },
        { cat: "HTML Foundations", val: 500, q: "Tag to embed another HTML page inside a page.", a: "<iframe>", d: ["<embed>", "<object>", "<view>"] },

        // ==========================================
        // 8. CSS BASICS (Ch 8)
        // ==========================================
        { cat: "CSS Basics", val: 100, q: "Cascading Style Sheets acronym.", a: "CSS", d: ["Coded Style", "Creative Sheets", "Computer Style"] },
        { cat: "CSS Basics", val: 100, q: "Property changing text color.", a: "color", d: ["font-color", "text-fill", "shade"] },
        { cat: "CSS Basics", val: 100, q: "Property changing box background.", a: "background-color", d: ["color", "bg-fill", "shading"] },
        { cat: "CSS Basics", val: 200, q: "Selector symbol targeting a specific ID.", a: "# (Hash)", d: [". (Dot)", "*", "@"] },
        { cat: "CSS Basics", val: 200, q: "Selector symbol targeting a specific Class.", a: ". (Dot)", d: ["# (Hash)", "*", "$"] },
        { cat: "CSS Basics", val: 200, q: "Property controlling text character size.", a: "font-size", d: ["text-size", "scale", "font-width"] },
        { cat: "CSS Basics", val: 300, q: "Space inside an element between content and border.", a: "Padding", d: ["Margin", "Outline", "Gutter"] },
        { cat: "CSS Basics", val: 300, q: "Space outside element border to separate from others.", a: "Margin", d: ["Padding", "Border", "Depth"] },
        { cat: "CSS Basics", val: 300, q: "Property creating rounded box corners.", a: "border-radius", d: ["corner-round", "circle-tool", "curve"] },
        { cat: "CSS Basics", val: 400, q: "Styles inside a tag via style attribute.", a: "Inline CSS", d: ["Internal", "External", "Linked"] },
        { cat: "CSS Basics", val: 400, q: "Styles inside head tags via style tag.", a: "Internal CSS", d: ["Inline", "External", "Linked"] },
        { cat: "CSS Basics", val: 400, q: "Styles in a separate file connected via link.", a: "External CSS", d: ["Internal", "Inline", "Embedded"] },
        { cat: "CSS Basics", val: 500, q: "Keyword forcing a style to win the hierarchy.", a: "!important", d: ["!force", "!priority", "!win"] },
        { cat: "CSS Basics", val: 500, q: "Hierarchy determining which style rule wins.", a: "Cascade", d: ["Waterfall", "Specificity", "Inheritance"] },
        { cat: "CSS Basics", val: 500, q: "Rank of a selector based on complexity.", a: "Specificity", d: ["Density", "Priority", "Inheritance"] },

        // ==========================================
        // 9. ADVANCED LAYOUT (Ch 9)
        // ==========================================
        { cat: "Advanced Layout", val: 100, q: "1D layout model for rows or columns.", a: "Flexbox", d: ["Grid", "Float", "Table"] },
        { cat: "Advanced Layout", val: 100, q: "Property turning container into flex container.", a: "display: flex", d: ["layout: flex", "flex-mode: on", "display: grid"] },
        { cat: "Advanced Layout", val: 100, q: "2D layout system for rows and columns.", a: "CSS Grid", d: ["Flexbox", "Block Flow", "Absolute"] },
        { cat: "Advanced Layout", val: 200, q: "Flexbox property aligning items along main axis.", a: "justify-content", d: ["align-items", "flex-direction", "place-content"] },
        { cat: "Advanced Layout", val: 200, q: "Flexbox property aligning items along cross axis.", a: "align-items", d: ["justify-content", "order", "flex-wrap"] },
        { cat: "Advanced Layout", val: 200, q: "Stack items vertically via flex-direction.", a: "column", d: ["row", "wrap", "stack"] },
        { cat: "Advanced Layout", val: 300, q: "Grid unit for flexible fraction of space.", a: "fr", d: ["px", "rem", "vh"] },
        { cat: "Advanced Layout", val: 300, q: "Property adding space between tracks.", a: "gap", d: ["padding", "margin", "spacing"] },
        { cat: "Advanced Layout", val: 300, q: "Flex items breaking onto new lines.", a: "flex-wrap", d: ["overflow", "flex-flow", "flex-grow"] },
        { cat: "Advanced Layout", val: 400, q: "Position moving item relative to its normal spot.", a: "relative", d: ["static", "absolute", "fixed"] },
        { cat: "Advanced Layout", val: 400, q: "Position removing item from flow to place relative to ancestor.", a: "absolute", d: ["fixed", "static", "relative"] },
        { cat: "Advanced Layout", val: 400, q: "Property controlling vertical stacking order.", a: "z-index", d: ["layer", "stack", "depth"] },
        { cat: "Advanced Layout", val: 500, q: "CSS rule applying styles based on screen width.", a: "@media", d: ["@viewport", "@import", "@keyframes"] },
        { cat: "Advanced Layout", val: 500, q: "Screen width where layout changes.", a: "Breakpoint", d: ["Cutoff", "Edge", "Limit"] },
        { cat: "Advanced Layout", val: 500, q: "Designing for tiny screens before largest.", a: "Mobile-First", d: ["App-First", "User-First", "Desktop-First"] },

        // ==========================================
        // 10. MULTIMEDIA (Ch 10)
        // ==========================================
        { cat: "Multimedia", val: 100, q: "HTML tag for static pictures.", a: "<img>", d: ["<pic>", "<image>", "<photo>"] },
        { cat: "Multimedia", val: 100, q: "HTML tag for sound files.", a: "<audio>", d: ["<sound>", "<music>", "<voice>"] },
        { cat: "Multimedia", val: 100, q: "HTML tag for movie files.", a: "<video>", d: ["<movie>", "<film>", "<clip>"] },
        { cat: "Multimedia", val: 200, q: "Adds play/pause/volume to media players.", a: "controls", d: ["ui", "buttons", "player"] },
        { cat: "Multimedia", val: 200, q: "Starts media playing immediately.", a: "autoplay", d: ["start", "auto", "run"] },
        { cat: "Multimedia", val: 200, q: "Repeats media from start when done.", a: "loop", d: ["cycle", "repeat", "rebound"] },
        { cat: "Multimedia", val: 300, q: "Math-based vector format scaling crisply.", a: "SVG", d: ["JPG", "PNG", "GIF"] },
        { cat: "Multimedia", val: 300, q: "Lossy format best for photographs.", a: "JPG", d: ["PNG", "SVG", "GIF"] },
        { cat: "Multimedia", val: 300, q: "Lossless format supporting transparency.", a: "PNG", d: ["JPG", "SVG", "GIF"] },
        { cat: "Multimedia", val: 400, q: "Tag defining a data grid.", a: "<table>", d: ["<grid>", "<list>", "<box>"] },
        { cat: "Multimedia", val: 400, q: "Tag for a single row in a table.", a: "<tr>", d: ["<td>", "<th>", "<row>"] },
        { cat: "Multimedia", val: 400, q: "Tag for actual data in a cell.", a: "<td>", d: ["<tr>", "<th>", "<cell>"] },
        { cat: "Multimedia", val: 500, q: "Merging cell across columns.", a: "colspan", d: ["rowspan", "span", "merge"] },
        { cat: "Multimedia", val: 500, q: "Merging cell down rows.", a: "rowspan", d: ["colspan", "span", "merge"] },
        { cat: "Multimedia", val: 500, q: "Property merging table borders into lines.", a: "border-collapse", d: ["spacing-none", "cell-join", "border-merge"] },

        // ==========================================
        // 11. JAVASCRIPT LOGIC (Ch 11)
        // ==========================================
        { cat: "JavaScript Logic", val: 100, q: "Permanent variable keyword.", a: "const", d: ["let", "var", "fixed"] },
        { cat: "JavaScript Logic", val: 100, q: "Mutable variable keyword.", a: "let", d: ["const", "var", "fixed"] },
        { cat: "JavaScript Logic", val: 100, q: "Function printing to console.", a: "console.log()", d: ["print()", "alert()", "echo()"] },
        { cat: "JavaScript Logic", val: 200, q: "Operator for strict equality.", a: "===", d: ["==", "=", "!="] },
        { cat: "JavaScript Logic", val: 200, q: "Text data type in quotes.", a: "String", d: ["Number", "Boolean", "Object"] },
        { cat: "JavaScript Logic", val: 200, q: "Binary data type (true/false).", a: "Boolean", d: ["String", "Float", "Array"] },
        { cat: "JavaScript Logic", val: 300, q: "Reusable logic block.", a: "Function", d: ["Loop", "Variable", "Array"] },
        { cat: "JavaScript Logic", val: 300, q: "Ordered list of items.", a: "Array", d: ["Object", "Literal", "Constant"] },
        { cat: "JavaScript Logic", val: 300, q: "Structure storing info in key-value pairs.", a: "Object", d: ["Array", "Variable", "Statement"] },
        { cat: "JavaScript Logic", val: 400, q: "Select HTML tag by unique ID.", a: "getElementById()", d: ["querySelector()", "find()", "select()"] },
        { cat: "JavaScript Logic", val: 400, q: "Attach listener for click events.", a: "addEventListener", d: ["onClick", "hear()", "trigger()"] },
        { cat: "JavaScript Logic", val: 400, q: "Property for text-only tag content.", a: "textContent", d: ["innerHTML", "value", "innerText"] },
        { cat: "JavaScript Logic", val: 500, q: "Browser's tree of HTML objects.", a: "DOM", d: ["API", "URL", "SSL"] },
        { cat: "JavaScript Logic", val: 500, q: "Pausing async code until Promise returns.", a: "await", d: ["halt", "wait", "yield"] },
        { cat: "JavaScript Logic", val: 500, q: "Function passed as arg to another.", a: "Callback", d: ["Promise", "Variable", "Literal"] },

        // ==========================================
        // 12. GAME DEVELOPMENT (Ch 12)
        // ==========================================
        { cat: "Game Development", val: 100, q: "Repeated cycle of updating logic and drawing pixels.", a: "Game Loop", d: ["Infinite Loop", "Logic Cycle", "Render Cycle"] },
        { cat: "Game Development", val: 100, q: "Browser API specifically designed for smooth 60fps animations.", a: "requestAnimationFrame", d: ["setInterval", "setTimeout", "animate()"] },
        { cat: "Game Development", val: 100, q: "Standard measurement for how smooth a game feels.", a: "FPS", d: ["Latency", "Ping", "Resolution"] },
        { cat: "Game Development", val: 200, q: "Time elapsed between the current and last frame.", a: "Delta Time", d: ["Lag Time", "Clock Rate", "Frame Gap"] },
        { cat: "Game Development", val: 200, q: "Ensures game speed is the same regardless of hardware power.", a: "Framerate Independence", d: ["Graphics Scaling", "Resolution Lock", "Input Delay"] },
        { cat: "Game Development", val: 200, q: "A loop with no end condition that crashes the browser.", a: "Infinite Loop", d: ["Game Loop", "While Loop", "Dead Loop"] },
        { cat: "Game Development", val: 300, q: "Simplest collision check using aligned rectangles.", a: "AABB", d: ["Raycast", "SAT", "Dot Product"] },
        { cat: "Game Development", val: 300, q: "Detecting when two digital objects occupy the same space.", a: "Collision", d: ["Intersection", "Overlap", "Trigger"] },
        { cat: "Game Development", val: 300, q: "Mathematical object used for movement and direction.", a: "Vector", d: ["Scalar", "Matrix", "Boolean"] },
        { cat: "Game Development", val: 400, q: "The 'invisible' area around an entity that detects hits.", a: "Hitbox", d: ["Sprite", "Entity", "Context"] },
        { cat: "Game Development", val: 400, q: "Simulated force pulling objects to the bottom of the screen.", a: "Gravity", d: ["Velocity", "Mass", "Torque"] },
        { cat: "Game Development", val: 400, q: "Force that slows objects down as they slide or rub.", a: "Friction", d: ["Gravity", "Inertia", "Momentum"] },
        { cat: "Game Development", val: 500, q: "Predicting object position for smooth visual motion.", a: "Interpolation", d: ["Extrapolation", "Physics", "Syncing"] },
        { cat: "Game Development", val: 500, q: "Logic falling behind the target frame rate.", a: "Lag", d: ["Ping", "Latency", "Buffer"] },
        { cat: "Game Development", val: 500, q: "Managing game assets in a dedicated background thread.", a: "Web Worker", d: ["Service Worker", "API Call", "Async Function"] },

        // ==========================================
        // 13. CLOUD TOOLS (Ch 13)
        // ==========================================
        { cat: "Cloud Tools", val: 100, q: "Software used to track history of code changes.", a: "Git", d: ["GitHub", "Dropbox", "Word"] },
        { cat: "Cloud Tools", val: 100, q: "Project folder containing the hidden history of all saves.", a: "Repository", d: ["Directory", "Module", "Registry"] },
        { cat: "Cloud Tools", val: 100, q: "Text-based way to talk directly to your operating system.", a: "CLI", d: ["GUI", "API", "URL"] },
        { cat: "Cloud Tools", val: 200, q: "Git action that creates a local snapshot of changes.", a: "Commit", d: ["Push", "Pull", "Clone"] },
        { cat: "Cloud Tools", val: 200, q: "Command to check which files are ready for commit.", a: "git status", d: ["git log", "git list", "git check"] },
        { cat: "Cloud Tools", val: 200, q: "Specialized terminal for running Git on Windows.", a: "Git Bash", d: ["PowerShell", "CMD", "Root"] },
        { cat: "Cloud Tools", val: 300, q: "Separate line of development for testing features.", a: "Branching", d: ["Forking", "Staging", "Cloning"] },
        { cat: "Cloud Tools", val: 300, q: "Combining changes from two separate branches.", a: "Merge", d: ["Push", "Pull", "Commit"] },
        { cat: "Cloud Tools", val: 300, q: "Sending local commits to a remote cloud server.", a: "Push", d: ["Pull", "Fetch", "Clone"] },
        { cat: "Cloud Tools", val: 400, q: "Error when two people change the same code line.", a: "Merge Conflict", d: ["Syntax Error", "Logic Bug", "Deploy Fail"] },
        { cat: "Cloud Tools", val: 400, q: "Command showing the full history of all project saves.", a: "git log", d: ["git list", "git history", "git view"] },
        { cat: "Cloud Tools", val: 400, q: "Getting the latest cloud code to your local machine.", a: "Pull", d: ["Push", "Fetch", "Clone"] },
        { cat: "Cloud Tools", val: 500, q: "Hosting service specifically for modern front-end sites.", a: "Netlify", d: ["GoDaddy", "Wi-Fi", "WordPress"] },
        { cat: "Cloud Tools", val: 500, q: "File used to tell Git which items to never track.", a: ".gitignore", d: ["README.md", "index.html", "config.json"] },
        { cat: "Cloud Tools", val: 500, q: "Microsoft's professional desktop code editor.", a: "VS Code", d: ["GitHub", "Git", "Terminal"] },

        // ==========================================
        // 14. CONTENT MANAGEMENT (Ch 14)
        // ==========================================
        { cat: "Management Systems", val: 100, q: "Software managing content without writing raw code.", a: "CMS", d: ["IDE", "API", "SaaS"] },
        { cat: "Management Systems", val: 100, q: "World's most popular open-source CMS platform.", a: "WordPress", d: ["Wix", "Shopify", "Joomla"] },
        { cat: "Management Systems", val: 100, q: "CMS storage for users, posts, and settings.", a: "Database", d: ["PDF", "Folder", "Hard Drive"] },
        { cat: "Management Systems", val: 200, q: "Modular add-ons adding new logic to a CMS.", a: "Plugins", d: ["Widgets", "Themes", "Snippets"] },
        { cat: "Management Systems", val: 200, q: "Admin panel for managing back-end site data.", a: "Dashboard", d: ["Front-End", "Profile", "Gallery"] },
        { cat: "Management Systems", val: 200, q: "Name of the blocks-based modern WP editor.", a: "Gutenberg", d: ["Classic", "MCE", "Blocks"] },
        { cat: "Management Systems", val: 300, q: "Software with public code for anyone to enhance.", a: "Open Source", d: ["Proprietary", "Encrypted", "Secret"] },
        { cat: "Management Systems", val: 300, q: "Language used to build the WordPress core engine.", a: "PHP", d: ["JavaScript", "HTML", "Python"] },
        { cat: "Management Systems", val: 300, q: "Broad grouping of related CMS blog posts.", a: "Category", d: ["Tag", "Slug", "Block"] },
        { cat: "Management Systems", val: 400, q: "CMS with no built-in front-end templates.", a: "Headless CMS", d: ["Legacy", "Traditional", "Static"] },
        { cat: "Management Systems", val: 400, q: "Standard relational database for WP/MySQL.", a: "MySQL", d: ["MongoDB", "Excel", "JSON"] },
        { cat: "Management Systems", val: 400, q: "Managing your own server hardware for a CMS.", a: "Self-Hosted", d: ["SaaS", "Cloud", "Hosted"] },
        { cat: "Management Systems", val: 500, q: "Theme that inherits and protects parent styles.", a: "Child Theme", d: ["Clone", "Skin", "Baby Theme"] },
        { cat: "Management Systems", val: 500, q: "Permanent, pretty URL assigned to a page.", a: "Permalink", d: ["Path", "Slug", "Redirect"] },
        { cat: "Management Systems", val: 500, q: "Updating a CMS is most critical for this reason.", a: "Security", d: ["Fonts", "Icons", "Themes"] },

        // ==========================================
        // 15. APIs & FETCH (Ch 15)
        // ==========================================
        { cat: "APIs & Fetch", val: 100, q: "Interface letting two different apps talk.", a: "API", d: ["GUI", "CLI", "UI"] },
        { cat: "APIs & Fetch", val: 100, q: "HTTP method to retrieve or 'read' data.", a: "GET", d: ["POST", "PUT", "DELETE"] },
        { cat: "APIs & Fetch", val: 100, q: "URL where an API listens for requests.", a: "Endpoint", d: ["Path", "Header", "Payload"] },
        { cat: "APIs & Fetch", val: 200, q: "Placeholder for future async data completion.", a: "Promise", d: ["Loop", "Variable", "Callback"] },
        { cat: "APIs & Fetch", val: 200, q: "Lightweight format for API data exchanges.", a: "JSON", d: ["XML", "HTML", "TXT"] },
        { cat: "APIs & Fetch", val: 200, q: "HTTP method to send brand new data.", a: "POST", d: ["GET", "PUT", "PATCH"] },
        { cat: "APIs & Fetch", val: 300, q: "Pausing async code until data returns.", a: "await", d: ["halt", "wait", "yield"] },
        { cat: "APIs & Fetch", val: 300, q: "Manual explaining how to use an API.", a: "Documentation", d: ["Script", "Reference", "Readme"] },
        { cat: "APIs & Fetch", val: 300, q: "Pre-written code kit for specific API integration.", a: "SDK", d: ["API Key", "Bearer", "JSON"] },
        { cat: "APIs & Fetch", val: 400, q: "Standard architecture for modern web APIs.", a: "REST", d: ["SOAP", "RPC", "GraphQL"] },
        { cat: "APIs & Fetch", val: 400, q: "HTTP method to replace existing data.", a: "PUT", d: ["POST", "GET", "HEAD"] },
        { cat: "APIs & Fetch", val: 400, q: "Character surrounding JSON objects.", a: "{}", d: ["[]", "()", "<>"] },
        { cat: "APIs & Fetch", val: 500, q: "HTTP Status Code: I am a teapot.", a: "418", d: ["404", "500", "200"] },
        { cat: "APIs & Fetch", val: 500, q: "Limiting request volume for a specific user.", a: "Rate Limiting", d: ["Bandwidth", "Throttling", "Ping"] },
        { cat: "APIs & Fetch", val: 500, q: "Legacy API protocol using XML data.", a: "SOAP", d: ["REST", "JSON", "Fetch"] },

        // ==========================================
        // 16. DATABASE BRAIN (Ch 16)
        // ==========================================
        { cat: "Database Brain", val: 100, q: "Language for managing relational databases.", a: "SQL", d: ["PHP", "C#", "JSON"] },
        { cat: "Database Brain", val: 100, q: "Single piece of info in a database column.", a: "Field", d: ["Record", "Table", "Query"] },
        { cat: "Database Brain", val: 100, q: "Acronym for basic DB actions (Create/Read/Delete).", a: "CRUD", d: ["ACID", "REST", "SQL"] },
        { cat: "Database Brain", val: 200, q: "Unique identifier for every single record.", a: "Primary Key", d: ["Foreign Key", "Master", "ID"] },
        { cat: "Database Brain", val: 200, q: "Column linking to another table's ID.", a: "Foreign Key", d: ["Primary Key", "Logic", "Secret"] },
        { cat: "Database Brain", val: 200, q: "Complete set of fields for one database item.", a: "Record", d: ["Row", "Cell", "Index"] },
        { cat: "Database Brain", val: 300, q: "Structural blueprint of a database system.", a: "Schema", d: ["Template", "Framework", "Draft"] },
        { cat: "Database Brain", val: 300, q: "DB system organizing data into related tables.", a: "Relational", d: ["Flat-file", "Graph", "NoSQL"] },
        { cat: "Database Brain", val: 300, q: "SQL marker for missing or empty data.", a: "NULL", d: ["EMPTY", "VOID", "ZERO"] },
        { cat: "Database Brain", val: 400, q: "Organizing tables to reduce data redundancy.", a: "Normalization", d: ["Integrity", "Sharding", "Hashing"] },
        { cat: "Database Brain", val: 400, q: "Ensuring data stays accurate and consistent.", a: "Data Integrity", d: ["Security", "Scaling", "Audit"] },
        { cat: "Database Brain", val: 400, q: "Non-relational databases for big data.", a: "NoSQL", d: ["Relational", "SQL", "BASE"] },
        { cat: "Database Brain", val: 500, q: "Adding server nodes to a network to scale.", a: "Horizontal Scaling", d: ["Vertical", "Linear", "Node"] },
        { cat: "Database Brain", val: 500, q: "Adding power (CPU/RAM) to one server to scale.", a: "Vertical Scaling", d: ["Horizontal", "Linear", "Cloud"] },
        { cat: "Database Brain", val: 500, q: "Pointers created to speed up data searches.", a: "Indexes", d: ["Keys", "Fields", "Records"] },

        // ==========================================
        // 17. EMERGING TECH (Ch 17)
        // ==========================================
        { cat: "Emerging Tech", val: 100, q: "Overlaying digital info onto real-world views.", a: "AR", d: ["VR", "AI", "IoT"] },
        { cat: "Emerging Tech", val: 100, q: "Machines acting smartly or simulating human brain.", a: "AI", d: ["ML", "IoT", "Wasm"] },
        { cat: "Emerging Tech", val: 100, q: "Network of physical hardware on the internet.", a: "IoT", d: ["Web 3.0", "Cloud", "API"] },
        { cat: "Emerging Tech", val: 200, q: "AI improving based on data exposure experience.", a: "Machine Learning", d: ["Logic", "Rules", "Syntax"] },
        { cat: "Emerging Tech", val: 200, q: "Tactile touch or vibration communication.", a: "Haptic Feedback", d: ["Visual", "Audio", "Sonic"] },
        { cat: "Emerging Tech", val: 200, q: "AI filtering spam or recognizing faces.", a: "Pattern Recognition", d: ["Data Sort", "Random", "Logic"] },
        { cat: "Emerging Tech", val: 300, q: "Completely immersive digital environments.", a: "VR", d: ["AR", "MR", "SPA"] },
        { cat: "Emerging Tech", val: 300, q: "AI focused on human text and speech processing.", a: "NLP", d: ["JSON", "API", "SSL"] },
        { cat: "Emerging Tech", val: 300, q: "UI for devices without traditional screens.", a: "Headless UI", d: ["Graphic", "Visual", "SPA"] },
        { cat: "Emerging Tech", val: 400, q: "AI creating original images, text, or music.", a: "Generative AI", d: ["Logic AI", "Static", "Data AI"] },
        { cat: "Emerging Tech", val: 400, q: "Binary format for high-speed browser apps.", a: "WebAssembly", d: ["JSON", "Wasm", "SPA"] },
        { cat: "Emerging Tech", val: 400, q: "Smartwatches and fitness trackers tech group.", a: "Wearable Tech", d: ["Home IoT", "Smart City", "Industrial"] },
        { cat: "Emerging Tech", val: 500, q: "Processing data closer to hardware than cloud.", a: "Edge Computing", d: ["Core", "Remote", "Node"] },
        { cat: "Emerging Tech", val: 500, q: "Next web era for blockchain and decentralization.", a: "Web 3.0", d: ["Web 2.0", "Web 1.0", "AI Web"] },
        { cat: "Emerging Tech", val: 500, q: "AI auto-generating image text for the blind.", a: "Automated A11y", d: ["SEO", "Visual Search", "Metadata"] },

        // ==========================================
        // 18. THE LAUNCH (Ch 18)
        // ==========================================
        { cat: "The Launch", val: 100, q: "Moving site from local to live server.", a: "Deployment", d: ["Drafting", "Coding", "Hosting"] },
        { cat: "The Launch", val: 100, q: "Live version used by actual visitors.", a: "Production", d: ["Staging", "Local", "Draft"] },
        { cat: "The Launch", val: 100, q: "Standard homepage filename for servers.", a: "index.html", d: ["home", "start", "main"] },
        { cat: "The Launch", val: 200, q: "Private test version for final site checks.", a: "Staging", d: ["Production", "Local", "Alpha"] },
        { cat: "The Launch", val: 200, q: "HTTP code: Page or resource not found.", a: "404", d: ["200", "500", "301"] },
        { cat: "The Launch", val: 200, q: "Removing spaces from code to shrink size.", a: "Minification", d: ["Compression", "Parsing", "Hiding"] },
        { cat: "The Launch", val: 300, q: "Google tool for performance and speed tests.", a: "Lighthouse", d: ["Photoshop", "Chrome", "Console"] },
        { cat: "The Launch", val: 300, q: "Percentage of time server stays running.", a: "Uptime", d: ["Lag", "Latency", "Bandwidth"] },
        { cat: "The Launch", val: 300, q: "Saving files on user PC for faster load.", a: "Caching", d: ["Logging", "Hiding", "Deleting"] },
        { cat: "The Launch", val: 400, q: "Secure protocol for all modern sites.", a: "HTTPS", d: ["HTTP", "SSL", "FTP"] },
        { cat: "The Launch", val: 400, q: "Proof site is secure and data is encrypted.", a: "SSL Certificate", d: ["License", "Diploma", "Badge"] },
        { cat: "The Launch", val: 400, q: "Top-level domain acronym (e.g. .com).", a: "TLD", d: ["URL", "DNS", "ISP"] },
        { cat: "The Launch", val: 500, q: "Auto-updating site when pushing to Git.", a: "Continuous Deployment", d: ["Manual", "FTP", "Sync"] },
        { cat: "The Launch", val: 500, q: "Fast live fix for a critical site bug.", a: "Hotfix", d: ["Rollback", "Patch", "Commit"] },
        { cat: "The Launch", val: 500, q: "Global server network hosting closer to users.", a: "CDN", d: ["DNS", "ISP", "LAN"] }
    ]);
