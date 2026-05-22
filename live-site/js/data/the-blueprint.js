/**
 * CHAPTER 3: The Blueprint (UX Research & Architecture)
 * MASTER OVERWRITE MIGRATION FILE - UNIFIED DATA BANK
 * 75 Items Total (5 Categories x 5 Levels x 3 Variations)
 * Aligned to NV 4.3.1, 4.3.2, 4.3.3, 4.4.4 (UX, Wireframes, Sitemaps, SEO)
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

    // Import required Firebase modules, including deleteDoc and doc for overwriting
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
    const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
    const { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    // Authenticate
    await signInAnonymously(auth);

    // DEFINE THE QUESTION POOL
    const migrationPool = [
        // --- CATEGORY 1: UX RESEARCH ---
        { cat: "UX Research", val: 100, q: "What is the #1 mistake new web developers make when planning a website?", a: "Building a website for themselves instead of the user.", d: ["Using too much CSS", "Forgetting to buy a domain name", "Using an Empathy Map"] },
        { cat: "UX Research", val: 100, q: "The process of making things work well for a specific person, bridging the gap between a 'pretty' site and a 'useful' site, is called:", a: "User Experience (UX) Design", d: ["Search Engine Optimization (SEO)", "Atomic Design", "Back-End Development"] },
        { cat: "UX Research", val: 100, q: "Which research method seeks 'The Why' and explores user feelings and pain points?", a: "Qualitative Research", d: ["Quantitative Research", "Web Analytics", "Data Mining"] },
        
        { cat: "UX Research", val: 200, q: "Which research method seeks 'The What' and gathers statistical data like percentages?", a: "Quantitative Research", d: ["Qualitative Research", "User Interviews", "Field Studies"] },
        { cat: "UX Research", val: 200, q: "User Interviews and Usability Tests are examples of which type of research?", a: "Qualitative Research", d: ["Quantitative Research", "A/B Testing", "Web Analytics"] },
        { cat: "UX Research", val: 200, q: "Surveys and Web Analytics are examples of which type of research?", a: "Quantitative Research", d: ["Qualitative Research", "Field Studies", "User Interviews"] },
        
        { cat: "UX Research", val: 300, q: "In UX Research, what is a 'Pain Point'?", a: "A user's frustration or barrier when using a site.", d: ["A broken pixel on the screen.", "The most expensive feature to build.", "A bad color palette."] },
        { cat: "UX Research", val: 300, q: "In Qualitative research, the sample size is usually:", a: "Small (5-8 people is often enough to find patterns).", d: ["Large (100+ responses).", "Exactly one person.", "Millions of web users."] },
        { cat: "UX Research", val: 300, q: "In Quantitative research, the sample size is usually:", a: "Large (100+ responses to be statistically useful).", d: ["Small (5-8 people).", "Exactly two people.", "Non-existent."] },
        
        { cat: "UX Research", val: 400, q: "Asking 'Walk me through your day...' is an example of what type of interview question?", a: "Open-ended", d: ["Closed-ended", "Leading the witness", "Statistical"] },
        { cat: "UX Research", val: 400, q: "Instead of asking 'Don't you hate this site?', a good researcher avoids:", a: "Leading the witness", d: ["Open-ended questions", "Using an Empathy Map", "Recording the interview"] },
        { cat: "UX Research", val: 400, q: "The data output of Qualitative research mostly consists of:", a: "Quotes, observations, and stories.", d: ["Charts, graphs, and statistics.", "Code snippets.", "Color palettes."] },
        
        { cat: "UX Research", val: 500, q: "The data output of Quantitative research mostly consists of:", a: "Charts, graphs, percentages, and statistics.", d: ["Quotes and observations.", "User stories.", "Figma files."] },
        { cat: "UX Research", val: 500, q: "If 80% of survey responses say they use a phone to browse, your site must be designed:", a: "Mobile-first.", d: ["Desktop-first.", "Without CSS.", "In black and white."] },
        { cat: "UX Research", val: 500, q: "UX Design acts as the bridge between a 'pretty' website and a:", a: "'Useful' website.", d: ["'Broken' website.", "'Static' website.", "'Profitable' website."] },

        // --- CATEGORY 2: PERSONAS & EMPATHY ---
        { cat: "Personas & Empathy", val: 100, q: "What do we call the fictional character created by combining all our research data?", a: "User Persona", d: ["Avatar", "Target Client", "Client Profile"] },
        { cat: "Personas & Empathy", val: 100, q: "The primary purpose of creating a User Persona is to:", a: "Build empathy for the user.", d: ["Collect real email addresses.", "Pick a color scheme.", "Write the HTML code."] },
        { cat: "Personas & Empathy", val: 100, q: "What tool maps out what a user Says, Thinks, Does, and Feels?", a: "Empathy Map", d: ["Sitemap", "SWOT Analysis", "Wireframe"] },
        
        { cat: "Personas & Empathy", val: 200, q: "In an Empathy Map, which quadrant captures the user's 'Internal Monologue' (e.g., 'Why is this so ugly?')?", a: "THINKS", d: ["SAYS", "DOES", "FEELS"] },
        { cat: "Personas & Empathy", val: 200, q: "Which quadrant of an Empathy Map captures the user's emotional state (e.g., Frustrated, Proud)?", a: "FEELS", d: ["DOES", "THINKS", "SAYS"] },
        { cat: "Personas & Empathy", val: 200, q: "Which quadrant of an Empathy Map captures the user's physical actions and behaviors?", a: "DOES", d: ["SAYS", "THINKS", "FEELS"] },
        
        { cat: "Personas & Empathy", val: 300, q: "Which quadrant of an Empathy Map captures direct quotes from user interviews?", a: "SAYS", d: ["DOES", "THINKS", "FEELS"] },
        { cat: "Personas & Empathy", val: 300, q: "If a user 'Takes a picture of a high score with their phone', this belongs in which quadrant?", a: "DOES", d: ["SAYS", "THINKS", "FEELS"] },
        { cat: "Personas & Empathy", val: 300, q: "If your Persona THINKS 'why is this so ugly?', your site MUST be designed to be:", a: "Clean and modern.", d: ["Filled with pop-up ads.", "Built using only HTML.", "Dark and chaotic."] },
        
        { cat: "Personas & Empathy", val: 400, q: "In our chapter example, Retro-Gamer Ryan's 'Goals (Jobs to be Done)' included:", a: "Finding high-quality walkthroughs.", d: ["Buying modern PC games.", "Learning HTML.", "Deleting his accounts."] },
        { cat: "Personas & Empathy", val: 400, q: "Empathy in UX Design is best defined as:", a: "The ability to see the world through someone else's eyes to solve their needs.", d: ["Making sure the site loads quickly.", "Using the most expensive software.", "Writing code without errors."] },
        { cat: "Personas & Empathy", val: 400, q: "Instead of arguing 'I like blue,' a team using a persona would ask:", a: "'Would our persona find this button easy to see?'", d: ["'Is blue the cheapest color?'", "'Does Google like blue?'", "'Can we delete the button?'"] },
        
        { cat: "Personas & Empathy", val: 500, q: "What specific pain point did the persona 'Ryan' have regarding text guides?", a: "'Wall of text' guides that are poorly formatted for phones.", d: ["Guides that load too fast.", "Guides that use too many images.", "Guides that cost money."] },
        { cat: "Personas & Empathy", val: 500, q: "Using an Empathy Map ensures that development decisions are driven by user needs rather than:", a: "Developer opinions.", d: ["Server capabilities.", "The W3C standards.", "HTML limitations."] },
        { cat: "Personas & Empathy", val: 500, q: "A persona's 'Tech Savvy' level helps a designer determine:", a: "How complex the user interface can safely be.", d: ["How much to charge the client.", "What colors to use.", "Which web host to buy."] },

        // --- CATEGORY 3: STRATEGY & AGILE ---
        { cat: "Strategy & Agile", val: 100, q: "What does SWOT stand for?", a: "Strengths, Weaknesses, Opportunities, Threats", d: ["Sitemaps, Wireframes, Organisms, Templates", "Search, Width, Origin, Tool", "Simple, Wide, Open, Tech"] },
        { cat: "Strategy & Agile", val: 100, q: "Which strategic tool uses a grid to cross-reference features between your site and rival companies?", a: "Competitive Matrix", d: ["Empathy Map", "Sitemap", "User Story"] },
        { cat: "Strategy & Agile", val: 100, q: "An uncontested market space where competitors are failing to offer a specific feature is called a:", a: "Blue Ocean", d: ["Red Sea", "Market Gap", "Safe Zone"] },
        
        { cat: "Strategy & Agile", val: 200, q: "What is the industry-standard format for a User Story?", a: "As a [user], I want to [action] so that [goal]", d: ["User [name] needs [feature]", "Given [state], when [action], then [result]", "Requirement: Create a [feature]"] },
        { cat: "Strategy & Agile", val: 200, q: "What does MVP stand for in web strategy?", a: "Minimum Viable Product", d: ["Maximum Visual Priority", "Most Valuable Player", "Main Vector Path"] },
        { cat: "Strategy & Agile", val: 200, q: "The MoSCoW method is primarily used for:", a: "Prioritizing features for an MVP.", d: ["Designing logos.", "Writing CSS code.", "Interviewing users."] },
        
        { cat: "Strategy & Agile", val: 300, q: "In the MoSCoW method, what does the 'M' stand for?", a: "Must Have", d: ["Maybe Have", "Main Have", "Minimum Have"] },
        { cat: "Strategy & Agile", val: 300, q: "In the MoSCoW method, what does the 'S' stand for?", a: "Should Have", d: ["Standard Have", "Simple Have", "Safe Have"] },
        { cat: "Strategy & Agile", val: 300, q: "In the MoSCoW method, what does the 'C' stand for?", a: "Could Have", d: ["Can't Have", "Core Have", "Clear Have"] },
        
        { cat: "Strategy & Agile", val: 400, q: "In the MoSCoW method, what does the 'W' stand for?", a: "Won't Have (Out of scope for Release 1)", d: ["Will Have", "Would Have", "Working Have"] },
        { cat: "Strategy & Agile", val: 400, q: "The 'Given / When / Then' format is primarily used to define:", a: "Acceptance Criteria", d: ["User Personas", "Sitemaps", "CSS Selectors"] },
        { cat: "Strategy & Agile", val: 400, q: "Features categorized as 'Must Have' mean:", a: "The site is useless without them.", d: ["They are nice bonuses to add later.", "They are out of scope.", "They cost the most money."] },
        
        { cat: "Strategy & Agile", val: 500, q: "In a User Story, the phrase '...so that I can [achieve a goal]' keeps the focus on the:", a: "Benefit to the user.", d: ["Database code.", "Visual design.", "Server cost."] },
        { cat: "Strategy & Agile", val: 500, q: "Acceptance Criteria act as the specific conditions that prove a feature:", a: "Actually works as intended.", d: ["Looks pretty.", "Is cheap to build.", "Can be deleted."] },
        { cat: "Strategy & Agile", val: 500, q: "In a SWOT Analysis, which two categories are considered 'External' factors?", a: "Opportunities & Threats", d: ["Strengths & Weaknesses", "Strengths & Opportunities", "Weaknesses & Threats"] },

        // --- CATEGORY 4: ARCHITECTURE & BLUEPRINTS ---
        { cat: "Architecture & Blueprints", val: 100, q: "What is the 5-step professional project management cycle used to build websites?", a: "ADDIE Model", d: ["Agile Sprint", "Atomic Design", "W3C Standard"] },
        { cat: "Architecture & Blueprints", val: 100, q: "A simple, top-down diagram showing all the pages on a website and how they connect is a:", a: "Sitemap", d: ["Wireframe", "Empathy Map", "Flowchart"] },
        { cat: "Architecture & Blueprints", val: 100, q: "What is the mandatory filename for the top-level Homepage at the root of a Sitemap?", a: "index.html", d: ["home.html", "main.html", "start.html"] },
        
        { cat: "Architecture & Blueprints", val: 200, q: "What is the first 'A' in the ADDIE Model?", a: "Analyze", d: ["Apply", "Architecture", "Assess"] },
        { cat: "Architecture & Blueprints", val: 200, q: "What is the first 'D' in the ADDIE Model?", a: "Design", d: ["Develop", "Deploy", "Destroy"] },
        { cat: "Architecture & Blueprints", val: 200, q: "A black-and-white blueprint for a single page focusing entirely on layout and hierarchy is a:", a: "Wireframe", d: ["Mockup", "Sitemap", "Style Guide"] },
        
        { cat: "Architecture & Blueprints", val: 300, q: "Why are Mid-Fidelity Wireframes kept strictly black and white?", a: "To stop people from arguing about colors instead of layout.", d: ["Because Figma does not support color.", "To reduce the file size.", "Because search engines only index B&W."] },
        { cat: "Architecture & Blueprints", val: 300, q: "Which level of wireframe fidelity uses fast paper sketches for rapid ideation?", a: "Low-Fidelity (Lo-Fi)", d: ["Mid-Fidelity (Mid-Fi)", "High-Fidelity (Hi-Fi)", "Production Ready"] },
        { cat: "Architecture & Blueprints", val: 300, q: "Which level of wireframe fidelity is a pixel-perfect mockup ready for coding?", a: "High-Fidelity (Hi-Fi)", d: ["Low-Fidelity (Lo-Fi)", "Mid-Fidelity (Mid-Fi)", "Technical Fidelity"] },
        
        { cat: "Architecture & Blueprints", val: 400, q: "In the ADDIE Model, which phase involves actually writing the HTML, CSS, and JS?", a: "Develop", d: ["Design", "Implement", "Evaluate"] },
        { cat: "Architecture & Blueprints", val: 400, q: "In the ADDIE Model, which phase involves launching the site on a web host?", a: "Implement", d: ["Develop", "Design", "Evaluate"] },
        { cat: "Architecture & Blueprints", val: 400, q: "In the ADDIE Model, which phase focuses on post-launch data analysis and feedback?", a: "Evaluate", d: ["Analyze", "Implement", "Design"] },
        
        { cat: "Architecture & Blueprints", val: 500, q: "A Sitemap is used to turn abstract User Stories into:", a: "A concrete list of HTML files you need to build.", d: ["A colorful mockup.", "A database schema.", "A CSS stylesheet."] },
        { cat: "Architecture & Blueprints", val: 500, q: "Sitemaps and Wireframes are created during which ADDIE phase?", a: "Design", d: ["Analyze", "Develop", "Implement"] },
        { cat: "Architecture & Blueprints", val: 500, q: "Which rule is standard for wireframing in the Guild?", a: "If it isn't in the wireframe, it shouldn't be in the code.", d: ["Always use at least 5 colors.", "Skip wireframes for small sites.", "Only wireframe the homepage."] },

        // --- CATEGORY 5: PATTERNS & SEO ---
        { cat: "Patterns & SEO", val: 100, q: "What methodology builds UIs like LEGOs by breaking them into smallest parts?", a: "Atomic Design", d: ["Responsive Design", "Semantic Coding", "Visual Hierarchy"] },
        { cat: "Patterns & SEO", val: 100, q: "In Atomic Design, a basic HTML tag like a <button> or <input> is considered an:", a: "Atom", d: ["Molecule", "Organism", "Template"] },
        { cat: "Patterns & SEO", val: 100, q: "In Atomic Design, a small group like a Search Form (Label + Input + Button) is a:", a: "Molecule", d: ["Atom", "Organism", "Cell"] },
        
        { cat: "Patterns & SEO", val: 200, q: "In Atomic Design, a complex section like a Site Header or Game Grid is an:", a: "Organism", d: ["Molecule", "Atom", "Ecosystem"] },
        { cat: "Patterns & SEO", val: 200, q: "Which optical scanning pattern do users use for text-heavy pages like blogs?", a: "F-Pattern", d: ["Z-Pattern", "Circular Pattern", "L-Pattern"] },
        { cat: "Patterns & SEO", val: 200, q: "Which optical scanning pattern do users use for simple, visual Homepages?", a: "Z-Pattern", d: ["F-Pattern", "Diagonal Pattern", "Random Scan"] },
        
        { cat: "Patterns & SEO", val: 300, q: "What does SEO stand for?", a: "Search Engine Optimization", d: ["Secure Element Output", "Site Error Option", "System Entry Order"] },
        { cat: "Patterns & SEO", val: 300, q: "Which HTML tag tells Google the main topic and creates the 'Blue Link' in search results?", a: "The <title> Tag", d: ["The <meta description>", "The <h1> Tag", "The <a> Tag"] },
        { cat: "Patterns & SEO", val: 300, q: "Which HTML tag acts as your 'ad snippet' under the link in search results?", a: "The <meta description>", d: ["The <title> Tag", "The <h1> Tag", "The <alt> text"] },
        
        { cat: "Patterns & SEO", val: 400, q: "According to the 'SEO Holy Trinity', how many <h1> tags should be on a single webpage?", a: "Exactly ONE", d: ["Zero", "At least three", "Unlimited"] },
        { cat: "Patterns & SEO", val: 400, q: "The search phrase 'best SNES RPGs with time travel' is an example of a:", a: "Long-Tail Keyword", d: ["Short-Tail Keyword", "Meta Tag", "Domain Alias"] },
        { cat: "Patterns & SEO", val: 400, q: "Why are Long-Tail Keywords better for a new website?", a: "They capture users with specific intent and face much lower competition.", d: ["They are shorter and easier to type.", "Google ignores short-tail keywords entirely.", "They load faster in the browser."] },
        
        { cat: "Patterns & SEO", val: 500, q: "The F-Pattern implies that users scan across the top, and then look down the:", a: "Left side.", d: ["Right side.", "Center.", "Bottom edge."] },
        { cat: "Patterns & SEO", val: 500, q: "The Z-Pattern suggests that a Call to Action (CTA) button should often be placed where?", a: "Bottom-right.", d: ["Top-left.", "Dead center.", "Top-right."] },
        { cat: "Patterns & SEO", val: 500, q: "In the SEO Holy Trinity, what is the <h1> tag used for?", a: "The one main visible headline on the webpage.", d: ["The blue link in Google.", "The hidden description text.", "The URL address."] }
    ].map(item => ({ ...item, chapter: "Chapter 3", grade: "Web Design 1" }));

    
})();