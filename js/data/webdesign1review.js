/**
 * YEAR 1 ULTIMATE REVIEW (Chapters 1-11)
 * POOL: 11 Categories (165 Items Total)
 * Each level (100-500) has 3 unique variations for randomization.
 * Categories formatted for professional display (no Chapter numbers).
 */
window.migrationPool = window.migrationPool || []; window.migrationPool.push(...[
        // ==========================================
        // CHAPTER 1: Professionalism
        // ==========================================
        { cat: "Professionalism", val: 100, q: "This implies showing up on time and being prepared for work.", a: "Punctuality", d: ["Reliability", "Dress Code", "Initiative"] },
        { cat: "Professionalism", val: 100, q: "The way you dress and present yourself in a work environment.", a: "Attire", d: ["Punctuality", "Ethics", "Inclusivity"] },
        { cat: "Professionalism", val: 100, q: "Being reliable, trustworthy, and doing what you say you will do.", a: "Dependability", d: ["Punctuality", "Leadership", "Communication"] },
        { cat: "Professionalism", val: 200, q: "The conduct, behavior, and attitude of someone in a work environment.", a: "Professionalism", d: ["Ethics", "Etiquette", "Attitude"] },
        { cat: "Professionalism", val: 200, q: "The process of exchanging information clearly and respectfully.", a: "Communication", d: ["Socializing", "Broadcasting", "Networking"] },
        { cat: "Professionalism", val: 200, q: "Finding a peaceful and constructive solution to a disagreement.", a: "Conflict Resolution", d: ["Teamwork", "Mediation", "Debating"] },
        { cat: "Professionalism", val: 300, q: "The ability to work well with others to achieve a common goal.", a: "Teamwork", d: ["Collaboration", "Leadership", "Networking"] },
        { cat: "Professionalism", val: 300, q: "Guiding and motivating a group of people toward an objective.", a: "Leadership", d: ["Management", "Coaching", "Instruction"] },
        { cat: "Professionalism", val: 300, q: "Taking action without being told; being a self-starter.", a: "Initiative", d: ["Motivation", "Punctuality", "Dependability"] },
        { cat: "Professionalism", val: 400, q: "The ability to adjust to new conditions and project challenges.", a: "Flexibility", d: ["Adaptability", "Consistency", "Endurance"] },
        { cat: "Professionalism", val: 400, q: "Using your time effectively to meet deadlines and prioritize tasks.", a: "Time Management", d: ["Scheduling", "Efficiency", "Planning"] },
        { cat: "Professionalism", val: 400, q: "Respecting and valuing different backgrounds and perspectives.", a: "Inclusivity", d: ["Accessibility", "Diversity", "Tolerance"] },
        { cat: "Professionalism", val: 500, q: "Moral principles that govern a person's behavior in a professional setting.", a: "Ethics", d: ["Laws", "Rules", "Habits"] },
        { cat: "Professionalism", val: 500, q: "Adhering to specific laws, industry rules, and regulations.", a: "Compliance", d: ["Validation", "Ethics", "Legality"] },
        { cat: "Professionalism", val: 500, q: "The act of keeping sensitive client or company information secret.", a: "Confidentiality", d: ["Privacy", "Security", "Encryption"] },

        // ==========================================
        // CHAPTER 2: Infrastructure
        // ==========================================
        { cat: "Infrastructure", val: 100, q: "The global network of connected computers and hardware.", a: "Internet", d: ["World Wide Web", "DNS", "HTTP"] },
        { cat: "Infrastructure", val: 100, q: "The system of connected documents accessed via the Internet.", a: "World Wide Web", d: ["Internet", "HTML", "Cloud"] },
        { cat: "Infrastructure", val: 100, q: "A powerful computer that stores and serves website files to users.", a: "Server", d: ["Client", "Router", "Modem"] },
        { cat: "Infrastructure", val: 200, q: "A software application used to access and view web pages (e.g., Chrome).", a: "Browser", d: ["Search Engine", "Web Host", "Protocol"] },
        { cat: "Infrastructure", val: 200, q: "The protocol used for transferring web pages over the internet.", a: "HTTP", d: ["FTP", "SMTP", "DNS"] },
        { cat: "Infrastructure", val: 200, q: "The unique text-based address of a specific webpage on the internet.", a: "URL", d: ["IP Address", "Domain Name", "Protocol"] },
        { cat: "Infrastructure", val: 300, q: "The system that translates human-friendly domain names into IP addresses.", a: "DNS", d: ["DHCP", "URL", "ISP"] },
        { cat: "Infrastructure", val: 300, q: "A unique numerical label assigned to each device on a network.", a: "IP Address", d: ["MAC Address", "Domain Name", "URL"] },
        { cat: "Infrastructure", val: 300, q: "A company that provides subscribers with access to the internet.", a: "ISP", d: ["W3C", "ICANN", "DNS"] },
        { cat: "Infrastructure", val: 400, q: "The computer or user device that requests data from a server.", a: "Client", d: ["Server", "Host", "Relay"] },
        { cat: "Infrastructure", val: 400, q: "Small chunks of data sent over a network to be reassembled.", a: "Packets", d: ["Bits", "Nodes", "Links"] },
        { cat: "Infrastructure", val: 400, q: "The maximum capacity of a network to transmit data at one time.", a: "Bandwidth", d: ["Latency", "Ping", "Throughput"] },
        { cat: "Infrastructure", val: 500, q: "The delay in time before a transfer of data begins over a network.", a: "Latency", d: ["Bandwidth", "Throughput", "Uptime"] },
        { cat: "Infrastructure", val: 500, q: "The secure version of HTTP that encrypts data during transit.", a: "HTTPS", d: ["HTTP", "SSL", "FTP"] },
        { cat: "Infrastructure", val: 500, q: "The standard markup language used for creating the structure of web pages.", a: "HTML", d: ["CSS", "JavaScript", "PHP"] },

        // ==========================================
        // CHAPTER 3: Law & Ethics
        // ==========================================
        { cat: "Law & Ethics", val: 100, q: "Legal protection for original creative works fixed in a tangible form.", a: "Copyright", d: ["Trademark", "Patent", "NDA"] },
        { cat: "Law & Ethics", val: 100, q: "Using someone else's work as your own without proper credit.", a: "Plagiarism", d: ["Piracy", "Infringement", "Cloning"] },
        { cat: "Law & Ethics", val: 100, q: "The legal right to keep personal information secret from the public.", a: "Privacy", d: ["Copyright", "Trademark", "Security"] },
        { cat: "Law & Ethics", val: 200, q: "Designing websites that can be used by people with disabilities.", a: "Accessibility", d: ["Usability", "Validating", "Optimizing"] },
        { cat: "Law & Ethics", val: 200, q: "The standard symbol used to indicate a work is protected by copyright.", a: "©", d: ["®", "™", "@"] },
        { cat: "Law & Ethics", val: 200, q: "US law protecting the online privacy of children under 13.", a: "COPPA", d: ["GDPR", "FERPA", "HIPAA"] },
        { cat: "Law & Ethics", val: 300, q: "Legal protection for brand names, logos, and specific slogans.", a: "Trademark", d: ["Copyright", "Patent", "License"] },
        { cat: "Law & Ethics", val: 300, q: "Legal protection for new and unique functional inventions.", a: "Patent", d: ["Copyright", "Trademark", "NDA"] },
        { cat: "Law & Ethics", val: 300, q: "An exception allowing limited use of copyrighted work for education.", a: "Fair Use", d: ["Public Domain", "Creative Commons", "Open Source"] },
        { cat: "Law & Ethics", val: 400, q: "Creative works whose copyright has expired and are free for all to use.", a: "Public Domain", d: ["Creative Commons", "Open Source", "Fair Use"] },
        { cat: "Law & Ethics", val: 400, q: "Flexible copyright licenses that allow sharing with specific permissions.", a: "Creative Commons", d: ["EULA", "NDA", "Public Domain"] },
        { cat: "Law & Ethics", val: 400, q: "The strict data privacy law originating in the European Union.", a: "GDPR", d: ["COPPA", "ADA", "HIPAA"] },
        { cat: "Law & Ethics", val: 500, q: "Malicious software designed to damage or disrupt computer systems.", a: "Malware", d: ["Adware", "Firmware", "Shareware"] },
        { cat: "Law & Ethics", val: 500, q: "A fraudulent attempt to steal info by disguising as a trustworthy source.", a: "Phishing", d: ["Spamming", "Caching", "Sharding"] },
        { cat: "Law & Ethics", val: 500, q: "A hacker who finds security holes specifically to help fix them.", a: "White Hat", d: ["Black Hat", "Gray Hat", "Red Hat"] },

        // ==========================================
        // CHAPTER 4: Research
        // ==========================================
        { cat: "Research", val: 100, q: "A fictional character that represents a segment of your target audience.", a: "User Persona", d: ["Admin Account", "Bot Profile", "Client ID"] },
        { cat: "Research", val: 100, q: "The specific group of people you are designing your website for.", a: "Target Audience", d: ["Developers", "Focus Group", "Stakeholders"] },
        { cat: "Research", val: 100, q: "Studying user needs and behaviors before starting a design.", a: "User Research", d: ["Coding", "Testing", "Deployment"] },
        { cat: "Research", val: 200, q: "Data about user attitudes, interests, lifestyles, and motivations.", a: "Psychographics", d: ["Demographics", "Geographics", "Bio-metrics"] },
        { cat: "Research", val: 200, q: "Statistical data about a population, such as age, gender, and income.", a: "Demographics", d: ["Psychographics", "Geographics", "Analytics"] },
        { cat: "Research", val: 200, q: "The specific 'Why' behind a user's action or behavior.", a: "Motivation", d: ["Instruction", "Constraint", "Persona"] },
        { cat: "Research", val: 300, q: "Research data that involves feelings, descriptions, and user opinions.", a: "Qualitative Data", d: ["Quantitative Data", "Hard Data", "Analytics"] },
        { cat: "Research", val: 300, q: "Research data that can be measured using numbers and statistics.", a: "Quantitative Data", d: ["Qualitative Data", "Descriptive Data", "Soft Data"] },
        { cat: "Research", val: 300, q: "The series of pages and links a user clicks on during a site visit.", a: "Clickstream", d: ["Sitemap", "Wireframe", "Breadcrumb"] },
        { cat: "Research", val: 400, q: "Specific problems or frustrations your target users face.", a: "Pain Points", d: ["Bonus Perks", "Selling Points", "Reference Points"] },
        { cat: "Research", val: 400, q: "The path a user takes step-by-step to complete a specific task.", a: "User Journey", d: ["Sitemap", "Logic Loop", "Code Block"] },
        { cat: "Research", val: 400, q: "Links from other reputable websites pointing back to your site.", a: "Backlinks", d: ["Internal Links", "Meta Links", "Forward Links"] },
        { cat: "Research", val: 500, q: "A visual tool used to map and understand a user's mindset and feelings.", a: "Empathy Map", d: ["Wireframe", "Sitemap", "Flowchart"] },
        { cat: "Research", val: 500, q: "The bias where we assume others think and feel the same way we do.", a: "False Consensus Bias", d: ["Confirmation Bias", "Selection Bias", "Memory Bias"] },
        { cat: "Research", val: 500, q: "Turning messy research data into non-obvious, meaningful information.", a: "Synthesis", d: ["Collection", "Deletion", "Drafting"] },

        // ==========================================
        // CHAPTER 5: Planning
        // ==========================================
        { cat: "Planning", val: 100, q: "A visual blueprint of a website's overall page structure.", a: "Sitemap", d: ["Wireframe", "Flowchart", "Mockup"] },
        { cat: "Planning", val: 100, q: "The primary goal or mission a website needs to achieve.", a: "Objective", d: ["Color Scheme", "Code Limit", "URL name"] },
        { cat: "Planning", val: 100, q: "The menu and link system that allows users to move through a site.", a: "Navigation", d: ["GPS", "Search bar", "Footer"] },
        { cat: "Planning", val: 200, q: "A low-fidelity visual guide showing the skeletal framework of a page.", a: "Wireframe", d: ["Mockup", "Prototype", "Sketch"] },
        { cat: "Planning", val: 200, q: "Term for exactly what is included and excluded in a project plan.", a: "Scope", d: ["Scale", "Resolution", "Budget"] },
        { cat: "Planning", val: 200, q: "Designing the menu specifically for small mobile screens.", a: "Hamburger Menu", d: ["Sidebar", "Dropdown", "Mega Menu"] },
        { cat: "Planning", val: 300, q: "Designing a site so it looks good and works on all device sizes.", a: "Responsive Design", d: ["Static Design", "Adaptive Design", "Fluid Design"] },
        { cat: "Planning", val: 300, q: "The successful completion of a goal, such as a user buying an item.", a: "Conversion", d: ["Bounce", "Drop-off", "Refresh"] },
        { cat: "Planning", val: 300, q: "A feature or function that a website MUST have to be successful.", a: "Requirement", d: ["Suggestion", "Decoration", "Prototype"] },
        { cat: "Planning", val: 400, q: "A detailed visual design that includes final colors, fonts, and images.", a: "Mockup", d: ["Wireframe", "Prototype", "Sketch"] },
        { cat: "Planning", val: 400, q: "An interactive, clickable simulation of a website's final design.", a: "Prototype", d: ["Mockup", "Wireframe", "Draft"] },
        { cat: "Planning", val: 400, q: "The simplest version of a product that can be launched for feedback.", a: "MVP", d: ["Alpha", "Beta", "Full-Release"] },
        { cat: "Planning", val: 500, q: "The practice of using columns and rows to plan a page layout.", a: "Grid System", d: ["Flexbox", "Tables", "Divs"] },
        { cat: "Planning", val: 500, q: "Repeating the design process multiple times to improve the result.", a: "Iteration", d: ["Recursion", "Stagnation", "Cloning"] },
        { cat: "Planning", val: 500, q: "Reviewing all current site materials before starting a redesign.", a: "Content Audit", d: ["Code Review", "Virus Scan", "Spell Check"] },

        // ==========================================
        // CHAPTER 6: UI/UX
        // ==========================================
        { cat: "UI/UX", val: 100, q: "Term describing how a user feels while interacting with a site.", a: "User Experience (UX)", d: ["UI", "API", "SSL"] },
        { cat: "UI/UX", val: 100, q: "This acronym refers to the visual icons, buttons, and colors a user touches.", a: "User Interface (UI)", d: ["UX", "URL", "API"] },
        { cat: "UI/UX", val: 100, q: "The term for how easy and intuitive a website is to use.", a: "Usability", d: ["Accessibility", "Speed", "Scale"] },
        { cat: "UI/UX", val: 200, q: "Design law: More choices lead to slower user decisions.", a: "Hick's Law", d: ["Fitts's Law", "Jakob's Law", "Moore's Law"] },
        { cat: "UI/UX", val: 200, q: "Design law: Users prefer your site to work like other sites they know.", a: "Jakob's Law", d: ["Hick's Law", "Fitts's Law", "Miller's Law"] },
        { cat: "UI/UX", val: 200, q: "Design law: The time to hit a target depends on its size and distance.", a: "Fitts's Law", d: ["Hick's Law", "Jakob's Law", "Ohm's Law"] },
        { cat: "UI/UX", val: 300, q: "Arranging elements in order of importance to guide the user's eye.", a: "Visual Hierarchy", d: ["Symmetry", "Consistency", "Alignment"] },
        { cat: "UI/UX", val: 300, q: "Empty space used in a design to create focus and clarity.", a: "White Space", d: ["Gutter", "Margin", "Void"] },
        { cat: "UI/UX", val: 300, q: "The visual difference between elements used to create focus.", a: "Contrast", d: ["Balance", "Rhythm", "Harmony"] },
        { cat: "UI/UX", val: 400, q: "The total mental effort required for a user to use your interface.", a: "Cognitive Load", d: ["Physical Load", "Data Load", "Browser Load"] },
        { cat: "UI/UX", val: 400, q: "Anything that slows a user down or causes frustration in an interface.", a: "Friction", d: ["Flow", "Logic", "Pattern"] },
        { cat: "UI/UX", val: 400, q: "A visual hint that tells a user an item is interactive (e.g., looking like a button).", a: "Affordance", d: ["Constraint", "Insight", "Feedback"] },
        { cat: "UI/UX", val: 500, q: "Reviewing a website against a set of 'best practice' rules.", a: "Heuristic Evaluation", d: ["A/B Test", "User Interview", "Code Audit"] },
        { cat: "UI/UX", val: 500, q: "The psychology rule stating users remember unfinished tasks better.", a: "Zeigarnik Effect", d: ["Hick's Law", "Peak-End Rule", "Fitts's Law"] },
        { cat: "UI/UX", val: 500, q: "Studying where a user's vision focuses on a screen using sensors.", a: "Eye Tracking", d: ["Heatmapping", "Analytics", "Logging"] },

        // ==========================================
        // CHAPTER 7: HTML
        // ==========================================
        { cat: "HTML", val: 100, q: "The tag used to create the largest and most important heading.", a: "<h1>", d: ["<h6>", "<head>", "<header>"] },
        { cat: "HTML", val: 100, q: "The tag used to define a standard paragraph of text.", a: "<p>", d: ["<para>", "<text>", "<pg>"] },
        { cat: "HTML", val: 100, q: "The correct HTML tag for creating a clickable hyperlink.", a: "<a>", d: ["<link>", "<href>", "<nav>"] },
        { cat: "HTML", val: 200, q: "The attribute used to provide a link destination on an anchor tag.", a: "href", d: ["src", "link", "target"] },
        { cat: "HTML", val: 200, q: "The mandatory attribute in an <img> tag that helps the blind and SEO.", a: "alt", d: ["src", "title", "longdesc"] },
        { cat: "HTML", val: 200, q: "The HTML attribute that specifies the file path of an image.", a: "src", d: ["href", "link", "url"] },
        { cat: "HTML", val: 300, q: "The practice of putting tags inside other tags correctly.", a: "Nesting", d: ["Inheritance", "Stacking", "Cascading"] },
        { cat: "HTML", val: 300, q: "The tag used to define an unordered (bulleted) list.", a: "<ul>", d: ["<ol>", "<li>", "<list>"] },
        { cat: "HTML", val: 300, q: "Each item in a list is defined by this specific tag.", a: "<li>", d: ["<ul>", "<item>", "<list-item>"] },
        { cat: "HTML", val: 400, q: "Meaningful tags like <header> and <nav> that describe content to bots.", a: "Semantic HTML", d: ["Valid HTML", "Structure Tags", "Metadata"] },
        { cat: "HTML", val: 400, q: "The tag used for introductory content at the top of a page.", a: "<header>", d: ["<head>", "<top>", "<nav>"] },
        { cat: "HTML", val: 400, q: "The tag used for navigation link blocks.", a: "<nav>", d: ["<links>", "<menu>", "<ul>"] },
        { cat: "HTML", val: 500, q: "The mandatory declaration that must be the first line of any HTML file.", a: "<!DOCTYPE html>", d: ["<html>", "<head>", "<start>"] },
        { cat: "HTML", val: 500, q: "The standard character encoding used for the web.", a: "UTF-8", d: ["ASCII", "Unicode", "ISO-8859"] },
        { cat: "HTML", val: 500, q: "The tag used to embed another HTML page within the current page.", a: "<iframe>", d: ["<embed>", "<object>", "<include>"] },

        // ==========================================
        // CHAPTER 8: CSS
        // ==========================================
        { cat: "CSS", val: 100, q: "The acronym for Cascading Style Sheets.", a: "CSS", d: ["Coded Style System", "Computer Style Sheets", "Creative Style Sheets"] },
        { cat: "CSS", val: 100, q: "The CSS property used to change the text color of an element.", a: "color", d: ["text-color", "font-color", "fill"] },
        { cat: "CSS", val: 100, q: "The CSS property used to change the background color of an element.", a: "background-color", d: ["color", "bg-fill", "shading"] },
        { cat: "CSS", val: 200, q: "The selector symbol used to target a specific ID.", a: "# (Hash)", d: [". (Dot)", "* (Asterisk)", "@ (At)"] },
        { cat: "CSS", val: 200, q: "The selector symbol used to target a specific Class.", a: ". (Dot)", d: ["# (Hash)", "* (Asterisk)", "$ (Dollar)"] },
        { cat: "CSS", val: 200, q: "The property used to control the size of the text.", a: "font-size", d: ["text-size", "font-width", "scale"] },
        { cat: "CSS", val: 300, q: "The space inside an element, between the content and its border.", a: "Padding", d: ["Margin", "Outline", "Gutter"] },
        { cat: "CSS", val: 300, q: "The space outside an element border, separating it from neighbors.", a: "Margin", d: ["Padding", "Spacing", "Depth"] },
        { cat: "CSS", val: 300, q: "The CSS property used to create rounded corners on a box.", a: "border-radius", d: ["border-style", "border-width", "circle-tool"] },
        { cat: "CSS", val: 400, q: "Styles written directly inside an element tag using the style attribute.", a: "Inline CSS", d: ["Internal CSS", "External CSS", "Linked CSS"] },
        { cat: "CSS", val: 400, q: "Styles written inside <style> tags in the document head.", a: "Internal CSS", d: ["Inline CSS", "External CSS", "Imported CSS"] },
        { cat: "CSS", val: 400, q: "Styles written in a separate .css file and connected via a link tag.", a: "External CSS", d: ["Internal CSS", "Inline CSS", "Embedded CSS"] },
        { cat: "CSS", val: 500, q: "This keyword forces a specific style to win the cascade regardless of priority.", a: "!important", d: ["!force", "!override", "!priority"] },
        { cat: "CSS", val: 500, q: "The hierarchy that determines which rule wins when multiple rules apply.", a: "Cascade", d: ["Waterfall", "Specificity", "Inheritance"] },
        { cat: "CSS", val: 500, q: "The calculated 'rank' of a selector based on its complexity.", a: "Specificity", d: ["Density", "Inheritance", "Priority"] },

        // ==========================================
        // CHAPTER 9: Layout
        // ==========================================
        { cat: "Layout", val: 100, q: "A 1-dimensional layout model for aligning items in rows or columns.", a: "Flexbox", d: ["Grid", "Float", "Table"] },
        { cat: "Layout", val: 100, q: "The CSS property that turns a container into a flex container.", a: "display: flex", d: ["flex-mode: on", "display: grid", "layout: flex"] },
        { cat: "Layout", val: 100, q: "A 2-dimensional layout system designed for rows AND columns simultaneously.", a: "CSS Grid", d: ["Flexbox", "Block Flow", "Absolute Position"] },
        { cat: "Layout", val: 200, q: "The property used in Flexbox to align items along the main axis.", a: "justify-content", d: ["align-items", "place-content", "flex-direction"] },
        { cat: "Layout", val: 200, q: "The property used in Flexbox to align items along the cross axis.", a: "align-items", d: ["justify-content", "flex-wrap", "order"] },
        { cat: "Layout", val: 200, q: "To stack flex items vertically, you set flex-direction to this.", a: "column", d: ["row", "wrap", "stack"] },
        { cat: "Layout", val: 300, q: "The unit in Grid representing a flexible fraction of available space.", a: "fr", d: ["px", "rem", "vh"] },
        { cat: "Layout", val: 300, q: "The property that adds space between grid tracks (rows/cols).", a: "gap", d: ["padding", "margin", "spacing"] },
        { cat: "Layout", val: 300, q: "This property allows flex items to break onto new lines.", a: "flex-wrap", d: ["flex-flow", "overflow", "flex-grow"] },
        { cat: "Layout", val: 400, q: "The position value that moves an element relative to its normal spot.", a: "relative", d: ["static", "absolute", "fixed"] },
        { cat: "Layout", val: 400, q: "The position value that removes an element from flow to place it relative to an ancestor.", a: "absolute", d: ["fixed", "static", "relative"] },
        { cat: "Layout", val: 400, q: "The property used to control the vertical stacking order of overlapping items.", a: "z-index", d: ["layer", "stack", "depth"] },
        { cat: "Layout", val: 500, q: "The CSS rule used to apply styles only when certain screen widths are met.", a: "@media", d: ["@viewport", "@import", "@keyframes"] },
        { cat: "Layout", val: 500, q: "The specific screen width where a responsive layout changes structure.", a: "Breakpoint", d: ["Cutoff", "Limit", "Edge"] },
        { cat: "Layout", val: 500, q: "Designing for small screens before large screens.", a: "Mobile-First Design", d: ["Desktop-First", "App-First", "Text-First"] },

        // ==========================================
        // CHAPTER 10: Multimedia
        // ==========================================
        { cat: "Multimedia", val: 100, q: "The HTML tag used specifically to embed a picture in a page.", a: "<img>", d: ["<pic>", "<image>", "<graphics>"] },
        { cat: "Multimedia", val: 100, q: "The HTML tag used to embed sound files in a page.", a: "<audio>", d: ["<sound>", "<music>", "<voice>"] },
        { cat: "Multimedia", val: 100, q: "The HTML tag used to embed a movie file in a page.", a: "<video>", d: ["<movie>", "<film>", "<media>"] },
        { cat: "Multimedia", val: 200, q: "Attribute that adds play, pause, and volume buttons to a media player.", a: "controls", d: ["ui", "buttons", "player"] },
        { cat: "Multimedia", val: 200, q: "Attribute that makes a video play immediately upon page load.", a: "autoplay", d: ["start", "auto", "run"] },
        { cat: "Multimedia", val: 200, q: "Attribute that makes media repeat from the beginning when finished.", a: "loop", d: ["cycle", "rebound", "repeat"] },
        { cat: "Multimedia", val: 300, q: "Image format that is math-based and scales without quality loss.", a: "SVG", d: ["JPG", "PNG", "GIF"] },
        { cat: "Multimedia", val: 300, q: "Lossy image format best suited for complex photographs.", a: "JPG", d: ["PNG", "SVG", "GIF"] },
        { cat: "Multimedia", val: 300, q: "Lossless image format that supports alpha transparency.", a: "PNG", d: ["JPG", "SVG", "GIF"] },
        { cat: "Multimedia", val: 400, q: "The HTML tag used to define a data table.", a: "<table>", d: ["<grid>", "<list>", "<data>"] },
        { cat: "Multimedia", val: 400, q: "The HTML tag that defines a single horizontal line of cells in a table.", a: "<tr>", d: ["<td>", "<th>", "<row>"] },
        { cat: "Multimedia", val: 400, q: "The HTML tag that holds actual data content inside a table cell.", a: "<td>", d: ["<tr>", "<th>", "<cell>"] },
        { cat: "Multimedia", val: 500, q: "The attribute used to merge a single table cell across multiple columns.", a: "colspan", d: ["rowspan", "span", "merge"] },
        { cat: "Multimedia", val: 500, q: "The attribute used to merge a single table cell vertically down rows.", a: "rowspan", d: ["colspan", "span", "merge"] },
        { cat: "Multimedia", val: 500, q: "The CSS property that merges table borders into single lines.", a: "border-collapse", d: ["border-merge", "spacing-none", "border-style"] },

        // ==========================================
        // CHAPTER 11: JavaScript
        // ==========================================
        { cat: "JavaScript", val: 100, q: "The keyword used to declare a variable that cannot be changed.", a: "const", d: ["let", "var", "fixed"] },
        { cat: "JavaScript", val: 100, q: "The keyword used to declare a variable that can be reassigned.", a: "let", d: ["const", "var", "fixed"] },
        { cat: "JavaScript", val: 100, q: "The function used to print messages to the developer console.", a: "console.log()", d: ["alert()", "print()", "write()"] },
        { cat: "JavaScript", val: 200, q: "The comparison operator used for strict equality (value and type).", a: "===", d: ["==", "=", "!="] },
        { cat: "JavaScript", val: 200, q: "The JavaScript data type representing text characters in quotes.", a: "String", d: ["Number", "Boolean", "Object"] },
        { cat: "JavaScript", val: 200, q: "The JavaScript data type that is either true or false.", a: "Boolean", d: ["String", "Number", "Array"] },
        { cat: "JavaScript", val: 300, q: "A reusable block of code designed to perform a specific task.", a: "Function", d: ["Loop", "Variable", "Array"] },
        { cat: "JavaScript", val: 300, q: "A data type used to store an ordered list of multiple items.", a: "Array", d: ["Object", "String", "Constant"] },
        { cat: "JavaScript", val: 300, q: "A data structure that stores information in key-value pairs.", a: "Object", d: ["Array", "Variable", "Statement"] },
        { cat: "JavaScript", val: 400, q: "The DOM method used to select an HTML element by its unique ID.", a: "getElementById()", d: ["querySelector()", "getElementByClass()", "find()"] },
        { cat: "JavaScript", val: 400, q: "The method used to attach a listener for user clicks on an element.", a: "addEventListener", d: ["onClick", "hearEvent", "trigger"] },
        { cat: "JavaScript", val: 400, q: "The property used to retrieve or change the text-only content inside a tag.", a: "textContent", d: ["innerHTML", "value", "innerText"] },
        { cat: "JavaScript", val: 500, q: "Acronym for the browser's tree representation of the HTML document.", a: "DOM", d: ["API", "URL", "SSL"] },
        { cat: "JavaScript", val: 500, q: "The modern keyword that pauses async code until a Promise returns.", a: "await", d: ["halt", "wait", "yield"] },
        { cat: "JavaScript", val: 500, q: "A function that is passed as an argument into another function.", a: "Callback", d: ["Promise", "Variable", "Literal"] }
    ]);
