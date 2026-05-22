/**
 * CHAPTER 2: THE RULES (Web Law & Ethics)
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
        // --- CATEGORY: ACCESSIBILITY ---
        { cat: "Accessibility", val: 100, q: "Designing websites that can be used by people of all abilities.", a: "Accessibility", d: ["Scalability", "Reliability", "Portability"] },
        { cat: "Accessibility", val: 100, q: "Programmers' abbreviation for 'Accessibility'.", a: "A11Y", d: ["A10N", "UX11", "I18N"] },
        { cat: "Accessibility", val: 100, q: "Required text description for images that helps the blind and SEO.", a: "Alt Text", d: ["Hidden Text", "Sub-header", "Captions"] },
        
        { cat: "Accessibility", val: 200, q: "Acronym for Web Content Accessibility Guidelines.", a: "WCAG", d: ["W3C", "IEEE", "WAA"] },
        { cat: "Accessibility", val: 200, q: "Software that speaks web content aloud for users with low vision.", a: "Screen Reader", d: ["Voice Box", "Speaker App", "Audio UI"] },
        { cat: "Accessibility", val: 200, q: "The visual difference between text and background required for readability.", a: "Contrast Ratio", d: ["Color Index", "Visual Balance", "Saturation"] },

        { cat: "Accessibility", val: 300, q: "Is color alone allowed to be used to convey information?", a: "No", d: ["Yes", "Only for buttons", "Only in mobile apps"] },
        { cat: "Accessibility", val: 300, q: "Does A11Y include making sites usable for users with slow internet?", a: "Yes", d: ["No, only blindness", "No, only hearing", "No, that is speed SEO"] },
        { cat: "Accessibility", val: 300, q: "The three levels of WCAG compliance.", a: "A, AA, AAA", d: ["1, 2, 3", "Low, Med, High", "Bronze, Silver, Gold"] },

        { cat: "Accessibility", val: 400, q: "The logic sequence a user follows when using the 'Tab' key to navigate.", a: "Tab Order", d: ["Key Logic", "Focus Flow", "Link Stack"] },
        { cat: "Accessibility", val: 400, q: "Does Section 508 require government websites to be accessible?", a: "Yes", d: ["No", "Only the White House", "Only for employees"] },
        { cat: "Accessibility", val: 400, q: "Is the <h1> tag considered an accessibility feature for screen readers?", a: "Yes", d: ["No, it is only style", "No, it is for colors", "Only for the footer"] },

        { cat: "Accessibility", val: 500, q: "Should decorative images have an empty alt attribute (alt='')?", a: "Yes", d: ["No, describe the decor", "No, use a space", "No, use alt='decor'"] },
        { cat: "Accessibility", val: 500, q: "The minimum touch target size for mobile buttons to avoid errors.", a: "44px", d: ["10px", "100px", "24px"] },
        { cat: "Accessibility", val: 500, q: "A tool used by websites to tell humans and bots apart.", a: "CAPTCHA", d: ["CORS", "API", "SSL"] },

        // --- CATEGORY: COPYRIGHT ---
        { cat: "Copyright", val: 100, q: "Legal protection for original creative works fixed in a tangible form.", a: "Copyright", d: ["Trademark", "Patent", "NDA"] },
        { cat: "Copyright", val: 100, q: "Using someone else's work without providing proper credit.", a: "Plagiarism", d: ["Piracy", "Infringement", "Cloning"] },
        { cat: "Copyright", val: 100, q: "Unauthorized copying and distribution of software or media.", a: "Piracy", d: ["Plagiarism", "Leaking", "Streaming"] },

        { cat: "Copyright", val: 200, q: "Is copyright granted automatically the moment you create something?", a: "Yes", d: ["No, must mail a letter", "No, must pay a fee", "No, must use a lawyer"] },
        { cat: "Copyright", val: 200, q: "Creative works whose copyright has expired or never existed.", a: "Public Domain", d: ["Open Source", "Creative Commons", "Fair Use"] },
        { cat: "Copyright", val: 200, q: "Is it legal to use any image found on Google for free?", a: "No", d: ["Yes, if you link it", "Yes, it is public", "Yes, for education"] },

        { cat: "Copyright", val: 300, q: "The acronym for flexible copyright licenses that allow sharing.", a: "CC", d: ["©", "TM", "EULA"] },
        { cat: "Copyright", val: 300, q: "A limited legal defense for using copyrighted material for education or news.", a: "Fair Use", d: ["Public Domain", "Open Source", "Free Choice"] },
        { cat: "Copyright", val: 300, q: "Can you copyright a simple list of ingredients (a recipe)?", a: "No", d: ["Yes, if it's tasty", "Yes, if it's original", "Only in books"] },

        { cat: "Copyright", val: 400, q: "The illegal use of a copyrighted work.", a: "Infringement", d: ["Plagiarism", "Validation", "Drafting"] },
        { cat: "Copyright", val: 400, q: "Payment made to a creator for the right to use their work.", a: "Royalty", d: ["Salary", "Bonus", "Grant"] },
        { cat: "Copyright", val: 400, q: "Can you copyright an idea before it is written down?", a: "No", d: ["Yes", "Only in the US", "Only for inventions"] },

        { cat: "Copyright", val: 500, q: "A license where you can share the work but cannot change it.", a: "NoDerivatives", d: ["NonCommercial", "ShareAlike", "PublicDomain"] },
        { cat: "Copyright", val: 500, q: "Does 'Fair Use' allow using an entire song as a background?", a: "No", d: ["Yes, for education", "Yes, for parody", "Yes, if low volume"] },
        { cat: "Copyright", val: 500, q: "Legal protection for new inventions like hardware or code logic.", a: "Patent", d: ["Copyright", "Trademark", "NDA"] },

        // --- CATEGORY: LAWS ---
        { cat: "Laws", val: 100, q: "The major European data privacy and protection regulation.", a: "GDPR", d: ["COPPA", "ADA", "HIPAA"] },
        { cat: "Laws", val: 100, q: "US law protecting the online privacy of children under 13.", a: "COPPA", d: ["GDPR", "FERPA", "CIPA"] },
        { cat: "Laws", val: 100, q: "The Americans with Disabilities Act.", a: "ADA", d: ["A11Y", "W3C", "NASA"] },

        { cat: "Laws", val: 200, q: "Does GDPR apply to websites located outside of Europe?", a: "Yes", d: ["No", "Only for banks", "Only for schools"] },
        { cat: "Laws", val: 200, q: "The right in GDPR to have your data deleted from a server.", a: "Right to be Forgotten", d: ["Right to Privacy", "Right to Edit", "Right to Log"] },
        { cat: "Laws", val: 200, q: "Is a 'Privacy Policy' required by law on sites that take data?", a: "Yes", d: ["No, it's a courtesy", "No, it's optional", "Only in the UK"] },

        { cat: "Laws", val: 300, q: "The idea that all internet data should be treated equally by ISPs.", a: "Net Neutrality", d: ["Web Equality", "Data Fairness", "Bandwidth Law"] },
        { cat: "Laws", val: 300, q: "Legal protection for brand names, logos, and slogans.", a: "Trademark", d: ["Copyright", "Patent", "License"] },
        { cat: "Laws", val: 300, q: "A legally binding secrecy contract used in professional work.", a: "NDA", d: ["EULA", "ToS", "MOU"] },

        { cat: "Laws", val: 400, q: "Is 'Cookie Consent' a mandatory law across the whole USA?", a: "No", d: ["Yes", "Only in Florida", "Only for kids"] },
        { cat: "Laws", val: 400, q: "Legally binding rules for using a specific website.", a: "Terms of Service (ToS)", d: ["Privacy Policy", "EULA", "Disclaimer"] },
        { cat: "Laws", val: 400, q: "The contract you agree to when installing software.", a: "EULA", d: ["ToS", "NDA", "MOU"] },

        { cat: "Laws", val: 500, q: "A crime committed with a keyboard and mouse rather than a mask.", a: "White Collar Crime", d: ["Blue Collar Crime", "Street Crime", "Hard Crime"] },
        { cat: "Laws", val: 500, q: "The legal protection for sites from content posted by users.", a: "Safe Harbor", d: ["Public Domain", "Fair Use", "Privacy Guard"] },
        { cat: "Laws", val: 500, q: "Gathering large sets of user info for analysis, often for profit.", a: "Data Mining", d: ["Data Scraping", "Data Phishing", "Data Caching"] },

        // --- CATEGORY: ETHICS ---
        { cat: "Ethics", val: 100, q: "Moral principles that guide behavior in web design.", a: "Ethics", d: ["Laws", "Rules", "Habits"] },
        { cat: "Ethics", val: 100, q: "A deceptive UI meant to trick users into doing something.", a: "Dark Pattern", d: ["Bright Pattern", "Logic Loop", "UI Boost"] },
        { cat: "Ethics", val: 100, q: "The digital trail of data we leave behind every day.", a: "Digital Footprint", d: ["Cookie Path", "Browser Log", "Search History"] },

        { cat: "Ethics", val: 200, q: "A major societal concern regarding AI and automation taking jobs.", a: "Job Displacement", d: ["Internet Speed", "Screen Size", "RAM Usage"] },
        { cat: "Ethics", val: 200, q: "Systematically prejudiced results caused by flawed training data.", a: "Algorithmic Bias", d: ["Code Glitch", "Syntax Error", "Logic Loop"] },
        { cat: "Ethics", val: 200, q: "Information that can be used on its own to identify a person.", a: "PII", d: ["URL", "ISP", "API"] },

        { cat: "Ethics", val: 300, q: "The 'Right to be Forgotten' is part of which law?", a: "GDPR", d: ["COPPA", "ADA", "FERPA"] },
        { cat: "Ethics", val: 300, q: "Is whistleblowing generally protected by ethics but legally risky?", a: "Yes", d: ["No, it's safe", "No, it's a crime", "No, it's fake"] },
        { cat: "Ethics", val: 300, q: "The UN considers information privacy to be one of these.", a: "Human Right", d: ["Luxury", "Option", "Privilege"] },

        { cat: "Ethics", val: 400, q: "A 'Bait and Switch' where a site changes a free offer to a paid one.", a: "Dark Pattern", d: ["Sales Funnel", "A/B Test", "UI Style"] },
        { cat: "Ethics", val: 400, q: "Can you be fired for what you post on social media?", a: "Yes", d: ["No, free speech", "No, private site", "No, illegal"] },
        { cat: "Ethics", val: 400, q: "Stealing info via fake websites designed to look real.", a: "Phishing", d: ["Mining", "Cashing", "Crawling"] },

        { cat: "Ethics", val: 500, q: "The process of fixing security holes found by ethical hackers.", a: "Penetration Testing", d: ["Unit Testing", "Stress Testing", "A/B Testing"] },
        { cat: "Ethics", val: 500, q: "Are ethics and laws interchangeable terms in a courtroom?", a: "No", d: ["Yes", "Only in the UK", "Only for AI"] },
        { cat: "Ethics", val: 500, q: "The process of scrambling data into a secret code for safety.", a: "Encryption", d: ["Compression", "Minification", "Formatting"] }
    ].map(item => ({ ...item, chapter: "Chapter 2", grade: "Web Design 1" })));
    
})();