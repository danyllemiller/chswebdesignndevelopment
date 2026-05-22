/**
 * CHAPTER 5: The Web & Internet Security
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
        // --- CATEGORY: THE MALWARE LANDSCAPE ---
        { cat: "The Malware Landscape", val: 100, q: "What does the term 'Malware' stand for?", a: "Malicious Software", d: ["Malfunctioning Hardware", "Multiple Warehouses", "Macro Algorithm"] },
        { cat: "The Malware Landscape", val: 100, q: "What is Malware?", a: "Any code designed to intentionally exploit, damage, or gain unauthorized access to a computer.", d: ["An accidental programming mistake.", "A type of physical computer hardware.", "An antivirus program."] },
        { cat: "The Malware Landscape", val: 100, q: "Which type of malware locks your files and demands payment to unlock them?", a: "Ransomware", d: ["Spyware", "Adware", "A Switch"] },

        { cat: "The Malware Landscape", val: 200, q: "What is a Virus?", a: "Code that attaches to a 'host' file and requires a human to click or share it to spread.", d: ["A program that spreads automatically.", "A hardware defect.", "A secure network tunnel."] },
        { cat: "The Malware Landscape", val: 200, q: "What is a Worm?", a: "A standalone program that replicates itself across networks automatically without human help.", d: ["A virus that only affects Apple computers.", "A physical bug in the motherboard.", "A fake website."] },
        { cat: "The Malware Landscape", val: 200, q: "How is a Worm fundamentally different from a Virus?", a: "A worm spreads automatically without needing a human to click a host file.", d: ["A worm is much slower.", "A worm only steals credit cards.", "A worm cannot be deleted."] },

        { cat: "The Malware Landscape", val: 300, q: "What is a Trojan?", a: "Malicious code disguised as something legitimate, like a free game or cracked software.", d: ["A program that deletes your internet history.", "A fast fiber-optic cable.", "A network firewall."] },
        { cat: "The Malware Landscape", val: 300, q: "Why are 'cracked' versions of expensive software highly dangerous?", a: "They often contain hidden Trojans that open a 'backdoor' for hackers to take remote control.", d: ["They use too much RAM.", "They are perfectly safe but illegal.", "They delete the operating system immediately."] },
        { cat: "The Malware Landscape", val: 300, q: "What do Spyware and Adware typically do?", a: "Silently track user behavior or flood the screen with unwanted advertisements.", d: ["Encrypt files for ransom.", "Destroy the CPU.", "Improve internet speed."] },

        { cat: "The Malware Landscape", val: 400, q: "Why is Ransomware considered the ultimate threat to businesses and schools?", a: "It uses encryption to paralyze all files and operations until a heavy fee is paid.", d: ["It steals physical computer monitors.", "It unplugs network cables.", "It only affects guest Wi-Fi."] },
        { cat: "The Malware Landscape", val: 400, q: "What is the primary difference between a 'bug' and 'malware'?", a: "A bug is an accidental programming mistake; malware is a deliberate weapon.", d: ["A bug is illegal; malware is just annoying.", "Malware is physical; a bug is digital.", "There is no difference."] },
        { cat: "The Malware Landscape", val: 400, q: "How did early 'viruses' in the 1970s and 80s differ from modern malware?", a: "They were often digital pranks or experiments rather than tools designed to steal money.", d: ["They were written in English.", "They only worked on smartphones.", "They were highly secure firewalls."] },

        { cat: "The Malware Landscape", val: 500, q: "What is the defining characteristic of Ransomware's attack method?", a: "It uses military-grade encryption to scramble files, making them unreadable without a specific key.", d: ["It formats the hard drive to empty.", "It changes the desktop background.", "It unplugs the router."] },
        { cat: "The Malware Landscape", val: 500, q: "Why is downloading a 'free' movie from an untrusted site a major security risk?", a: "The file might be a Trojan that installs malicious software in the background while the movie plays.", d: ["The movie will be in the wrong language.", "It will automatically email the police.", "It deletes your web browser."] },
        { cat: "The Malware Landscape", val: 500, q: "What is the ultimate goal of Spyware?", a: "To secretly monitor and record a user's keystrokes, passwords, and private data.", d: ["To show you pop-up ads for shoes.", "To lock your computer screen.", "To make the internet run faster."] },

        // --- CATEGORY: SOCIAL ENGINEERING ---
        { cat: "Social Engineering", val: 100, q: "What is Social Engineering?", a: "Using psychology to trick people into giving up passwords or access.", d: ["Building social media websites.", "Writing code to hack firewalls.", "A type of computer hardware."] },
        { cat: "Social Engineering", val: 100, q: "What is the most common form of social engineering?", a: "Phishing", d: ["Ransomware", "Worms", "Encryption"] },
        { cat: "Social Engineering", val: 100, q: "Why do hackers rely so heavily on Social Engineering?", a: "Because it is often easier to trick a human than to break through a complex firewall.", d: ["Because computers are unhackable.", "Because social engineering is legal.", "Because it requires zero computer skills."] },

        { cat: "Social Engineering", val: 200, q: "What is Phishing?", a: "Sending fake messages to trick users into revealing sensitive credentials.", d: ["Stealing physical credit cards.", "Encrypting files for money.", "Creating a computer virus."] },
        { cat: "Social Engineering", val: 200, q: "What is 'Spoofing'?", a: "Faking the 'sender' address so an email looks like it came from a trusted source.", d: ["Making a fake social media account.", "Hiding an IP address.", "Deleting system files."] },
        { cat: "Social Engineering", val: 200, q: "What is 'Smishing'?", a: "Phishing attacks conducted via SMS text messages.", d: ["Smashing a hard drive.", "Spoofing a MAC address.", "A type of firewall."] },

        { cat: "Social Engineering", val: 300, q: "What is 'Pretexting'?", a: "Creating a fake scenario, like pretending to be an IT worker, to steal a password.", d: ["Writing an essay before coding.", "Sending an email with a virus attached.", "Locking a computer screen."] },
        { cat: "Social Engineering", val: 300, q: "What is 'Baiting'?", a: "Leaving an infected USB drive in a public place hoping someone plugs it in.", d: ["Clicking a link in an email.", "Guessing a password repeatedly.", "Selling stolen data."] },
        { cat: "Social Engineering", val: 300, q: "What is the 'Weakest Link' Theory in cybersecurity?", a: "Even the best hardware security can be bypassed if one human clicks a bad link.", d: ["Wi-Fi is weaker than Ethernet.", "Old computers break easily.", "Passwords are always weak."] },

        { cat: "Social Engineering", val: 400, q: "How does a hacker use Spoofing to make a Phishing email more believable?", a: "By faking the 'From' address to perfectly match the victim's bank or school.", d: ["By changing the font color to red.", "By attaching a large video file.", "By using a foreign language."] },
        { cat: "Social Engineering", val: 400, q: "Why is a 'sense of urgency' a red flag in an email?", a: "Hackers use fear (like 'Account Deletion in 24 hours') to make you click without thinking.", d: ["It means the internet is slow.", "It means the sender is your real boss.", "It indicates a hardware failure."] },
        { cat: "Social Engineering", val: 400, q: "If you find a USB drive labeled 'Salary Info' in the hallway, what type of attack might this be?", a: "Baiting", d: ["Phishing", "Spoofing", "Ransomware"] },

        { cat: "Social Engineering", val: 500, q: "How does the 'Human Element' compromise multi-million dollar firewalls?", a: "Firewalls cannot stop an employee who willingly hands their password to a disguised hacker.", d: ["Firewalls melt if humans touch them.", "Humans unplug the firewalls.", "Firewalls are only designed for robots."] },
        { cat: "Social Engineering", val: 500, q: "Why is checking the actual URL of a link critical to stopping a Phishing attack?", a: "The link text might say 'Google,' but the actual destination might be a hacker's fake login page.", d: ["Because URLs determine internet speed.", "Because fake URLs are always written in binary.", "Because URLs expire after 24 hours."] },
        { cat: "Social Engineering", val: 500, q: "How do voice clones and AI enhance modern Social Engineering attacks?", a: "They allow hackers to convincingly impersonate the voices of family members or bosses.", d: ["They hack the firewall automatically.", "They guess passwords a million times a second.", "They write the malware code."] },

        // --- CATEGORY: SPOT THE PHISH ---
        { cat: "Spot the Phish", val: 100, q: "Which of these is a major 'Red Flag' for a phishing email?", a: "A sense of extreme urgency or fear of account deletion.", d: ["A professional signature block.", "A link to a public news article.", "Proper spelling and grammar."] },
        { cat: "Spot the Phish", val: 100, q: "How can you check where a link really goes before clicking it?", a: "Hover your mouse over the link to see the actual destination URL.", d: ["Click it once quickly.", "Copy it into a Word document.", "Turn off your Wi-Fi first."] },
        { cat: "Spot the Phish", val: 100, q: "If an email says it's from Netflix, but the sender is `support@net-flix-help.ru`, what is happening?", a: "The sender address is being spoofed poorly.", d: ["Netflix changed its name.", "It is a legitimate international email.", "Your computer has a virus."] },

        { cat: "Spot the Phish", val: 200, q: "Why do phishing emails often have generic greetings like 'Dear Customer'?", a: "Hackers send them to millions of people at once and don't know your real name.", d: ["It is more polite.", "It saves server storage space.", "They are generated by the firewall."] },
        { cat: "Spot the Phish", val: 200, q: "If you get a text saying 'Your package is delayed, click here,' what should you do?", a: "Do not click the link; go directly to the shipping company's official website.", d: ["Click the link to check your package.", "Reply with your credit card number.", "Forward it to your friends."] },
        { cat: "Spot the Phish", val: 200, q: "What should you look for in the URL of a login page to ensure it is secure?", a: "HTTPS and the exact, correctly spelled domain name.", d: ["HTTP and a red padlock.", "A long string of random numbers.", "The word 'Secure' in the title."] },

        { cat: "Spot the Phish", val: 300, q: "Why is `http://www.paypa1.com` a dangerous URL?", a: "It is a 'typosquatting' fake URL designed to look like PayPal.", d: ["It uses too much bandwidth.", "It is an outdated web protocol.", "It automatically deletes your cookies."] },
        { cat: "Spot the Phish", val: 300, q: "If an email demands you download an attached PDF to 'verify your account,' what is the risk?", a: "The PDF could contain a virus or Trojan payload.", d: ["It will use up all your printer ink.", "It is illegal to download PDFs.", "The PDF will change your desktop background."] },
        { cat: "Spot the Phish", val: 300, q: "How do modern browsers help you spot a phishing website?", a: "They display a red warning screen if the site is on a known malware blacklist.", d: ["They turn off the monitor.", "They email the police automatically.", "They slow down your internet speed."] },

        { cat: "Spot the Phish", val: 400, q: "You receive an email from your boss asking you to buy $500 in gift cards immediately. What should you do?", a: "Call your boss directly to verify; it is likely a Pretexting scam.", d: ["Buy the gift cards to save your job.", "Reply with your credit card info.", "Forward the email to the entire company."] },
        { cat: "Spot the Phish", val: 400, q: "Why is relying only on a padlock icon next to the URL no longer enough to guarantee safety?", a: "Hackers can easily get security certificates for their fake phishing websites.", d: ["The padlock means the site is locked and broken.", "Padlocks only appear on Apple devices.", "The padlock is just a decoration."] },
        { cat: "Spot the Phish", val: 400, q: "If a pop-up says 'Your computer has 5 viruses! Click here to clean it,' what is this called?", a: "Scareware designed to trick you into downloading actual malware.", d: ["A helpful operating system alert.", "A legitimate antivirus scan.", "A hardware failure warning."] },

        { cat: "Spot the Phish", val: 500, q: "How does a 'Homoglyph' attack make spotting a fake URL extremely difficult?", a: "It uses characters from different alphabets that look visually identical to English letters.", d: ["It hides the URL entirely.", "It changes the URL every 5 seconds.", "It translates the URL into binary."] },
        { cat: "Spot the Phish", val: 500, q: "Why do phishers often include legitimate logos and stolen formatting in their fake emails?", a: "To bypass your initial skepticism and build false trust instantly.", d: ["Because they are practicing web design.", "To avoid copyright lawsuits.", "To make the file size larger."] },
        { cat: "Spot the Phish", val: 500, q: "If you accidentally click a phishing link but haven't typed your password yet, are you safe?", a: "Not necessarily; the site could attempt a 'Drive-by Download' to install malware automatically.", d: ["Yes, hackers only want passwords.", "Yes, clicking links is always 100% safe.", "No, your computer will explode instantly."] },

        // --- CATEGORY: SENSITIVE DATA & IMPACTS ---
        { cat: "Sensitive Data & Impacts", val: 100, q: "What does PII stand for?", a: "Personally Identifiable Information", d: ["Private Internet IP", "Public Information Index", "Personal Interface Integration"] },
        { cat: "Sensitive Data & Impacts", val: 100, q: "Which of the following is considered PII?", a: "Social Security Number", d: ["Your favorite color", "The brand of your laptop", "Your shoe size"] },
        { cat: "Sensitive Data & Impacts", val: 100, q: "What are hackers usually looking for when they attack a school or hospital?", a: "Sensitive Data (PII and Medical Records)", d: ["To use the school's Wi-Fi", "Free cafeteria food", "To delete old essays"] },

        { cat: "Sensitive Data & Impacts", val: 200, q: "What is the main consequence of losing your PII to a hacker?", a: "Identity theft, leading to ruined credit and financial loss.", d: ["Your computer runs slightly slower.", "You receive more spam emails.", "Your social media accounts get deleted."] },
        { cat: "Sensitive Data & Impacts", val: 200, q: "When hackers target a corporation, what are they often trying to steal?", a: "Intellectual Property and trade secrets.", d: ["The physical servers.", "The company's Wi-Fi routers.", "Office supplies."] },
        { cat: "Sensitive Data & Impacts", val: 200, q: "What is 'Intellectual Property'?", a: "Secret recipes, inventions, or software code that make a company successful.", d: ["The land the company's building sits on.", "The physical computers in the office.", "The employee handbook."] },

        { cat: "Sensitive Data & Impacts", val: 300, q: "What is the biggest consequence for a company after a major data breach?", a: "Reputational damage and loss of customer trust.", d: ["Having to buy new keyboards.", "Employees getting extra vacation days.", "A slightly slower internet connection."] },
        { cat: "Sensitive Data & Impacts", val: 300, q: "Why are medical records so valuable to hackers on the Dark Web?", a: "They contain permanent data (like birthdates and medical history) that cannot be easily changed.", d: ["They are written in Latin.", "They are required to buy medicine.", "They take up a lot of hard drive space."] },
        { cat: "Sensitive Data & Impacts", val: 300, q: "If a bank loses millions of customer passwords, what usually follows the technical fix?", a: "Massive lawsuits and government fines.", d: ["A party for the IT team.", "A free year of banking for everyone.", "Nothing happens."] },

        { cat: "Sensitive Data & Impacts", val: 400, q: "Why is identity theft so difficult to recover from?", a: "It can take years of legal battles to prove you didn't open the fraudulent accounts.", d: ["The police delete your old identity.", "You have to change your actual name legally.", "You are banned from the internet."] },
        { cat: "Sensitive Data & Impacts", val: 400, q: "How does a data breach impact a company's financial value?", a: "Customers leave in fear, causing the company's stock price to drop significantly.", d: ["It increases sales as people check their accounts.", "It makes their servers run faster.", "It forces them to print all data on paper."] },
        { cat: "Sensitive Data & Impacts", val: 400, q: "Why do hackers often target small businesses instead of giant tech companies?", a: "Small businesses often have weaker security budgets and fewer defenses.", d: ["Small businesses have faster internet.", "Giant tech companies don't have data.", "Small businesses use older computers."] },

        { cat: "Sensitive Data & Impacts", val: 500, q: "How does the theft of Intellectual Property affect a nation's economy?", a: "It allows rival companies or countries to mass-produce stolen inventions without paying for research.", d: ["It stops all computers from working.", "It changes the national currency.", "It forces everyone to use Open Source software."] },
        { cat: "Sensitive Data & Impacts", val: 500, q: "If your PII is stolen, what is the best immediate defense to protect your finances?", a: "Placing a 'Freeze' on your credit report so no new accounts can be opened.", d: ["Deleting your email address.", "Throwing away your computer.", "Changing your home Wi-Fi password."] },
        { cat: "Sensitive Data & Impacts", val: 500, q: "Why do some stolen passwords remain dangerous for years after a breach?", a: "Because users frequently reuse the exact same password across multiple different websites.", d: ["Passwords are legally valid for 10 years.", "Hackers encrypt the passwords.", "The internet never forgets."] },

        // --- CATEGORY: EXFILTRATION & ETHICS ---
        { cat: "Exfiltration & Ethics", val: 100, q: "What does 'Data Exfiltration' mean?", a: "Malware silently copying and sending data to a hacker's server.", d: ["Deleting a file permanently.", "Formatting a hard drive.", "Updating an operating system."] },
        { cat: "Exfiltration & Ethics", val: 100, q: "What was the primary goal of the 'WannaCry' cyberattack?", a: "To lock computers globally and demand Bitcoin ransom payments.", d: ["To steal credit card numbers.", "To physically destroy nuclear centrifuges.", "To spoof email addresses."] },
        { cat: "Exfiltration & Ethics", val: 100, q: "What did the 'Stuxnet' worm famously target?", a: "Physical nuclear centrifuges, proving malware can cause real-world physical damage.", d: ["A school's grading system.", "A global banking network.", "A hospital's patient records."] },

        { cat: "Exfiltration & Ethics", val: 200, q: "Why is Data Exfiltration considered a 'silent' threat?", a: "The malware doesn't crash the computer; it just copies data secretly in the background.", d: ["It turns off the computer's speakers.", "It uses invisible ink.", "It deletes the operating system."] },
        { cat: "Exfiltration & Ethics", val: 200, q: "If a company's data is stolen because they didn't install a free security update, who is ethically responsible?", a: "The company, for failing to protect the data they were trusted with.", d: ["The users, for giving them the data.", "The hardware manufacturer.", "The internet service provider."] },
        { cat: "Exfiltration & Ethics", val: 200, q: "In the ethics of data responsibility, what do companies owe their users after a breach?", a: "Transparency, meaning they must quickly and honestly report what data was stolen.", d: ["Free computers for everyone.", "A lifetime supply of their product.", "Nothing, they should hide it."] },

        { cat: "Exfiltration & Ethics", val: 300, q: "How did the WannaCry ransomware spread so quickly across the globe?", a: "It operated as a Worm, exploiting a known vulnerability in outdated Windows systems automatically.", d: ["It was emailed to every person on Earth.", "It was pre-installed on all new computers.", "It spread via physical USB drives only."] },
        { cat: "Exfiltration & Ethics", val: 300, q: "What made Stuxnet different from traditional malware that targets credit cards?", a: "It was designed as a digital weapon to sabotage industrial hardware.", d: ["It only worked on Apple devices.", "It was completely legal.", "It encrypted files for Bitcoin."] },
        { cat: "Exfiltration & Ethics", val: 300, q: "Why do companies sometimes try to hide the fact that they were hacked?", a: "To avoid the massive reputational damage, lawsuits, and drops in stock price.", d: ["Because they don't want to fix the computers.", "Because hackers tell them to.", "Because it saves electricity."] },

        { cat: "Exfiltration & Ethics", val: 400, q: "What is a 'Command and Control' (C2) server?", a: "The remote computer that a hacker uses to send instructions to infected machines and receive exfiltrated data.", d: ["The main server at a school.", "A server that controls the internet.", "A backup server for your home."] },
        { cat: "Exfiltration & Ethics", val: 400, q: "If a hospital is hit by ransomware, what is the immediate ethical dilemma?", a: "Whether to pay criminals to unlock life-saving systems, or refuse and risk patient lives.", d: ["Which doctor gets to use the computer first.", "What color to paint the waiting room.", "How much to charge for the Wi-Fi."] },
        { cat: "Exfiltration & Ethics", val: 400, q: "How did the Morris Worm (the first major worm) accidentally break the early internet?", a: "It replicated out of control, using up all processing power and crashing thousands of computers.", d: ["It physically cut the fiber optic cables.", "It deleted the DNS system.", "It stole everyone's credit card numbers."] },

        { cat: "Exfiltration & Ethics", val: 500, q: "Why is paying a ransomware demand considered ethically risky by cybersecurity experts?", a: "It funds criminal organizations and proves the attack works, encouraging more attacks.", d: ["It is illegal to own Bitcoin.", "It makes the computer run slower.", "The hackers always give the files back anyway."] },
        { cat: "Exfiltration & Ethics", val: 500, q: "How does a 'Zero-Day Exploit' (from Ch 2) make malware like WannaCry incredibly dangerous?", a: "It uses a vulnerability that the software developers don't know about yet, making it unblockable.", d: ["It deletes the computer in zero days.", "It only works on day zero of the month.", "It is a virus that has zero code."] },
        { cat: "Exfiltration & Ethics", val: 500, q: "In the context of data responsibility, what is 'Negligence'?", a: "A company failing to use basic, industry-standard protections (like firewalls) to guard user data.", d: ["A user forgetting their password.", "A hacker stealing a physical server.", "A computer turning off randomly."] }
    ].map(item => ({ ...item, chapter: "Chapter 5", grade: "CS & Literacy Guild" })));
    
})();