/**
 * CHAPTER 16: THE FINAL BOSS (Deployment)
 * MASTER MIGRATION FILE - UNIFIED DATA BANK
 * 75 Items Total (5 Categories x 5 Levels x 3 Variations)
 */
window.migrationPool = window.migrationPool || []; window.migrationPool.push(...[
        // --- CATEGORY: BASICS & DOMAINS ---
        { cat: "Basics & Domains", val: 100, q: "The process of moving a website from a local testing environment to a live public server.", a: "Deployment", d: ["Development", "Debugging", "Designing"] },
        { cat: "Basics & Domains", val: 100, q: "The live, 'real world' version of a website being used by actual visitors.", a: "Production", d: ["Draft", "Staging", "Local"] },
        { cat: "Basics & Domains", val: 100, q: "The standard filename required for a website's homepage on most servers.", a: "index.html", d: ["home.html", "start.html", "main.html"] },

        { cat: "Basics & Domains", val: 200, q: "A private version of a site used for final testing before it goes live to the public.", a: "Staging", d: ["Production", "Root", "Beta"] },
        { cat: "Basics & Domains", val: 200, q: "A company, like GoDaddy or Namecheap, that sells and manages website names.", a: "Domain Registrar", d: ["Server Store", "HTML Shop", "Cloud Host"] },
        { cat: "Basics & Domains", val: 200, q: "The time it takes for DNS changes to update across all servers globally (up to 48 hours).", a: "Domain Propagation", d: ["Domain Hosting", "Site Syncing", "Server Refresh"] },

        { cat: "Basics & Domains", val: 300, q: "The acronym for the 'top-level' part of a domain, such as .com, .org, or .net.", a: "TLD", d: ["URL", "DNS", "ISP"] },
        { cat: "Basics & Domains", val: 300, q: "A domain extension like 'blog.site.com' where 'blog' is this part of the name.", a: "Subdomain", d: ["Pathname", "Protocol", "TLD"] },
        { cat: "Basics & Domains", val: 300, q: "A DNS record that acts as an 'alias' for another domain name.", a: "CNAME Record", d: ["A Record", "MX Record", "TXT Record"] },

        { cat: "Basics & Domains", val: 400, q: "A DNS record that maps a domain name directly to a specific numerical IP address.", a: "A Record", d: ["CNAME", "Pointer", "Alias"] },
        { cat: "Basics & Domains", val: 400, q: "A service that keeps your personal contact info out of the public WHOIS database.", a: "Domain Privacy", d: ["IP Masking", "SSL Protection", "Site Lock"] },
        { cat: "Basics & Domains", val: 400, q: "The internal address (127.0.0.1) used to test a site on your own machine.", a: "Localhost", d: ["Remotehost", "Public IP", "Subdomain"] },

        { cat: "Basics & Domains", val: 500, q: "In what year was the very first website launched by Tim Berners-Lee?", a: "1991", d: ["1989", "1995", "1985"] },
        { cat: "Basics & Domains", val: 500, q: "The process of manually transferring files to a server using a protocol like FTP.", a: "Manual Deployment", d: ["Continuous Deployment", "Auto-Sync", "Hotfixing"] },
        { cat: "Basics & Domains", val: 500, q: "A web app that loads one page and updates via JS instead of reloading the browser.", a: "SPA", d: ["MPA", "CMS", "RSS"] },

        // --- CATEGORY: SEO & METADATA ---
        { cat: "SEO & Metadata", val: 100, q: "The acronym for the process of improving a site's ranking on search engines.", a: "SEO", d: ["SEM", "PPC", "CMS"] },
        { cat: "SEO & Metadata", val: 100, q: "The HTML tag that provides descriptive information specifically for search engines.", a: "<meta>", d: ["<title>", "<link>", "<search>"] },
        { cat: "SEO & Metadata", val: 100, q: "Short text descriptions added to images to help search engines and screen readers.", a: "Alt Text", d: ["Hidden Text", "Sub-header", "Captions"] },

        { cat: "SEO & Metadata", val: 200, q: "The XML file that acts as a map to tell Google which pages of your site to crawl.", a: "sitemap.xml", d: ["robots.txt", "index.html", "config.json"] },
        { cat: "SEO & Metadata", val: 200, q: "The plain text file used to tell search bots which pages they are NOT allowed to visit.", a: "robots.txt", d: ["sitemap.xml", "private.html", "ignore.js"] },
        { cat: "SEO & Metadata", val: 200, q: "Meaningful HTML tags like <nav> and <header> that describe their content to bots.", a: "Semantic HTML", d: ["Valid HTML", "Structure Tags", "Metadata"] },

        { cat: "SEO & Metadata", val: 300, q: "This tag is considered the single most important on-page SEO element.", a: "Title Tag", d: ["Meta Tag", "Image Tag", "Footer Tag"] },
        { cat: "SEO & Metadata", val: 300, q: "Code added to a site to help search engines understand specific data like reviews or events.", a: "Schema Markup", d: ["CSS Grid", "Meta Description", "JSON-LD"] },
        { cat: "SEO & Metadata", val: 300, q: "The percentage of users who leave a site after viewing only one single page.", a: "Bounce Rate", d: ["Conversion Rate", "Exit Rate", "Session Speed"] },

        { cat: "SEO & Metadata", val: 400, q: "Links from other reputable websites that point back to your site to boost authority.", a: "Backlinks", d: ["Forwardlinks", "Internal links", "Meta links"] },
        { cat: "SEO & Metadata", val: 400, q: "Words or phrases that users type into search engines to find your content.", a: "Keywords", d: ["Meta names", "Tag labels", "Alt descriptions"] },
        { cat: "SEO & Metadata", val: 400, q: "A program used by search engines to scan and index the content of the web.", a: "Crawler / Spider", d: ["Browser", "Validator", "Uploader"] },

        { cat: "SEO & Metadata", val: 500, q: "Who is the co-author of the industry-standard bestseller 'The Art of SEO'?", a: "Eric Enge", d: ["Tim Berners-Lee", "Steve Jobs", "Bill Gates"] },
        { cat: "SEO & Metadata", val: 500, q: "The specific SEO practice of ensuring your site is listed in local maps and directories.", a: "Local SEO", d: ["Global SEO", "Technical SEO", "Organic SEO"] },
        { cat: "SEO & Metadata", val: 500, q: "The practice of using hidden text or repetitive keywords to trick search engines.", a: "Spamdexing", d: ["White Hat SEO", "Indexing", "Crawling"] },

        // --- CATEGORY: PERFORMANCE & SPEED ---
        { cat: "Performance & Speed", val: 100, q: "The process of removing all extra spaces and comments from code to make files smaller.", a: "Minification", d: ["Compression", "Encryption", "Deletion"] },
        { cat: "Performance & Speed", val: 100, q: "The metric describing how many seconds it takes for a website to fully load.", a: "Page Speed", d: ["Bandwidth", "Latency", "Uptime"] },
        { cat: "Performance & Speed", val: 100, q: "The tiny icon (usually 16x16 or 32x32) displayed in the browser tab.", a: "Favicon", d: ["Logo", "Thumbnail", "Avatar"] },

        { cat: "Performance & Speed", val: 200, q: "Google's primary tool for testing website performance and accessibility.", a: "Lighthouse", d: ["Photoshop", "Notepad", "Debugger"] },
        { cat: "Performance & Speed", val: 200, q: "Reducing the file size of images or code to save bandwidth and speed up loading.", a: "Compression", d: ["Minification", "Hiding", "Formatting"] },
        { cat: "Performance & Speed", val: 200, q: "The modern image format developed by Google that is best for web performance.", a: "WebP", d: ["PNG", "GIF", "TIFF"] },

        { cat: "Performance & Speed", val: 300, q: "Storing website files on a user's computer so they load faster on the next visit.", a: "Caching", d: ["Backing up", "Logging", "Minifying"] },
        { cat: "Performance & Speed", val: 300, q: "A method of file compression for text-based files like HTML, CSS, and JS.", a: "Gzip", d: ["Zip", "JPEG", "MP4"] },
        { cat: "Performance & Speed", val: 300, q: "The practice of loading images only when they become visible to the user.", a: "Lazy Loading", d: ["Active Loading", "Pre-loading", "Direct Loading"] },

        { cat: "Performance & Speed", val: 400, q: "The metric representing the time it takes for a server to send the first byte of data.", a: "TTFB", d: ["LCP", "CLS", "FID"] },
        { cat: "Performance & Speed", val: 400, q: "A Core Web Vital measuring how much the layout 'jumps around' during loading.", a: "CLS", d: ["LCP", "FID", "FCP"] },
        { cat: "Performance & Speed", val: 400, q: "A Core Web Vital measuring the time it takes for the largest element to appear.", a: "LCP", d: ["CLS", "FID", "TTFB"] },

        { cat: "Performance & Speed", val: 500, q: "The Core Web Vital measuring the delay between a user's click and the browser's response.", a: "FID", d: ["LCP", "CLS", "TTFB"] },
        { cat: "Performance & Speed", val: 500, q: "The maximum volume of data that can be transferred across a connection at once.", a: "Bandwidth", d: ["Latency", "Ping", "Frequency"] },
        { cat: "Performance & Speed", val: 500, q: "The network delay in data transfer, often measured in milliseconds.", a: "Latency", d: ["Bandwidth", "Throughput", "Uptime"] },

        // --- CATEGORY: SECURITY & INFRASTRUCTURE ---
        { cat: "Security & Infrastructure", val: 100, q: "The secure protocol required for all modern websites, shown by a padlock icon.", a: "HTTPS", d: ["HTTP", "FTP", "SSH"] },
        { cat: "Security & Infrastructure", val: 100, q: "The digital document that proves a website is secure and encrypts its data.", a: "SSL Certificate", d: ["HTML Diploma", "CSS License", "JS Badge"] },
        { cat: "Security & Infrastructure", val: 100, q: "The padlock icon in the address bar indicates that a site has this.", a: "SSL Encryption", d: ["A virus", "Admin access", "Cloud storage"] },

        { cat: "Security & Infrastructure", val: 200, q: "A global network of servers that hosts website assets closer to users for speed.", a: "CDN", d: ["ISP", "LAN", "DNS"] },
        { cat: "Security & Infrastructure", val: 200, q: "A network security system that monitors and controls incoming and outgoing traffic.", a: "Firewall", d: ["Load Balancer", "Router", "Proxy"] },
        { cat: "Security & Infrastructure", val: 200, q: "A secure protocol used to log into and manage a remote server via a terminal.", a: "SSH", d: ["SSL", "SFTP", "DHCP"] },

        { cat: "Security & Infrastructure", val: 300, q: "Automatically sending a user from an old URL to a new one.", a: "Redirect", d: ["Bounce", "Reload", "Refresh"] },
        { cat: "Security & Infrastructure", val: 300, q: "The HTTP status code for a permanent redirect.", a: "301", d: ["302", "404", "500"] },
        { cat: "Security & Infrastructure", val: 300, q: "The HTTP status code for a temporary redirect.", a: "302", d: ["301", "200", "403"] },

        { cat: "Security & Infrastructure", val: 400, q: "Distributing web traffic across multiple servers to prevent any one from crashing.", a: "Load Balancing", d: ["Sharding", "Scaling", "Mirroring"] },
        { cat: "Security & Infrastructure", val: 400, q: "Simulating a cyberattack on your own site to find and fix security holes.", a: "Penetration Testing", d: ["Functional Testing", "Load Testing", "A/B Testing"] },
        { cat: "Security & Infrastructure", val: 400, q: "Which HTTP status code signifies that a server is down or has an error?", a: "500", d: ["404", "200", "403"] },

        { cat: "Security & Infrastructure", val: 500, q: "The process of adding interactivity to a static HTML page in JavaScript.", a: "Hydration", d: ["Compilation", "Minification", "Deployment"] },
        { cat: "Security & Infrastructure", val: 500, q: "Rendering a web page on a remote server before sending it to the browser.", a: "SSR", d: ["CSR", "SPA", "API"] },
        { cat: "Security & Infrastructure", val: 500, q: "Computing where the provider manages the server execution on-demand.", a: "Serverless", d: ["Dedicated", "Shared", "Localhost"] },

        // --- CATEGORY: ANALYTICS & WORKFLOW ---
        { cat: "Analytics & Workflow", val: 100, q: "The process of tracking and measuring user behavior on a website.", a: "Analytics", d: ["Coding", "Designing", "Logging"] },
        { cat: "Analytics & Workflow", val: 100, q: "The most famous tool in the world used for website analytics.", a: "Google Analytics", d: ["Facebook", "Adobe Pro", "Photoshop"] },
        { cat: "Analytics & Workflow", val: 100, q: "A single, continuous visit to a website by one user.", a: "Session", d: ["Click", "Hit", "Event"] },

        { cat: "Analytics & Workflow", val: 200, q: "Ensuring a website looks and functions correctly on Chrome, Safari, and Firefox.", a: "Cross-Browser Testing", d: ["Unit Testing", "Speed Testing", "SEO Audit"] },
        { cat: "Analytics & Workflow", val: 200, q: "Checking if a website's layout works on phones, tablets, and desktops.", a: "Responsive Testing", d: ["Functional Testing", "A/B Testing", "Unit Testing"] },
        { cat: "Analytics & Workflow", val: 200, q: "Checking your HTML/CSS code against the official industry standards.", a: "W3C Validation", d: ["Virus Scan", "Speed Test", "SEO Check"] },

        { cat: "Analytics & Workflow", val: 300, q: "The percentage of visitors who complete a desired goal (like buying a product).", a: "Conversion Rate", d: ["Bounce Rate", "Click Rate", "Success Rate"] },
        { cat: "Analytics & Workflow", val: 300, q: "The process of reverting a website to a previous version after a bad update.", a: "Rollback", d: ["Hotfix", "Patch", "Commit"] },
        { cat: "Analytics & Workflow", val: 300, q: "A quick fix applied directly to a live website to repair a critical bug.", a: "Hotfix", d: ["Rollback", "Update", "Feature"] },

        { cat: "Analytics & Workflow", val: 400, q: "The practice of using version control (Git) to track every change to a project.", a: "Version Control", d: ["Change Logging", "File Saving", "Cloud Backup"] },
        { cat: "Analytics & Workflow", val: 400, q: "Automating the update of your live site the moment code is pushed to Git.", a: "Continuous Deployment", d: ["Manual Upload", "Cloud Storage", "Site Syncing"] },
        { cat: "Analytics & Workflow", val: 400, q: "A text file generated by a server that records every event that occurs.", a: "Log File", d: ["Code File", "Design File", "User File"] },

        { cat: "Analytics & Workflow", val: 500, q: "Testing exactly how a button or a form behaves when used by a person.", a: "Functional Testing", d: ["Design Review", "SEO Audit", "Load Testing"] },
        { cat: "Analytics & Workflow", val: 500, q: "Adhering to legal regulations such as GDPR or ADA for your website.", a: "Compliance", d: ["Formatting", "Indexing", "Validation"] },
        { cat: "Analytics & Workflow", val: 500, q: "The official term for releasing a website to the public for the first time.", a: "Launch", d: ["Deployment", "Production", "Upload"] }
    ].map(item => ({ ...item, chapter: "Chapter 16", grade: "Web Design 2" })));
