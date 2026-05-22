/**
 * YEAR 2 ULTIMATE REVIEW (Chapters 12-18)
 * POOL: 7 Categories (105 Items Total)
 * Each level (100-500) has 3 unique variations for randomization.
 * Categories formatted for professional display (no Chapter numbers).
 * JEOPARDY LOGIC: Randomly selects 5 of 7 categories per session.
 */
(async function() {
    const firebaseConfig = {
        apiKey: "AIzaSyAK1sGWu6jyWzbxfQCj-cgUBn85mJh9Nv0",
        authDomain: "digitalartsclasses-games-67ae7.firebaseapp.com",
        projectId: "digitalartsclasses-games-67ae7",
        storageBucket: "digitalartsclasses-games-67ae7.firebasestorage.app",
        messagingSenderId: "662051088920",
        appId: "1:662051088920:web:3b05cb890d834c0b9cb16d",
        measurementId: "G-LZ4CXH6X3G"
    };

    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
    const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
    const { getFirestore, collection, addDoc, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    window.migrationPool = window.migrationPool || []; window.migrationPool.push(...[
        // ==========================================
        // CHAPTER 12: Game Development
        // ==========================================
        { cat: "Game Development", val: 100, q: "The core cycle that runs update logic and visual drawing 60 times a second.", a: "Game Loop", d: ["Event Loop", "Logic Cycle", "Refresh Loop"] },
        { cat: "Game Development", val: 100, q: "The browser API used to run smooth animations efficiently without lag.", a: "requestAnimationFrame", d: ["setInterval", "setTimeout", "animate()"] },
        { cat: "Game Development", val: 100, q: "The standard number of frames per second for smooth web movement.", a: "60 FPS", d: ["30 FPS", "24 FPS", "120 FPS"] },
        
        { cat: "Game Development", val: 200, q: "The difference in time between the current frame and the last frame.", a: "Delta Time", d: ["Lag Factor", "Buffer Rate", "FPS Gap"] },
        { cat: "Game Development", val: 200, q: "Using delta time ensures that the game speed is independent of this.", a: "Framerate", d: ["Resolution", "Input Lag", "CPU Speed"] },
        { cat: "Game Development", val: 200, q: "A loop that never stops running until the game is closed.", a: "Infinite Loop", d: ["Finite Loop", "Logic Cycle", "Render Path"] },

        { cat: "Game Development", val: 300, q: "The simplest collision check method using non-rotated rectangles.", a: "AABB", d: ["Raycast", "Vector Check", "Sphere Test"] },
        { cat: "Game Development", val: 300, q: "The technique of detecting when two game objects overlap or touch.", a: "Collision Detection", d: ["Input Mapping", "State Checking", "Rendering"] },
        { cat: "Game Development", val: 300, q: "The 'Draw' step in a game loop specifically handles this visual process.", a: "Rendering", d: ["Logic", "Collision", "Input"] },

        { cat: "Game Development", val: 400, q: "A mathematical object used in physics containing both X and Y values.", a: "Vector", d: ["Matrix", "Array", "Enum"] },
        { cat: "Game Development", val: 400, q: "The simulated force that pulls objects downward on the screen.", a: "Gravity", d: ["Mass", "Weight", "Momentum"] },
        { cat: "Game Development", val: 400, q: "The 'invisible' area around a character that triggers a collision.", a: "Hitbox", d: ["Hurtbox", "Spritebox", "Collision Shell"] },

        { cat: "Game Development", val: 500, q: "Predicting where an object will be in the next frame to prevent visual jumps.", a: "Interpolation", d: ["Extrapolation", "Smoothing", "Collision"] },
        { cat: "Game Development", val: 500, q: "Term for when logic calculations fall behind the visual frame rate.", a: "Lag", d: ["Buffering", "Latency", "Ping"] },
        { cat: "Game Development", val: 500, q: "Handling complex game logic in a separate background thread.", a: "Web Worker", d: ["Service Worker", "API Request", "Canvas Context"] },

        // ==========================================
        // CHAPTER 13: The Cloud (Tools)
        // ==========================================
        { cat: "The Cloud", val: 100, q: "The version control software used for tracking history and code changes.", a: "Git", d: ["GitHub", "Subversion", "CloudDrive"] },
        { cat: "The Cloud", val: 100, q: "A folder where a project lives that contains its entire history.", a: "Repository", d: ["Registry", "Package", "Directory"] },
        { cat: "The Cloud", val: 100, q: "The text-based way to talk to your computer's operating system directly.", a: "CLI", d: ["GUI", "API", "URL"] },

        { cat: "The Cloud", val: 200, q: "A Git command that saves a permanent 'snapshot' of changes locally.", a: "Commit", d: ["Save", "Push", "Upload"] },
        { cat: "The Cloud", val: 200, q: "The Git command used to check which files are ready to be committed.", a: "Git Status", d: ["Git Check", "Git Log", "Git List"] },
        { cat: "The Cloud", val: 200, q: "The specialized terminal for running Git commands on Windows.", a: "Git Bash", d: ["Git Prompt", "Command Prompt", "PowerShell"] },

        { cat: "The Cloud", val: 300, q: "Separate path of development for testing features without breaking main code.", a: "Branching", d: ["Forking", "Cloning", "Staging"] },
        { cat: "The Cloud", val: 300, q: "The action of combining changes from one branch into another.", a: "Merge", d: ["Commit", "Sync", "Pull"] },
        { cat: "The Cloud", val: 300, q: "The process of copying your local repository to a remote cloud server.", a: "Pushing", d: ["Pulling", "Cloning", "Fetching"] },

        { cat: "The Cloud", val: 400, q: "An error occurring when two people change the same line of code simultaneously.", a: "Merge Conflict", d: ["Syntax Error", "Logic Bug", "Deployment Fail"] },
        { cat: "The Cloud", val: 400, q: "The Git command showing the chronological history of all saves.", a: "Git Log", d: ["Git Timeline", "Git History", "Git Record"] },
        { cat: "The Cloud", val: 400, q: "The Git command used to download the latest code from the cloud hub.", a: "Pulling", d: ["Pushing", "Commiting", "Staging"] },

        { cat: "The Cloud", val: 500, q: "Cloud service used for hosting and automating front-end deployments.", a: "Netlify", d: ["GoDaddy", "Wi-Fi", "Spotify"] },
        { cat: "The Cloud", val: 500, q: "The file used to tell Git which items to intentionally never track.", a: ".gitignore", d: ["README.md", "config.json", "package.json"] },
        { cat: "The Cloud", val: 500, q: "The AI tool by GitHub that suggests whole lines of code in your editor.", a: "GitHub Copilot", d: ["GitHub Pilot", "AI Coder", "CodeGPT"] },

        // ==========================================
        // CHAPTER 14: Management Systems (CMS)
        // ==========================================
        { cat: "Management Systems", val: 100, q: "Software that allows users to manage content without writing code.", a: "CMS", d: ["SaaS", "API", "IDE"] },
        { cat: "Management Systems", val: 100, q: "The most popular open-source content management system in the world.", a: "WordPress", d: ["Wix", "Shopify", "Joomla"] },
        { cat: "Management Systems", val: 100, q: "A CMS requires this type of storage for text, accounts, and settings.", a: "Database", d: ["Floppy Disk", "PDF File", "Memory Card"] },

        { cat: "Management Systems", val: 200, q: "Small add-ons that extend the core features and logic of a CMS.", a: "Plugins", d: ["Widgets", "Themes", "Snippets"] },
        { cat: "Management Systems", val: 200, q: "The admin dashboard where you manage the site's back-end content.", a: "Dashboard", d: ["Front-End", "Footer", "Root Folder"] },
        { cat: "Management Systems", val: 200, q: "The name of the modern WordPress block-based editor.", a: "Gutenberg", d: ["Classic Editor", "TinyMCE", "Elementor"] },

        { cat: "Management Systems", val: 300, q: "Software whose source code is public and free for anyone to modify.", a: "Open Source", d: ["Proprietary", "Encrypted", "Closed Source"] },
        { cat: "Management Systems", val: 300, q: "The main programming language used to build the WordPress software.", a: "PHP", d: ["Python", "Java", "C++"] },
        { cat: "Management Systems", val: 300, q: "The taxonomy used for broad grouping of related CMS posts.", a: "Category", d: ["Tag", "Slug", "Widget"] },

        { cat: "Management Systems", val: 400, q: "A system with a back-end but no built-in front-end templates.", a: "Headless CMS", d: ["Ghost CMS", "Legacy CMS", "Static Generator"] },
        { cat: "Management Systems", val: 400, q: "The standard relational database used by WordPress and others.", a: "MySQL", d: ["MongoDB", "Excel", "Firebase"] },
        { cat: "Management Systems", val: 400, q: "Running a CMS on your own private or rented server hardware.", a: "Self-Hosted", d: ["Cloud-Hosted", "SaaS", "Localhost"] },

        { cat: "Management Systems", val: 500, q: "A CMS theme that inherits styles from another for safe customization.", a: "Child Theme", d: ["Sub-skin", "Parent Clone", "Baby Theme"] },
        { cat: "Management Systems", val: 500, q: "The static, permanent URL assigned to a specific web page.", a: "Permalink", d: ["Temp-link", "Redirect", "Subdomain"] },
        { cat: "Management Systems", val: 500, q: "Updating a CMS regularly is primarily vital for this reason.", a: "Security", d: ["New Logos", "Lower Costs", "Better Fonts"] },

        // ==========================================
        // CHAPTER 15: APIs & Networking
        // ==========================================
        { cat: "APIs & Networking", val: 100, q: "The 'Waiter' analogy for two pieces of software talking together.", a: "API", d: ["UI", "DNS", "CDN"] },
        { cat: "APIs & Networking", val: 100, q: "The standard HTTP method used to retrieve or 'read' data.", a: "GET", d: ["POST", "PUT", "DELETE"] },
        { cat: "APIs & Networking", val: 100, q: "The specific URL address where an API listens for a request.", a: "Endpoint", d: ["Payload", "Header", "Method"] },

        { cat: "APIs & Networking", val: 200, q: "A JS object representing the eventual completion of a network task.", a: "Promise", d: ["Callback", "Variable", "Loop"] },
        { cat: "APIs & Networking", val: 200, q: "The standard lightweight format for data exchanged with an API.", a: "JSON", d: ["XML", "HTML", "SQL"] },
        { cat: "APIs & Networking", val: 200, q: "The HTTP method used to send brand new data to a server.", a: "POST", d: ["GET", "PATCH", "FETCH"] },

        { cat: "APIs & Networking", val: 300, q: "Pausing an asynchronous function until a network task finishes.", a: "await", d: ["halt", "wait", "yield"] },
        { cat: "APIs & Networking", val: 300, q: "The instruction manual for how to correctly use a specific API.", a: "Documentation", d: ["Reference", "Codebook", "Script"] },
        { cat: "APIs & Networking", val: 300, q: "Acronym for a pre-written Software Development Kit.", a: "SDK", d: ["System Data Key", "Standard Design Kit", "Logic Key"] },

        { cat: "APIs & Networking", val: 400, q: "The standard architectural style for modern web-based APIs.", a: "REST", d: ["SOAP", "GraphQL", "RPC"] },
        { cat: "APIs & Networking", val: 400, q: "The HTTP method used to update or replace existing data.", a: "PUT", d: ["GET", "HEAD", "OPEN"] },
        { cat: "APIs & Networking", val: 400, q: "JSON objects are surrounded by these specific characters.", a: "Curly braces {}", d: ["Brackets []", "Quotes", "Slashes"] },

        { cat: "APIs & Networking", val: 500, q: "The status code that literally means 'I am a teapot'.", a: "418", d: ["404", "500", "200"] },
        { cat: "APIs & Networking", val: 500, q: "Limiting how many requests a specific user can make to an API.", a: "Rate Limiting", d: ["Throttling", "Bandwidth", "Latency"] },
        { cat: "APIs & Networking", val: 500, q: "An older API protocol that uses XML exclusively for data.", a: "SOAP", d: ["REST", "GraphQL", "JSON"] },

        // ==========================================
        // CHAPTER 16: Database Brain
        // ==========================================
        { cat: "Database Brain", val: 100, q: "The standard language used to manage relational databases.", a: "SQL", d: ["PHP", "JSON", "NoSQL"] },
        { cat: "Database Brain", val: 100, q: "A single piece of information in a row, also known as a column.", a: "Field", d: ["Record", "Table", "Query"] },
        { cat: "Database Brain", val: 100, q: "Acronym for basic database actions: Create, Read, Update, Delete.", a: "CRUD", d: ["ACID", "BASE", "SQL"] },

        { cat: "Database Brain", val: 200, q: "A unique identifier for every single record in a table.", a: "Primary Key", d: ["Foreign Key", "Master Key", "ID Tag"] },
        { cat: "Database Brain", val: 200, q: "A field in one table that links to the primary ID of another table.", a: "Foreign Key", d: ["Primary Key", "Secret Key", "Logic Key"] },
        { cat: "Database Brain", val: 200, q: "A complete set of fields for one specific item in a table.", a: "Record", d: ["Field", "Schema", "Constraint"] },

        { cat: "Database Brain", val: 300, q: "The structural blueprint or formal layout of a database system.", a: "Schema", d: ["Framework", "Template", "Draft"] },
        { cat: "Database Brain", val: 300, q: "A type of database that organizes data into related tables.", a: "Relational", d: ["Flat-file", "Graph", "NoSQL"] },
        { cat: "Database Brain", val: 300, q: "A special marker used in SQL to indicate missing or empty data.", a: "NULL", d: ["VOID", "ZERO", "EMPTY"] },

        { cat: "Database Brain", val: 400, q: "The process of organizing tables to reduce data redundancy.", a: "Normalization", d: ["Optimization", "Standardization", "Encryption"] },
        { cat: "Database Brain", val: 400, q: "Ensuring that database data remains accurate and consistent.", a: "Data Integrity", d: ["Data Security", "Data Privacy", "Scaling"] },
        { cat: "Database Brain", val: 400, q: "Non-relational databases often used for real-time big data apps.", a: "NoSQL", d: ["NewSQL", "AntiSQL", "PostSQL"] },

        { cat: "Database Brain", val: 500, q: "Scaling a database by adding more power to a single existing server.", a: "Vertical Scaling", d: ["Horizontal Scaling", "Lateral Scaling", "Node Scaling"] },
        { cat: "Database Brain", val: 500, q: "Scaling a database by adding more server nodes to a network.", a: "Horizontal Scaling", d: ["Vertical Scaling", "Linear Scaling", "Up-Scaling"] },
        { cat: "Database Brain", val: 500, q: "Searchable pointers created to significantly speed up queries.", a: "Indexes", d: ["Primary Keys", "Foreign Keys", "Tables"] },

        // ==========================================
        // CHAPTER 17: Future Technology
        // ==========================================
        { cat: "Future Technology", val: 100, q: "Technology that overlays digital elements onto a live view of the real world.", a: "AR", d: ["VR", "AI", "IoT"] },
        { cat: "Future Technology", val: 100, q: "Broad concept of machines acting smartly or simulating human intelligence.", a: "AI", d: ["ML", "Wasm", "API"] },
        { cat: "Future Technology", val: 100, q: "A network of physical hardware devices connected to the internet.", a: "IoT", d: ["Web 3.0", "SPA", "CDN"] },

        { cat: "Future Technology", val: 200, q: "Subset of AI where systems improve based on exposure to data.", a: "Machine Learning", d: ["Pattern Sync", "Logic Flow", "Deep Data"] },
        { cat: "Future Technology", val: 200, q: "Communication through physical touch or vibration on a device.", a: "Haptic Feedback", d: ["Audio Feedback", "Visual Feedback", "Tactile Sync"] },
        { cat: "Future Technology", val: 200, q: "AI logic used to filter spam emails or recognize human faces.", a: "Pattern Recognition", d: ["Data Sorting", "Random Gen", "Logic Flow"] },

        { cat: "Future Technology", val: 300, q: "Technology that completely immerses the user in a digital environment.", a: "VR", d: ["AR", "Mixed Reality", "Spatial Audio"] },
        { cat: "Future Technology", val: 300, q: "AI focused specifically on understanding and processing human speech.", a: "NLP", d: ["GUI", "SSL", "CDN"] },
        { cat: "Future Technology", val: 300, q: "Interfaces designed for devices without traditional screens.", a: "Headless UI", d: ["Graphic UI", "Visual UI", "Static UI"] },

        { cat: "Future Technology", val: 400, q: "AI systems that can create original images, text, or music.", a: "Generative AI", d: ["Predictive AI", "Static AI", "Logic AI"] },
        { cat: "Future Technology", val: 400, q: "Binary code format allowing high-performance apps to run in the browser.", a: "WebAssembly", d: ["JSON", "SPA", "MPA"] },
        { cat: "Future Technology", val: 400, q: "The tech category including smartwatches and fitness trackers.", a: "Wearable Tech", d: ["Smart Home", "Industrial IoT", "Smart City"] },

        { cat: "Future Technology", val: 500, q: "Processing data closer to the device rather than the cloud.", a: "Edge Computing", d: ["Core Computing", "Remote Hosting", "Node Scaling"] },
        { cat: "Future Technology", val: 500, q: "Next era of the web focused on decentralization and blockchain.", a: "Web 3.0", d: ["Web 2.0", "Web 1.0", "AI Web"] },
        { cat: "Future Technology", val: 500, q: "AI generating image descriptions automatically for the blind.", a: "Automated A11y", d: ["SEO Boost", "Image Search", "Voice Link"] },

        // ==========================================
        // CHAPTER 18: The Launch
        // ==========================================
        { cat: "The Launch", val: 100, q: "The process of moving your website files from local to a live server.", a: "Deployment", d: ["Drafting", "Debugging", "Hosting"] },
        { cat: "The Launch", val: 100, q: "The live version of a site being used by actual public visitors.", a: "Production", d: ["Staging", "Localhost", "Alpha"] },
        { cat: "The Launch", val: 100, q: "The standard required filename for a website's homepage.", a: "index.html", d: ["home.html", "start.html", "main.html"] },

        { cat: "The Launch", val: 200, q: "A private test environment used for final quality checks.", a: "Staging", d: ["Production", "Localhost", "Backup"] },
        { cat: "The Launch", val: 200, q: "HTTP status code indicating a page or resource was not found.", a: "404", d: ["200", "500", "301"] },
        { cat: "The Launch", val: 200, q: "Removing extra spaces from code to reduce the total file size.", a: "Minification", d: ["Compression", "Encryption", "Parsing"] },

        { cat: "The Launch", val: 300, q: "Google's primary tool for testing site performance and speed.", a: "Lighthouse", d: ["Photoshop", "Notepad", "Search Console"] },
        { cat: "The Launch", val: 300, q: "The percentage of time a server is running without crashing.", a: "Uptime", d: ["Downtime", "Latency", "Bandwidth"] },
        { cat: "The Launch", val: 300, q: "Storing website files on a user's computer for faster future loads.", a: "Caching", d: ["Backing up", "Logging", "Minifying"] },

        { cat: "The Launch", val: 400, q: "The secure protocol required for all modern websites (padlock icon).", a: "HTTPS", d: ["HTTP", "FTP", "DNS"] },
        { cat: "The Launch", val: 400, q: "A digital document proving a site is secure and encrypts data.", a: "SSL Certificate", d: ["HTML Diploma", "CSS License", "JS Badge"] },
        { cat: "The Launch", val: 400, q: "The acronym for the 'top-level' part of a domain like .com.", a: "TLD", d: ["URL", "DNS", "ISP"] },

        { cat: "The Launch", val: 500, q: "Automatically updating the live site when code is pushed to Git.", a: "Continuous Deployment", d: ["Manual Upload", "Cloud Storage", "Syncing"] },
        { cat: "The Launch", val: 500, q: "A quick fix applied to a live site to repair a critical bug.", a: "Hotfix", d: ["Rollback", "Update", "Feature"] },
        { cat: "The Launch", val: 500, q: "A global network of servers hosting site assets closer to users.", a: "CDN", d: ["DNS", "ISP", "LAN"] }
    ]);
    
})();