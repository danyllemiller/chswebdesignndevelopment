/**
 * CHAPTER 13: THE NETWORK (APIs & Fetch)
 * MASTER MIGRATION FILE - UNIFIED DATA BANK
 * 75 Items Total (5 Categories x 5 Levels x 3 Variations)
 */
window.migrationPool = window.migrationPool || []; window.migrationPool.push(...[
        // --- CATEGORY: API BASICS ---
        { cat: "API Basics", val: 100, q: "The acronym for Application Programming Interface.", a: "API", d: ["APP", "URL", "JSON"] },
        { cat: "API Basics", val: 100, q: "In the restaurant analogy, the API functions as the ___.", a: "Waiter", d: ["Chef", "Customer", "Menu"] },
        { cat: "API Basics", val: 100, q: "A specific URL address where an API 'listens' for a request.", a: "Endpoint", d: ["Payload", "Header", "Method"] },

        { cat: "API Basics", val: 200, q: "The main part of an API address before the specific path.", a: "Base URL", d: ["Footer", "Root Folder", "Main Domain"] },
        { cat: "API Basics", val: 200, q: "An API that is free for any external developer to use.", a: "Public API", d: ["Private API", "Secret API", "Local API"] },
        { cat: "API Basics", val: 200, q: "An API built by another company (like Google or Twitter) for you to use.", a: "3rd Party API", d: ["Internal API", "System API", "Core API"] },

        { cat: "API Basics", val: 300, q: "The instruction manual for how to use a specific API.", a: "Documentation", d: ["Reference", "Codebook", "Script"] },
        { cat: "API Basics", val: 300, q: "The specific resource part of an API URL.", a: "Path", d: ["Way", "Protocol", "Handle"] },
        { cat: "API Basics", val: 300, q: "Acronym for Software Development Kit.", a: "SDK", d: ["System Data Key", "Standard Design Kit", "Simple Data Kit"] },

        { cat: "API Basics", val: 400, q: "The standard and most common architecture type for modern web APIs.", a: "REST", d: ["SOAP", "GraphQL", "RPC"] },
        { cat: "API Basics", val: 400, q: "The property of an API being 'Stateless', meaning no client info is saved on the server.", a: "Statelessness", d: ["Persistence", "Caching", "Logging"] },
        { cat: "API Basics", val: 400, q: "A modern query language for APIs that allows clients to request exactly what they need.", a: "GraphQL", d: ["SQL", "REST", "SOAP"] },

        { cat: "API Basics", val: 500, q: "Who created the architectural style known as REST?", a: "Roy Fielding", d: ["Tim Berners-Lee", "Brendan Eich", "Bill Gates"] },
        { cat: "API Basics", val: 500, q: "In what year was the famous REST dissertation published?", a: "2000", d: ["1995", "1991", "2005"] },
        { cat: "API Basics", val: 500, q: "Which protocol is older: SOAP or REST?", a: "SOAP", d: ["REST", "They are the same", "GraphQL"] },

        // --- CATEGORY: HTTP METHODS ---
        { cat: "HTTP Methods", val: 100, q: "The HTTP method used to retrieve or 'get' data from a server.", a: "GET", d: ["POST", "PUT", "DELETE"] },
        { cat: "HTTP Methods", val: 100, q: "The HTTP method used to send brand new data to a server.", a: "POST", d: ["GET", "PATCH", "FETCH"] },
        { cat: "HTTP Methods", val: 100, q: "What the acronym HTTP stands for.", a: "HyperText Transfer Protocol", d: ["HyperText Technical Protocol", "HyperText Terminal Protocol", "HyperText Total Protocol"] },

        { cat: "HTTP Methods", val: 200, q: "The HTTP method used to update or replace existing data on a server.", a: "PUT", d: ["GET", "HEAD", "OPEN"] },
        { cat: "HTTP Methods", val: 200, q: "The HTTP method used to permanently remove data from a server.", a: "DELETE", d: ["QUIT", "END", "DROP"] },
        { cat: "HTTP Methods", val: 200, q: "The HTTP method that maps to the 'Create' part of CRUD.", a: "POST", d: ["GET", "PUT", "DELETE"] },

        { cat: "HTTP Methods", val: 300, q: "The HTTP method that maps to the 'Read' part of CRUD.", a: "GET", d: ["POST", "PATCH", "HEAD"] },
        { cat: "HTTP Methods", val: 300, q: "Making multiple requests with the same result (like GET) is called this.", a: "Idempotency", d: ["Persistence", "Latency", "Iteration"] },
        { cat: "HTTP Methods", val: 300, q: "Which of these HTTP methods is considered 'Idempotent'?", a: "GET", d: ["POST", "FETCH", "OPEN"] },

        { cat: "HTTP Methods", val: 400, q: "Extra information sent alongside an API request, often containing keys or data types.", a: "Headers", d: ["Footers", "Body", "Payload"] },
        { cat: "HTTP Methods", val: 400, q: "The actual data being sent in a POST or PUT request.", a: "Payload", d: ["Header", "Method", "Response"] },
        { cat: "HTTP Methods", val: 400, q: "Where an API key is most commonly sent for security.", a: "Headers", d: ["URL Only", "Body Only", "Footer"] },

        { cat: "HTTP Methods", val: 500, q: "The term for limiting how many requests a user can make to an API.", a: "Rate Limiting", d: ["Throttling", "Bandwidth", "Latency"] },
        { cat: "HTTP Methods", val: 500, q: "Intentionally slowing down the speed of API requests.", a: "Throttling", d: ["Rate Limiting", "Caching", "Indexing"] },
        { cat: "HTTP Methods", val: 500, q: "What happens if you exceed an API's rate limit?", a: "API stops responding to you", d: ["Site crashes", "Code deletes", "You get a bill"] },

        // --- CATEGORY: FETCH & PROMISES ---
        { cat: "Fetch & Promises", val: 100, q: "The JavaScript function used to perform network requests.", a: "fetch()", d: ["get()", "api()", "request()"] },
        { cat: "Fetch & Promises", val: 100, q: "A JS object representing the eventual completion of a network task.", a: "Promise", d: ["String", "Number", "Array"] },
        { cat: "Fetch & Promises", val: 100, q: "Code that runs in the background without blocking the rest of the program.", a: "Asynchronous", d: ["Synchronous", "Static", "Legacy"] },

        { cat: "Fetch & Promises", val: 200, q: "The function used to handle a successful Promise response.", a: ".then()", d: [".catch()", ".done()", ".go()"] },
        { cat: "Fetch & Promises", val: 200, q: "The function used to handle any errors that occur during a fetch.", a: ".catch()", d: [".then()", ".fail()", ".error()"] },
        { cat: "Fetch & Promises", val: 200, q: "The keyword that pauses an async function until a Promise resolves.", a: "await", d: ["wait", "pause", "halt"] },

        { cat: "Fetch & Promises", val: 300, q: "Breaking a website into many small, independent APIs.", a: "Microservices", d: ["Monoliths", "Databases", "Scripts"] },
        { cat: "Fetch & Promises", val: 300, q: "The infrastructure used for communication between microservices.", a: "Service Mesh", d: ["Grid", "Database", "Loop"] },
        { cat: "Fetch & Promises", val: 300, q: "A single entry point for all microservice API requests.", a: "API Gateway", d: ["Server Room", "Logic Gate", "Proxy"] },

        { cat: "Fetch & Promises", val: 400, q: "The 'All or Nothing' property of reliable transactions.", a: "Atomicity", d: ["Isolation", "Consistency", "Durability"] },
        { cat: "Fetch & Promises", val: 400, q: "An API that sends data to your server automatically when an event occurs.", a: "Webhook", d: ["Fetch", "Promise", "GET"] },
        { cat: "Fetch & Promises", val: 400, q: "A security protocol providing an open standard for authorization.", a: "OAuth", d: ["SSL", "HTTPS", "RSA"] },

        { cat: "Fetch & Promises", val: 500, q: "Computing where the provider manages the server execution on-demand.", a: "Serverless", d: ["Dedicated", "Shared", "Localhost"] },
        { cat: "Fetch & Promises", val: 500, q: "A serverless function service provided by Amazon (AWS).", a: "Lambda", d: ["Delta", "Alpha", "Omega"] },
        { cat: "Fetch & Promises", val: 500, q: "A type of security access key often used with OAuth.", a: "Bearer Token", d: ["Master Key", "Session ID", "Passcode"] },

        // --- CATEGORY: JSON & STATUS ---
        { cat: "JSON & Status", val: 100, q: "JavaScript Object Notation; the lightweight data format for APIs.", a: "JSON", d: ["HTML", "XML", "CSV"] },
        { cat: "JSON & Status", val: 100, q: "The HTTP status code indicating a successful request.", a: "200", d: ["404", "500", "401"] },
        { cat: "JSON & Status", val: 100, q: "The HTTP status code indicating 'Not Found'.", a: "404", d: ["200", "500", "403"] },

        { cat: "JSON & Status", val: 200, q: "The HTTP status code indicating a 'Server Error'.", a: "500", d: ["404", "200", "302"] },
        { cat: "JSON & Status", val: 200, q: "The HTTP status code indicating a 'Forbidden' request.", a: "403", d: ["404", "401", "200"] },
        { cat: "JSON & Status", val: 200, q: "The HTTP status code indicating an 'Unauthorized' user.", a: "401", d: ["403", "404", "500"] },

        { cat: "JSON & Status", val: 300, q: "JSON objects are surrounded by these characters.", a: "Curly braces {}", d: ["Brackets []", "Quotes", "Slashes"] },
        { cat: "JSON & Status", val: 300, q: "JSON arrays are surrounded by these characters.", a: "Brackets []", d: ["Curly braces {}", "Parentheses", "Colons"] },
        { cat: "JSON & Status", val: 300, q: "In JSON, both keys and string values must be surrounded by these.", a: "Double quotes", d: ["Single quotes", "No quotes", "Asterisks"] },

        { cat: "JSON & Status", val: 400, q: "The JS method used to convert a JSON string into a JS object.", a: "JSON.parse()", d: ["JSON.stringify()", "Parse()", "Object()"] },
        { cat: "JSON & Status", val: 400, q: "The JS method used to convert a JS object into a JSON string.", a: "JSON.stringify()", d: ["JSON.parse()", "Stringify()", "Text()"] },
        { cat: "JSON & Status", val: 400, q: "An older API protocol that uses XML exclusively.", a: "SOAP", d: ["REST", "GraphQL", "JSON"] },

        { cat: "JSON & Status", val: 500, q: "What format does the SOAP protocol use for data?", a: "XML", d: ["JSON", "HTML", "TXT"] },
        { cat: "JSON & Status", val: 500, q: "The status code that literally means 'I am a teapot'.", a: "418", d: ["404", "500", "200"] },
        { cat: "JSON & Status", val: 500, q: "What the acronym HATEOAS stands for in REST design.", a: "Hypermedia as the Engine of Application State", d: ["High Access To Open Systems", "Help All To Entry Systems", "Hyper Active Text Engines"] },

        // --- CATEGORY: API ERRORS & SECURITY ---
        { cat: "Errors & Security", val: 100, q: "A secret password or string used to authenticate a program to an API.", a: "API Key", d: ["Token", "Badge", "License"] },
        { cat: "Errors & Security", val: 100, q: "The security process of proving exactly who you are.", a: "Authentication", d: ["Authorization", "Validation", "Curation"] },
        { cat: "Errors & Security", val: 100, q: "The process of checking what a user is allowed to do.", a: "Authorization", d: ["Authentication", "Versioning", "Curation"] },

        { cat: "Errors & Security", val: 200, q: "Cross-Origin Resource Sharing; a security feature of browsers.", a: "CORS", d: ["REST", "SSL", "VPN"] },
        { cat: "Errors & Security", val: 200, q: "Why does a CORS error happen?", a: "One site blocks another from data", d: ["Server is down", "Code is wrong", "Internet is off"] },
        { cat: "Errors & Security", val: 200, q: "A professional tool used to test and debug API requests.", a: "Postman", d: ["Photoshop", "Word", "Excel"] },

        { cat: "Errors & Security", val: 300, q: "The delay in the time it takes for an API to respond.", a: "Latency", d: ["Bandwidth", "Throughput", "Uptime"] },
        { cat: "Errors & Security", val: 300, q: "The total volume of data an API processes in a set time.", a: "Throughput", d: ["Latency", "Speed", "Ping"] },
        { cat: "Errors & Security", val: 300, q: "An API that is used exclusively inside a single company.", a: "Internal API", d: ["Public API", "Open API", "Shared API"] },

        { cat: "Errors & Security", val: 400, q: "Older method used to bypass browser CORS security.", a: "JSONP", d: ["REST", "AJAX", "XML"] },
        { cat: "Errors & Security", val: 400, q: "Managing changes to an API over time using version numbers.", a: "Versioning", d: ["Revision", "Snapshot", "Commit"] },
        { cat: "Errors & Security", val: 400, q: "The XML file that describes a SOAP API.", a: "WSDL", d: ["Sitemap", "Config", "JSON"] },

        { cat: "Errors & Security", val: 500, q: "A permanent URL redirect code.", a: "301", d: ["302", "404", "500"] },
        { cat: "Errors & Security", val: 500, q: "A temporary URL redirect code.", a: "302", d: ["301", "200", "403"] },
        { cat: "Errors & Security", val: 500, q: "The process of tracking API usage and behavior.", a: "Logging", d: ["Fetching", "Parsing", "Stringifying"] }
    ].map(item => ({ ...item, chapter: "Chapter 13", grade: "Web Design 2" })));
