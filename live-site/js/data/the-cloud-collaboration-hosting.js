/**
 * CHAPTER 11: THE CLOUD (Professional Tools)
 * MASTER MIGRATION FILE - UNIFIED DATA BANK
 * 75 Items Total (5 Categories x 5 Levels x 3 Variations)
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
        // --- CATEGORY: VERSION CONTROL ---
        { cat: "Version Control", val: 100, q: "The version control software created by Linus Torvalds for tracking code changes.", a: "Git", d: ["GitHub", "Subversion", "CloudDrive"] },
        { cat: "Version Control", val: 100, q: "A folder where a project lives that also contains the entire history of its changes.", a: "Repository", d: ["Directory", "Registry", "Package"] },
        { cat: "Version Control", val: 100, q: "The text-based way to talk to your computer's operating system directly to run commands.", a: "CLI", d: ["GUI", "API", "URL"] },

        { cat: "Version Control", val: 200, q: "A Git command that creates a permanent 'snapshot' of your changes on your local machine.", a: "Commit", d: ["Save", "Push", "Upload"] },
        { cat: "Version Control", val: 200, q: "The Git command used to check which files have been modified and are ready for a commit.", a: "Git Status", d: ["Git Check", "Git Log", "Git List"] },
        { cat: "Version Control", val: 200, q: "The specialized terminal that allows Windows users to run Git commands like a Mac or Linux user.", a: "Git Bash", d: ["Git Prompt", "Command Prompt", "PowerShell"] },

        { cat: "Version Control", val: 300, q: "Creating a separate path for development so multiple people can work on one project without overlap.", a: "Branching", d: ["Forking", "Cloning", "Staging"] },
        { cat: "Version Control", val: 300, q: "The action of combining changes from one development branch back into another.", a: "Merge", d: ["Commit", "Sync", "Pull"] },
        { cat: "Version Control", val: 300, q: "The process of copying a repository from a local machine to a remote cloud server.", a: "Pushing", d: ["Pulling", "Cloning", "Fetching"] },

        { cat: "Version Control", val: 400, q: "An error that occurs when two people change the same line of code and Git doesn't know which to keep.", a: "Merge Conflict", d: ["Syntax Error", "Logic Bug", "Deployment Fail"] },
        { cat: "Version Control", val: 400, q: "The Git command that shows a chronological timeline of all previous commits made to a project.", a: "Git Log", d: ["Git Timeline", "Git History", "Git Record"] },
        { cat: "Version Control", val: 400, q: "The Git command used to download the latest code from a cloud hub to your local computer.", a: "Pulling", d: ["Pushing", "Commiting", "Staging"] },

        { cat: "Version Control", val: 500, q: "The AI tool by GitHub that suggests whole lines of code as you type in your editor.", a: "GitHub Copilot", d: ["GitHub Pilot", "AI Coder", "CodeGPT"] },
        { cat: "Version Control", val: 500, q: "The file used to specify which files or folders Git should intentionally skip and never track.", a: ".gitignore", d: ["README.md", "config.json", "package.json"] },
        { cat: "Version Control", val: 500, q: "The Git command used to initialize a brand new, empty repository in a local folder.", a: "Git Init", d: ["Git Start", "Git New", "Git Create"] },

        // --- CATEGORY: CLOUD PLATFORMS ---
        { cat: "Cloud Platforms", val: 100, q: "The specific cloud service used for hosting and automating modern front-end web projects.", a: "Netlify", d: ["Wordpress", "GoDaddy", "Wi-Fi"] },
        { cat: "Cloud Platforms", val: 100, q: "The hosting service that allows you to store your Git repositories in the cloud.", a: "GitHub", d: ["Git", "GitLab", "Dropbox"] },
        { cat: "Cloud Platforms", val: 100, q: "A cloud platform owned by Google that provides hosting, databases, and authentication.", a: "Firebase", d: ["Amazon Web Services", "Microsoft Azure", "Adobe Cloud"] },

        { cat: "Cloud Platforms", val: 200, q: "Renting computer power and storage from a remote provider over the internet.", a: "Cloud Computing", d: ["Local Computing", "Grid Computing", "Satellite Hosting"] },
        { cat: "Cloud Platforms", val: 200, q: "A way to copy someone else's repository directly into your own cloud account to experiment.", a: "Forking", d: ["Cloning", "Branching", "Merging"] },
        { cat: "Cloud Platforms", val: 200, q: "An exact copy of a remote repository downloaded to your local hard drive for editing.", a: "Clone", d: ["Fork", "Branch", "Commit"] },

        { cat: "Cloud Platforms", val: 300, q: "Software whose source code is public, free to read, and open for anyone to contribute to.", a: "Open Source", d: ["Closed Source", "Proprietary", "Free Ware"] },
        { cat: "Cloud Platforms", val: 300, q: "A cloud platform similar to Netlify that is highly popular for hosting Next.js projects.", a: "Vercel", d: ["Heroku", "DigitalOcean", "Shopify"] },
        { cat: "Cloud Platforms", val: 300, q: "The cloud platform that supports back-end apps in languages like Node.js, Python, and Ruby.", a: "Heroku", d: ["Wix", "Squarespace", "Netlify"] },

        { cat: "Cloud Platforms", val: 400, q: "The largest and most widely used cloud infrastructure provider in the world (Amazon).", a: "AWS", d: ["Azure", "GCP", "IBM Cloud"] },
        { cat: "Cloud Platforms", val: 400, q: "A repository that is visible to every single person on the internet.", a: "Public Repository", d: ["Private Repository", "Secret Folder", "Local Repo"] },
        { cat: "Cloud Platforms", val: 400, q: "The service that allows you to host static sites for free directly from a GitHub repo.", a: "GitHub Pages", d: ["GitHub Sites", "Git Hosting", "StaticHub"] },

        { cat: "Cloud Platforms", val: 500, q: "A CMS that provides data via an API, allowing any front-end to be built to display it.", a: "Headless CMS", d: ["Traditional CMS", "Ghost CMS", "Static Generator"] },
        { cat: "Cloud Platforms", val: 500, q: "The process of moving your code from a local machine to a live public cloud server.", a: "Deployment", d: ["Development", "Designing", "Debugging"] },
        { cat: "Cloud Platforms", val: 500, q: "The automatic updating of your live site the moment you push new code to a cloud repo.", a: "Continuous Deployment", d: ["Manual Upload", "FTP Sync", "Local Testing"] },

        // --- CATEGORY: HOSTING & ENVIRONMENTS ---
        { cat: "Hosting & Environments", val: 100, q: "A live server managed by a provider rather than hardware under your own desk.", a: "The Cloud", d: ["Intranet", "Mainframe", "The Grid"] },
        { cat: "Hosting & Environments", val: 100, q: "The live, 'real world' version of the website being used by actual visitors.", a: "Production", d: ["Staging", "Localhost", "Draft"] },
        { cat: "Hosting & Environments", val: 100, q: "The internal address used to test websites on your own computer before going online.", a: "Localhost", d: ["Remotehost", "Public IP", "Global Server"] },

        { cat: "Hosting & Environments", val: 200, q: "A private test environment that looks like the real site, used for final quality checks.", a: "Staging", d: ["Development", "Production", "Backup"] },
        { cat: "Hosting & Environments", val: 200, q: "The percentage measurement of how long a server has been running without crashing.", a: "Uptime", d: ["Downtime", "Latency", "Bandwidth"] },
        { cat: "Hosting & Environments", val: 200, q: "The numerical IP address used to access your own computer (Localhost).", a: "127.0.0.1", d: ["192.168.1.1", "8.8.8.8", "0.0.0.0"] },

        { cat: "Hosting & Environments", val: 300, q: "The cheapest hosting where you share a physical server with hundreds of other sites.", a: "Shared Hosting", d: ["Dedicated Hosting", "VPS Hosting", "Cloud Hosting"] },
        { cat: "Hosting & Environments", val: 300, q: "A professional role that bridges the gap between coding and server management.", a: "DevOps", d: ["UX Designer", "Front-End Dev", "Data Scientist"] },
        { cat: "Hosting & Environments", val: 300, q: "The standard 'instruction manual' file that appears on the homepage of a GitHub project.", a: "README.md", d: ["INDEX.html", "STYLE.css", "INFO.txt"] },

        { cat: "Hosting & Environments", val: 400, q: "A virtual server that acts like a private machine but is physically shared with others.", a: "VPS", d: ["Shared", "Dedicated", "Managed"] },
        { cat: "Hosting & Environments", val: 400, q: "The process of purchasing and renewing a website address for a set period.", a: "Domain Registration", d: ["Web Hosting", "SSL Purchase", "DNS Mapping"] },
        { cat: "Hosting & Environments", val: 400, q: "A service that hides your personal contact info from the public WHOIS database.", a: "Domain Privacy", d: ["IP Masking", "SSL Certificate", "VPN"] },

        { cat: "Hosting & Environments", val: 500, q: "Renting an entire physical server that is used by only one single customer.", a: "Dedicated Hosting", d: ["Shared Hosting", "VPS", "Co-location"] },
        { cat: "Hosting & Environments", val: 500, q: "The specific local IP address of your router, often used to access settings.", a: "192.168.1.1", d: ["127.0.0.1", "10.0.0.1", "255.255.255.0"] },
        { cat: "Hosting & Environments", val: 500, q: "A server that is optimized for high-performance and scalability using multiple nodes.", a: "Cluster", d: ["Mainframe", "Relay", "Beacon"] },

        // --- CATEGORY: PROTOCOLS & NETWORKING ---
        { cat: "Protocols & Networking", val: 100, q: "The standard (legacy) protocol used to transfer files to a web server.", a: "FTP", d: ["HTTP", "SMTP", "DNS"] },
        { cat: "Protocols & Networking", val: 100, q: "The secure version of HTTP that encrypts data sent between browser and server.", a: "HTTPS", d: ["FTP", "SSL", "TCP"] },
        { cat: "Protocols & Networking", val: 100, q: "What the 'IP' in IP Address stands for.", a: "Internet Protocol", d: ["Internal Pattern", "Input Path", "Interface Port"] },

        { cat: "Protocols & Networking", val: 200, q: "The system that functions like the internet's phonebook, translating names to IPs.", a: "DNS", d: ["DHCP", "URL", "ISP"] },
        { cat: "Protocols & Networking", val: 200, q: "The secure certificate that provides the 'S' in HTTPS.", a: "SSL", d: ["SSH", "SFTP", "RSA"] },
        { cat: "Protocols & Networking", val: 200, q: "The secure way to log into and run commands on a remote server.", a: "SSH", d: ["Telnet", "FTP", "RDP"] },

        { cat: "Protocols & Networking", val: 300, q: "The delay in time it takes for data to travel across a network from client to server.", a: "Latency", d: ["Bandwidth", "Throughput", "Downtime"] },
        { cat: "Protocols & Networking", val: 300, q: "A secure file transfer method that uses the SSH protocol for encryption.", a: "SFTP", d: ["FTP", "HTTP", "AS2"] },
        { cat: "Protocols & Networking", val: 300, q: "A global network of servers that speeds up sites by serving assets from the closest node.", a: "CDN", d: ["DNS", "ISP", "LAN"] },

        { cat: "Protocols & Networking", val: 400, q: "The maximum volume of data that can be transferred across a connection at one time.", a: "Bandwidth", d: ["Latency", "Ping", "Frequency"] },
        { cat: "Protocols & Networking", val: 400, q: "A secure cryptographic file on your computer that proves your identity to a server.", a: "SSH Key", d: ["Passcode", "Token", "Cert"] },
        { cat: "Protocols & Networking", val: 400, q: "What the acronym 'CDN' stands for.", a: "Content Delivery Network", d: ["Coded Data Node", "Cloud Digital Network", "Central Data Node"] },

        { cat: "Protocols & Networking", val: 500, q: "The binary code format that allows high-performance apps to run natively in browsers.", a: "WebAssembly", d: ["JavaScript", "JSON", "Python"] },
        { cat: "Protocols & Networking", val: 500, q: "What the acronym 'DNS' stands for.", a: "Domain Name System", d: ["Data Network Service", "Digital Node Server", "Domain Navigation System"] },
        { cat: "Protocols & Networking", val: 500, q: "The latest version of the Internet Protocol which uses much longer addresses.", a: "IPv6", d: ["IPv4", "IPv5", "IP.next"] },

        // --- CATEGORY: PROFESSIONAL WORKFLOWS ---
        { cat: "Workflows", val: 100, q: "A simple text formatting language that uses symbols like # and * for styling.", a: "Markdown", d: ["HTML", "XML", "JSON"] },
        { cat: "Workflows", val: 100, q: "A professional code editor developed by Microsoft that runs on your local machine.", a: "VS Code", d: ["Sublime", "Notepad++", "Atom"] },
        { cat: "Workflows", val: 100, q: "The package manager for JavaScript used to install libraries and developer tools.", a: "NPM", d: ["PIP", "GEM", "YARN"] },

        { cat: "Workflows", val: 200, q: "A reusable UI building block used in modern frameworks like React.", a: "Component", d: ["Tag", "Script", "Module"] },
        { cat: "Workflows", val: 200, q: "A pre-written kit of code components used to build complex applications faster.", a: "Framework", d: ["Library", "Plugin", "Script"] },
        { cat: "Workflows", val: 200, q: "The app or interface used to run Command Line (CLI) instructions.", a: "Terminal", d: ["Console", "Desktop", "Editor"] },

        { cat: "Workflows", val: 300, q: "Software that anyone can inspect, modify, and enhance legally.", a: "Open Source", d: ["Private Source", "Encrypted", "Secret"] },
        { cat: "Workflows", val: 300, q: "A temporary digital 'pass' used to prove a user's identity during a secure session.", a: "Auth Token", d: ["Cookie", "Password", "Session ID"] },
        { cat: "Workflows", val: 300, q: "The process of finding and fixing errors or bugs in a program.", a: "Debugging", d: ["Designing", "Drafting", "Deploying"] },

        { cat: "Workflows", val: 400, q: "A low-fidelity visual blueprint that shows the layout of an app without design.", a: "Wireframe", d: ["Mockup", "Prototype", "Sketch"] },
        { cat: "Workflows", val: 400, q: "An interactive, clickable model of an app used for usability testing.", a: "Prototype", d: ["Wireframe", "Sitemap", "Style Guide"] },
        { cat: "Workflows", val: 400, q: "The 'D' in the CRUD acronym for database operations.", a: "Delete", d: ["Draft", "Deploy", "Download"] },

        { cat: "Workflows", val: 500, q: "A JavaScript block used to handle errors gracefully without crashing the entire script.", a: "Try / Catch", d: ["If / Else", "While Loop", "Switch Case"] },
        { cat: "Workflows", val: 500, q: "The modern JavaScript keyword used to pause execution until a Promise finishes.", a: "await", d: ["halt", "wait", "yield"] },
        { cat: "Workflows", val: 500, q: "A collection of your best work shown to potential employers to prove your skills.", a: "Portfolio", d: ["Resume", "Transcript", "Folder"] }
    ].map(item => ({ ...item, chapter: "Chapter 11", grade: "Web Design 2" })));
    
})();