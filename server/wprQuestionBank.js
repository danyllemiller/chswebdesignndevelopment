// Nevada Workplace Readiness Skills for Career Readiness -- daily clock-in
// question bank for WD1/WD2. Used as the fallback prompt on any day the
// teacher hasn't manually set a specific question (see reflection-prompt in
// timeclock.js) -- replacing the old generic "reflect on today's chapter"
// filler with a real standards-aligned question, one per day, cycling
// through the whole bank so the same day always shows the same question but
// consecutive days differ.
const WPR_QUESTIONS = [
    // 1.1.1 Positive Work Ethic
    { std: '1.1.1', q: 'Why is arriving at work on time important, even if you are only a few minutes late?' },
    { std: '1.1.1', q: 'What does having a strong work ethic mean to you?' },
    { std: '1.1.1', q: "Your supervisor gives you a task you don't really want to do. How should you respond?" },
    { std: '1.1.1', q: 'What should you do if you finish your assigned task before everyone else?' },
    { std: '1.1.1', q: 'Why is it important to listen carefully when a supervisor gives you directions?' },
    { std: '1.1.1', q: 'What is the difference between being motivated and simply doing the minimum required?' },
    { std: '1.1.1', q: 'You are having a difficult day at work. How can you still maintain a positive attitude?' },
    { std: '1.1.1', q: 'What are three things an employee can do to show their employer they are dependable?' },
    { std: '1.1.1', q: 'Why might an employer value an employee who can work without being reminded constantly?' },
    { std: '1.1.1', q: "You don't understand what your supervisor wants you to do. What should you do?" },
    // 1.1.2 Integrity, Honesty & Reliability
    { std: '1.1.2', q: 'What does integrity mean in the workplace?' },
    { std: '1.1.2', q: 'You accidentally damage a piece of company equipment, and nobody sees you do it. What should you do?' },
    { std: '1.1.2', q: 'Why is honesty important between employees and employers?' },
    { std: '1.1.2', q: 'Your friend asks you to clock them in because they are running late. What should you do? Why?' },
    { std: '1.1.2', q: 'What does it mean to be a reliable employee?' },
    { std: '1.1.2', q: 'You notice a coworker breaking an important workplace safety rule. What should you do?' },
    { std: '1.1.2', q: "Why should employees follow workplace policies even when their supervisor isn't watching?" },
    { std: '1.1.2', q: "What could happen to a person's reputation if they are caught lying at work?" },
    { std: '1.1.2', q: "Your supervisor makes a mistake that affects your work. How could you address the situation honestly and professionally?" },
    { std: '1.1.2', q: 'Is it ever okay to ignore a workplace rule because "everyone else does it"? Explain your answer.' },
    // 1.1.3 Teamwork
    { std: '1.1.3', q: 'What makes someone a good team member?' },
    { std: '1.1.3', q: 'You finish your part of a group project while your teammates are still working. What could you do to help?' },
    { std: '1.1.3', q: 'Why is asking for help a strength rather than a weakness?' },
    { std: '1.1.3', q: 'What should you do if a teammate is struggling with their part of an assignment?' },
    { std: '1.1.3', q: 'Describe one behavior that can make teamwork difficult.' },
    { std: '1.1.3', q: 'Two people on your team disagree about how to complete a project. What should they do?' },
    { std: '1.1.3', q: 'Why is communication important when working as part of a team?' },
    { std: '1.1.3', q: 'What does "contributing to the success of the team" look like in a workplace?' },
    { std: '1.1.3', q: "You disagree with your supervisor's decision, but the team has already agreed on a plan. How should you handle it?" },
    { std: '1.1.3', q: 'What is more important in a team: having the best individual worker or having people who work well together? Explain.' },
    // 1.1.4 Positive Self-Representation
    { std: '1.1.4', q: 'Why does professional appearance matter in the workplace?' },
    { std: '1.1.4', q: 'What does it mean to use workplace-appropriate language?' },
    { std: '1.1.4', q: 'How can your body language affect how coworkers and customers perceive you?' },
    { std: '1.1.4', q: 'You are frustrated with a coworker. What language should you avoid using when speaking to them?' },
    { std: '1.1.4', q: 'Why are manners and respect important when interacting with customers?' },
    { std: '1.1.4', q: 'How might the way you dress need to change depending on the workplace?' },
    { std: '1.1.4', q: 'What are some examples of professional communication?' },
    { std: '1.1.4', q: 'Why is it important to think before posting something on social media?' },
    { std: '1.1.4', q: 'A customer is rude to you. How should you respond while remaining professional?' },
    { std: '1.1.4', q: 'What is one thing you can do to make a positive first impression at a job?' },
    // 1.1.5 Diversity Awareness
    { std: '1.1.5', q: 'What does diversity mean in the workplace?' },
    { std: '1.1.5', q: 'Why is it important to treat coworkers with different backgrounds and experiences respectfully?' },
    { std: '1.1.5', q: "You are assigned to work with someone you don't know well. What can you do to build a positive working relationship?" },
    { std: '1.1.5', q: 'Why can having people with different perspectives make a team stronger?' },
    { std: '1.1.5', q: "What should you do if you hear a coworker making an inappropriate joke about another person's background?" },
    { std: '1.1.5', q: 'How can you show respect for someone whose opinions or experiences are different from yours?' },
    // 1.1.6 Conflict Resolution
    { std: '1.1.6', q: 'Two coworkers disagree about who should complete a task. What is a professional way to resolve the disagreement?' },
    { std: '1.1.6', q: 'Why is it usually better to discuss a workplace conflict calmly rather than becoming angry?' },
    { std: '1.1.6', q: 'A coworker says something that bothers you. What should you do before assuming they meant to offend you?' },
    { std: '1.1.6', q: 'What does it mean to find a "diplomatic solution" to a workplace problem?' },
    // 1.2.1 Effective Speaking & Listening
    { std: '1.2.1', q: 'Why is active listening important when a supervisor gives you instructions?' },
    { std: '1.2.1', q: "Your supervisor gives you several directions at once, and you aren't sure you remember them all. What should you do?" },
    { std: '1.2.1', q: 'What does effective workplace communication look and sound like?' },
    { std: '1.2.1', q: 'Why is it important to make eye contact and pay attention when someone is speaking to you?' },
    { std: '1.2.1', q: "A coworker explains how to operate a piece of equipment, but you don't understand one of the steps. What should you do?" },
    { std: '1.2.1', q: 'What is the difference between hearing someone and actively listening to them?' },
    { std: '1.2.1', q: 'Why should you avoid interrupting someone who is explaining an important task?' },
    { std: '1.2.1', q: "A customer asks you a question and you don't know the answer. How should you respond?" },
    { std: '1.2.1', q: 'How can your tone of voice affect a workplace conversation?' },
    { std: '1.2.1', q: 'Why is it important to repeat or clarify instructions when you are unsure what is expected?' },
    // 1.2.2 Reading & Writing
    { std: '1.2.2', q: 'Why is it important to carefully read workplace instructions before beginning a task?' },
    { std: '1.2.2', q: "You receive a written set of instructions that you don't understand. What should you do?" },
    { std: '1.2.2', q: 'Why does clear writing matter in the workplace?' },
    { std: '1.2.2', q: 'What problems could occur if an employee misunderstands a safety sign or warning label?' },
    { std: '1.2.2', q: 'Why should workplace emails and messages be proofread before being sent?' },
    { std: '1.2.2', q: 'You need to leave a note for the employee working the next shift. What information should you include?' },
    { std: '1.2.2', q: 'What is the difference between informal texting and professional workplace writing?' },
    { std: '1.2.2', q: 'Why is it important to understand forms, schedules, signs, and other workplace documents?' },
    { std: '1.2.2', q: 'Your supervisor sends you an email with several instructions. What could you do to make sure you complete everything correctly?' },
    { std: '1.2.2', q: 'What makes written communication clear and easy for another employee to understand?' },
    // 1.2.3 Critical Thinking & Problem Solving
    { std: '1.2.3', q: "You are halfway through a task when you realize you don't have one of the materials you need. What should you do?" },
    { std: '1.2.3', q: 'Why is it important to identify the cause of a problem instead of immediately trying to fix it?' },
    { std: '1.2.3', q: "A machine or piece of equipment isn't working correctly. What should you do before attempting to fix it?" },
    { std: '1.2.3', q: 'You make a mistake while completing an assigned task. What should your first step be?' },
    { std: '1.2.3', q: 'What is the difference between guessing at a solution and using critical thinking?' },
    { std: '1.2.3', q: 'Your team has two possible solutions to a problem. How could you decide which solution is better?' },
    { std: '1.2.3', q: 'Why is asking questions sometimes an important part of problem-solving?' },
    { std: '1.2.3', q: "You are given a task you've never completed before. What resources could you use to figure out how to do it?" },
    { std: '1.2.3', q: "Describe a situation where a small workplace problem could become a much bigger problem if it isn't addressed." },
    { std: '1.2.3', q: 'Why should employees consider the consequences of a solution before putting it into action?' },
    // 1.2.4 Healthy Behaviors & Safety
    { std: '1.2.4', q: "Why is workplace safety everyone's responsibility?" },
    { std: '1.2.4', q: 'You notice that you are becoming tired while performing a task that requires concentration. What should you do?' },
    { std: '1.2.4', q: 'Why should employees follow safety procedures even when they have performed a task many times?' },
    { std: '1.2.4', q: 'What could happen if an employee ignores a required piece of personal protective equipment?' },
    { std: '1.2.4', q: 'Why is it important to report unsafe conditions to a supervisor?' },
    { std: '1.2.4', q: 'How can getting enough sleep affect your performance at work?' },
    { std: '1.2.4', q: 'Why should employees avoid working while distracted?' },
    { std: '1.2.4', q: 'You see a coworker using equipment in an unsafe way. What should you do?' },
    { std: '1.2.4', q: 'What is one healthy habit that can help someone perform better at work?' },
    { std: '1.2.4', q: 'Why is taking appropriate breaks important for workplace safety and productivity?' },
    // 1.2.5 Workplace Organizations, Systems & Climate
    { std: '1.2.5', q: 'What does it mean to understand the "big picture" of a workplace?' },
    { std: '1.2.5', q: 'Why should employees understand the mission or purpose of the organization where they work?' },
    { std: '1.2.5', q: "How can one employee's actions affect an entire workplace?" },
    { std: '1.2.5', q: 'Your assigned task seems small and unimportant. Why might it still matter to the organization?' },
    { std: '1.2.5', q: 'What does a positive workplace climate look like?' },
    { std: '1.2.5', q: 'Why is it important for employees to understand their role within a larger organization?' },
    // 1.2.6 Lifelong Learning
    { std: '1.2.6', q: 'Why should employees continue learning new skills even after they get a job?' },
    { std: '1.2.6', q: 'Technology in an industry changes frequently. What should an employee do to keep their skills current?' },
    { std: '1.2.6', q: 'What is one professional skill you could improve that would make you more valuable to an employer?' },
    { std: '1.2.6', q: 'Why might an employer prefer an employee who is willing to learn something new?' },
    // 1.3.1 Job-Specific Technology
    { std: '1.3.1', q: 'Why is it important to learn how to safely use the technology required for your job?' },
    { std: '1.3.1', q: 'You are asked to use a piece of equipment you have never used before. What should you do before using it?' },
    { std: '1.3.1', q: 'How can choosing the correct technology or tool make a workplace task more efficient?' },
    { std: '1.3.1', q: "Why should you follow the manufacturer's instructions when using workplace technology?" },
    { std: '1.3.1', q: 'Your supervisor asks you to use a machine, but you have not been trained on it. What should you do?' },
    { std: '1.3.1', q: 'What could happen if an employee uses workplace technology without understanding how it works?' },
    { std: '1.3.1', q: 'Why is safety important even when using technology that seems simple?' },
    { std: '1.3.1', q: 'How can technology help employees complete tasks more accurately?' },
    { std: '1.3.1', q: 'You discover that a piece of equipment is not working correctly. What should you do before continuing to use it?' },
    { std: '1.3.1', q: 'Why might an employer expect employees to learn new technology as part of their job?' },
    // 1.3.2 Information Technology
    { std: '1.3.2', q: 'Why is it important to organize files on a workplace computer?' },
    { std: '1.3.2', q: 'What is a good system for naming digital files so that they are easy to find later?' },
    { std: '1.3.2', q: "You save an important document but can't remember where you put it. What could you do differently next time?" },
    { std: '1.3.2', q: 'Why should employees avoid saving every file to the computer desktop?' },
    { std: '1.3.2', q: 'What is the difference between a file and a folder?' },
    { std: '1.3.2', q: 'Why is it important to keep workplace files organized?' },
    { std: '1.3.2', q: 'You are working on an important document and your computer crashes. What could you have done to protect your work?' },
    { std: '1.3.2', q: 'Why should you learn to use the software programs required for your career?' },
    { std: '1.3.2', q: 'What could happen if an employee accidentally deletes or changes an important company file?' },
    { std: '1.3.2', q: 'Why is it useful to know more than one way to accomplish a task using technology?' },
    // 1.3.3 Internet Use & Security
    { std: '1.3.3', q: 'What does responsible Internet use look like in the workplace?' },
    { std: '1.3.3', q: 'Why should you avoid clicking suspicious links in workplace emails?' },
    { std: '1.3.3', q: 'How can you tell whether a website is a trustworthy source of information?' },
    { std: '1.3.3', q: 'Why should you never share your workplace password with another employee?' },
    { std: '1.3.3', q: 'You receive an email asking you to click a link and enter your company password. What should you do?' },
    { std: '1.3.3', q: 'Why is it important to create strong passwords?' },
    { std: '1.3.3', q: 'What information should you avoid sharing publicly online?' },
    { std: '1.3.3', q: 'Why should employees be careful when downloading files from the Internet?' },
    { std: '1.3.3', q: 'What is phishing, and why is it a workplace security concern?' },
    { std: '1.3.3', q: 'You are researching information for work and find two websites that give different answers. How could you determine which information is more reliable?' },
    { std: '1.3.3', q: 'Why should personal Internet use be limited during work hours?' },
    { std: '1.3.3', q: 'What could happen if an employee uses a company computer to visit unsafe or inappropriate websites?' },
    // 1.3.4 Telecommunications
    { std: '1.3.4', q: 'What does professional communication sound like when talking on the phone at work?' },
    { std: '1.3.4', q: 'Why is it important to identify yourself when answering a workplace phone call?' },
    { std: '1.3.4', q: 'A customer calls and asks for someone who is unavailable. How should you respond?' },
    { std: '1.3.4', q: 'What information should you write down when taking a message for a coworker?' },
    { std: '1.3.4', q: 'Why is your tone of voice important when speaking with customers or coworkers over the phone?' },
    { std: '1.3.4', q: 'You receive a voicemail about an important work task. What should you do after listening to it?' },
    { std: '1.3.4', q: 'Why should employees avoid using slang or inappropriate language during professional phone calls?' },
    { std: '1.3.4', q: 'What should you do if you cannot hear or understand someone during a phone conversation?' },
    { std: '1.3.4', q: 'Why is it important to respond to workplace messages in a timely manner?' },
    { std: '1.3.4', q: 'What information should be included in a professional voicemail?' },
    { std: '1.3.4', q: 'A customer becomes frustrated while speaking to you on the phone. How should you handle the conversation?' },
    { std: '1.3.4', q: 'Why can poor communication over the phone cause problems in a workplace?' },
    // Technology in the Workplace -- Mixed Review
    { std: '1.3', q: 'You are given a new software program at work. What are three ways you could learn how to use it?' },
    { std: '1.3', q: 'Why is it important to protect company information when using computers and other technology?' },
    { std: '1.3', q: 'Your coworker asks you to use their login information because they forgot their password. What should you do?' },
    { std: '1.3', q: 'How can technology improve communication between employees who work in different locations?' },
    { std: '1.3', q: 'What is one technology skill you think will be important in your future career, and why?' },
    { std: '1.3', q: 'Technology is designed to make work easier, but it can also create problems. What is one potential problem, and how could an employee prevent it?' }
];

// Deterministic by calendar date -- every student in the same course on the
// same day sees the same question (matching how the manual per-day override
// already works), and it advances by exactly one question per day rather
// than repeating or jumping around, cycling back to the start once the bank
// is exhausted.
function pickWprQuestion(dateStr) {
    const epoch = new Date('2026-01-01T00:00:00');
    const d = new Date(dateStr + 'T00:00:00');
    const daysSinceEpoch = Math.floor((d - epoch) / 86400000);
    const idx = ((daysSinceEpoch % WPR_QUESTIONS.length) + WPR_QUESTIONS.length) % WPR_QUESTIONS.length;
    return WPR_QUESTIONS[idx];
}

// Real multiple-choice workplace readiness questions (right/wrong,
// gradable), pooled from the four workplace-readiness-skills pre-
// assessment variants (pre-assessments/workplace-readiness-skills{,-b,-c,-d}.html)
// -- used for the timeclock clock-in question so it stays a scored MC item
// (1 pt attempted, 1 pt on time, 1 pt correct) instead of an ungraded
// reflection. WPR_QUESTIONS above (open-ended) is used for the clock-out
// journal reflection instead.
const WPR_MC_QUESTIONS = [
{
        q: "A tool your team normally uses to complete work for a customer is unavailable on a deadline day. The most resourceful response is to:",
        options: ["Wait for the tool to be restored, even if that means missing the deadline", "Tell the customer right away that the deadline will have to be pushed back", "Find an alternative approach that can still produce the required result", "Switch to a different assignment until the tool becomes available again"],
        answer: "Find an alternative approach that can still produce the required result",
        hint: "Workplace creativity means adapting when plans change. Finding an alternative is more professional than stopping or asking for an extension."
      },
      {
        q: "Which behavior best demonstrates initiative in a workplace setting?",
        options: ["Completing all of your assigned tasks by their deadlines, without taking on or suggesting anything extra", "Finishing your assigned work early and spending the rest of the day on personal tasks at your desk", "Identifying an inefficient process and presenting your supervisor with a specific solution unprompted", "Asking your supervisor what to do next every single time you complete one of your assigned tasks"],
        answer: "Identifying an inefficient process and presenting your supervisor with a specific solution unprompted",
        hint: "Initiative means spotting a problem AND bringing a specific solution — not just flagging the issue or waiting to be assigned a fix."
      },
      {
        q: "You overhear a coworker sharing confidential client information in a public area. The best action is:",
        options: ["Ignore it — monitoring coworkers is not your responsibility","Join the conversation to hear more context","Privately remind your coworker about the confidentiality policy","Report it publicly at the next team meeting to prevent it from happening again"],
        answer: "Privately remind your coworker about the confidentiality policy",
        hint: "Addressing a policy concern privately protects confidentiality and gives your coworker a chance to correct the behavior without public embarrassment."
      },
      {
        q: "You realize at 7 a.m. that you will arrive 20 minutes late to work. The most professional action is:",
        options: ["Say nothing and hope no one notices","Text a coworker and ask them to cover for you","Call or message your supervisor before your shift begins","Leave work 20 minutes late at the end of the day to compensate"],
        answer: "Call or message your supervisor before your shift begins",
        hint: "Notifying your supervisor before your shift — not after — shows respect for their planning and demonstrates accountability even when things go wrong."
      },
      {
        q: "A workplace conflict with a coworker has continued through two direct conversations without resolution. The appropriate next step is:",
        options: ["Stop collaborating with that person entirely","Bring it up at the next all-staff meeting","Involve a supervisor or a neutral mediator","Document the incidents and say nothing further"],
        answer: "Involve a supervisor or a neutral mediator",
        hint: "When direct conversations fail, involving a neutral third party is the appropriate and professional next step — not avoidance or public escalation."
      },
      {
        q: "During a planning meeting, a customer describes what they need in vague terms. The best response is:",
        options: ["Begin work right away based on your own best guess about what the customer meant", "Ask clarifying questions and summarize your understanding before leaving the meeting", "Send a long proposal that tries to cover every possible interpretation of the request", "Ask the customer to come back once they have more specific ideas about what they want"],
        answer: "Ask clarifying questions and summarize your understanding before leaving the meeting",
        hint: "Never start work on assumptions. Clarifying questions plus a summary at the end of the meeting confirm shared understanding before any effort is invested."
      },
      {
        q: "A new team member has an approved cultural accommodation that includes a brief daily break at a set time. Teammates should:",
        options: ["Ask the team member to explain the practice to the group so everyone understands why", "Treat the approved accommodation as routine and adjust scheduling accordingly", "Report the break to HR as a scheduling concern so the rest of the team is treated fairly", "Ask the team member to move the break to lunch or after work so the schedule stays even"],
        answer: "Treat the approved accommodation as routine and adjust scheduling accordingly",
        hint: "Approved accommodations are both legal requirements and professional courtesies. Treating them as routine shows maturity and respect."
      },
      {
        q: "A client is frustrated about a delay caused by a vendor your team did not control. The best first response is:",
        options: ["Explain clearly that the delay was caused by the vendor, so the client knows your team is not at fault", "Offer the client a full refund right away so they stay happy, even before you know the cause", "Acknowledge the impact on the client and explain what your team is actively doing to resolve it", "Give the client the vendor's support number so they can get updates directly from the source"],
        answer: "Acknowledge the impact on the client and explain what your team is actively doing to resolve it",
        hint: "Acknowledging the impact — and explaining what you ARE doing about it — rebuilds trust far better than explaining who is at fault."
      },
      {
        q: "A teammate is falling behind on their portion of a shared project, putting the deadline at risk. The best first step is:",
        options: ["Quietly redo their portion of the work yourself without telling them about it first", "Report them to the supervisor immediately before talking to them about the problem", "Talk with them directly to understand the situation and discuss how you might help", "Let the deadline pass so the consequences of their slow work become visible to everyone"],
        answer: "Talk with them directly to understand the situation and discuss how you might help",
        hint: "A direct, private conversation is always the first step. Going to the supervisor immediately can damage team trust unnecessarily."
      },
      {
        q: "A change that saves your team 2 hours per week also introduces a known security risk across the organization. The most responsible view is:",
        options: ["Worthwhile, because the time savings are measurable and immediate while the risk is only possible", "Worthwhile, as long as the team keeps the change to itself so it doesn't spread to other departments", "Not worthwhile, because a security breach would cost far more than the weekly time savings", "Acceptable as long as each employee is careful and nobody clicks on anything suspicious"],
        answer: "Not worthwhile, because a security breach would cost far more than the weekly time savings",
        hint: "A short-term efficiency gain that introduces a long-term organizational risk is not a good trade-off. Professionals weigh both sides before recommending."
      },
      {
        q: "Which is the strongest professional development goal statement?",
        options: ["Get better at my job this year by working harder and trying to learn something new whenever I can", "Earn an industry certification by December and reach a specific skill benchmark I can demonstrate to employers", "Attend more networking events and try to meet as many people in my industry as I possibly can over the next year", "Learn whatever my employer tells me I need to learn, whenever they decide it is time to learn it"],
        answer: "Earn an industry certification by December and reach a specific skill benchmark I can demonstrate to employers",
        hint: "Strong professional goals are specific and measurable. Vague goals like 'get better' give you nothing concrete to track or achieve."
      },
      {
        q: "Your employer replaces a platform your team has used for years with a completely different one. The most professional response is:",
        options: ["Ask for an exemption so you can keep using the old system you already know how to use", "Keep using the old system until someone officially requires you to switch over to the new one", "Learn the new system, ask for help where needed, and share useful tips with teammates", "Wait to see how many coworkers complain about the new system before deciding whether to learn it"],
        answer: "Learn the new system, ask for help where needed, and share useful tips with teammates",
        hint: "Learning new systems, sharing knowledge with teammates, and staying positive during transitions are hallmarks of a highly valued employee."
      },
      {
        q: "You have five tasks and cannot complete them all today. Which should you tackle first?",
        options: ["The one you find the most interesting, so you build momentum for the rest", "The shortest one, so you can cross it off your list quickly and feel productive", "The one with the nearest deadline and the greatest consequence if delayed", "The one that was assigned to you most recently, since it is freshest in your mind"],
        answer: "The one with the nearest deadline and the greatest consequence if delayed",
        hint: "Start with the task that has the nearest deadline AND the greatest consequence if delayed — those two filters together define true priority."
      },
      {
        q: "You find two articles with contradictory advice about a workplace procedure. The best next step is:",
        options: ["Use the article that matches how you already do the procedure, since your current approach has worked so far", "Combine the two recommendations into a middle-ground version so you follow at least part of each one", "Check the date, author credentials, and source authority of each, then verify with an official primary source", "Go with whichever article showed up first in the search results, since search engines rank the most reliable"],
        answer: "Check the date, author credentials, and source authority of each, then verify with an official primary source",
        hint: "Evaluate sources by date, author credentials, and organizational authority — then find a primary source to settle any contradiction."
      },
      {
        q: "You receive an email from 'IT Support' asking you to click a link and re-enter your credentials. The correct action is:",
        options: ["Click the link but enter only your username, not your password, to be safe", "Reply to the email and ask the sender for more details before clicking the link", "Do not click the link — contact IT through official channels to verify the request", "Forward the email to your coworkers as a warning, then click the link yourself to check"],
        answer: "Do not click the link — contact IT through official channels to verify the request",
        hint: "Phishing emails create urgency to make you act before thinking. Always slow down and verify through an independent, official channel — never through the email itself."
      },
      {
        q: "Which best describes a proper file management practice for workplace digital files?",
        options: ["Save all working files to your desktop so that they are always quick and easy to find", "Use descriptive, consistent file names and organize them in a logical folder structure", "Keep one master document and overwrite it each time you make changes so there is one copy", "Store your work files only as attachments in your personal email account for safekeeping"],
        answer: "Use descriptive, consistent file names and organize them in a logical folder structure",
        hint: "Clear, consistent file names in a logical folder structure save time for everyone, reduce errors, and make work handoffs seamless."
      },
      {
        q: "Before operating a piece of equipment you have never used, you should first:",
        options: ["Watch a coworker use it once, then go ahead and operate it on your own afterward", "Try it at the lowest setting and figure it out through trial and error as you go", "Read the operating manual and confirm you are trained and authorized to use it", "Ask a coworker to operate it for you every time you need to use it from now on"],
        answer: "Read the operating manual and confirm you are trained and authorized to use it",
        hint: "Training and authorization exist for safety and liability reasons. Never operate unfamiliar equipment without confirming both first."
      },
      {
        q: "A client approves a 12-hour project at $55 per hour. Materials cost $85 and registration fees cost $15. What is the total project quote?",
        options: ["$660","$745","$760","$775"],
        answer: "$760",
        math: true,
        hint: "12 hrs × $55 = $660, plus $85 materials and $15 fees = $760. Always add all cost components when building a client quote."
      },
      {
        q: "Which best describes workplace-appropriate communication?",
        options: ["Using the same friendly, casual tone with clients that you use with your close friends", "Keeping every message as short as possible, no matter who will read it or why", "Matching your language, tone, and level of formality to the audience and setting", "Using technical terms and formal wording in every message so you always sound professional"],
        answer: "Matching your language, tone, and level of formality to the audience and setting",
        hint: "Adjusting tone and formality to your audience is a core communication skill. Casual language in a formal setting undermines your professional credibility."
      },
      {
        q: "Which workplace document is sent to a customer requesting payment for services already delivered?",
        options: ["Purchase Order","Invoice","Work Order","Internal Memo"],
        answer: "Invoice",
        hint: "An invoice requests payment. A purchase order requests to buy. A work order authorizes a service. Knowing the difference prevents costly confusion."
      },
      {
        q: "You find equipment that is malfunctioning in a way that could injure someone. The safest response is:",
        options: ["Use it carefully for now and report the problem at the end of your shift", "Set it aside and tell nearby coworkers out loud not to use it for a while", "Tag it out of service and report it to your supervisor immediately", "Try to repair it yourself before the next shift so no one else gets hurt"],
        answer: "Tag it out of service and report it to your supervisor immediately",
        hint: "Tag-out (remove from service) plus immediate supervisor notification is the standard safe response to any potentially hazardous equipment issue."
      },
      {
        q: "An employee is asked by a supervisor to do something that conflicts with a written company policy. The most professional response is:",
        options: ["Do what the supervisor asks, since a supervisor's direction overrides written policy", "Refuse without saying why, so you don't get pulled into an argument with the supervisor", "Follow the policy and politely explain the conflict to the supervisor", "Find a way to partly satisfy both, doing half of what each one asks"],
        answer: "Follow the policy and politely explain the conflict to the supervisor",
        hint: "When policy and a supervisor's instruction conflict, follow the policy and respectfully explain the conflict — this protects both you and your employer."
      },
      {
        q: "Which practice best protects confidential client files?",
        options: ["Storing them on a personal USB drive so you can open them from any computer you use", "Emailing copies to your personal account so you can get to them when working from home", "Using company-approved storage with access restricted to authorized team members", "Saving them under an unusual file name so other people are unlikely to find or open them"],
        answer: "Using company-approved storage with access restricted to authorized team members",
        hint: "Company-approved storage with proper access controls is the only secure way to handle confidential data. Personal drives and email are serious security risks."
      },
      {
        q: "A project is billed at a flat fee of $3,200. Materials cost $480 and you spend 44 hours on the work. What is your effective hourly rate after subtracting material costs?",
        options: ["$72.73","$61.82","$62.27","$62.00"],
        answer: "$61.82",
        math: true,
        hint: "($3,200 − $480) ÷ 44 hours = $2,720 ÷ 44 = $61.82. Always subtract material costs before calculating your effective labor rate."
      },
      {
        q: "Which behavior best demonstrates active listening during a client meeting?",
        options: ["Waiting quietly for the client to finish speaking while you plan your own response", "Taking notes and asking follow-up questions that build on what the client said", "Agreeing with everything the client says so the meeting stays positive and friendly", "Recording the meeting so you can review it later instead of engaging with the client live"],
        answer: "Taking notes and asking follow-up questions that build on what the client said",
        hint: "Note-taking and follow-up questions that build on what was said demonstrate true engagement. Simply waiting your turn is not active listening."
      },
      {
        q: "You must order shelving for 8 workstations. Each requires 4.5 linear feet. Shelving is sold in 10-foot sections only. What is the minimum number of sections to order?",
        options: ["3","4","5","36"],
        answer: "4",
        math: true,
        hint: "8 workstations × 4.5 ft = 36 ft total. 36 ÷ 10 = 3.6 — always round UP when ordering materials so you don't run short."
      },
      {
        q: "A workplace problem you resolved two weeks ago has returned in exactly the same form. This most likely means:",
        options: ["Fixes naturally expire over time and need to be reapplied on a schedule", "You addressed a symptom of the problem rather than its root cause", "Someone else on the team undid your work without telling you about it", "Some workplace problems are simply impossible to solve permanently"],
        answer: "You addressed a symptom of the problem rather than its root cause",
        hint: "If a problem returns after being 'fixed,' the fix addressed a symptom, not the cause. Root cause analysis asks WHY it happened, not just WHAT happened."
      },
      {
        q: "You need current, authoritative information about federal workplace safety regulations. The most credible primary source is:",
        options: ["A coworker's memory of the rules they learned in a training session five years ago", "The official OSHA website or the relevant federal agency's published regulations", "An industry trade association's marketing brochure that summarizes the rules for members", "A social media post about the rules that has many shares and positive reactions"],
        answer: "The official OSHA website or the relevant federal agency's published regulations",
        hint: "Primary sources (government agencies, official standards bodies) are always more authoritative than secondhand summaries or promotional materials."
      },
      {
        q: "Which best describes managing your career over time in a competitive field?",
        options: ["Applying for every promotion that opens up, whether or not you have the skills the new role requires yet", "Staying in one comfortable role and waiting until management tells you it is time to learn something new", "Regularly comparing your current skills to where your industry is heading and addressing gaps proactively", "Changing employers every year or two, since a long list of different companies impresses hiring managers"],
        answer: "Regularly comparing your current skills to where your industry is heading and addressing gaps proactively",
        hint: "Career management is proactive, not reactive. Regularly comparing your skills to industry direction lets you close gaps before they become liabilities."
      },
      {
        q: "A teammate proposes an idea during brainstorming that you believe will not work. The most professional response is:",
        options: ["Explain right away, directly and in front of everyone, why the idea is going to fail", "Stay silent so that you don't create any conflict during the brainstorming session", "Ask a specific question about how the idea would handle a particular challenge", "Offer your own competing idea immediately without acknowledging theirs at all"],
        answer: "Ask a specific question about how the idea would handle a particular challenge",
        hint: "A specific, constructive question challenges an idea without dismissing it — far more effective in a team setting than immediate rejection."
      },
      {
        q: "You are given a large project due in three weeks. The most productive first step is:",
        options: ["Begin with the section you know best and figure out the rest of the plan as you go", "Break the project into tasks with interim milestones and schedule time for each", "Wait until you have a large, uninterrupted block of time so you can focus on all of it", "Request a two-week extension up front so you can avoid feeling any time pressure later"],
        answer: "Break the project into tasks with interim milestones and schedule time for each",
        hint: "Breaking a large project into milestones with individual deadlines makes progress visible and prevents last-minute crises."
      },
      {
        q: "Gross pay is best defined as:",
        options: ["The amount deposited directly to your bank account each pay period","Your total earnings before taxes and deductions are removed","The amount you owe in federal income tax each year","Your base salary not including any overtime or bonuses"],
        answer: "Your total earnings before taxes and deductions are removed",
        hint: "Gross pay = total earnings BEFORE deductions. Net pay = what you receive AFTER. The gap between them goes to taxes, insurance, and benefits."
      },
      {
        q: "Which is the most appropriate response to critical feedback on your work?",
        options: ["Ask your supervisor to assign a different reviewer to your work on future projects", "Ask clarifying questions and identify specific changes you will make next time", "Accept it without saying anything and keep working exactly the way you did before", "Explain politely why the criticism doesn't really apply to this particular project"],
        answer: "Ask clarifying questions and identify specific changes you will make next time",
        hint: "Asking clarifying questions turns feedback into a learning tool. Simply accepting or deflecting it leaves you without direction for improvement."
      },
      {
        q: "Designing a workstation so that monitor height, keyboard position, and chair height minimize physical strain is called:",
        options: ["Standardization","Ergonomics","Calibration","Professionalism"],
        answer: "Ergonomics",
        hint: "Ergonomics = designing work environments to fit human bodies, reducing fatigue and preventing repetitive strain injuries. It applies to every industry."
      },
      {
        q: "A customer asks you a detailed question you cannot accurately answer on the spot. The most professional response is:",
        options: ["Give the customer your best guess so you don't appear uninformed about your own products", "Politely tell the customer to look the answer up on the company website themselves", "Tell the customer you will find the accurate answer and follow up by a specific time", "Send the customer to another department right away without explaining why to them"],
        answer: "Tell the customer you will find the accurate answer and follow up by a specific time",
        hint: "Admitting you don't know and committing to a specific follow-up time is far more professional than guessing — and protects the customer from acting on wrong information."
      },
      {
        q: "An invoice your team sent contains a $400 undercharge that the client has already paid. The most ethical action is:",
        options: ["Say nothing, since the client was already happy with the price they paid", "Quietly add the $400 to the client's next invoice without an explanation", "Notify your supervisor and issue a corrected invoice to the client", "Split the difference and charge the client $200 more on the next project"],
        answer: "Notify your supervisor and issue a corrected invoice to the client",
        hint: "Correcting a billing error — even when it costs your company money — is the only ethical choice. Integrity means doing the right thing regardless of financial outcome."
      },
      {
        q: "After implementing a fix to a reported workplace problem, you should:",
        options: ["Tell everyone involved that the problem has been fixed and move straight on to your next task, since the original report is now closed", "Move on to other work, because if something is still wrong, the people who reported it will let you know again", "Verify the fix resolved the issue, confirm it holds up in different situations, and document what caused the original problem", "Wait at least 24 hours for user feedback, and declare the fix a success if nobody complains during that time"],
        answer: "Verify the fix resolved the issue, confirm it holds up in different situations, and document what caused the original problem",
        hint: "Fix → Verify → Document is the professional problem-solving cycle. Skipping verification means you don't actually know if the fix worked."
      },
      {
        q: "Workplace reliability is best described as:",
        options: ["Never making a mistake on any assignment, no matter how large or small it is", "Regularly working more hours than your schedule requires to show you care", "Consistently delivering what you committed to, by the time you committed to it", "Being well liked by your teammates and clients and always fun to work with"],
        answer: "Consistently delivering what you committed to, by the time you committed to it",
        hint: "Reliability is about consistently keeping your commitments — not working extra hours or being perfect. Do what you said, when you said it."
      },
      {
        q: "You discover you need to miss a scheduled client meeting. The most professional action is:",
        options: ["Send a coworker to the meeting in your place without telling the client", "Skip it, then call the client the next day to explain what happened", "Notify the client as far in advance as possible and propose a new time", "Email the client a few minutes before the meeting to let them know you can't make it"],
        answer: "Notify the client as far in advance as possible and propose a new time",
        hint: "Maximum advance notice plus a proposed alternative time shows respect for others' schedules — the hallmark of professional rescheduling."
      },
      {
        q: "Which is the safest way to handle a suspicious link received in a workplace email?",
        options: ["Click the link to see where it goes, then decide if it is safe","Forward it to all coworkers to warn them","Delete the email and report it to IT through official channels","Reply to the sender asking if the link is real"],
        answer: "Delete the email and report it to IT through official channels",
        hint: "Never click unknown links even to investigate — report suspicious emails to IT through official channels so they can protect everyone in the organization."
      },
      {
        q: "Your hourly rate is $16.00. You work 40 regular hours and 5 overtime hours at 1.5x the regular rate. What is your gross pay for the week?",
        options: ["$640.00","$720.00","$760.00","$680.00"],
        answer: "$760.00",
        math: true,
        hint: "Regular: 40 × $16 = $640. Overtime: 5 × $16 × 1.5 = $120. Total = $760. The 1.5x multiplier only applies to hours worked beyond 40."
      },
      {
        q: "Your supervisor is out sick and no one has been assigned to run the afternoon team meeting. The most initiative-driven response is:",
        options: ["Cancel the meeting and send everyone a message saying it will be rescheduled when the supervisor is back", "Wait at your desk for the supervisor to call in with instructions about what the team should do", "Facilitate the meeting yourself, take notes, and share a summary with your supervisor afterward", "Hold the meeting, but put off every decision and discussion until the supervisor returns"],
        answer: "Facilitate the meeting yourself, take notes, and share a summary with your supervisor afterward",
        hint: "Taking ownership when leadership is absent — and documenting the outcome — is one of the clearest demonstrations of professional initiative."
      },
      {
        q: "You discover a chemical spill in your workplace. The correct first response is:",
        options: ["Grab paper towels and clean it up right away so nobody slips before a supervisor can get there", "Alert others to stay clear, follow the facility's spill protocol, and report it to your supervisor", "Keep working at your station and wait for a qualified person to notice the spill and handle it", "Photograph the spill and fill out an incident report before you take any other action at all"],
        answer: "Alert others to stay clear, follow the facility's spill protocol, and report it to your supervisor",
        hint: "Clear the area, follow the facility spill protocol, and report immediately. Never attempt to clean a chemical spill without proper authorization and equipment."
      },
      {
        q: "A coworker makes an offhand comment that another team member finds culturally disrespectful. As a bystander, the most professional first step is:",
        options: ["Stay out of it, since the comment was between the two of them and it's not your place to get involved", "Publicly defend the affected coworker right away in front of the whole team so everyone hears it is wrong", "Check in privately with the affected coworker and, if appropriate, report the incident through proper channels", "Immediately tell the coworker who made the comment that they have to apologize in front of everyone present"],
        answer: "Check in privately with the affected coworker and, if appropriate, report the incident through proper channels",
        hint: "A private check-in respects the affected person's privacy and autonomy. Reporting through proper channels (if they want it) then addresses the root issue professionally."
      },
{
        q: "You can only think of conventional solutions to a problem your supervisor asked you to solve creatively. The most professional next step is:",
        options: ["Submit the conventional solution and leave out any mention that it isn't very creative", "Ask a colleague for a completely different perspective before presenting anything", "Tell your supervisor you are not a creative person and ask them to give the task to someone else", "Present several conventional options and let your supervisor choose whichever one seems best"],
        answer: "Ask a colleague for a completely different perspective before presenting anything",
        hint: "Creativity includes knowing when to seek outside perspective. Collaboration is often the best source of fresh ideas."
      },
      {
        q: "Before making a major workflow change for your team, the most responsible approach is to:",
        options: ["Put it in place immediately for everyone to show that you are decisive and confident", "Test it on a small scale first and evaluate the results before rolling it out", "Ask everyone on the team whether they like the idea and go with the majority vote", "Wait for management to make the decision without offering any input of your own"],
        answer: "Test it on a small scale first and evaluate the results before rolling it out",
        hint: "Piloting changes on a small scale before full implementation is a fundamental critical thinking strategy—it reduces risk and provides evidence."
      },
      {
        q: "A colleague presents a solution and asks for your opinion. The most thoughtful professional response is to:",
        options: ["Agree with the solution right away so you avoid creating any conflict with the colleague", "Point out a weakness immediately so you come across as the most analytical person present", "Ask what specific problem the solution is designed to solve before evaluating it", "Suggest an entirely different solution of your own before they finish explaining theirs"],
        answer: "Ask what specific problem the solution is designed to solve before evaluating it",
        hint: "Understanding the problem a solution targets is the first step to evaluating whether it's the right fix."
      },
      {
        q: "After completing your work for the day with time remaining before end of shift, the best demonstration of initiative is:",
        options: ["Log off early, since you have already finished all your assigned tasks", "Browse the internet quietly until the official end of your shift", "Ask your supervisor if there is anything else that needs to be done", "Work on a personal project at your desk so you still look busy"],
        answer: "Ask your supervisor if there is anything else that needs to be done",
        hint: "Seeking additional work when you have capacity—rather than filling time with personal activities—is a clear sign of strong initiative."
      },
      {
        q: "You notice that a commonly used team reference document has outdated information. You should:",
        options: ["Update the document yourself right away without telling anyone else", "Ignore it, since keeping that document current is not your assigned task", "Flag the issue to the appropriate person and offer to help update it", "Print copies of the old version for everyone so nothing gets lost later"],
        answer: "Flag the issue to the appropriate person and offer to help update it",
        hint: "Identifying a problem AND offering to help solve it—through appropriate channels—is the hallmark of professional initiative."
      },
      {
        q: "You accidentally delete an important client file. You can restore it, but it will take two hours of extra work. You should:",
        options: ["Work extra hours to fix it quietly without telling your supervisor", "Tell your supervisor immediately and work to restore the file", "Report that the file was deleted because of a software glitch", "Recreate the file from memory as best you can and say nothing"],
        answer: "Tell your supervisor immediately and work to restore the file",
        hint: "Honesty about mistakes—especially when you can fix them—demonstrates integrity. Supervisors respect transparency over cover-ups."
      },
      {
        q: "The most accurate description of a professional with a strong work ethic is someone who:",
        options: ["Works the longest hours of anyone on the team, including most nights and weekends", "Completes tasks on time, communicates proactively, and maintains quality consistently", "Never asks anyone for help under any circumstances, even when a task is unclear", "Receives the highest performance score on the team in every quarterly evaluation"],
        answer: "Completes tasks on time, communicates proactively, and maintains quality consistently",
        hint: "Work ethic is about consistency and reliability—not simply working more hours than others."
      },
      {
        q: "Your team has a relaxed afternoon before a major deadline tomorrow. The best use of your time is to:",
        options: ["Relax and enjoy the slow afternoon, since tomorrow will be a very long day", "Prepare materials and review your plan so tomorrow's work goes smoothly", "Start on the next project instead, since the current one is nearly finished", "Take an extended lunch, since there is not much work happening this afternoon"],
        answer: "Prepare materials and review your plan so tomorrow's work goes smoothly",
        hint: "Using slow periods to prepare for upcoming busy periods is a hallmark of strong work ethic and professional planning."
      },
      {
        q: "Two team members have a recurring disagreement about how to handle client communication. The best solution is to:",
        options: ["Let the two of them work it out on their own, since stepping in could make the conflict worse", "Pick one of the two approaches and require everyone to use it, without discussing it first", "Facilitate a conversation where both perspectives are heard and a shared standard is agreed upon", "Let each of them keep communicating with clients their own way so neither one feels overruled"],
        answer: "Facilitate a conversation where both perspectives are heard and a shared standard is agreed upon",
        hint: "Conflict resolution seeks common ground—having both parties heard before reaching a shared decision is the professional approach."
      },
      {
        q: "When presenting technical information to a mixed audience of experts and beginners, you should:",
        options: ["Pitch the presentation at the most advanced level so the experts stay interested", "Pitch the whole presentation at the most basic level, even for the experts present", "Use technical terms for experts and offer to clarify further for those who want it", "Ask the beginners to research the topic on their own before attending future meetings"],
        answer: "Use technical terms for experts and offer to clarify further for those who want it",
        hint: "Skilled communicators read the room and adapt—signaling that additional explanation is available respects both groups simultaneously."
      },
      {
        q: "After someone shares difficult feedback about your work, the most professional response is to:",
        options: ["Immediately defend your work and explain the reasons behind each decision you made", "Thank them and ask one clarifying question to ensure you understood correctly", "Change the subject politely so the conversation does not become uncomfortable", "Look for mistakes in their critique so you can push back on the parts you disagree with"],
        answer: "Thank them and ask one clarifying question to ensure you understood correctly",
        hint: "Thanking someone for feedback and asking for clarification shows maturity and turns a difficult moment into professional growth."
      },
      {
        q: "A team member from another country observes a holiday that no one else on the team recognizes. Your professional response should be:",
        options: ["Ask them to celebrate it quietly on their own time so it doesn't distract the rest of the team", "Acknowledge it professionally if they mention it and adjust shared deadlines if needed", "Ask them to give a presentation explaining why their holiday is important to the whole team", "Ignore it entirely and keep scheduling meetings and deadlines as if it were a normal day"],
        answer: "Acknowledge it professionally if they mention it and adjust shared deadlines if needed",
        hint: "Professional acknowledgment and reasonable scheduling accommodation show respect for cultural diversity without making it awkward."
      },
      {
        q: "Inclusive language in the workplace means:",
        options: ["Using exactly the same vocabulary with every employee, regardless of anyone's individual preferences", "Avoiding every cultural reference entirely in all workplace communications so nobody is ever offended", "Choosing words that respect each person's identity and avoid stereotypes or exclusionary assumptions", "Using formal language at all times, in every conversation, so that everyone is treated exactly equally"],
        answer: "Choosing words that respect each person's identity and avoid stereotypes or exclusionary assumptions",
        hint: "Inclusive language is about intentionality—choosing words that make all team members feel valued and respected for who they are."
      },
      {
        q: "A customer leaves a negative online review of your service. The best professional response is to:",
        options: ["Leave it alone, since online reviews don't require a response from the business that was reviewed", "Report it to the platform and ask for it to be removed, since it damages your company's reputation", "Respond professionally, thank them for their feedback, and address their concern directly", "Reply firmly to correct each inaccurate detail so other customers know the review is unfair"],
        answer: "Respond professionally, thank them for their feedback, and address their concern directly",
        hint: "Professional responses to negative reviews show you value feedback and are committed to improvement—this reassures future customers as well."
      },
      {
        q: "The most effective customer service technique when a customer is extremely upset is to:",
        options: ["Match their emotional energy and volume to show that you take the situation as seriously as they do", "Stay calm, let them finish speaking, and then acknowledge their frustration before responding", "Transfer them to a manager right away, no matter what the issue is or whether you could solve it", "Immediately offer a discount so the situation is resolved as quickly as possible and they calm down"],
        answer: "Stay calm, let them finish speaking, and then acknowledge their frustration before responding",
        hint: "De-escalation starts with calm listening. Letting an upset customer fully express their frustration before responding shows respect."
      },
      {
        q: "During a team project, one member consistently takes over discussions and dismisses others' ideas. The most professional response is to:",
        options: ["Match their dominant behavior in meetings by talking louder so your own ideas are also heard", "Say nothing and let them lead the project, since someone has to make the final decisions anyway", "Privately address the pattern with that person and suggest a structure for sharing contributions", "Complain about the person to other team members privately to build agreement against them"],
        answer: "Privately address the pattern with that person and suggest a structure for sharing contributions",
        hint: "Addressing a team dynamic issue directly and privately—with a constructive suggestion—is the professional approach."
      },
      {
        q: "Why is it important for frontline employees to understand their organization's revenue model?",
        options: ["It doesn't, because knowing how the company makes money is the job of management and executives only", "It helps them understand which tasks and customers have the greatest impact on the organization's survival", "It gives them the information they need to ask for a larger raise at their next performance review", "It helps them finish their assigned tasks faster, since they know exactly how much each task is worth"],
        answer: "It helps them understand which tasks and customers have the greatest impact on the organization's survival",
        hint: "Understanding how the organization earns revenue helps employees prioritize correctly and communicate value to customers."
      },
      {
        q: "A department proposes a cost-saving measure that improves their budget but reduces service quality for clients. From a big-picture perspective, this should be:",
        options: ["Approved right away, because saving money is always the most important priority for any organization", "Evaluated based on how the service quality reduction affects the whole organization's reputation and revenue", "Decided only by that department, since it is their budget and other departments should not interfere", "Rejected automatically, because a company should never accept any drop in client satisfaction for any reason"],
        answer: "Evaluated based on how the service quality reduction affects the whole organization's reputation and revenue",
        hint: "Big-picture thinking weighs the full organizational impact—not just the departmental benefit—of any major decision."
      },
      {
        q: "Which behavior best demonstrates strong career management?",
        options: ["Waiting for promotions to be offered without actively seeking feedback on your performance", "Scheduling regular check-ins with your supervisor to discuss your performance and career growth goals", "Changing jobs every year so your resume shows experience across as many different industries as possible", "Focusing exclusively on technical skills while ignoring professional communication and soft skills"],
        answer: "Scheduling regular check-ins with your supervisor to discuss your performance and career growth goals",
        hint: "Proactively managing your career means seeking feedback, setting goals with your supervisor, and tracking your own development."
      },
      {
        q: "Which action best demonstrates a genuine commitment to continuous learning?",
        options: ["Completing all of your required training on time and stopping there once it is finished", "Seeking out industry publications, webinars, and skills workshops on your own initiative", "Memorizing your company's existing processes and applying them the same way every time", "Only learning what is directly needed for the job responsibilities you have at this moment in time"],
        answer: "Seeking out industry publications, webinars, and skills workshops on your own initiative",
        hint: "Continuous learners go beyond required training—they proactively seek knowledge that keeps them ahead of industry changes."
      },
      {
        q: "The best way to apply a skill or concept learned in a training session is to:",
        options: ["Save your training notes and return to review them at a later date when needed","Immediately try to use the new skill or knowledge on a relevant task","Share what you learned with everyone on your team whether or not they need it","Wait until your supervisor specifically asks you to apply what you learned"],
        answer: "Immediately try to use the new skill or knowledge on a relevant task",
        hint: "New skills decay rapidly without practice. Applying them to real tasks immediately after training is the most effective retention strategy."
      },
      {
        q: "Which task management approach leads to the best long-term productivity?",
        options: ["Tackling the most enjoyable task first each day so that you always start your work in a positive mood", "Scheduling the most cognitively demanding work during the time of day when your mental energy is highest", "Handling every email and message as soon as it arrives before starting on any other type of work", "Completing tasks strictly in the order they were received, regardless of how urgent or important each is"],
        answer: "Scheduling the most cognitively demanding work during the time of day when your mental energy is highest",
        hint: "Matching task difficulty to your energy levels—doing hard work when you're most alert—is a proven productivity strategy."
      },
      {
        q: "Batching similar tasks together (such as answering all emails at once rather than throughout the day) is effective because:",
        options: ["It lets you put off tasks you dislike for longer without feeling guilty about it", "It reduces the mental switching cost of jumping between different types of work", "It makes you look busier and more productive to your coworkers and supervisors", "It delays urgent requests until later, which lowers your overall stress level"],
        answer: "It reduces the mental switching cost of jumping between different types of work",
        hint: "Task batching reduces cognitive switching costs—every time you change task types, your brain takes time to refocus. Batching keeps you in one mode longer."
      },
      {
        q: "When reading a news article about a workplace regulation change, the best way to verify the information is to:",
        options: ["Share it with your team right away if it seems important, then check the details afterward", "Check the article's date and author, then find the original official regulatory announcement", "Accept it as accurate, since it was published by a news outlet that most people recognize", "Ask a few coworkers whether they have also heard about the change and go with what they say"],
        answer: "Check the article's date and author, then find the original official regulatory announcement",
        hint: "News articles interpret regulations—they can contain errors or early information. Always verify with the original official source."
      },
      {
        q: "When working remotely on company projects, the best practice for information security is to:",
        options: ["Use public Wi-Fi since the data you're working with isn't particularly sensitive","Work from a personal device to avoid carrying company equipment back and forth","Connect to a company-approved VPN before accessing any company systems","Save files to personal cloud storage for quick access and convenience"],
        answer: "Connect to a company-approved VPN before accessing any company systems",
        hint: "A VPN encrypts your connection, protecting company data from interception on public or home networks that may not be secure."
      },
      {
        q: "You receive a text message appearing to be from your bank, saying to call a number immediately to verify your account. You should:",
        options: ["Call the number in the text message right away so your account does not get locked", "Stop using that bank account completely until you can visit a branch in person", "Look up your bank's official contact number independently and call that number instead", "Reply to the text with your account number so the bank can finish verifying your identity"],
        answer: "Look up your bank's official contact number independently and call that number instead",
        hint: "Smishing (SMS phishing) uses urgency to trick you into calling fake numbers. Always find contact info through official channels—never from the suspicious message itself."
      },
      {
        q: "Which best describes cloud computing in a workplace context?",
        options: ["Software that only runs on one specific computer in the office and cannot be accessed remotely", "Using internet-connected servers to store, manage, and process data instead of local hardware", "A type of email encryption that businesses use to keep their messages secure while in transit", "A method for printing documents to the office printer remotely from any location"],
        answer: "Using internet-connected servers to store, manage, and process data instead of local hardware",
        hint: "Cloud computing enables access from anywhere and scales easily—understanding its basics is essential workplace IT literacy."
      },
      {
        q: "What does it mean to use 'version control' for a professional document?",
        options: ["Locking a document so that no other team member is able to open it or make any edits to it", "Tracking changes over time so you can return to a previous version of the document if needed", "Making sure everyone on the team has the same software version installed to open the file", "Emailing the document to yourself every day so that you always have a backup copy somewhere"],
        answer: "Tracking changes over time so you can return to a previous version of the document if needed",
        hint: "Version control protects your work—if a mistake is made, you can restore a previous version rather than starting over from scratch."
      },
      {
        q: "A coworker sends you a file and your computer warns it may contain malware. You should:",
        options: ["Open it anyway since you personally trust the coworker who sent it","Delete it, let your coworker know, and report the incident to your IT department","Forward it to other coworkers to see if they can open it on their systems","Try opening it in a different application to see if the warning was a false alarm"],
        answer: "Delete it, let your coworker know, and report the incident to your IT department",
        hint: "Malware can infect a trusted contact's computer and spread automatically. Always report suspicious files to IT—even from known senders."
      },
      {
        q: "Before using an unfamiliar software tool on a real client project, you should:",
        options: ["Jump in and learn as you go—mistakes teach you faster than training","Complete any available training and practice on a test project before using it for real client work","Ask a coworker to do the technical parts for you while you handle communication","Skip it and use a tool you already know, even if a different tool is more appropriate for this task"],
        answer: "Complete any available training and practice on a test project before using it for real client work",
        hint: "Using an unfamiliar tool on real client work risks errors and quality issues. Training and practice first protects the client relationship."
      },
      {
        q: "Keeping your software and tools regularly updated is important because:",
        options: ["New versions always come with a better visual design and an easier user interface for everyone", "Updates frequently include security patches that protect against newly discovered vulnerabilities", "Older versions stop working completely the moment a new version is released by the company", "Employers require frequent updates for legal compliance and audit purposes only, not for safety"],
        answer: "Updates frequently include security patches that protect against newly discovered vulnerabilities",
        hint: "Many cyberattacks exploit known vulnerabilities in outdated software. Keeping tools updated is a basic but critical security practice."
      },
      {
        q: "You work a 7.5-hour shift and are paid $13.50 per hour. What is your gross pay for the shift?",
        options: ["$91.25", "$99.00", "$101.25", "$108.00"],
        answer: "$101.25",
        math: true,
        hint: "7.5 × $13.50 = $101.25. Multiply your hourly rate by exact hours worked—including decimal parts of an hour."
      },
      {
        q: "Your paycheck shows gross pay of $820.00. Taxes and deductions total $187.60. What is your net pay?",
        options: ["$622.40", "$632.40", "$642.40", "$652.40"],
        answer: "$632.40",
        math: true,
        hint: "$820.00 − $187.60 = $632.40. Net pay = Gross pay minus total deductions."
      },
      {
        q: "A project budget allows $2,400 for labor costs. Workers earn $20.00 per hour. How many labor hours can the project support?",
        options: ["110 hours", "115 hours", "120 hours", "125 hours"],
        answer: "120 hours",
        math: true,
        hint: "$2,400 ÷ $20/hr = 120 hours. Dividing total budget by the hourly rate gives the maximum hours available."
      },
      {
        q: "You need to split a $346.50 expense equally among 3 team members. What does each person owe?",
        options: ["$115.00", "$115.50", "$116.00", "$116.50"],
        answer: "$115.50",
        math: true,
        hint: "$346.50 ÷ 3 = $115.50. Division distributes costs equally—always check the math before splitting expenses with teammates."
      },
      {
        q: "Which behavior is most consistent with maintaining a professional reputation in any workplace?",
        options: ["Sharing your personal opinions about clients only with trusted coworkers during breaks", "Venting about workplace frustrations on your personal social media accounts after hours", "Maintaining confidentiality about client projects and colleagues' personal matters", "Speaking critically about competitors whenever clients ask you to compare companies"],
        answer: "Maintaining confidentiality about client projects and colleagues' personal matters",
        hint: "Professional reputation is built on trustworthiness. Confidentiality—even when not legally required—is a core professional value."
      },
      {
        q: "You disagree with a decision made by your organization's leadership. The most professional response is to:",
        options: ["Publicly criticize the decision on your personal social media accounts so that more people become aware of it", "Refuse to carry out the decision until leadership reconsiders it, so they understand how strongly you disagree", "Voice your concern through the appropriate internal channel, then implement it professionally once the decision stands", "Quit immediately if you feel strongly enough about the disagreement, since staying would mean going against your values"],
        answer: "Voice your concern through the appropriate internal channel, then implement it professionally once the decision stands",
        hint: "Professionals express disagreement through proper channels—not publicly or through non-compliance. Once a decision is final, professional implementation is expected."
      },
      {
        q: "Which is the best practice when writing a professional email?",
        options: ["Use ALL CAPS for your key points so they stand out to the reader right away", "Write in complete sentences, avoid slang, and proofread carefully before sending", "Use abbreviations and text shorthand throughout to save the reader some time", "Leave out the greeting and closing so you come across as direct and efficient"],
        answer: "Write in complete sentences, avoid slang, and proofread carefully before sending",
        hint: "Professional emails represent you and your organization—clear sentences, standard language, and proofreading are non-negotiable standards."
      },
      {
        q: "A technical report you are writing contains industry jargon that some readers may not know. You should:",
        options: ["Remove every technical term from the report so the document is accessible to everyone", "Keep all the terminology and let unfamiliar readers look up the definitions on their own", "Define technical terms the first time they appear in the document, or include a glossary", "Avoid writing technical reports at all if some of your audience might not understand them"],
        answer: "Define technical terms the first time they appear in the document, or include a glossary",
        hint: "Defining terms at first use—or providing a glossary—makes technical writing accessible to all readers without dumbing down the content."
      },
      {
        q: "You see a wet floor in a high-traffic area with no warning sign posted. The correct action is:",
        options: ["Walk carefully and assume other employees will notice the hazard on their own","Place your bag or another object to block the area as a temporary barrier","Find a wet floor sign or immediately notify someone who can secure the area","Report it to your supervisor at the end of your shift in your daily update"],
        answer: "Find a wet floor sign or immediately notify someone who can secure the area",
        hint: "Slip-and-fall injuries happen in seconds. Immediate action to warn others—not delayed reporting—is the correct safety response."
      },
      {
        q: "Which is the correct technique for lifting a heavy box at work?",
        options: ["Lift quickly using your back muscles to complete the task faster","Bend at the knees, keep the load close to your body, and lift using your leg muscles","Ask someone else to do it—lifting heavy objects at work is never your personal responsibility","Tilt the box toward yourself and drag it carefully along the floor to avoid injury"],
        answer: "Bend at the knees, keep the load close to your body, and lift using your leg muscles",
        hint: "Back injuries are among the most common workplace injuries. Proper lifting technique—legs not back—is fundamental safety knowledge every professional needs."
      },
      {
        q: "Before beginning maintenance work on an electrical system, the required safety step is to:",
        options: ["Work as quickly as possible to minimize the time the system is exposed to risk","Test the circuit with a small tool before starting to confirm it is safe","Lock out and tag out the energy source before beginning any work on the system","Ask a coworker to stand nearby in case something unexpected goes wrong"],
        answer: "Lock out and tag out the energy source before beginning any work on the system",
        hint: "Lockout/Tagout (LOTO) procedures prevent equipment from being accidentally energized during maintenance—OSHA requires them for all energy source work."
      },
      {
        q: "An employee who consistently shows up prepared, meets commitments, and communicates proactively when they cannot is demonstrating:",
        options: ["Customer service and sales skills", "Professionalism and reliability", "Advanced information literacy", "Creativity and innovative thinking"],
        answer: "Professionalism and reliability",
        hint: "Reliability—being consistently prepared, meeting commitments, and communicating proactively—is a cornerstone of workplace professionalism."
      },
{
        q: "When a standard approach fails to solve a workplace problem, the most creative professional response is to:",
        options: ["Escalate the problem to your supervisor right away, since the approach everyone uses did not work", "Try the standard approach again a few more times with small changes until one of them finally works", "Look at how the problem has been solved in completely different industries and adapt those ideas", "Write up the failure and wait for the next quarterly review meeting before looking at it again"],
        answer: "Look at how the problem has been solved in completely different industries and adapt those ideas",
        hint: "Cross-industry thinking is a powerful creativity technique—solutions that work in one field often translate brilliantly to another context."
      },
      {
        q: "Before implementing a recommendation you heard at a professional conference, you should first:",
        options: ["Put it into practice right away, since conference speakers always present current best practices", "Research whether the recommendation applies to your specific workplace context and constraints", "Ask your entire team to vote on whether to adopt it, and go with whatever the majority decides", "Wait a full year to see whether other organizations adopt it before you think about it further"],
        answer: "Research whether the recommendation applies to your specific workplace context and constraints",
        hint: "Critical thinking means evaluating new information in your specific context. What works for one organization may not work for another."
      },
      {
        q: "Which most accurately describes self-directed learning in a professional context?",
        options: ["Learning only what your employer requires and assigns to you, and completing it by the date it is due", "Independently identifying skills you need and seeking ways to develop them without waiting to be assigned training", "Completing every assigned training course faster than your coworkers so your scores stand out to your manager", "Memorizing the company's written procedures word for word without asking questions about why they exist"],
        answer: "Independently identifying skills you need and seeking ways to develop them without waiting to be assigned training",
        hint: "Self-directed learners proactively identify skill gaps and close them—they don't wait to be told what to learn."
      },
      {
        q: "An employee who volunteers for a new internal pilot program before it becomes required is demonstrating:",
        options: ["Poor professional judgment—they should wait to see if the program succeeds before getting involved", "Excellent initiative—they position themselves as an early adopter and gain experience ahead of others", "Disregard for teammates—volunteering early makes the people who didn't volunteer look bad to the boss", "Overconfidence—they are assuming they can handle something new before anyone has been trained on it"],
        answer: "Excellent initiative—they position themselves as an early adopter and gain experience ahead of others",
        hint: "Volunteering for pilot programs demonstrates initiative and positions you as a change leader rather than a change follower."
      },
      {
        q: "Using company time to work on a personal freelance project is:",
        options: ["Acceptable, as long as you have already finished all of your assigned tasks for the day", "Acceptable in small amounts, as long as it doesn't noticeably affect the quality of your output", "An integrity violation—company time and resources are paid for and expected to support company work", "Fine, as long as your supervisor hasn't specifically told you that personal projects are not allowed"],
        answer: "An integrity violation—company time and resources are paid for and expected to support company work",
        hint: "Using employer-paid time for personal profit—even when task-complete—is a breach of professional integrity and often a policy violation."
      },
      {
        q: "Setting a personal schedule for completing tasks even when no supervisor is monitoring you demonstrates:",
        options: ["Poor use of flexible work policies","Strong work ethic and self-management","A lack of trust in your supervisor's scheduling","Difficulty adapting to changing priorities"],
        answer: "Strong work ethic and self-management",
        hint: "Professionals who maintain discipline when unsupervised demonstrate that their work ethic is internal—not just performance for an audience."
      },
      {
        q: "The difference between assertive and aggressive communication in the workplace is:",
        options: ["There is no real difference; both styles get results, and the only change is how the listener happens to feel about it", "Assertive communication expresses your needs clearly while respecting others; aggressive communication prioritizes your needs at others' expense", "Aggressive communication is reserved for emergencies when quick action matters; assertive communication is for everyday casual conversations with coworkers", "Assertive communication is always louder and more direct; aggressive communication is quieter but uses more pressure and guilt"],
        answer: "Assertive communication expresses your needs clearly while respecting others; aggressive communication prioritizes your needs at others' expense",
        hint: "Assertive communication is the professional standard—clear, direct, and respectful. Aggressive communication damages relationships and workplace culture."
      },
      {
        q: "Active listening during a conflict resolution conversation means:",
        options: ["Preparing your counterargument while the other person speaks so you can respond as soon as they finish", "Focusing entirely on the other person's words, tone, and meaning before formulating your response", "Agreeing with everything the other person says so the conversation stays calm and the conflict ends", "Interrupting to clarify each point as it comes up so you understand everything immediately"],
        answer: "Focusing entirely on the other person's words, tone, and meaning before formulating your response",
        hint: "True active listening requires suspending your own response-building until the other person has fully expressed their view—this prevents misunderstanding."
      },
      {
        q: "Nonverbal communication in a professional setting includes:",
        options: ["Only hand gestures and facial expressions, since those are what people notice first", "Eye contact, body posture, tone of voice, facial expressions, and physical proximity", "Only written elements, such as formatting, punctuation, font choice, and email signatures", "Only the words you choose to say out loud during meetings and formal presentations"],
        answer: "Eye contact, body posture, tone of voice, facial expressions, and physical proximity",
        hint: "Research shows the majority of communication meaning is conveyed nonverbally. Awareness of your body language is a core professional communication skill."
      },
      {
        q: "Unconscious bias in hiring refers to:",
        options: ["Deliberately choosing not to hire members of protected groups, then hiding the reason during the interview process", "Preferences or assumptions about candidates that operate below conscious awareness and can influence decisions unfairly", "A legal term for any hiring decision that was not written down and documented in the company's applicant records", "Only racial bias in hiring, since other kinds of bias, such as age or gender bias, are not considered unconscious"],
        answer: "Preferences or assumptions about candidates that operate below conscious awareness and can influence decisions unfairly",
        hint: "Unconscious bias affects decisions without our awareness. Structured interviews and objective criteria help reduce its impact on hiring."
      },
      {
        q: "Gender-neutral language in a professional workplace is important because:",
        options: ["It is legally required in every workplace nationwide, and companies are fined each time it isn't used", "It ensures all employees and clients feel addressed and respected regardless of gender identity", "It replaces the need for any other diversity or inclusion training that the company would otherwise provide", "It makes documents shorter and easier to write, since writers no longer have to choose between pronouns"],
        answer: "It ensures all employees and clients feel addressed and respected regardless of gender identity",
        hint: "Gender-neutral language signals respect and inclusion—small word choices signal whether everyone belongs in a space."
      },
      {
        q: "The purpose of a customer satisfaction survey is:",
        options: ["To create a marketing document that shows potential customers how happy the current customers already are", "To gather specific data about the customer experience that the team can use to make measurable improvements", "To give unhappy customers a private place to vent so that they are less likely to post negative reviews online", "To satisfy an annual compliance requirement from government regulators that applies to most businesses"],
        answer: "To gather specific data about the customer experience that the team can use to make measurable improvements",
        hint: "Customer satisfaction data is only valuable if acted upon. Collecting it without analysis or action wastes both the customer's and the organization's time."
      },
      {
        q: "When a customer requests a service that is completely outside your scope or authorization, you should:",
        options: ["Try to provide the service anyway, even though it is outside your scope and authorization, because keeping the customer happy always comes first", "Tell the customer the request is impossible and politely end the conversation so you can move on to the next customer waiting", "Clearly explain you cannot help with that specific request, and either refer them to someone who can or offer alternatives within your scope", "Promise the customer you will look into it personally so they leave satisfied, even if you are not able to follow up later"],
        answer: "Clearly explain you cannot help with that specific request, and either refer them to someone who can or offer alternatives within your scope",
        hint: "Transparency about scope plus a referral or alternative is excellent customer service. Attempting service beyond your authorization creates risk."
      },
      {
        q: "A team charter is most useful for:",
        options: ["Assigning individual performance goals to each team member and recording who is responsible for each goal", "Establishing shared agreements about how the team will work together, make decisions, and resolve disagreements", "Tracking the project's milestones and deadlines so the team can see at a glance whether it is on schedule", "Setting each team member's salary range and deciding who will be eligible for a bonus at the end of the project"],
        answer: "Establishing shared agreements about how the team will work together, make decisions, and resolve disagreements",
        hint: "Team charters prevent confusion by making implicit expectations explicit—they are especially valuable when a team is newly formed or facing dysfunction."
      },
      {
        q: "Why should a web designer understand their client's business model and target audience before starting a design?",
        options: ["Because most design software requires the client's business information as input before it can generate a page layout", "Because the design must serve business goals—not just look good—and that requires understanding who it is designed to reach and why", "Because web designers are also responsible for planning, launching, and running the client's entire marketing strategy once the site goes live", "Because knowing the client's business and budget helps the designer decide which design software and fonts to purchase"],
        answer: "Because the design must serve business goals—not just look good—and that requires understanding who it is designed to reach and why",
        hint: "A web designer who doesn't understand the business is making aesthetic decisions that may not support the client's actual goals—big-picture thinking prevents this."
      },
      {
        q: "A career ladder differs from a career lattice in that a career ladder:",
        options: ["Is only available in large organizations with many layers of management, while a lattice is only found in small businesses", "Represents a strictly upward progression, while a lattice allows lateral, diagonal, and upward movement to build a wider range of skills", "Is always faster and leads to higher pay, while a lattice keeps employees at the same level and pay for longer periods of time", "Is a newer concept that has replaced the traditional lattice model, which most companies stopped using because it confused their employees"],
        answer: "Represents a strictly upward progression, while a lattice allows lateral, diagonal, and upward movement to build a wider range of skills",
        hint: "Career lattice thinking is increasingly important—building breadth of experience often creates more opportunity than narrow upward climbing."
      },
      {
        q: "Informational interviews are used primarily to:",
        options: ["Formally apply for a position that has not been posted publicly yet, before any other candidates have had a chance to hear about it", "Learn about a career path, industry, or organization from someone who works in it, without the pressure of a formal job interview", "Get detailed feedback on your resume from hiring managers so you can fix it before submitting any real job applications", "Negotiate the salary, benefits, and start date of a job offer with the hiring manager before you sign the final paperwork"],
        answer: "Learn about a career path, industry, or organization from someone who works in it, without the pressure of a formal job interview",
        hint: "Informational interviews are powerful career tools—they build networks and gather insider knowledge that helps you make better career decisions."
      },
      {
        q: "The Pomodoro Technique is used to:",
        options: ["Track the number of steps you take during the workday so you can monitor your physical health and activity level", "Structure focused work into timed intervals (typically 25 minutes) separated by short breaks to maintain concentration", "Measure a project's return on investment using a standardized formula based on how many hours the team spent on it", "Organize computer files using a color-coded, date-based naming system so that documents are easier to find later"],
        answer: "Structure focused work into timed intervals (typically 25 minutes) separated by short breaks to maintain concentration",
        hint: "The Pomodoro Technique combats attention drift by creating urgency within short, defined windows—many professionals find it dramatically improves focus and output."
      },
      {
        q: "The 80/20 rule (Pareto Principle) in workplace productivity suggests that:",
        options: ["You should spend about 80% of your time planning a task and only 20% actually doing it, so mistakes are caught early", "Roughly 80% of your results come from 20% of your efforts, so identifying that high-impact 20% is the key to efficiency", "The top 20% of your team produces 80% of the value, so investing in them exclusively is the most efficient strategy", "About 80% of workplace problems are caused by 20% of employees, so managers should focus their attention on that group"],
        answer: "Roughly 80% of your results come from 20% of your efforts, so identifying that high-impact 20% is the key to efficiency",
        hint: "The Pareto Principle applied to your work means finding and prioritizing the activities that generate the most results—not treating all tasks equally."
      },
      {
        q: "Lateral reading as an information literacy technique means:",
        options: ["Reading a document from right to left and bottom to top so you can spot hidden errors in its logic and its grammar", "Opening multiple tabs to check what other sources say about the author, organization, and claims in the document you're evaluating", "Reading only the first and last paragraphs of a long document, since those two parts are usually enough to judge whether the whole thing is credible", "Scanning a document quickly for important keywords without reading it in full, so you can evaluate many sources fast"],
        answer: "Opening multiple tabs to check what other sources say about the author, organization, and claims in the document you're evaluating",
        hint: "Lateral reading is used by professional fact-checkers—going outside a source to evaluate it is faster and more reliable than reading the source deeply."
      },
      {
        q: "A social engineering attack in cybersecurity relies on:",
        options: ["Using advanced software to break through a company's technical firewalls and encryption", "Manipulating people into revealing credentials or taking actions that compromise security", "Physically stealing laptops, phones, or hard drives that contain sensitive company data", "Scanning a company's networks automatically for software that hasn't been updated or patched"],
        answer: "Manipulating people into revealing credentials or taking actions that compromise security",
        hint: "Social engineering bypasses technical security by targeting the human element—the most sophisticated firewall can't protect against a person who gives away their password."
      },
      {
        q: "Zero-trust security in an organization means:",
        options: ["Refusing to use any cloud services or outside software, because nothing outside the company's own building can be trusted", "Verifying every user and device every time they request access, regardless of whether they are inside or outside the company network", "Giving access to company systems only to the CEO and senior IT staff, since they are the only people who can be fully trusted", "Not allowing any employee to work remotely, because connections from outside the office network can never be made secure enough"],
        answer: "Verifying every user and device every time they request access, regardless of whether they are inside or outside the company network",
        hint: "Zero-trust eliminates the assumption that anything inside the network is automatically safe—every access request must be authenticated and authorized."
      },
      {
        q: "The difference between hardware and software in a workplace technology context is:",
        options: ["Hardware is the newer technology that companies buy today; software is older technology that will eventually be replaced by hardware", "Hardware refers to the physical components of a computer system; software refers to the programs and operating instructions that run on that hardware", "Hardware is owned outright by the company; software is only licensed, so the programs are not truly the company's property or responsibility", "Hardware is always more expensive than software, so companies should spend most of their technology budget on buying new computers and equipment each year"],
        answer: "Hardware refers to the physical components of a computer system; software refers to the programs and operating instructions that run on that hardware",
        hint: "Hardware you can touch (computer, monitor, keyboard); software runs on hardware (operating system, apps). Both are essential to every modern workplace."
      },
      {
        q: "What does SaaS stand for in a technology context, and why is it relevant to professionals?",
        options: ["Secure Access and Authorization System—a cybersecurity certification program that IT professionals complete before managing networks", "Software as a Service—cloud-delivered software accessed via subscription rather than installed locally, common in modern workplaces", "Systems and Applications Software Suite—a government compliance standard that all business software must meet before it can be sold", "Storage as a Shared Service—a method for backing up company data across multiple physical locations in case of a disaster"],
        answer: "Software as a Service—cloud-delivered software accessed via subscription rather than installed locally, common in modern workplaces",
        hint: "SaaS tools like Google Workspace, Microsoft 365, and Canva are used in virtually every modern workplace—understanding the model helps you use and explain these tools professionally."
      },
      {
        q: "File permissions in a shared company drive are important because:",
        options: ["They ensure that only users who need access to specific files actually have it, protecting sensitive information", "They prevent anyone at all from editing shared documents, which protects every file from accidental changes", "They allow the IT department to track exactly how much time each employee spends working on every file during the day", "They speed up file loading times by limiting how many people can have the same file open at the same moment"],
        answer: "They ensure that only users who need access to specific files actually have it, protecting sensitive information",
        hint: "Proper file permissions apply the principle of least privilege—employees can only access what they need, reducing the risk of accidental or intentional data breaches."
      },
      {
        q: "The advantage of using professional document templates in the workplace is:",
        options: ["Templates remove the need to proofread your documents, since the formatting and layout are already guaranteed to be correct", "Templates ensure consistent branding, structure, and formatting while saving time on documents that follow a standard format", "Templates mean you never need to learn to write professionally, because most of the words are already written in for you", "Templates are required by federal law for all business communications, so using them protects the company from legal penalties"],
        answer: "Templates ensure consistent branding, structure, and formatting while saving time on documents that follow a standard format",
        hint: "Templates enforce professional standards at scale—every invoice, report, or proposal your team produces looks consistent and meets your organization's requirements."
      },
      {
        q: "Your hourly rate is $15.50 and you work 32 hours this week. What is your gross pay?",
        options: ["$480.00", "$492.00", "$496.00", "$512.00"],
        answer: "$496.00",
        math: true,
        hint: "$15.50 × 32 = $496.00. Multiply your rate by exact hours—double-check by estimating: $15 × 32 = $480, plus $0.50 × 32 = $16, total $496."
      },
      {
        q: "A project is estimated to cost $3,200 but the actual cost came in at $2,750. By what percentage was the project under budget?",
        options: ["About 12%", "About 14%", "About 16%", "About 18%"],
        answer: "About 14%",
        math: true,
        hint: "($3,200 − $2,750) ÷ $3,200 = $450 ÷ $3,200 ≈ 0.1406, or about 14%. Percentage savings = difference ÷ original estimate."
      },
      {
        q: "An employee earns an annual salary of $37,440. What is their gross pay per month (assuming 12 equal payments per year)?",
        options: ["$2,940.00", "$3,100.00", "$3,120.00", "$3,240.00"],
        answer: "$3,120.00",
        math: true,
        hint: "$37,440 ÷ 12 = $3,120.00. Annual salary divided by 12 gives the monthly gross—always use 12 for monthly, not 52."
      },
      {
        q: "$1,200 is budgeted for office supplies this quarter. You have spent $876. How much remains in the budget?",
        options: ["$314.00", "$324.00", "$334.00", "$344.00"],
        answer: "$324.00",
        math: true,
        hint: "$1,200 − $876 = $324.00. Tracking remaining budget is a critical professional skill—always know where you stand against your allocation."
      },
      {
        q: "Maintaining a professional digital footprint in your career means:",
        options: ["Deleting all of your personal social media accounts and keeping no online presence at all, so that employers searching your name cannot find anything about you", "Ensuring that your public-facing online presence—social media profiles, posts, and content—reflects the professional identity you want employers to see", "Only using platforms your company provides and never creating personal accounts, so your online activity always stays professional", "Sharing as much professional content as possible on every platform, every day, to maximize how often employers see your name in their feeds"],
        answer: "Ensuring that your public-facing online presence—social media profiles, posts, and content—reflects the professional identity you want employers to see",
        hint: "Employers regularly research candidates online before and after hiring. Your digital footprint is an extension of your professional reputation."
      },
      {
        q: "The purpose of a dress code in most professional workplaces is:",
        options: ["To make employees feel slightly uncomfortable at work so that managers can establish their authority over the team more easily", "To create a consistent, appropriate appearance that represents the organization professionally and signals readiness to work", "To remove individual expression entirely, so that every employee looks exactly the same no matter what their job or role is", "To satisfy a federal government regulation that applies to all private businesses with more than a certain number of employees"],
        answer: "To create a consistent, appropriate appearance that represents the organization professionally and signals readiness to work",
        hint: "Dress codes set professional expectations—they help clients, customers, and visitors quickly identify staff and signal a commitment to workplace standards."
      },
      {
        q: "Which is the most effective way to incorporate cited information into a professional report?",
        options: ["Copy the source material word-for-word and note the author's name in the margin","Paraphrase the information in your own words and include a proper citation indicating the original source","Use information freely without citation since the document is internal only","List all sources consulted at the bottom of the document without indicating which information came from which source"],
        answer: "Paraphrase the information in your own words and include a proper citation indicating the original source",
        hint: "Paraphrasing shows you understood the material; citing the source gives credit and allows readers to verify the information—both are expected in professional writing."
      },
      {
        q: "The purpose of an executive summary in a business document is to:",
        options: ["Replace the full report for readers who are too busy to read the whole document, so the remaining sections can be skipped by most of the audience", "Provide a concise overview of the document's key findings, conclusions, and recommendations for readers who need a quick overview before reading in detail", "Explain who the target audience of the report is, why they should read it, and which sections they are allowed to skip if they are short on time", "List the author's qualifications, past experience, and professional credentials in order to establish the credibility of the report before it begins"],
        answer: "Provide a concise overview of the document's key findings, conclusions, and recommendations for readers who need a quick overview before reading in detail",
        hint: "Executive summaries are read by decision-makers who may not have time for the full report—they must be concise, accurate, and complete enough to act on."
      },
      {
        q: "Which action most effectively prevents repetitive strain injuries (RSI) at a computer workstation?",
        options: ["Typing as fast as you can so that you spend less total time at the keyboard over the course of each day", "Using correct ergonomic positioning and taking regular short breaks to rest your hands, wrists, and eyes", "Wearing thick gloves while you work at the computer to cushion your hands and wrists from the hard keys", "Working fewer than four hours a day at any screen, even if it means leaving your assigned work unfinished"],
        answer: "Using correct ergonomic positioning and taking regular short breaks to rest your hands, wrists, and eyes",
        hint: "RSI prevention requires both correct positioning (wrist alignment, monitor height, chair support) and regular breaks to let muscles recover—neither alone is sufficient."
      },
      {
        q: "When a fire alarm activates in your workplace, the correct first action is:",
        options: ["Look out the nearest window or down the hallway to confirm there is actually smoke or fire before you start to evacuate the building", "Alert your supervisor that the alarm is going off and wait at your workstation for their instructions before moving anywhere", "Immediately evacuate via the nearest safe exit, taking nothing with you, and account for your team at the designated meeting point", "Call 911 from your desk phone before evacuating so emergency services have detailed information about the fire as soon as possible"],
        answer: "Immediately evacuate via the nearest safe exit, taking nothing with you, and account for your team at the designated meeting point",
        hint: "Fire safety protocols prioritize life over property. Every second spent confirming, notifying, or gathering belongings increases the risk during an actual fire."
      },
      {
        q: "The purpose of a Safety Data Sheet (SDS) for a chemical product in the workplace is to:",
        options: ["Prove that the chemical has been fully tested and approved by the Environmental Protection Agency (EPA) for everyday use in workplaces", "Provide comprehensive information about safe handling, storage, health hazards, and emergency procedures for that specific chemical", "Serve as a legal receipt proving that the employer purchased the chemical from a licensed supplier and paid the required taxes", "Track which employees have been trained and certified to use the chemical, along with the dates their training will expire"],
        answer: "Provide comprehensive information about safe handling, storage, health hazards, and emergency procedures for that specific chemical",
        hint: "SDS sheets (formerly MSDS) are required for all hazardous workplace chemicals. Knowing where they are stored and how to read them is a legal safety requirement."
      },
      {
        q: "Which statement best describes a growth mindset in a professional workplace context?",
        options: ["Believing your abilities and intelligence are fixed at birth and cannot be changed much, so it is best to focus on what you're already good at", "Believing that dedication and effort can grow your skills and intelligence over time, and treating challenges as opportunities to improve", "Only taking on tasks you already know how to do well, so that your professional reputation and performance ratings keep growing over time", "Asking your supervisor for performance feedback at least once per year, usually during your annual review, and filing it for later"],
        answer: "Believing that dedication and effort can grow your skills and intelligence over time, and treating challenges as opportunities to improve",
        hint: "Growth mindset (Carol Dweck) means seeing effort as the path to mastery—professionals with this mindset recover from setbacks faster and develop more over their careers."
      },
      {
        q: "Delegation in a professional context means:",
        options: ["Passing a task to someone else and taking no further responsibility for how it turns out, since it is now their job", "Assigning a task to an appropriate person while remaining accountable for the outcome and providing necessary support", "Refusing tasks that are below your skill level so that you can stay efficient and focus only on the most important projects", "Asking a colleague to quietly help with your assigned work without letting your supervisor know that you did so"],
        answer: "Assigning a task to an appropriate person while remaining accountable for the outcome and providing necessary support",
        hint: "Effective delegation means matching the right task to the right person AND staying accountable—delegating is not the same as abandoning responsibility."
      },
      {
        q: "Which best describes the concept of opportunity cost in a professional decision-making context?",
        options: ["The financial cost of training an employee so they are ready to take on a new job opportunity in the company", "What you give up by choosing one option over another—the value of the best alternative you didn't choose", "The cost a business pays when it fails to take advantage of an opportunity before the time window closes", "The extra cost added to a project because of unexpected complications or changes to the project's scope"],
        answer: "What you give up by choosing one option over another—the value of the best alternative you didn't choose",
        hint: "Opportunity cost is a critical thinking concept—every choice forecloses other options. Professionals weigh what they gain AND what they sacrifice with any significant decision."
      },
      {
        q: "An employee who maintains consistent professional standards regardless of who is watching demonstrates:",
        options: ["A tendency toward perfectionism that can slow team velocity","Character consistency and genuine professional integrity","An inability to adapt to different workplace contexts","Excessive formality that makes them difficult to work with"],
        answer: "Character consistency and genuine professional integrity",
        hint: "Integrity means behaving the same way whether or not you're being observed—character consistency is a foundational professional value."
      },
      {
        q: "The best way to demonstrate continuous learning to a current or potential employer is to:",
        options: ["Tell them during job interviews how much you enjoy learning and how quickly you pick things up", "Maintain a portfolio of completed certifications, projects, and skills developed over time", "Enroll in as many online courses as possible, even if you don't have time to complete them", "Ask your supervisor to assign you a new training course every quarter and wait for it to arrive"],
        answer: "Maintain a portfolio of completed certifications, projects, and skills developed over time",
        hint: "Documenting your continuous learning with tangible evidence—credentials, projects, skills—transforms a claim into proof that employers can verify."
      },
      {
        q: "Root cause analysis is a critical thinking process used to:",
        options: ["Figure out which team member caused a problem so that the right person can be held responsible for it", "Identify the underlying cause of a problem rather than just treating its symptoms, so it doesn't recur", "Estimate how much it will cost to solve a complex problem before the company commits any of its resources", "Compare several possible solutions to a problem and then select the one that will be the cheapest to carry out"],
        answer: "Identify the underlying cause of a problem rather than just treating its symptoms, so it doesn't recur",
        hint: "Root cause analysis prevents recurring problems—fixing a symptom gives temporary relief; fixing the cause prevents the problem from returning."
      },
{
        q: "Design thinking is a problem-solving approach that differs from traditional approaches because it:",
        options: ["Focuses only on the technical specifications of a product or system before thinking about who will use it", "Begins with deep empathy for the user's experience before defining problems or generating solutions", "Requires a team of trained professional designers, so it cannot be used by everyday employees on the job", "Applies only to designing physical products, not to solving workplace process or customer service problems"],
        answer: "Begins with deep empathy for the user's experience before defining problems or generating solutions",
        hint: "Design thinking starts with 'Who is this for and what do they actually need?' before jumping to solutions—this prevents building the wrong thing well."
      },
      {
        q: "Taking initiative on a project differs from overstepping boundaries because taking initiative:",
        options: ["Is only possible for senior employees who already have established authority to make decisions on their own", "Means acting within or just beyond your role to improve outcomes, while keeping your supervisor informed", "Always requires written pre-approval and a signed authorization form before you change anything at all", "Means doing whatever you personally think is best, regardless of the organization's structure or processes"],
        answer: "Means acting within or just beyond your role to improve outcomes, while keeping your supervisor informed",
        hint: "Initiative operates within professional context—the key is transparency with your supervisor. Overstepping ignores authority; initiative respects it while pushing boundaries thoughtfully."
      },
      {
        q: "Reporting a coworker's serious policy violation is professionally difficult but necessary because:",
        options: ["It shows management that you are competitive and paying close attention to how your coworkers perform, which can help you earn a promotion", "Unaddressed violations create risk for the organization, other employees, and sometimes customers—protecting the whole is part of professional integrity", "It gives you leverage in future performance discussions, since managers remember which employees brought problems to their attention", "It is legally required in every professional setting regardless of the type of violation, and employees who fail to report one can be personally fined or arrested"],
        answer: "Unaddressed violations create risk for the organization, other employees, and sometimes customers—protecting the whole is part of professional integrity",
        hint: "Professional integrity sometimes requires difficult acts. Staying silent about serious violations makes you complicit in their consequences."
      },
      {
        q: "Accountability in the professional workplace means:",
        options: ["Taking credit for the successes on your team while explaining that failures were caused by outside factors you couldn't control", "Owning your results—both the successes and the failures—and being transparent with your team when something goes wrong", "Monitoring your teammates closely to make sure each of them is meeting their commitments and reporting anyone who falls behind", "Documenting every action you take so that you have evidence to protect yourself if something is ever questioned later"],
        answer: "Owning your results—both the successes and the failures—and being transparent with your team when something goes wrong",
        hint: "Accountability is about ownership, not blame. Professionals who own their mistakes and focus on solutions earn far more trust than those who blame circumstances."
      },
      {
        q: "A professional with strong work ethic receives critical performance feedback from their supervisor. Their most professional response is to:",
        options: ["Explain the outside factors that caused the performance issue before the supervisor can bring them up", "Stay silent and wait for the supervisor to stop talking, then leave the meeting as quickly as possible", "Thank the supervisor, ask clarifying questions about how to improve, and create an action plan", "Send the supervisor a counter-proposal with their own performance measures at the next review"],
        answer: "Thank the supervisor, ask clarifying questions about how to improve, and create an action plan",
        hint: "Receiving feedback well—without defensiveness—and turning it into an action plan is one of the highest demonstrations of professional work ethic and growth orientation."
      },
      {
        q: "De-escalation techniques used in workplace conflict include:",
        options: ["Matching the other person's emotional intensity and volume so they can see you understand how serious their concern is", "Speaking faster and steering the conversation forward quickly so the other person has less time to become more upset", "Lowering your voice, maintaining open body language, and acknowledging the other person's perspective before responding", "Immediately involving Human Resources so that every part of the conversation is formally documented from the very start"],
        answer: "Lowering your voice, maintaining open body language, and acknowledging the other person's perspective before responding",
        hint: "De-escalation works by disrupting the escalation cycle—calm signals safety, and acknowledging someone's perspective reduces their need to fight to be heard."
      },
      {
        q: "A win-win conflict resolution outcome means:",
        options: ["One party wins completely, and the other party accepts the final result gracefully and without any further complaint", "Both parties compromise equally, with each side giving up exactly the same amount as the other one", "A solution is found that addresses the core needs of both parties, even if each gives up some original position", "The supervisor makes a final decision about the conflict that both parties are required to accept and follow"],
        answer: "A solution is found that addresses the core needs of both parties, even if each gives up some original position",
        hint: "Win-win solutions focus on interests (underlying needs), not positions (stated demands)—creative options often satisfy both parties' real needs even when positions seem incompatible."
      },
      {
        q: "The BLUF method in professional writing stands for and is used to:",
        options: ["Best Language, Useful Format—a standard that federal agencies use for structuring the sections of their reports and official memos", "Bottom Line Up Front—placing your most important conclusion or action item at the beginning so readers immediately understand the purpose", "Brief, Logical, Useful, Fact-based—a checklist that professionals use for reviewing their documents one final time before sending them to readers", "Bulleted, Listed, Underlined, Formatted—a visual formatting standard used for slides in executive presentations and board meetings"],
        answer: "Bottom Line Up Front—placing your most important conclusion or action item at the beginning so readers immediately understand the purpose",
        hint: "BLUF respects the reader's time. Busy professionals should not have to read an entire document to find out why it was sent to them."
      },
      {
        q: "Adjusting your communication style to fit different professional audiences is called:",
        options: ["Code switching—a controversial practice that professionals should avoid in most workplace settings", "Audience adaptation—a core professional communication skill that improves clarity and reception", "Style inconsistency—a sign of a weak professional identity and an unclear personal brand at work", "Diplomatic communication—a specialized skill reserved for people in leadership and management roles"],
        answer: "Audience adaptation—a core professional communication skill that improves clarity and reception",
        hint: "Effective communicators adjust vocabulary, tone, detail level, and format based on who they are addressing—the same message requires different delivery for experts vs. general audiences."
      },
      {
        q: "Microaggressions in the professional workplace are:",
        options: ["Only a concern in workplaces that have formally written and documented diversity policies, since other workplaces have no rules about them", "Openly aggressive physical actions, such as threats, shoving, or blocking someone's path, that automatically qualify as illegal discrimination under federal law", "Brief, everyday exchanges or comments that communicate subtle, often unintentional bias or negative messages toward members of marginalized groups", "Rare events that only happen in workplaces with serious cultural problems, so most employees will never see or experience one at work"],
        answer: "Brief, everyday exchanges or comments that communicate subtle, often unintentional bias or negative messages toward members of marginalized groups",
        hint: "Microaggressions are harmful even when unintentional. Awareness—and a willingness to listen when someone names an impact—is foundational to an inclusive workplace."
      },
      {
        q: "Cultural competence in the workplace is best defined as:",
        options: ["The ability to speak multiple languages fluently so that you can communicate with any customer or coworker you meet", "An ongoing practice of understanding, respecting, and effectively working with people from diverse cultural backgrounds", "A formal certification that employees must earn before they are allowed to work in any customer-facing role", "Knowing the dates of every cultural and religious holiday your coworkers observe so you can avoid scheduling conflicts"],
        answer: "An ongoing practice of understanding, respecting, and effectively working with people from diverse cultural backgrounds",
        hint: "Cultural competence is developed continuously—it requires humility, curiosity, and a willingness to learn from experiences and feedback."
      },
      {
        q: "The first-call resolution (FCR) metric in customer service measures:",
        options: ["How quickly a customer service representative answers the phone after it begins ringing, measured in seconds per call", "The percentage of customer issues resolved completely during the first contact without requiring callbacks or follow-up", "How satisfied customers say they feel at the end of any interaction, based on a short survey sent after the conversation", "The average cost of resolving a single customer issue across the whole team, including staff time and any refunds given"],
        answer: "The percentage of customer issues resolved completely during the first contact without requiring callbacks or follow-up",
        hint: "FCR is a key customer service performance indicator—high FCR scores mean customers get their problems solved faster, which increases satisfaction and reduces costs."
      },
      {
        q: "When a customer provides enthusiastic positive feedback about your service, the most professional response is:",
        options: ["Thank them briefly and move right on to the next customer in line, since no further action is ever needed when an interaction has already gone well", "Thank them sincerely, ask if they would be willing to share their experience in a review or referral, and note what worked for future improvement", "Immediately share the customer's message with your entire team in the group chat so everyone can see how well you handled it", "Ask them why their other interactions with the company may not have felt the same way, so you can find out what other employees did wrong"],
        answer: "Thank them sincerely, ask if they would be willing to share their experience in a review or referral, and note what worked for future improvement",
        hint: "Positive feedback is an opportunity—genuinely acknowledging it builds the relationship, and encouraging sharing (reviews, referrals) extends its value to the organization."
      },
      {
        q: "Groupthink is problematic in team decision-making because it:",
        options: ["Causes teams to make decisions far too slowly, because every single member must agree before anything can move forward", "Occurs when the desire for harmony or conformity overrides realistic evaluation of alternatives, leading to poor decisions", "Makes it impossible for new team members to contribute meaningfully, since only longtime members are allowed to speak", "Means the team leader always makes every decision alone without consulting anyone on the team, even when others have more expertise"],
        answer: "Occurs when the desire for harmony or conformity overrides realistic evaluation of alternatives, leading to poor decisions",
        hint: "Groupthink silences dissent. Teams that make space for healthy disagreement consistently make better decisions than teams that suppress contrary views."
      },
      {
        q: "Organizational culture affects an organization's big picture because:",
        options: ["It determines the physical layout of the workplace, such as open offices or cubicles, which directly controls how productive employees are", "It shapes how employees make decisions, treat each other and customers, and represent the organization—influencing every strategic outcome", "It is a legally required component of every organization with more than 50 employees, and companies must report on it to the government each year", "It only affects how long employees stay with the company; organizational culture has no real impact on customers or business performance"],
        answer: "It shapes how employees make decisions, treat each other and customers, and represent the organization—influencing every strategic outcome",
        hint: "Culture is often described as 'how we do things here'—it influences strategy, execution, and reputation in ways that formal policies alone cannot control."
      },
      {
        q: "A company's SWOT analysis evaluates:",
        options: ["Software, Workforce, Operations, and Technology—the four pillars a company reviews during digital transformation", "Strengths, Weaknesses, Opportunities, and Threats—internal and external factors that shape strategic planning", "Sales, Wages, Output, and Timing—a financial performance model that companies use for their quarterly reports", "Style, Writing, Organization, and Tone—a framework for evaluating the quality of professional communications"],
        answer: "Strengths, Weaknesses, Opportunities, and Threats—internal and external factors that shape strategic planning",
        hint: "SWOT analysis helps organizations understand what they do well, where they fall short, what external opportunities exist, and what risks they face—essential for strategic planning."
      },
      {
        q: "The purpose of a professional LinkedIn profile in career management is to:",
        options: ["Copy your resume into a digital format word for word so that you can email employers a link instead of attaching a file", "Build a professional public identity, demonstrate expertise, connect with peers and recruiters, and stay visible in your field", "Keep a private record of your daily work activities so you can reflect on your own progress and track your personal goals", "Replace the need for a formal resume entirely when applying for jobs at large companies, since recruiters no longer read them"],
        answer: "Build a professional public identity, demonstrate expertise, connect with peers and recruiters, and stay visible in your field",
        hint: "LinkedIn is more than an online resume—it's your professional presence in a global network where employers actively search for talent and where industries share knowledge."
      },
      {
        q: "Financial literacy as a career management skill includes:",
        options: ["Understanding only how to file your own taxes each year, since taxes are the one part of personal finance that affects your career directly", "Understanding your paycheck, managing a personal budget, building an emergency fund, and making informed decisions about benefits and retirement plans", "Knowing how to pick individual stocks and trade them actively in the stock market so you can maximize your returns as quickly as possible", "Only applying to jobs that pay above the median salary for your field, and turning down any offer with lower pay no matter what benefits it includes"],
        answer: "Understanding your paycheck, managing a personal budget, building an emergency fund, and making informed decisions about benefits and retirement plans",
        hint: "Financial literacy goes far beyond taxes—it's the ability to make informed decisions with your money throughout your career, from your first paycheck to retirement."
      },
      {
        q: "GTD (Getting Things Done) methodology focuses on:",
        options: ["Completing the highest possible number of tasks in the shortest amount of time each day, even if that means skipping the planning and review steps entirely", "Capturing every commitment and task outside your head into a trusted system, then organizing and reviewing them regularly to ensure nothing falls through the cracks", "Working through the whole day without breaks to maximize the number of tasks you complete, then starting over first thing the next morning", "Prioritizing only the tasks your supervisor assigns to you and ignoring any items you identify on your own, so that you never take on more work than you are asked to"],
        answer: "Capturing every commitment and task outside your head into a trusted system, then organizing and reviewing them regularly to ensure nothing falls through the cracks",
        hint: "GTD's core insight is that your brain is for thinking—not for storing commitments. An external trusted system frees mental energy for deep work."
      },
      {
        q: "Automating a repetitive task in your workflow benefits the organization because:",
        options: ["Automation always produces exactly the same results as careful manual work, so quality checks and reviews become completely unnecessary", "It removes the need for any human oversight of that function, so no one in the organization will ever have to check, update, or maintain it again", "It reduces time spent on low-value repetitive work, freeing human attention for judgment-intensive tasks that require experience and creativity", "It makes sure the task still gets done when employees are absent, which eliminates the need to cross-train anyone on the team for backup"],
        answer: "It reduces time spent on low-value repetitive work, freeing human attention for judgment-intensive tasks that require experience and creativity",
        hint: "Strategic automation multiplies human capacity—it handles the predictable so professionals can focus on problems that genuinely require human judgment."
      },
      {
        q: "When researching a medical topic for a workplace wellness program, the most reliable type of source is:",
        options: ["A wellness influencer's social media posts, since they are current, popular, and shared widely by many followers", "A peer-reviewed medical journal article or information from a recognized health authority such as the CDC or NIH", "A popular health magazine article, since it is written for regular readers and is easy for employees to understand", "An online forum where many people have shared their personal experiences with the same health issue over time"],
        answer: "A peer-reviewed medical journal article or information from a recognized health authority such as the CDC or NIH",
        hint: "Medical decisions require evidence-based sources. Peer-reviewed research and recognized health authorities provide information that has been vetted by experts."
      },
      {
        q: "Evaluating information using the CRAAP test checks for:",
        options: ["Creativity, Reliability, Accuracy, Authority, and Purpose—a framework that teachers and managers use for evaluating creative work and design projects", "Currency, Relevance, Authority, Accuracy, and Purpose—five criteria for evaluating the quality and credibility of an information source", "Clarity, Readability, Accessibility, Appropriateness, and Professionalism—a standard for checking professional documents before sending", "Copyright, Rights, Attribution, Authorship, and Permission—a framework for deciding whether you can legally reuse information"],
        answer: "Currency, Relevance, Authority, Accuracy, and Purpose—five criteria for evaluating the quality and credibility of an information source",
        hint: "The CRAAP test gives you a systematic framework for evaluating any source—applying it protects you from using outdated, biased, or inaccurate information in professional work."
      },
      {
        q: "The principle of least privilege in information security means:",
        options: ["Senior employees should have fewer system permissions than other staff in order to reduce the risk of accidental data leaks", "Every user should have access only to the specific data and systems required for their current job function—nothing more", "New employees should not have any system access at all until they complete a 90-day probationary period with the company", "All employees should share the same access credentials so that anyone can handle any task if an emergency happens"],
        answer: "Every user should have access only to the specific data and systems required for their current job function—nothing more",
        hint: "Least privilege limits the blast radius of any compromise—if an account is hacked, the attacker can only reach what that account was permitted to access."
      },
      {
        q: "A ransomware attack most commonly begins with:",
        options: ["Hackers physically breaking into an office building after hours and directly accessing the company's server hardware to install malware", "A user clicking a malicious link or opening an infected attachment, allowing malware to encrypt files and demand payment for their release", "An automatic vulnerability scan that finds and exploits unpatched software on its own, without any human action involved at any point", "Employees leaving company laptops on public transportation, where they are found and opened by malicious actors looking for valuable data"],
        answer: "A user clicking a malicious link or opening an infected attachment, allowing malware to encrypt files and demand payment for their release",
        hint: "Ransomware almost always enters through human error—phishing emails that trick users into clicking. Security awareness training is the most effective preventive measure."
      },
      {
        q: "The purpose of a content management system (CMS) in a professional setting is to:",
        options: ["Replace the need for a professional web designer or developer on any project, since the software builds every site on its own", "Allow authorized users to create, edit, organize, and publish digital content without needing to write code directly", "Store all of the company's email communications in a single searchable archive so that messages can be found again later", "Manage which employees have access permissions to the company's cloud-based services, and remove access when someone leaves"],
        answer: "Allow authorized users to create, edit, organize, and publish digital content without needing to write code directly",
        hint: "CMS platforms like WordPress, Webflow, and Squarespace democratize content management—non-technical team members can update websites without developer assistance."
      },
      {
        q: "Which best describes the function of metadata in a professional digital context?",
        options: ["Metadata is the visible content of a file—the words, images, charts, or data that users read and interact with directly when they open it", "Metadata is information about a file—such as the author, creation date, file size, and modification history—that is stored within the file but not always visible", "Metadata refers only to a file's name and its location within a folder structure, which is why renaming a file erases all of its metadata", "Metadata is a technical security layer that IT departments add to every company file so they can track exactly who opens each file, when they open it, and from where"],
        answer: "Metadata is information about a file—such as the author, creation date, file size, and modification history—that is stored within the file but not always visible",
        hint: "Metadata can reveal sensitive information (author names, tracked changes, location data) even in 'finished' files—professionals should clean metadata before sharing documents externally."
      },
      {
        q: "Responsive web design means that a website:",
        options: ["Loads faster than non-responsive websites because it uses less complex code, smaller images, and fewer files on every page of the site", "Automatically adjusts its layout and content presentation to display correctly across different device screen sizes, from phones to desktops", "Only works on the most recently released phones, tablets, and computers in order to give every visitor a premium, high-quality user experience", "Responds to clicks and other user input faster than other websites because of the advanced programming running on its backend server"],
        answer: "Automatically adjusts its layout and content presentation to display correctly across different device screen sizes, from phones to desktops",
        hint: "Responsive design is now a baseline professional standard—with over 50% of web traffic on mobile devices, a site that only works on desktop fails most of its users."
      },
      {
        q: "The best practice when preparing to share a professional presentation with someone who was not present at the meeting is to:",
        options: ["Send only the slide deck with no explanation, since well-designed slides should always be completely self-explanatory to any reader", "Send the slides with a brief written summary explaining key decisions, action items, and context the slides don't convey on their own", "Wait until you can present the whole thing again live, since slides shared without a speaker's context are useless to the reader", "Remove all of the charts and visuals before sending the slides, since they may be misinterpreted without someone there to narrate them"],
        answer: "Send the slides with a brief written summary explaining key decisions, action items, and context the slides don't convey on their own",
        hint: "Slides are built for live delivery—they often rely on presenter narration to make sense. A summary bridges the gap for people who weren't in the room."
      },
      {
        q: "The advantage of using a project management tool (like Asana or Trello) over a shared spreadsheet for team task tracking is:",
        options: ["Project management tools are always less expensive than spreadsheet software, so switching to one saves the team money on software licenses every single year", "They provide features like task dependencies, automated reminders, deadline tracking, and role assignments that spreadsheets cannot replicate natively", "They are easier for people who have never used a computer before, since project management tools require no training or setup of any kind", "Spreadsheets are never appropriate for professional task management, and most companies have formally banned using them to track work"],
        answer: "They provide features like task dependencies, automated reminders, deadline tracking, and role assignments that spreadsheets cannot replicate natively",
        hint: "Project management tools are purpose-built for team coordination—they make project status visible to everyone and automate follow-up in ways spreadsheets require manual effort to replicate."
      },
      {
        q: "You earn $18.00 per hour and work 42 hours in one week. What is your total gross pay for the week (including overtime at 1.5× the regular rate)?",
        options: ["$756.00", "$774.00", "$792.00", "$810.00"],
        answer: "$774.00",
        math: true,
        hint: "40 hrs × $18 = $720 (regular). 2 hrs × $27 (=$18×1.5) = $54 (overtime). Total: $720 + $54 = $774.00."
      },
      {
        q: "A federal income tax rate of 22% applies to your gross pay of $580. How much is withheld?",
        options: ["$117.60", "$121.60", "$127.60", "$131.60"],
        answer: "$127.60",
        math: true,
        hint: "$580 × 0.22 = $127.60. Multiply the gross amount by the decimal form of the percentage: 22% = 0.22."
      },
      {
        q: "Materials for a project cost $1,450 and labor costs $2,100. What is the total project cost?",
        options: ["$3,450.00", "$3,500.00", "$3,550.00", "$3,600.00"],
        answer: "$3,550.00",
        math: true,
        hint: "$1,450 + $2,100 = $3,550. Total project cost = materials + labor. Always add both components before presenting a client estimate."
      },
      {
        q: "A client pays a $900 deposit on a $1,500 project. How much remains to be collected?",
        options: ["$550.00", "$600.00", "$650.00", "$700.00"],
        answer: "$600.00",
        math: true,
        hint: "$1,500 − $900 = $600. Tracking the remaining balance ensures you invoice correctly and the client understands what they still owe."
      },
      {
        q: "Arriving at work consistently prepared, on time, and ready to engage is best described as:",
        options: ["Customer service excellence—a skill mostly needed in front-desk and sales roles", "Professionalism and reliability—a foundational workplace reputation builder", "Information security awareness—a habit of protecting data and passwords at work", "Creative initiative—coming up with new ideas without being asked to by a manager"],
        answer: "Professionalism and reliability—a foundational workplace reputation builder",
        hint: "The most basic form of professionalism—showing up prepared and on time—is also among the most impactful. Reliability is the foundation of professional trust."
      },
      {
        q: "Emotional intelligence (EQ) in a professional context refers to:",
        options: ["The ability to memorize and recall large amounts of emotional and psychological data about coworkers, clients, and supervisors", "The capacity to recognize, understand, and manage your own emotions and recognize and respond appropriately to others' emotions", "The technical ability to measure other people's emotional states using formal psychological tests and assessment tools at work", "A personality trait that you are born with, which cannot be developed or improved through any training or work experience later"],
        answer: "The capacity to recognize, understand, and manage your own emotions and recognize and respond appropriately to others' emotions",
        hint: "High EQ professionals manage stress, navigate conflict, and build relationships more effectively than high IQ alone predicts. EQ can be developed through intentional practice."
      },
      {
        q: "Active voice vs. passive voice in professional writing: active voice is preferred because it:",
        options: ["Sounds more formal and is therefore appropriate for all high-stakes professional documents","Is shorter, clearer, and makes it obvious who is responsible for taking action","Is grammatically correct while passive voice is technically an error","Is required by most professional style guides including AP and APA for all uses"],
        answer: "Is shorter, clearer, and makes it obvious who is responsible for taking action",
        hint: "Active: 'The manager approved the request.' Passive: 'The request was approved.' Active is clearer, shorter, and assigns responsibility. Use passive deliberately when the actor is unknown or intentionally de-emphasized."
      },
      {
        q: "Before submitting a professional document, which final check is most important?",
        options: ["Confirming that the document meets the minimum required length for the assignment, since a document that is too short will look unprofessional", "Reading the document from the recipient's perspective to verify that the purpose is clear, the content is accurate, and the tone is appropriate", "Running a word count to make sure the document has enough words per page to meet the density expectations set by your supervisor", "Checking that the font, font size, and line spacing are exactly the same throughout every page, since formatting is what readers notice first"],
        answer: "Reading the document from the recipient's perspective to verify that the purpose is clear, the content is accurate, and the tone is appropriate",
        hint: "Professional documents are communication tools for the reader. Reading as the recipient—not as the author—is the most important final check for clarity, accuracy, and impact."
      },
      {
        q: "The hierarchy of controls in workplace safety lists the most effective type of control as:",
        options: ["Administrative controls—policies and procedures that regulate how workers interact with hazards", "Personal protective equipment (PPE)—gear such as gloves, goggles, or masks worn to reduce exposure", "Substitution or elimination—removing or replacing the hazard entirely so the risk no longer exists", "Engineering controls—physical barriers, guards, or ventilation changes that reduce exposure to hazards"],
        answer: "Substitution or elimination—removing or replacing the hazard entirely so the risk no longer exists",
        hint: "Elimination is the only control that removes the hazard entirely. Lower tiers (engineering, administrative, PPE) manage exposure to a hazard that still exists—they are less effective than removing it altogether."
      },
      {
        q: "In the hierarchy of controls, Personal Protective Equipment (PPE) is considered which level—and why?",
        options: ["The most effective level—it directly protects each individual worker at the exact point of contact with the hazard, so nothing else is needed", "The second tier—it ranks just below engineering controls and just above administrative controls, because it protects each worker directly and is inexpensive", "The least preferred level—it does not eliminate or reduce the hazard but only provides a barrier between the worker and the hazard that still exists", "The middle tier—it is just as effective as engineering controls whenever it is properly fitted, used, and maintained by trained workers"],
        answer: "The least preferred level—it does not eliminate or reduce the hazard but only provides a barrier between the worker and the hazard that still exists",
        hint: "PPE is the last line of defense—when it fails (wrong fit, wrong type, not worn), the worker is fully exposed. Higher-level controls are always preferred when feasible."
      },
      {
        q: "Volunteering for a task that is outside your current job description, when you have the capacity and the skill, demonstrates:",
        options: ["Overreach that will likely be seen negatively by the teammates who already own that area of work", "Strong initiative and a growth-oriented mindset that benefits both you and your organization", "Poor boundary management that will lead to being assigned too much extra work on a permanent basis", "A lack of focus on your primary responsibilities and the tasks your supervisor actually assigned"],
        answer: "Strong initiative and a growth-oriented mindset that benefits both you and your organization",
        hint: "Professionals who voluntarily expand their contributions are noticed. Employers consistently cite initiative as one of the most valued qualities they see in high-potential employees."
      },
      {
        q: "Knowing when and how to cite sources in a professional document is important because it:",
        options: ["Lengthens the document and adds extra pages at the end, which makes the work appear more thoroughly researched to the people who read it", "Gives credit to original authors, allows readers to verify information, and protects you and your organization from accusations of plagiarism", "Is only legally required in academic settings such as school and college, since professional documents do not have any citation requirements", "Shows that you did more research than was necessary, which may suggest to readers that the problem is more complicated than it really is"],
        answer: "Gives credit to original authors, allows readers to verify information, and protects you and your organization from accusations of plagiarism",
        hint: "Professional citation is both ethical and strategic—it demonstrates intellectual honesty and gives your arguments the credibility of verified sources."
      },
      {
        q: "A professional who builds a reputation for reliability and follow-through over time benefits from:",
        options: ["Being assigned many more tasks than their less reliable peers, with no additional pay, recognition, or opportunities in return for the extra work", "Increased trust from supervisors, clients, and teammates—leading to greater autonomy, better opportunities, and stronger professional relationships", "The ability to avoid every difficult or high-stakes assignment, since supervisors save those for employees who still need to prove themselves", "Being excused from team meetings and check-ins, since their work can be trusted without any monitoring or communication with the team"],
        answer: "Increased trust from supervisors, clients, and teammates—leading to greater autonomy, better opportunities, and stronger professional relationships",
        hint: "Trust is the currency of professional opportunity. Reliable professionals are given more important work, greater autonomy, and first consideration for advancement—because people bet on what they can count on."
      },
];

// The Baseline CFA's questions are never the clock-in question (teacher 2026-11-05: no practicing them
// before the CFA). They stay in this bank; the CFA's list lives on the server (lib/wprCfaQuestions.js).
const { isCfaQuestion } = require('./lib/wprCfaQuestions');
function pickWprMcQuestion(dateStr) {
    const list = WPR_MC_QUESTIONS.filter(x => !isCfaQuestion(x.q));
    const epoch = new Date('2026-01-01T00:00:00');
    const d = new Date(dateStr + 'T00:00:00');
    const daysSinceEpoch = Math.floor((d - epoch) / 86400000);
    const idx = ((daysSinceEpoch % list.length) + list.length) % list.length;
    return list[idx];
}

module.exports = { WPR_QUESTIONS, pickWprQuestion, WPR_MC_QUESTIONS, pickWprMcQuestion };
