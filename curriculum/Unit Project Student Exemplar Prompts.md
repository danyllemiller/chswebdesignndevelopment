# CS Unit Projects — Student Exemplar File Prompts

These prompts have Claude build a real, finished example file for each CS unit
project: a PowerPoint, Excel workbook, or Word doc that looks like something an
actual strong student turned in. Students download it to see what "done" looks
like.

**How to use these:**
- Paste **one** prompt at a time into Claude Code in this repo. Review what it
  made, then do the next.
- **Only one Claude session at a time.** Two sessions editing the same project
  page at once is what caused the duplicated Unit 6 card on 2026-10-15.
- Each exemplar uses the **same off-limits topic as that page's Worked Example
  card**, so the card and the download match and students can't copy the topic.

---

## Shared rules (already pasted into every prompt below)

```
SHARED RULES FOR THIS TASK
1. Before starting: run `git pull` and `git status`. If anything other than
   untracked files is modified, stop and tell me instead of continuing.
2. Read the project page named below in full, including its rubric (the
   data-rubric attribute on #project-grading-panel) and its "Worked Example" card.
   The exemplar must use the SAME topic as that Worked Example card, which
   students are not allowed to use, so they can't copy it.
3. Make it look like real, strong 9th-grade work: clear, correct, complete,
   and earning full rubric credit. Use a natural student voice, not a
   corporate or textbook voice. No AI-sounding filler.
4. The "student" is fictional: use the name "Jordan Example." Put a small
   footer or header on every slide/page/sheet that reads:
   "STUDENT EXAMPLE — for reference only. Do not copy; your topic must be different."
5. Hit every step and every rubric line, in the order the page lists them,
   and meet the page's minimum slide/tab count. Include the bonus rubric item
   too, and label it "(Bonus)".
6. Every real-world fact must be real and verifiable. No invented statistics,
   quotes, URLs, or citations. If you're unsure of a URL, cite the publication
   and date without one.
7. Build real files with the matching skill (pptx / xlsx / docx). Spreadsheet
   numbers must be LIVE FORMULAS, not typed values, and must recalculate
   correctly. Recalculate and check every formula result before finishing.
8. Save the file(s) to: exemplars/cs/unitN/  (N = the unit number), named
   like  Unit-N-Student-Example.pptx
9. Add ONE small card to the project page, directly after its Worked Example
   card, and change nothing else on the page. Match the page's existing Bootstrap
   card style. The card should be titled "Download a Finished Student Example,"
   have one sentence saying it's an example of full-credit work on an off-limits
   topic, and include download link(s) to the file(s).
10. Verify: div/tag balance unchanged except for your one card, the link
    path resolves to the real file, and nothing else in the diff.
11. Commit with a clear message and push. Then deploy:
    ssh vWebServer "cd /var/www/chswebdesignndevelopment && git pull --ff-only"
    (If SSH times out, I'm on the school network. Tell me and stop.)
12. Report: what you built, file path(s), slide/tab count, and a list of any
    real-world facts you used so I can spot-check them.
```

---

## Unit 1 — The Digital Citizenship Case File  (PowerPoint, 8+ slides)

```
[paste SHARED RULES above]

Project page: compsci/unit1-project.html (The Digital Citizenship Case File).
Build Unit-1-Student-Example.pptx: a Google-Slides-style deck, 8+ slides,
following the page's steps in order: Title, Footprint Audit, Real-World Case
Study, Threat & Risk ID, Ethics & Privacy Analysis, Sourcing & Attribution
(Works Cited), Your Code of Conduct (5 rules, each tied to the case),
Reflection.
- Use the exact real case and invented persona from the page's Worked Example
  card, expanded to full slides.
- The Footprint Audit is a Safe / Risky / Should Be Deleted table for the
  invented persona only. Never use a real person's handle.
- Works Cited must be real, correctly formatted sources for that case.
```

## Unit 2 — The System & Support Deck  (PowerPoint 6+ slides + Excel chart data)

```
[paste SHARED RULES above]

Project page: compsci/unit2-project.html (The System & Support Deck).
This is a partner project, so the example is by "Jordan Example & Sam Example."
Build Unit-2-Student-Example.pptx (6+ slides) on the same device as the
Worked Example card: Abstraction Layer Map (a real diagram on the slide),
Hardware/Software Interaction, Troubleshooting Guide (a real yes/no flowchart
drawn with shapes), Data Slide, Team Credits.
- Also build Unit-2-Student-Example-Data.xlsx with the failure-point table
  and a real chart built from it. Label the numbers "sample data." Put that
  same chart (or an image of it) on the Data Slide.
- Team Credits shows a realistic role split plus evidence (for example,
  "see version history").
```

## Unit 3 — The Personal Finance Pipeline  (Excel workbook, 4 tabs)

```
[paste SHARED RULES above]

Project page: compsci/unit3-project.html (The Personal Finance Pipeline).
Do NOT touch compsci/unit3-project-byte-size-games.html.

CRITICAL: every student uses the same Raw Data, so the exemplar must NOT use
the project's real codes, register, or savings numbers, and must not reveal
any of their answers (no $335.16, no decoded letters for their 8 codes, no
Week 15/16 values). Instead, extend the page's "lunch card" mini dataset
(Worked Example card) into a FULL-SIZE parallel version:
  - Tab "Decode the Bank Export": 8 codes of your own (mixed binary/hex/
    decimal), all with Binary / Hex / Decimal / ASCII / Meaning columns,
    filled in with DEC2BIN / HEX2DEC / CHAR etc. formulas where possible.
  - Tab "Organize the Register": ~15-20 lunch-card transactions as Version A
    (flat) and Version B (split, with lookup tables), plus the 2-3 sentence
    tradeoff answer.
  - Tab "My Money Dashboard": running Balance column (absolute ref to the
    opening balance), 4 KPIs (SUM, SUM, AVERAGE, ending balance), and two
    real COUNTIF-based charts (by category, by type).
  - Tab "Will I Hit My Goal?": 14 weeks of balances, Weekly Change column,
    AVERAGE, two predictions, the weeks-to-goal formula, and the sentence.
  - Bonus: conditional formatting OR a SUMIF/VLOOKUP, labeled (Bonus).
Build Unit-3-Student-Example.xlsx. Every number is a live formula. Recalculate
and list each KPI/prediction's value in your report so I can check it.
```

## Unit 4 — The Algorithm Design Blueprint  (PowerPoint, 6+ slides)

```
[paste SHARED RULES above]

Project page: compsci/unit4-project.html (The Algorithm Design Blueprint).
Build Unit-4-Student-Example.pptx on the snack-bar checkout from the page's
Worked Example card, following the page's "Your Slide-by-Slide Plan" table
exactly: The Problem, Decomposition Tree (real tree drawn with shapes),
Pseudocode (monospace), Why These Structures?, The Event, and Trace
Walkthrough (two trace tables), plus the (Bonus) edge-case trace.
The pseudocode and traces must match the Worked Example card exactly. Recheck
every trace value.
```

## Unit 5 — The Tech Impact Briefing  (PowerPoint, 7+ slides)

```
[paste SHARED RULES above]

Project page: compsci/unit5-project.html (The Tech Impact Briefing).
Build Unit-5-Student-Example.pptx (7+ slides) on the same technology as the
Worked Example card: Explain It, Bias & Equity Test, Cross-Disciplinary
Connection, Privacy & Data, IP & Legal Angle, Your Verdict (clear position +
2 pieces of evidence + 1 counterargument), plus a Works Cited slide.
Stay neutral and school-appropriate: model reasoning, not a political stance.
Every claim must be real and cited.
```

## Unit 6 — The App Blueprint & Build Plan  (Excel tab + PowerPoint 6+ slides)

```
[paste SHARED RULES above]

Project page: compsci/unit6-project.html (The App Blueprint & Build Plan).
Use the same app as the Worked Example card ("Who's Feeding the Dog?").
- Unit-6-Student-Example-Data.xlsx: one tab, "Data Structure Comparison,"
  showing the same data as separate variables vs. one list/array table, plus
  2 sentences on why the list scales.
- Unit-6-Student-Example.pptx (6+ slides): Module Breakdown (3+ modules with
  inputs/returns), the full SDLC Walkthrough including a realistic feedback
  round and the change it caused, every license/accessibility step the page
  lists, and "Why This App, For Real" (a specific invented person and real
  moment).
```

## Unit 7 — The Network Audit  (PowerPoint, 6+ slides)

```
[paste SHARED RULES above]

Project page: compsci/unit7-project.html (The Network Audit).
Build Unit-7-Student-Example.pptx (6+ slides) on the same bakery network as
the Worked Example card: Network Diagram (drawn with real shapes and
connectors, showing private IP addressing and a separate guest network),
2+ specific threats, a recommendation per threat with cost/feasibility,
a head-to-head usability-vs-security comparison table, and the Final
Recommendation naming the tradeoff accepted.
No real infrastructure: use only private-range addresses.
```

---

## Optional — Google Apps Script example (Chapters 9–16 prototype)

The Unit 4–6 chapter activities build one Apps Script prototype step by step.
This shows students a finished one.

```
[paste SHARED RULES above, but ignore rule 9: no project-page card]

Build a finished student-style Apps Script prototype on an off-limits
topic: a "Club Snack Fund Tracker" (NOT attendance, grades, or anything in
the Ch 9-16 worked examples). It must show, with short student-style comments
labeling each chapter's skill:
  Ch 9  - a function translated from pseudocode (include the pseudocode as a
          comment block above it)
  Ch 10 - an if/else with 3 cases + invalid input, a for loop over 5+ rows,
          an onEdit trigger that rejects non-numbers in one column, and 3 test
          cases (normal / empty / invalid) as a testAll() function
  Ch 14 - an array read with getRange().getValues(), and one object
  Ch 15 - 3+ single-job procedures with parameters/return values, an
          onOpen() custom menu, and graceful error alerts
Save as exemplars/cs/apps-script/Club-Snack-Fund-Tracker.gs, plus a
matching exemplars/cs/apps-script/README.md that tells a student how to
paste it into Extensions -> Apps Script, what sheet layout it expects (give
the exact column headers), and what each function logs when run.
The code must be valid Apps Script (V8). Re-read it line by line for syntax
and logic errors before committing. Do NOT link it from any page yet; just
report the paths to me.
```
