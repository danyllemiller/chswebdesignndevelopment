// --- JEOPARDY DATA (Chapters 1-5) ---
const JEOPARDY_DATA = [
    // --- Professionalism (100) ---
    { category: "Professionalism", value: 100, question: "This implies showing up on time and being prepared.", answer: "Punctuality" },
    { category: "Professionalism", value: 100, question: "The way you dress and present yourself in a work environment.", answer: "Attire" },
    { category: "Professionalism", value: 100, question: "Being reliable, trustworthy, and doing what you say you will do.", answer: "Dependability" },
    // --- Professionalism (200) ---
    { category: "Professionalism", value: 200, question: "The conduct, behavior, and attitude of someone in a work environment.", answer: "Professionalism" },
    { category: "Professionalism", value: 200, question: "Exchanging information clearly and respectfully.", answer: "Communication" },
    { category: "Professionalism", value: 200, question: "Finding a peaceful solution to a disagreement.", answer: "Conflict Resolution" },
    // --- Professionalism (300) ---
    { category: "Professionalism", value: 300, question: "The ability to work well with others to achieve a common goal.", answer: "Teamwork" },
    { category: "Professionalism", value: 300, question: "Guiding and motivating a group of people.", answer: "Leadership" },
    { category: "Professionalism", value: 300, question: "Taking action without being told; being proactive.", answer: "Initiative" },
    // --- Professionalism (400) ---
    { category: "Professionalism", value: 400, question: "The ability to adjust to new conditions and challenges.", answer: "Flexibility" },
    { category: "Professionalism", value: 400, question: "Using your time effectively to meet deadlines.", answer: "Time Management" },
    { category: "Professionalism", value: 400, question: "Respecting and valuing different backgrounds and perspectives.", answer: "Inclusivity" },
    // --- Professionalism (500) ---
    { category: "Professionalism", value: 500, question: "Moral principles that govern a person's behavior.", answer: "Ethics" },
    { category: "Professionalism", value: 500, question: "Following laws, rules, and regulations.", answer: "Compliance" },
    { category: "Professionalism", value: 500, question: "Keeping sensitive information secret.", answer: "Confidentiality" },

    // --- The Web (100) ---
    { category: "The Web", value: 100, question: "The global network of connected computers (Hardware).", answer: "Internet" },
    { category: "The Web", value: 100, question: "The system of connected documents accessed via the Internet.", answer: "World Wide Web" },
    { category: "The Web", value: 100, question: "A computer that stores and serves website files.", answer: "Server" },
    // --- The Web (200) ---
    { category: "The Web", value: 200, question: "Software used to view web pages (e.g., Chrome).", answer: "Browser" },
    { category: "The Web", value: 200, question: "The protocol used for transferring web pages.", answer: "HTTP (HyperText Transfer Protocol)" },
    { category: "The Web", value: 200, question: "The unique address of a specific webpage.", answer: "URL (Uniform Resource Locator)" },
    // --- The Web (300) ---
    { category: "The Web", value: 300, question: "The system that translates domain names into IP addresses.", answer: "DNS (Domain Name System)" },
    { category: "The Web", value: 300, question: "A unique numerical label assigned to each device (e.g., 192.168.1.1).", answer: "IP Address" },
    { category: "The Web", value: 300, question: "A company that provides access to the internet.", answer: "ISP (Internet Service Provider)" },
    // --- The Web (400) ---
    { category: "The Web", value: 400, question: "The computer (or user) that requests data from a server.", answer: "Client" },
    { category: "The Web", value: 400, question: "Small chunks of data sent over a network.", answer: "Packets" },
    { category: "The Web", value: 400, question: "The capacity of a network to transmit data.", answer: "Bandwidth" },
    // --- The Web (500) ---
    { category: "The Web", value: 500, question: "The delay before a transfer of data begins.", answer: "Latency" },
    { category: "The Web", value: 500, question: "The secure version of HTTP that encrypts data.", answer: "HTTPS" },
    { category: "The Web", value: 500, question: "The standard markup language for creating web pages.", answer: "HTML" },

    // --- Law & Ethics (100) ---
    { category: "Law & Ethics", value: 100, question: "Legal protection for original creative works.", answer: "Copyright" },
    { category: "Law & Ethics", value: 100, question: "Using someone else's work without credit.", answer: "Plagiarism" },
    { category: "Law & Ethics", value: 100, question: "The right to keep personal information secret.", answer: "Privacy" },
    // --- Law & Ethics (200) ---
    { category: "Law & Ethics", value: 200, question: "Designing websites that can be used by people with disabilities.", answer: "Accessibility (a11y)" },
    { category: "Law & Ethics", value: 200, question: "The symbol used to indicate copyright.", answer: "©" },
    { category: "Law & Ethics", value: 200, question: "U.S. law protecting the privacy of children under 13 online.", answer: "COPPA" },
    // --- Law & Ethics (300) ---
    { category: "Law & Ethics", value: 300, question: "Legal protection for brand names, logos, and slogans.", answer: "Trademark" },
    { category: "Law & Ethics", value: 300, question: "Legal protection for inventions.", answer: "Patent" },
    { category: "Law & Ethics", value: 300, question: "Exception allowing limited use of copyrighted material for education.", answer: "Fair Use" },
    // --- Law & Ethics (400) ---
    { category: "Law & Ethics", value: 400, question: "Creative works that are not protected by copyright and free for anyone to use.", answer: "Public Domain" },
    { category: "Law & Ethics", value: 400, question: "Licenses that allow creators to share their work with specific permissions.", answer: "Creative Commons" },
    { category: "Law & Ethics", value: 400, question: "Strict data privacy law in the European Union.", answer: "GDPR" },
    // --- Law & Ethics (500) ---
    { category: "Law & Ethics", value: 500, question: "Software designed to damage or disrupt computers.", answer: "Malware" },
    { category: "Law & Ethics", value: 500, question: "Fraudulent attempt to obtain sensitive info by disguising as a trustworthy source.", answer: "Phishing" },
    { category: "Law & Ethics", value: 500, question: "A hacker who finds security holes to fix them (Ethical Hacker).", answer: "White Hat" },

    // --- Personas & SEO (100) ---
    { category: "Personas & SEO", value: 100, question: "A fictional character that represents a segment of your target audience.", answer: "User Persona" },
    { category: "Personas & SEO", value: 100, question: "The specific group of people you are designing your website for.", answer: "Target Audience" },
    { category: "Personas & SEO", value: 100, question: "The process of improving a website's visibility in search engines.", answer: "SEO (Search Engine Optimization)" },
    // --- Personas & SEO (200) ---
    { category: "Personas & SEO", value: 200, question: "Specific words or phrases users type into search engines.", answer: "Keywords" },
    { category: "Personas & SEO", value: 200, question: "Statistical data about a population (age, gender, income).", answer: "Demographics" },
    { category: "Personas & SEO", value: 200, question: "Data about user attitudes, interests, and lifestyles.", answer: "Psychographics" },
    // --- Personas & SEO (300) ---
    { category: "Personas & SEO", value: 300, question: "The page displayed by a search engine in response to a query.", answer: "SERP (Search Engine Results Page)" },
    { category: "Personas & SEO", value: 300, question: "Traffic that comes from unpaid search results.", answer: "Organic Traffic" },
    { category: "Personas & SEO", value: 300, question: "What a user wants to achieve when they search.", answer: "Search Intent" },
    // --- Personas & SEO (400) ---
    { category: "Personas & SEO", value: 400, question: "A story describing how a persona interacts with your product.", answer: "User Scenario" },
    { category: "Personas & SEO", value: 400, question: "Specific problems or frustrations your user faces.", answer: "Pain Points" },
    { category: "Personas & SEO", value: 400, question: "Links from other websites pointing to your site.", answer: "Backlinks" },
    // --- Personas & SEO (500) ---
    { category: "Personas & SEO", value: 500, question: "A program used by search engines to scan and index websites.", answer: "Crawler / Spider / Bot" },
    { category: "Personas & SEO", value: 500, question: "The text description of an image used for accessibility and SEO.", answer: "Alt Text" },
    { category: "Personas & SEO", value: 500, question: "The measurement and analysis of web traffic.", answer: "Analytics" },

    // --- Design (100) ---
    { category: "Design", value: 100, question: "A low-fidelity visual guide that represents the skeletal framework of a website.", answer: "Wireframe" },
    { category: "Design", value: 100, question: "The visual elements of a website (colors, buttons, layout).", answer: "UI (User Interface)" },
    { category: "Design", value: 100, question: "How a user feels when interacting with a system.", answer: "UX (User Experience)" },
    // --- Design (200) ---
    { category: "Design", value: 200, question: "A high-fidelity static picture of what the final website will look like.", answer: "Mockup" },
    { category: "Design", value: 200, question: "An interactive simulation of the website.", answer: "Prototype" },
    { category: "Design", value: 200, question: "The arrangement of visual elements on a page.", answer: "Layout" },
    // --- Design (300) ---
    { category: "Design", value: 300, question: "The empty space around elements (Negative Space).", answer: "Whitespace" },
    { category: "Design", value: 300, question: "Arranging elements to show their order of importance.", answer: "Visual Hierarchy" },
    { category: "Design", value: 300, question: "The difference between elements (like light text on dark background).", answer: "Contrast" },
    // --- Design (400) ---
    { category: "Design", value: 400, question: "Using the same styles and elements throughout a site.", answer: "Consistency / Repetition" },
    { category: "Design", value: 400, question: "Placing elements along a common line.", answer: "Alignment" },
    { category: "Design", value: 400, question: "Grouping related items together.", answer: "Proximity" },
    // --- Design (500) ---
    { category: "Design", value: 500, question: "The art and technique of arranging type.", answer: "Typography" },
    { category: "Design", value: 500, question: "The science of how colors interact and affect mood.", answer: "Color Theory" },
    { category: "Design", value: 500, question: "Designing a site so it looks good on all screen sizes.", answer: "Responsive Design" }
];

// --- HOLLYWOOD SQUARES DATA (Chapters 6-9: HTML/CSS) ---
const HOLLYWOOD_PEOPLE = [
    { name: "Tim Berners-Lee", title: "Inventor" }, { name: "Ada Lovelace", title: "First Programmer" },
    { name: "Grace Hopper", title: "Admiral" }, { name: "Alan Turing", title: "Decoder" },
    { name: "Steve Jobs", title: "Visionary" }, { name: "Bill Gates", title: "Founder" },
    { name: "Håkon Wium Lie", title: "CSS Creator" }, { name: "Brendan Eich", title: "JS Creator" },
    { name: "Mark Zuckerberg", title: "CEO" }
];

const HOLLYWOOD_QUESTIONS = [
    { q: "Is HTML considered a programming language?", isTrue: false, truthfulText: "No, it's a Markup Language.", bluffText: "Yes, it has variables and loops.", key: "h1" },
    { q: "Does CSS stand for 'Computer Style Sheets'?", isTrue: false, truthfulText: "No, Cascading Style Sheets.", bluffText: "Yes, invented by Apple.", key: "h2" },
    { q: "Is <h1> the smallest heading tag?", isTrue: false, truthfulText: "No, <h1> is the largest. <h6> is smallest.", bluffText: "Yes, 1 is smaller than 6.", key: "h3" },
    { q: "Is padding the space *inside* the border?", isTrue: true, truthfulText: "Yes, between content and border.", bluffText: "No, it's outside.", key: "h4" },
    { q: "Is margin the space *outside* the border?", isTrue: true, truthfulText: "Yes, spacing between elements.", bluffText: "No, it's inside.", key: "h5" },
    { q: "Is <img> a void tag (no closing tag)?", isTrue: true, truthfulText: "Yes, it doesn't wrap content.", bluffText: "No, you must use </img>.", key: "h6" },
    { q: "Is Flexbox a 2-dimensional layout system?", isTrue: false, truthfulText: "No, Flexbox is 1D (row OR column). Grid is 2D.", bluffText: "Yes, it handles rows and columns at once.", key: "h7" },
    { q: "Is CSS Grid a 2-dimensional layout system?", isTrue: true, truthfulText: "Yes, it handles rows and columns simultaneously.", bluffText: "No, it's 1D.", key: "h8" },
    { q: "Is the alt attribute important for SEO?", isTrue: true, truthfulText: "Yes, and for accessibility.", bluffText: "No, only for broken images.", key: "h9" },
    { q: "Is the <a> tag used for audio?", isTrue: false, truthfulText: "No, <a> is for Anchors (links). Use <audio> for sound.", bluffText: "Yes, A for Audio.", key: "h10" },
    { q: "Is <video> an HTML5 tag?", isTrue: true, truthfulText: "Yes, introduced in HTML5.", bluffText: "No, it's old HTML4.", key: "h11" },
    { q: "Is the JPG format lossless?", isTrue: false, truthfulText: "No, JPG is lossy compression.", bluffText: "Yes, perfect quality.", key: "h12" },
    { q: "Does the Box Model consist of Content, Padding, Border, and Margin?", isTrue: true, truthfulText: "Yes, in that order from inside out.", bluffText: "No, it's Content, Margin, Border, Padding.", key: "h13" },
    { q: "Is z-index used to control stacking order?", isTrue: true, truthfulText: "Yes, higher numbers are 'closer' to the viewer.", bluffText: "No, it controls zoom level.", key: "h14" },
    { q: "Is position: absolute relative to the viewport?", isTrue: false, truthfulText: "No, relative to the nearest positioned ancestor. fixed is viewport.", bluffText: "Yes, always to the screen.", key: "h15" },
    { q: "Does display: none hide an element but keep its space?", isTrue: false, truthfulText: "No, it removes it from the flow. visibility: hidden keeps space.", bluffText: "Yes, it just turns invisible.", key: "h16" },
    { q: "Is float the modern way to build layouts?", isTrue: false, truthfulText: "No, use Flexbox or Grid. Float is legacy.", bluffText: "Yes, it's the standard.", key: "h17" },
    { q: "Is rem relative to the root font size?", isTrue: true, truthfulText: "Yes, Root EM.", bluffText: "No, relative to the parent.", key: "h18" },
    { q: "Is em relative to the parent font size?", isTrue: true, truthfulText: "Yes.", bluffText: "No, relative to the root.", key: "h19" },
    { q: "Does vw stand for Very Wide?", isTrue: false, truthfulText: "No, Viewport Width.", bluffText: "Yes, for wide monitors.", key: "h20" },
    { q: "Is using !important considered good practice?", isTrue: false, truthfulText: "No, it breaks the cascade. Use sparingly.", bluffText: "Yes, ensures your styles work.", key: "h21" },
    { q: "Is <div> a semantic tag?", isTrue: false, truthfulText: "No, it implies no meaning. Use <section> or <article>.", bluffText: "Yes, it means 'Division'.", key: "h22" },
    { q: "Is <nav> a semantic tag?", isTrue: true, truthfulText: "Yes, for navigation blocks.", bluffText: "No, just a short div.", key: "h23" },
    { q: "Does <ul> create an ordered (numbered) list?", isTrue: false, truthfulText: "No, Unordered (bulleted). <ol> is ordered.", bluffText: "Yes, Universal List.", key: "h24" },
    { q: "Does target='_blank' open a link in a new tab?", isTrue: true, truthfulText: "Yes.", bluffText: "No, it opens a blank page.", key: "h25" },
    { q: "Is the content in <head> visible on the page?", isTrue: false, truthfulText: "No, it's for metadata and links.", bluffText: "Yes, it's the header bar.", key: "h26" },
    { q: "Does the <title> tag go in the <body>?", isTrue: false, truthfulText: "No, it goes in the <head>.", bluffText: "Yes, at the top.", key: "h27" },
    { q: "Is the <link> tag used for CSS?", isTrue: true, truthfulText: "Yes, to link external stylesheets.", bluffText: "No, for hyperlinks.", key: "h28" },
    { q: "Is the <script> tag used for JavaScript?", isTrue: true, truthfulText: "Yes.", bluffText: "No, for screenplays.", key: "h29" },
    { q: "Can an ID be used multiple times on a page?", isTrue: false, truthfulText: "No, IDs must be unique.", bluffText: "Yes, as many as you want.", key: "h30" },
    { q: "Can a Class be used multiple times on a page?", isTrue: true, truthfulText: "Yes, classes are reusable.", bluffText: "No, unique only.", key: "h31" },
    { q: "Is the * selector a wildcard?", isTrue: true, truthfulText: "Yes, it selects everything.", bluffText: "No, it selects stars.", key: "h32" },
    { q: "Is :hover a pseudo-class?", isTrue: true, truthfulText: "Yes, defines a special state.", bluffText: "No, it's an animation.", key: "h33" },
    { q: "Is ::before a pseudo-element?", isTrue: true, truthfulText: "Yes, inserts content before an element.", bluffText: "No, it's a time machine.", key: "h34" },
    { q: "Does the 'a' in rgba stand for Alpha?", isTrue: true, truthfulText: "Yes, it controls opacity.", bluffText: "No, Apple.", key: "h35" },
    { q: "Is #FFF the hex code for Black?", isTrue: false, truthfulText: "No, #FFF is White. #000 is Black.", bluffText: "Yes.", key: "h36" },
    { q: "Is #000 the hex code for White?", isTrue: false, truthfulText: "No, #000 is Black.", bluffText: "Yes.", key: "h37" },
    { q: "Is font-family used to set text size?", isTrue: false, truthfulText: "No, it sets the typeface. font-size sets size.", bluffText: "Yes.", key: "h38" },
    { q: "Is font-weight used for boldness?", isTrue: true, truthfulText: "Yes (e.g., 700 is bold).", bluffText: "No, how heavy the letters are.", key: "h39" },
    { q: "Is text-align used to change color?", isTrue: false, truthfulText: "No, it aligns text (left, center, right).", bluffText: "Yes.", key: "h40" },
    { q: "Is list-style used to remove bullets?", isTrue: true, truthfulText: "Yes, list-style: none.", bluffText: "No.", key: "h41" },
    { q: "Is border-radius used to round corners?", isTrue: true, truthfulText: "Yes.", bluffText: "No, it measures the border.", key: "h42" },
    { q: "Is box-shadow used for text?", isTrue: false, truthfulText: "No, for boxes. text-shadow is for text.", bluffText: "Yes.", key: "h43" },
    { q: "Is text-shadow used for boxes?", isTrue: false, truthfulText: "No, for text.", bluffText: "Yes.", key: "h44" },
    { q: "Is linear-gradient a color property?", isTrue: false, truthfulText: "No, it's treated as a background image.", bluffText: "Yes.", key: "h45" },
    { q: "Is background-image used to set color?", isTrue: false, truthfulText: "No, used for images.", bluffText: "Yes.", key: "h46" },
    { q: "Is <iframe> used to embed video?", isTrue: true, truthfulText: "Yes, often for YouTube.", bluffText: "No, for pictures.", key: "h47" },
    { q: "Is SVG scalable without losing quality?", isTrue: true, truthfulText: "Yes, it's vector-based.", bluffText: "No, it gets pixelated.", key: "h48" },
    { q: "Does PNG support transparency?", isTrue: true, truthfulText: "Yes.", bluffText: "No.", key: "h49" },
    { q: "Is GIF the only format for animation?", isTrue: false, truthfulText: "No, but it's common. SVG and WebP also animate.", bluffText: "Yes.", key: "h50" },
    { q: "Is .mp4 an audio format?", isTrue: false, truthfulText: "No, video.", bluffText: "Yes.", key: "h51" },
    { q: "Is .mp3 a video format?", isTrue: false, truthfulText: "No, audio.", bluffText: "Yes.", key: "h52" },
    { q: "Is controls an attribute for media?", isTrue: true, truthfulText: "Yes, adds play/pause buttons.", bluffText: "No.", key: "h53" },
    { q: "Is autoplay generally annoyed by users?", isTrue: true, truthfulText: "Yes, especially with sound.", bluffText: "No, everyone loves it.", key: "h54" },
    { q: "Is loop used to repeat media?", isTrue: true, truthfulText: "Yes.", bluffText: "No, it ties a knot.", key: "h55" },
    { q: "Is the poster attribute for video thumbnails?", isTrue: true, truthfulText: "Yes.", bluffText: "No, for printing.", key: "h56" },
    { q: "Is <track> used for captions?", isTrue: true, truthfulText: "Yes.", bluffText: "No, for running.", key: "h57" },
    { q: "Is <source> used to define media files?", isTrue: true, truthfulText: "Yes, inside video/audio tags.", bluffText: "No.", key: "h58" },
    { q: "Is <figure> a semantic tag?", isTrue: true, truthfulText: "Yes, for self-contained content.", bluffText: "No, for math.", key: "h59" },
    { q: "Is <figcaption> used for captions?", isTrue: true, truthfulText: "Yes, inside figure.", bluffText: "No.", key: "h60" },
    { q: "Is <table> used for layout?", isTrue: false, truthfulText: "No, only for tabular data.", bluffText: "Yes, old school style.", key: "h61" },
    { q: "Is <tr> a table row?", isTrue: true, truthfulText: "Yes.", bluffText: "No, table right.", key: "h62" },
    { q: "Is <td> table data?", isTrue: true, truthfulText: "Yes.", bluffText: "No, table down.", key: "h63" },
    { q: "Is <th> table header?", isTrue: true, truthfulText: "Yes.", bluffText: "No, table high.", key: "h64" },
    { q: "Is colspan used to merge columns?", isTrue: true, truthfulText: "Yes.", bluffText: "No.", key: "h65" },
    { q: "Is rowspan used to merge rows?", isTrue: true, truthfulText: "Yes.", bluffText: "No.", key: "h66" },
    { q: "Is <form> used to collect input?", isTrue: true, truthfulText: "Yes.", bluffText: "No.", key: "h67" },
    { q: "Is <input> a self-closing tag?", isTrue: true, truthfulText: "Yes.", bluffText: "No.", key: "h68" },
    { q: "Is <label> used for inputs?", isTrue: true, truthfulText: "Yes, for accessibility.", bluffText: "No.", key: "h69" },
    { q: "Is type='submit' a button?", isTrue: true, truthfulText: "Yes.", bluffText: "No.", key: "h70" },
    { q: "Is placeholder the hint text?", isTrue: true, truthfulText: "Yes.", bluffText: "No.", key: "h71" },
    { q: "Is required used for validation?", isTrue: true, truthfulText: "Yes.", bluffText: "No.", key: "h72" },
    { q: "Is type='email' useful?", isTrue: true, truthfulText: "Yes, validates email format.", bluffText: "No.", key: "h73" },
    { q: "Is type='password' masked?", isTrue: true, truthfulText: "Yes, shows dots.", bluffText: "No.", key: "h74" },
    { q: "Is <textarea> for long text?", isTrue: true, truthfulText: "Yes.", bluffText: "No.", key: "h75" }
];

// --- MILLIONAIRE DATA (Chapters 10-11: JS/Deployment) ---
const MIL_QUESTIONS = [
    { question: "What is JS?", answers: ["JavaScript", "JavaSource", "JustScript", "JoyScript"], correct: 0 },
    { question: "Which keyword declares a block-scoped variable?", answers: ["let", "var", "dec", "set"], correct: 0 },
    { question: "What function prints to the console?", answers: ["console.log()", "print()", "echo()", "write()"], correct: 0 },
    { question: "What data type is a list of items?", answers: ["Array", "String", "Number", "Boolean"], correct: 0 },
    { question: "What is a reusable block of code?", answers: ["Function", "Loop", "Variable", "Array"], correct: 0 },
    { question: "What does DOM stand for?", answers: ["Document Object Model", "Disk OS", "Data Object Mode", "Digital OM"], correct: 0 },
    { question: "What version control system tracks changes?", answers: ["Git", "Word", "Excel", "Notepad"], correct: 0 },
    { question: "Where do you host Git repositories?", answers: ["GitHub", "GitLab", "Bitbucket", "All of these"], correct: 3 },
    { question: "Command to upload to GitHub?", answers: ["git push", "git upload", "git send", "git save"], correct: 0 },
    { question: "Command to download from GitHub?", answers: ["git pull", "git down", "git get", "git fetch"], correct: 0 },
    { question: "Process of putting a site on a live server?", answers: ["Deployment", "Development", "Debugging", "Designing"], correct: 0 },
    { question: "What protocol transfers files to a server?", answers: ["FTP", "HTTP", "SMTP", "DNS"], correct: 0 },
    { question: "What system translates domain names to IPs?", answers: ["DNS", "DHCP", "URL", "ISP"], correct: 0 },
    { question: "What structure repeats code?", answers: ["Loop", "Array", "Function", "Object"], correct: 0 },
    { question: "What data type is true/false?", answers: ["Boolean", "String", "Number", "Null"], correct: 0 },
    { question: "Which keyword creates a constant?", answers: ["const", "let", "var", "fixed"], correct: 0 },
    { question: "What executes code based on a condition?", answers: ["if statement", "for loop", "function", "array"], correct: 0 },
    { question: "What is the strict equality operator?", answers: ["===", "==", "=", "!="], correct: 0 },
    { question: "What symbol starts a single-line comment in JS?", answers: ["//", "/*", "<!--", "#"], correct: 0 },
    { question: "Method to select element by ID?", answers: ["getElementById", "querySelector", "getElement", "selectID"], correct: 0 },
    { question: "Method to listen for clicks?", answers: ["addEventListener", "onClick", "listen", "hear"], correct: 0 },
    { question: "Data structure with Key-Value pairs?", answers: ["Object", "Array", "String", "Boolean"], correct: 0 },
    { question: "Value representing 'nothing'?", answers: ["null", "0", "undefined", "false"], correct: 0 },
    { question: "Variable declared but not assigned?", answers: ["undefined", "null", "empty", "void"], correct: 0 },
    { question: "Text inside quotes?", answers: ["String", "Word", "Text", "Char"], correct: 0 },
    { question: "Command to save changes locally?", answers: ["git commit", "git save", "git add", "git push"], correct: 0 },
    { question: "Command to initialize a repo?", answers: ["git init", "git start", "git new", "git create"], correct: 0 },
    { question: "Command to copy a repo?", answers: ["git clone", "git copy", "git duplicate", "git mirror"], correct: 0 },
    { question: "Platform for static hosting?", answers: ["Netlify", "Spotify", "Shopify", "Notify"], correct: 0 },
    { question: "Folder for public files?", answers: ["public_html", "private", "admin", "config"], correct: 0 },
    { question: "Computer that serves files?", answers: ["Server", "Client", "Router", "Modem"], correct: 0 },
    { question: "Error code for 'Not Found'?", answers: ["404", "200", "500", "301"], correct: 0 },
    { question: "Default homepage filename?", answers: ["index.html", "home.html", "main.html", "start.html"], correct: 0 },
    { question: "Popular FTP Client?", answers: ["FileZilla", "Mozilla", "Godzilla", "Vanilla"], correct: 0 },
    { question: "Secure Shell command?", answers: ["ssh", "secure", "shell", "cmd"], correct: 0 },
    { question: "Change directory command?", answers: ["cd", "ch", "dir", "mv"], correct: 0 },
    { question: "List files command?", answers: ["ls", "list", "show", "files"], correct: 0 },
    { question: "Command Line Interface acronym?", answers: ["CLI", "GUI", "API", "URL"], correct: 0 },
    { question: "Short for Repository?", answers: ["Repo", "Depot", "Store", "Bank"], correct: 0 },
    { question: "Parallel version of code?", answers: ["Branch", "Leaf", "Trunk", "Root"], correct: 0 },
    { question: "Combining branches?", answers: ["Merge", "Mix", "Blend", "Join"], correct: 0 },
    { question: "Edit overlap error?", answers: ["Conflict", "Crash", "Bug", "Fail"], correct: 0 },
    { question: "File to exclude from Git?", answers: [".gitignore", ".ignore", ".exclude", ".skip"], correct: 0 },
    { question: "Popular Code Editor?", answers: ["VS Code", "Word", "Paint", "Excel"], correct: 0 },
    { question: "Error in code?", answers: ["Bug", "Feature", "Glitch", "Hack"], correct: 0 },
    { question: "Process of fixing errors?", answers: ["Debugging", "Coding", "Testing", "Running"], correct: 0 },
    { question: "Grammar of code?", answers: ["Syntax", "Diction", "Style", "Format"], correct: 0 },
    { question: "Input to a function?", answers: ["Argument/Parameter", "Variable", "Return", "Output"], correct: 0 },
    { question: "Output from a function?", answers: ["Return", "Print", "Input", "Callback"], correct: 0 },
    { question: "Variable visibility?", answers: ["Scope", "Range", "View", "Sight"], correct: 0 },
    { question: "Storage in browser?", answers: ["LocalStorage", "ServerStorage", "Cloud", "Disk"], correct: 0 },
    { question: "Data format (Text)?", answers: ["JSON", "HTML", "CSS", "SQL"], correct: 0 },
    { question: "Interface for software?", answers: ["API", "GUI", "CLI", "URI"], correct: 0 },
    { question: "Function passed as arg?", answers: ["Callback", "Return", "Loop", "Promise"], correct: 0 },
    { question: "Waits for user action?", answers: ["Event Listener", "Function", "Loop", "Variable"], correct: 0 },
    { question: "Property for HTML content?", answers: ["innerHTML", "textContent", "value", "style"], correct: 0 },
    { question: "Object for CSS classes?", answers: ["classList", "className", "style", "css"], correct: 0 },
    { question: "Switch on/off class?", answers: ["toggle", "add", "remove", "switch"], correct: 0 },
    { question: "Change text color JS?", answers: ["style.color", "text-color", "font-color", "color"], correct: 0 },
    { question: "Generate random number?", answers: ["Math.random()", "rand()", "random()", "num()"], correct: 0 },
    { question: "Size of array?", answers: ["length", "size", "count", "width"], correct: 0 },
    { question: "Add to end of array?", answers: ["push()", "add()", "insert()", "append()"], correct: 0 },
    { question: "Remove from end of array?", answers: ["pop()", "remove()", "delete()", "cut()"], correct: 0 },
    { question: "Loop through array?", answers: ["forEach()", "loop()", "iterate()", "scan()"], correct: 0 },
    { question: "Transform array items?", answers: ["map()", "change()", "transform()", "edit()"], correct: 0 },
    { question: "Select array items?", answers: ["filter()", "select()", "choose()", "pick()"], correct: 0 },
    { question: "Sort array items?", answers: ["sort()", "order()", "arrange()", "rank()"], correct: 0 },
    { question: "Not a Number?", answers: ["NaN", "Null", "Zero", "Void"], correct: 0 },
    { question: "Check variable type?", answers: ["typeof", "check()", "type()", "kind()"], correct: 0 },
    { question: "Fixed value?", answers: ["Literal", "Variable", "Constant", "Static"], correct: 0 },
    { question: "Line of code?", answers: ["Statement", "Sentence", "Word", "Block"], correct: 0 },
    { question: "Group of statements?", answers: ["Block", "Line", "Page", "File"], correct: 0 },
    { question: "Naming: myVar?", answers: ["camelCase", "snake_case", "kebab-case", "PascalCase"], correct: 0 },
    { question: "Naming: my_var?", answers: ["snake_case", "camelCase", "kebab-case", "PascalCase"], correct: 0 },
    { question: "Naming: MyVar?", answers: ["PascalCase", "camelCase", "snake_case", "UPPERCASE"], correct: 0 }
];

// --- VOCAB (All Chapters) ---
const VOCAB = [
    { word: "INTERNET", clue: "Global network of hardware." },
    { word: "WEB", clue: "System of documents on the internet." },
    { word: "SERVER", clue: "Computer hosting websites." },
    { word: "CLIENT", clue: "Computer requesting websites." },
    { word: "BROWSER", clue: "Software to view web pages." },
    { word: "WIREFRAME", clue: "Skeletal layout blueprint." },
    { word: "PERSONA", clue: "Fictional user profile." },
    { word: "ACCESSIBILITY", clue: "Design for all users." },
    { word: "COPYRIGHT", clue: "Legal protection for work." },
    { word: "SEO", clue: "Search Engine Optimization." },
    { word: "HTML", clue: "Structure language." },
    { word: "CSS", clue: "Style language." },
    { word: "TAG", clue: "HTML command in brackets." },
    { word: "ATTRIBUTE", clue: "Modifies an HTML tag." },
    { word: "SELECTOR", clue: "Targets HTML for styling." },
    { word: "PROPERTY", clue: "What style to change." },
    { word: "VALUE", clue: "How to change the style." },
    { word: "BOXMODEL", clue: "Margin, Border, Padding, Content." },
    { word: "FLEXBOX", clue: "1-dimensional layout." },
    { word: "GRID", clue: "2-dimensional layout." },
    { word: "RESPONSIVE", clue: "Adapts to screen size." },
    { word: "MEDIAQUERY", clue: "CSS rule for breakpoints." },
    { word: "SEMANTIC", clue: "Meaningful HTML tags." },
    { word: "JAVASCRIPT", clue: "Behavior language." },
    { word: "VARIABLE", clue: "Container for data." },
    { word: "FUNCTION", clue: "Reusable code block." },
    { word: "ARRAY", clue: "List of data." },
    { word: "OBJECT", clue: "Key-value pairs." },
    { word: "DOM", clue: "Document Object Model." },
    { word: "EVENT", clue: "User action." },
    { word: "GIT", clue: "Version control." },
    { word: "GITHUB", clue: "Cloud for Git." },
    { word: "DEPLOYMENT", clue: "Making site live." },
    { word: "FTP", clue: "File transfer." },
    { word: "DNS", clue: "Domain name system." },
    { word: "URL", clue: "Web address." },
    { word: "HTTP", clue: "Transfer protocol." },
    { word: "IPADDRESS", clue: "Device ID." },
    { word: "LOCALHOST", clue: "Your computer server." },
    { word: "CONSOLE", clue: "Debugging tool." }
];

// ==============================================================
// AUTO-TRANSLATOR: Converts your custom arrays into the Game Engine format
// ==============================================================
const mappedJeopardy = {};
JEOPARDY_DATA.forEach(item => {
    if (!mappedJeopardy[item.category]) {
        mappedJeopardy[item.category] = { 100: [], 200: [], 300: [], 400: [], 500: [] };
    }
    mappedJeopardy[item.category][item.value].push({ q: item.question, a: item.answer });
});

const mappedMillionaire = MIL_QUESTIONS.map(item => ({
    question: item.question,
    options: item.answers,
    answer: item.answers[item.correct]
}));

const mappedHollywood = HOLLYWOOD_QUESTIONS.map(item => ({
    question: item.q,
    answer: item.truthfulText,
    lie: item.bluffText
}));

// Attach everything to the global object the Game Engine looks for
window.currentChapterData = {
    chapterTitle: "Web Design 1: Ultimate Review",
    jeopardyData: mappedJeopardy,
    hollywoodData: mappedHollywood,
    millionaireData: mappedMillionaire,
    vocabList: VOCAB
};