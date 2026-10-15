# Gemini Prompts — Google Slides / Sheets Student Exemplars

**What these do:** each prompt asks Gemini to write a Google Apps Script that
**builds a real Google Slides deck or Google Sheet in your own Drive**: real
shapes, tables, live formulas, charts, and speaker notes, so students can open
an actual Google file that looks like a finished, full-credit project. Each one
uses the same off-limits topic as that project page's Worked Example card.

The prompts are self-contained. They already include the assignment text,
rubric, and worked example copied from the live project pages (Unit 3 leaves
out the Raw Data on purpose so no answers leak). If you edit a project page
later, ask Claude to regenerate this file.

## How to use each prompt (about 5 minutes per unit)
1. Open **gemini.google.com**. Use the strongest model you have; long code works best on a "Pro" model.
2. Paste ONE prompt below, exactly as is. Gemini replies with an outline, the code, and a checklist.
3. Skim the outline and checklist. If anything's missing, reply: *"Add ___ and give me the full corrected script."*
4. Go to **script.google.com** → **New project** → delete the sample code → paste Gemini's script → **Save** (💾).
5. Pick **buildExample** in the function dropdown → **Run** → **Review permissions** → choose your school account → **Allow**.
   (If it says "Google hasn't verified this app," click **Advanced** → **Go to (project name)**. It's your own script.)
6. Open the **Execution log** at the bottom and click the link it printed. That's your new Google file in Drive.
7. **If it errors:** copy the red error line, paste it back to Gemini with *"Fix this and give me the full corrected script,"* and repeat steps 4–6.
8. Look it over like a student would. Then **Share → General access → Anyone with the link → Viewer**, and send Claude the link if you want a "See a Student Example" button added to that project page.

---

## Unit 1 — The Digital Citizenship Case File

```text
You are helping a high school Computer Science teacher at Carson High School (Nevada) make a model "finished student example" so her 9th-12th graders can see exactly what a full-credit project looks like.

TASK: Unit 1 Project: The Digital Citizenship Case File. Build it as a Google Slides deck (minimum 8 slides).

CONTENT RULES
- This must look like a finished, FULL-CREDIT project by a strong 9th-grade student: correct, complete, clear, in a natural student voice (not corporate, not textbook, no AI-sounding filler).
- The student is fictional: "Jordan Example".
- Use EXACTLY the topic, data, and details from the WORKED EXAMPLE section below. That topic is off-limits to real students, so they can't copy it. Expand it to full project size; don't invent a different topic.
- Cover every step/stage in the PROJECT INSTRUCTIONS, in the same order, and meet the minimum slide/tab count. Include the bonus rubric item and label it "(Bonus)".
- Every real-world fact must be real and verifiable. No invented statistics, quotes, studies, URLs, or citations. If you aren't sure of a URL, cite the publication name and date without a link.
- Re-check every number, formula result, trace, and conversion before you finish.

TECHNICAL RULES (Google Slides builder)
- Write ONE complete, standalone Google Apps Script (V8 runtime) with a main function named buildExample(). I will paste it into a brand-new project at script.google.com and click Run. It must work with zero edits.
- Use ONLY built-in services: SlidesApp (and DriveApp only if truly needed). No libraries, no advanced services, no external URLs or images.
- buildExample() must create a NEW presentation with SlidesApp.create(...), reuse or delete the default blank first slide, then build every slide with its own small helper function (e.g. slideTitle(), slideFootprintAudit()...).
- Diagrams (trees, flowcharts, network maps, layer stacks) must be drawn with real shapes and connector lines (insertShape / insertLine), not as text art. Tables must be real tables (insertTable).
- Keep everything readable and inside the slide: titles 26-30pt, body 14-18pt, no more than ~60 words of body text per slide; split onto two slides rather than overflow.
- Add this footer text box to EVERY slide, small (9pt), bottom-left: "STUDENT EXAMPLE — for reference only. Do not copy; your topic must be different."
- Put speaker notes on every slide that say which rubric line(s) that slide earns, in a teacher's voice (e.g. "Earns: Stage 2 — Pseudocode Correctness. Notice how...").
- At the very end, Logger.log the presentation URL.
- Before the code, show me a slide-by-slide outline (slide #, title, what's on it, which rubric line). After the code, give a checklist proving every rubric line and every required step is covered, with slide numbers.

===== PROJECT INSTRUCTIONS (copied from the student assignment page) =====
Objective

Build a case file that proves you can actually apply digital citizenship — not just define it. You'll audit your own digital footprint, investigate a real documented case where digital citizenship failed, and write your own code of conduct based on what you find.

Deliverable: A Google Slides deck, minimum 8 slides. Share your deck with view access and turn in a PDF export (File → Download → PDF Document) below, or a text file with your share link.

New to Google Slides? Start here: Ch 4.0, The Office Suite, From Zero »

Steps

Each step below links to the chapter section that actually teaches how to do it — do that first if you haven't already.

- Title Slide — your name and the case file title.

- Footprint Audit — search your own name/handles (or an invented persona, if you'd rather not use your real one). List or screenshot what's publicly visible, sorted into Safe, Risky, and Should Be Deleted. How to: Ch 1.1, Your Digital Identity »

- Real-World Case Study — pick a real, documented digital-citizenship failure: a data breach, a post that ended someone's career, a cyberbullying case that made news, a deepfake/misinformation incident. Summarize what actually happened. How to: Ch 1.3, Recognizing Online Dangers »

- Threat & Risk ID — name the specific technical/security threat involved (phishing, a weak password, oversharing, malware, etc.).

- Ethics & Privacy Analysis — whose privacy or rights were violated, and exactly how. How to: Ch 2.1, Personal Data & Privacy »

- Sourcing & Attribution — a Works Cited slide. Every fact and image used anywhere in the deck needs a real citation. How to: Ch 2.2, Intellectual Property & Attribution »

- Your Code of Conduct — 5 specific, personal rules you're committing to, each one tied back to something you learned from the case study. How to: Ch 1.2, Safe, Legal & Ethical Habits Online »

- Reflection — what would you have done differently if you were the person in the case study?

<div

===== GRADING RUBRIC =====
- Footprint Audit: Own digital footprint is honestly audited with real evidence (screenshots or specific listed items), sorted into safe/risky/delete categories.
- Case Study Accuracy: The chosen case study is real and documented, and the summary correctly identifies what actually happened.
- Threat & Privacy Analysis: Correctly names the specific security threat involved and explains whose privacy or rights were violated and how.
- Sourcing & Attribution: Every claim, image, and fact used is properly cited on a Works Cited slide -- no uncredited material.
- Code of Conduct: 5 rules are specific and personal (not generic advice), and each one is tied back to a real lesson from the case study.
- Presented or Narrated (Bonus) (BONUS): Presents the case file to the class or records a narrated walkthrough.

===== WORKED EXAMPLE (use THIS topic and these details, expanded to full size) =====
Worked Example: What a Finished Case File Looks Like

You may NOT use this case (the July 2020 Twitter hack) or this persona for your own project. It's here so you can see how all eight slides connect to one case — pick your own case and follow the same pattern.

Slide 1 — Title Slide

“Case File: The Phone Call That Hijacked Twitter” — Jordan Example, Period 3.

Slide 2 — Footprint Audit (invented persona: Jordan Example, @jordan_example)

|
| What's Public | Where | Category | Why

| Drawings posted under first name only | Art portfolio site | Safe | No last name, school, or location attached.

| Same handle used on 4 different sites | Gaming, Instagram, Reddit, Discord | Risky | One search links all four accounts together.

| Profile photo in a hoodie with the school name on it | Instagram | Risky | Tells strangers where to find me every weekday.

| Photo of my new learner's permit | Old public post | Should Be Deleted | Shows full name, birth date, and home address.

Slide 3 — Real-World Case Study

On July 15, 2020, attackers took over high-profile Twitter accounts, including Barack Obama, Joe Biden, Elon Musk, and Apple, and posted a bitcoin scam promising to double any money sent. Twitter reported that 130 accounts were targeted and the attackers tweeted from 45 of them. New York's Department of Financial Services (DFS) found the scam collected more than $118,000 in bitcoin, and identified a 17-year-old as the leader of the group.

Slide 4 — Threat & Risk ID

Threat: phone spear-phishing (social engineering). Callers pretended to be from Twitter's IT department and tricked employees into entering their login on a fake site. Those stolen logins opened Twitter's internal support tools, which could take over almost any account. No advanced hacking was needed — just a convincing phone call.

Slide 5 — Ethics & Privacy Analysis

- Account owners: their identities were used to scam their own followers, and Twitter later reported the attackers read the private DM inboxes of 36 accounts.

- Followers: people who trusted a verified account lost real money.

- Every user: one internal tool could reach any account, so everyone's privacy depended on a few employees never being fooled.

Slide 6 — Sourcing & Attribution (Works Cited)

- New York State Department of Financial Services. Twitter Investigation Report. Oct. 2020.

- Twitter, Inc. “An Update on Our Security Incident.” Twitter Blog, 18 July 2020, updated 30 July 2020, blog.twitter.com/en_us/topics/company/2020/an-update-on-our-security-incident.html.

- Title-slide phone icon: Font Awesome Free, licensed CC BY 4.0. Footprint screenshots: my own.

Slide 7 — Your Code of Conduct

- I never type a password into a link someone sends me; I go to the site myself. (The fake login page.)

- If someone calls or messages claiming to be “IT” or “support,” I hang up and contact them through the official number. (The fake IT calls.)

- I use a different password on every account so one stolen login can't open the rest. (A few logins unlocked a tool that reached any account.)

- I never send money to a “giveaway,” even from a verified famous account. (The scam ran on real verified accounts.)

- I don't leave private info sitting in my DMs; I delete it once it's used. (36 DM inboxes were read.)

Slide 8 — Reflection

If I were the employee who got that call, I'd have hung up and called the help desk number from the company directory before typing anything. A two-minute callback would have broken the entire chain, because every step after it depended on that first login.
```

---

## Unit 2 — The System & Support Deck

```text
You are helping a high school Computer Science teacher at Carson High School (Nevada) make a model "finished student example" so her 9th-12th graders can see exactly what a full-credit project looks like.

TASK: Unit 2 Project: The System & Support Deck. It's a partner project. Build BOTH a Google Sheet (one tab named "Failure Points" with the ranked failure-point table and a real bar chart, numbers labeled "sample data") AND a Google Slides deck (minimum 6 slides). On the Data Slide, rebuild the same ranking as a slide table and note that the chart lives in the Sheet.

CONTENT RULES
- This must look like a finished, FULL-CREDIT project by a strong 9th-grade student: correct, complete, clear, in a natural student voice (not corporate, not textbook, no AI-sounding filler).
- The student is fictional: "Jordan Example" & "Sam Example" (partners).
- Use EXACTLY the topic, data, and details from the WORKED EXAMPLE section below. That topic is off-limits to real students, so they can't copy it. Expand it to full project size; don't invent a different topic.
- Cover every step/stage in the PROJECT INSTRUCTIONS, in the same order, and meet the minimum slide/tab count. Include the bonus rubric item and label it "(Bonus)".
- Every real-world fact must be real and verifiable. No invented statistics, quotes, studies, URLs, or citations. If you aren't sure of a URL, cite the publication name and date without a link.
- Re-check every number, formula result, trace, and conversion before you finish.

TECHNICAL RULES (Google Sheets builder)
- Write ONE complete, standalone Google Apps Script (V8 runtime) with a main function named buildExample() that builds BOTH files by calling buildSheet() and then buildSlides(), and logs both URLs. I will paste it into a brand-new project at script.google.com and click Run. It must work with zero edits.
- Use ONLY built-in services: SpreadsheetApp and Charts. No libraries, no advanced services, no external data.
- buildExample() must create a NEW spreadsheet with SpreadsheetApp.create(...), add each tab with insertSheet using the EXACT tab names the project requires, and delete the default "Sheet1".
- Every calculated cell must be a LIVE FORMULA set with setFormula / setFormulas (never a typed-in result), exactly as a student would build it, so students can click a cell and see the formula.
- Build real charts with sheet.newChart()...build() and insertChart, with titles and axis labels. Use number formats ($0.00 etc.), bold headers, frozen header rows, and sensible column widths so it looks like real, careful student work.
- Put a banner in row 1 of every tab: "STUDENT EXAMPLE — for reference only. Do not copy; your data/topic must be different." Start the real content below it, and make sure every formula points at the right rows.
- After building, call SpreadsheetApp.flush(), then READ BACK every key formula result and Logger.log it, so I can verify the math. Then Logger.log the spreadsheet URL.
- Before the code, show me the planned layout of each tab (columns, rows, formulas, charts). After the code, give a checklist proving every rubric line and every required step is covered, with tab + cell references.

For the Slides part, also follow these rules:
- buildExample() must create a NEW presentation with SlidesApp.create(...), reuse or delete the default blank first slide, then build every slide with its own small helper function (e.g. slideTitle(), slideFootprintAudit()...).
- Diagrams (trees, flowcharts, network maps, layer stacks) must be drawn with real shapes and connector lines (insertShape / insertLine), not as text art. Tables must be real tables (insertTable).
- Keep everything readable and inside the slide: titles 26-30pt, body 14-18pt, no more than ~60 words of body text per slide; split onto two slides rather than overflow.
- Add this footer text box to EVERY slide, small (9pt), bottom-left: "STUDENT EXAMPLE — for reference only. Do not copy; your topic must be different."
- Put speaker notes on every slide that say which rubric line(s) that slide earns, in a teacher's voice (e.g. "Earns: Stage 2 — Pseudocode Correctness. Notice how...").
- At the very end, Logger.log the presentation URL.
- Before the code, show me a slide-by-slide outline (slide #, title, what's on it, which rubric line). After the code, give a checklist proving every rubric line and every required step is covered, with slide numbers.

===== PROJECT INSTRUCTIONS (copied from the student assignment page) =====
Objective

Work with a partner to explain how a real device actually works, layer by layer, and build a troubleshooting guide someone who isn't in this class could actually follow.

Deliverable: A Google Slides deck built with a partner, minimum 6 slides. Turn in a PDF export or a text file with your share link below.

New to Google Slides or Sheets? Start here: Ch 4.0, The Office Suite, From Zero »

Steps

Each step below links to the chapter section that actually teaches how to do it — do that first if you haven't already.

- Pick a real everyday device you both use (phone, smart TV, car infotainment system, gaming console, etc.). It must be a different device than the one you used for your Chapter 3 activities — this project is where you prove you can run the same process on something new, not where you write up work you already finished.

- Abstraction Layer Map — diagram the hardware → operating system → application layers for one real function of that device (e.g. "sending a text"). How to: Ch 3.1, Abstraction & the Six Layers »

- Hardware/Software Interaction — explain, in your own words, what actually happens at each layer when that function runs. How to: Ch 3.2, Hardware, System Software & Apps »

- Troubleshooting Guide — pick one common real problem with that device and build a step-by-step flowchart a non-expert could actually follow to fix it. How to: Ch 3.3, Systematic Troubleshooting »

- Data Slide — embed a chart or table (built in Sheets) ranking 3+ common failure points for that device by how often they happen. How to: Ch 4.1, Designing for Your Reader »

- Team Credits Slide — who did what, with real evidence you worked together (comment/edit history, or a clear role split). How to: Ch 4.2, Cloud Collaboration & Team Roles »

<div

===== GRADING RUBRIC =====
- Abstraction Layer Map: The hardware/OS/application layers are correctly identified and mapped to a real function of the chosen device.
- Hardware/Software Explanation: Clearly explains what is actually happening at each layer during that function, in the students own words, not copied definitions.
- Troubleshooting Guide: A non-expert could actually follow the flowchart to fix the chosen problem -- steps are complete and in a sensible order.
- Data Visualization: A real chart or table (from Sheets) ranks failure points, with a caption explaining what it shows.
- Team Collaboration: Both partners contributions are documented and roughly balanced -- evidenced by edit history or a clear role split, not just one name on everything.
- Live Embedded Sheet (Bonus) (BONUS): The chart is a live embedded/linked Sheet, not a static screenshot.

===== WORKED EXAMPLE (use THIS topic and these details, expanded to full size) =====
Worked Example: What a Finished Deck Looks Like

You may NOT use this device (a library self-checkout kiosk) for your own project. It's here so you can see how every slide connects to one device and one function — pick your own device and follow the same pattern.

The Device: A library self-checkout kiosk. The Function: checking out a book.

Slide — Abstraction Layer Map

┌────────────────────────────────────────────────────────────┐
│ APPLICATION Self-checkout program: touchscreen menus,      │
│             "Scan your card", "Scan your book"             │
├────────────────────────────────────────────────────────────┤
│ OPERATING   Drivers for scanner, RFID pad, printer;        │
│ SYSTEM      network connection; runs the app full-screen   │
├────────────────────────────────────────────────────────────┤
│ HARDWARE    Touchscreen, barcode scanner, RFID pad,        │
│             receipt printer, CPU, RAM, network card        │
└────────────────────────────────────────────────────────────┘

Slide — Hardware/Software Interaction

- Hardware: The scanner shines light on the barcode and a sensor reads the pattern of dark and light bars as digits. The RFID pad reads the chip inside the book's label.

- Operating system: The scanner's driver turns those digits into input (often as if they were typed on a keyboard) and hands them to the program that's open. The OS's network software carries the request to the library's server.

- Application: The program asks the library's catalog system whether this card can borrow this book (many kiosks use a standard protocol called SIP2). It then shows the due date, tells the RFID pad to switch off the book's security setting so the exit gate won't alarm, and prints a receipt.

Slide — Troubleshooting Guide: “The barcode won't scan”

- Is the red scanner light on? No → tap the screen to wake the kiosk. Still off? Ask staff, the scanner is unplugged or off. Yes → go to step 2.

- Is the barcode wrinkled, curved, or covered by shiny tape? Yes → flatten the book open so the barcode lies flat, then go to step 3. No → go to step 3.

- Hold the barcode 4–6 inches from the scanner and keep it still for 2 seconds. Did it beep? Yes → done! No → go to step 4.

- Try a different book. Does that one scan? Yes → the first book's label is damaged; take it to the front desk. No → the scanner itself has a problem; ask staff to restart the kiosk.

Slide — Data Slide (sample data: these numbers are illustrative, not real counts)

|
| Rank | Failure Point | Help Requests per Month

| 1 | Barcode won't scan | 18

| 2 | Receipt printer out of paper | 11

| 3 | Library card not recognized | 7

| 4 | Touchscreen frozen | 3

Slide — Team Credits

- Partner A: Abstraction Layer Map and Hardware/Software Interaction slides.

- Partner B: Troubleshooting flowchart and the Sheets chart on the Data Slide.

- Both: tested the flowchart by having a younger sibling follow it without help, then rewrote step 2 because “occluded” confused them.

- Evidence: a screenshot of the Slides version history showing edits from both names, plus a comment thread where Partner B corrected Partner A's OS slide.
```

---

## Unit 3 — The Personal Finance Pipeline

```text
You are helping a high school Computer Science teacher at Carson High School (Nevada) make a model "finished student example" so her 9th-12th graders can see exactly what a full-credit project looks like.

TASK: Unit 3 Project: The Personal Finance Pipeline. Build it as a 4-tab Google Sheets workbook. CRITICAL: every real student uses the same Raw Data, which is intentionally NOT included here. Do not try to recreate it, and do not reuse any numbers that appear in the project instructions (for example the $150.00 opening balance, $335.16, or the $350 goal). Instead, extend the WORKED EXAMPLE's lunch-card account into a full-size parallel dataset: 8 codes of your own (mixed binary/hex/decimal, converted with DEC2BIN/HEX2DEC/BIN2DEC/CHAR/CODE formulas), 15-20 lunch-card transactions, a running balance with an absolute reference to the opening balance, the 4 KPIs, two COUNTIF-based charts, and 14 weeks of balances using the same weekly-change prediction method with a weeks-until-goal formula. Use the exact 4 tab names from the project instructions.

CONTENT RULES
- This must look like a finished, FULL-CREDIT project by a strong 9th-grade student: correct, complete, clear, in a natural student voice (not corporate, not textbook, no AI-sounding filler).
- The student is fictional: "Jordan Example".
- Use EXACTLY the topic, data, and details from the WORKED EXAMPLE section below. That topic is off-limits to real students, so they can't copy it. Expand it to full project size; don't invent a different topic.
- Cover every step/stage in the PROJECT INSTRUCTIONS, in the same order, and meet the minimum slide/tab count. Include the bonus rubric item and label it "(Bonus)".
- Every real-world fact must be real and verifiable. No invented statistics, quotes, studies, URLs, or citations. If you aren't sure of a URL, cite the publication name and date without a link.
- Re-check every number, formula result, trace, and conversion before you finish.

TECHNICAL RULES (Google Sheets builder)
- Write ONE complete, standalone Google Apps Script (V8 runtime) with a main function named buildExample(). I will paste it into a brand-new project at script.google.com and click Run. It must work with zero edits.
- Use ONLY built-in services: SpreadsheetApp and Charts. No libraries, no advanced services, no external data.
- buildExample() must create a NEW spreadsheet with SpreadsheetApp.create(...), add each tab with insertSheet using the EXACT tab names the project requires, and delete the default "Sheet1".
- Every calculated cell must be a LIVE FORMULA set with setFormula / setFormulas (never a typed-in result), exactly as a student would build it, so students can click a cell and see the formula.
- Build real charts with sheet.newChart()...build() and insertChart, with titles and axis labels. Use number formats ($0.00 etc.), bold headers, frozen header rows, and sensible column widths so it looks like real, careful student work.
- Put a banner in row 1 of every tab: "STUDENT EXAMPLE — for reference only. Do not copy; your data/topic must be different." Start the real content below it, and make sure every formula points at the right rows.
- After building, call SpreadsheetApp.flush(), then READ BACK every key formula result and Logger.log it, so I can verify the math. Then Logger.log the spreadsheet URL.
- Before the code, show me the planned layout of each tab (columns, rows, formulas, charts). After the code, give a checklist proving every rubric line and every required step is covered, with tab + cell references.

===== PROJECT INSTRUCTIONS (copied from the student assignment page) =====
The Scenario

You just started a part-time job and opened your first checking account. Every month your bank lets you download your transactions — but the export is a mess: the bank's system stores transaction types and categories as raw binary/hex/decimal codes instead of words, and nothing tells you where your money actually went or whether you're on track for the thing you're saving up for. Your job: take one month of real-looking account data through the same four stages every data analyst uses — decode it, organize it, visualize it, and use it to predict what happens next.

This isn't 4 separate assignments — it's one pipeline, one dataset, four stages. The check register you build in Stage 2 is the exact same data your Stage 3 dashboard charts. Each tab should feel like the next step in the same investigation into your money, not a fresh start. And yes — this is exactly how budgeting apps work under the hood. When someone asks "why do I need spreadsheets?", this project is the answer.

Objective

Build a real, 4-tab Google Sheets workbook that tells one continuous story about one month of a checking account: decode it, store it well, show it clearly, and predict from it.

Deliverable: A Google Sheets workbook with 4 tabs (see below), built around one transaction dataset that carries through Stages 2 and 3, plus the savings data in Stage 4. Turn in a PDF export or a text file with your share link below.

New to spreadsheets entirely — rows, columns, cells? Start here: Spreadsheet Basics, From Zero »

The Four Stages (one tab each)

Each stage links to the chapter section that actually teaches how to do it — do that first if you haven't already. Work through them in order — each one hands off to the next.

-
Stage 1 — Tab “Decode the Bank Export”: Your bank's export stores each transaction's Type and Category as a raw code instead of a word. Build a decoder key so you can actually read your own statement:

- Copy all 8 raw codes from the Raw Data section below into your sheet, along with each one's Given As and Code Type (Transaction Type or Category).

- Add three more columns: Binary, Hexadecimal, and Decimal. Fill in all three for every code (one of them is just the value you were given).

- Add a column for the ASCII character each code decodes to (a single capital letter).

- Add a final column, Meaning: Transaction Type letters stand for Deposit, Purchase, or ATM Withdrawal; Category letters stand for Income, Food, Gas, Entertainment, or Bills. This key is what makes the Check Register in Stage 2 readable.

How to: Ch 5.5, Doing This in Google Sheets »

-
Stage 2 — Tab “Organize the Register”: Now that you can read the codes, copy the Check Register (20 transactions for October) from the Raw Data section below into this tab. Organize that same dataset two different ways and compare them:

- Version A — One Flat Table: Keep the full Check Register exactly as given, all columns together in one table.

- Version B — Split Into Related Tables: Two columns repeat the exact same words over and over — Type Name and Category Name. Move each one into its own small lookup table (code + name, one row per code), and remove those name columns from the register so each row keeps only the one-letter code. Not sure what this looks like? See the worked example in 6.1.2 first — it walks through the exact same move on a different dataset.

- Explain your choice: If your bank renamed the "Entertainment" category to "Fun," which version would be easier to update, and why? Write 2–3 real sentences comparing speed, size, and ease of updating, specific to this register — not generic pros/cons.

How to: Ch 6.1, Organizing Data »

-
Stage 3 — Tab “My Money Dashboard”: Using that same Check Register (Version A), build the dashboard you'd actually check every month. Every number must come from a live formula referencing the register — never typed in by hand — so it stays correct when next month's transactions are added.

- Running Balance column: In the register, put 150.00 (your opening balance) in its own labeled cell. Add a Balance column: the first row is opening balance + Money In − Money Out (use an absolute reference like $B$1 for the opening balance), and every row after that is the balance above + Money In − Money Out. Your last row should land on $335.16 — if it doesn't, find the mistake before going on.

- Four KPI numbers above your charts: =SUM(...) of the Money In column (Total Earned), =SUM(...) of the Money Out column (Total Spent), =AVERAGE(...) of the Money Out column (Average Purchase), and Ending Balance (a reference to the last Balance cell).

- Chart 1 — Transactions by Category: five =COUNTIF(...) formulas on the Category Name column, one each for "Income", "Food", "Gas", "Entertainment", and "Bills" — then chart those 5 counts as a bar or pie chart.

- Chart 2 — Transactions by Type: the same move on the Type Name column — one =COUNTIF(...) each for "Deposit", "Purchase", and "ATM Withdrawal" — then chart those 3 counts as a bar or pie chart.

How to: Ch 7.1–7.2, Formulas & Data Visualisation »

-
Stage 4 — Tab “Will I Hit My Goal?”: You're saving up for something that costs $350. Copy the Savings Account Balance table from the Raw Data section below into this tab — it's your savings balance at the end of each of the last 14 weeks. Build a prediction using this exact method:

- Add a third column, Weekly Change. Starting on Week 2, subtract each week from the week before it (=B3-B2, then =B4-B3, and so on down through Week 14) — 13 formulas in total.

- Below that column, calculate =AVERAGE(...) of all 13 Weekly Change values. That's your average weekly change — on average, how much your savings grow each week.

- Predict Week 15: Week 14's balance plus your average weekly change. Predict Week 16: your Week 15 prediction plus that same average again. Both as live formulas referencing your average — not typed-in numbers.

- When do you hit $350? Add one formula: =(350 - [Week 14 balance]) / [average weekly change]. That's how many weeks after Week 14 you'll reach your goal. Round it up to a whole week and write it as a sentence: "I'll have $350 by Week __."

- Write one sentence checking your prediction: some weeks your savings went down. If Week 15 came in $30 below what you predicted, would that mean your model was wrong, or that something real happened that week? Explain which, and why.

How to: Ch 8.1, Building a Model »

<div

===== GRADING RUBRIC =====
- Stage 1: Decode the Bank Export: All 8 codes are correctly converted across binary, hex, decimal, and ASCII, each with its correct Meaning, with no calculation errors.
- Stage 2: Organize the Register: Version A (flat) and Version B (Type and Category split into lookup tables) are both shown for the SAME register, with specific, real tradeoffs (including the category-rename question), not generic pros/cons.
- Stage 3: My Money Dashboard: A working running Balance column ending at $335.16, four KPI numbers (SUM in, SUM out, AVERAGE out, ending balance), plus a COUNTIF-based Category chart and a COUNTIF-based Type chart -- all from live formulas, not hardcoded numbers, readable and labeled.
- Stage 4: Will I Hit My Goal?: A Weekly Change column (13 formulas), an AVERAGE of those changes, Week 15/Week 16 predictions and a weeks-to-$350 formula built from that average, plus a genuine sentence checking what a $30 miss would actually mean.
- One Connected Pipeline: This is one continuous story about one account, not four unrelated exercises stapled together -- the Stage 1 key decodes the Stage 2 register, which is what Stage 3 charts. Tabs are clearly labeled and easy for someone else to follow without explanation.
- Advanced Formula (Bonus) (BONUS): Uses conditional formatting (e.g. red when Balance drops under $200), SUMIF (total dollars per category), or VLOOKUP/INDEX-MATCH (pulling names from the Version B lookup tables) anywhere in the workbook.

===== WORKED EXAMPLE (use THIS topic and these details, expanded to full size) =====
Worked Example: A Mini Pipeline, Start to Finish

You may NOT use this mini dataset for your own project. It's a tiny, separate “lunch card” account — not your bank data — so you can see the method for all four stages. Your project uses the Raw Data above, and your answers will be different.

Stage 1 — Decode the Codes (2 codes for the Type column)

|
| Raw Code | Given As | Binary | Hex | Decimal | ASCII | Meaning

| 52 | Hex | 1010010 | 52 | 82 | R | Reload

| 1000011 | Binary | 1000011 | 43 | 67 | C | Charge

- Hex 52 → decimal: (5 × 16) + 2 = 82. 82 → binary: 64 + 16 + 2 = 82, so bits 64, 16, 2 are on: 1010010. ASCII 82 = R.

- Binary 1000011 → decimal: 64 + 2 + 1 = 67. 67 → hex: 67 ÷ 16 = 4 remainder 3, so 43. ASCII 67 = C.

Stage 2 — Organize the Register

Version A — One Flat Table (opening balance 10.00 is in cell B1; headers are in row 3, data in rows 4–8)

|
|  | A: Txn | B: Date | C: Item | D: Type | E: Type Name | F: Money In | G: Money Out

| 4 | L1 | 9/02 | Pizza slice | C | Charge |  | 4.50

| 5 | L2 | 9/03 | Parent reload | R | Reload | 20.00 |

| 6 | L3 | 9/04 | Chicken wrap | C | Charge |  | 5.25

| 7 | L4 | 9/05 | Juice + pretzel | C | Charge |  | 3.75

| 8 | L5 | 9/08 | Burrito bowl | C | Charge |  | 6.00

Version B — Split Into Related Tables: the register keeps Txn, Date, Item, Type, Money In, Money Out (no Type Name column), plus this lookup table:

|
| Type | Type Name

| C | Charge

| R | Reload

Tradeoff: If the cafeteria renamed “Charge” to “Purchase,” Version B needs one cell changed, while Version A needs four rows changed and one missed row would make my COUNTIF wrong. Version A is quicker to read at a glance with only 5 rows, but Version B stays smaller and safer to update as the register grows.

Stage 3 — Dashboard Formulas (Balance goes in column H)

|
| Cell / KPI | Formula | Result

| H4 (first row) | =$B$1+F4-G4 | 5.50

| H5 (every row after) | =H4+F5-G5 — fill down to H8 | 25.50, 20.25, 16.50, 10.50

| Total In | =SUM(F4:F8) | 20.00

| Average Charge | =AVERAGE(G4:G8) (blank cells are skipped) | 4.875 → shows as $4.88

| Count of Charges | =COUNTIF(E4:E8,"Charge") | 4

Stage 4 — Will It Last? (lunch card balance at the end of each week; headers in row 1)

|
|  | A: Week | B: Balance | C: Weekly Change

| 2 | 1 | 40.00 |

| 3 | 2 | 33.50 | =B3-B2 → -6.50

| 4 | 3 | 28.00 | =B4-B3 → -5.50

| 5 | 4 | 30.00 | =B5-B4 → 2.00

| 6 | 5 | 22.50 | =B6-B5 → -7.50

|
| Cell | Formula | Result

| B8: Average weekly change | =AVERAGE(C3:C6) | -4.375

| B9: Predict Week 6 | =B6+B8 | 18.125 → $18.13

| B10: Predict Week 7 | =B9+B8 | 13.75

| B11: Weeks until the card drops to $5 | =(5-B6)/B8 | 4 → “I'll need a reload by Week 9.”

Notice: Week 4 went up because of a reload. The average still works because it smooths that one week out — same idea as the dips in your savings data. Here the goal is a low point, so the change is negative; in your project you're saving toward a goal, so it's positive.
```

---

## Unit 4 — The Algorithm Design Blueprint

```text
You are helping a high school Computer Science teacher at Carson High School (Nevada) make a model "finished student example" so her 9th-12th graders can see exactly what a full-credit project looks like.

TASK: Unit 4 Project: The Algorithm Design Blueprint. Build it as a Google Slides deck (minimum 6 slides) following the "Your Slide-by-Slide Plan" table in the instructions exactly. Put pseudocode in a monospace font (Courier New). Make the trace walkthroughs real slide tables. The pseudocode and traces must match the WORKED EXAMPLE exactly.

CONTENT RULES
- This must look like a finished, FULL-CREDIT project by a strong 9th-grade student: correct, complete, clear, in a natural student voice (not corporate, not textbook, no AI-sounding filler).
- The student is fictional: "Jordan Example".
- Use EXACTLY the topic, data, and details from the WORKED EXAMPLE section below. That topic is off-limits to real students, so they can't copy it. Expand it to full project size; don't invent a different topic.
- Cover every step/stage in the PROJECT INSTRUCTIONS, in the same order, and meet the minimum slide/tab count. Include the bonus rubric item and label it "(Bonus)".
- Every real-world fact must be real and verifiable. No invented statistics, quotes, studies, URLs, or citations. If you aren't sure of a URL, cite the publication name and date without a link.
- Re-check every number, formula result, trace, and conversion before you finish.

TECHNICAL RULES (Google Slides builder)
- Write ONE complete, standalone Google Apps Script (V8 runtime) with a main function named buildExample(). I will paste it into a brand-new project at script.google.com and click Run. It must work with zero edits.
- Use ONLY built-in services: SlidesApp (and DriveApp only if truly needed). No libraries, no advanced services, no external URLs or images.
- buildExample() must create a NEW presentation with SlidesApp.create(...), reuse or delete the default blank first slide, then build every slide with its own small helper function (e.g. slideTitle(), slideFootprintAudit()...).
- Diagrams (trees, flowcharts, network maps, layer stacks) must be drawn with real shapes and connector lines (insertShape / insertLine), not as text art. Tables must be real tables (insertTable).
- Keep everything readable and inside the slide: titles 26-30pt, body 14-18pt, no more than ~60 words of body text per slide; split onto two slides rather than overflow.
- Add this footer text box to EVERY slide, small (9pt), bottom-left: "STUDENT EXAMPLE — for reference only. Do not copy; your topic must be different."
- Put speaker notes on every slide that say which rubric line(s) that slide earns, in a teacher's voice (e.g. "Earns: Stage 2 — Pseudocode Correctness. Notice how...").
- At the very end, Logger.log the presentation URL.
- Before the code, show me a slide-by-slide outline (slide #, title, what's on it, which rubric line). After the code, give a checklist proving every rubric line and every required step is covered, with slide numbers.

===== PROJECT INSTRUCTIONS (copied from the student assignment page) =====
The Scenario

You're a software architect at a small dev studio. Before any engineer on your team is allowed to write a single line of code, they need a complete design blueprint from you — one document that walks them from "here's the problem" all the way to "here's proof it actually works," with nothing assumed and nothing skipped. One algorithm, one blueprint, five connected stages — each one building directly on the last.

Objective

Design a complete algorithm for a real problem — decomposed, written in pseudocode, with your control-structure choices explicitly justified, and proven correct by hand. The same problem and the same pseudocode carry through every stage below; nothing here stands alone. This is a design document, not a coding assignment; no code editor required.

Deliverable: A Google Slides deck, minimum 6 slides. Turn in a PDF export or a text file with your share link below.

New to Google Slides? Start here: Ch 4.0, The Office Suite, From Zero »

The Five Stages (one blueprint, start to finish)

Each stage links to the chapter section that actually teaches how to do it — do that first if you haven't already. Every stage after the first works directly with what you produced in the one before it.

- Pick a real problem to solve (a simple game, a quiz scorer, a class-schedule picker, etc.) — this is the one problem every stage below is built on. It must be a different problem than the one you used for your Chapter 9-10 activities — this project is where you prove you can run the same process on something new, not where you write up work you already finished.

- Stage 1 — Decomposition Tree — a visual breakdown of your problem into its smaller subproblems. How to: Ch 9.1, Decomposition »

- Stage 2 — Pseudocode — write the full algorithm in pseudocode for the exact subproblems you just mapped in Stage 1, not real code. How to: Ch 9.2, Algorithms & Pseudocode »

- Stage 3 — Control Structure Justification — the pseudocode you just wrote in Stage 2 must include at least one decision (if/else) and one loop; explain why you chose that specific structure over an alternative. How to: Ch 10.1, Conditionals » · Ch 10.2, Loops & Iteration »

- Stage 4 — Event-Driven Design — describe one real user action that would trigger the same algorithm from Stage 2, and exactly what response follows. How to: Ch 10.3, Events That Trigger Code »

- Stage 5 — Trace Walkthrough — hand-run the exact pseudocode from Stage 2 with 2 different sample inputs and show the output for each, step by step — the proof your blueprint actually works. How to: Ch 10.4, Lists & Systematic Testing »

Your Slide-by-Slide Plan

Not sure how to lay out the deck? Use exactly this order. One slide per row is the minimum — use more if a stage needs the room.

|

| Slide | Title it | What goes on it

| 1 | The Problem | Your name, your problem in one sentence, and who would use it. Example sentence: "A program that ___ so that ___ can ___."

| 2 | Stage 1: Decomposition Tree | A tree diagram (boxes + lines). Your problem at the top, 3–5 smaller jobs underneath it. Every box should be a job the program does, written as a verb phrase ("Add up the prices," not "Prices").

| 3 | Stage 2: Pseudocode | The full algorithm in plain-English steps using START, GET, SET, IF / ELSE, a loop (FOR EACH or WHILE), DISPLAY, END. Each box from Slide 2 should show up as part of these steps.

| 4 | Stage 3: Why These Structures? | Point to your IF and your loop on Slide 3. For each one, answer: "I used ___ instead of ___ because ___." “Because it works” does not count — name the alternative and why it would be worse.

| 5 | Stage 4: The Event | Three lines: Trigger (what the user does), Algorithm (your Slide 3 algorithm runs), Response (exactly what the user sees after).

| 6+ | Stage 5: Trace Walkthrough | Two different inputs, each traced line by line in a table showing every variable's value as it changes, ending with the final output. (Bonus: a third trace with an edge case like an empty list or zero.)

Before You Turn It In

- My problem is not the same one I used in my Chapter 9–10 activities, and not the snack bar example above.

- Every box in my decomposition tree shows up somewhere in my pseudocode.

- My pseudocode has at least one IF and at least one loop.

- My Stage 3 slide names an alternative structure for each choice and explains why mine is better.

- My event slide has a trigger, the algorithm, and a response.

- I traced two different inputs, step by step, and my traces match what my pseudocode actually does.

- I have at least 6 slides and exported them as a PDF (File → Download → PDF Document).

Most common mistakes:

- Trace doesn't match the pseudocode. If your pseudocode says total - 1, your trace has to subtract 1. Trace what you wrote, not what you meant.

- Writing real code instead of pseudocode. No semicolons, curly braces, or console.log — plain English steps.

- Uploading the Google Slides link without sharing it. If you turn in a link, set sharing to "Anyone with the link can view" first, or upload the PDF instead.

- Turning in an unfinished deck to "save a spot." Upload once, when all five stages are done.

<div

===== GRADING RUBRIC =====
- Stage 1: Decomposition: The problem is broken into real, non-trivial subproblems that together cover the whole problem.
- Stage 2: Pseudocode Correctness: The pseudocode is complete, logically correct, and readable by someone who did not write it.
- Stage 3: Control Structure Justification: Explains a real tradeoff for why this decision/loop structure was chosen over an alternative, not just because it works.
- Stage 4: Event-Driven Design: Clearly maps one real trigger to one real response in the algorithm.
- Stage 5: Trace Walkthrough: Both sample inputs are hand-traced correctly, step by step, matching what the pseudocode would actually produce.
- Edge Case Trace (Bonus) (BONUS): A third trace input is an edge case (empty input, zero, a boundary value) and is handled correctly.

===== WORKED EXAMPLE (use THIS topic and these details, expanded to full size) =====
Worked Example: What a Finished Blueprint Looks Like

You may NOT use this problem for your own project. It's here so you can see how all five stages connect to one problem — pick your own problem and follow the same pattern.

The Problem: A snack bar checkout that adds up a customer's order and takes $1 off any order of $10 or more.

Stage 1 — Decomposition Tree

Snack Bar Checkout
┌────────────┬────────┴─────┬──────────────┐
Get the order  Add up the   Check for the   Show the
list        prices        discount        total

Stage 2 — Pseudocode

START
GET orderList
SET total = 0
FOR EACH price IN orderList
SET total = total + price
END FOR
IF total >= 10 THEN
SET total = total - 1
DISPLAY "Discount applied!"
END IF
DISPLAY "Your total is $" + total
END

Stage 3 — Control Structure Justification

- Loop: I used FOR EACH instead of a WHILE loop because the order list already knows how many items it has. A WHILE loop would need a counter I could forget to increase, which could cause an infinite loop.

- Decision: I used an IF with no ELSE because something extra only happens when the discount applies. An IF/ELSE would need an empty ELSE branch that does nothing, which makes the logic harder to read.

Stage 4 — Event-Driven Design

- Trigger: The cashier clicks the Checkout button.

- Algorithm: The Stage 2 pseudocode runs on the items currently in the order.

- Response: The screen shows the final total, plus "Discount applied!" if the order was $10 or more.

Stage 5 — Trace Walkthrough

Input A: orderList = [3, 4]

|
| Step | price | total | What happens

| SET total = 0 | – | 0 | Start at zero

| Loop, item 1 | 3 | 3 | 0 + 3

| Loop, item 2 | 4 | 7 | 3 + 4

| IF total >= 10 | – | 7 | 7 >= 10 is FALSE, skip discount

| DISPLAY | – | 7 | Output: "Your total is $7"

Input B: orderList = [5, 2, 4]

|
| Step | price | total | What happens

| SET total = 0 | – | 0 | Start at zero

| Loop, item 1 | 5 | 5 | 0 + 5

| Loop, item 2 | 2 | 7 | 5 + 2

| Loop, item 3 | 4 | 11 | 7 + 4

| IF total >= 10 | – | 10 | 11 >= 10 is TRUE, so 11 − 1 = 10, show "Discount applied!"

| DISPLAY | – | 10 | Output: "Discount applied!" then "Your total is $10"

Bonus edge case: orderList = [] (empty order) — the loop runs zero times, total stays 0, 0 >= 10 is FALSE, output "Your total is $0." No crash, so the edge case is handled.
```

---

## Unit 5 — The Tech Impact Briefing

```text
You are helping a high school Computer Science teacher at Carson High School (Nevada) make a model "finished student example" so her 9th-12th graders can see exactly what a full-credit project looks like.

TASK: Unit 5 Project: The Tech Impact Briefing. Build it as a Google Slides deck (minimum 7 slides) plus a Works Cited slide. Stay neutral and school-appropriate: model reasoning, not a political position.

CONTENT RULES
- This must look like a finished, FULL-CREDIT project by a strong 9th-grade student: correct, complete, clear, in a natural student voice (not corporate, not textbook, no AI-sounding filler).
- The student is fictional: "Jordan Example".
- Use EXACTLY the topic, data, and details from the WORKED EXAMPLE section below. That topic is off-limits to real students, so they can't copy it. Expand it to full project size; don't invent a different topic.
- Cover every step/stage in the PROJECT INSTRUCTIONS, in the same order, and meet the minimum slide/tab count. Include the bonus rubric item and label it "(Bonus)".
- Every real-world fact must be real and verifiable. No invented statistics, quotes, studies, URLs, or citations. If you aren't sure of a URL, cite the publication name and date without a link.
- Re-check every number, formula result, trace, and conversion before you finish.

TECHNICAL RULES (Google Slides builder)
- Write ONE complete, standalone Google Apps Script (V8 runtime) with a main function named buildExample(). I will paste it into a brand-new project at script.google.com and click Run. It must work with zero edits.
- Use ONLY built-in services: SlidesApp (and DriveApp only if truly needed). No libraries, no advanced services, no external URLs or images.
- buildExample() must create a NEW presentation with SlidesApp.create(...), reuse or delete the default blank first slide, then build every slide with its own small helper function (e.g. slideTitle(), slideFootprintAudit()...).
- Diagrams (trees, flowcharts, network maps, layer stacks) must be drawn with real shapes and connector lines (insertShape / insertLine), not as text art. Tables must be real tables (insertTable).
- Keep everything readable and inside the slide: titles 26-30pt, body 14-18pt, no more than ~60 words of body text per slide; split onto two slides rather than overflow.
- Add this footer text box to EVERY slide, small (9pt), bottom-left: "STUDENT EXAMPLE — for reference only. Do not copy; your topic must be different."
- Put speaker notes on every slide that say which rubric line(s) that slide earns, in a teacher's voice (e.g. "Earns: Stage 2 — Pseudocode Correctness. Notice how...").
- At the very end, Logger.log the presentation URL.
- Before the code, show me a slide-by-slide outline (slide #, title, what's on it, which rubric line). After the code, give a checklist proving every rubric line and every required step is covered, with slide numbers.

===== PROJECT INSTRUCTIONS (copied from the student assignment page) =====
Objective

Investigate one real, current technology's real impact on society — who it helps, who it could disadvantage, who owns it, and whether that tradeoff is worth it.

Deliverable: A Google Slides deck, minimum 7 slides. Turn in a PDF export or a text file with your share link below.

New to Google Slides? Start here: Ch 4.0, The Office Suite, From Zero »

Steps

Each step below links to the chapter section that actually teaches how to do it — do that first if you haven't already.

- Choose one real current technology (a social media algorithm, an AI writing/image tool, facial recognition, a wearable health tracker, a recommendation engine, etc.).

- Explain It — what it does and how it works, in plain language.

- Bias & Equity Test — describe a real or realistic test of who this technology could disadvantage, and what you'd find. How to: Ch 11.2, Testing for Bias »

- Cross-Disciplinary Connection — show how this same algorithm/technology shows up in a different field than the one it's best known for. How to: Ch 13.1, One Algorithm, Many Fields »

- Privacy & Data — what personal data does it collect, and what are the real privacy concerns? How to: Ch 12.2, Reading Your Own Footprint Honestly »

- IP & Legal Angle — who owns the data or the algorithm, and what's the tradeoff of that ownership?

- Your Verdict — is this technology a net positive or net negative for society? Defend it with real evidence, not just opinion. How to: Ch 13.2, AI's Impact on Society, Honestly »

<div

===== GRADING RUBRIC =====
- Technology Explanation: Explains accurately and clearly how the chosen technology actually works, in the students own words.
- Bias & Equity Analysis: Names a specific, real (or realistic) group the technology could disadvantage and why -- not a generic it could be biased.
- Cross-Disciplinary Connection: The second field is genuine and specific, with a real explanation of how the same tech applies there.
- Privacy & Legal Analysis: Both the privacy concern and the ownership/IP tradeoff are explained with real specifics about this technology.
- Defended Verdict: The final verdict is backed by the evidence presented earlier in the deck, not just a restated opinion.
- Counter-Argument (Bonus) (BONUS): Fairly represents a real counter-argument to the students own verdict before defending their position.

===== WORKED EXAMPLE (use THIS topic and these details, expanded to full size) =====
Worked Example: What a Finished Briefing Looks Like

You may NOT use this technology (automated license plate readers) for your own project. It's here so you can see how every slide connects to one technology — pick your own and follow the same pattern.

Below is a preview of a finished deck, slide by slide. Notice that each slide has only a title, a few short bullets, and a picture or diagram. The full explanation goes in what you say while presenting. Put that in your Speaker Notes in Google Slides (View → Show speaker notes).

Slide 1Jordan Example

License Plate Readers: Who's Watching the Road?

- Unit 5 Tech Impact Briefing
- Jordan Example · CS, Period A3

Photo: a plate-reader camera mounted on a traffic pole

What Jordan says: Today I'm briefing you on automated license plate readers, or ALPRs, and whether they're worth what they cost us in privacy.

Slide 2Jordan Example

Explain It: How an ALPR Works

- A camera photographs every plate that drives by
- Software (OCR) turns the photo into text
- Saves the plate + time + GPS location
- Checks it against a "hot list" → alerts an officer on a match

Diagram: Camera → OCR text → Database → Hot-list check → Alert

What Jordan says: An ALPR is a camera, mounted on a pole or a police car, that photographs every license plate passing by. Software uses optical character recognition (OCR) to turn the photo into text, then saves it with the time and GPS location. Each plate is checked against a “hot list” of plates linked to stolen cars or Amber Alerts, and a match alerts an officer.

Slide 3Jordan Example

Bias & Equity Test

- OCR can misread one character
- 2009, San Francisco: a misread plate → Denise Green stopped at gunpoint
- My test: map where cameras are vs. who lives there
- More cameras in one area = more misreads and stops there

Map: a city with camera locations marked as dots

What Jordan says: OCR can misread a character, and that happens to whoever drives past. In 2009, a San Francisco ALPR misread one digit on Denise Green's plate, and officers stopped her at gunpoint without checking the plate themselves. A realistic test: map where a city's cameras are placed and compare that to neighborhood demographics, since more cameras in one area means more misreads and more stops for the people who live there.

Slide 4Jordan Example

Same Tech, Different Field: Transportation

- Cashless toll roads read your plate and mail you the bill
- Parking garages: no ticket, the camera reads your plate
- Same plate-reading tech: a billing tool, not a policing tool

Photo: an overhead toll-road camera gantry

What Jordan says: The same plate-recognition technology runs cashless toll roads that mail a bill to the plate's owner, and parking garages that let you in and out without a ticket. In transportation, it's a billing tool instead of a policing tool.

Slide 5Jordan Example

Privacy & Data

- One plate read seems harmless
- Many reads over time show where a car sleeps, goes to school or worship, and who it visits
- New Hampshire: non-matches deleted within 3 minutes
- Other places keep reads much longer

Map: one car's dots over a week, connecting home, school, and a friend's house

What Jordan says: A single plate read seems harmless, but many reads over time can show where a car sleeps, where it goes to school or worship, and who it visits. How long that data is kept depends on local rules. New Hampshire, for example, has required plate reads that don't match a hot list to be deleted within three minutes, while other places keep them much longer.

Slide 6Jordan Example

IP & Legal Angle: Who Owns It?

- Many systems are built and run by private companies
- Cities pay to use them, and the company often controls the database
- Pro: police can search across many towns fast
- Con: proprietary code is hard for the public to check

Icon pair: a city hall and a company building, with a database between them

What Jordan says: Many ALPR systems are built and run by private companies that cities pay to use, so the company owns the software and often controls the database. That can make it faster for police to search across many towns. It can also make it harder for the public to see how the system works or who can search it, because the code is proprietary.

Slide 7Jordan Example

My Verdict

- Net positive, but only with 2 rules: (1) a human double-checks every match, (2) short data-retention limits
- Evidence: hot-list matches flag stolen cars and Amber Alert vehicles fast
- Evidence: the Green case shows what happens without a human check
- Counterargument: short retention makes old crimes harder to solve

Simple scale graphic: Safety benefits vs. Privacy risks

What Jordan says: Position: ALPRs are a net positive only with a human double-check and short data-retention limits. The hot-list match itself is useful: it can flag a stolen car or an Amber Alert vehicle faster than an officer reading plates by eye. The Green case shows the cost of skipping the human check. In 2014, the Ninth Circuit let her lawsuit go forward because officers never confirmed the camera's read. Short retention limits make the data less useful for solving older crimes. That's a real cost, but I'd accept it, because a database of where everyone drove is a much bigger risk if it's misused or leaked.

Slide 8Jordan Example

Works Cited

- Green v. City & County of San Francisco, U.S. Court of Appeals for the Ninth Circuit, 2014.
- New Hampshire Revised Statutes, RSA 261:75-b (license plate reader data).
- Electronic Frontier Foundation, “Automated License Plate Readers (ALPRs),” Street-Level Surveillance.

No picture needed: just clean, complete citations

What Jordan says: Every fact in my deck comes from one of these sources. I cited the court case and the state law directly, not just a news story about them.
```

---

## Unit 6 — The App Blueprint & Build Plan

```text
You are helping a high school Computer Science teacher at Carson High School (Nevada) make a model "finished student example" so her 9th-12th graders can see exactly what a full-credit project looks like.

TASK: Unit 6 Project: The App Blueprint & Build Plan. Build BOTH a Google Sheet (one tab named "Data Structure Comparison": the same data as separate simple variables vs. one list/array-style table, plus 2-3 sentences on why the list scales) AND a Google Slides deck (minimum 6 slides) for every other step.

CONTENT RULES
- This must look like a finished, FULL-CREDIT project by a strong 9th-grade student: correct, complete, clear, in a natural student voice (not corporate, not textbook, no AI-sounding filler).
- The student is fictional: "Jordan Example".
- Use EXACTLY the topic, data, and details from the WORKED EXAMPLE section below. That topic is off-limits to real students, so they can't copy it. Expand it to full project size; don't invent a different topic.
- Cover every step/stage in the PROJECT INSTRUCTIONS, in the same order, and meet the minimum slide/tab count. Include the bonus rubric item and label it "(Bonus)".
- Every real-world fact must be real and verifiable. No invented statistics, quotes, studies, URLs, or citations. If you aren't sure of a URL, cite the publication name and date without a link.
- Re-check every number, formula result, trace, and conversion before you finish.

TECHNICAL RULES (Google Sheets builder)
- Write ONE complete, standalone Google Apps Script (V8 runtime) with a main function named buildExample() that builds BOTH files by calling buildSheet() and then buildSlides(), and logs both URLs. I will paste it into a brand-new project at script.google.com and click Run. It must work with zero edits.
- Use ONLY built-in services: SpreadsheetApp and Charts. No libraries, no advanced services, no external data.
- buildExample() must create a NEW spreadsheet with SpreadsheetApp.create(...), add each tab with insertSheet using the EXACT tab names the project requires, and delete the default "Sheet1".
- Every calculated cell must be a LIVE FORMULA set with setFormula / setFormulas (never a typed-in result), exactly as a student would build it, so students can click a cell and see the formula.
- Build real charts with sheet.newChart()...build() and insertChart, with titles and axis labels. Use number formats ($0.00 etc.), bold headers, frozen header rows, and sensible column widths so it looks like real, careful student work.
- Put a banner in row 1 of every tab: "STUDENT EXAMPLE — for reference only. Do not copy; your data/topic must be different." Start the real content below it, and make sure every formula points at the right rows.
- After building, call SpreadsheetApp.flush(), then READ BACK every key formula result and Logger.log it, so I can verify the math. Then Logger.log the spreadsheet URL.
- Before the code, show me the planned layout of each tab (columns, rows, formulas, charts). After the code, give a checklist proving every rubric line and every required step is covered, with tab + cell references.

For the Slides part, also follow these rules:
- buildExample() must create a NEW presentation with SlidesApp.create(...), reuse or delete the default blank first slide, then build every slide with its own small helper function (e.g. slideTitle(), slideFootprintAudit()...).
- Diagrams (trees, flowcharts, network maps, layer stacks) must be drawn with real shapes and connector lines (insertShape / insertLine), not as text art. Tables must be real tables (insertTable).
- Keep everything readable and inside the slide: titles 26-30pt, body 14-18pt, no more than ~60 words of body text per slide; split onto two slides rather than overflow.
- Add this footer text box to EVERY slide, small (9pt), bottom-left: "STUDENT EXAMPLE — for reference only. Do not copy; your topic must be different."
- Put speaker notes on every slide that say which rubric line(s) that slide earns, in a teacher's voice (e.g. "Earns: Stage 2 — Pseudocode Correctness. Notice how...").
- At the very end, Logger.log the presentation URL.
- Before the code, show me a slide-by-slide outline (slide #, title, what's on it, which rubric line). After the code, give a checklist proving every rubric line and every required step is covered, with slide numbers.

===== PROJECT INSTRUCTIONS (copied from the student assignment page) =====
Objective

Design a real app end-to-end — for a problem you or someone you actually know deals with, not a textbook example: model its data, break it into real modules, and document a full software-development-lifecycle pass on it — including real feedback you actually got and acted on. The real test of this project isn't whether it looks complete — it's whether you could explain to someone why this app should actually exist.

Deliverable: One Google Sheets tab (data structure comparison) + a Google Slides deck (everything else), minimum 6 slides. Turn in a PDF export of both, or a text file with your share links, below.

New to Google Slides or Sheets? Start here: Ch 4.0, The Office Suite, From Zero » · Spreadsheet Basics, From Zero »

Steps

Each step below links to the chapter section that actually teaches how to do it — do that first if you haven't already.

- Pick a real app idea that would solve an actual annoyance or gap in your life or someone else's — not "make school better," something specific: splitting gas money fairly on a carpool, tracking practice reps for a skill you're actually working on, finding what's already in the fridge before a grocery run, splitting chores evenly with siblings or roommates. It doesn't need to get built for real — you're designing it, not coding it — but it needs to be something you'd genuinely want to exist.

- Sheets: Data Structure Comparison — model a real chunk of your app's data both as a list/array-style table and as separate simple variables, then write out why the list/array version scales better as the data grows. How to: Ch 14.1, Arrays »

- Slides: Module Breakdown — decompose your app into at least 3 real modules/procedures (e.g. "input handling," "score calculation," "display"), each with a one-sentence job description. How to: Ch 15.1, Procedures, Parameters & Return Values »

- Slides: SDLC Walkthrough — document each phase: Planning, Design, a real Feedback round (get actual feedback from a classmate and show what you changed because of it), Testing, and one specific Accessibility finding + fix. How to: Ch 16.1, The Lifecycle & Real User Feedback » · Ch 16.3, Accessibility »

- Slides: License Check — list every outside resource, image, icon, or font you used and its license/attribution. How to: Ch 16.2, Licensing & Intellectual Property »

- Slides: Why This App, For Real — name one specific real person (it can be you) who would actually use this app, and the specific real moment where not having it causes a real problem. Not "it would be useful" — the actual moment.

<div

===== GRADING RUBRIC =====
- Data Structure Comparison: The array/list version and the plain-variables version model the same real data, and the explanation of why the list scales better is specific, not generic.
- Module Design: At least 3 modules are logical, non-overlapping, and each has a clear, specific job.
- SDLC Documentation: Every phase is shown, and the feedback round shows a real, specific change made because of real feedback, not invented.
- Accessibility Finding: Names one specific, real accessibility issue in the app idea and a specific fix, not a generic accessibility statement.
- License Check: Every outside resource used is listed with its actual license or attribution requirement.
- Why This App, For Real: Names a specific real person and a specific real moment where not having this app causes an actual problem -- not a generic "it would be useful" statement.
- Revision History (Bonus) (BONUS): Includes a revision history or version log showing the plan actually changed over more than one round.

===== WORKED EXAMPLE (use THIS topic and these details, expanded to full size) =====
Worked Example: What a Finished App Blueprint Looks Like

You may NOT use this app idea (a pet-feeding tracker) for your own project. It's here so you can see how every step connects to one app — pick your own real annoyance and follow the same pattern.

The App: “Who's Feeding the Dog?” — one tap logs that the dog was fed, so nobody in the family double-feeds or forgets.

Sheets: Data Structure Comparison

Separate simple variables

feeding1 = "Mon AM, Leo"
feeding2 = "Mon PM, Dad"
feeding3 = "Tue AM, Leo"
feeding4 = "Tue PM, ???"

One list/array table

|
| Day | Meal | Fed By | Time

| Mon | AM | Leo | 7:05

| Mon | PM | Dad | 6:30

| Tue | AM | Leo | 7:12

Why the list scales: After a year, the variable version needs 730 separately named variables, and checking “was the dog fed tonight?” means writing code that knows every name. The list just grows by one row per feeding, and one loop or one COUNTIF can search all of it.

Slides: Module Breakdown

|
| Module | Job | Inputs (parameters) | Returns

| logFeeding | Adds a new row when someone taps “I fed him.” | person, meal, time | the updated feeding list

| wasFed | Checks whether a meal has already been logged today. | feedingList, day, meal | true or false

| buildReminder | Writes the reminder text if a meal is overdue. | meal, lastPersonWhoFed | a message string, e.g. “Dinner not logged yet. Leo fed him last.”

Slides: SDLC Walkthrough

- Planning: Users are the 4 people in one household. Goal: anyone can see in 2 seconds whether the dog ate.

- Design: One screen with two big buttons (Breakfast, Dinner), each showing who fed him and when.

- Feedback: Classmate Ari tested the sketch and said, “If two people tap at the same time, both think they fed him.” Change: after one tap, the button locks and shows “Fed by Leo, 7:12” instead of letting a second person log the same meal.

- Testing: Tapped Breakfast twice from two phones. Expected: second tap shows “Already fed by Leo.” Result: passed after the lock was added.

- Accessibility: Finding: “fed” and “not fed” were shown only as green vs. red, which some color-blind users can't tell apart. Fix: added a check-mark icon and the words “Fed” / “Not fed yet.”

Slides: License Check

- Dog and check-mark icons: Font Awesome Free, CC BY 4.0, attribution on the credits slide.

- Font: Atkinson Hyperlegible, SIL Open Font License, free to use and embed.

- All screen sketches: drawn by me.

Slides: Why This App, For Real

Leo Example, 15. Last Tuesday he got home at 6:00 and fed Biscuit; his dad got home at 6:45 and fed him again because nobody had said anything. Biscuit's vet had just put him on a diet, so the double dinner set the diet back. The app exists for that 45-minute gap.
```

---

## Unit 7 — The Network Audit

```text
You are helping a high school Computer Science teacher at Carson High School (Nevada) make a model "finished student example" so her 9th-12th graders can see exactly what a full-credit project looks like.

TASK: Unit 7 Project: The Network Audit. Build it as a Google Slides deck (minimum 6 slides). Draw the network diagram with real shapes and connector lines, using only private IP ranges (nothing resembling real infrastructure).

CONTENT RULES
- This must look like a finished, FULL-CREDIT project by a strong 9th-grade student: correct, complete, clear, in a natural student voice (not corporate, not textbook, no AI-sounding filler).
- The student is fictional: "Jordan Example".
- Use EXACTLY the topic, data, and details from the WORKED EXAMPLE section below. That topic is off-limits to real students, so they can't copy it. Expand it to full project size; don't invent a different topic.
- Cover every step/stage in the PROJECT INSTRUCTIONS, in the same order, and meet the minimum slide/tab count. Include the bonus rubric item and label it "(Bonus)".
- Every real-world fact must be real and verifiable. No invented statistics, quotes, studies, URLs, or citations. If you aren't sure of a URL, cite the publication name and date without a link.
- Re-check every number, formula result, trace, and conversion before you finish.

TECHNICAL RULES (Google Slides builder)
- Write ONE complete, standalone Google Apps Script (V8 runtime) with a main function named buildExample(). I will paste it into a brand-new project at script.google.com and click Run. It must work with zero edits.
- Use ONLY built-in services: SlidesApp (and DriveApp only if truly needed). No libraries, no advanced services, no external URLs or images.
- buildExample() must create a NEW presentation with SlidesApp.create(...), reuse or delete the default blank first slide, then build every slide with its own small helper function (e.g. slideTitle(), slideFootprintAudit()...).
- Diagrams (trees, flowcharts, network maps, layer stacks) must be drawn with real shapes and connector lines (insertShape / insertLine), not as text art. Tables must be real tables (insertTable).
- Keep everything readable and inside the slide: titles 26-30pt, body 14-18pt, no more than ~60 words of body text per slide; split onto two slides rather than overflow.
- Add this footer text box to EVERY slide, small (9pt), bottom-left: "STUDENT EXAMPLE — for reference only. Do not copy; your topic must be different."
- Put speaker notes on every slide that say which rubric line(s) that slide earns, in a teacher's voice (e.g. "Earns: Stage 2 — Pseudocode Correctness. Notice how...").
- At the very end, Logger.log the presentation URL.
- Before the code, show me a slide-by-slide outline (slide #, title, what's on it, which rubric line). After the code, give a checklist proving every rubric line and every required step is covered, with slide numbers.

===== PROJECT INSTRUCTIONS (copied from the student assignment page) =====
Objective

Audit a network — map its topology, identify real threats it faces, and recommend security measures with the tradeoffs explicitly weighed, not just "the most secure option."

Deliverable: A Google Slides deck, minimum 6 slides. Turn in a PDF export or a text file with your share link below.

New to Google Slides? Start here: Ch 4.0, The Office Suite, From Zero »

Steps

Each step below links to the chapter section that actually teaches how to do it — do that first if you haven't already.

- Diagram a real or realistic network (a home network, a small business, or a generalized school-style network — not exact real infrastructure) showing routers, switches, servers, and how devices are addressed. It must be a different network than the one you mapped in your Chapter 17 activity (your own home network) — this project is where you prove you can run the same process on something new, not where you write up work you already finished. How to: Ch 17.1, Routers, Switches & Topology »

- Identify 2+ real, specific threats this network is exposed to — not generic "hackers." How to: Ch 18.1, Malware Families » · Ch 18.3, Network Attacks & Real Defenses »

- For each threat, recommend a security measure, reasoning about efficiency and feasibility, not just picking the most secure option regardless of cost. How to: Ch 19.2, Writing a Recommendation Someone Will Fund »

- Compare 2 competing security measures head-to-head on usability vs. security tradeoffs. How to: Ch 19.1, The Usability »

- Final Recommendation — pick your overall approach and explicitly state what tradeoff you're accepting.

<div

===== GRADING RUBRIC =====
- Network Diagram: Routers, switches, servers, and addressing are all shown and the relationships between them are labeled correctly.
- Threat Identification: At least 2 threats are specific and realistic for this network, not generic.
- Security Recommendations: Each recommendation reasons about efficiency/feasibility, not just picking the most secure option regardless of cost.
- Tradeoff Comparison: Two competing measures are compared specifically on usability vs. security, with a real conclusion.
- Final Recommendation: States the chosen approach and explicitly names the tradeoff being accepted.
- Incident Response Plan (Bonus) (BONUS): Includes a basic incident response plan -- what to do if the network IS breached despite the defenses chosen.

===== WORKED EXAMPLE (use THIS topic and these details, expanded to full size) =====
Worked Example: What a Finished Audit Looks Like

You may NOT use this network (a small bakery) for your own project. It's here so you can see how every slide connects to one network — pick your own and follow the same pattern.

The Network: A small family-owned bakery with free guest Wi-Fi for customers, one point-of-sale (POS) terminal, an office PC, and a security camera recorder (DVR). The owner is not a tech person and has a small budget.

Slide — Network Diagram

Internet
│
ISP modem
│
Router / firewall  (192.168.1.1)
│
├── Staff network  192.168.1.0/24
│     └── Switch
│           ├── POS terminal      192.168.1.20
│           ├── Office PC         192.168.1.21
│           └── Camera DVR        192.168.1.30
│
└── Guest Wi-Fi    192.168.50.0/24  (customers' phones,
addresses handed out
automatically)

Private addresses only (192.168.x.x ranges are reserved for local networks), so this doesn't describe any real business.

Slide — Threats

- POS memory-scraping malware: Malware such as BlackPOS (used in the 2013 Target breach) reads card numbers out of a POS computer's memory in the split second before they're encrypted. If the office PC gets infected through a phishing email, the malware can spread to the POS because they're on the same network.

- Guest device reaching staff devices: If the guest Wi-Fi isn't actually isolated, any customer's phone or laptop on it can scan for and attack the POS and the DVR.

- DVR with a default password: Botnets such as Mirai (2016) took over huge numbers of cameras and DVRs simply by trying factory default usernames and passwords.

Slide — Recommendations

- For threat 1: Ask the card processor for a standalone payment terminal with point-to-point encryption, so card numbers are encrypted inside the card reader and never sit readable on any bakery computer. Often low or no upfront cost from the processor, and the owner doesn't have to manage it.

- For threat 2: Turn on the router's guest network isolation setting. Free, takes 10 minutes, and most small-business routers already have it.

- For threat 3: Change the DVR's default password and block it from the internet. Free, one-time job; viewing cameras remotely is a nice-to-have, not a need.

Slide — Head-to-Head: Guest Wi-Fi

|
|  | Option A: Isolated guest network, password on the counter sign | Option B: No guest Wi-Fi at all

| Security | Good. Guests can't see staff devices, but they still share the same router and internet connection. | Best. No customer devices on the network at all.

| Usability | Customers get Wi-Fi; password changes monthly and the sign gets updated. | Customers who sit and work go elsewhere.

| Cost to owner | Free; 5 minutes a month. | Free, but may cost sales.

Slide — Final Recommendation

Keep guest Wi-Fi as Option A, move card payments to an encrypted standalone terminal, and lock down the DVR. Tradeoff accepted: guests still share the router with staff, so a flaw in the router itself could expose the staff network. I'm accepting that small risk because customers expect Wi-Fi, and the most valuable data (card numbers) is protected by the terminal no matter what happens on the network.
```

---

## Optional — Google Apps Script prototype example (Chapters 9–16)

This one makes a Google Sheet **plus** the student's own Apps Script code that goes inside it.
Run FILE 1 at script.google.com. Then open the new sheet → **Extensions → Apps Script** → paste FILE 2 → Save → reload the sheet to see the **Snack Fund** menu.

```text
You are helping a high school Computer Science teacher at Carson High School (Nevada) make a model "finished student example" of the Google Apps Script prototype her students build across Chapters 9-16 (Unit 4-6).

TASK: Give me TWO separate code files.

FILE 1 - builder.gs (standalone): a buildExample() function I paste into a new project at script.google.com and run. It creates a NEW Google Sheet named "STUDENT EXAMPLE - Club Snack Fund Tracker", with tabs "Purchases" (headers: Date | Item | Category | Amount | Bought By, plus 8 realistic sample rows) and "Report" (empty, for the script to fill). Add a banner row: "STUDENT EXAMPLE - for reference only. Do not copy; your topic must be different." Logger.log the sheet URL.

FILE 2 - Code.gs (the student's actual prototype), which I will paste into that new sheet via Extensions -> Apps Script. Write it like a strong student would, with short comments labeling which chapter skill each part shows:
- Ch 9: a function translated from pseudocode, with the pseudocode as a comment block above it.
- Ch 10: an if / else if / else with 3 real cases plus an invalid-input case; a for loop over every data row; an onEdit(e) trigger that only watches the Amount column, ignores erased cells, and rejects non-numbers with e.source.toast(...); and a testAll() function that runs 3 test cases (normal, empty, invalid) and logs PASS/FAIL for each.
- Ch 14: read the data with getRange(...).getValues() (a 2D array, handled correctly as data[row][col]) and use one object (e.g. a category-totals dictionary).
- Ch 15: 3+ single-job procedures with parameters and return values, an onOpen() custom menu ("Snack Fund" -> "Run Report", "Run Tests"), and friendly SpreadsheetApp.getUi().alert(...) messages instead of crashes.
- "Run Report" writes a summary to the Report tab: total spent, average purchase, total per category, and the biggest single purchase.

RULES
- V8 Apps Script, built-in services only, no libraries. Both files must run with zero edits.
- Make sure the Code.gs column positions exactly match the builder's headers and banner row.
- Before the code, list every function and what it does. After the code, give step-by-step instructions for a 9th grader to set it up and run it, plus the exact log output they should expect from testAll() and Run Report for the sample data. Re-check that output against the sample data by hand.
```
