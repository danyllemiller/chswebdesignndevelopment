// --- JEOPARDY DATA (Chapters 1-17) ---
// CLUES are statements. ANSWERS must be phrased as questions by the user.
const JEOPARDY_DATA = [
    // --- FOUNDATIONS (100) ---
    { category: "Foundations", value: 100, question: "He is credited with inventing the World Wide Web in 1989.", answer: "Tim Berners-Lee" },
    { category: "Foundations", value: 100, question: "This is the very first step in the web design process.", answer: "Research / Discovery / Planning" },
    { category: "Foundations", value: 100, question: "This organization sets the standards for the web (W3C).", answer: "World Wide Web Consortium" },

    // --- FOUNDATIONS (200) ---
    { category: "Foundations", value: 200, question: "This term describes a fictional character representing your target audience.", answer: "User Persona" },
    { category: "Foundations", value: 200, question: "This document outlines the goals, audience, and scope of a project.", answer: "Design Brief" },
    { category: "Foundations", value: 200, question: "This is the specific group of people a website is designed to reach.", answer: "Target Audience" },

    // --- FOUNDATIONS (300) ---
    { category: "Foundations", value: 300, question: "This visual guide represents the skeletal framework of a website.", answer: "Wireframe" },
    { category: "Foundations", value: 300, question: "This principle ensures websites are usable by people with disabilities.", answer: "Accessibility (a11y)" },
    { category: "Foundations", value: 300, question: "This legal concept protects original creative works.", answer: "Copyright" },

    // --- FOUNDATIONS (400) ---
    { category: "Foundations", value: 400, question: "This term refers to the feeling a user gets when interacting with a site.", answer: "User Experience (UX)" },
    { category: "Foundations", value: 400, question: "This acronym stands for the optimization of websites for search engines.", answer: "SEO" },
    { category: "Foundations", value: 400, question: "This design approach prioritizes mobile devices first.", answer: "Mobile-First Design" },

    // --- FOUNDATIONS (500) ---
    { category: "Foundations", value: 500, question: "This color scheme uses different shades of a single color.", answer: "Monochromatic" },
    { category: "Foundations", value: 500, question: "This Gestalt principle states that objects close together are perceived as related.", answer: "Proximity" },
    { category: "Foundations", value: 500, question: "This file format is best for logos because it scales without losing quality.", answer: "SVG (Scalable Vector Graphics)" },

    // --- HTML (100) ---
    { category: "HTML", value: 100, question: "HTML stands for this.", answer: "HyperText Markup Language" },
    { category: "HTML", value: 100, question: "This tag creates the largest heading.", answer: "<code>&lt;h1&gt;</code>" },
    { category: "HTML", value: 100, question: "This tag creates a hyperlink.", answer: "<code>&lt;a&gt;</code> (Anchor tag)" },

    // --- HTML (200) ---
    { category: "HTML", value: 200, question: "This attribute specifies the destination URL of a link.", answer: "<code>href</code>" },
    { category: "HTML", value: 200, question: "This tag is used to display an image.", answer: "<code>&lt;img&gt;</code>" },
    { category: "HTML", value: 200, question: "This attribute provides alternative text for images.", answer: "<code>alt</code>" },

    // --- HTML (300) ---
    { category: "HTML", value: 300, question: "This tag defines an unordered (bulleted) list.", answer: "<code>&lt;ul&gt;</code>" },
    { category: "HTML", value: 300, question: "This tag defines a list item.", answer: "<code>&lt;li&gt;</code>" },
    { category: "HTML", value: 300, question: "This semantic tag represents the main content of the document.", answer: "<code>&lt;main&gt;</code>" },

    // --- HTML (400) ---
    { category: "HTML", value: 400, question: "This tag contains metadata about the document.", answer: "<code>&lt;head&gt;</code>" },
    { category: "HTML", value: 400, question: "This declaration must be the very first thing in an HTML document.", answer: "<code>&lt;!DOCTYPE html&gt;</code>" },
    { category: "HTML", value: 400, question: "This tag creates a container for navigation links.", answer: "<code>&lt;nav&gt;</code>" },

    // --- HTML (500) ---
    { category: "HTML", value: 500, question: "This tag is used to embed another HTML page within the current page.", answer: "<code>&lt;iframe&gt;</code>" },
    { category: "HTML", value: 500, question: "This attribute opens a link in a new tab.", answer: "<code>target=\"_blank\"</code>" },
    { category: "HTML", value: 500, question: "This tag creates a table row.", answer: "<code>&lt;tr&gt;</code>" },

    // --- CSS (100) ---
    { category: "CSS", value: 100, question: "CSS stands for this.", answer: "Cascading Style Sheets" },
    { category: "CSS", value: 100, question: "This property changes the text color.", answer: "<code>color</code>" },
    { category: "CSS", value: 100, question: "This property changes the background color.", answer: "<code>background-color</code>" },

    // --- CSS (200) ---
    { category: "CSS", value: 200, question: "This selector targets an element with a specific ID.", answer: "<code>#</code> (Hash/Pound)" },
    { category: "CSS", value: 200, question: "This selector targets elements with a specific class.", answer: "<code>.</code> (Dot)" },
    { category: "CSS", value: 200, question: "This property controls the size of the text.", answer: "<code>font-size</code>" },

    // --- CSS (300) ---
    { category: "CSS", value: 300, question: "This Box Model property adds space *outside* the border.", answer: "<code>margin</code>" },
    { category: "CSS", value: 300, question: "This Box Model property adds space *inside* the border.", answer: "<code>padding</code>" },
    { category: "CSS", value: 300, question: "This property allows you to round the corners of an element.", answer: "<code>border-radius</code>" },

    // --- CSS (400) ---
    { category: "CSS", value: 400, question: "This layout module allows for flexible 1-dimensional layouts.", answer: "Flexbox" },
    { category: "CSS", value: 400, question: "This property in Flexbox aligns items along the main axis.", answer: "<code>justify-content</code>" },
    { category: "CSS", value: 400, question: "This layout module allows for 2-dimensional layouts (rows and columns).", answer: "CSS Grid" },

    // --- CSS (500) ---
    { category: "CSS", value: 500, question: "This unit is relative to the root font size.", answer: "<code>rem</code>" },
    { category: "CSS", value: 500, question: "This at-rule is used for making responsive designs.", answer: "<code>@media</code>" },
    { category: "CSS", value: 500, question: "This pseudo-class applies styles when the mouse is over an element.", answer: "<code>:hover</code>" },

    // --- JAVASCRIPT (100) ---
    { category: "JavaScript", value: 100, question: "This keyword creates a variable that can be changed.", answer: "<code>let</code>" },
    { category: "JavaScript", value: 100, question: "This keyword creates a constant variable.", answer: "<code>const</code>" },
    { category: "JavaScript", value: 100, question: "This data type represents text.", answer: "String" },

    // --- JAVASCRIPT (200) ---
    { category: "JavaScript", value: 200, question: "This symbol is used for single-line comments.", answer: "<code>//</code>" },
    { category: "JavaScript", value: 200, question: "This function is used to print messages to the console.", answer: "<code>console.log()</code>" },
    { category: "JavaScript", value: 200, question: "This operator is used for strict equality comparison.", answer: "<code>===</code>" },

    // --- JAVASCRIPT (300) ---
    { category: "JavaScript", value: 300, question: "This structure allows you to execute code if a condition is true.", answer: "<code>if</code> statement" },
    { category: "JavaScript", value: 300, question: "This creates a reusable block of code.", answer: "Function" },
    { category: "JavaScript", value: 300, question: "This data type represents a list of items.", answer: "Array" },

    // --- JAVASCRIPT (400) ---
    { category: "JavaScript", value: 400, question: "This method selects an HTML element by its ID.", answer: "<code>document.getElementById()</code>" },
    { category: "JavaScript", value: 400, question: "This method adds an event listener to an element.", answer: "<code>addEventListener()</code>" },
    { category: "JavaScript", value: 400, question: "This property changes the HTML content inside an element.", answer: "<code>innerHTML</code>" },

    // --- JAVASCRIPT (500) ---
    { category: "JavaScript", value: 500, question: "This term refers to the browser's representation of the page.", answer: "DOM (Document Object Model)" },
    { category: "JavaScript", value: 500, question: "This loop repeats code while a condition is true.", answer: "<code>while</code> loop" },
    { category: "JavaScript", value: 500, question: "This type of function is passed as an argument to another function.", answer: "Callback function" },

    // --- WORKFLOW (100) ---
    { category: "Workflow", value: 100, question: "This version control system tracks changes to code.", answer: "Git" },
    { category: "Workflow", value: 100, question: "This website hosts Git repositories in the cloud.", answer: "GitHub" },
    { category: "Workflow", value: 100, question: "This term describes a collection of your best work.", answer: "Portfolio" },

    // --- WORKFLOW (200) ---
    { category: "Workflow", value: 200, question: "This Git command saves changes to the local repository.", answer: "<code>git commit</code>" },
    { category: "Workflow", value: 200, question: "This Git command uploads local commits to a remote repository.", answer: "<code>git push</code>" },
    { category: "Workflow", value: 200, question: "This process involves making a website live on the internet.", answer: "Deployment" },

    // --- WORKFLOW (300) ---
    { category: "Workflow", value: 300, question: "This platform is used for continuous deployment (we used it in class).", answer: "Netlify" },
    { category: "Workflow", value: 300, question: "This file tells Git which files to ignore.", answer: "<code>.gitignore</code>" },
    { category: "Workflow", value: 300, question: "This term describes a copy of a repository on your local machine.", answer: "Clone" },

    // --- WORKFLOW (400) ---
    { category: "Workflow", value: 400, question: "This is the folder name commonly used for the main website files.", answer: "<code>public_html</code> or <code>dist</code> or <code>root</code>" },
    { category: "Workflow", value: 400, question: "This protocol is used for transferring files to a server manually.", answer: "FTP (File Transfer Protocol)" },
    { category: "Workflow", value: 400, question: "This system translates domain names into IP addresses.", answer: "DNS (Domain Name System)" },

    // --- WORKFLOW (500) ---
    { category: "Workflow", value: 500, question: "This term describes a separate version of the code for testing features.", answer: "Branch" },
    { category: "Workflow", value: 500, question: "This action combines changes from one branch into another.", answer: "Merge" },
    { category: "Workflow", value: 500, question: "This is a request to merge your changes into the main project.", answer: "Pull Request (PR)" }
];

// --- HOLLYWOOD SQUARES DATA ---
const HOLLYWOOD_PEOPLE = [
    { name: "Tim Berners-Lee", title: "Inventor of WWW" },
    { name: "Ada Lovelace", title: "First Programmer" },
    { name: "Grace Hopper", title: "Queen of Code" },
    { name: "Alan Turing", title: "AI Pioneer" },
    { name: "Margaret Hamilton", title: "Apollo Engineer" },
    { name: "Brendan Eich", title: "Creator of JS" },
    { name: "Håkon Wium Lie", title: "Father of CSS" },
    { name: "Guido van Rossum", title: "Python Creator" },
    { name: "Linus Torvalds", title: "Linux Creator" }
];

const HOLLYWOOD_QUESTIONS = [
    { q: "Is HTML a programming language?", isTrue: false, truthfulText: "No, it's a Markup Language.", bluffText: "Yes, the most powerful one.", key: "Q1" },
    { q: "Does CSS stand for 'Computer Style Sheets'?", isTrue: false, truthfulText: "No, Cascading Style Sheets.", bluffText: "Yes, invented by Apple.", key: "Q2" },
    { q: "Is <code>git push</code> used to download code?", isTrue: false, truthfulText: "No, <code>git pull</code> downloads. Push uploads.", bluffText: "Yes, you push it to your computer.", key: "Q3" },
    { q: "Does the <code>&lt;a&gt;</code> tag create a link?", isTrue: true, truthfulText: "Yes, it stands for Anchor.", bluffText: "No, it stands for Apple.", key: "Q4" },
    { q: "Is <code>padding</code> space *outside* the border?", isTrue: false, truthfulText: "No, <code>margin</code> is outside. <code>padding</code> is inside.", bluffText: "Yes, it pads the neighbors.", key: "Q5" },
    { q: "Does <code>console.log()</code> print to the printer?", isTrue: false, truthfulText: "No, it prints to the developer console.", bluffText: "Yes, check the paper tray.", key: "Q6" },
    { q: "Is an ID selector written with a <code>.</code>?", isTrue: false, truthfulText: "No, IDs use <code>#</code>. Classes use <code>.</code>.", bluffText: "Yes, <code>.</code> for ID, <code>#</code> for Hashtag.", key: "Q7" },
    { q: "Does <code>&lt;!DOCTYPE html&gt;</code> go at the very top?", isTrue: true, truthfulText: "Yes, it tells the browser the HTML version.", bluffText: "No, it goes in the footer.", key: "Q8" },
    { q: "Is an Array a list of items?", isTrue: true, truthfulText: "Yes, like a shopping list.", bluffText: "No, it's a type of ray gun.", key: "Q9" },
    { q: "Does <code>&lt;h1&gt;</code> create the smallest heading?", isTrue: false, truthfulText: "No, <code>&lt;h1&gt;</code> is the largest. <code>&lt;h6&gt;</code> is smallest.", bluffText: "Yes, 1 is small.", key: "Q10" },
    { q: "Is Netlify a web host?", isTrue: true, truthfulText: "Yes, they host static sites.", bluffText: "No, it's a streaming service.", key: "Q11" },
    { q: "Does <code>opacity: 0</code> make an element invisible?", isTrue: true, truthfulText: "Yes, completely transparent.", bluffText: "No, it makes it black.", key: "Q12" }
];

// --- MILLIONAIRE DATA ---
const MILLIONAIRE_QUESTIONS = [
    { question: "What does HTML stand for?", answers: ["HyperText Markup Language", "High Tech Modern Language", "Hyperlink Text Mode", "Home Tool Markup Language"], correct: 0 },
    { question: "Which CSS property changes text color?", answers: ["font-color", "text-color", "color", "style"], correct: 2 },
    { question: "Which tag is used for the largest heading?", answers: ["<code>&lt;head&gt;</code>", "<code>&lt;h6&gt;</code>", "<code>&lt;header&gt;</code>", "<code>&lt;h1&gt;</code>"], correct: 3 },
    { question: "What is the correct tag for an unordered list?", answers: ["<code>&lt;ol&gt;</code>", "<code>&lt;ul&gt;</code>", "<code>&lt;li&gt;</code>", "<code>&lt;list&gt;</code>"], correct: 1 },
    { question: "Which attribute adds a link destination?", answers: ["<code>src</code>", "<code>link</code>", "<code>href</code>", "<code>dest</code>"], correct: 2 },
    { question: "How do you select an element with id='demo' in CSS?", answers: ["<code>.demo</code>", "<code>#demo</code>", "<code>demo</code>", "<code>*demo</code>"], correct: 1 },
    { question: "Which property controls space *inside* a border?", answers: ["<code>margin</code>", "<code>padding</code>", "<code>spacing</code>", "<code>gutter</code>"], correct: 1 },
    { question: "What is the correct syntax for a JS function?", answers: ["<code>function myFunction()</code>", "<code>def myFunction()</code>", "<code>func myFunction()</code>", "<code>function:myFunction()</code>"], correct: 0 },
    { question: "How do you write 'Hello World' in an alert box?", answers: ["<code>msg('Hello World')</code>", "<code>alert('Hello World')</code>", "<code>msgBox('Hello World')</code>", "<code>alertBox('Hello World')</code>"], correct: 1 },
    { question: "Which Git command saves changes locally?", answers: ["<code>git push</code>", "<code>git save</code>", "<code>git commit</code>", "<code>git upload</code>"], correct: 2 },
    { question: "What does CSS stand for?", answers: ["Colorful Style Sheets", "Computer Style Sheets", "Creative Style Sheets", "Cascading Style Sheets"], correct: 3 },
    { question: "Which HTML tag is used to display an image?", answers: ["<code>&lt;img&gt;</code>", "<code>&lt;image&gt;</code>", "<code>&lt;pic&gt;</code>", "<code>&lt;src&gt;</code>"], correct: 0 },
    { question: "What is the correct way to link an external CSS file?", answers: ["<code>&lt;style src='style.css'&gt;</code>", "<code>&lt;link rel='stylesheet' href='style.css'&gt;</code>", "<code>&lt;stylesheet&gt;style.css&lt;/stylesheet&gt;</code>", "<code>&lt;css&gt;style.css&lt;/css&gt;</code>"], correct: 1 },
    { question: "Which JS keyword creates a constant variable?", answers: ["<code>var</code>", "<code>let</code>", "<code>const</code>", "<code>fix</code>"], correct: 2 },
    { question: "Which company owns GitHub?", answers: ["Google", "Facebook", "Microsoft", "Apple"], correct: 2 }
];

// --- WORD GAMES VOCAB ---
const WORD_GAME_VOCAB = [
    // Ch 1-5 Foundations
    { word: "PERSONA", clue: "Fictional character representing a target user" },
    { word: "WIREFRAME", clue: "Skeletal blueprint of a website layout" },
    { word: "ACCESSIBILITY", clue: "Designing for people with disabilities (a11y)" },
    { word: "COPYRIGHT", clue: "Legal right protecting creative work" },
    { word: "SEO", clue: "Search Engine Optimization" },
    
    // Ch 6-9 HTML/CSS
    { word: "HTML", clue: "HyperText Markup Language" },
    { word: "CSS", clue: "Cascading Style Sheets" },
    { word: "FLEXBOX", clue: "1-dimensional CSS layout model" },
    { word: "GRID", clue: "2-dimensional CSS layout model" },
    { word: "RESPONSIVE", clue: "Design that adapts to screen size" },
    { word: "MARGIN", clue: "Space outside the border" },
    { word: "PADDING", clue: "Space inside the border" },
    { word: "IFRAME", clue: "Tag to embed another document (like video) in a page" },
    { word: "SVG", clue: "Scalable Vector Graphics image format" },

    // Ch 10-11 JS
    { word: "API", clue: "Application Programming Interface for software communication" },
    { word: "ARRAY", clue: "Variable holding a list of items" },
    { word: "BOOLEAN", clue: "Data type: True or False" },
    { word: "CONSOLE", clue: "Tool in Developer Tools that shows errors and logs" },
    { word: "DOM", clue: "Document Object Model tree structure" },
    { word: "EVENT", clue: "User action (like click) that JS can listen for" },
    { word: "FUNCTION", clue: "Named, re-usable block of code" },
    { word: "JSON", clue: "Data format often used to exchange data with a server" },
    { word: "LOOP", clue: "Repeats code multiple times" },
    { word: "OBJECT", clue: "Variable holding a collection of key:value pairs" },
    { word: "VARIABLE", clue: "Container for storing data values" },

    // Ch 12-17 Workflow
    { word: "DEPLOYMENT", clue: "Process of uploading your site to a live server" },
    { word: "GIT", clue: "Version control system for tracking changes" },
    { word: "GITHUB", clue: "Cloud platform for hosting Git repositories" },
    { word: "HOST", clue: "Company you rent server space from to make your site live" },
    { word: "PORTFOLIO", clue: "Collection of best work shown to employers" }
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

const mappedMillionaire = MILLIONAIRE_QUESTIONS.map(item => ({
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
    chapterTitle: "Web Design 2: Ultimate Review",
    jeopardyData: mappedJeopardy,
    hollywoodData: mappedHollywood,
    millionaireData: mappedMillionaire,
    vocabList: WORD_GAME_VOCAB
};