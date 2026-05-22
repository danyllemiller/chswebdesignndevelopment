/**
 * CHAPTER 16: Ethics, Privacy, and the Law
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
        // --- CATEGORY: INTELLECTUAL PROPERTY ---
        { cat: "Intellectual Property", val: 100, q: "What is Intellectual Property (IP)?", a: "Digital creations of the mind, such as code, art, and inventions", d: ["The physical land owned by a company", "The hardware inside a computer", "A type of network router"] },
        { cat: "Intellectual Property", val: 100, q: "What does Copyright protect?", a: "Original works of authorship like code, photos, and music", d: ["A new invention or physical machine", "A company's logo or brand name", "The speed of a Wi-Fi connection"] },
        { cat: "Intellectual Property", val: 100, q: "What does a Trademark protect?", a: "Brands and logos", d: ["Inventions", "Original works of authorship", "Personal data"] },

        { cat: "Intellectual Property", val: 200, q: "What does a Patent protect?", a: "Inventions or processes", d: ["A song or poem", "A company's brand name", "Open source code"] },
        { cat: "Intellectual Property", val: 200, q: "What is Digital Piracy?", a: "Unauthorized copying or distribution of copyrighted material", d: ["Sailing a boat to steal computers", "Hiding data using encryption", "Using a VPN on public Wi-Fi"] },
        { cat: "Intellectual Property", val: 200, q: "What is 'Fair Use'?", a: "A legal safety net allowing use of copyrighted material for education or parody", d: ["The right to steal any software", "A rule making internet free", "A software license for games"] },

        { cat: "Intellectual Property", val: 300, q: "In the Fair Use test, what does 'Purpose' evaluate?", a: "Whether the use is for education or to make money", d: ["How old the creator is", "What language the code is in", "How much RAM the software uses"] },
        { cat: "Intellectual Property", val: 300, q: "In the Fair Use test, what does 'Effect' evaluate?", a: "Will your use stop the original creator from making money?", d: ["Will the software crash", "Will the computer overheat", "Will the image look pixelated"] },
        { cat: "Intellectual Property", val: 300, q: "What is a 'Beneficial Effect' of IP laws?", a: "Protecting a creator's income to encourage innovation", d: ["Making software more expensive", "Slowing down the internet", "Allowing free data copying"] },

        { cat: "Intellectual Property", val: 400, q: "What is a 'Harmful Effect' of overly strict IP laws?", a: "Slowing down new inventions due to fear of lawsuits", d: ["Helping hackers steal passwords", "Increasing battery life", "Making the internet run faster"] },
        { cat: "Intellectual Property", val: 400, q: "If you add a funny caption to a copyrighted movie screenshot for a school project, this is likely:", a: "Fair Use as a Transformative Work", d: ["Digital Piracy", "A Patent violation", "A Trademark violation"] },
        { cat: "Intellectual Property", val: 400, q: "Which IP protection applies to the custom Google Apps Script code you wrote?", a: "Copyright", d: ["Trademark", "Patent", "MIT License"] },

        { cat: "Intellectual Property", val: 500, q: "What is a 'Transformative Work' in copyright law?", a: "A piece of media that changes the original so much it creates a new meaning", d: ["An exact 1:1 copy of a movie", "A stolen password", "A corrupted flat file"] },
        { cat: "Intellectual Property", val: 500, q: "Which IP protection applies to a brand new physical data compression machine?", a: "Patent", d: ["Trademark", "Copyright", "Fair Use"] },
        { cat: "Intellectual Property", val: 500, q: "Which IP protection applies to the 'CHS' shield on a website?", a: "Trademark", d: ["Patent", "Copyright", "GPL License"] },

        // --- CATEGORY: SOFTWARE LICENSES ---
        { cat: "Software Licenses", val: 100, q: "What is 'Proprietary Software'?", a: "Software where the source code is a secret and owned by a company", d: ["Software that is free to change", "Software used by the government", "Software that fixes hardware"] },
        { cat: "Software Licenses", val: 100, q: "What is 'Open Source Software'?", a: "Software where the source code is public and anyone can change it", d: ["Software that costs thousands", "Software that is illegal", "Software that deletes viruses"] },
        { cat: "Software Licenses", val: 100, q: "What is a Software License?", a: "A legal agreement you must follow when using someone else's code", d: ["A physical card in your wallet", "A test to become a programmer", "A tool that generates passwords"] },

        { cat: "Software Licenses", val: 200, q: "Why do programmers use code 'Libraries'?", a: "To speed up development by leveraging the work of others", d: ["To slow down the CPU intentionally", "To hide their IP address", "To make their code unreadable"] },
        { cat: "Software Licenses", val: 200, q: "Why is Open Source considered the engine of the modern web?", a: "It allows developers to collaborate and fix bugs much faster", d: ["It runs without electricity", "It hides data from hackers", "It increases web design costs"] },
        { cat: "Software Licenses", val: 200, q: "What is an ethical responsibility when using a free open-source library?", a: "Following their license rules and giving them credit", d: ["Selling their code", "Deleting the author's name", "Hacking their server"] },

        { cat: "Software Licenses", val: 300, q: "What characterizes the MIT License?", a: "It is very permissive as long as you keep the original copyright notice", d: ["It strictly forbids commercial use", "It forces a hard drive format", "It requires a subscription fee"] },
        { cat: "Software Licenses", val: 300, q: "What characterizes the GPL (General Public License)?", a: "Any new app you build using its code must also be Open Source", d: ["It hides your code", "It is only for proprietary software", "It deletes browser history"] },
        { cat: "Software Licenses", val: 300, q: "What are Creative Commons (CC) licenses mostly used for?", a: "Art and media, often setting rules on commercial use", d: ["Secret databases", "Physical hardware components", "Network routers"] },

        { cat: "Software Licenses", val: 400, q: "If you want to legally use an image in an app you plan to sell, what should you search for?", a: "Creative Commons / Usage Rights", d: ["The most popular image", "An image with a watermark", "A classified document"] },
        { cat: "Software Licenses", val: 400, q: "Why might a small tech team choose to use Open Source libraries?", a: "To focus on their unique app idea rather than reinventing the wheel", d: ["Because it is illegal to write code", "To intentionally slow the app", "Because proprietary software is gone"] },
        { cat: "Software Licenses", val: 400, q: "If you want to share your art for free but forbid anyone from selling it, what license should you use?", a: "Creative Commons Non-Commercial", d: ["MIT License", "GPL License", "Proprietary License"] },

        { cat: "Software Licenses", val: 500, q: "When downloading 'cracked' proprietary software to avoid paying, what security threat are you risking?", a: "Installing a Trojan with a hidden backdoor", d: ["Deleting the internet", "A DDoS attack", "Triggering a power outage"] },
        { cat: "Software Licenses", val: 500, q: "Why is digital piracy harmful to the software industry?", a: "It steals the potential income that rewards a creator's hard work", d: ["It uses up all internet bandwidth", "It introduces bugs into code", "It makes software run too fast"] },
        { cat: "Software Licenses", val: 500, q: "If you delete the original author's name from an MIT licensed library to make it 'look cleaner', you have:", a: "Violated the ethical and legal terms of the license", d: ["Optimized the code", "Improved the UX", "Compressed the file size"] },

        // --- CATEGORY: AUTOMATED DATA ---
        { cat: "Automated Data", val: 100, q: "What is 'Automated Data Collection'?", a: "Computers collecting data like location without you clicking 'Save'", d: ["A robot organizing files", "Deleting old photos automatically", "Downloading a game"] },
        { cat: "Automated Data", val: 100, q: "What are 'Cookies' on the internet?", a: "Small text files stored in your browser to remember you and track your habits", d: ["Viruses that destroy your drive", "A type of network cable", "A physical hardware component"] },
        { cat: "Automated Data", val: 100, q: "Why do websites use 'Cookies' even if they aren't selling your data?", a: "To keep you logged in and remember your site preferences", d: ["To make the site colorful", "To block viruses", "To turn off your monitor"] },

        { cat: "Automated Data", val: 200, q: "How do many apps create a 'Digital Map' of your life?", a: "By tracking GPS and using Background Refresh", d: ["By asking you to draw a map", "By turning on the microphone", "By increasing screen brightness"] },
        { cat: "Automated Data", val: 200, q: "What is a major personal risk of a company tracking your GPS location 24/7?", a: "A loss of personal privacy and security", d: ["Your phone runs out of storage", "The satellite will crash", "Your screen will get burned in"] },
        { cat: "Automated Data", val: 200, q: "What is the 'Hidden Collection'?", a: "Data gathered behind the scenes without explicit user prompts", d: ["A secret folder on the desktop", "A dark web site", "A physical data server"] },

        { cat: "Automated Data", val: 300, q: "How do 'Free' apps like TikTok or Instagram make billions of dollars?", a: "By collecting and selling your personal data to advertisers", d: ["By charging a hidden fee", "By selling physical merchandise", "By asking for donations"] },
        { cat: "Automated Data", val: 300, q: "If an app claims to be completely 'Free,' what should a Power User ask?", a: "How are they monetizing my data?", d: ["How fast is the code?", "What color is the logo?", "How much does the app weigh?"] },
        { cat: "Automated Data", val: 300, q: "In the modern data economy, what is the role of the user?", a: "The user is not the customer; the user is the product", d: ["The user is the CEO", "The user is the developer", "The user is completely invisible"] },

        { cat: "Automated Data", val: 400, q: "What does 'Background Refresh' do that impacts privacy?", a: "Allows apps to send data like your location even when you aren't using them", d: ["Deletes your photos", "Updates your Operating System", "Charges your battery faster"] },
        { cat: "Automated Data", val: 400, q: "Why do companies want to keep you scrolling on their apps for as long as possible?", a: "To capture more data and show you more advertisements", d: ["To help you learn more facts", "To drain your battery on purpose", "Because they want you to be happy"] },
        { cat: "Automated Data", val: 400, q: "What is the tradeoff when agreeing to a 50-page Terms of Service without reading it?", a: "Trading your privacy for immediate convenience", d: ["Trading your money for Wi-Fi", "Trading your computer for a phone", "Trading your password for a username"] },

        { cat: "Automated Data", val: 500, q: "How do cookies 'track' you across the web?", a: "Third-party cookies follow your activity on multiple sites to build an advertising profile", d: ["They use your webcam to watch you", "They hack your Wi-Fi password", "They read your private emails"] },
        { cat: "Automated Data", val: 500, q: "What is 'Jurisdiction' in regards to data storage?", a: "The country where the server is located, which determines what privacy laws apply", d: ["The password strength required", "The brand of the hardware", "The name of the database folder"] },
        { cat: "Automated Data", val: 500, q: "As a Logic Builder, what is your ethical responsibility regarding user data?", a: "To be transparent, secure, and respect user privacy", d: ["To sell it to the highest bidder", "To hide how the data is used", "To collect as much as possible"] },

        // --- CATEGORY: PRIVACY LAWS ---
        { cat: "Privacy Laws", val: 100, q: "What is COPPA?", a: "A U.S. law that prevents companies from collecting data on kids under 13 without parental consent", d: ["A law making internet free", "A tool used to write HTML", "A type of computer virus"] },
        { cat: "Privacy Laws", val: 100, q: "Why do many social media sites require users to be at least 13 years old?", a: "To comply with COPPA regulations", d: ["13-year-olds have more money", "The apps are too complex for kids", "To save server storage space"] },
        { cat: "Privacy Laws", val: 100, q: "What is the GDPR?", a: "A strict European law that protects user data and requires transparency", d: ["A network protocol for emails", "A type of open-source license", "A brand of physical servers"] },

        { cat: "Privacy Laws", val: 200, q: "What does the GDPR 'Right to be Forgotten' do?", a: "It forces companies to delete your data if you ask them to", d: ["It deletes your memory of a site", "It makes your IP invisible", "It clears browser cache automatically"] },
        { cat: "Privacy Laws", val: 200, q: "Under GDPR, what must a company provide regarding data collection?", a: "Transparency about exactly what they are collecting and why", d: ["Free laptops to all users", "A printed software manual", "A monthly payment to the user"] },
        { cat: "Privacy Laws", val: 200, q: "Why was COPPA created?", a: "To protect vulnerable children from predatory data collection practices", d: ["To stop kids from playing games", "To sell more advertisements", "To increase Wi-Fi speeds"] },

        { cat: "Privacy Laws", val: 300, q: "Why does the 'Right to be Forgotten' cause a cultural conflict between the US and Europe?", a: "The US values freedom of information, while Europe places a higher value on digital privacy", d: ["The US hates the internet", "Europe doesn't have fiber-optics", "The law requires translation"] },
        { cat: "Privacy Laws", val: 300, q: "Why is enforcing the 'Right to be Forgotten' difficult on a global network?", a: "A server in a country without the law might refuse to delete the data", d: ["Computers don't have delete buttons", "Data is too heavy to move", "Hackers block the commands"] },
        { cat: "Privacy Laws", val: 300, q: "If you live in Europe (under GDPR), what specific power do you have over Facebook?", a: "The right to demand they erase your digital history", d: ["The right to own their stock", "The right to hack their servers", "The right to free internet"] },

        { cat: "Privacy Laws", val: 400, q: "Why is it nearly impossible to truly delete something from the internet?", a: "Data is constantly copied and backed up to multiple servers globally", d: ["Users forget their passwords", "The internet is too slow", "Computers refuse to delete files"] },
        { cat: "Privacy Laws", val: 400, q: "How does 'Transparency' work in modern data laws?", a: "Companies must use plain language to tell users how their data is monetized", d: ["They must make hardware clear", "They must use invisible text", "They must open source all code"] },
        { cat: "Privacy Laws", val: 400, q: "What forces U.S. companies to follow European GDPR rules?", a: "If they want European users to access their app, they must obey EU laws", d: ["The U.S. government", "Hardware limitations", "IP Addresses"] },

        { cat: "Privacy Laws", val: 500, q: "How does jurisdiction complicate privacy laws?", a: "A company in Russia might not care about a privacy law passed in the US or EU", d: ["It makes computers run slower", "It changes the binary code", "It forces language translation"] },
        { cat: "Privacy Laws", val: 500, q: "What is the main penalty for companies that violate GDPR?", a: "Massive financial fines that can cost billions of dollars", d: ["They have to write essays", "They lose their keyboards", "They get a computer virus"] },
        { cat: "Privacy Laws", val: 500, q: "If a data broker collects your info legally, what happens when a new privacy law passes?", a: "Complex legal battles occur over whether the old historical data must be purged", d: ["The internet reboots entirely", "The hardware is destroyed", "The data turns back to binary"] },

        // --- CATEGORY: ETHICS & IMPLICATIONS ---
        { cat: "Ethics & Implications", val: 100, q: "What is the 'Privacy Paradox'?", a: "People say they care about privacy but quickly trade their data for a free app or funny filter", d: ["The internet is safe and dangerous", "Cookies are delicious and tracking", "A computer crash deletes all data"] },
        { cat: "Ethics & Implications", val: 100, q: "What is a 'Digital Footprint'?", a: "The permanent trail of data, searches, and posts you leave behind online", d: ["The size of your shoe", "The physical weight of your PC", "The electricity you use"] },
        { cat: "Ethics & Implications", val: 100, q: "What does it mean when we say data is 'the new oil'?", a: "It is the most valuable resource driving the modern digital economy", d: ["It makes computers slippery", "It is a fossil fuel", "It comes from the ground"] },

        { cat: "Ethics & Implications", val: 200, q: "If an employer looks at your 'digital footprint,' what are they doing?", a: "Judging you based on past social media posts and online behavior", d: ["Checking the physical size of shoes", "Measuring how fast you type", "Looking at hard drive serials"] },
        { cat: "Ethics & Implications", val: 200, q: "How can a biased data model affect your future opportunities?", a: "It might charge you more for insurance or deny you a loan based on your data footprint", d: ["It makes phone battery drain faster", "It deletes your photos", "It forces you to change browsers"] },
        { cat: "Ethics & Implications", val: 200, q: "Why do people often ignore 50-page Terms of Service agreements?", a: "The friction of reading it outweighs their immediate desire for convenience", d: ["They are written in binary", "They crash the screen", "They cost money to read"] },

        { cat: "Ethics & Implications", val: 300, q: "What is the ethical tradeoff of a 'Free' fitness tracking app?", a: "You get free health insights, but the company knows your exact location and daily habits", d: ["Free internet but slower CPU", "Free hardware but no screen", "Free battery but no charger"] },
        { cat: "Ethics & Implications", val: 300, q: "What happens to your digital footprint when you delete an app from your phone?", a: "The app is gone locally, but your historical data is likely still on their servers", d: ["The data explodes", "Your phone forgets you", "The internet breaks"] },
        { cat: "Ethics & Implications", val: 300, q: "If a health app sells data showing a user rarely exercises, what is a potential economic consequence?", a: "Their health insurance provider might increase their monthly rates", d: ["Their phone gets heavier", "They get banned from Google", "Their screen cracks"] },

        { cat: "Ethics & Implications", val: 400, q: "As a Logic Builder, what is your ethical responsibility if your boss asks you to secretly collect user GPS data?", a: "To raise ethical/legal concerns about transparency and user consent", d: ["To do it silently", "To sell it yourself", "To crash the server"] },
        { cat: "Ethics & Implications", val: 400, q: "How does the 'Price of Free' impact societal inequality?", a: "Wealthy users can buy privacy-focused apps, while low-income users must trade their data for access", d: ["It makes everyone rich", "It destroys the internet", "It uses too much electricity"] },
        { cat: "Ethics & Implications", val: 400, q: "Why is the Privacy Paradox a psychological problem for UI designers?", a: "They must figure out how to make users actually care about privacy settings before clicking 'Accept'", d: ["They have to build faster RAM", "They have to write more HTML", "They have to use CSS styling"] },

        { cat: "Ethics & Implications", val: 500, q: "If a company makes money selling your data, why is the concept of 'Data Ownership' a massive ethical debate?", a: "Because users generate the value but receive none of the profits", d: ["Because servers are expensive", "Because hardware is free", "Because binary is just 1s and 0s"] },
        { cat: "Ethics & Implications", val: 500, q: "Why do some ethicists argue that true privacy is now a 'Luxury Good'?", a: "Because opting out of data-harvesting ecosystems often requires paying premium subscription fees", d: ["Because smartphones are gold-plated", "Because the internet costs a million dollars", "Because cookies are expensive to bake"] },
        { cat: "Ethics & Implications", val: 500, q: "How does Automated Data Collection blur the line between public and private spaces?", a: "Your physical movements in the real world are constantly logged and stored in corporate databases", d: ["It puts cameras in your eyes", "It deletes the real world", "It builds a physical wall"] }
    ].map(item => ({ ...item, chapter: "Chapter 16", grade: "CS & Literacy Guild" })));
    
})();