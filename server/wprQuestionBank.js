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

module.exports = { WPR_QUESTIONS, pickWprQuestion };
