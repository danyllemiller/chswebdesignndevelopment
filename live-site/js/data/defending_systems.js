/**
 * CHAPTER 6: Defending Systems
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
        // --- CATEGORY: AUTHENTICATION & AUTHORIZATION ---
        { cat: "Authentication & Authorization", val: 100, q: "What does MFA stand for?", a: "Multi-Factor Authentication", d: ["Malware Firewall Application", "Main File Access", "Multiple Format Algorithm"] },
        { cat: "Authentication & Authorization", val: 100, q: "What is the 'Principle of Least Privilege'?", a: "Only giving users the minimum access they absolutely need to do their job.", d: ["Giving everyone admin rights to save time.", "Hiding passwords on sticky notes.", "Paying the lowest price for software."] },
        { cat: "Authentication & Authorization", val: 100, q: "Fingerprint scanners and FaceID are examples of what technology?", a: "Biometrics", d: ["Cryptography", "Phishing", "Two-Way Routers"] },

        { cat: "Authentication & Authorization", val: 200, q: "Why are basic passwords often considered the 'weakest link' in security?", a: "Because human users frequently choose short, easy-to-guess passwords.", d: ["Because computers forget them easily.", "Because they take up too much RAM.", "Because they cannot contain numbers."] },
        { cat: "Authentication & Authorization", val: 200, q: "What are the three common 'Factors' used in MFA?", a: "Something you know, Something you have, Something you are.", d: ["Hardware, Software, Network.", "Plan, Design, Build.", "Public, Private, Guest."] },
        { cat: "Authentication & Authorization", val: 200, q: "A verification code sent via text message to your phone is an example of which MFA factor?", a: "Something you have", d: ["Something you know", "Something you are", "Something you build"] },

        { cat: "Authentication & Authorization", val: 300, q: "Why are biometrics considered an incredibly strong security measure?", a: "Your physical traits, like a fingerprint, never change and are very difficult to steal.", d: ["They automatically delete computer viruses.", "They are required by international law.", "They make the internet run much faster."] },
        { cat: "Authentication & Authorization", val: 300, q: "How does the Principle of Least Privilege protect a network from malware?", a: "If a standard user's account gets hacked, the malware cannot access admin-level controls.", d: ["It unplugs the computer automatically.", "It encrypts the hacker's computer.", "It changes the Wi-Fi password hourly."] },
        { cat: "Authentication & Authorization", val: 300, q: "If a student can view their grades but cannot edit them, what security principle is being applied?", a: "The Principle of Least Privilege", d: ["Biometric Scanning", "Virtual Private Networking", "Data Exfiltration"] },

        { cat: "Authentication & Authorization", val: 400, q: "What is the difference between 'Authentication' and 'Authorization'?", a: "Authentication proves WHO you are; Authorization determines WHAT you can do.", d: ["Authentication is for hardware; Authorization is for software.", "They are two words for the exact same thing.", "Authentication uses passwords; Authorization uses networks."] },
        { cat: "Authentication & Authorization", val: 400, q: "How does MFA stop a hacker who has successfully stolen your password?", a: "The hacker still needs your physical phone or fingerprint to complete the login.", d: ["The password is automatically changed.", "The computer will shut down.", "The hacker is locked out for 10 years."] },
        { cat: "Authentication & Authorization", val: 400, q: "What is an 'Authenticator App'?", a: "An app that generates temporary, time-based codes to serve as a second login factor.", d: ["An app that creates viruses.", "A game used to train hackers.", "An app that tests your Wi-Fi speed."] },

        { cat: "Authentication & Authorization", val: 500, q: "Why is storing biometric data in a database considered a massive ethical risk for a company?", a: "Unlike a password, a user cannot easily change their fingerprint or face if the database is breached.", d: ["Biometric data takes up terabytes of storage space.", "It is illegal to look at a fingerprint.", "It makes the computer run too slow to be useful."] },
        { cat: "Authentication & Authorization", val: 500, q: "Giving a brand new employee 'Admin' access to all servers on day one violates which core security rule?", a: "The Principle of Least Privilege", d: ["The Rule of 3-2-1 Backups", "The Dry Principle", "Zero-Based Indexing"] },
        { cat: "Authentication & Authorization", val: 500, q: "How do modern smartphones handle the storage of biometric data to keep it safe?", a: "The data is converted into a mathematical 'hash' and stored on a secure, encrypted chip locally.", d: ["They post the data to a public cloud.", "They email it to the phone company.", "They print it on the battery."] },

        // --- CATEGORY: THE DIGITAL PERIMETER ---
        { cat: "The Digital Perimeter", val: 100, q: "What acts as the 'Security Guard' inspecting traffic at the edge of a network?", a: "A Firewall", d: ["A Monitor", "A USB Drive", "A Web Browser"] },
        { cat: "The Digital Perimeter", val: 100, q: "What does VPN stand for?", a: "Virtual Private Network", d: ["Visual Public Node", "Verified Password Name", "Variable Port Number"] },
        { cat: "The Digital Perimeter", val: 100, q: "What is the primary purpose of Data Encryption?", a: "Scrambling data so it cannot be read without a secret 'key'.", d: ["Deleting old files automatically.", "Making the computer run faster.", "Fixing broken hardware components."] },

        { cat: "The Digital Perimeter", val: 200, q: "How does a Firewall protect a local network from the internet?", a: "By inspecting incoming and outgoing data packets and blocking unauthorized traffic.", d: ["By physically heating up the cables.", "By guessing user passwords.", "By shutting off the Wi-Fi at night."] },
        { cat: "The Digital Perimeter", val: 200, q: "What does a VPN do when you connect to a public Wi-Fi network?", a: "It creates a secure, encrypted 'tunnel' to hide your data from other people on the network.", d: ["It gives you free coffee.", "It blocks all websites.", "It makes your computer screen invisible."] },
        { cat: "The Digital Perimeter", val: 200, q: "What does 'HTTPS' in a web address indicate to the user?", a: "The connection between the browser and the website is encrypted and secure.", d: ["The website is highly dangerous.", "The website contains video files.", "The server is currently offline."] },

        { cat: "The Digital Perimeter", val: 300, q: "What is the major risk of checking your bank account on public Wi-Fi without a VPN?", a: "Hackers on the same network can 'sniff' and steal your unencrypted data.", d: ["Your bank will delete your account.", "Your computer will overheat.", "The coffee shop will charge you money."] },
        { cat: "The Digital Perimeter", val: 300, q: "How do Firewalls use digital 'Ports' to keep a computer safe?", a: "They act like loading docks, opening only specific ports for needed data and locking the rest.", d: ["They use them to charge the battery.", "They use them to connect mice and keyboards.", "They plug them into the wall."] },
        { cat: "The Digital Perimeter", val: 300, q: "If a hacker steals an encrypted file but doesn't have the decryption key, what do they see?", a: "Gibberish or scrambled, unreadable data.", d: ["The password to the file.", "A video explaining the file.", "The computer's source code."] },

        { cat: "The Digital Perimeter", val: 400, q: "What does 'End-to-End Encryption' mean in a messaging app?", a: "Only the sender and receiver can read the message; not even the app company can read it.", d: ["The message is deleted after reading.", "The message is sent backwards.", "The message is broadcast to everyone."] },
        { cat: "The Digital Perimeter", val: 400, q: "In the 'Securing the Home Router' lab, why must you change the default admin password?", a: "Hackers know factory default passwords and can easily take over the router if left unchanged.", d: ["Because the router won't turn on otherwise.", "To make the internet run faster.", "Because the factory password is too long."] },
        { cat: "The Digital Perimeter", val: 400, q: "What is WPA3?", a: "The strongest, most modern encryption standard used for securing Wi-Fi networks.", d: ["A type of computer virus.", "A hardware firewall.", "A social engineering attack."] },

        { cat: "The Digital Perimeter", val: 500, q: "Why should you set up a 'Guest Network' on your home router for visitors?", a: "To give them internet access without letting them see your private files and smart devices.", d: ["To charge them money for Wi-Fi.", "To make their internet run faster than yours.", "To track their physical location."] },
        { cat: "The Digital Perimeter", val: 500, q: "How does a VPN hide your physical location from the websites you visit?", a: "It routes your traffic through a remote server, masking your real IP address.", d: ["It turns off your GPS chip.", "It deletes your web history.", "It puts your computer in Airplane Mode."] },
        { cat: "The Digital Perimeter", val: 500, q: "In cryptography, what is 'Ciphertext'?", a: "The scrambled, unreadable result of running plaintext data through an encryption algorithm.", d: ["A text message sent to a phone.", "A hidden computer virus.", "The font used by programmers."] },

        // --- CATEGORY: SECURITY VS. USABILITY ---
        { cat: "Security vs. Usability", val: 100, q: "What is the 'Friction of Security'?", a: "The extra work or annoyance users face when security measures are added to a system.", d: ["The heat generated by the CPU.", "The physical weight of a firewall.", "The cost of buying antivirus software."] },
        { cat: "Security vs. Usability", val: 100, q: "Why do users often complain about or dislike high-security systems?", a: "Because strict security makes systems harder, slower, and more frustrating to use.", d: ["Because security uses too much electricity.", "Because it changes the colors of the screen.", "Because security is illegal."] },
        { cat: "Security vs. Usability", val: 100, q: "What is 'Security Fatigue'?", a: "When users get tired of complex security rules and start finding dangerous workarounds.", d: ["When a computer is too tired to turn on.", "When an antivirus program stops working.", "When a hacker gives up."] },

        { cat: "Security vs. Usability", val: 200, q: "What is a dangerous workaround commonly caused by overly complex password rules?", a: "Writing the password on a sticky note attached to the computer monitor.", d: ["Using a VPN.", "Enabling Multi-Factor Authentication.", "Locking the computer screen."] },
        { cat: "Security vs. Usability", val: 200, q: "According to the tradeoff principle, as security goes up, what usually goes down?", a: "Usability and Convenience.", d: ["Data Protection.", "Hardware Cost.", "Screen Brightness."] },
        { cat: "Security vs. Usability", val: 200, q: "Which of the following apps requires High Security and Low Usability?", a: "A Banking or Financial App.", d: ["A Public Weather App.", "A Calculator App.", "A Flashlight App."] },

        { cat: "Security vs. Usability", val: 300, q: "Which of the following apps requires High Usability and Low Security?", a: "A Public Weather or News App.", d: ["A Medical Records App.", "A Military Database.", "A School Gradebook."] },
        { cat: "Security vs. Usability", val: 300, q: "How can Biometrics (like FaceID) help solve the Security vs. Usability tradeoff?", a: "They provide very high security with very low friction or effort for the user.", d: ["They guess the password for you.", "They remove all security completely.", "They turn off the firewall."] },
        { cat: "Security vs. Usability", val: 300, q: "Why would a public weather app fail if it required a 20-character password?", a: "The friction is too high for the low value of the data, so users will just quit and leave.", d: ["The weather data is too highly classified.", "The app would cost too much to build.", "The password would break the weather radar."] },

        { cat: "Security vs. Usability", val: 400, q: "What happens if security rules in a business office are too strict or impossible to follow?", a: "Employees will bypass the rules just to get their work done, ruining the security entirely.", d: ["The employees will work faster.", "The company will make more money.", "The computers will automatically upgrade."] },
        { cat: "Security vs. Usability", val: 400, q: "What does 'UX' stand for in the context of cybersecurity?", a: "User Experience; how easy and pleasant it is to navigate the security measures.", d: ["Unlimited Execution; how fast the CPU runs.", "User Exfiltration; how data is stolen.", "Universal Exchange; a type of network."] },
        { cat: "Security vs. Usability", val: 400, q: "Why do IT departments often force users to change their passwords every 90 days?", a: "To ensure that if a password is stolen, it eventually becomes useless to the hacker.", d: ["To annoy the employees.", "To save space on the hard drive.", "To test the keyboard."] },

        { cat: "Security vs. Usability", val: 500, q: "What is a negative psychological consequence of forcing users to change passwords every 90 days?", a: "Users suffer fatigue and just add '1', '2', or '3' to the end of their old password.", d: ["Users become professional hackers.", "Users stop using the internet.", "Users buy new computers."] },
        { cat: "Security vs. Usability", val: 500, q: "How does a 'Password Manager' improve both security and usability at the same time?", a: "It generates and remembers complex passwords so the user only has to remember one master password.", d: ["It deletes all passwords and uses open access.", "It changes your password every 5 minutes.", "It emails your passwords to your boss."] },
        { cat: "Security vs. Usability", val: 500, q: "What is the main goal of the 'UX/Security Audit' chapter activity?", a: "To find a 'middle ground' solution that protects sensitive data without driving the user crazy.", d: ["To make an app perfectly secure by deleting it.", "To remove all passwords from a bank.", "To create a computer virus."] },

        // --- CATEGORY: CYBERSECURITY RECOMMENDATIONS ---
        { cat: "Cybersecurity Recommendations", val: 100, q: "What is a 'Cost-Benefit Analysis' in cybersecurity?", a: "Weighing the cost of the defense against the value of the data being protected.", d: ["Buying the most expensive computer possible.", "Selling user data for money.", "Calculating the price of a new monitor."] },
        { cat: "Cybersecurity Recommendations", val: 100, q: "Is it a smart decision to spend $50,000 on a firewall to protect data worth only $500?", a: "No, the cost of the defense is vastly higher than the asset's value.", d: ["Yes, security is always worth any price.", "Yes, firewalls are required by law.", "No, firewalls don't work."] },
        { cat: "Cybersecurity Recommendations", val: 100, q: "In cybersecurity, what is an 'Asset'?", a: "The data, hardware, or reputation you are trying to protect from attackers.", d: ["A type of computer virus.", "A specific line of JavaScript code.", "A password manager."] },

        { cat: "Cybersecurity Recommendations", val: 200, q: "What is a highly recommended, low-cost security habit for individuals?", a: "Enabling Multi-Factor Authentication (MFA) on all important accounts.", d: ["Buying a $10,000 server.", "Turning off the computer forever.", "Sharing passwords with friends."] },
        { cat: "Cybersecurity Recommendations", val: 200, q: "Why must a Power User evaluate the 'probability' of a cyberattack?", a: "To decide how much time, effort, and money to spend defending against it.", d: ["To predict the weather.", "To guess the hacker's name.", "To win a video game."] },
        { cat: "Cybersecurity Recommendations", val: 200, q: "If a small bakery's secret recipe is stolen, what is the main 'cost' to the business?", a: "Loss of competitive advantage and potential financial ruin.", d: ["They have to buy new ovens.", "The recipe becomes tastier.", "Their internet runs faster."] },

        { cat: "Cybersecurity Recommendations", val: 300, q: "In business, the 'Cost' of a security system isn't just money. What else is it?", a: "Time, employee productivity, and user frustration.", d: ["The color of the computers.", "The size of the hard drives.", "The weight of the servers."] },
        { cat: "Cybersecurity Recommendations", val: 300, q: "What does standard 9-12.NI.C.4 ask students to evaluate?", a: "The tradeoffs between maximizing security and maintaining system efficiency/usability.", d: ["How to build a physical computer.", "How to write a For Loop.", "How to compress a video file."] },
        { cat: "Cybersecurity Recommendations", val: 300, q: "Why do giant tech companies spend millions on security while small shops spend hundreds?", a: "The value of a tech giant's data is massively higher, justifying the extreme cost of defense.", d: ["Small shops don't have computers.", "Tech companies like wasting money.", "Small shops are legally exempt from hacking."] },

        { cat: "Cybersecurity Recommendations", val: 400, q: "When proposing a 'middle ground' solution in a UX Audit, what are you trying to achieve?", a: "Balancing adequate data protection with a smooth, frictionless user experience.", d: ["Making the app as hard to use as possible.", "Removing all passwords.", "Deleting the application entirely."] },
        { cat: "Cybersecurity Recommendations", val: 400, q: "Why is 'keeping software updated' a highly recommended, low-cost defense?", a: "It patches known security holes for free before hackers can exploit them.", d: ["It makes the screen brighter.", "It adds new video games to the computer.", "It changes the computer's IP address."] },
        { cat: "Cybersecurity Recommendations", val: 400, q: "If an app is too secure and impossible to log into, what economic impact might it have?", a: "Customers will get frustrated, leave, and take their money to a competitor's app.", d: ["The company will make billions.", "The app will become famous.", "The computer will physically break."] },

        { cat: "Cybersecurity Recommendations", val: 500, q: "What is 'Feasibility' in a cybersecurity recommendation?", a: "Whether a security measure is actually realistic to implement given the budget and technology.", d: ["How fast the computer can process data.", "The legal right to hack a computer.", "The physical weight of the hardware."] },
        { cat: "Cybersecurity Recommendations", val: 500, q: "Why might a high school choose a slightly less secure Wi-Fi setup for student devices?", a: "To ensure thousands of devices can connect quickly without overwhelming the IT help desk with login issues.", d: ["Because they want hackers to attack.", "Because secure Wi-Fi is illegal in schools.", "Because secure Wi-Fi uses too much electricity."] },
        { cat: "Cybersecurity Recommendations", val: 500, q: "What is 'Risk Acceptance'?", a: "Deciding that a threat is too expensive to fix or too unlikely to happen, so you just accept the risk.", d: ["Inviting hackers into your network.", "Paying a ransom immediately.", "Turning off the firewall."] },

        // --- CATEGORY: SYSTEMATIC DEFENSE & ETHICS ---
        { cat: "Systematic Defense & Ethics", val: 100, q: "What is a Security Policy?", a: "A formal document creating 'Rules of Behavior' for technology use in an organization.", d: ["A software program that deletes viruses.", "A hardware device that stops hackers.", "A receipt for buying a computer."] },
        { cat: "Systematic Defense & Ethics", val: 100, q: "What does AUP stand for in a school or business setting?", a: "Acceptable Use Policy", d: ["Automatic User Protocol", "Admin Unified Password", "App Utility Program"] },
        { cat: "Systematic Defense & Ethics", val: 100, q: "What is the main purpose of an AUP in a school?", a: "To explain clearly what digital behavior is allowed on the network and what is forbidden.", d: ["To teach students how to type.", "To block all internet access.", "To grade student homework."] },

        { cat: "Systematic Defense & Ethics", val: 200, q: "What is 'Incident Response'?", a: "The systematic plan of exactly what to do AFTER a security breach is detected.", d: ["Calling the police before a hack happens.", "Deleting the hard drive randomly.", "Hacking the hacker back."] },
        { cat: "Systematic Defense & Ethics", val: 200, q: "What is usually the very first step when a breach is detected on a computer?", a: "Contain the threat by unplugging or disconnecting the infected machine from the network.", d: ["Post about it on social media.", "Turn off the building's power.", "Reply to the hacker's email."] },
        { cat: "Systematic Defense & Ethics", val: 200, q: "How do you safely recover data that was destroyed by Ransomware during an incident?", a: "Restore the data from a secure, offline backup.", d: ["Pay the hackers and hope for the best.", "Ask the computer nicely to fix it.", "Download the files again from the internet."] },

        { cat: "Systematic Defense & Ethics", val: 300, q: "Why is panic a terrible reaction to a cyberattack?", a: "It leads to random clicking and mistakes; a professional must use systematic troubleshooting instead.", d: ["It causes the computer to overheat.", "Hackers can smell fear.", "It deletes the operating system."] },
        { cat: "Systematic Defense & Ethics", val: 300, q: "What ethical issue arises when an employer monitors everything you do on the company network?", a: "The delicate balance between necessary network security and the user's right to privacy.", d: ["It uses too much internet data.", "It makes the employee type slower.", "It changes the passwords automatically."] },
        { cat: "Systematic Defense & Ethics", val: 300, q: "If a school monitors student web traffic, what is their primary justification?", a: "To protect the network from malware and keep students legally safe while on campus.", d: ["To steal student credit cards.", "To sell data to advertisers.", "To make the Wi-Fi run faster."] },

        { cat: "Systematic Defense & Ethics", val: 400, q: "What does standard 9-12.NI.C.2 require students to evaluate regarding ethical impacts?", a: "Recommending security measures that respect user privacy while still effectively monitoring for threats.", d: ["Building the fastest possible computer.", "Creating new computer viruses.", "Writing long essays about history."] },
        { cat: "Systematic Defense & Ethics", val: 400, q: "Why is 'Transparency' critical when an organization monitors its network?", a: "Users should be told clearly in the AUP that they are being watched and what data is collected.", d: ["Monitors should be made of glass.", "The code should be written in white text.", "Security guards should wear bright colors."] },
        { cat: "Systematic Defense & Ethics", val: 400, q: "What is a 'Post-Mortem' in the Incident Response cycle?", a: "Analyzing how the hacker got in after the attack is over, so you can fix the hole and learn from it.", d: ["A type of computer virus.", "Deleting the hard drive.", "A physical hardware failure."] },

        { cat: "Systematic Defense & Ethics", val: 500, q: "If an IT worker uses their admin access to read a coworker's private personal emails, what has occurred?", a: "A severe ethical violation and an abuse of the Principle of Least Privilege.", d: ["A standard security audit.", "A Zero-Day Exploit.", "A hardware malfunction."] },
        { cat: "Systematic Defense & Ethics", val: 500, q: "How does having a signed Acceptable Use Policy (AUP) protect an employer legally?", a: "If an employee hacks a system, the AUP proves the employee knew the rules and chose to break them.", d: ["It acts as a magical shield against viruses.", "It forces the employee to pay for the computers.", "It makes the network run twice as fast."] },
        { cat: "Systematic Defense & Ethics", val: 500, q: "Why must an 'offline' backup be used during Incident Response instead of just a cloud backup?", a: "Because advanced ransomware can sometimes jump to connected cloud drives and encrypt them too.", d: ["Because cloud backups are illegal.", "Because offline backups are faster to download.", "Because offline backups hold more data."] }
    ].map(item => ({ ...item, chapter: "Chapter 6", grade: "CS & Literacy Guild" })));
    
})();