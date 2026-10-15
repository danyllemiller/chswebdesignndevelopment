# CS Unit Project — Worked-Example Prompts

One prompt per CS unit project. Paste one prompt into Claude Code in this repo,
review the result, then do the next one. Each prompt adds a **Worked Example**
card to its project page, modeled on the one already live in Unit 4.

**Unit 4 is already done.** It's `compsci/unit4-project.html`, the "Worked
Example: What a Finished Blueprint Looks Like" card. Every prompt below points
Claude at it as the pattern to copy.

---

## Rules that apply to every prompt (already included in each one)

- Additive only: don't rewrite or reorder any existing step, rubric line, raw
  data, or the dropbox.
- The example topic must be one students are **not allowed to use**. It must
  also be different from that unit's chapter activities, so students can't copy
  it as their own project.
- It must cover **every** step or stage in the project, in order.
- Real-world facts (cases, technologies, laws) must be real and verifiable,
  with no invented quotes, numbers, or citations.

---

## Unit 1 — The Digital Citizenship Case File

```
Read compsci/unit4-project.html and find the card titled "Worked Example: What
a Finished Blueprint Looks Like." That is the exact pattern to follow: same
Bootstrap card markup, the same red "You may NOT use this ... for your own
project" warning line, and the same density.

Now open compsci/unit1-project.html (The Digital Citizenship Case File). Add a
new card titled "Worked Example: What a Finished Case File Looks Like" directly
after the Steps card and before the #project-grading-panel. Change nothing else
on the page.

The example must walk through every step on the page, in order, as the slides
would read: Title Slide, Footprint Audit, Real-World Case Study, Threat & Risk
ID, Ethics & Privacy Analysis, Sourcing & Attribution, Your Code of Conduct,
Reflection.

Requirements:
- Footprint Audit: use an obviously invented persona (e.g. "Jordan Example,"
  @jordan_example). Never a real student or real handle. Show a short
  Safe / Risky / Should Be Deleted table.
- Case Study: pick ONE well-documented, school-appropriate real incident (a
  data breach or misinformation case, NOT a self-harm or sexual case). Get the
  facts right: who, what, when. Mark that case as off-limits for students'
  own projects.
- Works Cited: real, correctly formatted citations for the actual case only.
  Don't invent URLs; if you aren't certain of a URL, cite the publication and
  date without one.
- Code of Conduct: 5 rules, each explicitly tied to something in the case.
- Keep it short enough to model the task, not do it for them: 1-3 sentences or
  one small table per slide.

Then: escape HTML correctly, check every <div>/<table> is balanced, commit
with a clear message, and push. Tell me the case you chose and why.
```

---

## Unit 2 — The System & Support Deck

```
Read compsci/unit4-project.html and find the card titled "Worked Example: What
a Finished Blueprint Looks Like." That is the exact pattern to follow: same
Bootstrap card markup, the same red "You may NOT use this ... for your own
project" warning line, and the same density.

Now open compsci/unit2-project.html (The System & Support Deck). Add a new card
titled "Worked Example: What a Finished Deck Looks Like" directly after the
Steps card and before the #project-grading-panel. Change nothing else.

Example device: a library self-checkout kiosk (or another device students
wouldn't plausibly pick). It must not be a phone, game console, smart TV, or
laptop, and it must not match the Chapter 3 activities. Mark it off-limits.

Walk through every step, in order:
- Abstraction Layer Map: hardware -> operating system -> application for ONE
  function ("checking out a book"). Draw it as a simple stacked diagram or table.
- Hardware/Software Interaction: what happens at each layer during that
  function, 1-2 sentences per layer, technically accurate.
- Troubleshooting Guide: one real common problem ("barcode won't scan"),
  shown as a numbered yes/no flowchart a non-expert could follow.
- Data Slide: a small table ranking 3+ failure points by frequency, labeled
  "sample data" because the numbers are illustrative.
- Team Credits: show what a real role split plus evidence looks like
  (Partner A / Partner B).

Then: escape HTML correctly, check tags are balanced, commit, and push.
```

---

## Unit 3 — The Personal Finance Pipeline

```
Read compsci/unit4-project.html and find the card titled "Worked Example: What
a Finished Blueprint Looks Like." That is the exact pattern to follow.

Now open compsci/unit3-project.html (The Personal Finance Pipeline). Do NOT
touch compsci/unit3-project-byte-size-games.html. Add a new card titled
"Worked Example: A Mini Pipeline, Start to Finish" directly after the Raw Data
card and before the #project-grading-panel. Change nothing else.

IMPORTANT: every student uses the SAME given dataset, so the example must NOT
use the project's real codes, register, or savings numbers, and must not reveal
any of their answers (e.g. the $335.16 ending balance, the 8 decoded letters,
the Week 15/16 predictions). Instead, build a tiny separate dataset: a "lunch
card" account with 2 codes, 5 transactions, and 5 weeks of balances. Use it to
show the METHOD for each stage:
- Stage 1: convert 2 different codes (e.g. one given in hex, one in binary)
  to binary/hex/decimal/ASCII, with the work shown.
- Stage 2: the same 5-row table shown flat (Version A) and split into a
  lookup table (Version B), plus 2 sentences on the tradeoff.
- Stage 3: the running-balance formula pattern (first row uses $B$1, later
  rows reference the row above), one SUM, one AVERAGE, and one COUNTIF, each
  shown as the literal formula AND its result.
- Stage 4: the change column, the AVERAGE of the changes, the next-week
  prediction formula, and the "weeks to goal" formula, with results.
Verify every number in the mini example by actually computing it (run a quick
script). The formulas must be valid Google Sheets syntax with correct cell
references for the table as laid out.

Then: escape HTML correctly, check tags are balanced, commit, and push. Show
me the mini dataset and your verification output.
```

---

## Unit 5 — The Tech Impact Briefing

```
Read compsci/unit4-project.html and find the card titled "Worked Example: What
a Finished Blueprint Looks Like." That is the exact pattern to follow.

Now open compsci/unit5-project.html (The Tech Impact Briefing). Add a new card
titled "Worked Example: What a Finished Briefing Looks Like" directly after the
Steps card and before the #project-grading-panel. Change nothing else.

Example technology: automated license plate readers (ALPRs), or another real
technology that is NOT one of the page's own suggestions (social media
algorithm, AI writing/image tool, facial recognition, wearable health tracker,
recommendation engine). Mark it off-limits.

Walk through every step, in order: Explain It, Bias & Equity Test, Cross-
Disciplinary Connection, Privacy & Data, IP & Legal Angle, Your Verdict.
- Facts must be real and stated carefully. No invented statistics. If you
  reference a real study, ruling, or report, it must exist; otherwise describe
  the concern without a fake number.
- Your Verdict must model "defend it with evidence": take a clear position,
  give 2 pieces of evidence, and name 1 honest counterargument.
- Stay neutral and school-appropriate; model reasoning, not a political stance.
- Each step: 2-4 sentences.

Then: escape HTML correctly, check tags are balanced, commit, and push. List
any real-world claims you made so I can spot-check them.
```

---

## Unit 6 — The App Blueprint & Build Plan

```
Read compsci/unit4-project.html and find the card titled "Worked Example: What
a Finished Blueprint Looks Like." That is the exact pattern to follow.

Now open compsci/unit6-project.html (The App Blueprint & Build Plan). Add a new
card titled "Worked Example: What a Finished App Blueprint Looks Like" directly
after the Steps card and before the #project-grading-panel. Change nothing else.

Example app: a "Who's Feeding the Dog?" pet-care tracker for a family (or
another specific, relatable annoyance). It must NOT be one of the page's own
examples (carpool gas money, practice reps, fridge inventory, chores with
siblings). Mark it off-limits.

Walk through every step on the page, in order:
- Sheets Data Structure Comparison: show the same data as separate simple
  variables (feeding1, feeding2, feeding3...) vs. one list/array table, plus
  2 sentences on why the list scales.
- Module Breakdown: at least 3 modules, each with a one-sentence job, its
  inputs (parameters), and what it returns.
- SDLC Walkthrough: Planning, Design, a realistic Feedback round (what a
  classmate said, and the specific change it caused), and the remaining
  phases the page lists.
- Any license/accessibility steps the page includes: real, specific examples.
- The "Why This App, For Real" step: name a specific (invented) person and a
  real moment, modeling the rubric's standard. No generic usefulness claim.

Then: escape HTML correctly, check tags are balanced, commit, and push.
```

---

## Unit 7 — The Network Audit

```
Read compsci/unit4-project.html and find the card titled "Worked Example: What
a Finished Blueprint Looks Like." That is the exact pattern to follow.

Now open compsci/unit7-project.html (The Network Audit). Add a new card titled
"Worked Example: What a Finished Audit Looks Like" directly after the Steps
card and before the #project-grading-panel. Change nothing else.

Example network: a small family-owned bakery with a public guest Wi-Fi, a
point-of-sale terminal, an office PC, and a security camera DVR. It must NOT be
a home network (the Ch 17 activity) or a school network. Use realistic private
addressing (e.g. 192.168.1.0/24 for staff, a separate guest network) but
nothing that resembles real infrastructure. Mark it off-limits.

Walk through every step, in order:
- Diagram: a simple text or table diagram showing ISP modem -> router/
  firewall -> switch -> devices, with each device's IP and which network it
  is on.
- 2+ specific threats (e.g. a POS skimming malware family, a guest-network
  device reaching the POS), each technically accurate, not "hackers."
- A recommendation per threat, with cost/feasibility reasoning (a small
  bakery's budget, a non-technical owner).
- Head-to-head comparison of 2 competing measures on usability vs. security,
  as a small table.
- Final Recommendation that explicitly names the tradeoff being accepted.

Then: escape HTML correctly, check tags are balanced, commit, and push.
```
