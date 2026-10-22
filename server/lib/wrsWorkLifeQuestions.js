// server/lib/wrsWorkLifeQuestions.js
// "Work vs. personal life" scenarios for the Monday WRS Sprint and WPR
// Practice Pro (server/lib/wrsPool.js puts 1-3 in every 100-question test).
// Added 2026-10-22: the Nevada WPR state test keys "stay late for the boss"
// as correct -- e.g. the teacher's example: concert tickets planned for
// months, boss asks you to work late that day, the expected answer is to
// cancel on your friend. Students lose points if they've never seen that.
//
// So the CORRECT answer here is what the state test rewards (dependability,
// flexibility, the job's needs first), and every hint has two parts: what
// the test expects, and what a healthy real-world version looks like. The
// review screen (js/wrs-test-ui.js) shows these hints even on right answers.

const TEST = 'On the state WPR test: ';
const REAL = ' In real life: ';

const WORKLIFE_MC = [
    { q: 'You bought concert tickets with a friend months ago. On the day of the concert, your boss asks you to stay late to finish an important job. What should you do?',
      options: ['Cancel your plans with your friend and stay late to finish the work',
                'Leave at your normal time without saying anything',
                'Agree to stay, then slip out early when your boss is not looking',
                'Call in sick the next day to make up for the lost concert'],
      answer: 'Cancel your plans with your friend and stay late to finish the work',
      hint: TEST + 'the expected answer is to stay. It shows dependability and puts the job first.' + REAL + 'tell your boss about big plans as early as you can (even weeks ahead), so it is less likely to come up. If it still happens, it is okay to ask, "I have tickets tonight. Could I come in early tomorrow instead?" Hourly workers must be paid for the extra time.' },
    { q: 'It is the busiest week of the year, and your supervisor asks everyone to work an extra shift on Saturday. You had planned to sleep in and see a movie. What is the best response?',
      options: ['Agree to work the extra shift',
                'Say no because Saturday is your day off',
                'Agree, then do not show up',
                'Ask a coworker to clock in for you'],
      answer: 'Agree to work the extra shift',
      hint: TEST + 'agreeing shows flexibility and teamwork during a busy time.' + REAL + 'helping out during a true rush is a great way to build trust. If extra shifts become every week instead of once in a while, that is worth a calm conversation with your supervisor.' },
    { q: 'You are scheduled until 5:00. At 4:50, your supervisor asks you to finish one more urgent task that will take about 30 minutes. What should you do?',
      options: ['Stay and finish the urgent task',
                'Leave at 5:00 and leave the task for tomorrow without telling anyone',
                'Start the task and leave halfway through',
                'Tell your supervisor it is not your job'],
      answer: 'Stay and finish the urgent task',
      hint: TEST + 'staying to finish urgent work shows a strong work ethic.' + REAL + 'make sure the extra time is recorded on your timesheet so you are paid for it. If you are 14 or 15, federal law limits how late and how many hours you can work on school days.' },
    { q: 'A coworker calls in sick, and your manager asks if you can cover the rest of their shift after yours ends. You do not have any important plans. What is the best response?',
      options: ['Agree to cover the shift to help the team',
                'Say no because it is not your shift',
                'Agree only if the manager gives you a raise',
                'Complain to other coworkers about having to stay'],
      answer: 'Agree to cover the shift to help the team',
      hint: TEST + 'covering for the team shows dependability and teamwork.' + REAL + 'helping when you can is noticed and remembered. Teams work best when covering goes both ways, so someday a coworker may cover for you.' },
    { q: 'If you truly CANNOT stay late when your supervisor asks, what is the most professional thing to do?',
      options: ['Tell your supervisor right away, explain briefly, and offer another way to help',
                'Say nothing and leave at your normal time',
                'Pretend you did not hear the request',
                'Agree to stay, then leave without telling anyone'],
      answer: 'Tell your supervisor right away, explain briefly, and offer another way to help',
      hint: TEST + 'honest, early communication is always the professional choice.' + REAL + 'something like "I can\'t tonight because of a family commitment, but I can come in early tomorrow to finish it" keeps trust and still gets the work done.' },
    { q: 'When a supervisor asks employees to stay late during a busy period, which quality are they most hoping to see?',
      options: ['Flexibility and dependability', 'Speed of typing', 'Creativity in art', 'Popularity with coworkers'],
      answer: 'Flexibility and dependability',
      hint: TEST + 'these questions are testing flexibility and dependability.' + REAL + 'being flexible does not mean having no limits. Dependable employees also tell their supervisor early when they cannot do something.' },
];

const WORKLIFE_TF = [
    { q: 'When a supervisor asks you to work late during a busy time, employers generally see agreeing to stay as a sign of a strong work ethic.',
      answer: 'T',
      hint: TEST + 'true. Staying when needed shows commitment.' + REAL + 'it also helps to share big personal plans with your supervisor ahead of time, so conflicts happen less often.' },
    { q: 'If you cannot stay late, it is professional to just leave at your scheduled time without telling anyone.',
      answer: 'F',
      hint: TEST + 'false. Leaving without a word looks unreliable.' + REAL + 'it is okay to say no sometimes, as long as you say it directly and politely and offer another option.' },
];

module.exports = { WORKLIFE_MC, WORKLIFE_TF };
