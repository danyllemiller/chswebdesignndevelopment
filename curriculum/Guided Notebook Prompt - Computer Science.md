# Prompt: Build the Guided Notebook (Word Doc) for Computer Science

Paste the Master Prompt once, then paste the Course Brief right after it. This produces one Word
document (Computer Science is a single one-semester course, unlike WD1/WD2 which each got their own
notebook).

Attach:
- `curriculum/cs-daily-agenda-full.json` — the complete, authoritative day-by-day content: all 44 real
  lesson days (Unit 0 through Unit 8, one semester, Aug-Dec). This is the primary content source and is
  sufficient on its own to build the full notebook.
- Optionally, any of the real CS topic pages under `compsci/` if you want richer explanatory content for
  a specific day than `tasksList` alone provides — these are standalone sectioned lesson pages (not a
  single binder like WD has), so attach only the ones relevant to the days you're enriching. Filenames:
  `essential_computer_skills.html`, `intro_to_office_software.html`, `ethics_digital_citizenship.html`,
  `ethics_privacy_law.html`, `cybersecurity_threats.html`, `how_computers_work.html`,
  `language_of_computers.html`, `storing_data.html`, `mastering_spreadsheets.html`,
  `computational_modeling.html`, `problem_solving_algorithms.html`, `control_structures_events.html`,
  `modularity_procedures.html`, `culture_equity_bias.html`, `ethics_societal_impact.html`,
  `advanced_data_structures.html`, `software_development_lifecycle.html`, `how_the_internet_works.html`,
  `defending_systems.html`, `ai_cross_disciplinary.html` — plus seven real end-of-unit project briefs,
  `unit1-project.html` through `unit7-project.html` (Units 0 and 8 don't have a dedicated project page;
  Unit 0 ends in a short assessment day and Unit 8 ends in the semester final).

---

## THE MASTER PROMPT

> You are building a printable student "Guided Notebook" in Microsoft Word for a Nevada high school
> Computer Science course (one semester, Units 0-8). This is a physical consumable workbook students
> fill in by hand, one page per real lesson day, built entirely from the real source file(s) attached.
> Do not invent content, standards, vocabulary, or activities that aren't already in them — this is a
> transformation of real material into a fill-in notebook format, not new curriculum writing.
>
> ### Reading the source file
>
> **`cs-daily-agenda-full.json`** is the primary (and usually only) source — an object with a `cs` array,
> a list of `{ block_num, content }` entries in day order. `content` has:
> - `chapterLabel` — e.g. "Unit 3: Data & Analysis · Day 2 of 7" — gives you the unit, topic, and "Day N
>   of M" for that specific unit.
> - `objective` — array of the day's real learning objective(s).
> - `standards` — array of the day's real standards (Nevada Academic Content Standards for Computer
>   Science & Integrated Technology); `standardsNote`, if present (e.g. "Practice & application day —
>   no new performance indicator introduced"), adds context instead.
> - `doNowType` + `doNowPrompt` — the real warm-up/reflection question for the day. Unlike a design
>   course, there is no sketch/wireframe instruction here — use it directly as a short discussion or
>   reflection hook, nothing more to parse out of it.
> - `tasksTitle` + `tasksList` — the real lesson title and its ordered list of real tasks/activities for
>   the day (what actually happens in class, including any "Lab:" activity by name).
> - `exitTicket` — the real one-line exit check for the day, where present.
> - `milestone` — always null in this course (CS doesn't use named/point-valued milestones the way WD
>   does); ignore this field entirely.
>
> If any `compsci/*.html` topic or unit-project pages are attached, use them only to enrich a day whose
> `tasksTitle`/`chapterLabel` clearly matches that page's topic — pull real section content (they're
> organized in numbered subsections like "6.1 How Data Gets Organized") or, for a unit-project page, the
> real project brief/scenario and "Standards Addressed" box. If none are attached, or a day has no
> matching page, build that page from the JSON alone — it's complete enough to do so for every day.
>
> ### Document structure
>
> **1. Cover page.** "Computer Science," "Guided Notebook," a line for the student's name and period.
>
> **2. Front matter — two tracker pages, one page each** (this course runs one semester = 2 quarters,
> not four):
> - **My Elbow Partners** — a table with 2 rows (label them Quarter 1 and Quarter 2), each row with
>   blank lines for a partner's name and the date the pairing started.
> - **My 4-Square Group** — a table with 2 rows (one per quarter), each row with four blank name lines
>   arranged as a small 2x2 grid label ("4-Square") plus a date line.
>
> (No separate "My Project Team" page — the real end-of-unit work in this course is `unit1-project.html`
> through `unit7-project.html`-style individual project briefs, not a recurring multi-student team the
> way WD's capstones are; skip this tracker page for this course.)
>
> **3. One page per real lesson day, in the exact order the JSON array lists them (`block_num` order)**,
> each page containing:
> - A header: Unit number/title and "Day N of M," both parsed straight from that day's `chapterLabel`.
> - **The day's actual learning objective(s)**, from `objective`, as a "Today I will be able to..."
>   line(s).
> - **One activity block matched to what that day's real content actually is** — pick ONE of these
>   formats per page, don't force the same format onto every page:
>   - *Fill-in-the-blank*: for a day that defines real vocabulary/concepts (pull the actual terms from
>     `tasksList`/the matching topic page's section headers) — sentences with blanks for the key term,
>     4-6 terms.
>   - *Discussion questions*: for a day with real debate/judgment-call content (ethics, bias, privacy,
>     security tradeoffs are common in this course) — 2-3 open questions lifted from or closely adapted
>     from that day's real `doNowPrompt` and `tasksList` content.
>   - *Think Alone, Then Pair-Share*: for a day where a student reasons individually first — a "Think"
>     box (write your own answer) followed by a "Share" box (what did your elbow partner say, what did
>     you agree or disagree on).
>   - *Group work*: for a day whose `tasksList` names a real "Lab:" activity that's naturally
>     collaborative — restate the real lab's task as a worksheet with blanks/checkboxes for each real
>     step, plus a line for which 4-Square group did it.
> - **An exit ticket line** at the bottom, from `exitTicket` where present, otherwise restating the day's
>   objective as a one-line self-check.
>
> **4. A checkpoint/assessment page** for every day whose `tasksTitle` names a unit checkpoint or
> contains "(Ch N assessment)" — these are this course's equivalent of WD's milestone days. Restate the
> day's real `tasksList` as a short review worksheet (what's being checked, a few self-check items pulled
> from that unit's real objectives). Where a matching `unitN-project.html` exists for that unit, pull its
> real project brief/scenario and standards box into this page instead of a generic review worksheet.
>
> ### Formatting
>
> - Standard 8.5x11, one lesson day per page (don't compress two days onto one page even if short).
> - Consistent running header per page: Unit N: Title | Day X of Y.
> - Leave generous blank writing space under every prompt/question — this is a notebook, not a quiz.
> - No answer key — this ships blank for students to fill in.
>
> ### Deliverable
>
> One Word document covering every lesson day in the course brief below, in order, front matter first.

---

## COURSE BRIEF: COMPUTER SCIENCE

> Build the notebook from the `cs` array in `cs-daily-agenda-full.json` — all 44 entries, in `block_num`
> order, with no skipping or merging. That array already includes Unit 0's intro days and Unit 8's
> semester-final wrap day — you don't need to identify these separately, just process every entry in
> order. Your finished page count should be 44 (plus the 2 front-matter pages and cover); if it's off,
> you skipped or merged a day, which isn't allowed.
