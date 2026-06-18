/**
 * CHAPTER 15: EMERGING TECH
 * MASTER MIGRATION FILE - UNIFIED DATA BANK
 * 75 Items Total (5 Categories x 5 Levels x 3 Variations)
 */
window.migrationPool = window.migrationPool || []; window.migrationPool.push(...[
        // --- CATEGORY: ARCHITECTURE ---
        { cat: "Architecture", val: 100, q: "The 'Waiter' or contract that allows two different pieces of software to talk.", a: "API", d: ["UI", "DNS", "CDN"] },
        { cat: "Architecture", val: 100, q: "The standard HTTP method used to 'fetch' or 'retrieve' data.", a: "GET", d: ["POST", "PUT", "DELETE"] },
        { cat: "Architecture", val: 100, q: "The lightweight format for data exchanged between an API and a Web App.", a: "JSON", d: ["HTML", "XML", "CSS"] },

        { cat: "Architecture", val: 200, q: "A web app that loads a single HTML page and dynamically updates without refreshing.", a: "SPA", d: ["MPA", "CMS", "RSS"] },
        { cat: "Architecture", val: 200, q: "An automated message or 'digital tripwire' sent from one app to another when an event happens.", a: "Webhook", d: ["API Key", "Callback", "Token"] },
        { cat: "Architecture", val: 200, q: "A traditional website that reloads a new HTML file on every single click.", a: "MPA", d: ["SPA", "API", "SSL"] },

        { cat: "Architecture", val: 300, q: "The standard HTTP status code for 'Page Not Found'.", a: "404", d: ["200", "500", "301"] },
        { cat: "Architecture", val: 300, q: "The HTTP status code signifying a 'Success' or 'OK' response.", a: "200", d: ["404", "500", "403"] },
        { cat: "Architecture", val: 300, q: "The HTTP status code for an 'Internal Server Error'.", a: "500", d: ["200", "404", "302"] },

        { cat: "Architecture", val: 400, q: "A pre-written kit of code components, like React or Vue, used to speed up development.", a: "Framework", d: ["Library", "API", "Server"] },
        { cat: "Architecture", val: 400, q: "The specific URL address where an API 'listens' for a request.", a: "Endpoint", d: ["Payload", "Header", "Method"] },
        { cat: "Architecture", val: 400, q: "A JS object returned by fetch() representing the eventual completion of a task.", a: "Promise", d: ["Loop", "Variable", "Callback"] },

        { cat: "Architecture", val: 500, q: "Renting computer power from a remote provider over the internet.", a: "Cloud Computing", d: ["Local Computing", "Grid Computing", "Network Hosting"] },
        { cat: "Architecture", val: 500, q: "Uploading code that runs on demand without managing the physical hardware.", a: "Serverless", d: ["Mainframe", "Shared Hosting", "Dedicated"] },
        { cat: "Architecture", val: 500, q: "A global network of servers hosting assets closer to users to reduce load times.", a: "CDN", d: ["DNS", "ISP", "LAN"] },

        // --- CATEGORY: IOT & VOICE ---
        { cat: "IoT & Voice", val: 100, q: "A network of physical hardware devices connected to the internet.", a: "IoT", d: ["Web 2.0", "Cloud", "Intranet"] },
        { cat: "IoT & Voice", val: 100, q: "The hardware components in IoT devices that collect environmental data.", a: "Sensors", d: ["Monitors", "Keyboards", "Routers"] },
        { cat: "IoT & Voice", val: 100, q: "Streetlights that turn on automatically via sensors is an application of this.", a: "Smart City", d: ["Digital Town", "Auto Grid", "Intelli-Park"] },

        { cat: "IoT & Voice", val: 200, q: "Communication through physical touch or vibration on a wearable device.", a: "Haptic Feedback", d: ["Audio Feedback", "Visual Feedback", "Tactile Sync"] },
        { cat: "IoT & Voice", val: 200, q: "An interface designed specifically for natural language and speech interaction.", a: "VUI", d: ["GUI", "CLI", "API"] },
        { cat: "IoT & Voice", val: 200, q: "An AI-driven interface designed to simulate human conversation via text.", a: "Chatbot", d: ["VUI", "Terminal", "Proxy"] },

        { cat: "IoT & Voice", val: 300, q: "Interfaces designed for devices without traditional screens, like speakers.", a: "Headless UI", d: ["Graphic UI", "Visual UI", "Static UI"] },
        { cat: "IoT & Voice", val: 300, q: "A complex navigation style that is notoriously difficult for voice interfaces.", a: "Mega Menu", d: ["Breadcrumb", "Sidebar", "Footer"] },
        { cat: "IoT & Voice", val: 300, q: "VUI design focuses on interaction through this type of spoken language.", a: "Natural Language", d: ["Code", "Binary", "Syntax"] },

        { cat: "IoT & Voice", val: 400, q: "The minimum touch target size for mobile interfaces to avoid errors.", a: "44px", d: ["10px", "100px", "24px"] },
        { cat: "IoT & Voice", val: 400, q: "Household items often targeted by hackers because they are rarely updated.", a: "Smart Appliances", d: ["Computers", "Phones", "Servers"] },
        { cat: "IoT & Voice", val: 400, q: "The ability of an IoT device to share data across other connected hardware.", a: "Device Syncing", d: ["Broadcasting", "Streaming", "Mirroring"] },

        { cat: "IoT & Voice", val: 500, q: "A major security vulnerability of IoT devices straight out of the box.", a: "Default Passwords", d: ["Slow WiFi", "Small Screen", "Heavy Weight"] },
        { cat: "IoT & Voice", val: 500, q: "Processing data closer to the device rather than sending it all to the cloud.", a: "Edge Computing", d: ["Core Computing", "Remote Hosting", "Node Scaling"] },
        { cat: "IoT & Voice", val: 500, q: "The tech category that includes smartwatches and fitness trackers.", a: "Wearable Tech", d: ["Smart Home", "Smart Office", "Industrial IoT"] },

        // --- CATEGORY: AI ---
        { cat: "AI", val: 100, q: "The broad concept of machines acting smartly or simulating human intelligence.", a: "AI", d: ["ML", "NLP", "Algorithm"] },
        { cat: "AI", val: 100, q: "The primary 'fuel' that powers AI predictions and learning.", a: "Data", d: ["Electricity", "Code", "WiFi"] },
        { cat: "AI", val: 100, q: "AI subset where systems improve based on data exposure rather than hard-coding.", a: "Machine Learning (ML)", d: ["Logic Programming", "Deep Learning", "Automation"] },

        { cat: "AI", val: 200, q: "AI logic commonly used to filter spam emails or recognize human faces.", a: "Pattern Recognition", d: ["Data Sorting", "Random Generation", "Logic Flow"] },
        { cat: "AI", val: 200, q: "Using AI to tailor a website's experience to a specific individual user.", a: "Personalization", d: ["Optimization", "Validation", "Standardization"] },
        { cat: "AI", val: 200, q: "The language of interaction that helps run many AI-driven web apps.", a: "JavaScript", d: ["HTML", "CSS", "Python"] },

        { cat: "AI", val: 300, q: "Systematically prejudiced AI results caused by flawed or narrow training data.", a: "Algorithmic Bias", d: ["Software Error", "Data Leak", "Syntax Glitch"] },
        { cat: "AI", val: 300, q: "A major societal concern regarding the advancement of AI and automation.", a: "Job Displacement", d: ["Internet Speed", "Screen Size", "Battery Life"] },
        { cat: "AI", val: 300, q: "The specific raw information fed into a machine learning algorithm to help it learn.", a: "Training Data", d: ["Output Data", "User Logs", "API Keys"] },

        { cat: "AI", val: 400, q: "AI generating image descriptions automatically for visually impaired users.", a: "Automated Accessibility", d: ["SEO Boost", "Image Search", "Voice Command"] },
        { cat: "AI", val: 400, q: "The primary difference between AI and ML is that ML relies heavily on this.", a: "Learning from Experience", d: ["Fixed Rules", "Human Input", "Satellite Data"] },
        { cat: "AI", val: 400, q: "When an AI inherits the prejudices of its human creators or data sources.", a: "Bias", d: ["Error", "Glitch", "Constraint"] },

        { cat: "AI", val: 500, q: "AI systems that can create original content like images, text, or music.", a: "Generative AI", d: ["Predictive AI", "Static AI", "Logic AI"] },
        { cat: "AI", val: 500, q: "A complex form of Machine Learning inspired by the structure of the human brain.", a: "Neural Networks", d: ["Binary Trees", "Logic Gates", "Data Cubes"] },
        { cat: "AI", val: 500, q: "AI focused specifically on understanding and processing human text and speech.", a: "NLP", d: ["GUI", "SSL", "CDN"] },

        // --- CATEGORY: IMMERSIVE ---
        { cat: "Immersive", val: 100, q: "Technology that completely immerses the user in a simulated digital environment.", a: "Virtual Reality (VR)", d: ["Augmented Reality", "Mixed Reality", "Spatial Audio"] },
        { cat: "Immersive", val: 100, q: "Technology that overlays digital elements onto a live view of the real world.", a: "Augmented Reality (AR)", d: ["Virtual Reality", "Static Web", "3D Printing"] },
        { cat: "Immersive", val: 100, q: "Trying on a pair of digital sunglasses using a phone's camera is this.", a: "AR", d: ["VR", "AI", "API"] },

        { cat: "Immersive", val: 200, q: "A low-fidelity visual blueprint of an app's interface layout.", a: "Wireframe", d: ["Prototype", "Mockup", "Moodboard"] },
        { cat: "Immersive", val: 200, q: "An interactive, clickable model of an app used for performance testing.", a: "Prototype", d: ["Wireframe", "Sketch", "Diagram"] },
        { cat: "Immersive", val: 200, q: "The role focused on the psychology and visual experience of an interface.", a: "UX/UI Designer", d: ["DevOps", "Back-End Dev", "Data Analyst"] },

        { cat: "Immersive", val: 300, q: "The API standard for bringing VR and AR directly into the web browser.", a: "WebXR", d: ["WebGL", "Three.js", "OpenGL"] },
        { cat: "Immersive", val: 300, q: "The delay in tracking movement that can cause VR-related motion sickness.", a: "Latency", d: ["Bandwidth", "Resolution", "Framerate"] },
        { cat: "Immersive", val: 300, q: "The physical device most commonly used for VR, like the Meta Quest.", a: "HMD (Headset)", d: ["Controller", "Sensor", "Tablet"] },

        { cat: "Immersive", val: 400, q: "The 5E phase used to spark initial student interest in a new tech topic.", a: "Engage", d: ["Elaborate", "Explain", "Evaluate"] },
        { cat: "Immersive", val: 400, q: "The 5E phase where students apply their knowledge to a new situation.", a: "Elaborate", d: ["Engage", "Explore", "Evaluate"] },
        { cat: "Immersive", val: 400, q: "The Pokemon Go app is a prime mobile example of this technology.", a: "AR", d: ["VR", "IoT", "CMS"] },

        { cat: "Immersive", val: 500, q: "Using VR to walk through a digital model of a building before construction.", a: "Architecture / Pre-viz", d: ["Gaming", "Social Media", "Web Browsing"] },
        { cat: "Immersive", val: 500, q: "The next era of the web focused on decentralization and blockchain.", a: "Web 3.0", d: ["Web 2.0", "Web 1.0", "AI Web"] },
        { cat: "Immersive", val: 500, q: "Seamlessly blending virtual and physical worlds into one experience.", a: "Spatial Computing", d: ["Cloud Computing", "Node Computing", "Edge Computing"] },

        // --- CATEGORY: SECURITY ---
        { cat: "Security", val: 100, q: "The process of scrambling data into a secret code during network transit.", a: "Encryption", d: ["Minification", "Compression", "Hashing"] },
        { cat: "Security", val: 100, q: "The secure protocol symbolized by a padlock icon in the browser.", a: "HTTPS", d: ["HTTP", "FTP", "DNS"] },
        { cat: "Security", val: 100, q: "A secret digital ID badge used to identify a program to an API service.", a: "API Key", d: ["Auth Token", "Password", "MAC Address"] },

        { cat: "Security", val: 200, q: "A security system requiring two or more distinct proofs of identity.", a: "MFA", d: ["SSL", "VPN", "API"] },
        { cat: "Security", val: 200, q: "A temporary digital VIP pass used to prove user identity during a session.", a: "Auth Token", d: ["Cookie", "Password", "IP Address"] },
        { cat: "Security", val: 200, q: "The actual data or 'cargo' being sent to a server in an API request.", a: "Payload", d: ["Header", "Method", "Endpoint"] },

        { cat: "Security", val: 300, q: "A developer comfortable with both the Front-End and the Back-End databases.", a: "Full Stack Developer", d: ["DevOps", "UX Designer", "SysAdmin"] },
        { cat: "Security", val: 300, q: "The engineer who ensures servers stay online and code deploys smoothly.", a: "DevOps Engineer", d: ["Front-End Dev", "Product Owner", "QA Tester"] },
        { cat: "Security", val: 300, q: "The industry standard tool for tracking and managing code history.", a: "Git", d: ["Docker", "Jenkins", "Ansible"] },

        { cat: "Security", val: 400, q: "The 'CI' in a CI/CD pipeline stands for this automated process.", a: "Continuous Integration", d: ["Cloud Interface", "Code Input", "Central Index"] },
        { cat: "Security", val: 400, q: "Software whose source code is public and free for anyone to enhance.", a: "Open Source", d: ["Proprietary", "Encrypted", "Secret"] },
        { cat: "Security", val: 400, q: "An API that is public and available for any external developer to use.", a: "Open API", d: ["Private API", "Secret API", "Local API"] },

        { cat: "Security", val: 500, q: "A JS block used to handle errors gracefully without crashing a program.", a: "try / catch", d: ["if / else", "for loop", "while loop"] },
        { cat: "Security", val: 500, q: "The modern JS keyword that pauses code execution until a Promise resolves.", a: "await", d: ["halt", "wait", "yield"] },
        { cat: "Security", val: 500, q: "The binary code format that allows extreme performance for apps in-browser.", a: "WebAssembly", d: ["JSON", "XML", "Python"] }
    ].map(item => ({ ...item, chapter: "Chapter 15", grade: "Web Design 2" })));
