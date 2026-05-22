/**
 * CHAPTER 18: The Future: AI and Society
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
        // --- CATEGORY: THE UNIVERSAL TOOL ---
        { cat: "The Universal Tool", val: 100, q: "What is considered the 'Universal Tool' of the 21st century?", a: "Computer Science and Algorithms", d: ["Physical hardware and microchips", "The printing press", "Proprietary software licenses"] },
        { cat: "The Universal Tool", val: 100, q: "What type of algorithm do delivery companies use to calculate efficient routes?", a: "Pathfinding algorithms", d: ["Sorting algorithms", "Encryption algorithms", "Image generation algorithms"] },
        { cat: "The Universal Tool", val: 100, q: "How do streaming apps like Spotify use Data Structures?", a: "To power recommendation algorithms that predict the next song", d: ["To delete old songs", "To compress music into ZIPs", "To print sheet music"] },

        { cat: "The Universal Tool", val: 200, q: "If a nurse is organizing patient charts, what kind of computational problem is this?", a: "A Sorting problem", d: ["A Pathfinding problem", "An Encryption problem", "A Generative AI problem"] },
        { cat: "The Universal Tool", val: 200, q: "If an architect is designing hallways to move people efficiently, what problem is this?", a: "A Flow or Pathfinding problem", d: ["A Data Exfiltration problem", "A Compression problem", "A Hardware problem"] },
        { cat: "The Universal Tool", val: 200, q: "How do biologists use 'Pattern Matching' algorithms from Computer Science?", a: "To sequence human DNA and find the causes of diseases", d: ["To play video games", "To change font sizes", "To fix microscopes"] },

        { cat: "The Universal Tool", val: 300, q: "How do chemists use Computational Models?", a: "To simulate how medicines will react without risking human lives", d: ["To delete research papers", "To mix physical chemicals", "To buy supplies online"] },
        { cat: "The Universal Tool", val: 300, q: "How do meteorologists predict where a hurricane will land?", a: "They use massive data sets and Computational Models", d: ["They use random number generators", "They look at webcams", "They ask a chatbot"] },
        { cat: "The Universal Tool", val: 300, q: "How does computer science power modern film-making?", a: "CGI uses complex physics models to calculate how light and water should look", d: ["It replaces actors with robots", "It prints movies on paper", "It deletes scripts"] },

        { cat: "The Universal Tool", val: 400, q: "How do historians use 'Data Mining'?", a: "To scan thousands of ancient books to find patterns in language over time", d: ["To physically dig for computers", "To delete old records", "To encrypt messages"] },
        { cat: "The Universal Tool", val: 400, q: "In modern music production, how are songs 'built'?", a: "Using modular procedures to layer sounds and apply mathematical filters", d: ["By playing acoustic instruments only", "By typing binary into a speaker", "By using flat files"] },
        { cat: "The Universal Tool", val: 400, q: "What is the goal of a Power User when looking at a non-technical field?", a: "To see the 'Hidden Algorithm' and find a way to make it more efficient", d: ["To tell others they are wrong", "To completely replace human workers", "To refuse to use technology"] },

        { cat: "The Universal Tool", val: 500, q: "Why are the algorithms used in computer science considered 'interdisciplinary'?", a: "The exact same logic can solve problems in medicine, art, and business", d: ["They only work on Macs", "They require no math", "They are illegal in some countries"] },
        { cat: "The Universal Tool", val: 500, q: "How does the concept of 'Modularity' apply to modern digital art?", a: "Artists build complex works by snapping together pre-made digital filters and sound loops", d: ["Art cannot be modular", "Modules destroy creativity", "It deletes the artwork"] },
        { cat: "The Universal Tool", val: 500, q: "What is the overarching lesson of the CS & Literacy Guild?", a: "Computing is the universal tool that powers every other field of study in the 21st century", d: ["Computers are too dangerous", "Only programmers need CS", "Hardware is more important"] },

        // --- CATEGORY: MACHINE LEARNING ---
        { cat: "Machine Learning", val: 100, q: "What is the definition of Artificial Intelligence (AI) in this course?", a: "Software designed to mimic human cognitive functions like learning and problem-solving", d: ["A scary robot that thinks for itself", "A physical brain made of silicon", "A spreadsheet formula"] },
        { cat: "Machine Learning", val: 100, q: "What is the 'Engine' behind modern AI?", a: "Machine Learning (ML)", d: ["A 1000-watt power supply", "A massive linked list", "The Central Processing Unit (CPU)"] },
        { cat: "Machine Learning", val: 100, q: "How is an AI program fundamentally different from a standard 'If-Then' program?", a: "An AI 'learns' to create its own paths by looking at millions of examples", d: ["AI uses less electricity", "AI only understands English", "AI runs slower"] },

        { cat: "Machine Learning", val: 200, q: "How does Machine Learning work?", a: "By feeding a model massive amounts of 'Big Data' to find subtle patterns", d: ["By giving a computer a dictionary", "By telling the computer to guess randomly", "By letting the computer sleep"] },
        { cat: "Machine Learning", val: 200, q: "How does a Machine Learning model learn to spot early signs of cancer?", a: "By analyzing patterns in tens of thousands of healthy and sick X-rays", d: ["By asking a human doctor", "By reading a medical textbook", "By Googling it"] },
        { cat: "Machine Learning", val: 200, q: "Why is a standard 'If-Then' statement NOT considered true AI?", a: "Because it is a strict, human-written rule, not a learned pattern", d: ["Because it uses too much RAM", "Because it is written in English", "Because it is too short"] },

        { cat: "Machine Learning", val: 300, q: "What is the relationship between 'Big Data' (Unit 3) and Machine Learning?", a: "Big Data provides the millions of examples the AI needs to find accurate patterns", d: ["Big Data deletes the AI", "They are completely unrelated", "Big Data slows the AI down"] },
        { cat: "Machine Learning", val: 300, q: "How does Data Integrity impact AI training?", a: "Poor data integrity leads to biased, inaccurate, and 'broken' AI models (GIGO)", d: ["It makes the AI run too fast", "It causes the AI to delete its own memory", "It has no impact on AI"] },
        { cat: "Machine Learning", val: 300, q: "What happens if you train a Machine Learning model on historically biased data?", a: "It will repeat and automate the same discrimination that happened in the past", d: ["It will automatically fix the bias using AI", "It will stop working completely", "It will print out paper copies"] },

        { cat: "Machine Learning", val: 400, q: "If a Machine Learning model is asked to recognize a cat, how does it do it?", a: "It compares the pixels to thousands of 'cat' images it was previously trained on", d: ["It uses a dictionary definition", "It asks a human", "It guesses randomly"] },
        { cat: "Machine Learning", val: 400, q: "What is the fundamental difference between Machine Learning and Generative AI?", a: "ML finds patterns in data; Generative AI uses probability to create brand new content", d: ["ML is for images; Generative AI is for numbers", "ML is slow; Generative AI is fast", "There is no difference"] },
        { cat: "Machine Learning", val: 400, q: "Why do AI developers need massive amounts of storage (like Cloud server farms)?", a: "To hold the Terabytes of training data required to teach a Machine Learning model", d: ["To make the internet faster", "To store user passwords", "To prevent viruses"] },

        { cat: "Machine Learning", val: 500, q: "What does the term 'Training Data' refer to in Machine Learning?", a: "The initial dataset given to the algorithm to help it learn the desired patterns", d: ["Data that exercises", "Deleted data", "Encrypted passwords"] },
        { cat: "Machine Learning", val: 500, q: "Why is human diversity critical when creating Training Data for an AI?", a: "If the data only represents one demographic, the AI will fail for everyone else", d: ["It makes the file size smaller", "It saves electricity", "It prevents hacking"] },
        { cat: "Machine Learning", val: 500, q: "How does Machine Learning move beyond human capabilities?", a: "It can find microscopic correlations in millions of data points that a human would never notice", d: ["It can feel real emotions", "It can consume biological food", "It never uses electricity"] },

        // --- CATEGORY: GENERATIVE AI ---
        { cat: "Generative AI", val: 100, q: "What are Generative AI tools (like ChatGPT or Gemini) designed to do?", a: "Use probability to create 'new' content like text, images, and code", d: ["Copy and paste exact paragraphs from Wikipedia", "Delete old data", "Hack into secure servers"] },
        { cat: "Generative AI", val: 100, q: "When a Generative AI writes a poem, what is it actually doing?", a: "Calculating which word is most likely to come next based on patterns in all poems it has read", d: ["Feeling genuine emotion and expressing it", "Translating a poem from French", "Randomly picking words from a dictionary"] },
        { cat: "Generative AI", val: 100, q: "Generative AI is often compared to a massive, automated version of what concept from Chapter 10?", a: "'What-If' Modeling", d: ["Static Modeling", "A Flat File", "A Bar Chart"] },

        { cat: "Generative AI", val: 200, q: "Does a Generative AI text model actually 'understand' what it is writing?", a: "No, it is predicting the most mathematically probable sequence of words", d: ["Yes, it is fully conscious", "Yes, it can read minds", "No, it just copies Google exact results"] },
        { cat: "Generative AI", val: 200, q: "If an AI generates a completely false statement but presents it as a fact, what is this called?", a: "A Hallucination", d: ["A Syntax Error", "A Logic Bomb", "A Deepfake"] },
        { cat: "Generative AI", val: 200, q: "Why is an AI 'Hallucination' dangerous?", a: "A user might trust the AI's confident tone and use false information in a professional setting", d: ["It causes the screen to display strange colors", "It deletes files from the hard drive", "It breaks the internet connection"] },

        { cat: "Generative AI", val: 300, q: "How is a Generative AI model different from a traditional Search Engine?", a: "Search engines retrieve existing pages; Generative AI synthesizes new responses from scratch", d: ["Search engines are faster", "AI requires no internet connection", "There is no difference at all"] },
        { cat: "Generative AI", val: 300, q: "Why do Generative AI images sometimes have strange artifacts (like hands with 6 fingers)?", a: "The probability model didn't perfectly synthesize the visual pattern for that complex object", d: ["The AI was angry", "The computer screen is broken", "The user typed the prompt backward"] },
        { cat: "Generative AI", val: 300, q: "How does Generative AI speed up the Software Development Lifecycle (SDLC)?", a: "By drafting boilerplate code or finding bugs in seconds, allowing the programmer to focus on logic", d: ["By physically building servers", "By deleting the entire test phase", "By skipping the planning phase completely"] },

        { cat: "Generative AI", val: 400, q: "What is the underlying mathematical concept that powers Generative AI text?", a: "Probability and Statistics", d: ["Geometry", "Algebra", "Calculus"] },
        { cat: "Generative AI", val: 400, q: "Why is a Generative AI response never exactly the same twice?", a: "Because it generates the response dynamically based on weighted probabilities each time", d: ["It forgets previous answers instantly", "It gets tired after typing", "The internet changes every second"] },
        { cat: "Generative AI", val: 400, q: "What is a major ethical concern with Generative AI art?", a: "Models are trained on millions of copyrighted images without compensating the original human artists", d: ["The art is too colorful", "The file sizes are too large to download", "It uses too much battery power"] },

        { cat: "Generative AI", val: 500, q: "If a student asks an AI to 'write my essay,' why does it often sound generic?", a: "It produces the most mathematically average response based on its training data", d: ["It doesn't know English well", "It types too fast", "It tries to sound exactly like a robot"] },
        { cat: "Generative AI", val: 500, q: "What does LLM stand for in the context of tools like ChatGPT?", a: "Large Language Model", d: ["Logic Learning Machine", "Linear Logic Module", "Local Language Memory"] },
        { cat: "Generative AI", val: 500, q: "How does the concept of 'Abstraction' apply to using Generative AI?", a: "The user just types a prompt, while the complex neural network math is hidden behind the scenes", d: ["The AI deletes code automatically", "The user must write binary numbers", "The screen goes blank during generation"] },

        // --- CATEGORY: PROMPT ENGINEERING ---
        { cat: "Prompt Engineering", val: 100, q: "What is 'Prompt Engineering'?", a: "The skill of using decomposition to write clear, precise instructions for an AI", d: ["Building physical hardware for robots", "Repairing broken computer monitors", "Writing a Terms of Service agreement"] },
        { cat: "Prompt Engineering", val: 100, q: "In Prompt Engineering, what does it mean to 'Assign a Role'?", a: "Telling the AI who it is acting as (e.g., 'You are an expert coder')", d: ["Giving the AI a physical name tag", "Telling the AI what not to do", "Testing the AI for bugs"] },
        { cat: "Prompt Engineering", val: 100, q: "In Prompt Engineering, what is the 'Goal'?", a: "The specific, precise output you want (e.g., 'Write a function to calculate a 15% tip')", d: ["The age of the user", "The name of the file", "The speed of the network"] },

        { cat: "Prompt Engineering", val: 200, q: "In Prompt Engineering, what does setting 'Constraints' mean?", a: "Telling the AI exactly what NOT to do (e.g., 'Do not use external libraries')", d: ["Giving the AI more RAM", "Making the AI run slower", "Telling the AI to be creative"] },
        { cat: "Prompt Engineering", val: 200, q: "How does prompt engineering use 'Decomposition' (from Chapter 11)?", a: "By breaking a vague request down into specific, atomic instructions for the AI to follow", d: ["By making the AI guess what you want", "By writing the prompt in binary code", "By asking the AI to build a flowchart"] },
        { cat: "Prompt Engineering", val: 200, q: "Why is 'Validation' a critical final step when using AI?", a: "Because you should never trust the output without checking for logic errors or 'hallucinations'", d: ["Because the AI will delete your file if you don't", "Because it costs money", "Because AI never makes mistakes"] },

        { cat: "Prompt Engineering", val: 300, q: "What is the problem with a prompt that just says 'Help me with my homework'?", a: "It lacks a Role, Goal, and Constraints, leading to a vague, unhelpful response", d: ["It is too long", "It is written in English", "It is a syntax error"] },
        { cat: "Prompt Engineering", val: 300, q: "What is an ethical way to handle using AI to help write code for a school project?", a: "Including a 'Disclosure Statement' explaining how AI was used", d: ["Claiming you wrote the entire thing yourself", "Selling the code to a classmate", "Deleting the AI history"] },
        { cat: "Prompt Engineering", val: 300, q: "Why is a 'Disclosure Statement' important when using AI for schoolwork?", a: "It maintains academic integrity and transparency about how the work was produced", d: ["It makes the essay longer", "It prevents the AI from crashing", "It is a requirement of the U.S. government"] },

        { cat: "Prompt Engineering", val: 400, q: "If you prompt an AI to 'Summarize this article,' what constraint should you add to ensure quality?", a: "'Limit the summary to exactly 3 bullet points intended for a 5th-grade reading level.'", d: ["'Use big words.'", "'Don't read the article.'", "'Use red font.'"] },
        { cat: "Prompt Engineering", val: 400, q: "How does Prompt Engineering turn a 'User' into a 'Creator'?", a: "The user is actively architecting the AI's logic boundaries rather than just consuming a passive result", d: ["It requires a hardware degree", "It makes the PC faster", "It deletes old files"] },
        { cat: "Prompt Engineering", val: 400, q: "If an AI outputs an IF statement that is backward, what skill do you need to fix it?", a: "Logic Builder skills to spot the flaw and rewrite the specific condition manually", d: ["Graphic design skills", "Hardware repair skills", "Networking skills"] },

        { cat: "Prompt Engineering", val: 500, q: "How does Prompt Engineering relate to the concept of 'Garbage In, Garbage Out'?", a: "A vague, poorly structured prompt will yield a generic, unhelpful output", d: ["Prompts delete files", "Prompts overheat the CPU", "AI ignores all prompts"] },
        { cat: "Prompt Engineering", val: 500, q: "What is 'Few-Shot Prompting'?", a: "Giving the AI a few examples of the desired output format inside your prompt", d: ["Taking a photo of the screen", "Typing very quickly", "Asking the AI to guess"] },
        { cat: "Prompt Engineering", val: 500, q: "Why must a Logic Builder understand how to read code, even if AI writes it for them?", a: "To perform an effective Code Audit and Validation before deploying it to a real environment", d: ["Because typing is slow", "To impress their friends", "Because the AI charges per letter"] },

        // --- CATEGORY: AI IMPACT & ETHICS ---
        { cat: "AI Impact & Ethics", val: 100, q: "Which of the following is a 'Beneficial Impact' of AI?", a: "Early disease detection in healthcare", d: ["Creating deepfake videos of politicians", "Increasing digital isolation", "Replacing all human jobs instantly"] },
        { cat: "AI Impact & Ethics", val: 100, q: "How is AI helping in Climate Science?", a: "By analyzing massive data sets to find new ways to capture carbon or predict severe weather", d: ["By turning off the sun", "By making the internet run hotter", "By printing more paper"] },
        { cat: "AI Impact & Ethics", val: 100, q: "What is a 'Deepfake'?", a: "AI-generated fake video or audio that looks and sounds real, often used to spread lies or steal identities", d: ["A very deep folder structure on a hard drive", "A deep-sea fiber optic cable", "A hidden variable in code"] },

        { cat: "AI Impact & Ethics", val: 200, q: "How do most experts believe AI will impact the future of work?", a: "It won't replace all humans, but it will change the specific *tasks* humans do", d: ["It will replace 100% of all jobs by next year", "It will have absolutely no effect on jobs", "It will only replace jobs in agriculture"] },
        { cat: "AI Impact & Ethics", val: 200, q: "How will a doctor's job likely change due to AI?", a: "Less time analyzing X-rays, more time talking to and treating patients", d: ["They will stop treating patients entirely", "They will have to build their own AI from scratch", "They will only perform surgeries on robots"] },
        { cat: "AI Impact & Ethics", val: 200, q: "How will an artist's job likely change due to AI?", a: "Less time drawing every single frame, more time designing the story and prompting the AI", d: ["They will no longer be allowed to draw", "They will only paint with physical paint", "They will sell empty canvases"] },

        { cat: "AI Impact & Ethics", val: 300, q: "What is the 'Black Box Problem' in Artificial Intelligence?", a: "When an AI makes a decision, but the programmers don't know exactly *why* it made that choice", d: ["When the computer monitor turns completely black", "When a server is stored in a black case", "When hackers steal the AI's source code"] },
        { cat: "AI Impact & Ethics", val: 300, q: "Why does the 'Black Box Problem' make Algorithmic Bias so hard to fix?", a: "Because you can't easily see the broken logic inside the complex neural network to correct it", d: ["Because the code is legally copyrighted", "Because black boxes are physically locked", "Because the AI refuses to answer questions"] },
        { cat: "AI Impact & Ethics", val: 300, q: "Which skill will best protect your career in an AI-powered world?", a: "Logic Builder skills: decomposing problems, auditing bias, and maintaining data integrity", d: ["Memorizing how to type fast", "Knowing how to use a floppy disk", "Avoiding all technology entirely"] },

        { cat: "AI Impact & Ethics", val: 400, q: "The future belongs to those who can do what with machines?", a: "Work *with* them, not just for them", d: ["Turn them off permanently", "Build them physically from scratch", "Hide from them"] },
        { cat: "AI Impact & Ethics", val: 400, q: "In the 'AI Ethics Board' simulation, what is the 'Money' argument for releasing the biased AI?", a: "Releasing the product will make millions of dollars and still help the majority of people", d: ["It will cause the company to go bankrupt", "It will force people to buy new laptops", "It is a free charity product"] },
        { cat: "AI Impact & Ethics", val: 400, q: "In the 'AI Ethics Board' simulation, what is the 'Equity' argument against releasing the biased AI?", a: "It is unfair to release a product knowing it is biased against a specific group, even if it helps others", d: ["The software is too expensive", "The graphics look bad", "It uses too much battery power"] },

        { cat: "AI Impact & Ethics", val: 500, q: "In the 'AI Ethics Board' simulation, what is the 'Fix' debate?", a: "Can the SDLC fix the bias before launch, or is the 'Garbage In, Garbage Out' problem too big to solve?", d: ["Can we change the color of the logo?", "Can we translate it to French?", "Can we charge more money for it?"] },
        { cat: "AI Impact & Ethics", val: 500, q: "What is the goal of the 'Semester Capstone Project'?", a: "To build a 'Smart Tool' that solves a real-world problem and leaves a positive impact", d: ["To memorize the textbook", "To physically build a computer from parts", "To hack into a secure server"] },
        { cat: "AI Impact & Ethics", val: 500, q: "Ultimately, what determines if AI will be a beneficial tool or a harmful weapon?", a: "The ethical framework, diversity, and choices of the human creators and power users who wield it", d: ["The speed of the CPU", "The brand of the computer", "The amount of money a company has"] }
    ].map(item => ({ ...item, chapter: "Chapter 18", grade: "CS & Literacy Guild" })));
    
})();